// src/theme/colors.ts

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;       // Gold accent
  accentLight: string;  // Light gold accent
  background: string;
  card: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  shadow: string;
  success: string;
  warning: string;
  danger: string;
  glassBg: string;
  glassBorder: string;
  glow: string;
}

export const themes = {
  emerald: {
    primary: '#0B4F3A',      // Dark emerald green
    primaryLight: '#187A5A', // Calming sage/emerald
    primaryDark: '#053123',  // Depths of emerald
    accent: '#D4AF37',       // Metallic gold
    accentLight: '#F3E5AB',  // Soft cream-gold
    background: '#F4F7F5',   // Calming off-white green tinted
    card: '#FFFFFF',
    cardBorder: 'rgba(11, 79, 58, 0.1)',
    text: '#1C2E24',
    textMuted: '#5C7467',
    shadow: 'rgba(11, 79, 58, 0.08)',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    glassBg: 'rgba(255, 255, 255, 0.85)',
    glassBorder: 'rgba(24, 122, 90, 0.15)',
    glow: '#187A5A',
  },
  dark: {
    primary: '#1E293B',
    primaryLight: '#334155',
    primaryDark: '#0F172A',
    accent: '#F59E0B',
    accentLight: '#FEF3C7',
    background: '#0F172A',   // Slate deep dark
    card: '#1E293B',
    cardBorder: 'rgba(255, 255, 255, 0.05)',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    shadow: 'rgba(0, 0, 0, 0.3)',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    glassBg: 'rgba(30, 41, 59, 0.75)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    glow: '#38BDF8',
  },
  nightMosque: {
    primary: '#091E2A',      // Deep twilight indigo-blue-green
    primaryLight: '#143547', // Midnight cyan
    primaryDark: '#041017',  // Pitch black twilight
    accent: '#F39C12',       // Golden lantern glow
    accentLight: '#FDEBD0',  // Warm amber glow
    background: '#05131C',   // Starry sky deep dark blue
    card: '#091E2A',
    cardBorder: 'rgba(243, 156, 18, 0.15)',
    text: '#ECF0F1',
    textMuted: '#85929E',
    shadow: 'rgba(0, 0, 0, 0.4)',
    success: '#2ECC71',
    warning: '#F1C40F',
    danger: '#E74C3C',
    glassBg: 'rgba(9, 30, 42, 0.8)',
    glassBorder: 'rgba(243, 156, 18, 0.2)',
    glow: '#F39C12',
  },
  light: {
    primary: '#2E4F4F',      // Modern deep teal
    primaryLight: '#0E8388', // Light ocean teal
    primaryDark: '#2C3333',  // Dark charcoal slate
    accent: '#C5A880',       // Champagne gold
    accentLight: '#EAE0DA',  // Cream sand
    background: '#F9F9FB',   // Clean bright white
    card: '#FFFFFF',
    cardBorder: 'rgba(46, 79, 79, 0.08)',
    text: '#2C3E50',
    textMuted: '#7F8C8D',
    shadow: 'rgba(46, 79, 79, 0.05)',
    success: '#27AE60',
    warning: '#F39C12',
    danger: '#C0392B',
    glassBg: 'rgba(255, 255, 255, 0.9)',
    glassBorder: 'rgba(46, 79, 79, 0.1)',
    glow: '#0E8388',
  }
};

export type ThemeType = 'emerald' | 'dark' | 'nightMosque' | 'light';
