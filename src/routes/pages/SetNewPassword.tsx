import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthFormCard } from '../../components/auth/AuthFormCard';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { setNewPassword } from '../../api/authApi';
import { ApiError } from '../../lib/apiClient';
import { toast } from '../../lib/toast';

interface LocationState {
  userId?: number | null;
}

/** Ports `set_new_password_screen_web.dart`: new + confirm password. */
export function SetNewPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = (location.state as LocationState | null)?.userId ?? null;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // No userId means this screen was reached directly (e.g. a bookmark),
    // not via the OTP-verification hand-off — send them back to start over.
    if (userId == null) {
      navigate('/forgot-password', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!password) next.password = 'Password is required';
    else if (password.length < 6) next.password = 'Password must be at least 6 characters';
    if (!confirmPassword) next.confirm = 'Please confirm your password';
    else if (confirmPassword !== password) next.confirm = 'Passwords do not match';
    setErrors(next);
    const firstError = next.password ?? next.confirm;
    if (firstError) toast.error(firstError);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const result = await setNewPassword(userId, password);
      toast.success(result.message);
      navigate('/login', { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (userId == null) return null;

  return (
    <AuthFormCard
      title="Set New Password"
      subtitle="Your new password must be different from previously used passwords"
      logoSize={96}
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        <PasswordInput
          label="New Password"
          placeholder="Enter new password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <PasswordInput
          label="Confirm Password"
          placeholder="Re-enter new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirm}
        />
        <div className="mt-2">
          <PrimaryButton label="Set Password" isLoading={isSubmitting} />
        </div>
      </form>
    </AuthFormCard>
  );
}
