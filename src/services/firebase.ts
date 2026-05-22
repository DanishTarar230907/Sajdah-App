// src/services/firebase.ts

import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default Firebase Configuration for Sajdah App
// Connected directly to your actual project: sajdah-5da9e
const firebaseConfig = {
  apiKey: "AIzaSyCcIHTk9jlCHTFzQg8gK0vlzjRMcRWVSQU",
  authDomain: "sajdah-5da9e.firebaseapp.com",
  projectId: "sajdah-5da9e",
  storageBucket: "sajdah-5da9e.firebasestorage.app",
  messagingSenderId: "143679294083",
  appId: "1:143679294083:web:749228ca840278f3cfe9b6",
  measurementId: "G-ZXK84PB6SX"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with native AsyncStorage persistence to sustain logged-in sessions across restarts
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore DB
const db = getFirestore(app);

export { app, auth, db };
