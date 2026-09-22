/** Ported from `lib/repository/auth_repository.dart`. */

import { apiPostEncryptedSession } from '../lib/apiClient';
import { setIsLogin, setToken, setUserData } from '../lib/storage';
import { pick, pickBool, pickString } from '../utils/pick';
import type { LoginResponseModel, MessageResponseModel, SendOtpResponseModel } from '../types/auth';

function toLoginResponseModel(json: Record<string, unknown>, fallbackUsername: string): LoginResponseModel {
  const token = pick<string>(json, 'Token', 'token', 'AccessToken', 'accessToken') ?? null;
  const isFirstLoginRaw = pick(json, 'IsFirstLogin', 'isFirstLogin');
  const isFirstLogin = `${isFirstLoginRaw}` === '1' || isFirstLoginRaw === true;
  const isPasswordExpiredRaw = pick(json, 'IsPasswordExpired', 'isPasswordExpired');
  const isPasswordExpired = `${isPasswordExpiredRaw}` === '1' || isPasswordExpiredRaw === true;
  const userIdRaw = pick(json, 'UserId', 'userId');
  const userId = typeof userIdRaw === 'number' ? userIdRaw : userIdRaw != null ? Number(userIdRaw) : null;
  const username = pickString(json, 'Username', 'username') || fallbackUsername;
  const rawMessage = pick<string>(json, 'Message', 'message');
  const message = typeof rawMessage === 'string' && rawMessage.trim() ? rawMessage : 'Login successful.';

  return {
    token: typeof token === 'string' ? token : null,
    userId: userId != null && !Number.isNaN(userId) ? userId : null,
    username,
    isFirstLogin,
    isPasswordExpired,
    message,
    providerName: pickString(json, 'ProviderName', 'providerName'),
    providerNumber: pickString(json, 'ProviderNumber', 'providerNumber'),
    raw: json,
  };
}

function toMessageResponseModel(json: unknown, fallback = 'Success.'): MessageResponseModel {
  if (json && typeof json === 'object') {
    const message = (json as Record<string, unknown>).Message ?? (json as Record<string, unknown>).message;
    if (typeof message === 'string' && message.trim()) {
      return { message };
    }
  }
  return { message: fallback };
}

export async function login(username: string, password: string): Promise<LoginResponseModel> {
  const response = await apiPostEncryptedSession<Record<string, unknown>>('api/Auth/Login', {
    Username: username,
    Password: password,
  });

  const data = response && typeof response === 'object' ? response : {};
  const result = toLoginResponseModel(data, username);

  if (result.token) {
    setToken(result.token);
  }
  if (Object.keys(data).length > 0) {
    setUserData(data);
  }
  setIsLogin(true);
  return result;
}

export async function sendOtp(email: string): Promise<SendOtpResponseModel> {
  const response = await apiPostEncryptedSession<Record<string, unknown>>('api/Auth/EmailVerification', {
    UserMailId: email,
  });

  if (!response || typeof response !== 'object') {
    throw new Error('Failed to send OTP.');
  }
  const success = pickBool(response, 'Success', 'success');
  const userIdRaw = pick(response, 'UserId', 'userId');
  const userId = typeof userIdRaw === 'number' ? userIdRaw : userIdRaw != null ? Number(userIdRaw) : null;
  const message = pickString(response, 'Message', 'message') || (success ? 'OTP sent successfully.' : 'Failed to send OTP.');

  const result: SendOtpResponseModel = {
    success,
    userId: userId != null && !Number.isNaN(userId) ? userId : null,
    message,
  };
  if (!result.success) {
    throw new Error(result.message);
  }
  return result;
}

export async function verifyOtp(userId: number | null, email: string, otp: string): Promise<MessageResponseModel> {
  const response = await apiPostEncryptedSession('api/Auth/VerifyOtp', {
    UserId: userId,
    Email: email,
    OTP: otp,
  });
  return toMessageResponseModel(response, 'OTP verified successfully.');
}

export async function setNewPassword(userId: number | null, password: string): Promise<MessageResponseModel> {
  const response = await apiPostEncryptedSession('api/Auth/ForgotPassword', {
    UserId: userId,
    Password: password,
  });
  return toMessageResponseModel(response, 'Password reset successful. Please log in.');
}

export async function forceChangePassword(
  username: string,
  currentPassword: string,
  newPassword: string,
): Promise<MessageResponseModel> {
  const response = await apiPostEncryptedSession('api/Auth/ForceChangePassword', {
    Username: username,
    Password: currentPassword,
    NewPassword: newPassword,
  });
  return toMessageResponseModel(response, 'Password updated successfully.');
}
