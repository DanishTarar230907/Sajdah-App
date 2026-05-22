// src/components/RecoverySimulator.tsx

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useUIStore } from '../store/useUIStore';
import { useQazaStore } from '../store/useQazaStore';
import { themes } from '../theme/colors';
import GlassCard from './GlassCard';

export const RecoverySimulator: React.FC = () => {
  const { theme } = useUIStore();
  const { totalMissedInitially, completedQaza, intensityMode, getDailySchedule, setIntensityMode } = useQazaStore();
  const activeTheme = themes[theme];

  // Get total missed and completed across all prayers
  const prayers: (keyof typeof totalMissedInitially)[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Witr'];
  const totalMissedCount = prayers.reduce((acc, p) => acc + (totalMissedInitially[p] || 0), 0);
  const totalCompletedCount = prayers.reduce((acc, p) => acc + (completedQaza[p] || 0), 0);
  const remainingCount = Math.max(0, totalMissedCount - totalCompletedCount);

  // Daily extra prayers schedule
  const dailyExtra = getDailySchedule();
  const totalDailyExtraCount = prayers.reduce((acc, p) => acc + (dailyExtra[p] || 0), 0);

  // Calculate dynamic projections
  const daysToComplete = totalDailyExtraCount > 0 ? remainingCount / totalDailyExtraCount : 0;
  const years = Math.floor(daysToComplete / 365.25);
  const months = Math.floor((daysToComplete % 365.25) / 30.44);

  const getCompletionDate = () => {
    if (daysToComplete === 0 || isNaN(daysToComplete) || !isFinite(daysToComplete)) return 'Never';
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysToComplete);
    return targetDate.toLocaleDateString('default', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getIntensityLabel = (mode: string) => {
    switch (mode) {
      case 'light':
        return 'Light (1 extra daily)';
      case 'moderate':
        return 'Moderate (2 extra daily)';
      case 'intensive':
        return 'Intensive (3 extra daily)';
      case 'custom':
        return 'Custom Schedule';
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: activeTheme.text }]}>Systematic Recovery Projection</Text>
      
      <GlassCard style={styles.card}>
        <View style={styles.statRow}>
          <View style={styles.statCell}>
            <Text style={[styles.statLabel, { color: activeTheme.textMuted }]}>TOTAL QAZA</Text>
            <Text style={[styles.statValue, { color: activeTheme.text }]}>{remainingCount.toLocaleString()}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statLabel, { color: activeTheme.textMuted }]}>DAILY TARGET</Text>
            <Text style={[styles.statValue, { color: activeTheme.accent }]}>+{totalDailyExtraCount} Qazas</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: activeTheme.cardBorder }]} />

        <View style={styles.intensitySelector}>
          <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Plan Pacing</Text>
          <View style={styles.buttonRow}>
            {(['light', 'moderate', 'intensive'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeButton,
                  {
                    backgroundColor: intensityMode === mode ? activeTheme.primary : 'rgba(0,0,0,0.03)',
                    borderColor: intensityMode === mode ? activeTheme.accent : activeTheme.cardBorder,
                  },
                ]}
                onPress={() => setIntensityMode(mode)}
              >
                <Text
                  style={[
                    styles.modeText,
                    {
                      color: intensityMode === mode ? '#FFFFFF' : activeTheme.textMuted,
                      fontWeight: intensityMode === mode ? '700' : '500',
                    },
                  ]}
                >
                  {mode.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: activeTheme.cardBorder }]} />

        <View style={styles.projectionBox}>
          <Text style={[styles.projectionTitle, { color: activeTheme.text }]}>Estimated Completion</Text>
          
          {remainingCount === 0 ? (
            <Text style={[styles.finishMessage, { color: activeTheme.success }]}>
              All prayers are up to date! Alhamdulillah.
            </Text>
          ) : totalDailyExtraCount === 0 ? (
            <Text style={[styles.finishMessage, { color: activeTheme.danger }]}>
              Please select a plan pacing to begin recovery projection.
            </Text>
          ) : (
            <View>
              <Text style={[styles.durationText, { color: activeTheme.primaryLight }]}>
                {years > 0 ? `${years} Year${years > 1 ? 's' : ''} ` : ''}
                {months > 0 ? `${months} Month${months > 1 ? 's' : ''}` : ''}
                {years === 0 && months === 0 ? 'Less than a month' : ''}
              </Text>
              
              <Text style={[styles.dateText, { color: activeTheme.text }]}>
                Target Date: <Text style={{ fontWeight: '700', color: activeTheme.accent }}>{getCompletionDate()}</Text>
              </Text>
              
              <Text style={[styles.encouragementText, { color: activeTheme.textMuted }]}>
                “The most beloved deeds to Allah are those done consistently, even if they are small.” (Hadith)
              </Text>
            </View>
          )}
        </View>
      </GlassCard>
    </View>
  );
};

// Simplified TouchableOpacity mock for TypeScript inside modular components
import { TouchableOpacity as RNTouchableOpacity } from 'react-native';
const TouchableOpacity = RNTouchableOpacity;

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  card: {
    padding: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  intensitySelector: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  modeText: {
    fontSize: 11,
  },
  projectionBox: {
    alignItems: 'center',
    textAlign: 'center',
  },
  projectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  finishMessage: {
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 8,
    textAlign: 'center',
  },
  durationText: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginVertical: 4,
  },
  dateText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  encouragementText: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
    paddingHorizontal: 12,
  },
});
export default RecoverySimulator;
