// src/screens/RamadanScreen.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Sparkles, Moon, Sun, BookOpen, Check } from 'lucide-react-native';
import { useUIStore } from '../store/useUIStore';
import { themes } from '../theme/colors';
import GlassCard from '../components/GlassCard';

export const RamadanScreen: React.FC = () => {
  const { theme } = useUIStore();
  const activeTheme = themes[theme];

  // Ramadan states
  const [fasting, setFasting] = useState(true);
  const [taraweehUnits, setTaraweehUnits] = useState(8);
  const [quranJuz, setQuranJuz] = useState(12);

  // Fasting days track
  const completedFasts = 14;
  const totalFasts = 30;

  return (
    <ScrollView style={[styles.container, { backgroundColor: activeTheme.background }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: activeTheme.text }]}>Ramadan Hub</Text>
      <Text style={[styles.subtitle, { color: activeTheme.textMuted }]}>
        Nurture your fasting, Taraweeh prayers, and Quran readings systematically during the blessed month.
      </Text>

      {/* Dynamic Iftar/Suhoor Countdowns Card */}
      <GlassCard style={styles.countdownCard}>
        <View style={styles.headerRow}>
          <Moon size={28} color={activeTheme.accent} />
          <Text style={styles.headerLabel}>IFTAR COUNTDOWN</Text>
          <Moon size={28} color={activeTheme.accent} style={{ transform: [{ scaleX: -1 }] } as any} />
        </View>

        <Text style={styles.countdownVal}>05h 42m</Text>
        <Text style={styles.countdownSub}>Sunset is at 8:12 PM. Suhoor ends tomorrow at 3:45 AM.</Text>

        <View style={[styles.progressBarBg, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: activeTheme.accent,
                width: `${(completedFasts / totalFasts) * 100}%`,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          Fasting Progress: <Text style={{ fontWeight: '700' }}>{completedFasts}</Text> of {totalFasts} Days completed
        </Text>
      </GlassCard>

      {/* Ramadan Checklist Tasks */}
      <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Today's Devotional Progress</Text>

      {/* Fasting tracker item */}
      <GlassCard style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <Sun size={20} color={activeTheme.accent} />
          <View style={styles.taskInfo}>
            <Text style={[styles.taskTitle, { color: activeTheme.text }]}>Fasting Status</Text>
            <Text style={[styles.taskDesc, { color: activeTheme.textMuted }]}>
              {fasting ? 'You are fasting today. Alhamdulillah.' : 'Exempted or not fasting today.'}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.checkbox,
              {
                borderColor: activeTheme.accent,
                backgroundColor: fasting ? activeTheme.primary : 'transparent',
              },
            ]}
            onPress={() => setFasting(!fasting)}
          >
            {fasting && <Check size={14} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </GlassCard>

      {/* Taraweeh Tracker item */}
      <GlassCard style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <Sparkles size={20} color="#9F5FEB" />
          <View style={styles.taskInfo}>
            <Text style={[styles.taskTitle, { color: activeTheme.text }]}>Taraweeh Checklist</Text>
            <Text style={[styles.taskDesc, { color: activeTheme.textMuted }]}>
              Logged: {taraweehUnits} Rak'ahs completed
            </Text>
          </View>
          <View style={styles.counterRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.countBtn, { backgroundColor: activeTheme.cardBorder }]}
              onPress={() => setTaraweehUnits(Math.max(0, taraweehUnits - 2))}
            >
              <Text style={[styles.countBtnText, { color: activeTheme.text }]}>-</Text>
            </TouchableOpacity>
            <Text style={[styles.counterVal, { color: activeTheme.text }]}>{taraweehUnits}</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.countBtn, { backgroundColor: activeTheme.cardBorder }]}
              onPress={() => setTaraweehUnits(Math.min(20, taraweehUnits + 2))}
            >
              <Text style={[styles.countBtnText, { color: activeTheme.text }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GlassCard>

      {/* Quran reading tracker item */}
      <GlassCard style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <BookOpen size={20} color={activeTheme.primary} />
          <View style={styles.taskInfo}>
            <Text style={[styles.taskTitle, { color: activeTheme.text }]}>Quran Recitation Goal</Text>
            <Text style={[styles.taskDesc, { color: activeTheme.textMuted }]}>
              Current milestone: Juz {quranJuz} of 30
            </Text>
          </View>
          <View style={styles.counterRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.countBtn, { backgroundColor: activeTheme.cardBorder }]}
              onPress={() => setQuranJuz(Math.max(0, quranJuz - 1))}
            >
              <Text style={[styles.countBtnText, { color: activeTheme.text }]}>-</Text>
            </TouchableOpacity>
            <Text style={[styles.counterVal, { color: activeTheme.text }]}>{quranJuz}</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.countBtn, { backgroundColor: activeTheme.cardBorder }]}
              onPress={() => setQuranJuz(Math.min(30, quranJuz + 1))}
            >
              <Text style={[styles.countBtnText, { color: activeTheme.text }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GlassCard>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  countdownCard: {
    backgroundColor: '#053123', // Static elegant dark background for starry night mosque feel!
    borderColor: 'rgba(212, 175, 55, 0.4)',
    alignItems: 'center',
    padding: 20,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  headerLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  countdownVal: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    marginVertical: 4,
  },
  countdownSub: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 16,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  taskCard: {
    padding: 14,
    marginBottom: 10,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskInfo: {
    flex: 1,
    paddingHorizontal: 12,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  taskDesc: {
    fontSize: 11.5,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  countBtnText: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: -2,
  },
  counterVal: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 16,
    textAlign: 'center',
  },
});
export default RamadanScreen;
