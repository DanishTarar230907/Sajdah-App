// src/store/useAuthStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Madhhab, CalculationMethod } from '../services/prayerEngine';

export interface UserProfile {
  name: string;
  gender: 'Male' | 'Female' | 'Prefer not to say';
  birthYear: number;
  obligatoryAge: number;
  country: string;
  city: string;
  madhhab: Madhhab;
  calculationMethod: CalculationMethod;
  isOnboarded: boolean;
  isGuest: boolean;
  spiritualGoals: string[];
  menstruationExclusionsDaysPerMonth: number; // for Female profiles qaza deduction calculations
  gmail: string | null;
  googleLinked: boolean;
  prayerOffsets: Record<string, number>;
  avatarUri: string | null;
  notificationSettings: Record<string, { azanAlert: boolean; preReminder: boolean }>;
}

interface AuthState {
  profile: UserProfile | null;
  latitude: number;
  longitude: number;
  setOnboardingCompleted: (completed: boolean) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setLocation: (lat: number, lon: number, city?: string, country?: string) => void;
  resetProfile: () => void;
  linkGmail: (email: string) => void;
  unlinkGmail: () => void;
  adjustPrayerOffset: (prayer: string, diff: number) => void;
  setPrayerOffsetDirectly: (prayer: string, offset: number) => void;
  updateAvatar: (uri: string | null) => void;
  toggleNotificationSetting: (prayer: string, type: 'azanAlert' | 'preReminder') => void;
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Servant of Allah',
  gender: 'Prefer not to say',
  birthYear: 1998,
  obligatoryAge: 15,
  country: 'United Kingdom',
  city: 'London',
  madhhab: 'Shafi\'i',
  calculationMethod: 'MWL',
  isOnboarded: false,
  isGuest: true,
  spiritualGoals: ['Consistency', 'Qaza Recovery'],
  menstruationExclusionsDaysPerMonth: 0,
  gmail: null,
  googleLinked: false,
  prayerOffsets: {
    Fajr: 0,
    Dhuhr: 0,
    Asr: 0,
    Maghrib: 0,
    Isha: 0,
    Witr: 0,
  },
  avatarUri: null,
  notificationSettings: {
    Fajr: { azanAlert: true, preReminder: true },
    Dhuhr: { azanAlert: true, preReminder: true },
    Asr: { azanAlert: true, preReminder: true },
    Maghrib: { azanAlert: true, preReminder: true },
    Isha: { azanAlert: true, preReminder: true },
  },
};

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      latitude: 51.5074, // Default London
      longitude: -0.1278,
      setOnboardingCompleted: (completed) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, isOnboarded: completed } : null,
        })),
      updateProfile: (updates) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : { ...DEFAULT_PROFILE, ...updates },
        })),
      setLocation: (latitude, longitude, city, country) =>
        set((state) => ({
          latitude,
          longitude,
          profile: state.profile
            ? {
                ...state.profile,
                city: city || state.profile.city,
                country: country || state.profile.country,
              }
            : null,
        })),
      resetProfile: () => set({ profile: DEFAULT_PROFILE, latitude: 51.5074, longitude: -0.1278 }),
      linkGmail: (email) =>
        set((state) => ({
          profile: state.profile
            ? { ...state.profile, gmail: email, googleLinked: true }
            : { ...DEFAULT_PROFILE, gmail: email, googleLinked: true },
        })),
      unlinkGmail: () =>
        set((state) => ({
          profile: state.profile
            ? { ...state.profile, gmail: null, googleLinked: false }
            : null,
        })),
      adjustPrayerOffset: (prayer, diff) =>
        set((state) => {
          if (!state.profile) return {};
          const offsets = { ...state.profile.prayerOffsets };
          offsets[prayer] = (offsets[prayer] || 0) + diff;
          return {
            profile: {
              ...state.profile,
              prayerOffsets: offsets,
            },
          };
        }),
      setPrayerOffsetDirectly: (prayer, offset) =>
        set((state) => {
          if (!state.profile) return {};
          const offsets = { ...state.profile.prayerOffsets };
          offsets[prayer] = offset;
          return {
            profile: {
              ...state.profile,
              prayerOffsets: offsets,
            },
          };
        }),
      updateAvatar: (uri) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, avatarUri: uri } : null,
        })),
      toggleNotificationSetting: (prayer, type) =>
        set((state) => {
          if (!state.profile) return {};
          const settings = { ...state.profile.notificationSettings };
          const prayerSetting = settings[prayer] || { azanAlert: true, preReminder: true };
          settings[prayer] = {
            ...prayerSetting,
            [type]: !prayerSetting[type],
          };
          return {
            profile: {
              ...state.profile,
              notificationSettings: settings,
            },
          };
        }),
    }),
    {
      name: 'sajdah-auth-storage',
      storage: createJSONStorage(() => isWeb ? webStorage : AsyncStorage),
    }
  )
);
