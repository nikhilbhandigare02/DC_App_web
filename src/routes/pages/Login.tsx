import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthFormCard } from '../../components/auth/AuthFormCard';
import { TextField } from '../../components/auth/TextField';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { ArrowRightIcon, PersonIcon, ShieldIcon } from '../../components/auth/icons';
import { login } from '../../api/authApi';
import { ApiError } from '../../lib/apiClient';
import { toast } from '../../lib/toast';
import { useAuthStore } from '../../store/authStore';

/** Ports `login_screen_web.dart` / `widgets/auth/login_form.dart`. */
export function Login() {
  const navigate = useNavigate();
  const authLogin = useAuthStore((state) => state.login);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!username.trim()) next.username = 'Username is required';
    if (!password) next.password = 'Password is required';
    else if (password.length < 4) next.password = 'Password must be at least 4 characters';
    setErrors(next);
    const firstError = next.username ?? next.password;
    if (firstError) toast.error(firstError);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const result = await login(username.trim(), password);
      authLogin({
        token: result.token ?? '',
        user: { ...result.raw, userId: result.userId ?? undefined, username: result.username, isFirstLogin: result.isFirstLogin },
      });
      toast.success(result.message);

      // Replace so the login screen drops out of history once authenticated.
      // `isFirstLogin` takes priority — it already implies a mandatory password reset.
      if (result.isFirstLogin) {
        navigate('/first-login-password', {
          replace: true,
          state: { userId: result.userId, username: result.username },
        });
      } else if (result.isPasswordExpired) {
        toast.info('Your password has expired. Please set a new one to continue.');
        navigate('/set-new-password', {
          replace: true,
          state: { userId: result.userId },
        });
      } else {
        navigate('/home', { replace: true });
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthFormCard title="Welcome Back" subtitle="Sign in to manage your assigned diagnostic cases" logoSize={96}>
      <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Username"
          placeholder="Enter your username"
          icon={<PersonIcon />}
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
        />
        <PasswordInput
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />

        <div className="-mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-[13px] font-semibold text-primary hover:underline"
          >
            Forgot Password?
          </button>
        </div>

        <PrimaryButton label="Sign In" icon={<ArrowRightIcon />} isLoading={isSubmitting} />

        <div className="mt-1 flex items-start gap-2.5 rounded-md border border-divider bg-surface-variant px-3 py-2.5">
          <span className="mt-0.5 shrink-0 text-primary">
            <ShieldIcon />
          </span>
          <p className="text-xs leading-relaxed text-text-secondary">
            Your account and diagnostic data are protected with end-to-end encryption and HIPAA compliant
            safeguards.
          </p>
        </div>
      </form>
    </AuthFormCard>
  );
}
