// src/store/useDhikrStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, doc, setDoc, getDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../services/firebase';

export interface DhikrGoal {
  id: string;
  arabic: string;
  english: string;
  translation: string;
  count: number;
  target: number;
  dateCreated: string;
  archived: boolean;
  history: Record<string, number>; // YYYY-MM-DD -> count
  participants: { uid: string; name: string; email: string }[]; // family/friend participants
}

export interface Contributor {
  rank: number;
  name: string;
  count: string;
}

export interface CommunityChallenge {
  title: string;
  subtitle: string;
  target: string;
  currentCount: string;
  participantsCount: string;
  topContributors: Contributor[];
  liveFeed: string[];
}

interface DhikrState {
  goals: DhikrGoal[];
  activeGoalId: string;
  communityChallenge: CommunityChallenge;

  // Social / invitation features
  pendingInvites: any[];
  addParticipantToGoal: (goalId: string, participant: { uid: string; name: string; email: string }) => void;
  sendDhikrInvite: (goalId: string, receiverUid: string, receiverName: string, receiverEmail: string) => Promise<void>;
  acceptDhikrInvite: (inviteId: string) => Promise<void>;
  declineDhikrInvite: (inviteId: string) => Promise<void>;
  subscribeToDhikrInvites: () => () => void;

  incrementGoalCount: (id: string, amount?: number) => void;
  decrementGoalCount: (id: string, amount?: number) => void;
  createNewGoal: (arabic: string, english: string, translation: string, target: number) => void;
  archiveGoal: (id: string) => void;
  setActiveGoal: (id: string) => void;
}

const DEFAULT_GOALS: DhikrGoal[] = [
  {
    id: 'subhanallah',
    arabic: 'سُبْحَانَ اللَّهِ',
    english: 'SubhanAllah',
    translation: 'Glory be to Allah',
    count: 340512,
    target: 1000000,
    dateCreated: new Date().toISOString(),
    archived: false,
    history: {
      '2026-05-15': 1200,
      '2026-05-16': 1800,
      '2026-05-17': 2500,
      '2026-05-18': 900,
      '2026-05-19': 1600,
      '2026-05-20': 3000,
      '2026-05-21': 2100,
    },
    participants: [],
  },
  {
    id: 'alhamdulillah',
    arabic: 'الْحَمْدُ لِلَّهِ',
    english: 'Alhamdulillah',
    translation: 'Praise be to Allah',
    count: 12400,
    target: 33000,
    dateCreated: new Date().toISOString(),
    archived: false,
    history: {
      '2026-05-20': 500,
      '2026-05-21': 800,
    },
    participants: [],
  },
];

const DEFAULT_COMMUNITY_CHALLENGE: CommunityChallenge = {
  title: '1 Billion Salawat',
  subtitle: 'Global Ummah Devotion',
  target: '1,000,000,000',
  currentCount: '456.2M',
  participantsCount: '+12k',
  topContributors: [
    { rank: 1, name: 'Omar Farooq', count: '1.2M' },
    { rank: 2, name: 'Fatima Zahra', count: '890k' },
    { rank: 3, name: 'Zayn Malik', count: '450k' },
  ],
  liveFeed: [
    'Ammi added 500 SubhanAllah...',
    'Tariq completed 100 Salawat...',
    'Sara reached her daily goal...',
  ]
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

const isWeb = typeof localStorage !== 'undefined';

export const useDhikrStore = create<DhikrState>()(
  persist(
    (set, get) => ({
      goals: DEFAULT_GOALS,
      activeGoalId: 'subhanallah',
      communityChallenge: DEFAULT_COMMUNITY_CHALLENGE,
      pendingInvites: [] as any[],

      addParticipantToGoal: (goalId: string, participant: { uid: string; name: string; email: string }) => {
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === goalId && !g.participants?.some((p) => p.uid === participant.uid)
              ? { ...g, participants: [...(g.participants || []), participant] }
              : g
          ),
        }));
      },

      sendDhikrInvite: async (goalId: string, receiverUid: string, receiverName: string, receiverEmail: string) => {
        if (!auth.currentUser) return;
        await addDoc(collection(db, 'dhikrInvites'), {
          goalId,
          senderId: auth.currentUser.uid,
          senderName: auth.currentUser.displayName || 'User',
          senderEmail: auth.currentUser.email,
          receiverId: receiverUid,
          receiverName,
          receiverEmail,
          status: 'pending',
          createdAt: new Date().toISOString(),
        });
      },

      acceptDhikrInvite: async (inviteId: string) => {
        const inviteRef = doc(db, 'dhikrInvites', inviteId);
        const snap = await getDoc(inviteRef);
        if (!snap.exists()) return;
        const data = snap.data() as any;
        await setDoc(inviteRef, { status: 'accepted' }, { merge: true });
        const store = useDhikrStore.getState();
        store.addParticipantToGoal(data.goalId, {
          uid: data.receiverId,
          name: data.receiverName,
          email: data.receiverEmail,
        });
      },

      declineDhikrInvite: async (inviteId: string) => {
        const inviteRef = doc(db, 'dhikrInvites', inviteId);
        await setDoc(inviteRef, { status: 'declined' }, { merge: true });
      },

      subscribeToDhikrInvites: () => {
        if (!auth.currentUser) return () => {};
        const q = query(
          collection(db, 'dhikrInvites'),
          where('receiverId', '==', auth.currentUser!.uid),
          where('status', '==', 'pending')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const invites = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          set({ pendingInvites: invites });
        });
        return unsubscribe;
      },

      incrementGoalCount: (id, amount = 1) => {
        set((state) => {
          const todayStr = new Date().toISOString().split('T')[0];
          const updatedGoals = state.goals.map((g) => {
            if (g.id === id) {
              const updatedHistory = { ...g.history };
              updatedHistory[todayStr] = (updatedHistory[todayStr] || 0) + amount;
              return {
                ...g,
                count: g.count + amount,
                history: updatedHistory,
              };
            }
            return g;
          });
          return { goals: updatedGoals };
        });
      },

      decrementGoalCount: (id, amount = 1) => {
        set((state) => {
          const todayStr = new Date().toISOString().split('T')[0];
          const updatedGoals = state.goals.map((g) => {
            if (g.id === id) {
              const updatedHistory = { ...g.history };
              const currentTodayVal = updatedHistory[todayStr] || 0;
              updatedHistory[todayStr] = Math.max(0, currentTodayVal - amount);
              return {
                ...g,
                count: Math.max(0, g.count - amount),
                history: updatedHistory,
              };
            }
            return g;
          });
          return { goals: updatedGoals };
        });
      },

      createNewGoal: (arabic, english, translation, target) => {
        set((state) => {
          const newGoal: DhikrGoal = {
            id: english.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
            arabic,
            english,
            translation,
            count: 0,
            target,
            dateCreated: new Date().toISOString(),
            archived: false,
            history: {},
            participants: [],
          };
          return {
            goals: [...state.goals, newGoal],
            activeGoalId: newGoal.id,
          };
        });
      },

      archiveGoal: (id) => {
        set((state) => ({
          goals: state.goals.map((g) => (g.id === id ? { ...g, archived: true } : g)),
        }));
      },

      setActiveGoal: (id) => {
        set({ activeGoalId: id });
      },
    }),
    {
      name: 'sajdah-dhikr-storage',
      storage: createJSONStorage(() => (isWeb ? webStorage : AsyncStorage)),
    }
  )
);
