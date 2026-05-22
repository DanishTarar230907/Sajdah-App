// src/store/useQazaStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type IntensityMode = 'light' | 'moderate' | 'intensive' | 'custom';

export interface QazaCounter {
  Fajr: number;
  Dhuhr: number;
  Asr: number;
  Maghrib: number;
  Isha: number;
  Witr: number;
}

export interface QazaHistoryItem {
  id: string;
  date: string;
  prayer: string;
  action: 'completed' | 'incremented';
  count: number;
}

export interface QazaPlan {
  startDate: string; // YYYY-MM-DD
  targetDate: string; // YYYY-MM-DD
  dailyCommitment: {
    Fajr: number;
    Dhuhr: number;
    Asr: number;
    Maghrib: number;
    Isha: number;
  };
  active: boolean;
}

interface QazaState {
  initialCalculated: boolean;
  totalMissedInitially: QazaCounter;
  completedQaza: QazaCounter;
  intensityMode: IntensityMode;
  customSchedule: QazaCounter; // extra daily prayers
  xp: number;
  level: number;
  qazaHistory: QazaHistoryItem[];
  qazaPlan?: QazaPlan;

  calculateMissedPrayers: (params: {
    currentAge: number;
    obligatoryAge: number;
    yearsMissed: number;
    partialYearsConsistent: number;
    menstruationExclusionDaysPerMonth: number;
    gender: string;
    includeWitr: boolean;
  }) => void;

  logCompletedQaza: (prayer: keyof QazaCounter, count?: number) => void;
  incrementMissedQaza: (prayer: keyof QazaCounter, count?: number) => void;
  decrementMissedQaza: (prayer: keyof QazaCounter, count?: number) => void;
  setIntensityMode: (mode: IntensityMode) => void;
  updateCustomSchedule: (schedule: Partial<QazaCounter>) => void;
  resetQazaStore: () => void;
  getDailySchedule: () => QazaCounter;
  addQazaHistory: (prayer: string, action: 'completed' | 'incremented', count: number) => void;
  clearQazaHistory: () => void;
  createOrUpdatePlan: (plan: Partial<QazaPlan>) => void;
  deactivatePlan: () => void;
}

const EMPTY_COUNTER: QazaCounter = {
  Fajr: 0,
  Dhuhr: 0,
  Asr: 0,
  Maghrib: 0,
  Isha: 0,
  Witr: 0,
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

export const useQazaStore = create<QazaState>()(
  persist(
    (set, get) => ({
      initialCalculated: false,
      totalMissedInitially: { ...EMPTY_COUNTER },
      completedQaza: { ...EMPTY_COUNTER },
      intensityMode: 'moderate',
      customSchedule: {
        Fajr: 1,
        Dhuhr: 1,
        Asr: 1,
        Maghrib: 1,
        Isha: 1,
        Witr: 1,
      },
      xp: 0,
      level: 1,
      qazaHistory: [],
      qazaPlan: {
        startDate: new Date().toISOString().split('T')[0],
        targetDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
        dailyCommitment: { Fajr: 1, Dhuhr: 1, Asr: 1, Maghrib: 1, Isha: 1 },
        active: false,
      },

      calculateMissedPrayers: (params) => {
        const {
          currentAge,
          obligatoryAge,
          yearsMissed,
          partialYearsConsistent,
          menstruationExclusionDaysPerMonth,
          gender,
          includeWitr,
        } = params;

        // Calculate total days to consider
        // Years missed represents completely missed years
        // We subtract partial years of consistency
        const netMissedYears = Math.max(0, yearsMissed - partialYearsConsistent);
        
        if (netMissedYears <= 0) {
          set({
            initialCalculated: true,
            totalMissedInitially: { ...EMPTY_COUNTER },
            completedQaza: { ...EMPTY_COUNTER },
            xp: 0,
            level: 1,
          });
          return;
        }

        const totalMissedDays = netMissedYears * 365.25;

        // Menstruation exclusions for females
        let monthlyExclusions = 0;
        if (gender === 'Female') {
          monthlyExclusions = menstruationExclusionDaysPerMonth || 7; // standard default
        }
        const totalExclusionDays = (netMissedYears * 12) * monthlyExclusions;
        const netPrayingDays = Math.max(0, totalMissedDays - totalExclusionDays);

        const calculatedDeficit = Math.floor(netPrayingDays);

        const missed: QazaCounter = {
          Fajr: calculatedDeficit,
          Dhuhr: calculatedDeficit,
          Asr: calculatedDeficit,
          Maghrib: calculatedDeficit,
          Isha: calculatedDeficit,
          Witr: includeWitr ? calculatedDeficit : 0,
        };

        set({
          initialCalculated: true,
          totalMissedInitially: missed,
          completedQaza: { ...EMPTY_COUNTER },
          xp: 0,
          level: 1,
        });
      },

      logCompletedQaza: (prayer, count = 1) => {
        set((state) => {
          const completed = { ...state.completedQaza };
          const initial = state.totalMissedInitially[prayer];
          const actualAdded = Math.min(initial - completed[prayer], count);
          if (actualAdded <= 0) return {};

          completed[prayer] = completed[prayer] + actualAdded;

          const newXp = state.xp + (10 * actualAdded);
          const newLevel = Math.floor(newXp / 500) + 1;

          const historyItem: QazaHistoryItem = {
            id: Math.random().toString(36).substring(7),
            date: new Date().toISOString(),
            prayer,
            action: 'completed',
            count: actualAdded,
          };

          return {
            completedQaza: completed,
            xp: newXp,
            level: newLevel,
            qazaHistory: [historyItem, ...state.qazaHistory].slice(0, 100),
          };
        });
      },

      incrementMissedQaza: (prayer, count = 1) => {
        set((state) => {
          const totalMissed = { ...state.totalMissedInitially };
          totalMissed[prayer] = (totalMissed[prayer] || 0) + count;

          const historyItem: QazaHistoryItem = {
            id: Math.random().toString(36).substring(7),
            date: new Date().toISOString(),
            prayer,
            action: 'incremented',
            count,
          };

          return {
            totalMissedInitially: totalMissed,
            qazaHistory: [historyItem, ...state.qazaHistory].slice(0, 100),
          };
        });
      },

      decrementMissedQaza: (prayer, count = 1) => {
        set((state) => {
          const totalMissed = { ...state.totalMissedInitially };
          totalMissed[prayer] = Math.max(0, (totalMissed[prayer] || 0) - count);
          return {
            totalMissedInitially: totalMissed,
          };
        });
      },

      setIntensityMode: (intensityMode) => set({ intensityMode }),

      updateCustomSchedule: (schedule) =>
        set((state) => ({
          customSchedule: { ...state.customSchedule, ...schedule },
        })),

      resetQazaStore: () =>
        set({
          initialCalculated: false,
          totalMissedInitially: { ...EMPTY_COUNTER },
          completedQaza: { ...EMPTY_COUNTER },
          intensityMode: 'moderate',
          xp: 0,
          level: 1,
          qazaHistory: [],
        }),

      getDailySchedule: () => {
        const { intensityMode, customSchedule } = get();
        switch (intensityMode) {
          case 'light':
            return { Fajr: 1, Dhuhr: 1, Asr: 1, Maghrib: 1, Isha: 1, Witr: 1 };
          case 'intensive':
            return { Fajr: 3, Dhuhr: 3, Asr: 3, Maghrib: 3, Isha: 3, Witr: 3 };
          case 'custom':
            return customSchedule;
          case 'moderate':
          default:
            return { Fajr: 2, Dhuhr: 2, Asr: 2, Maghrib: 2, Isha: 2, Witr: 2 };
        }
      },

      addQazaHistory: (prayer, action, count) => {
        set((state) => {
          const historyItem: QazaHistoryItem = {
            id: Math.random().toString(36).substring(7),
            date: new Date().toISOString(),
            prayer,
            action,
            count,
          };
          return {
            qazaHistory: [historyItem, ...state.qazaHistory].slice(0, 100),
          };
        });
      },

      clearQazaHistory: () => set({ qazaHistory: [] }),

      createOrUpdatePlan: (newPlan) => {
        set((state) => ({
          qazaPlan: {
            startDate: newPlan.startDate || state.qazaPlan?.startDate || new Date().toISOString().split('T')[0],
            targetDate: newPlan.targetDate || state.qazaPlan?.targetDate || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
            dailyCommitment: {
              ...(state.qazaPlan?.dailyCommitment || { Fajr: 1, Dhuhr: 1, Asr: 1, Maghrib: 1, Isha: 1 }),
              ...(newPlan.dailyCommitment || {}),
            },
            active: newPlan.active !== undefined ? newPlan.active : (state.qazaPlan?.active ?? true),
          },
        }));
      },

      deactivatePlan: () => {
        set((state) => ({
          qazaPlan: state.qazaPlan ? { ...state.qazaPlan, active: false } : undefined,
        }));
      },
    }),
    {
      name: 'sajdah-qaza-storage',
      storage: createJSONStorage(() => isWeb ? webStorage : AsyncStorage),
    }
  )
);
