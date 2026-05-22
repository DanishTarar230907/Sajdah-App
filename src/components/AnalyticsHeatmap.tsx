// src/components/AnalyticsHeatmap.tsx

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useUIStore } from '../store/useUIStore';
import { useSalahStore } from '../store/useSalahStore';
import { themes } from '../theme/colors';

export const AnalyticsHeatmap: React.FC = () => {
  const { theme } = useUIStore();
  const { history } = useSalahStore();
  const activeTheme = themes[theme];

  // Let's generate a list of the last 15 weeks (105 days)
  const columns = 15;
  const rows = 7;
  const totalDays = columns * rows;

  const days = [];
  const today = new Date();

  // Generate date keys starting from (totalDays - 1) days ago to today
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Calculate consistency percentage for that day
    const dayRecord = history[dateStr];
    let prayedCount = 0;
    
    if (dayRecord) {
      const prayers: (keyof typeof dayRecord)[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
      prayers.forEach(p => {
        if (
          dayRecord[p] === 'prayed_on_time' ||
          dayRecord[p] === 'prayed_late' ||
          dayRecord[p] === 'prayed_in_mosque' ||
          dayRecord[p] === 'prayed_with_jamaah'
        ) {
          prayedCount++;
        }
      });
    }

    days.push({
      date: d,
      dateStr,
      prayedCount,
      percentage: prayedCount / 5, // 0 to 1
    });
  }

  // Group days into columns (weeks)
  const weeks: any[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getCellColor = (percentage: number) => {
    if (percentage === 0) {
      return theme === 'emerald' ? 'rgba(11, 79, 58, 0.05)' : 'rgba(255, 255, 255, 0.05)';
    }
    if (percentage <= 0.2) {
      return theme === 'emerald' ? '#D1FAE5' : '#14532D';
    }
    if (percentage <= 0.4) {
      return theme === 'emerald' ? '#A7F3D0' : '#15803D';
    }
    if (percentage <= 0.6) {
      return theme === 'emerald' ? '#34D399' : '#22C55E';
    }
    if (percentage <= 0.8) {
      return theme === 'emerald' ? '#059669' : '#4ADE80';
    }
    return activeTheme.accent; // 100% gets the gold glowing badge/color!
  };

  // Extract monthly headers
  const getMonthHeaders = () => {
    const headers: { monthName: string; span: number }[] = [];
    let currentMonth = '';
    let spanCount = 0;

    weeks.forEach((week, wIdx) => {
      const firstDayOfWeek = week[0].date;
      const monthName = firstDayOfWeek.toLocaleString('default', { month: 'short' });

      if (monthName !== currentMonth) {
        if (spanCount > 0) {
          headers.push({ monthName: currentMonth, span: spanCount });
        }
        currentMonth = monthName;
        spanCount = 1;
      } else {
        spanCount++;
      }

      if (wIdx === weeks.length - 1) {
        headers.push({ monthName: currentMonth, span: spanCount });
      }
    });

    return headers;
  };

  const monthHeaders = getMonthHeaders();
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: activeTheme.text }]}>Salah Consistency Grid</Text>
      <Text style={[styles.subText, { color: activeTheme.textMuted }]}>
        Track your last 105 days of prayer completion. Golden cells represent full consistency.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Row Labels (Days of Week) */}
        <View style={styles.rowLabels}>
          {weekDays.map((day, idx) => (
            <Text key={idx} style={[styles.dayLabel, { color: activeTheme.textMuted }]}>
              {idx % 2 === 0 ? day : ''}
            </Text>
          ))}
        </View>

        {/* Heatmap Grid */}
        <View>
          {/* Month Headers */}
          <View style={styles.monthsRow}>
            {monthHeaders.map((hdr, idx) => (
              <Text
                key={idx}
                style={[
                  styles.monthLabel,
                  {
                    color: activeTheme.textMuted,
                    width: hdr.span * 19, // Cell width + margin offset
                  },
                ]}
                numberOfLines={1}
              >
                {hdr.monthName}
              </Text>
            ))}
          </View>

          <View style={styles.gridColumns}>
            {weeks.map((week: any[], wIdx: number) => (
              <View key={wIdx} style={styles.gridColumn}>
                {week.map((day: any, dIdx: number) => (
                  <View
                    key={dIdx}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: getCellColor(day.percentage),
                        borderColor: activeTheme.cardBorder,
                      },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: activeTheme.textMuted }]}>Less</Text>
        <View style={[styles.cellLegend, { backgroundColor: getCellColor(0) }]} />
        <View style={[styles.cellLegend, { backgroundColor: getCellColor(0.2) }]} />
        <View style={[styles.cellLegend, { backgroundColor: getCellColor(0.5) }]} />
        <View style={[styles.cellLegend, { backgroundColor: getCellColor(0.8) }]} />
        <View style={[styles.cellLegend, { backgroundColor: getCellColor(1) }]} />
        <Text style={[styles.legendText, { color: activeTheme.textMuted }]}>More</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  subText: {
    fontSize: 12,
    marginBottom: 16,
  },
  scrollContent: {
    flexDirection: 'row',
    paddingBottom: 10,
  },
  rowLabels: {
    justifyContent: 'space-between',
    paddingRight: 8,
    paddingTop: 22, // Push down past month labels
    height: 120 + 22,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '500',
    height: 14,
  },
  monthsRow: {
    flexDirection: 'row',
    height: 18,
    marginBottom: 4,
  },
  monthLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  gridColumns: {
    flexDirection: 'row',
  },
  gridColumn: {
    flexDirection: 'column',
    marginRight: 4,
  },
  cell: {
    width: 15,
    height: 15,
    borderRadius: 3.5,
    borderWidth: 0.5,
    marginBottom: 4,
    ...Platform.select({
      web: {
        transition: 'transform 0.1s ease',
        cursor: 'pointer',
        ':hover': {
          transform: 'scale(1.2)',
        }
      }
    })
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 4,
  },
  legendText: {
    fontSize: 10,
    marginHorizontal: 2,
  },
  cellLegend: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
export default AnalyticsHeatmap;
