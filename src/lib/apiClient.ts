/**
 * Axios wrapper mirroring `lib/network/api_service.dart`'s `ApiService`.
 *
 * Differences from the Dart original (intentional, per the migration
 * blueprint):
 *  - Errors are thrown as a typed {@link ApiError} instance instead of a
 *    plain string, so callers can `instanceof` check and read `.status`.
 *  - `console.*` stands in for the Dart file's liberal `print()` debug
 *    logging; trimmed down to the request/response lifecycle only.
 */

import axios, { AxiosError, type AxiosInstance } from 'axios';
import {
  decryptPayload,
  decryptWithSessionKey,
  encryptPayload,
  encryptPayloadWithSession,
  parseDecrypted,
  type EncryptedEnvelope,
} from './encryption';
import { getToken } from './storage';

const DEFAULT_TIMEOUT_MS = 15_000;
const MULTIPART_TIMEOUT_MS = 3 * 60_000;

export class ApiError extends Error {
  /** HTTP status code, when a response was received at all. */
  status?: number;
  /** The raw error response body, if any — for callers that need more than `.message`. */
  responseData?: unknown;

  constructor(message: string, options?: { status?: number; responseData?: unknown; cause?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = options?.status;
    this.responseData = options?.responseData;
    if (options?.cause !== undefined) {
      // `cause` is ES2022; set manually for broader target compatibility.
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

/** Looks for a human-readable message in a (typically un-encrypted) error response body. */
function extractBackendMessage(data: unknown): string | null {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    const message = d.Message ?? d.message ?? d.Error ?? d.error;
    if (typeof message === 'string' && message.trim()) return message;
  } else if (typeof data === 'string' && data.trim()) {
    return data;
  }
  return null;
}

/** Mirrors `ApiService._handleError`. */
function handleAxiosError(error: AxiosError): ApiError {
  if (error.code === 'ECONNABORTED') {
    return new ApiError('Connection timed out. Please check your internet connection and try again.', {
      cause: error,
    });
  }
  if (!error.response) {
    return new ApiError('Unable to reach the server. Please check your internet connection.', { cause: error });
  }

  const status = error.response.status;
  const backendMessage = extractBackendMessage(error.response.data);
  if (backendMessage) {
    return new ApiError(backendMessage, { status, responseData: error.response.data, cause: error });
  }

  switch (status) {
    case 401:
      return new ApiError('Invalid username or password.', { status, cause: error });
    case 403:
      return new ApiError('You are not authorized to perform this action.', { status, cause: error });
    case 404:
      return new ApiError('The requested service could not be found.', { status, cause: error });
    case 500:
    case 502:
    case 503:
      return new ApiError('Something went wrong on the server. Please try again later.', { status, cause: error });
    default:
      return new ApiError(`Something went wrong (Error ${status}). Please try again.`, { status, cause: error });
  }
}

function isEncryptedEnvelope(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const hasKey = 'EncryptedAESKey' in d || 'encryptedAESKey' in d;
  const hasData = 'EncryptedData' in d || 'encryptedData' in d;
  const hasIv = 'IV' in d || 'iv' in d;
  return hasKey && hasData && hasIv;
}

function normalizeEnvelope(data: Record<string, unknown>): EncryptedEnvelope {
  return {
    EncryptedAESKey: (data.EncryptedAESKey ?? data.encryptedAESKey) as string,
    EncryptedData: (data.EncryptedData ?? data.encryptedData) as string,
    IV: (data.IV ?? data.iv) as string,
  };
}

/** Plain GET request, no encryption. */
export async function apiGet<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T> {
  try {
    const response = await apiClient.get(path, { params });
    return response.data as T;
  } catch (err) {
    throw handleAxiosError(err as AxiosError);
  }
}

/** GET request whose response is a decrypted envelope. */
export async function apiGetEncrypted<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T> {
  try {
    const response = await apiClient.get(path, { params });
    return processEncryptedResponse<T>(response.data);
  } catch (err) {
    throw handleAxiosError(err as AxiosError);
  }
}

/** POST with a freshly RSA+AES-encrypted body, decrypting the (also encrypted) response. */
export async function apiPostEncrypted<T = unknown>(path: string, data: unknown): Promise<T> {
  try {
    const envelope = encryptPayload(data);
    const response = await apiClient.post(path, envelope);
    return processEncryptedResponse<T>(response.data);
  } catch (err) {
    throw handleAxiosError(err as AxiosError);
  }
}

/**
 * POST with a session-keyed encrypted body: the response is decrypted by
 * reusing this call's own AES key/IV (unless the server rotates the key),
 * saving an RSA round trip. This is what almost every DDL/domain endpoint
 * uses. Mirrors `ApiService.postEncryptedSession`.
 */
export async function apiPostEncryptedSession<T = unknown>(path: string, data: unknown): Promise<T> {
  try {
    const session = encryptPayloadWithSession(data);
    const response = await apiClient.post(path, session.envelope);
    return processSessionResponse<T>(response.data, session);
  } catch (err) {
    throw handleAxiosError(err as AxiosError);
  }
}

/**
 * Session-encrypted multipart POST: `data` fields are merged into the
 * session envelope, files are appended as-is. Used by
 * `SaveFacilityOutsourceDetails`.
 */
export async function apiPostEncryptedMultipartSession<T = unknown>(
  path: string,
  data: unknown,
  files?: Record<string, File | Blob>,
): Promise<T> {
  try {
    const session = encryptPayloadWithSession(data);
    const formData = new FormData();
    for (const [key, value] of Object.entries(session.envelope) as [string, string][]) {
      formData.append(key, value);
    }
    if (files) {
      for (const [field, file] of Object.entries(files)) {
        formData.append(field, file);
      }
    }
    const response = await apiClient.post(path, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: MULTIPART_TIMEOUT_MS,
    });
    return processSessionResponse<T>(response.data, session);
  } catch (err) {
    throw handleAxiosError(err as AxiosError);
  }
}

/**
 * Plain (unencrypted) multipart POST, for file uploads — uses a longer
 * timeout since uploads take far longer than a JSON call to complete.
 * Mirrors `ApiService.postMultipart`.
 */
export async function apiPostMultipart<T = unknown>(
  path: string,
  formData: FormData,
  timeoutMs: number = MULTIPART_TIMEOUT_MS,
): Promise<T> {
  try {
    const response = await apiClient.post(path, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: timeoutMs,
    });
    return response.data as T;
  } catch (err) {
    throw handleAxiosError(err as AxiosError);
  }
}

function processEncryptedResponse<T>(responseData: unknown): T {
  if (isEncryptedEnvelope(responseData)) {
    const envelope = normalizeEnvelope(responseData);
    const decrypted = decryptPayload(envelope);
    return parseDecrypted(decrypted) as T;
  }
  return responseData as T;
}

function processSessionResponse<T>(
  responseData: unknown,
  session: { aesKey: string; iv: string },
): T {
  if (responseData && typeof responseData === 'object') {
    const d = responseData as Record<string, unknown>;
    const encryptedData = (d.EncryptedData ?? d.encryptedData) as string | undefined;
    if (!encryptedData) {
      // Response format not recognized for session decryption — pass through raw.
      return responseData as T;
    }
    const decrypted = decryptWithSessionKey(
      {
        EncryptedData: encryptedData,
        IV: (d.IV ?? d.iv) as string | undefined,
        EncryptedAESKey: (d.EncryptedAESKey ?? d.encryptedAESKey) as string | undefined,
      },
      session,
    );
    return parseDecrypted(decrypted) as T;
  }
  return responseData as T;
}
