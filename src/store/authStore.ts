import { create } from 'zustand';
import * as storage from '../lib/storage';
import type { StoredUserData } from '../lib/storage';

interface AuthState {
  isAuthenticated: boolean;
  user: StoredUserData | null;
  token: string | null;
  /** Persists `data` (token + user blob) and marks the session as logged in. */
  login: (data: { token: string; user: StoredUserData }) => void;
  /** Clears persisted auth state and resets the store. */
  logout: () => void;
}

// Hydrate synchronously from storage.ts so a page refresh doesn't flash an
// unauthenticated state before anything re-checks it.
const initialToken = storage.getToken();
const initialUser = storage.getUserData();
const initialIsAuthenticated = storage.getIsLogin() && !!initialToken;

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: initialIsAuthenticated,
  user: initialUser,
  token: initialToken,

  login: (data) => {
    storage.setToken(data.token);
    storage.setUserData(data.user);
    storage.setIsLogin(true);
    set({ isAuthenticated: true, user: data.user, token: data.token });
  },

  logout: () => {
    storage.clearAll();
    set({ isAuthenticated: false, user: null, token: null });
  },
}));
