import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthFormCard } from '../../components/auth/AuthFormCard';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { forceChangePassword } from '../../api/authApi';
import { ApiError } from '../../lib/apiClient';
import { toast } from '../../lib/toast';
import { useAuthStore } from '../../store/authStore';
import { pickString } from '../../utils/pick';

/**
 * Ports `change_password_screen.dart` / `widgets/auth/change_password_form.dart`.
 * Used from within the authenticated app (profile settings), so — unlike
 * `FirstLoginPassword` — the username comes from stored user data, not
 * router state.
 */
export function ChangePassword() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const username = pickString(user ?? undefined, 'Username', 'username');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ current?: string; newPassword?: string; confirm?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!currentPassword) next.current = 'Current password is required';
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
      const result = await forceChangePassword(username, currentPassword, newPassword);
      toast.success(result.message ?? 'Password updated successfully.');
      navigate(-1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <AuthFormCard
        title="Change Password"
        subtitle="Keep your account secure with a strong, unique password"
        variant="embedded"
      >
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <PasswordInput
            label="Current Password"
            placeholder="Enter your current password"
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
    </div>
  );
}
