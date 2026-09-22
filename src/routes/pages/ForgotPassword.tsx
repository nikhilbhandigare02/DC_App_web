import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthFormCard } from '../../components/auth/AuthFormCard';
import { TextField } from '../../components/auth/TextField';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { OtpInput } from '../../components/auth/OtpInput';
import { EditIcon, MailIcon } from '../../components/auth/icons';
import { sendOtp, verifyOtp } from '../../api/authApi';
import { ApiError } from '../../lib/apiClient';
import { toast } from '../../lib/toast';

const OTP_LENGTH = 6;

/** Ports `forgot_password_screen_web.dart`: email step, then a 6-digit OTP step. */
export function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [otpSent, setOtpSent] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [otpValues, setOtpValues] = useState<string[]>(Array(OTP_LENGTH).fill(''));

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const otpValue = otpValues.join('');

  function validateEmail(): boolean {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Email is required');
      toast.error('Email is required');
      return false;
    }
    if (!/^[\w.-]+@([\w-]+\.)+[\w-]{2,}$/.test(trimmed)) {
      setEmailError('Enter a valid email address');
      toast.error('Enter a valid email address');
      return false;
    }
    setEmailError(undefined);
    return true;
  }

  async function handleSendOtp(event?: FormEvent) {
    event?.preventDefault();
    if (isSendingOtp) return;
    if (!validateEmail()) return;

    setIsSendingOtp(true);
    try {
      const result = await sendOtp(email.trim());
      setUserId(result.userId);
      setOtpValues(Array(OTP_LENGTH).fill(''));
      setOtpSent(true);
      toast.success(result.message);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : (err as Error)?.message || 'Failed to send OTP.';
      toast.error(message);
    } finally {
      setIsSendingOtp(false);
    }
  }

  function handleChangeEmail() {
    setOtpSent(false);
    setOtpValues(Array(OTP_LENGTH).fill(''));
  }

  async function handleVerifyOtp() {
    if (otpValue.length < OTP_LENGTH || isVerifying) return;

    setIsVerifying(true);
    try {
      const result = await verifyOtp(userId, email.trim(), otpValue);
      toast.success(result.message);
      navigate('/set-new-password', { replace: true, state: { userId } });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong.';
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <AuthFormCard
      title={otpSent ? 'Verify OTP' : 'Forgot Password?'}
      subtitle={
        otpSent
          ? `Enter the 6-digit OTP sent to ${email.trim()}`
          : "Enter the email linked to your account and we'll send you a 6-digit OTP"
      }
      logoSize={96}
    >
      <form className="flex flex-col gap-[18px]" onSubmit={otpSent ? (e) => e.preventDefault() : handleSendOtp} noValidate>
        <TextField
          label="Email"
          placeholder="you@example.com"
          type="email"
          icon={<MailIcon />}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
          readOnly={otpSent}
          suffix={
            otpSent ? (
              <button
                type="button"
                aria-label="Change email"
                onClick={handleChangeEmail}
                className="text-text-secondary hover:text-text-primary"
              >
                <EditIcon />
              </button>
            ) : undefined
          }
        />

        {otpSent ? (
          <div className="flex flex-col gap-4">
            <OtpInput length={OTP_LENGTH} values={otpValues} onChange={setOtpValues} disabled={isVerifying} />
            <button
              type="button"
              onClick={() => handleSendOtp()}
              disabled={isSendingOtp}
              className="text-center text-sm font-semibold text-primary hover:underline disabled:opacity-60"
            >
              Didn&apos;t receive the code? Resend
            </button>
            <PrimaryButton
              type="button"
              label="Verify OTP"
              isLoading={isVerifying}
              disabled={otpValue.length !== OTP_LENGTH}
              onClick={handleVerifyOtp}
            />
          </div>
        ) : (
          <PrimaryButton label="Send OTP" isLoading={isSendingOtp} />
        )}
      </form>
    </AuthFormCard>
  );
}
