// src/store/useUIStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeType } from '../theme/colors';

interface UIState {
  theme: ThemeType;
  language: 'EN' | 'AR' | 'UR';
  geminiApiKey: string;
  isNotificationsEnabled: boolean;
  setTheme: (theme: ThemeType) => void;
  setLanguage: (lang: 'EN' | 'AR' | 'UR') => void;
  setGeminiApiKey: (key: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
}

// Storage adapter that works on both web and native
const webStorage = {
  getItem: (name: string) => {
    try {
      const item = typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null;
      return item ? Promise.resolve(JSON.parse(item)) : Promise.resolve(null);
    } catch {
      return Promise.resolve(null);
    }
  },
  setItem: (name: string, value: string) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(name, typeof value === 'string' ? value : JSON.stringify(value));
      }
      return Promise.resolve();
    } catch {
      return Promise.resolve();
    }
  },
  removeItem: (name: string) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(name);
      }
      return Promise.resolve();
    } catch {
      return Promise.resolve();
    }
  },
};

// Use a simple check to determine if we're on web
const isWeb = typeof localStorage !== 'undefined';

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'emerald',
      language: 'EN',
      geminiApiKey: '',
      isNotificationsEnabled: true,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey }),
      setNotificationsEnabled: (isNotificationsEnabled) => set({ isNotificationsEnabled }),
    }),
    {
      name: 'sajdah-ui-storage',
      storage: createJSONStorage(() => isWeb ? webStorage : AsyncStorage),
    }
  )
);
