// src/store/useSalahStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SalahStatus =
  | 'not_yet'
  | 'prayed_on_time'
  | 'prayed_late'
  | 'prayed_in_mosque'
  | 'prayed_with_jamaah'
  | 'missed'
  | 'qaza_completed';

export interface DaySalahRecord {
  Fajr: SalahStatus;
  Dhuhr: SalahStatus;
  Asr: SalahStatus;
  Maghrib: SalahStatus;
  Isha: SalahStatus;
  Witr: SalahStatus;
}

export interface MosqueTimings {
  mode: 'offset' | 'custom';
  offset_minutes: number;
  custom: {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
  active: boolean;
}

interface SalahState {
  history: Record<string, DaySalahRecord>; // YYYY-MM-DD -> record
  dailyStreak: number;
  bestStreak: number;
  fajrStreak: number;
  dhuhrStreak: number;
  asrStreak: number;
  maghribStreak: number;
  ishaStreak: number;
  jamaahCount: number;
  mosqueCount: number;
  mosqueTimings: MosqueTimings;
  
  markPrayer: (dateStr: string, prayer: keyof DaySalahRecord, status: SalahStatus) => void;
  getRecord: (dateStr: string) => DaySalahRecord;
  recalculateStreaks: () => void;
  updateMosqueTimings: (timings: Partial<MosqueTimings>) => void;
  setMosqueTimingsActive: (active: boolean) => void;
}

const DEFAULT_DAY_RECORD: DaySalahRecord = {
  Fajr: 'not_yet',
  Dhuhr: 'not_yet',
  Asr: 'not_yet',
  Maghrib: 'not_yet',
  Isha: 'not_yet',
  Witr: 'not_yet',
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

export const useSalahStore = create<SalahState>()(
  persist(
    (set, get) => ({
      history: {},
      dailyStreak: 0,
      bestStreak: 0,
      fajrStreak: 0,
      dhuhrStreak: 0,
      asrStreak: 0,
      maghribStreak: 0,
      ishaStreak: 0,
      jamaahCount: 0,
      mosqueCount: 0,
      mosqueTimings: {
        mode: 'offset',
        offset_minutes: 0,
        custom: {
          fajr: '05:00 AM',
          dhuhr: '01:30 PM',
          asr: '04:45 PM',
          maghrib: '07:15 PM',
          isha: '08:45 PM',
        },
        active: false,
      },

      markPrayer: (dateStr, prayer, status) => {
        set((state) => {
          const updatedHistory = { ...state.history };
          const currentDay = updatedHistory[dateStr] ? { ...updatedHistory[dateStr] } : { ...DEFAULT_DAY_RECORD };
          
          currentDay[prayer] = status;
          updatedHistory[dateStr] = currentDay;

          // Update counts immediately
          let mosqueDiff = 0;
          let jamaahDiff = 0;

          const oldStatus = state.history[dateStr]?.[prayer] || 'not_yet';
          
          if (oldStatus === 'prayed_in_mosque') mosqueDiff--;
          if (oldStatus === 'prayed_with_jamaah') jamaahDiff--;

          if (status === 'prayed_in_mosque') mosqueDiff++;
          if (status === 'prayed_with_jamaah') jamaahDiff++;

          return {
            history: updatedHistory,
            mosqueCount: Math.max(0, state.mosqueCount + mosqueDiff),
            jamaahCount: Math.max(0, state.jamaahCount + jamaahDiff),
          };
        });

        // Recalculate streaks in background
        get().recalculateStreaks();
      },

      getRecord: (dateStr) => {
        const record = get().history[dateStr];
        return record || DEFAULT_DAY_RECORD;
      },

      recalculateStreaks: () => {
        const { history } = get();
        const dates = Object.keys(history).sort();
        if (dates.length === 0) return;

        let currentStreak = 0;
        let maxStreak = 0;

        // Simple helper to check if a day is fully prayed (excluding Witr which is Sunnah/Wajib in some schools)
        const isDayFullyPrayed = (rec: DaySalahRecord): boolean => {
          const prayers: (keyof DaySalahRecord)[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
          return prayers.every(p => 
            rec[p] === 'prayed_on_time' || 
            rec[p] === 'prayed_late' || 
            rec[p] === 'prayed_in_mosque' || 
            rec[p] === 'prayed_with_jamaah'
          );
        };

        const isPrayed = (status?: string): boolean => {
          return status === 'prayed_on_time' || status === 'prayed_late' || status === 'prayed_in_mosque' || status === 'prayed_with_jamaah';
        };

        // Standard streak tracking
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Sort dates in reverse chronological order
        const reverseDates = [...dates].reverse();

        // Calculate overall daily streak starting from today/yesterday backwards
        let checkDate = new Date();
        let continues = true;
        
        while (continues) {
          const checkDateStr = checkDate.toISOString().split('T')[0];
          const rec = history[checkDateStr];
          
          if (rec && isDayFullyPrayed(rec)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            // If it's today and they haven't completed all prayers yet, don't break the streak immediately
            // check if they completed yesterday
            if (checkDateStr === todayStr) {
              checkDate.setDate(checkDate.getDate() - 1);
              const yesterdayStr = checkDate.toISOString().split('T')[0];
              const yRec = history[yesterdayStr];
              if (!yRec || !isDayFullyPrayed(yRec)) {
                continues = false;
              }
            } else {
              continues = false;
            }
          }
        }

        // Calculate individual streaks for each of the 5 prayers backwards
        let currentFajrStreak = 0;
        let continuesFajr = true;
        let checkFajrDate = new Date();
        while (continuesFajr) {
          const checkDateStr = checkFajrDate.toISOString().split('T')[0];
          const rec = history[checkDateStr];
          if (rec && isPrayed(rec.Fajr)) {
            currentFajrStreak++;
            checkFajrDate.setDate(checkFajrDate.getDate() - 1);
          } else {
            if (checkDateStr === todayStr) {
              checkFajrDate.setDate(checkFajrDate.getDate() - 1);
              const yRec = history[checkFajrDate.toISOString().split('T')[0]];
              if (!yRec || !isPrayed(yRec.Fajr)) {
                continuesFajr = false;
              }
            } else {
              continuesFajr = false;
            }
          }
        }

        let currentDhuhrStreak = 0;
        let continuesDhuhr = true;
        let checkDhuhrDate = new Date();
        while (continuesDhuhr) {
          const checkDateStr = checkDhuhrDate.toISOString().split('T')[0];
          const rec = history[checkDateStr];
          if (rec && isPrayed(rec.Dhuhr)) {
            currentDhuhrStreak++;
            checkDhuhrDate.setDate(checkDhuhrDate.getDate() - 1);
          } else {
            if (checkDateStr === todayStr) {
              checkDhuhrDate.setDate(checkDhuhrDate.getDate() - 1);
              const yRec = history[checkDhuhrDate.toISOString().split('T')[0]];
              if (!yRec || !isPrayed(yRec.Dhuhr)) {
                continuesDhuhr = false;
              }
            } else {
              continuesDhuhr = false;
            }
          }
        }

        let currentAsrStreak = 0;
        let continuesAsr = true;
        let checkAsrDate = new Date();
        while (continuesAsr) {
          const checkDateStr = checkAsrDate.toISOString().split('T')[0];
          const rec = history[checkDateStr];
          if (rec && isPrayed(rec.Asr)) {
            currentAsrStreak++;
            checkAsrDate.setDate(checkAsrDate.getDate() - 1);
          } else {
            if (checkDateStr === todayStr) {
              checkAsrDate.setDate(checkAsrDate.getDate() - 1);
              const yRec = history[checkAsrDate.toISOString().split('T')[0]];
              if (!yRec || !isPrayed(yRec.Asr)) {
                continuesAsr = false;
              }
            } else {
              continuesAsr = false;
            }
          }
        }

        let currentMaghribStreak = 0;
        let continuesMaghrib = true;
        let checkMaghribDate = new Date();
        while (continuesMaghrib) {
          const checkDateStr = checkMaghribDate.toISOString().split('T')[0];
          const rec = history[checkDateStr];
          if (rec && isPrayed(rec.Maghrib)) {
            currentMaghribStreak++;
            checkMaghribDate.setDate(checkMaghribDate.getDate() - 1);
          } else {
            if (checkDateStr === todayStr) {
              checkMaghribDate.setDate(checkMaghribDate.getDate() - 1);
              const yRec = history[checkMaghribDate.toISOString().split('T')[0]];
              if (!yRec || !isPrayed(yRec.Maghrib)) {
                continuesMaghrib = false;
              }
            } else {
              continuesMaghrib = false;
            }
          }
        }

        let currentIshaStreak = 0;
        let continuesIsha = true;
        let checkIshaDate = new Date();
        while (continuesIsha) {
          const checkDateStr = checkIshaDate.toISOString().split('T')[0];
          const rec = history[checkDateStr];
          if (rec && isPrayed(rec.Isha)) {
            currentIshaStreak++;
            checkIshaDate.setDate(checkIshaDate.getDate() - 1);
          } else {
            if (checkDateStr === todayStr) {
              checkIshaDate.setDate(checkIshaDate.getDate() - 1);
              const yRec = history[checkIshaDate.toISOString().split('T')[0]];
              if (!yRec || !isPrayed(yRec.Isha)) {
                continuesIsha = false;
              }
            } else {
              continuesIsha = false;
            }
          }
        }

        // Calculate best streak historically
        let streakCounter = 0;
        const sortedDates = [...dates].sort();
        
        for (let i = 0; i < sortedDates.length; i++) {
          const rec = history[sortedDates[i]];
          if (isDayFullyPrayed(rec)) {
            streakCounter++;
            if (streakCounter > maxStreak) {
              maxStreak = streakCounter;
            }
          } else {
            streakCounter = 0;
          }
        }

        set({
          dailyStreak: currentStreak,
          bestStreak: Math.max(maxStreak, currentStreak),
          fajrStreak: currentFajrStreak,
          dhuhrStreak: currentDhuhrStreak,
          asrStreak: currentAsrStreak,
          maghribStreak: currentMaghribStreak,
          ishaStreak: currentIshaStreak,
        });
      },

      updateMosqueTimings: (newTimings) => {
        set((state) => ({
          mosqueTimings: {
            ...state.mosqueTimings,
            ...newTimings,
            custom: {
              ...state.mosqueTimings.custom,
              ...(newTimings.custom || {}),
            },
          },
        }));
      },

      setMosqueTimingsActive: (active) => {
        set((state) => ({
          mosqueTimings: {
            ...state.mosqueTimings,
            active,
          },
        }));
      },
    }),
    {
      name: 'sajdah-salah-storage',
      storage: createJSONStorage(() => isWeb ? webStorage : AsyncStorage),
    }
  )
);
