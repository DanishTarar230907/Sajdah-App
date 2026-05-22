// src/screens/ProfileScreen.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, Dimensions, TextInput, Alert, Modal, Share, Platform } from 'react-native';
import { Camera, ChevronRight, Settings, Award, Users, BookOpen, AlertCircle, RefreshCw, BarChart, Compass, Info, LogOut, Check, CheckCircle2, FileText, Edit2 } from 'lucide-react-native';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle as SvgCircle, G } from 'react-native-svg';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { useQazaStore } from '../store/useQazaStore';
import { useSalahStore } from '../store/useSalahStore';
import { themes } from '../theme/colors';
import { Madhhab, CalculationMethod } from '../services/prayerEngine';

const { width } = Dimensions.get('window');

const DAILY_INSPIRATIONS = [
  {
    text: "Establish prayer at the decline of the sun [from its meridian] until the darkness of the night and [also] the Qur'an of dawn. Indeed, the recitation of dawn is ever witnessed.",
    source: "Surah Al-Isra 17:78"
  },
  {
    text: "Recite what has been revealed to you of the Book and establish prayer. Indeed, prayer prohibits immorality and wrongdoing, and the remembrance of Allah is greater.",
    source: "Surah Al-Ankabut 29:45"
  }
];

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, language, setTheme, setLanguage } = useUIStore();
  const { profile, updateProfile, updateAvatar, resetProfile, setOnboardingCompleted } = useAuthStore();
  const { qazaHistory, totalMissedInitially, completedQaza, clearQazaHistory } = useQazaStore();
  const { getRecord } = useSalahStore();
  const activeTheme = themes[theme];
  const isUrdu = language === 'UR';

  const [name, setName] = useState(profile?.name || 'Ahmed Khan');
  const [inspirationIdx, setInspirationIdx] = useState(0);

  // States for PRD enhancements
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editNameText, setEditNameText] = useState(profile?.name || 'Ahmed Khan');
  const [selectedTooltipDay, setSelectedTooltipDay] = useState<{ day: string; dateStr: string; records: Record<string, any> } | null>(null);

  // Dynamic Madhab translate helper
  const getMadhabLabel = (m: Madhhab) => {
    switch (m) {
      case 'Hanafi': return isUrdu ? 'حنفی (پاکستان/بھارت)' : 'Hanafi (South Asia)';
      case 'Jafari': return isUrdu ? 'جعفری (شیعہ)' : 'Jafari (Shia)';
      case 'Shafi\'i': return 'Shafi\'i';
      case 'Maliki': return 'Maliki';
      case 'Hanbali': return 'Hanbali';
    }
  };

  // Profile image camera/gallery picker
  const handlePickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        alert(isUrdu ? 'کیمرہ/گیلری کی اجازت درکار ہے!' : 'Camera/Gallery permissions are required!');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      if (!result.canceled && result.assets && result.assets[0].uri) {
        updateAvatar(result.assets[0].uri);
      }
    } catch (e) {
      console.log('Avatar pick error:', e);
    }
  };

  // Weekly attendance calculations
  const getWeeklyAttendance = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = [];
    const dateObj = new Date();
    
    // Find monday of this week
    const currentDay = dateObj.getDay(); // 0 is Sunday
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const mondayDate = new Date();
    mondayDate.setDate(dateObj.getDate() + distanceToMonday);

    let totalThisWeek = 0;
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(mondayDate);
      checkDate.setDate(mondayDate.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];
      const rec = getRecord(dateStr);
      
      let count = 0;
      if (rec) {
        const isCompleted = (status?: string) => 
          status === 'prayed_on_time' || 
          status === 'prayed_late' || 
          status === 'prayed_in_mosque' || 
          status === 'prayed_with_jamaah';

        if (isCompleted(rec.Fajr)) count++;
        if (isCompleted(rec.Dhuhr)) count++;
        if (isCompleted(rec.Asr)) count++;
        if (isCompleted(rec.Maghrib)) count++;
        if (isCompleted(rec.Isha)) count++;
      }
      totalThisWeek += count;
      data.push({ 
        day: days[i], 
        count,
        dateStr,
        records: {
          Fajr: rec?.Fajr || 'not_yet',
          Dhuhr: rec?.Dhuhr || 'not_yet',
          Asr: rec?.Asr || 'not_yet',
          Maghrib: rec?.Maghrib || 'not_yet',
          Isha: rec?.Isha || 'not_yet',
        }
      });
    }
    return { data, totalThisWeek };
  };

  const handleExportReport = async () => {
    try {
      let csvContent = "Date,Fajr,Dhuhr,Asr,Maghrib,Isha\n";
      const dateObj = new Date();
      // Generate past 30 days of attendance
      for (let i = 29; i >= 0; i--) {
        const checkDate = new Date();
        checkDate.setDate(dateObj.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        const rec = getRecord(dateStr);
        const f = rec?.Fajr || 'not_logged';
        const d = rec?.Dhuhr || 'not_logged';
        const a = rec?.Asr || 'not_logged';
        const m = rec?.Maghrib || 'not_logged';
        const isha = rec?.Isha || 'not_logged';
        csvContent += `${dateStr},${f},${d},${a},${m},${isha}\n`;
      }
      
      await Share.share({
        message: csvContent,
        title: 'Sajdah Salah Attendance Report',
      });
    } catch (err: any) {
      Alert.alert("Export Error", err.message || "Failed to share attendance report.");
    }
  };

  const { data: weeklyAttendanceData, totalThisWeek: weeklyTotal } = getWeeklyAttendance();

  // Qaza breakdown math
  const totalMissedCount = Object.keys(totalMissedInitially).reduce(
    (acc, key) => acc + (totalMissedInitially[key as keyof typeof totalMissedInitially] || 0),
    0
  );
  const totalCompletedCount = Object.keys(completedQaza).reduce(
    (acc, key) => acc + (completedQaza[key as keyof typeof completedQaza] || 0),
    0
  );
  const totalRemainingCount = Math.max(0, totalMissedCount - totalCompletedCount);

  // SVG Donut Chart Math
  const donutSize = 100;
  const donutRadius = 38;
  const donutCircumference = 2 * Math.PI * donutRadius;
  
  const compPct = totalMissedCount > 0 ? (totalCompletedCount / totalMissedCount) : 0;
  const remPct = totalMissedCount > 0 ? (totalRemainingCount / totalMissedCount) : 1;

  const compStroke = compPct * donutCircumference;
  const remStroke = remPct * donutCircumference;

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* 1. Profile Hero Section */}
      <View style={styles.heroSection}>
        <LinearGradient 
          colors={['#003629', '#006c44']} 
          style={styles.heroBanner}
        />
        
        <View style={styles.profileMetaContainer}>
          <TouchableOpacity 
            style={styles.avatarWrapper} 
            activeOpacity={0.85}
            onPress={handlePickAvatar}
          >
            <View style={styles.avatarCircle}>
              {profile?.avatarUri ? (
                <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarLetter}>
                    {profile?.name ? profile.name.charAt(0).toUpperCase() : 'A'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.cameraIconCircle}>
              <Camera size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.nameBox} 
            activeOpacity={0.8}
            onPress={() => {
              setEditNameText(profile?.name || 'Ahmed Khan');
              setShowEditNameModal(true);
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.profileDisplayName}>{profile?.name || 'Ahmed Khan'}</Text>
              <Edit2 size={12} color="#93f7bf" />
            </View>
            <Text style={styles.heroSubText}>
              {profile?.madhhab || 'Hanafi'} Madhhab • {isUrdu ? 'رکن سجدہ' : 'Sajdah Companion'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* 2. Madhab Jurisprudence Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>{isUrdu ? 'فقہی مسلک اور مکتبہ فکر' : 'Jurisprudence (Madhhab)'}</Text>
          <Text style={styles.cardSubText}>
            {isUrdu ? 'اپنے مسلک کا انتخاب کریں۔ یہ عصر کی نماز کے وقت کے حساب کو متاثر کرتا ہے۔' : 'Select your Madhhab. This alters the solar mathematical boundary calculations of Asr prayer.'}
          </Text>

          <View style={styles.madhabPillRow}>
            {(['Hanafi', 'Shafi\'i', 'Maliki', 'Hanbali', 'Jafari'] as Madhhab[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.madhabPill,
                  profile?.madhhab === m && styles.madhabPillActive
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  Alert.alert(
                    isUrdu ? "فقہی مسلک تبدیل کریں؟" : "Change Madhhab?",
                    isUrdu
                      ? `کیا آپ واقعی اپنا مسلک ${m} پر تبدیل کرنا چاہتے ہیں؟ اس سے عصر کی نماز کا وقت تبدیل ہو جائے گا۔`
                      : `Are you sure you want to change your Madhhab to ${m}? This will adjust Asr prayer calculation times dynamically.`,
                    [
                      { text: isUrdu ? "منسوخ" : "Cancel", style: "cancel" },
                      { 
                        text: isUrdu ? "ہاں، تبدیل کریں" : "Yes, Confirm", 
                        onPress: () => {
                          let calcMethod: CalculationMethod = 'MWL';
                          if (m === 'Hanafi') calcMethod = 'KARACHI';
                          else if (m === 'Jafari') calcMethod = 'TEHRAN';
                          updateProfile({ madhhab: m, calculationMethod: calcMethod });
                          Alert.alert(
                            isUrdu ? "تبدیلی کامیاب" : "Madhhab Updated",
                            isUrdu
                              ? "آپ کے فقہی مسلک کے مطابق نماز کے اوقات اپ ڈیٹ کر دیے گئے ہیں۔"
                              : "Prayer calculation settings have successfully been recomputed."
                          );
                        } 
                      }
                    ]
                  );
                }}
              >
                <Text style={[styles.madhabPillText, profile?.madhhab === m && styles.madhabPillTextActive]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 3. Prayer Attendance 7-Day Chart */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>{isUrdu ? 'نماز حاضری کی رپورٹ' : 'Prayer Attendance'}</Text>
          
          <View style={styles.chartStatsRow}>
            <View style={styles.chartStatBox}>
              <Text style={styles.chartStatVal}>{weeklyTotal}/35</Text>
              <Text style={styles.chartStatLabel}>{isUrdu ? 'اس ہفتے' : 'This Week'}</Text>
            </View>
            <View style={styles.chartStatDivider} />
            <View style={styles.chartStatBox}>
              <Text style={styles.chartStatVal}>12d</Text>
              <Text style={styles.chartStatLabel}>{isUrdu ? 'مسلسل سلسلہ' : 'Active Streak'}</Text>
            </View>
            <View style={styles.chartStatDivider} />
            <View style={styles.chartStatBox}>
              <Text style={styles.chartStatVal}>87%</Text>
              <Text style={styles.chartStatLabel}>{isUrdu ? 'ماہانہ شرح' : 'Monthly Rate'}</Text>
            </View>
          </View>

          {/* Floating interactive tooltip */}
          {selectedTooltipDay && (
            <View style={styles.chartTooltipBox}>
              <View style={styles.chartTooltipHeader}>
                <Text style={styles.chartTooltipTitle}>
                  {isUrdu ? `${selectedTooltipDay.day} کی نمازوں کا احوال` : `${selectedTooltipDay.day} Salah History`}
                </Text>
                <TouchableOpacity onPress={() => setSelectedTooltipDay(null)}>
                  <Text style={styles.chartTooltipCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.chartTooltipSub}>{selectedTooltipDay.dateStr}</Text>
              
              <View style={styles.chartTooltipGrid}>
                {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(pr => {
                  const status = selectedTooltipDay.records[pr];
                  const completed = status === 'prayed_on_time' || status === 'prayed_late' || status === 'prayed_in_mosque' || status === 'prayed_with_jamaah' || status === 'qaza_completed';
                  const missed = status === 'missed';
                  const late = status === 'prayed_late';
                  
                  let statusSymbol = '⚪';
                  let statusLabel = isUrdu ? 'درج نہیں' : 'Not Logged';
                  
                  if (completed) {
                    statusSymbol = '✅';
                    statusLabel = isUrdu ? 'ادا کی' : 'Offered';
                  } else if (missed) {
                    statusSymbol = '❌';
                    statusLabel = isUrdu ? 'چھوٹ گئی' : 'Missed';
                  } else if (late) {
                    statusSymbol = '🔄';
                    statusLabel = isUrdu ? 'دیر سے ادا کی' : 'Late';
                  }

                  return (
                    <View key={pr} style={styles.chartTooltipRow}>
                      <Text style={styles.chartTooltipPrayerName}>{pr}</Text>
                      <Text style={styles.chartTooltipPrayerVal}>
                        {statusSymbol} {statusLabel}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Attendance Vertical Bars */}
          <View style={styles.attendanceBarContainer}>
            {weeklyAttendanceData.map(item => {
              const barHeight = (item.count / 5) * 80 || 6;
              
              // Color based on completion
              let barColor = '#ef4444'; // Red
              if (item.count === 5) barColor = '#006c44'; // Green
              else if (item.count >= 3) barColor = '#c8a74b'; // Yellow

              return (
                <TouchableOpacity 
                  key={item.day} 
                  style={styles.attendanceBarCol}
                  activeOpacity={0.7}
                  onPress={() => setSelectedTooltipDay(item)}
                >
                  <View style={styles.attendanceBarTrack}>
                    <View style={[styles.attendanceBarFill, { height: barHeight, backgroundColor: barColor }]} />
                  </View>
                  <Text style={styles.attendanceDayLabel}>{item.day}</Text>
                  <Text style={styles.attendanceCountLabel}>{item.count}/5</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 4. Qaza Overview Donut Widget */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>{isUrdu ? 'قضاء نمازوں کا خاکہ' : 'Qaza Overview'}</Text>
          
          <View style={styles.donutContainer}>
            <View style={styles.svgWrapper}>
              <Svg width={donutSize} height={donutSize}>
                <G rotation="-90" origin={`${donutSize/2}, ${donutSize/2}`}>
                  {/* Completed slice */}
                  <SvgCircle
                    cx={donutSize / 2}
                    cy={donutSize / 2}
                    r={donutRadius}
                    stroke="#006c44" // Emerald Completed
                    strokeWidth={8}
                    strokeDasharray={donutCircumference}
                    strokeDashoffset={0}
                    fill="transparent"
                  />
                  {/* Remaining slice overlay */}
                  <SvgCircle
                    cx={donutSize / 2}
                    cy={donutSize / 2}
                    r={donutRadius}
                    stroke="#c8a74b" // Gold Remaining
                    strokeWidth={8}
                    strokeDasharray={donutCircumference}
                    strokeDashoffset={compStroke}
                    fill="transparent"
                  />
                </G>
              </Svg>
              <View style={styles.donutCenterOverlay}>
                <Text style={styles.donutCenterVal}>{totalRemainingCount}</Text>
                <Text style={styles.donutCenterSub}>{isUrdu ? 'باقی' : 'Pending'}</Text>
              </View>
            </View>

            {/* Breakdown details */}
            <View style={styles.donutTable}>
              <View style={styles.donutTableRow}>
                <View style={styles.rowDotLabel}>
                  <View style={[styles.legendDot, { backgroundColor: '#003629' }]} />
                  <Text style={styles.donutTableTitle}>{isUrdu ? 'کل قضاء واجب' : 'Total Required'}</Text>
                </View>
                <Text style={styles.donutTableVal}>{totalMissedCount}</Text>
              </View>
              <View style={styles.donutTableRow}>
                <View style={styles.rowDotLabel}>
                  <View style={[styles.legendDot, { backgroundColor: '#006c44' }]} />
                  <Text style={styles.donutTableTitle}>{isUrdu ? 'ادا کی گئی' : 'Offered Qaza'}</Text>
                </View>
                <Text style={styles.donutTableVal}>{totalCompletedCount}</Text>
              </View>
              <View style={styles.donutTableRow}>
                <View style={styles.rowDotLabel}>
                  <View style={[styles.legendDot, { backgroundColor: '#c8a74b' }]} />
                  <Text style={styles.donutTableTitle}>{isUrdu ? 'باقی واجب الادا' : 'Remaining'}</Text>
                </View>
                <Text style={styles.donutTableVal}>{totalRemainingCount}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 5. Daily Inspirations Slider */}
        <View style={styles.inspirationCard}>
          <Text style={styles.inspirationHeading}>{isUrdu ? 'قرآنی یاد دہانی' : 'SCRIPTURE REFLECTION'}</Text>
          <Text style={styles.inspirationText}>"{DAILY_INSPIRATIONS[inspirationIdx].text}"</Text>
          
          <View style={styles.inspirationFooter}>
            <Text style={styles.inspirationSource}>{DAILY_INSPIRATIONS[inspirationIdx].source}</Text>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setInspirationIdx(prev => (prev + 1) % DAILY_INSPIRATIONS.length)}
            >
              <Text style={styles.refreshIcon}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 6. Settings link lists */}
        <View style={styles.settingsGroup}>
          <Text style={styles.settingsGroupHeader}>{isUrdu ? 'ترجیحات اور سیٹنگز' : 'APP PREFERENCES'}</Text>
          
          {/* Language toggle row */}
          <View style={styles.settingsRow}>
            <View style={styles.settingsRowLeft}>
              <Text style={styles.settingsRowTitle}>{isUrdu ? 'اردو زبان استعمال کریں' : 'Enable Urdu Language'}</Text>
            </View>
            <Switch
              value={isUrdu}
              onValueChange={(val) => setLanguage(val ? 'UR' : 'EN')}
              trackColor={{ false: '#c0c9c3', true: '#006c44' }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Mode toggle row */}
          <View style={styles.settingsRow}>
            <View style={styles.settingsRowLeft}>
              <Text style={styles.settingsRowTitle}>{isUrdu ? 'ڈارک موڈ تھیم' : 'Dark Theme Mode'}</Text>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={(val) => setTheme(val ? 'dark' : 'emerald')}
              trackColor={{ false: '#c0c9c3', true: '#006c44' }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Links navigation list */}
          <TouchableOpacity style={styles.settingsRowLink}>
            <View style={styles.rowLinkLeft}>
              <Info size={16} color="#003629" style={{ marginRight: 10 }} />
              <Text style={styles.linkText}>{isUrdu ? 'مسجد وقت کا سنکرونائزیشن' : 'Mosque Offset Settings'}</Text>
            </View>
            <ChevronRight size={16} color="#003629" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsRowLink}>
            <View style={styles.rowLinkLeft}>
              <Compass size={16} color="#003629" style={{ marginRight: 10 }} />
              <Text style={styles.linkText}>{isUrdu ? 'مقام اور حساب کے طریقے' : 'Location Calculation Settings'}</Text>
            </View>
            <ChevronRight size={16} color="#003629" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingsRowLink}
            onPress={() => {
              Alert.alert(
                isUrdu ? "تاریخ ری سیٹ کریں؟" : "Confirm Reset?",
                isUrdu
                  ? "کیا آپ واقعی اپنا قضاء کا سارا ریکارڈ حذف کرنا چاہتے ہیں؟ یہ عمل واپس نہیں لیا جا سکتا۔"
                  : "Are you sure you want to clear your historical Qaza logs? This action is permanent.",
                [
                  { text: isUrdu ? "منسوخ" : "Cancel", style: "cancel" },
                  { text: isUrdu ? "ہاں، حذف کریں" : "Yes, Reset", style: "destructive", onPress: clearQazaHistory }
                ]
              );
            }}
          >
            <View style={styles.rowLinkLeft}>
              <RefreshCw size={16} color="#ef4444" style={{ marginRight: 10 }} />
              <Text style={[styles.linkText, { color: '#ef4444' }]}>{isUrdu ? 'قضاء تاریخ ری سیٹ کریں' : 'Reset Qaza Deficit Logs'}</Text>
            </View>
            <ChevronRight size={16} color="#ef4444" />
          </TouchableOpacity>

          {/* Export Report Link Row */}
          <TouchableOpacity 
            style={styles.settingsRowLink}
            onPress={handleExportReport}
          >
            <View style={styles.rowLinkLeft}>
              <FileText size={16} color="#006c44" style={{ marginRight: 10 }} />
              <Text style={[styles.linkText, { color: '#006c44' }]}>{isUrdu ? 'حاضری رپورٹ حاصل کریں' : 'Export Attendance Report (CSV)'}</Text>
            </View>
            <ChevronRight size={16} color="#006c44" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutBtn}
          onPress={() => {
            Alert.alert(
              isUrdu ? "لاگ آؤٹ کی تصدیق" : "Logout Confirmation",
              isUrdu 
                ? "کیا آپ واقعی لاگ آؤٹ کرنا چاہتے ہیں؟ آپ کا سارا مقامی ریکارڈ ری سیٹ ہو جائے گا۔"
                : "Are you sure you want to logout? All local preferences and onboarding status will be reset.",
              [
                { text: isUrdu ? "منسوخ" : "Cancel", style: "cancel" },
                { 
                  text: isUrdu ? "ہاں، لاگ آؤٹ" : "Logout", 
                  style: "destructive",
                  onPress: async () => {
                    try {
                      // Perform Firebase auth sign out
                      await signOut(auth);
                      resetProfile();
                      setOnboardingCompleted(false);
                      Alert.alert(
                        isUrdu ? "لاگ آؤٹ ہو گیا" : "Logged Out",
                        isUrdu ? "آپ کو کامیابی سے لاگ آؤٹ کر دیا گیا ہے۔" : "Successfully logged out of your account."
                      );
                      // Reset navigation back to Auth stack so user cannot stay in app
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Auth' }],
                      });
                    } catch (e: any) {
                      console.log("Firebase Logout Error:", e);
                      Alert.alert("Logout Error", e.message || "Could not log out of Firebase session.");
                    }
                  }
                }
              ]
            );
          }}
        >
          <LogOut size={16} color="#ef4444" style={{ marginRight: 6 }} />
          <Text style={styles.logoutText}>{isUrdu ? 'لاگ آؤٹ' : 'Logout'}</Text>
        </TouchableOpacity>
      </View>

      {/* 📝 Name Editing Modal */}
      <Modal
        visible={showEditNameModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowEditNameModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderBar} />
            <Text style={styles.modalTitle}>
              {isUrdu ? 'نام تبدیل کریں' : 'Edit Display Name'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {isUrdu ? 'اپنا نام درج کریں جو ہوم اسکرین پر ظاہر ہوگا:' : 'Choose a name to customize your Sajdah companion experience:'}
            </Text>

            <TextInput
              style={styles.modalTextInput}
              value={editNameText}
              onChangeText={setEditNameText}
              placeholder="E.g. Ahmed Khan"
              maxLength={24}
            />

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              activeOpacity={0.8}
              onPress={() => {
                const trimmed = editNameText.trim();
                if (!trimmed) {
                  Alert.alert(isUrdu ? "خالی نام" : "Empty Name", isUrdu ? "براہ کرم کوئی نام درج کریں۔" : "Display name cannot be left empty.");
                  return;
                }
                setName(trimmed);
                updateProfile({ name: trimmed });
                setShowEditNameModal(false);
                Alert.alert(isUrdu ? "نام تبدیل ہو گیا" : "Profile Updated", isUrdu ? "آپ کا نام کامیابی سے تبدیل ہو گیا ہے۔" : "Your display name has been successfully saved!");
              }}
            >
              <Text style={styles.modalSubmitBtnText}>{isUrdu ? 'محفوظ کریں' : 'Save Name'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCancelBtn}
              onPress={() => setShowEditNameModal(false)}
            >
              <Text style={styles.modalCancelBtnText}>{isUrdu ? 'بند کریں' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbf9f4', // ivory background
  },
  heroSection: {
    position: 'relative',
    height: 180,
    backgroundColor: '#ffffff',
  },
  heroBanner: {
    height: 110,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  profileMetaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: '#1b4d3e',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 32,
    color: '#93f7bf',
    fontWeight: '800',
  },
  cameraIconCircle: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#006c44',
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameBox: {
    paddingBottom: 8,
    flex: 1,
  },
  nameTextInput: {
    fontSize: 18,
    fontWeight: '800',
    color: '#003629',
    padding: 0,
    margin: 0,
  },
  heroSubText: {
    fontSize: 10,
    color: '#404945',
    opacity: 0.6,
    fontWeight: '700',
    marginTop: 2,
  },
  mainContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    elevation: 1,
    shadowColor: 'rgba(27, 77, 62, 0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    position: 'relative',
  },
  cardHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#003629',
    marginBottom: 4,
  },
  cardSubText: {
    fontSize: 10,
    color: '#404945',
    opacity: 0.7,
    lineHeight: 14,
    marginBottom: 12,
  },
  madhabPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  madhabPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 54, 41, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
  },
  madhabPillActive: {
    backgroundColor: '#006c44',
    borderColor: '#006c44',
  },
  madhabPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#003629',
  },
  madhabPillTextActive: {
    color: '#FFFFFF',
  },
  chartStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 10,
    backgroundColor: 'rgba(0, 54, 41, 0.02)',
    paddingVertical: 10,
    borderRadius: 16,
  },
  chartStatBox: {
    alignItems: 'center',
  },
  chartStatVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#006c44',
  },
  chartStatLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#404945',
    opacity: 0.6,
    marginTop: 2,
  },
  chartStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(0, 54, 41, 0.06)',
  },
  attendanceBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  attendanceBarCol: {
    alignItems: 'center',
    gap: 4,
  },
  attendanceBarTrack: {
    width: 16,
    height: 80,
    backgroundColor: 'rgba(0, 54, 41, 0.02)',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  attendanceBarFill: {
    width: 16,
    borderRadius: 8,
  },
  attendanceDayLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#404945',
    opacity: 0.7,
  },
  attendanceCountLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#003629',
  },
  donutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 10,
  },
  svgWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCenterOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCenterVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#003629',
  },
  donutCenterSub: {
    fontSize: 8,
    fontWeight: '800',
    color: '#c8a74b',
    textTransform: 'uppercase',
  },
  donutTable: {
    flex: 1,
    marginLeft: 16,
    gap: 8,
  },
  donutTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  rowDotLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  donutTableTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#404945',
    flexShrink: 1,
  },
  donutTableVal: {
    fontSize: 10,
    fontWeight: '800',
    color: '#003629',
    textAlign: 'right',
  },
  inspirationCard: {
    backgroundColor: '#003629',
    borderRadius: 24,
    padding: 16,
  },
  inspirationHeading: {
    fontSize: 8,
    fontWeight: '800',
    color: '#93f7bf',
    letterSpacing: 1.5,
  },
  inspirationText: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    color: '#ffffff',
    marginTop: 8,
    opacity: 0.9,
  },
  inspirationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 8,
  },
  inspirationSource: {
    fontSize: 9,
    color: '#93f7bf',
    fontWeight: '700',
  },
  refreshIcon: {
    fontSize: 12,
  },
  settingsGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
  },
  settingsGroupHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: '#006c44',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 54, 41, 0.03)',
  },
  settingsRowLeft: {
    flex: 1,
  },
  settingsRowTitle: {
    fontSize: 12,
    color: '#003629',
    fontWeight: '700',
  },
  settingsRowLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 54, 41, 0.03)',
  },
  rowLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    fontSize: 12,
    color: '#003629',
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    marginTop: 10,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '800',
  },
  profileDisplayName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  chartTooltipBox: {
    position: 'absolute',
    top: 42,
    left: 18,
    right: 18,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.08)',
    elevation: 8,
    shadowColor: '#003629',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    zIndex: 100,
  },
  chartTooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTooltipTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003629',
  },
  chartTooltipCloseText: {
    fontSize: 12,
    color: '#404945',
    opacity: 0.6,
    paddingHorizontal: 8,
  },
  chartTooltipSub: {
    fontSize: 8,
    color: '#404945',
    opacity: 0.5,
    marginTop: 1,
    marginBottom: 8,
  },
  chartTooltipGrid: {
    gap: 6,
  },
  chartTooltipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTooltipPrayerName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#404945',
  },
  chartTooltipPrayerVal: {
    fontSize: 10,
    fontWeight: '800',
    color: '#006c44',
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
    fontSize: 11,
    color: '#404945',
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalTextInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    borderRadius: 14,
    padding: 12,
    fontSize: 12,
    color: '#003629',
    fontWeight: '700',
    marginBottom: 16,
  },
  modalSubmitBtn: {
    backgroundColor: '#006c44',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
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
});

export default ProfileScreen;
