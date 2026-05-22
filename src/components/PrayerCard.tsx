// src/components/PrayerCard.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Check, Clock, ShieldAlert, Award, Compass, MapPin } from 'lucide-react-native';
import { useUIStore } from '../store/useUIStore';
import { themes } from '../theme/colors';
import { SalahStatus } from '../store/useSalahStore';

interface PrayerCardProps {
  name: string;
  time: string;
  status: SalahStatus;
  isNext: boolean;
  onSelectStatus: (status: SalahStatus) => void;
}

export const PrayerCard: React.FC<PrayerCardProps> = ({
  name,
  time,
  status,
  isNext,
  onSelectStatus,
}) => {
  const { theme, language } = useUIStore();
  const activeTheme = themes[theme];
  const [showOptions, setShowOptions] = useState(false);

  const activeLang = language === 'UR' ? 'UR' : 'EN';

  const getStatusBadge = () => {
    switch (status) {
      case 'prayed_on_time':
        return { 
          bg: activeTheme.accent, 
          text: activeTheme.primaryDark, 
          label: activeLang === 'UR' ? 'وقت پر' : 'On Time', 
          icon: <Check size={12} color={activeTheme.primaryDark} /> 
        };
      case 'prayed_late':
        return { 
          bg: '#FEF3C7', 
          text: '#92400E', 
          label: activeLang === 'UR' ? 'تاخیر سے' : 'Late', 
          icon: <Clock size={12} color="#92400E" /> 
        };
      case 'prayed_in_mosque':
        return { 
          bg: '#DBEAFE', 
          text: '#1E40AF', 
          label: activeLang === 'UR' ? 'مسجد میں' : 'Mosque', 
          icon: <MapPin size={12} color="#1E40AF" /> 
        };
      case 'prayed_with_jamaah':
        return { 
          bg: '#E0F2FE', 
          text: '#0369A1', 
          label: activeLang === 'UR' ? 'جماعت' : 'Jama\'ah', 
          icon: <Award size={12} color="#0369A1" /> 
        };
      case 'missed':
        return { 
          bg: '#FEE2E2', 
          text: '#991B1B', 
          label: activeLang === 'UR' ? 'قضا ہو گئی' : 'Missed', 
          icon: <ShieldAlert size={12} color="#991B1B" /> 
        };
      default:
        return null;
    }
  };

  const badge = getStatusBadge();

  const statusOptions: { key: SalahStatus; label: string; bg: string; text: string }[] = [
    { key: 'prayed_on_time', label: activeLang === 'UR' ? 'وقت پر' : 'On Time', bg: activeTheme.accent, text: activeTheme.primaryDark },
    { key: 'prayed_in_mosque', label: activeLang === 'UR' ? 'مسجد میں' : 'Mosque', bg: '#DBEAFE', text: '#1E40AF' },
    { key: 'prayed_with_jamaah', label: activeLang === 'UR' ? 'جماعت' : 'Jama\'ah', bg: '#E0F2FE', text: '#0369A1' },
    { key: 'prayed_late', label: activeLang === 'UR' ? 'تاخیر سے' : 'Late', bg: '#FEF3C7', text: '#92400E' },
    { key: 'missed', label: activeLang === 'UR' ? 'قضا ہو گئی' : 'Missed', bg: '#FEE2E2', text: '#991B1B' },
  ];

  return (
    <View style={styles.outerContainer}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShowOptions(!showOptions)}
        style={[
          styles.card,
          { 
            backgroundColor: isNext ? activeTheme.primary : activeTheme.primaryLight + '20',
            borderColor: isNext ? activeTheme.accent : 'rgba(255,255,255,0.05)',
            borderWidth: 1.5,
          }
        ]}
      >
        <View style={styles.row}>
          <View>
            <View style={styles.titleRow}>
              <Text style={[styles.prayerName, { color: '#FFFFFF' }]}>
                {name}
              </Text>
              {isNext && (
                <View style={[styles.nextBadge, { backgroundColor: activeTheme.accent }]}>
                  <Text style={[styles.nextText, { color: activeTheme.primaryDark }]}>
                    {activeLang === 'UR' ? 'اگلی' : 'NEXT'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.prayerTime, { color: isNext ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)' }]}>
              {time}
            </Text>
          </View>

          <View style={styles.rightContainer}>
            {badge ? (
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                {badge.icon}
                <Text style={[styles.badgeText, { color: badge.text }]}>
                  {badge.label}
                </Text>
              </View>
            ) : (
              <View style={[styles.logButton, { borderColor: activeTheme.accent }]}>
                <Text style={[styles.logText, { color: activeTheme.accent }]}>
                  {activeLang === 'UR' ? 'درج کریں' : 'LOG'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {showOptions && (
          <View style={styles.optionsDrawer}>
            <Text style={styles.optionsTitle}>
              {activeLang === 'UR' ? 'آپ نے یہ نماز کس طرح ادا کی؟' : 'How did you perform this Salah?'}
            </Text>
            <View style={styles.optionsGrid}>
              {statusOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.optButton,
                    { backgroundColor: opt.bg },
                    status === opt.key && { borderWidth: 2, borderColor: '#FFFFFF' },
                  ]}
                  onPress={() => {
                    onSelectStatus(opt.key);
                    setShowOptions(false);
                  }}
                >
                  <Text style={[styles.optText, { color: opt.text }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginVertical: 4,
    width: '100%',
  },
  card: {
    borderRadius: 16,
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayerName: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'left',
  },
  prayerTime: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600',
    textAlign: 'left',
  },
  nextBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  nextText: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  rightContainer: {
    alignItems: 'flex-end',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  logButton: {
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  logText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  optionsDrawer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  optionsTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.6)',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  optButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 72,
    alignItems: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' }
    })
  },
  optText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
export default PrayerCard;
