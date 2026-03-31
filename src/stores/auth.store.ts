import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { logAuditEvent } from '../lib/audit';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User, token: string) => void;
  logout: () => void;
}

async function createAuthAuditLog(user: User, action: 'LOGOUT') {
  try {
    await logAuditEvent({
      userId: user.id,
      action,
      entityType: 'Auth',
      entityId: user.id,
      details: `User signed out (${user.email})`,
    });
  } catch (error) {
    console.error(`Failed to write ${action} audit log:`, error);
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setUser: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => {
        const currentUser = get().user;
        const wasAuthenticated = get().isAuthenticated;

        set({ user: null, token: null, isAuthenticated: false });

        if (currentUser && wasAuthenticated) {
          void createAuthAuditLog(currentUser, 'LOGOUT');
        }

        // In a real Next.js app, we'd also clear the HttpOnly cookie via an API call
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
