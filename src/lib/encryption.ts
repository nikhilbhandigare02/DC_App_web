/**
 * RSA+AES hybrid encryption, ported 1:1 from
 * `lib/network/encryption_service.dart` (Dart/pointycastle) using
 * `node-forge`.
 *
 * SECURITY NOTE: the RSA **private** key below ships inside this client
 * bundle (exactly as it does in the Flutter app's source, and therefore in
 * its compiled binary). Anyone can extract it and decrypt any payload this
 * scheme produces. This is NOT a confidentiality boundary — it exists only
 * to satisfy a backend contract that expects this exact envelope shape
 * (`{EncryptedAESKey, EncryptedData, IV}`, RSA-OAEP/SHA-1 + AES-256-CBC/
 * PKCS7). Do not rely on it to protect sensitive data from a client-side
 * attacker; real confidentiality has to come from transport security
 * (HTTPS) and server-side authorization.
 */

import forge from 'node-forge';

// Copied verbatim from lib/network/encryption_service.dart.
const RSA_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2as2CrVXOxvz2Ax2NFDP
8tANogZ2z5eC9SKDc5f+Ix1BEsFaDI9so7eVRZf3Kw2y6BsbLoubYtqCxom9lAJM
9MHQ4V0XgqiscRy6/7Pypp4/SjMB+D4nQzUITuQHcM0HamQriYMcNuuKCL5fE3SJ
ji09hfnOYSrO7bOeoBJWSQbbseZy/WJzl+35oAZPb4L3HYZWxEazbthaRE5TyHFO
AFd4wmIc4qRcY9rxIdDRA5kuiv89UvBHH6kk+SE+/mayZP5qZ1a5JusyLoZIY6zR
bqxi908ZCPG3GsLNJOT3dDPb5SDBJXqwKxce5pQKOjBw021nqLZ+C4RemyljG7uP
+wIDAQAB
-----END PUBLIC KEY-----`;

const RSA_PRIVATE_KEY_PEM = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA2as2CrVXOxvz2Ax2NFDP8tANogZ2z5eC9SKDc5f+Ix1BEsFa
DI9so7eVRZf3Kw2y6BsbLoubYtqCxom9lAJM9MHQ4V0XgqiscRy6/7Pypp4/SjMB
+D4nQzUITuQHcM0HamQriYMcNuuKCL5fE3SJji09hfnOYSrO7bOeoBJWSQbbseZy
/WJzl+35oAZPb4L3HYZWxEazbthaRE5TyHFOAFd4wmIc4qRcY9rxIdDRA5kuiv89
UvBHH6kk+SE+/mayZP5qZ1a5JusyLoZIY6zRbqxi908ZCPG3GsLNJOT3dDPb5SDB
JXqwKxce5pQKOjBw021nqLZ+C4RemyljG7uP+wIDAQABAoIBABHp2rk34lVtf/xk
TigRDIQVpkGS2Z1NAUyOShYtyI74Pd4+xlvpQ84XcjP3hTJoXrRmYq7Kc3/HruKK
/GydYdr0xm19nU0193cZn7QiiZI3zMqc9wkIiG+qAiSH9KrOXNFfLAwVm7FTYhlF
HYr62MU4KOuJOvhZLw117lSLHcnFnVmVkjiFzHJX9ZmRoCFxc9ccRw4oXcnmkwMs
7gm+kYWzQMyjPiMD5f1k9mvxiF7rQQLei+qdn4yo+3VY6nzpZBce8X8oOzkS0fv8
PhRWxCynXhZeWEIW//C96WnQEcJ1C51icEvfJSQIdKMhdUrUsDzjWSbAAtEMjbVD
wBXh6DECgYEA8pnUEcgiZVffFn40Hc0CCIRu1PteA8ltwFwShl9KEOK9rXomdDs5
VErF+HzlJwdJDBdufXEv4YZqX7WphABzDcmi+6zS0Nv2Q8dXL7Y5IsIFaVCNZGB/
wqvdDK2do5gmx83JKTdsOZpmowbo0MlmQcR2NKJ/oDiV56J5MK+ivtECgYEA5bDd
KFE6yd7tKpaxGgSVzY9I6OF/0NW959UDYXHDVkJTQwRDBsmja1UaZBWsvB6NgnFO
4QEfrJGByO0ozgJ9hwMc8JxLEwUoeZogWwdztJZpwhtPHsqzyWUmiJbqIKTiAEEb
wX5+bnC3qqtt+Zxc9vOlTCDbovD7k5PT/gnwzQsCgYAO8aTbl41u2rPWSd3h/A/l
AGtnWTiYWR8Wm1VUy6ffVGhEuGKIBGHqrFR3kxH2jn9UbFkVBxTg+ouw65rOk8yC
i+orQKEX1oTb9fqL6NiqKHN24kxjY4JbNoT+U++C9UtmQWnjzRMwlS8/WZybx9wx
ru1tHploADRTuXFnq1oGEQKBgQC0q3/qXKqfa4il/U5lJsImpNQ2ylldjSMJnlZA
adm6mgUgK9QFHMo8fP57R0lN18J7nmDrP5UIipPJ1jJIiVDvyBUVdfrfhSknLYLR
13S90apykkST9eGhQr0ip4KWFtvmU1BfzP3qJSNzTdD9jG7bmR6mWRoqet+IX7la
k7sjrQKBgQCV5FqCoZ2TGptykGztZewLU/SbbdlEQtty67yzBQKHJlJmDKMI9rRr
cVX/B17Zcoy96lU2kmImFPxbXkodo6WxkO76xn0CEeE+7W5FSeykAFczkXoM8pMi
0c0FSj2fFG0nUGUXua8PyB0qflAeOFesYoLkvAzDMLKx3Y2VGL6DoA==
-----END RSA PRIVATE KEY-----`;

/** The `{EncryptedAESKey, EncryptedData, IV}` envelope sent to / read from the backend. */
export interface EncryptedEnvelope {
  EncryptedAESKey: string;
  EncryptedData: string;
  IV: string;
}

/** An encrypt result that also exposes the raw AES key/IV, so a caller can
 * reuse them to decrypt a matching response without another RSA round trip
 * (mirrors `HybridEncryptionResult`/`postEncryptedSession` in the Dart app). */
export interface EncryptSessionResult {
  envelope: EncryptedEnvelope;
  /** Raw AES key bytes, as a forge binary string. */
  aesKey: string;
  /** Raw IV bytes, as a forge binary string. */
  iv: string;
}

let cachedPublicKey: forge.pki.rsa.PublicKey | null = null;
let cachedPrivateKey: forge.pki.rsa.PrivateKey | null = null;

function getPublicKey(): forge.pki.rsa.PublicKey {
  if (!cachedPublicKey) {
    cachedPublicKey = forge.pki.publicKeyFromPem(RSA_PUBLIC_KEY_PEM) as forge.pki.rsa.PublicKey;
  }
  return cachedPublicKey;
}

function getPrivateKey(): forge.pki.rsa.PrivateKey {
  if (!cachedPrivateKey) {
    cachedPrivateKey = forge.pki.privateKeyFromPem(RSA_PRIVATE_KEY_PEM) as forge.pki.rsa.PrivateKey;
  }
  return cachedPrivateKey;
}

/** Random 32-byte (AES-256) key, as a forge binary-string byte buffer. */
function generateAesKey(): string {
  return forge.random.getBytesSync(32);
}

/** Random 16-byte IV. */
function generateIv(): string {
  return forge.random.getBytesSync(16);
}

function aesCbcEncrypt(plainBytes: string, keyBytes: string, ivBytes: string): string {
  const cipher = forge.cipher.createCipher('AES-CBC', keyBytes);
  cipher.start({ iv: ivBytes });
  cipher.update(forge.util.createBuffer(plainBytes, 'raw'));
  cipher.finish();
  return cipher.output.getBytes();
}

function aesCbcDecrypt(cipherBytes: string, keyBytes: string, ivBytes: string): string {
  const decipher = forge.cipher.createDecipher('AES-CBC', keyBytes);
  decipher.start({ iv: ivBytes });
  decipher.update(forge.util.createBuffer(cipherBytes, 'raw'));
  const ok = decipher.finish();
  if (!ok) {
    throw new Error('AES-CBC decryption failed (bad key/IV or corrupted data).');
  }
  return decipher.output.getBytes();
}

function rsaOaepEncrypt(dataBytes: string, publicKey: forge.pki.rsa.PublicKey): string {
  // Backend uses RSA-OAEP with SHA-1, matching the Dart `OAEPEncoding(RSAEngine())` default.
  return publicKey.encrypt(dataBytes, 'RSA-OAEP', {
    md: forge.md.sha1.create(),
  });
}

function rsaOaepDecrypt(dataBytes: string, privateKey: forge.pki.rsa.PrivateKey): string {
  return privateKey.decrypt(dataBytes, 'RSA-OAEP', {
    md: forge.md.sha1.create(),
  });
}

function toBase64(bytes: string): string {
  return forge.util.encode64(bytes);
}

function fromBase64(b64: string): string {
  return forge.util.decode64(b64);
}

function serialize(data: unknown): string {
  return typeof data === 'string' ? data : JSON.stringify(data);
}

/**
 * One-shot encrypt: fresh AES-256 key + IV every call, AES-CBC/PKCS7 over the
 * JSON payload, RSA-OAEP(SHA-1) over the AES key. Mirrors
 * `EncryptionService.encrypt` / `ApiService.postEncrypted`.
 */
export function encryptPayload(data: unknown): EncryptedEnvelope {
  const publicKey = getPublicKey();
  const aesKey = generateAesKey();
  const iv = generateIv();
  const plainBytes = forge.util.encodeUtf8(serialize(data));

  const encryptedData = aesCbcEncrypt(plainBytes, aesKey, iv);
  const encryptedAesKey = rsaOaepEncrypt(aesKey, publicKey);

  return {
    EncryptedAESKey: toBase64(encryptedAesKey),
    EncryptedData: toBase64(encryptedData),
    IV: toBase64(iv),
  };
}

/**
 * Same as {@link encryptPayload}, but also returns the raw AES key/IV bytes
 * so the caller can decrypt a same-session response with
 * {@link decryptWithSessionKey} instead of paying for another RSA op.
 * Mirrors `EncryptionService.encryptWithSession` / `postEncryptedSession`.
 */
export function encryptPayloadWithSession(data: unknown): EncryptSessionResult {
  const publicKey = getPublicKey();
  const aesKey = generateAesKey();
  const iv = generateIv();
  const plainBytes = forge.util.encodeUtf8(serialize(data));

  const encryptedData = aesCbcEncrypt(plainBytes, aesKey, iv);
  const encryptedAesKey = rsaOaepEncrypt(aesKey, publicKey);

  return {
    envelope: {
      EncryptedAESKey: toBase64(encryptedAesKey),
      EncryptedData: toBase64(encryptedData),
      IV: toBase64(iv),
    },
    aesKey,
    iv,
  };
}

/**
 * Decrypts a full envelope by RSA-decrypting `EncryptedAESKey` with the
 * (client-side) private key, then AES-CBC decrypting `EncryptedData`.
 * Mirrors `EncryptionService.decrypt`.
 */
export function decryptPayload(envelope: EncryptedEnvelope): string {
  const privateKey = getPrivateKey();
  const encryptedAesKeyBytes = fromBase64(envelope.EncryptedAESKey);
  const encryptedDataBytes = fromBase64(envelope.EncryptedData);
  const ivBytes = fromBase64(envelope.IV);

  const aesKeyBytes = rsaOaepDecrypt(encryptedAesKeyBytes, privateKey);
  const decryptedBytes = aesCbcDecrypt(encryptedDataBytes, aesKeyBytes, ivBytes);
  return forge.util.decodeUtf8(decryptedBytes);
}

/**
 * Decrypts a response that reuses a session AES key/IV from a prior
 * {@link encryptPayloadWithSession} call — unless the response carries its
 * own non-empty `EncryptedAESKey`, in which case that key is RSA-decrypted
 * and used instead (the server occasionally rotates it). Mirrors
 * `ApiService._decryptSessionResponse`.
 */
export function decryptWithSessionKey(
  envelope: { EncryptedData: string; IV?: string; EncryptedAESKey?: string },
  session: { aesKey: string; iv: string },
): string {
  let aesKeyToUse = session.aesKey;
  let ivToUse = session.iv;

  if (envelope.EncryptedAESKey) {
    try {
      const privateKey = getPrivateKey();
      aesKeyToUse = rsaOaepDecrypt(fromBase64(envelope.EncryptedAESKey), privateKey);
    } catch {
      // Fall back to the session key — mirrors the Dart catch-and-continue.
    }
  }

  if (envelope.IV) {
    ivToUse = fromBase64(envelope.IV);
  }

  const decryptedBytes = aesCbcDecrypt(fromBase64(envelope.EncryptedData), aesKeyToUse, ivToUse);
  return forge.util.decodeUtf8(decryptedBytes);
}

/** Parses a decrypted response string as JSON when it looks like one, else returns it as-is. */
export function parseDecrypted(decrypted: string): unknown {
  const trimmed = decrypted.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return decrypted;
    }
  }
  return decrypted;
}
