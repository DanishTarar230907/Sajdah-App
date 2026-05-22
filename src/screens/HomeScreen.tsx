// src/screens/HomeScreen.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform, Image, Dimensions, Modal, Alert, TextInput } from 'react-native';
import { Settings as SettingsIcon, BookOpen, Clock, Flame, ChevronRight, CheckCircle, Circle, RefreshCw, Star, Users, XCircle, Check, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle as SvgCircle, G } from 'react-native-svg';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSalahStore, SalahStatus } from '../store/useSalahStore';
import { useQazaStore } from '../store/useQazaStore';
import { useDhikrStore } from '../store/useDhikrStore';
import { calculatePrayerTimes, getHijriDate } from '../services/prayerEngine';
import { themes } from '../theme/colors';

const { width } = Dimensions.get('window');

const QURAN_VERSES = [
  {
    surah: "An-Nisa (4:103)",
    arabic: "إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا",
    urdu: "بیشک نماز مومنوں پر مقررہ وقتوں میں فرض کی گئی ہے۔",
    english: "Indeed, prayer has been decreed upon the believers a decree of specified times."
  },
  {
    surah: "Al-Baqarah (2:45)",
    arabic: "وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ وَإِنَّهَا لَكَبِيرَةٌ إِلَّا عَلَى الْخَاشِعِينَ",
    urdu: "اور صبر اور نماز کے ساتھ مدد چاہو، اور بے شک نماز بھاری ہے مگر ان لوگوں پر جو عاجزی کرنے والے ہیں۔",
    english: "And seek help through patience and prayer, and indeed, it is difficult except for the humbly submissive."
  },
  {
    surah: "Taha (20:14)",
    arabic: "إِنَّنِي أَنَا اللَّهُ لَا إِلَٰهَ إِلَّا أَنَا فَاعْبُدْنِي وَأَقِمِ الصَّلَاةَ لِذِكْرِي",
    urdu: "بے شک میں ہی اللہ ہوں، میرے سوا کوئی معبود نہیں، پس میری ہی عبادت کرو اور میری یاد کے لیے نماز قائم کرو۔",
    english: "Indeed, I am Allah. There is no deity except Me, so worship Me and establish prayer for My remembrance."
  }
];

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, language } = useUIStore();
  const { profile, latitude, longitude } = useAuthStore();
  const { 
    getRecord, 
    markPrayer, 
    dailyStreak, 
    fajrStreak, 
    dhuhrStreak, 
    asrStreak, 
    maghribStreak, 
    ishaStreak, 
    mosqueTimings, 
    updateMosqueTimings, 
    setMosqueTimingsActive 
  } = useSalahStore();
  const { totalMissedInitially, completedQaza, logCompletedQaza, incrementMissedQaza } = useQazaStore();
  const { goals, activeGoalId, incrementGoalCount } = useDhikrStore();
  
  const [loggingPrayer, setLoggingPrayer] = useState<'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mosque Custom Timing Local Editor State
  const [showMosqueSheet, setShowMosqueSheet] = useState(false);
  const [mosqueEditMode, setMosqueEditMode] = useState<'offset' | 'custom'>('offset');
  const [tempOffset, setTempOffset] = useState<number>(0);
  const [customFajr, setCustomFajr] = useState('05:00 AM');
  const [customDhuhr, setCustomDhuhr] = useState('01:30 PM');
  const [customAsr, setCustomAsr] = useState('04:45 PM');
  const [customMaghrib, setCustomMaghrib] = useState('07:15 PM');
  const [customIsha, setCustomIsha] = useState('08:45 PM');
  const [selectedClockPrayer, setSelectedClockPrayer] = useState<'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha'>('Fajr');
  const [activeDialMode, setActiveDialMode] = useState<'hours' | 'minutes'>('hours');
  
  const activeTheme = themes[theme];
  const isUrdu = language === 'UR';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const translatePrayerName = (name: string) => {
    const translationsList: Record<string, Record<string, string>> = {
      Fajr: { EN: "Fajr", UR: "فجر" },
      Dhuhr: { EN: "Dhuhr", UR: "ظہر" },
      Asr: { EN: "Asr", UR: "عصر" },
      Maghrib: { EN: "Maghrib", UR: "مغرب" },
      Isha: { EN: "Isha", UR: "عشاء" },
      Witr: { EN: "Witr", UR: "وتر" },
    };
    return translationsList[name]?.[isUrdu ? 'UR' : 'EN'] || name;
  };

  // Foolproof helper methods for Touch-Friendly Mosque Steppers adjustment UI
  const parseTimeStr = (timeStr: string) => {
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      return {
        hour: parseInt(match[1]),
        minute: parseInt(match[2]),
        ampm: match[3].toUpperCase()
      };
    }
    return { hour: 12, minute: 0, ampm: 'AM' };
  };

  const formatTimeStr = (hour: number, minute: number, ampm: string) => {
    const hStr = hour.toString().padStart(2, '0');
    const mStr = minute.toString().padStart(2, '0');
    return `${hStr}:${mStr} ${ampm}`;
  };

  const getHourPart = (timeStr: string) => parseTimeStr(timeStr).hour;
  const getMinutePart = (timeStr: string) => parseTimeStr(timeStr).minute;
  const getAmPmPart = (timeStr: string) => parseTimeStr(timeStr).ampm;

  const getCustomVal = (prayer: string) => {
    switch (prayer) {
      case 'Fajr': return customFajr;
      case 'Dhuhr': return customDhuhr;
      case 'Asr': return customAsr;
      case 'Maghrib': return customMaghrib;
      case 'Isha': return customIsha;
      default: return '12:00 AM';
    }
  };

  const setCustomVal = (prayer: string, newVal: string) => {
    switch (prayer) {
      case 'Fajr': setCustomFajr(newVal); break;
      case 'Dhuhr': setCustomDhuhr(newVal); break;
      case 'Asr': setCustomAsr(newVal); break;
      case 'Maghrib': setCustomMaghrib(newVal); break;
      case 'Isha': setCustomIsha(newVal); break;
    }
  };

  const adjustCustomHour = (prayer: string, change: number) => {
    const currentVal = getCustomVal(prayer);
    const parsed = parseTimeStr(currentVal);
    let nextHour = parsed.hour + change;
    if (nextHour > 12) nextHour = 1;
    if (nextHour < 1) nextHour = 12;
    setCustomVal(prayer, formatTimeStr(nextHour, parsed.minute, parsed.ampm));
  };

  const adjustCustomMinute = (prayer: string, change: number) => {
    const currentVal = getCustomVal(prayer);
    const parsed = parseTimeStr(currentVal);
    let nextMin = parsed.minute + change;
    if (nextMin > 59) nextMin = 0;
    if (nextMin < 0) nextMin = 59;
    setCustomVal(prayer, formatTimeStr(parsed.hour, nextMin, parsed.ampm));
  };

  const toggleAmPm = (prayer: string) => {
    const currentVal = getCustomVal(prayer);
    const parsed = parseTimeStr(currentVal);
    const nextAmPm = parsed.ampm === 'AM' ? 'PM' : 'AM';
    setCustomVal(prayer, formatTimeStr(parsed.hour, parsed.minute, nextAmPm));
  };
  
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [verseIdx, setVerseIdx] = useState(0);
  
  // Ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(ticker);
  }, []);

  // Hydrate custom editors when store mosqueTimings updates
  useEffect(() => {
    if (mosqueTimings) {
      setTempOffset(mosqueTimings.offset_minutes || 0);
      setMosqueEditMode(mosqueTimings.mode || 'offset');
      if (mosqueTimings.custom) {
        setCustomFajr(mosqueTimings.custom.fajr || '05:00 AM');
        setCustomDhuhr(mosqueTimings.custom.dhuhr || '01:30 PM');
        setCustomAsr(mosqueTimings.custom.asr || '04:45 PM');
        setCustomMaghrib(mosqueTimings.custom.maghrib || '07:15 PM');
        setCustomIsha(mosqueTimings.custom.isha || '08:45 PM');
      }
    }
  }, [mosqueTimings]);

  const todayStr = currentTime.toISOString().split('T')[0];
  const todayRecord = getRecord(todayStr);

  const getBaseCalculatedTimes = () => {
    const baseOffsets = profile?.prayerOffsets || { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0, Witr: 0 };
    return calculatePrayerTimes(
      { latitude, longitude },
      currentTime,
      profile?.madhhab || 'Hanafi',
      profile?.calculationMethod || 'KARACHI',
      -(currentTime.getTimezoneOffset() / 60),
      baseOffsets
    );
  };

  const shiftTimeStr = (timeStr: string, shiftMins: number) => {
    if (!timeStr) return '';
    const [time, ampm] = timeStr.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    
    let totalMins = h * 60 + m + shiftMins;
    if (totalMins < 0) totalMins += 1440;
    if (totalMins >= 1440) totalMins -= 1440;
    
    const newH = Math.floor(totalMins / 60);
    const newM = totalMins % 60;
    const finalAmpm = newH >= 12 ? 'PM' : 'AM';
    const dispH = newH % 12 === 0 ? 12 : newH % 12;
    const dispM = newM < 10 ? `0${newM}` : newM;
    return `${dispH}:${dispM} ${finalAmpm}`;
  };

  const getDisplayPrayerTimes = () => {
    const baseTimes = getBaseCalculatedTimes();
    if (!mosqueTimings || !mosqueTimings.active) {
      return baseTimes;
    }

    const overridden = { ...baseTimes };
    if (mosqueTimings.mode === 'offset') {
      const shiftMins = mosqueTimings.offset_minutes || 0;
      (['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const).forEach(p => {
        overridden[p] = shiftTimeStr(baseTimes[p], shiftMins);
      });
    } else {
      const mapping = {
        Fajr: mosqueTimings.custom.fajr,
        Dhuhr: mosqueTimings.custom.dhuhr,
        Asr: mosqueTimings.custom.asr,
        Maghrib: mosqueTimings.custom.maghrib,
        Isha: mosqueTimings.custom.isha,
      };
      (['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const).forEach(p => {
        if (mapping[p]) {
          overridden[p] = mapping[p];
        }
      });
    }
    return overridden;
  };

  const getPrayerStartTime = (timeStr: string) => {
    if (!timeStr) return new Date();
    const [time, ampm] = timeStr.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    
    const d = new Date(currentTime);
    d.setHours(h, m, 0, 0);
    return d;
  };
  const activeDhikrGoal = goals.find(g => g.id === activeGoalId) || goals[0];
  const calculatedTimes = getDisplayPrayerTimes();

  // Simple next prayer calculations
  const getNextPrayer = () => {
    const list: ('Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha')[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const nowMs = currentTime.getTime();
    const parsed = list.map(name => {
      const timeStr = calculatedTimes[name];
      const [time, ampm] = timeStr.split(' ');
      let [h, m] = time.split(':').map(Number);
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      
      const d = new Date(currentTime);
      d.setHours(h, m, 0, 0);
      if (d.getTime() < nowMs) {
        d.setDate(d.getDate() + 1); // Tomorrow
      }
      return { name, date: d, timeStr };
    });
    
    parsed.sort((a, b) => a.date.getTime() - b.date.getTime());
    const next = parsed[0];
    const diffMs = next.date.getTime() - nowMs;
    const totalSecs = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    // Bounding bounds
    let prevName: 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha' = 'Isha';
    if (next.name === 'Dhuhr') prevName = 'Fajr';
    else if (next.name === 'Asr') prevName = 'Dhuhr';
    else if (next.name === 'Maghrib') prevName = 'Asr';
    else if (next.name === 'Isha') prevName = 'Maghrib';

    return {
      name: next.name,
      time: next.timeStr,
      prevName,
      prevTime: calculatedTimes[prevName],
      countdownStr: `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    };
  };

  const nextPrayer = getNextPrayer();

  const isCompleted = (status?: SalahStatus) => 
    status === 'prayed_on_time' || 
    status === 'prayed_late' || 
    status === 'prayed_in_mosque' || 
    status === 'prayed_with_jamaah';

  // Count prayed
  const completedTodayCount = 
    (isCompleted(todayRecord?.Fajr) ? 1 : 0) +
    (isCompleted(todayRecord?.Dhuhr) ? 1 : 0) +
    (isCompleted(todayRecord?.Asr) ? 1 : 0) +
    (isCompleted(todayRecord?.Maghrib) ? 1 : 0) +
    (isCompleted(todayRecord?.Isha) ? 1 : 0);

  // Dates strings
  const hijri = getHijriDate(currentTime);
  const dateBadgeString = `${currentTime.getDate()} ${currentTime.toLocaleString('default', { month: 'short' })} ${currentTime.getFullYear()} | ${hijri.day} ${hijri.month} ${hijri.year}`;

  const onRefresh = () => {
    setRefreshing(true);
    setCurrentTime(new Date());
    setTimeout(() => setRefreshing(false), 600);
  };

  const renderDhikrMiniWidget = () => {
    if (!activeDhikrGoal) return null;
    const pct = Math.min(100, Math.floor((activeDhikrGoal.count / activeDhikrGoal.target) * 100)) || 0;
    
    // Radial Svg size
    const s = 65;
    const sw = 6;
    const r = (s - sw) / 2;
    const circ = r * 2 * Math.PI;
    const offset = circ - (pct / 100) * circ;

    return (
      <TouchableOpacity 
        style={styles.dhikrWidgetCard}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('Dhikr')}
      >
        <View style={styles.dhikrWidgetLeft}>
          <Text style={styles.dhikrWidgetTitle}>{isUrdu ? 'روزانہ ذکر پیش رفت' : 'Daily Dhikr Widget'}</Text>
          <Text style={styles.dhikrWidgetArabic}>{activeDhikrGoal.arabic}</Text>
          <Text style={styles.dhikrWidgetEnglish}>{activeDhikrGoal.english}</Text>
          <Text style={styles.dhikrWidgetCounts}>{activeDhikrGoal.count.toLocaleString()} / {activeDhikrGoal.target.toLocaleString()}</Text>
        </View>

        <TouchableOpacity 
          style={styles.dhikrCircleWrapper}
          activeOpacity={0.8}
          onPress={() => incrementGoalCount(activeDhikrGoal.id, 1)}
        >
          <Svg width={s} height={s}>
            <G rotation="-90" origin={`${s/2}, ${s/2}`}>
              <SvgCircle cx={s/2} cy={s/2} r={r} stroke="rgba(0, 108, 68, 0.08)" strokeWidth={sw} fill="transparent" />
              <SvgCircle cx={s/2} cy={s/2} r={r} stroke="#006c44" strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" fill="transparent" />
            </G>
          </Svg>
          <View style={styles.dhikrCircleTextOverlay}>
            <Text style={styles.dhikrCirclePlus}>+</Text>
            <Text style={styles.dhikrCirclePct}>{pct}%</Text>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Qaza Pending Row Action
  const handleQuickQazaOffer = (prayer: 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha' | 'Witr') => {
    logCompletedQaza(prayer, 1);
  };

  const renderIndividualPrayerStreaks = () => {
    const activeTheme = themes[theme];
    const isUrdu = language === 'UR';
    
    const streaksList = [
      { name: 'Fajr', urdu: 'فجر', val: fajrStreak, color: '#f39c12' },
      { name: 'Dhuhr', urdu: 'ظہر', val: dhuhrStreak, color: '#e67e22' },
      { name: 'Asr', urdu: 'عصر', val: asrStreak, color: '#d35400' },
      { name: 'Maghrib', urdu: 'مغرب', val: maghribStreak, color: '#e74c3c' },
      { name: 'Isha', urdu: 'عشاء', val: ishaStreak, color: '#9b59b6' },
    ];

    return (
      <View style={[styles.streaksCard, { backgroundColor: activeTheme.card, borderColor: activeTheme.cardBorder }]}>
        <View style={styles.streaksCardHeader}>
          <Flame size={16} color="#d4af37" />
          <Text style={[styles.streaksCardTitle, { color: activeTheme.text }]}>
            {isUrdu ? 'انفرادی نماز کے سلسلے' : 'INDIVIDUAL PRAYER STREAKS'}
          </Text>
        </View>
        <Text style={styles.streaksCardSubtitle}>
          {isUrdu ? 'ہر نماز کا مسلسل ریکارڈ برقرار رکھیں۔' : 'Keep consecutive tracks of each individual salah.'}
        </Text>

        <View style={styles.streaksGrid}>
          {streaksList.map((s) => {
            const hasStreak = s.val > 0;
            return (
              <View key={s.name} style={styles.streakGridCol}>
                <View style={[
                  styles.streakFlameOuterCircle, 
                  { 
                    backgroundColor: hasStreak ? 'rgba(212, 175, 55, 0.08)' : 'rgba(112, 121, 116, 0.05)',
                    borderColor: hasStreak ? 'rgba(212, 175, 55, 0.2)' : 'rgba(112, 121, 116, 0.08)'
                  }
                ]}>
                  <Flame 
                    size={22} 
                    color={hasStreak ? s.color : '#bdc3c7'} 
                    style={hasStreak ? styles.glowingFlameEffect : undefined} 
                  />
                  <View style={[
                    styles.streakBadgeCounterCircle,
                    { backgroundColor: hasStreak ? s.color : '#bdc3c7' }
                  ]}>
                    <Text style={styles.streakBadgeCounterText}>{s.val}</Text>
                  </View>
                </View>
                <Text style={[styles.streakGridLabel, { color: activeTheme.text }]}>
                  {isUrdu ? s.urdu : s.name}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderQazaSnapshot = () => {
    const list: ('Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha')[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const urduNames = { Fajr: 'فجر', Dhuhr: 'ظہر', Asr: 'عصر', Maghrib: 'مغرب', Isha: 'عشاء' };
    
    let totalPending = 0;
    const items = list.map(p => {
      const missed = totalMissedInitially[p] || 0;
      const completed = completedQaza[p] || 0;
      const pending = Math.max(0, missed - completed);
      totalPending += pending;
      return { name: p, pending };
    });

    if (totalPending === 0) return null;

    return (
      <View style={styles.qazaSnapshotCard}>
        <View style={styles.qazaHeaderRow}>
          <View>
            <Text style={styles.qazaSnapshotTitle}>{isUrdu ? 'قضاء نمازیں زیر التواء' : 'Qaza Prayers Pending'}</Text>
            <Text style={styles.qazaSnapshotUrdu}>قضاء نمازیں</Text>
          </View>
          <Clock size={22} color="#c8a74b" />
        </View>

        <View style={styles.qazaSnapshotList}>
          {items.map(item => {
            if (item.pending === 0) return null;
            return (
              <View key={item.name} style={styles.qazaRow}>
                <View>
                  <Text style={styles.qazaRowTitle}>{item.name} • {urduNames[item.name]}</Text>
                  <Text style={styles.qazaRowSub}>{item.pending} {isUrdu ? 'باقی' : 'pending'}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.qazaOfferBtn}
                  activeOpacity={0.8}
                  onPress={() => handleQuickQazaOffer(item.name)}
                >
                  <Text style={styles.qazaOfferBtnText}>{isUrdu ? 'ادا کریں' : 'Offer Now'}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={styles.qazaFooterRow}>
          <Text style={styles.qazaTotalText}>
            {isUrdu ? `کل قضاء نمازیں: ${totalPending}` : `Total: ${totalPending} Qaza Remaining`}
          </Text>
        </View>
      </View>
    );
  };

  const getPrayerTranslation = (p: string) => {
    const names: Record<string, string> = { Fajr: 'فجر', Dhuhr: 'ظہر', Asr: 'عصر', Maghrib: 'مغرب', Isha: 'عشاء' };
    return names[p] || p;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fbf9f4' }}>
      <ScrollView
        style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#006c44']} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerProfileBox} 
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              {profile?.avatarUri ? (
                <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarLetterCircle}>
                  <Text style={styles.avatarLetter}>
                    {profile?.name ? profile.name.charAt(0).toUpperCase() : 'A'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.onlineDot} />
          </View>

          <View>
            <Text style={styles.greetingText}>{isUrdu ? 'السلام علیکم' : 'Assalamu Alaikum'}</Text>
            <Text style={styles.profileName}>{profile?.name || 'Ahmed Khan'}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingsBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Profile', { anchor: 'settings' })}
        >
          <SettingsIcon size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Date badge */}
      <View style={styles.dateBadgeContainer}>
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeText}>🗓️ {dateBadgeString}</Text>
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* Ayah of the day */}
        <View style={styles.ayahCard}>
          <View style={styles.ayahCardHeader}>
            <View style={styles.ayahHeaderLine} />
            <Text style={styles.ayahHeaderTitle}>{isUrdu ? 'آج کی آیت' : 'AYAH OF THE DAY'}</Text>
          </View>
          
          <Text style={styles.ayahArabic}>{QURAN_VERSES[verseIdx].arabic}</Text>
          <Text style={styles.ayahUrdu}>{QURAN_VERSES[verseIdx].urdu}</Text>
          <Text style={styles.ayahEnglish}>"{QURAN_VERSES[verseIdx].english}"</Text>
          
          <View style={styles.ayahCardFooter}>
            <Text style={styles.ayahSurah}>{QURAN_VERSES[verseIdx].surah}</Text>
            <View style={styles.ayahNav}>
              <TouchableOpacity onPress={() => setVerseIdx(prev => (prev - 1 + QURAN_VERSES.length) % QURAN_VERSES.length)}>
                <Text style={styles.ayahNavBtn}>◀</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVerseIdx(prev => (prev + 1) % QURAN_VERSES.length)}>
                <Text style={styles.ayahNavBtn}>▶</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Countdown Next Prayer */}
        <View style={styles.countdownCard}>
          <View style={styles.countdownPill}>
            <Text style={styles.countdownText}>
              ⌛ {translatePrayerName(nextPrayer.name)} {isUrdu ? 'میں' : 'in'} {nextPrayer.countdownStr}
            </Text>
          </View>
          
          <View style={styles.countdownTimes}>
            <View style={styles.timeBound}>
              <Text style={styles.boundLabel}>{isUrdu ? 'شروع' : 'Starts'}</Text>
              <Text style={styles.boundValue}>{nextPrayer.time}</Text>
            </View>
            <View style={styles.boundDivider} />
            <View style={styles.timeBound}>
              <Text style={styles.boundLabel}>{isUrdu ? 'سابقہ نماز' : 'Previous'}</Text>
              <Text style={styles.boundValue}>{nextPrayer.prevTime}</Text>
            </View>
          </View>
        </View>

        {/* Section 2: Mosque Timings Widget */}
        <View style={styles.mosqueTimingsCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Clock size={16} color="#006c44" />
              <Text style={styles.cardHeading}>{isUrdu ? 'مقامی مسجد اوقات' : 'Mosque Timings'}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setShowMosqueSheet(true)}
              style={styles.pencilBtn}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              activeOpacity={0.8}
            >
              <SettingsIcon size={16} color="#006c44" />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardSubText}>
            {isUrdu ? 'حسابی اوقات کو اپنی مقامی مسجد کے شیڈول سے تبدیل کریں۔' : "Override calculated times with your mosque's schedule"}
          </Text>

          {/* Timings rows */}
          <View style={styles.mosqueTimingsRows}>
            {(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const).map(p => {
              const baseTimes = getBaseCalculatedTimes();
              const calcT = baseTimes[p];
              const mosqueT = mosqueTimings?.active ? calculatedTimes[p] : (mosqueTimings?.mode === 'custom' ? mosqueTimings.custom[p.toLowerCase() as keyof typeof mosqueTimings.custom] : null);

              return (
                <View key={p} style={styles.mosqueRow}>
                  <Text style={styles.mosquePrayerName}>{translatePrayerName(p)}</Text>
                  <Text style={styles.mosqueCalcTime}>{isUrdu ? `حسابی: ${calcT}` : `Calculated: ${calcT}`}</Text>
                  {mosqueT ? (
                    <Text style={styles.mosqueTimeVal}>{isUrdu ? `مسجد: ${mosqueT}` : `Mosque: ${mosqueT}`}</Text>
                  ) : (
                    <TouchableOpacity 
                      style={styles.plusBtn}
                      onPress={() => setShowMosqueSheet(true)}
                    >
                      <Text style={styles.plusBtnText}>+</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>

          {/* Active indicator toggle */}
          <View style={styles.mosqueToggleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {mosqueTimings?.active && <View style={styles.pulseDot} />}
              <Text style={[styles.mosqueStatusLabel, mosqueTimings?.active && { color: '#006c44', fontWeight: '800' }]}>
                {mosqueTimings?.active 
                  ? (isUrdu ? 'مسجد کے اوقات فعال ہیں ✓' : 'Mosque timings active ✓')
                  : (isUrdu ? 'مسجد کے اوقات غیر فعال ہیں' : 'Mosque timings inactive')}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (setMosqueTimingsActive) {
                  setMosqueTimingsActive(!mosqueTimings?.active);
                  showToast(mosqueTimings?.active ? (isUrdu ? 'حسابی اوقات پر واپس' : 'Reverted to baseline times') : (isUrdu ? 'مسجد کے اوقات فعال' : 'Mosque timings activated!'));
                }
              }}
              style={[styles.toggleBtn, mosqueTimings?.active ? styles.toggleBtnActive : styles.toggleBtnInactive]}
            >
              <View style={[styles.toggleCircle, mosqueTimings?.active ? styles.toggleCircleActive : styles.toggleCircleInactive]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Prayers Strip */}
        <View style={styles.stripSection}>
          <View style={styles.stripHeader}>
            <Text style={styles.stripTitle}>{isUrdu ? 'آج کی نمازیں' : 'Daily Prayers'}</Text>
            <Text style={styles.stripStatus}>{completedTodayCount}/5 {isUrdu ? 'مکمل' : 'Completed'}</Text>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.stripScroll}
            snapToInterval={120}
            snapToAlignment="center"
            decelerationRate="fast"
          >
            {(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const).map(p => {
              const status = todayRecord?.[p] || 'not_yet';
              const completed = status === 'prayed_on_time' || status === 'prayed_late' || status === 'prayed_in_mosque' || status === 'prayed_with_jamaah' || status === 'qaza_completed';
              const isMissedStatus = status === 'missed';
              const isLateStatus = status === 'prayed_late';
              const isActive = nextPrayer.name === p;
              const timeStr = calculatedTimes[p];
              const isLocked = currentTime.getTime() < getPrayerStartTime(timeStr).getTime();

              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.prayerStripCard,
                    isActive && styles.activePrayerCard,
                    completed && styles.completedPrayerCard,
                    isMissedStatus && styles.missedPrayerCard,
                    isLateStatus && styles.latePrayerCard,
                    isLocked && styles.lockedPrayerCard,
                  ]}
                  activeOpacity={isLocked ? 0.6 : 0.9}
                  onPress={() => {
                    if (isLocked) {
                      showToast(isUrdu ? `${translatePrayerName(p)} ابھی شروع نہیں ہوئی۔ آپ ${timeStr} کے بعد نشان کر سکتے ہیں` : `${p} hasn't started yet. You can mark it after ${timeStr}`);
                    } else {
                      setLoggingPrayer(p);
                    }
                  }}
                >
                  {isActive && !isLocked && <View style={styles.activePill}><Text style={styles.activePillText}>{isUrdu ? 'موجودہ' : 'Active'}</Text></View>}
                  <Text style={[styles.stripCardName, isActive && styles.activeCardText, isLocked && { opacity: 0.5 }]}>{p}</Text>
                  <Text style={[styles.stripCardTranslation, isActive && styles.activeCardText, isLocked && { opacity: 0.5 }]}>{getPrayerTranslation(p)}</Text>
                  <Text style={[styles.stripCardTime, isActive && styles.activeCardText, isLocked && { opacity: 0.5 }]}>{timeStr}</Text>
                  
                  <View style={styles.stripCardStatus}>
                    {isLocked ? (
                      <Lock size={16} color="rgba(0, 54, 41, 0.4)" />
                    ) : completed ? (
                      <CheckCircle size={20} color="#006c44" />
                    ) : isMissedStatus ? (
                      <XCircle size={20} color="#ba1a1a" />
                    ) : isLateStatus ? (
                      <RefreshCw size={18} color="#c8a74b" />
                    ) : (
                      <Circle size={20} color="#c0c9c3" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Streaks scroll list */}
        <View style={styles.streaksSection}>
          <Text style={styles.streaksTitle}>{isUrdu ? 'آپ کے سلسلے 🔥' : 'Your Streaks 🔥'}</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.streaksScroll}>
            <View style={styles.streakIndicatorCell}>
              <Text style={styles.streakEmoji}>🕌</Text>
              <Text style={styles.streakCellLabel}>{isUrdu ? 'جماعت' : "Jama'at"}</Text>
              <Text style={styles.streakCellVal}>12</Text>
            </View>
            <View style={styles.streakIndicatorCell}>
              <Text style={styles.streakEmoji}>📖</Text>
              <Text style={styles.streakCellLabel}>{isUrdu ? 'قرآن' : 'Quran'}</Text>
              <Text style={styles.streakCellVal}>5</Text>
            </View>
            <View style={styles.streakIndicatorCell}>
              <Text style={styles.streakEmoji}>📿</Text>
              <Text style={styles.streakCellLabel}>{isUrdu ? 'ذکر' : 'Dhikr'}</Text>
              <Text style={styles.streakCellVal}>24</Text>
            </View>
            <View style={styles.streakIndicatorCell}>
              <Text style={styles.streakEmoji}>🌅</Text>
              <Text style={styles.streakCellLabel}>{isUrdu ? 'تہجد' : 'Tahajjud'}</Text>
              <Text style={styles.streakCellVal}>3</Text>
            </View>
            <View style={styles.streakIndicatorCell}>
              <Text style={styles.streakEmoji}>✨</Text>
              <Text style={styles.streakCellLabel}>{isUrdu ? 'سنت' : 'Sunnah'}</Text>
              <Text style={styles.streakCellVal}>8</Text>
            </View>
          </ScrollView>

          {/* Overall Motivation Banner */}
          <LinearGradient
            colors={['#003629', '#1b4d3e']}
            style={styles.motivationBanner}
          >
            <View style={styles.motivationHeader}>
              <Text style={styles.motivationEmoji}>🔥</Text>
              <Text style={styles.motivationTitle}>{dailyStreak} {isUrdu ? 'روزہ سلسلہ' : 'Days Streak'}</Text>
            </View>
            <Text style={styles.motivationDesc}>
              {isUrdu ? 'روزانہ تمام ۵ نمازوں کا ریکارڈ درج کریں۔' : 'All 5 Prayers recorded daily.'}
            </Text>
            <View style={styles.motivationProgressRow}>
              <View style={styles.motivationProgressBarBg}>
                <View style={[styles.motivationProgressBarFill, { width: `${Math.min(100, (dailyStreak / 7) * 100)}%` }]} />
              </View>
              <Text style={styles.motivationProgressLabel}>{dailyStreak}/7 DAYS</Text>
            </View>
          </LinearGradient>

          {/* Individual Prayer Streaks Card Block */}
          {renderIndividualPrayerStreaks()}
        </View>

        {/* Daily Dhikr Mini Widget */}
        {renderDhikrMiniWidget()}

        {/* Qaza Snapshot */}
        {renderQazaSnapshot()}
      </View>

      {/* Interactive Status Logger Bottom Sheet Modal */}
      <Modal
        visible={loggingPrayer !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLoggingPrayer(null)}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setLoggingPrayer(null)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderBar} />
            <Text style={styles.modalTitle}>
              {isUrdu ? `${translatePrayerName(loggingPrayer || '')} کی حاضری` : `${loggingPrayer} Attendance`}
            </Text>
            <Text style={styles.modalSubtitle}>
              {isUrdu ? 'اس نماز کا حاضری کا ریکارڈ درج کریں:' : 'Select the logged status for this prayer:'}
            </Text>

            <View style={styles.modalOptionsContainer}>
              {/* Option 1: Yes, I prayed */}
              <TouchableOpacity
                style={[styles.modalOptionCard, styles.optionOffered]}
                onPress={() => {
                  if (loggingPrayer) {
                    markPrayer(todayStr, loggingPrayer, 'prayed_on_time');
                    showToast(isUrdu ? `${translatePrayerName(loggingPrayer)} ادا کی گئی نشان زد ہو گئی! ✨` : `${loggingPrayer} marked as offered! ✨`);
                  }
                  setLoggingPrayer(null);
                }}
              >
                <View style={[styles.optionIconBg, { backgroundColor: 'rgba(0, 108, 68, 0.1)' }]}>
                  <CheckCircle size={24} color="#006c44" />
                </View>
                <View style={styles.optionTextCol}>
                  <Text style={[styles.optionTitle, { color: '#006c44' }]}>{isUrdu ? 'جی ہاں، میں نے ادا کی' : 'Yes, I prayed'}</Text>
                  <Text style={styles.optionSub}>{isUrdu ? 'سلسلہ برقرار رکھیں اور کامیابی حاصل کریں' : 'Maintains daily streak & XP progress'}</Text>
                </View>
                <ChevronRight size={18} color="#006c44" />
              </TouchableOpacity>

              {/* Option 2: I missed it */}
              <TouchableOpacity
                style={[styles.modalOptionCard, styles.optionMissed]}
                onPress={() => {
                  if (loggingPrayer) {
                    markPrayer(todayStr, loggingPrayer, 'missed');
                    incrementMissedQaza(loggingPrayer, 1);
                    showToast(isUrdu ? `${translatePrayerName(loggingPrayer)} قضاء رجسٹر ہو گئی` : `${loggingPrayer} logged as missed`);
                  }
                  setLoggingPrayer(null);
                }}
              >
                <View style={[styles.optionIconBg, { backgroundColor: 'rgba(186, 26, 26, 0.1)' }]}>
                  <XCircle size={24} color="#ba1a1a" />
                </View>
                <View style={styles.optionTextCol}>
                  <Text style={[styles.optionTitle, { color: '#ba1a1a' }]}>{isUrdu ? 'میں نے نہیں پڑھی / قضاء ہو گئی' : 'I missed it'}</Text>
                  <Text style={styles.optionSub}>{isUrdu ? 'سلسلہ ٹوٹ جائے گا، قضاء فہرست میں اضافہ' : 'Resets streak, adds to your Qaza checklist'}</Text>
                </View>
                <ChevronRight size={18} color="#ba1a1a" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.modalCancelBtn}
              onPress={() => setLoggingPrayer(null)}
            >
              <Text style={styles.modalCancelBtnText}>{isUrdu ? 'بند کریں' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Customise Mosque Timings Bottom Sheet */}
      <Modal
        visible={showMosqueSheet}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMosqueSheet(false)}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowMosqueSheet(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={() => {}}
            style={styles.modalContent}
          >
            <View style={styles.modalHeaderBar} />
            <Text style={styles.modalTitle}>
              {isUrdu ? 'مسجد اوقات اپنی مرضی کے مطابق کریں' : 'Customise Mosque Timings'}
            </Text>

            {/* Mode Tab selector */}
            <View style={styles.mosqueSheetTabRow}>
              <TouchableOpacity
                style={[styles.mosqueSheetTab, mosqueEditMode === 'offset' && styles.mosqueSheetTabActive]}
                onPress={() => setMosqueEditMode('offset')}
              >
                <Text style={[styles.mosqueSheetTabText, mosqueEditMode === 'offset' && styles.mosqueSheetTabTextActive]}>
                  {isUrdu ? 'عالمی آفسیٹ' : 'Global Offset'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mosqueSheetTab, mosqueEditMode === 'custom' && styles.mosqueSheetTabActive]}
                onPress={() => setMosqueEditMode('custom')}
              >
                <Text style={[styles.mosqueSheetTabText, mosqueEditMode === 'custom' && styles.mosqueSheetTabTextActive]}>
                  {isUrdu ? 'انفرادی اوقات' : 'Per Prayer Time'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={{ maxHeight: 320, width: '100%' }}
              contentContainerStyle={{ paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {mosqueEditMode === 'offset' ? (
              /* Mode A: Global Offset Slider/Stepper input */
              <View style={styles.sheetBody}>
                <Text style={styles.inputLabel}>
                  {isUrdu ? 'تمام نمازوں کے اوقات کو منٹ سے منتقل کریں:' : 'Shift all prayers by minutes:'}
                </Text>
                
                <View style={styles.stepperContainer}>
                  <TouchableOpacity 
                    style={styles.stepperBtn}
                    onPress={() => setTempOffset(prev => Math.max(-30, prev - 1))}
                  >
                    <Text style={styles.stepperBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperValText}>
                    {tempOffset > 0 ? `+${tempOffset}` : tempOffset} {isUrdu ? 'منٹ' : 'minutes'}
                  </Text>
                  <TouchableOpacity 
                    style={styles.stepperBtn}
                    onPress={() => setTempOffset(prev => Math.min(30, prev + 1))}
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* Live preview table of shifted times */}
                <Text style={[styles.inputLabel, { marginTop: 12, marginBottom: 6 }]}>
                  {isUrdu ? 'براہ راست پیش نظارہ:' : 'Live Preview:'}
                </Text>
                <View style={styles.previewTable}>
                  {(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const).map(p => {
                    const baseTimes = getBaseCalculatedTimes();
                    const calcT = baseTimes[p];
                    const shiftedT = shiftTimeStr(calcT, tempOffset);
                    return (
                      <View key={p} style={styles.previewRow}>
                        <Text style={styles.previewPrayerName}>{p}</Text>
                        <Text style={styles.previewOldTime}>{calcT}</Text>
                        <Text style={styles.previewNewTime}>→  {shiftedT}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              /* Mode B: Per Prayer custom time inputs (Premium Clock Dial Interface) */
              <View style={[styles.sheetBody, { alignItems: 'center' }]}>
                {/* Segmented active prayer control */}
                <View style={styles.clockPrayerSegments}>
                  {(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const).map(p => {
                    const active = selectedClockPrayer === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[styles.clockPrayerBtn, active && styles.clockPrayerBtnActive]}
                        onPress={() => setSelectedClockPrayer(p)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.clockPrayerText, active && styles.clockPrayerTextActive]}>
                          {translatePrayerName(p)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {(() => {
                  const currentVal = getCustomVal(selectedClockPrayer);
                  const parsed = parseTimeStr(currentVal);
                  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
                  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

                  return (
                    <View style={styles.clockOuterContainer}>
                      {/* Dynamic digital presentation */}
                      <View style={styles.clockDigitalRow}>
                        <View style={styles.clockDigitalBox}>
                          <Text style={styles.clockDigitalText}>{currentVal.split(' ')[0]}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.clockAmPmToggleBtn}
                          onPress={() => toggleAmPm(selectedClockPrayer)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.clockAmPmToggleBtnText}>{parsed.ampm}</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Hour/Minute dial switcher toggle */}
                      <View style={styles.clockDialModeRow}>
                        <TouchableOpacity
                          style={[styles.clockDialModeBtn, activeDialMode === 'hours' && styles.clockDialModeBtnActive]}
                          onPress={() => setActiveDialMode('hours')}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.clockDialModeText, activeDialMode === 'hours' && styles.clockDialModeTextActive]}>
                            {isUrdu ? 'گھنٹہ' : 'Hours'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.clockDialModeBtn, activeDialMode === 'minutes' && styles.clockDialModeBtnActive]}
                          onPress={() => setActiveDialMode('minutes')}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.clockDialModeText, activeDialMode === 'minutes' && styles.clockDialModeTextActive]}>
                            {isUrdu ? 'منٹ' : 'Minutes'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Circular Dial Plate */}
                      <View style={styles.clockFaceCircle}>
                        {/* Center Pivot */}
                        <View style={styles.clockCenterPivot} />

                        {/* Analog Dial Hand */}
                        {(() => {
                          const handAngle = activeDialMode === 'hours' ? (parsed.hour % 12) * 30 : (parsed.minute / 5) * 30;
                          return (
                            <View 
                              style={{
                                position: 'absolute',
                                bottom: '50%',
                                left: '50%',
                                width: 2,
                                height: 54,
                                backgroundColor: '#006c44',
                                transform: [
                                  { translateX: -1 },
                                  { rotate: `${handAngle}deg` },
                                  { translateY: -27 }
                                ],
                                borderRadius: 1,
                                zIndex: 4,
                              }}
                            />
                          );
                        })()}

                        {/* Hour/Minute selection nodes */}
                        {activeDialMode === 'hours' ? (
                          hours.map((h, idx) => {
                            const angle = (idx * 30 * Math.PI) / 180;
                            const x = 88 + Math.sin(angle) * 58 - 14;
                            const y = 88 - Math.cos(angle) * 58 - 14;
                            const isSelected = parsed.hour === h;
                            return (
                              <TouchableOpacity
                                key={h}
                                style={[
                                  styles.clockDialNode, 
                                  { left: x, top: y },
                                  isSelected && styles.clockDialNodeActive
                                ]}
                                onPress={() => {
                                  setCustomVal(selectedClockPrayer, formatTimeStr(h, parsed.minute, parsed.ampm));
                                  setActiveDialMode('minutes');
                                }}
                                activeOpacity={0.8}
                              >
                                <Text style={[styles.clockDialNodeText, isSelected && styles.clockDialNodeTextActive]}>
                                  {h}
                                </Text>
                              </TouchableOpacity>
                            );
                          })
                        ) : (
                          minutes.map((m, idx) => {
                            const angle = (idx * 30 * Math.PI) / 180;
                            const x = 88 + Math.sin(angle) * 58 - 14;
                            const y = 88 - Math.cos(angle) * 58 - 14;
                            const isSelected = Math.round(parsed.minute / 5) * 5 % 60 === m;
                            return (
                              <TouchableOpacity
                                key={m}
                                style={[
                                  styles.clockDialNode, 
                                  { left: x, top: y },
                                  isSelected && styles.clockDialNodeActive
                                ]}
                                onPress={() => {
                                  setCustomVal(selectedClockPrayer, formatTimeStr(parsed.hour, m, parsed.ampm));
                                }}
                                activeOpacity={0.8}
                              >
                                <Text style={[styles.clockDialNodeText, isSelected && styles.clockDialNodeTextActive]}>
                                  {m.toString().padStart(2, '0')}
                                </Text>
                              </TouchableOpacity>
                            );
                          })
                        )}
                      </View>

                      {/* Fine Tune Adjustments for precision time choice */}
                      <View style={styles.clockPrecisionRow}>
                        <TouchableOpacity
                          style={styles.clockPrecisionBtn}
                          onPress={() => adjustCustomMinute(selectedClockPrayer, -1)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.clockPrecisionBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.clockPrecisionText}>
                          {isUrdu ? 'منٹ ایڈجسٹ کریں' : 'Fine Tune Minute'}
                        </Text>
                        <TouchableOpacity
                          style={styles.clockPrecisionBtn}
                          onPress={() => adjustCustomMinute(selectedClockPrayer, 1)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.clockPrecisionBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Reset button to celestial timings */}
                      <TouchableOpacity
                        style={[styles.resetTextBtn, { marginTop: 12 }]}
                        onPress={() => {
                          const base = getBaseCalculatedTimes();
                          setCustomVal(selectedClockPrayer, base[selectedClockPrayer]);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.resetTextBtnText}>
                          {isUrdu ? 'فلکیاتی نماز کا وقت ری سیٹ کریں' : 'Reset to Astronomical calculated time'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()}
              </View>
            )}
            </ScrollView>

            {/* Bottom Actions */}
            <View style={{ gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={styles.mosqueSaveBtn}
                onPress={() => {
                  if (updateMosqueTimings && setMosqueTimingsActive) {
                    updateMosqueTimings({
                      mode: mosqueEditMode,
                      offset_minutes: tempOffset,
                      custom: {
                        fajr: customFajr,
                        dhuhr: customDhuhr,
                        asr: customAsr,
                        maghrib: customMaghrib,
                        isha: customIsha,
                      }
                    });
                    setMosqueTimingsActive(true);
                  }
                  setShowMosqueSheet(false);
                  showToast(isUrdu ? 'مسجد اوقات محفوظ کر لئے گئے ہیں ✓' : 'Mosque timings saved successfully ✓');
                }}
              >
                <Text style={styles.mosqueSaveBtnText}>{isUrdu ? 'مسجد کے اوقات محفوظ کریں' : 'Save Mosque Timings'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearTimingsBtn}
                onPress={() => {
                  if (updateMosqueTimings && setMosqueTimingsActive) {
                    const base = getBaseCalculatedTimes();
                    updateMosqueTimings({
                      mode: 'offset',
                      offset_minutes: 0,
                      custom: {
                        fajr: base.Fajr,
                        dhuhr: base.Dhuhr,
                        asr: base.Asr,
                        maghrib: base.Maghrib,
                        isha: base.Isha,
                      }
                    });
                    setMosqueTimingsActive(false);
                  }
                  setShowMosqueSheet(false);
                  showToast(isUrdu ? 'تمام اوقات ختم کر دئیے گئے ہیں' : 'All custom timings cleared');
                }}
              >
                <Text style={styles.clearTimingsText}>{isUrdu ? 'تمام مسجد اوقات صاف کریں' : 'Clear All Custom Timings'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
    {toastMessage && (
      <View style={styles.toastContainer}>
        <Text style={styles.toastText}>{toastMessage}</Text>
      </View>
    )}
  </View>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbf9f4', // exact ivory background
  },
  header: {
    backgroundColor: '#1b4d3e', // primary container/sage green
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerProfileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#93f7bf',
    overflow: 'hidden',
    backgroundColor: '#003629',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLetterCircle: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#93f7bf',
    fontSize: 18,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    backgroundColor: '#93f7bf',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1b4d3e',
  },
  greetingText: {
    fontSize: 9,
    color: '#93f7bf',
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  profileName: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateBadgeContainer: {
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginTop: -12,
    zIndex: 10,
  },
  dateBadge: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 3,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dateBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#003629',
  },
  mainContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  ayahCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    elevation: 2,
    shadowColor: 'rgba(27, 77, 62, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  ayahCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  ayahHeaderLine: {
    width: 4,
    height: 16,
    backgroundColor: '#c8a74b',
    borderRadius: 2,
  },
  ayahHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#404945',
    letterSpacing: 1,
  },
  ayahArabic: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'serif',
    fontSize: 22,
    lineHeight: 40,
    color: '#003629',
    textAlign: 'right',
    marginVertical: 8,
  },
  ayahUrdu: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
    fontSize: 16,
    lineHeight: 28,
    color: '#404945',
    textAlign: 'right',
    marginVertical: 4,
  },
  ayahEnglish: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    color: '#404945',
    opacity: 0.8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 54, 41, 0.05)',
    paddingTop: 8,
  },
  ayahCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  ayahSurah: {
    fontSize: 10,
    color: '#404945',
    opacity: 0.6,
    fontWeight: '700',
  },
  ayahNav: {
    flexDirection: 'row',
    gap: 12,
  },
  ayahNavBtn: {
    fontSize: 12,
    color: '#003629',
    paddingHorizontal: 4,
  },
  countdownCard: {
    backgroundColor: 'rgba(147, 247, 191, 0.15)', // secondary-container dim
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 108, 68, 0.08)',
    alignItems: 'center',
    gap: 12,
  },
  countdownPill: {
    backgroundColor: '#006c44',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    elevation: 4,
    shadowColor: '#006c44',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  countdownText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  countdownTimes: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  timeBound: {
    alignItems: 'center',
  },
  boundLabel: {
    fontSize: 8,
    color: '#404945',
    opacity: 0.6,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  boundValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003629',
    marginTop: 2,
  },
  boundDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#c0c9c3',
  },
  stripSection: {
    marginTop: 8,
  },
  stripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stripTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#003629',
  },
  stripStatus: {
    fontSize: 11,
    fontWeight: '800',
    color: '#006c44',
  },
  stripScroll: {
    flexDirection: 'row',
    overflow: 'visible',
    paddingVertical: 12,
  },
  prayerStripCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    alignItems: 'center',
    minWidth: 110,
    marginRight: 10,
    gap: 4,
  },
  activePrayerCard: {
    borderWidth: 2,
    borderColor: '#006c44',
    backgroundColor: 'rgba(0, 108, 68, 0.02)',
    elevation: 5,
    shadowColor: '#006c44',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  completedPrayerCard: {
    borderColor: 'rgba(0, 108, 68, 0.3)',
    backgroundColor: 'rgba(0, 108, 68, 0.03)',
  },
  missedPrayerCard: {
    borderColor: 'rgba(186, 26, 26, 0.3)',
    backgroundColor: 'rgba(186, 26, 26, 0.03)',
  },
  latePrayerCard: {
    borderColor: 'rgba(200, 167, 75, 0.3)',
    backgroundColor: 'rgba(200, 167, 75, 0.03)',
  },
  activePill: {
    backgroundColor: '#006c44',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
  },
  activePillText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  stripCardName: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#003629',
  },
  stripCardTranslation: {
    fontSize: 10,
    fontWeight: '700',
    color: '#707974',
    marginTop: -2,
    opacity: 0.85,
  },
  stripCardTime: {
    fontSize: 13,
    fontWeight: '800',
    color: '#003629',
  },
  activeCardText: {
    color: '#003629',
  },
  stripCardStatus: {
    marginTop: 4,
  },
  streaksSection: {
    marginTop: 8,
    gap: 10,
  },
  streaksTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#003629',
  },
  streaksScroll: {
    flexDirection: 'row',
  },
  streakIndicatorCell: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    minWidth: 72,
    marginRight: 8,
    gap: 2,
  },
  streakEmoji: {
    fontSize: 18,
  },
  streakCellLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#404945',
    opacity: 0.7,
  },
  streakCellVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#006c44',
  },
  motivationBanner: {
    borderRadius: 20,
    padding: 16,
    marginTop: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  motivationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  motivationEmoji: {
    fontSize: 20,
  },
  motivationTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#93f7bf',
  },
  motivationDesc: {
    fontSize: 11,
    color: '#ffffff',
    opacity: 0.9,
    marginTop: 2,
  },
  motivationProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  motivationProgressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  motivationProgressBarFill: {
    height: '100%',
    backgroundColor: '#93f7bf',
    borderRadius: 4,
  },
  motivationProgressLabel: {
    fontSize: 9,
    color: '#93f7bf',
    fontWeight: '800',
  },
  dhikrWidgetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: 'rgba(27, 77, 62, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  dhikrWidgetLeft: {
    flex: 1,
  },
  dhikrWidgetTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#006c44',
    letterSpacing: 0.5,
  },
  dhikrWidgetArabic: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'serif',
    fontSize: 20,
    color: '#003629',
    marginTop: 4,
  },
  dhikrWidgetEnglish: {
    fontSize: 14,
    fontWeight: '800',
    color: '#003629',
  },
  dhikrWidgetCounts: {
    fontSize: 10,
    color: '#404945',
    opacity: 0.6,
    fontWeight: '600',
    marginTop: 2,
  },
  dhikrCircleWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dhikrCircleTextOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dhikrCirclePlus: {
    fontSize: 14,
    fontWeight: '900',
    color: '#006c44',
  },
  dhikrCirclePct: {
    fontSize: 8,
    fontWeight: '800',
    color: '#003629',
  },
  qazaSnapshotCard: {
    backgroundColor: '#f5f3ee', // container low/soft gray-ivory
    borderRadius: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#c8a74b',
    padding: 16,
    elevation: 2,
    shadowColor: 'rgba(27, 77, 62, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  qazaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 54, 41, 0.06)',
    paddingBottom: 10,
  },
  qazaSnapshotTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#003629',
  },
  qazaSnapshotUrdu: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
    fontSize: 14,
    color: '#404945',
    marginTop: 2,
  },
  qazaSnapshotList: {
    marginTop: 8,
  },
  qazaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 54, 41, 0.04)',
  },
  qazaRowTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#003629',
  },
  qazaRowSub: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
    marginTop: 1,
  },
  qazaOfferBtn: {
    backgroundColor: '#c8a74b',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  qazaOfferBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  qazaFooterRow: {
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 4,
  },
  qazaTotalText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#003629',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 54, 41, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fbf9f4',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  modalHeaderBar: {
    width: 40,
    height: 4,
    backgroundColor: '#c0c9c3',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#003629',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#404945',
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOptionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  modalOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
  },
  optionOffered: {
    borderColor: 'rgba(0, 108, 68, 0.1)',
  },
  optionLate: {
    borderColor: 'rgba(200, 167, 75, 0.1)',
  },
  optionMissed: {
    borderColor: 'rgba(186, 26, 26, 0.1)',
  },
  optionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionTextCol: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  optionSub: {
    fontSize: 10,
    color: '#404945',
    opacity: 0.6,
  },
  modalCancelBtn: {
    backgroundColor: 'rgba(0, 54, 41, 0.05)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#003629',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    backgroundColor: '#003629',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    zIndex: 9999,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  lockedPrayerCard: {
    borderColor: 'rgba(112, 121, 116, 0.15)',
    backgroundColor: 'rgba(112, 121, 116, 0.03)',
    opacity: 0.6,
  },
  mosqueTimingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    elevation: 2,
    shadowColor: 'rgba(0, 54, 41, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#003629',
  },
  cardSubText: {
    fontSize: 10,
    color: '#404945',
    opacity: 0.6,
    marginTop: 2,
    lineHeight: 14,
  },
  pencilBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 108, 68, 0.05)',
  },
  mosqueTimingsRows: {
    gap: 8,
    marginVertical: 10,
  },
  mosqueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 54, 41, 0.03)',
  },
  mosquePrayerName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#003629',
    width: 60,
  },
  mosqueCalcTime: {
    fontSize: 10,
    color: '#404945',
    opacity: 0.6,
    flex: 1,
  },
  mosqueTimeVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#006c44',
  },
  plusBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 108, 68, 0.08)',
  },
  plusBtnText: {
    fontSize: 12,
    color: '#006c44',
    fontWeight: '900',
  },
  mosqueToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 54, 41, 0.06)',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#006c44',
  },
  mosqueStatusLabel: {
    fontSize: 10,
    color: '#404945',
    fontWeight: '700',
  },
  toggleBtn: {
    width: 38,
    height: 20,
    borderRadius: 10,
    padding: 2,
  },
  toggleBtnActive: {
    backgroundColor: '#006c44',
  },
  toggleBtnInactive: {
    backgroundColor: '#c0c9c3',
  },
  toggleCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  toggleCircleInactive: {
    alignSelf: 'flex-start',
  },
  mosqueSheetTabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 54, 41, 0.04)',
    borderRadius: 16,
    padding: 4,
    marginVertical: 12,
  },
  mosqueSheetTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  mosqueSheetTabActive: {
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: 'rgba(0, 54, 41, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  mosqueSheetTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#404945',
  },
  mosqueSheetTabTextActive: {
    color: '#006c44',
    fontWeight: '800',
  },
  sheetBody: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#003629',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 108, 68, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#006c44',
  },
  stepperValText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#003629',
  },
  previewTable: {
    gap: 6,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 54, 41, 0.02)',
  },
  previewPrayerName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#003629',
    width: 60,
  },
  previewOldTime: {
    fontSize: 10,
    color: '#404945',
    opacity: 0.6,
  },
  previewNewTime: {
    fontSize: 11,
    fontWeight: '800',
    color: '#006c44',
  },
  customPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: 6,
  },
  stepperContainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbf9f4',
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 4,
    height: 36,
  },
  miniBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 108, 68, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#006c44',
  },
  miniValText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003629',
    paddingHorizontal: 6,
  },
  ampmToggleBtn: {
    backgroundColor: '#006c44',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ampmToggleBtnText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#ffffff',
  },
  customRowLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003629',
    width: 60,
  },
  customRowInput: {
    flex: 1,
    backgroundColor: 'rgba(0, 54, 41, 0.03)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#003629',
    fontWeight: '700',
    textAlign: 'center',
  },
  resetTextBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resetTextBtnText: {
    fontSize: 10,
    color: '#c8a74b',
    fontWeight: '700',
  },
  mosqueSaveBtn: {
    backgroundColor: '#006c44',
    borderRadius: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mosqueSaveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  clearTimingsBtn: {
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearTimingsText: {
    color: '#ba1a1a',
    fontSize: 11,
    fontWeight: '800',
  },
  clockOuterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  clockPrayerSegments: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 54, 41, 0.04)',
    borderRadius: 14,
    padding: 3,
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  clockPrayerBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  clockPrayerBtnActive: {
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: 'rgba(0, 54, 41, 0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  clockPrayerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#707974',
  },
  clockPrayerTextActive: {
    color: '#006c44',
  },
  clockDigitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  clockDigitalBox: {
    backgroundColor: 'rgba(0, 108, 68, 0.06)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 108, 68, 0.12)',
  },
  clockDigitalText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#006c44',
    letterSpacing: 1,
  },
  clockAmPmToggleBtn: {
    backgroundColor: '#006c44',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clockAmPmToggleBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  clockDialModeRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 54, 41, 0.04)',
    borderRadius: 10,
    padding: 2,
    gap: 4,
    marginBottom: 16,
  },
  clockDialModeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
  },
  clockDialModeBtnActive: {
    backgroundColor: '#006c44',
  },
  clockDialModeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#707974',
  },
  clockDialModeTextActive: {
    color: '#ffffff',
  },
  clockFaceCircle: {
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: 'rgba(0, 54, 41, 0.08)',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 54, 41, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  clockCenterPivot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#006c44',
    zIndex: 10,
  },
  clockDialNode: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  clockDialNodeActive: {
    backgroundColor: '#006c44',
    elevation: 3,
    shadowColor: '#006c44',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  clockDialNodeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#003629',
  },
  clockDialNodeTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },
  clockPrecisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  clockPrecisionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 108, 68, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockPrecisionBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#006c44',
  },
  clockPrecisionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#707974',
  },
  streaksCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
    elevation: 3,
    shadowColor: 'rgba(0, 54, 41, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  streaksCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  streaksCardTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  streaksCardSubtitle: {
    fontSize: 10.5,
    color: '#707974',
    marginBottom: 16,
  },
  streaksGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakGridCol: {
    alignItems: 'center',
    flex: 1,
  },
  streakFlameOuterCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 6,
  },
  streakBadgeCounterCircle: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  streakBadgeCounterText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
  },
  streakGridLabel: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  glowingFlameEffect: {
    shadowColor: '#ea4335',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
});

export default HomeScreen;
