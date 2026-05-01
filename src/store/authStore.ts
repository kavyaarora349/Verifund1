import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Role } from '../types';

interface AuthState {
  activeRole: Role | null;
  walletAddress: string | null;
  userName: string | null;
  email: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (input: {
    role: Role;
    walletAddress: string;
    userName: string;
    email?: string;
    accessToken?: string;
    refreshToken?: string;
  }) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      activeRole: null,
      walletAddress: null,
      userName: null,
      email: null,
      accessToken: null,
      refreshToken: null,
      setAuth: ({ role, walletAddress, userName, email, accessToken, refreshToken }) =>
        set({
          activeRole: role,
          walletAddress,
          userName,
          email: email ?? null,
          accessToken: accessToken ?? null,
          refreshToken: refreshToken ?? null
        }),
      setAccessToken: (token) => set({ accessToken: token }),
      logout: () =>
        set({
          activeRole: null,
          walletAddress: null,
          userName: null,
          email: null,
          accessToken: null,
          refreshToken: null
        }),
    }),
    {
      name: 'verifund-auth',
    }
  )
);
