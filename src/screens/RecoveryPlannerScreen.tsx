// src/screens/RecoveryPlannerScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { ShieldCheck, Plus, Award, RefreshCw, BarChart2 } from 'lucide-react-native';
import { useUIStore } from '../store/useUIStore';
import { useQazaStore } from '../store/useQazaStore';
import { themes } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import RecoverySimulator from '../components/RecoverySimulator';

interface RecoveryPlannerScreenProps {
  navigation: any;
}

export const RecoveryPlannerScreen: React.FC<RecoveryPlannerScreenProps> = ({ navigation }) => {
  const { theme } = useUIStore();
  const { totalMissedInitially, completedQaza, logCompletedQaza, xp, level } = useQazaStore();
  const activeTheme = themes[theme];

  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Witr'] as const;

  const getSpiritualLevelTitle = (lvl: number) => {
    if (lvl < 3) return 'Sincere Novice';
    if (lvl < 6) return 'Devoted Seeker';
    if (lvl < 10) return 'Consistent Worshipper';
    return 'Guardian of Salah';
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: activeTheme.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: activeTheme.text }]}>Qaza Recovery Planner</Text>
          <Text style={[styles.subtitle, { color: activeTheme.textMuted }]}>
            Log your daily extra prayers systematically. Sincerity and patience will take you home.
          </Text>
        </View>
      </View>

      {/* Interactive Simulator widget (pacing modes and dynamic calendar projections) */}
      <RecoverySimulator />

      {/* Spiritual Level / XP Progression Card */}
      <GlassCard style={styles.levelCard}>
        <View style={styles.levelRow}>
          <View style={[styles.levelBadge, { backgroundColor: activeTheme.accent }]}>
            <Award size={24} color="#000000" />
            <Text style={styles.levelText}>Lv. {level}</Text>
          </View>
          <View style={styles.levelInfo}>
            <Text style={[styles.levelTitle, { color: activeTheme.text }]}>
              {getSpiritualLevelTitle(level)}
            </Text>
            <Text style={[styles.levelSub, { color: activeTheme.textMuted }]}>
              {xp % 500} / 500 XP to next tier (+10 XP per Qaza logged)
            </Text>
          </View>
        </View>
        <View style={[styles.xpBarBg, { backgroundColor: activeTheme.cardBorder }]}>
          <View
            style={[
              styles.xpBarFill,
              {
                backgroundColor: activeTheme.primary,
                width: `${((xp % 500) / 500) * 100}%`,
              },
            ]}
          />
        </View>
      </GlassCard>

      {/* Individual Prayer Qaza Counter Trackers */}
      <View style={styles.prayersSection}>
        <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Log Completed Prayers</Text>
        
        {prayers.map((prayer) => {
          const missed = totalMissedInitially[prayer] || 0;
          const completed = completedQaza[prayer] || 0;
          const remaining = Math.max(0, missed - completed);

          if (prayer === 'Witr' && totalMissedInitially.Witr === 0) return null;

          return (
            <GlassCard key={prayer} style={styles.prayerCard}>
              <View style={styles.prayerMainRow}>
                <View>
                  <Text style={[styles.prayerLabel, { color: activeTheme.text }]}>{prayer}</Text>
                  <Text style={[styles.prayerSubLabel, { color: activeTheme.textMuted }]}>
                    {remaining.toLocaleString()} remaining Qazas
                  </Text>
                </View>

                <View style={styles.prayerActions}>
                  <Text style={[styles.completedCount, { color: activeTheme.text }]}>
                    {completed} / <Text style={{ fontWeight: '800' }}>{missed}</Text>
                  </Text>

                  {remaining > 0 ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[styles.plusBtn, { backgroundColor: activeTheme.primary }]}
                      onPress={() => logCompletedQaza(prayer)}
                    >
                      <Plus size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.completedBadge, { backgroundColor: activeTheme.success }]}>
                      <ShieldCheck size={18} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              </View>

              {/* Progress Slider representation */}
              <View style={[styles.progressLineBg, { backgroundColor: activeTheme.cardBorder }]}>
                <View
                  style={[
                    styles.progressLineFill,
                    {
                      backgroundColor: activeTheme.accent,
                      width: missed > 0 ? `${(completed / missed) * 100}%` : '0%',
                    },
                  ]}
                />
              </View>
            </GlassCard>
          );
        })}
      </View>

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
  header: {
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  levelCard: {
    padding: 16,
    marginVertical: 10,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 1,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  levelSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  xpBarBg: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  prayersSection: {
    marginVertical: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  prayerCard: {
    padding: 14,
    marginBottom: 10,
  },
  prayerMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  prayerLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  prayerSubLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  prayerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  completedCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  plusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  completedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressLineBg: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
  },
  progressLineFill: {
    height: '100%',
    borderRadius: 2,
  },
});
export default RecoveryPlannerScreen;
