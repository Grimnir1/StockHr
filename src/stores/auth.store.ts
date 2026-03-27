import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { db } from '../firebase';
import { addDoc, collection } from 'firebase/firestore';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User, token: string) => void;
  logout: () => void;
}

async function createAuthAuditLog(user: User, action: 'LOGOUT') {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      user_id: user.id,
      user_name: user.name || user.email || 'Unknown User',
      action,
      entity_type: 'Auth',
      entity_id: user.id,
      details: `User signed out (${user.email})`,
      ip_address: '-',
      created_at: new Date().toISOString(),
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
