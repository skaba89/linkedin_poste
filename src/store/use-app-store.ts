import { create } from 'zustand';
import type { AppView, User } from '@/types';

interface AppState {
  currentView: AppView;
  user: User | null;
  token: string | null;
  selectedPostId: string | null;
  sidebarOpen: boolean;
  onboardingCompleted: boolean;

  setView: (view: AppView) => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  selectPost: (postId: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setOnboardingCompleted: (completed: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'login',
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('lp_token') : null,
  selectedPostId: null,
  sidebarOpen: false,
  onboardingCompleted: typeof window !== 'undefined' ? localStorage.getItem('lp_onboarding_done') === 'true' : false,

  setView: (view) => set({ currentView: view }),

  setUser: (user) => set({ user }),

  setToken: (token) => {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('lp_token', token);
      } else {
        localStorage.removeItem('lp_token');
      }
    }
    set({ token });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lp_token');
    }
    set({
      user: null,
      token: null,
      currentView: 'login',
      selectedPostId: null,
    });
  },

  selectPost: (postId) => set({ selectedPostId: postId }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setOnboardingCompleted: (completed) => {
    if (typeof window !== 'undefined') {
      if (completed) {
        localStorage.setItem('lp_onboarding_done', 'true');
      } else {
        localStorage.removeItem('lp_onboarding_done');
      }
    }
    set({ onboardingCompleted: completed });
  },
}));
