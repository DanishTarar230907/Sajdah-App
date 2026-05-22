// src/screens/AnalyticsScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Compass, BookOpen, Star, Calendar, ShieldCheck, MapPin } from 'lucide-react-native';
import { useUIStore } from '../store/useUIStore';
import { useSalahStore } from '../store/useSalahStore';
import { useQazaStore } from '../store/useQazaStore';
import { themes } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import AnalyticsHeatmap from '../components/AnalyticsHeatmap';

export const AnalyticsScreen: React.FC = () => {
  const { theme } = useUIStore();
  const { history, dailyStreak, bestStreak, fajrStreak, mosqueCount, jamaahCount } = useSalahStore();
  const { totalMissedInitially, completedQaza } = useQazaStore();
  const activeTheme = themes[theme];

  // Calculate individual prayer consistency rates based on logged history
  const getPrayerConsistency = () => {
    const dates = Object.keys(history);
    if (dates.length === 0) return { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };

    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
    const totals = { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };

    dates.forEach((dateStr) => {
      const dayRecord = history[dateStr];
      if (dayRecord) {
        prayers.forEach((p) => {
          if (
            dayRecord[p] === 'prayed_on_time' ||
            dayRecord[p] === 'prayed_late' ||
            dayRecord[p] === 'prayed_in_mosque' ||
            dayRecord[p] === 'prayed_with_jamaah'
          ) {
            totals[p]++;
          }
        });
      }
    });

    const rates = { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };
    prayers.forEach((p) => {
      rates[p] = Math.round((totals[p] / dates.length) * 100);
    });

    return rates;
  };

  const consistencyRates = getPrayerConsistency();
  const totalDaysLogged = Object.keys(history).length;

  return (
    <ScrollView style={[styles.container, { backgroundColor: activeTheme.background }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: activeTheme.text }]}>Spiritual Analytics</Text>
      <Text style={[styles.subtitle, { color: activeTheme.textMuted }]}>
        Analyze your historical prayer consistency, mosque attendance, and habit formations over time.
      </Text>

      {/* Heatmap Grid Calendar Component (shows the last 15 weeks of consistency) */}
      <GlassCard style={styles.heatmapCard}>
        <AnalyticsHeatmap />
      </GlassCard>

      {/* Summary grid widgets */}
      <View style={styles.grid}>
        <GlassCard style={styles.gridCell}>
          <Calendar size={18} color={activeTheme.primary} />
          <Text style={[styles.cellVal, { color: activeTheme.text }]}>{totalDaysLogged} Days</Text>
          <Text style={[styles.cellLabel, { color: activeTheme.textMuted }]}>TOTAL LOGGED</Text>
        </GlassCard>

        <GlassCard style={styles.gridCell}>
          <Star size={18} color={activeTheme.accent} />
          <Text style={[styles.cellVal, { color: activeTheme.text }]}>{bestStreak} Days</Text>
          <Text style={[styles.cellLabel, { color: activeTheme.textMuted }]}>BEST STREAK</Text>
        </GlassCard>

        <GlassCard style={styles.gridCell}>
          <MapPin size={18} color="#3B82F6" />
          <Text style={[styles.cellVal, { color: activeTheme.text }]}>{mosqueCount}</Text>
          <Text style={[styles.cellLabel, { color: activeTheme.textMuted }]}>MOSQUE PRAYERS</Text>
        </GlassCard>

        <GlassCard style={styles.gridCell}>
          <ShieldCheck size={18} color="#10B981" />
          <Text style={[styles.cellVal, { color: activeTheme.text }]}>{fajrStreak} Days</Text>
          <Text style={[styles.cellLabel, { color: activeTheme.textMuted }]}>FAJR CONSISTENCY</Text>
        </GlassCard>
      </View>

      {/* Prayer-by-prayer consistency rates progress bars */}
      <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Individual Prayer Performance</Text>
      
      <GlassCard style={styles.ratesCard}>
        {(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const).map((pName) => {
          const rate = consistencyRates[pName];
          return (
            <View key={pName} style={styles.rateRow}>
              <View style={styles.rateHeader}>
                <Text style={[styles.rateLabel, { color: activeTheme.text }]}>{pName}</Text>
                <Text style={[styles.rateVal, { color: activeTheme.primaryLight, fontWeight: '700' }]}>{rate}%</Text>
              </View>
              <View style={[styles.rateBarBg, { backgroundColor: activeTheme.cardBorder }]}>
                <View
                  style={[
                    styles.rateBarFill,
                    {
                      backgroundColor: rate > 75 ? activeTheme.accent : activeTheme.primary,
                      width: `${rate}%`,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
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
    marginBottom: 16,
  },
  heatmapCard: {
    padding: 12,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  gridCell: {
    width: '48%',
    padding: 14,
    alignItems: 'center',
  },
  cellVal: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 2,
  },
  cellLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  ratesCard: {
    padding: 16,
    marginBottom: 20,
  },
  rateRow: {
    width: '100%',
    marginBottom: 14,
  },
  rateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rateLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  rateVal: {
    fontSize: 12,
  },
  rateBarBg: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  rateBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
export default AnalyticsScreen;
