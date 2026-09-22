import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getIsLogin } from '../lib/storage';
import { useAuthStore } from '../store/authStore';

/**
 * Gates the `/home/*` subtree behind auth. Checks both `storage.getIsLogin()`
 * (the source of truth, mirroring the Dart app's splash-screen check) and
 * the zustand store (kept in sync by `authStore.login`/`logout`), so a
 * logout from anywhere in the tree redirects immediately.
 */
export function ProtectedRoute() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated || !getIsLogin()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
