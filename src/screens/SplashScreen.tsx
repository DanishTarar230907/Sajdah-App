// src/screens/SplashScreen.tsx

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, Platform } from 'react-native';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { themes } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../services/firebase';

interface SplashScreenProps {
  navigation: any;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const { theme } = useUIStore();
  const { profile } = useAuthStore();
  const activeTheme = themes[theme];

  useEffect(() => {
    const timer = setTimeout(() => {
      // Ensure authentic Firebase Authentication check controls whether we bypass Auth Screen
      if (auth.currentUser) {
        if (profile?.isOnboarded) {
          navigation.replace('Main');
        } else {
          navigation.replace('Onboarding');
        }
      } else {
        navigation.replace('Auth');
      }
    }, 2800);

    return () => clearTimeout(timer);
  }, [profile, navigation]);

  return (
    <LinearGradient
      colors={[activeTheme.primaryDark, activeTheme.primary]}
      style={styles.container}
    >
      {/* Background Islamic motif design details */}
      <View style={styles.motifContainer}>
        <Text style={styles.arabicMotif}>﷽</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.logoContainer, { borderColor: activeTheme.accent }]}>
          <Text style={[styles.logoText, { color: activeTheme.accent }]}>سجدة</Text>
        </View>

        <Text style={[styles.title, { color: '#FFFFFF' }]}>Sajdah</Text>
        <Text style={[styles.tagline, { color: activeTheme.accentLight }]}>
          Your premium spiritual operating system
        </Text>

        <Text style={[styles.quoteText, { color: 'rgba(255, 255, 255, 0.7)' }]}>
          “Indeed, prayer prohibits immorality and wrongdoing, and the remembrance of Allah is greater.” (29:45)
        </Text>
      </View>

      <View style={styles.footer}>
        <ActivityIndicator size="small" color={activeTheme.accent} />
        <Text style={[styles.loadingText, { color: 'rgba(255, 255, 255, 0.5)' }]}>
          Connecting heart to worship...
        </Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  motifContainer: {
    opacity: 0.15,
    marginTop: 20,
  },
  arabicMotif: {
    fontSize: 54,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoText: {
    fontSize: 36,
    fontWeight: '400',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 40,
    textAlign: 'center',
  },
  quoteText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    paddingHorizontal: 10,
  },
  footer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 11,
    marginTop: 10,
    letterSpacing: 0.5,
  },
});
export default SplashScreen;
