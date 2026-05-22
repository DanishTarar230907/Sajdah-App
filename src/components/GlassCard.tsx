// src/components/GlassCard.tsx

import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getGlassmorphismStyle } from '../theme';
import { useUIStore } from '../store/useUIStore';
import { themes } from '../theme/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: any;
  gradientColors?: string[];
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style, gradientColors }) => {
  const { theme } = useUIStore();
  const activeTheme = themes[theme];

  // If specific gradients are passed, use them, otherwise use theme translucent background
  const defaultColors = theme === 'emerald'
    ? ['rgba(255, 255, 255, 0.9)', 'rgba(240, 247, 244, 0.85)']
    : theme === 'nightMosque'
    ? ['rgba(9, 30, 42, 0.85)', 'rgba(5, 20, 30, 0.75)']
    : theme === 'dark'
    ? ['rgba(30, 41, 59, 0.8)', 'rgba(15, 23, 42, 0.75)']
    : ['rgba(255, 255, 255, 0.95)', 'rgba(245, 245, 247, 0.9)'];

  const colorsToUse = gradientColors || defaultColors;

  return (
    <View style={[styles.container, { shadowColor: activeTheme.primaryDark }, style]}>
      <LinearGradient
        colors={colorsToUse as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          {
            borderColor: activeTheme.glassBorder,
            borderRadius: 18,
          }
        ]}
      >
        {children}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
      }
    }),
  },
  gradient: {
    borderWidth: 1.5,
    padding: 18,
  },
});
export default GlassCard;
