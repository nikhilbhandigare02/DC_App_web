/**
 * Ported from `lib/models/login_response_model.dart`,
 * `lib/models/message_response_model.dart` and
 * `lib/models/otp_response_model.dart`.
 */

/** Response envelope for `POST api/Auth/Login`. */
export interface LoginResponseModel {
  token: string | null;
  userId: number | null;
  username: string;
  isFirstLogin: boolean;
  /** `IsPasswordExpired` from the login response — forces a password reset before entering the app. */
  isPasswordExpired: boolean;
  message: string;
  /** Diagnostic centre name, returned by the login stored procedure. */
  providerName: string;
  /** Diagnostic centre provider number, returned by the login stored procedure. */
  providerNumber: string;
  /** The untouched response body, for callers that need a field not modeled above. */
  raw: Record<string, unknown>;
}

/** Generic `{ Message }` envelope shared by several endpoints. */
export interface MessageResponseModel {
  message: string;
}

/** Response envelope for `POST api/Auth/EmailVerification`. */
export interface SendOtpResponseModel {
  success: boolean;
  userId: number | null;
  message: string;
}
