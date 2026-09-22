import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthFormCard } from '../../components/auth/AuthFormCard';
import { TextField } from '../../components/auth/TextField';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { PersonIcon } from '../../components/auth/icons';
import { forceChangePassword } from '../../api/authApi';
import { ApiError } from '../../lib/apiClient';
import { toast } from '../../lib/toast';

interface LocationState {
  userId?: number | null;
  username?: string;
}

/**
 * Ports `first_login_password_screen_web.dart` — forced after a first
 * login: current (default) password + new + confirm.
 */
export function FirstLoginPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState | null) ?? {};

  const [username] = useState(state.username ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ current?: string; newPassword?: string; confirm?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!currentPassword) next.current = 'Default password is required';
    if (!newPassword) next.newPassword = 'Password is required';
    else if (newPassword.length < 6) next.newPassword = 'Password must be at least 6 characters';
    if (!confirmPassword) next.confirm = 'Please confirm your password';
    else if (confirmPassword !== newPassword) next.confirm = 'Passwords do not match';
    setErrors(next);
    const firstError = next.current ?? next.newPassword ?? next.confirm;
    if (firstError) toast.error(firstError);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const result = await forceChangePassword(username.trim(), currentPassword, newPassword);
      toast.success(result.message);
      // Replace so this screen (and the login screen before it) drop out of
      // history once the user reaches home.
      navigate('/home', { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthFormCard
      title="Welcome!"
      subtitle="This is your first login. Please change your default password to continue."
      logoSize={96}
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        <TextField label="Username" icon={<PersonIcon />} value={username} readOnly disabled />
        <PasswordInput
          label="Default Password"
          placeholder="Enter your default password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          error={errors.current}
        />
        <PasswordInput
          label="New Password"
          placeholder="Enter new password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={errors.newPassword}
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
          <PrimaryButton label="Update Password" isLoading={isSubmitting} />
        </div>
      </form>
    </AuthFormCard>
  );
}
