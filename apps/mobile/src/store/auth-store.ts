import { create } from 'zustand';
import { getAuthSession, saveAuthSession, clearAuthSession, setSecureItem } from '../lib/secure-store';
import api, { registerAuthFailureCallback } from '../lib/api';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'student';
  is_active: boolean;
  study_year?: number | null;
  university?: string | null;
  current_streak?: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  
  // Actions
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Register token refresh failure callback to clean up Zustand state automatically
  registerAuthFailureCallback(() => {
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isInitialized: false,

    login: async (accessToken, refreshToken, user) => {
      await saveAuthSession(accessToken, refreshToken, user);
      set({
        accessToken,
        refreshToken,
        user,
        isAuthenticated: true,
      });
    },

    logout: async () => {
      await clearAuthSession();
      set({
        accessToken: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
      });
    },

    updateUser: async (userUpdates) => {
      const currentUser = get().user;
      if (!currentUser) return;

      const updatedUser = { ...currentUser, ...userUpdates };
      await setSecureItem('user_profile', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    },

    checkSession: async () => {
      try {
        const { accessToken, refreshToken, user } = await getAuthSession();
        if (accessToken && refreshToken && user) {
          set({
            accessToken,
            refreshToken,
            user,
            isAuthenticated: true,
          });
        }
      } catch (error) {
        console.error('checkSession: Failed to restore session', error);
      } finally {
        set({ isInitialized: true });
      }
    },
  };
});
