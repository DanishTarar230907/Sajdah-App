// src/screens/QazaCalculatorScreen.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Dimensions, Alert, Modal } from 'react-native';
import { BarChart, Check, Plus, AlertCircle, ChevronDown, ChevronUp, Award, Award as BadgeIcon, Info, Trash2, CheckCircle2, History } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { useQazaStore } from '../store/useQazaStore';
import { themes } from '../theme/colors';

const { width } = Dimensions.get('window');

const PRAYER_NAME_TRANSLATIONS: Record<string, Record<string, string>> = {
  Fajr: { EN: "Fajr", UR: "فجر" },
  Dhuhr: { EN: "Dhuhr", UR: "ظہر" },
  Asr: { EN: "Asr", UR: "عصر" },
  Maghrib: { EN: "Maghrib", UR: "مغرب" },
  Isha: { EN: "Isha", UR: "عشاء" },
  Witr: { EN: "Witr", UR: "وتر" },
};

export const QazaCalculatorScreen: React.FC = () => {
  const { theme, language } = useUIStore();
  const { profile, updateProfile } = useAuthStore();
  const { 
    totalMissedInitially, 
    completedQaza, 
    calculateMissedPrayers, 
    logCompletedQaza, 
    incrementMissedQaza, 
    qazaHistory, 
    clearQazaHistory,
    qazaPlan,
    createOrUpdatePlan
  } = useQazaStore();
  const activeTheme = themes[theme];
  const isUrdu = language === 'UR';

  // Calculator Form states
  const [currentAge, setCurrentAge] = useState(
    (new Date().getFullYear() - (profile?.birthYear || 1998)).toString()
  );
  const [obligatoryAge, setObligatoryAge] = useState((profile?.obligatoryAge || 15).toString());
  const [yearsMissed, setYearsMissed] = useState('3');
  const [menstruationDays, setMenstruationDays] = useState(
    (profile?.menstruationExclusionsDaysPerMonth || 0).toString()
  );
  const [includeWitr, setIncludeWitr] = useState(true);

  // Active view tabs
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'my_plan'>('pending');
  const [expandedPrayer, setExpandedPrayer] = useState<string | null>(null);

  // FAB Modal Manual Entry states
  const [showFabModal, setShowFabModal] = useState(false);
  const [fabSelectedPrayer, setFabSelectedPrayer] = useState<'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha' | 'Witr'>('Fajr');
  const [fabCompletedCount, setFabCompletedCount] = useState('1');
  const [fabDate, setFabDate] = useState(new Date().toISOString().split('T')[0]);

  // Computed Qaza summaries
  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Witr'] as const;

  const totalMissedCount = Object.keys(totalMissedInitially).reduce(
    (acc, key) => acc + (totalMissedInitially[key as keyof typeof totalMissedInitially] || 0),
    0
  );
  const totalCompletedCount = Object.keys(completedQaza).reduce(
    (acc, key) => acc + (completedQaza[key as keyof typeof completedQaza] || 0),
    0
  );
  const totalPendingCount = Math.max(0, totalMissedCount - totalCompletedCount);

  const [showResults, setShowResults] = useState(totalMissedCount > 0);

  // Date-based plan state pulled up to top-level to prevent conditional React Hook rule violations
  const [planStart, setPlanStart] = useState(qazaPlan?.startDate || new Date().toISOString().split('T')[0]);
  const [planTarget, setPlanTarget] = useState(qazaPlan?.targetDate || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]);
  const [planFajr, setPlanFajr] = useState(qazaPlan?.dailyCommitment?.Fajr || 1);
  const [planDhuhr, setPlanDhuhr] = useState(qazaPlan?.dailyCommitment?.Dhuhr || 1);
  const [planAsr, setPlanAsr] = useState(qazaPlan?.dailyCommitment?.Asr || 1);
  const [planMaghrib, setPlanMaghrib] = useState(qazaPlan?.dailyCommitment?.Maghrib || 1);
  const [planIsha, setPlanIsha] = useState(qazaPlan?.dailyCommitment?.Isha || 1);

  const handleCalculate = () => {
    const age = parseInt(currentAge) || 25;
    const birthYearCalculated = new Date().getFullYear() - age;
    
    updateProfile({
      birthYear: birthYearCalculated,
      obligatoryAge: parseInt(obligatoryAge) || 15,
      menstruationExclusionsDaysPerMonth: profile?.gender === 'Female' ? parseInt(menstruationDays) : 0,
    });

    calculateMissedPrayers({
      currentAge: age,
      obligatoryAge: parseInt(obligatoryAge) || 15,
      yearsMissed: parseFloat(yearsMissed) || 0,
      partialYearsConsistent: 0,
      menstruationExclusionDaysPerMonth: profile?.gender === 'Female' ? parseInt(menstruationDays) : 0,
      gender: profile?.gender || 'Prefer not to say',
      includeWitr,
    });

    setShowResults(true);
  };

  const translatePrayerName = (name: string) => {
    return PRAYER_NAME_TRANSLATIONS[name]?.[language === 'UR' ? 'UR' : 'EN'] || name;
  };

  const getPercentage = (count: number, target: number) => {
    return Math.min(100, Math.floor((count / target) * 100)) || 0;
  };

  // Generate mock specific missed dates for each prayer
  const generateMissedDates = (prayer: string, count: number) => {
    const dates = [];
    const dateObj = new Date();
    for (let i = 1; i <= count; i++) {
      dateObj.setDate(dateObj.getDate() - 1);
      dates.push({
        id: `${prayer}_date_${i}`,
        dateStr: dateObj.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' }),
      });
    }
    return dates;
  };

  // Badges milestones
  const badges = [
    { id: 'first', title: 'First Step', desc: 'Logged 1st Qaza', unlocked: totalCompletedCount > 0 },
    { id: '10down', title: '10 Down', desc: 'Completed 10 prayers', unlocked: totalCompletedCount >= 10 },
    { id: 'streak', title: '7-Day Streak', desc: 'Maintained qaza logging', unlocked: totalCompletedCount >= 35 },
    { id: 'clean', title: 'Clean Slate', desc: 'All Qaza cleared', unlocked: totalPendingCount === 0 && totalMissedCount > 0 },
  ];

  const renderMyPlanTab = () => {
    // Parent level states are used here (hooks are moved to top-level to prevent crash)

    // Compute metrics
    const pKeys = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
    const commitments = { Fajr: planFajr, Dhuhr: planDhuhr, Asr: planAsr, Maghrib: planMaghrib, Isha: planIsha };

    // Compute max days required across all 5 prayers
    let maxDaysRequired = 0;
    const details = pKeys.map(k => {
      const missed = totalMissedInitially[k] || 0;
      const comp = completedQaza[k] || 0;
      const pending = Math.max(0, missed - comp);
      const commitment = commitments[k] || 1;
      const days = commitment > 0 ? Math.ceil(pending / commitment) : 0;
      if (days > maxDaysRequired) {
        maxDaysRequired = days;
      }
      return { prayer: k, pending, commitment, days };
    });

    // Forecast completion date
    const forecastDate = new Date(planStart);
    forecastDate.setDate(forecastDate.getDate() + maxDaysRequired);
    const forecastStr = forecastDate.toISOString().split('T')[0];

    // Status Badge check: Achievable if forecastDate <= planTarget
    const targetDateObj = new Date(planTarget);
    const isAchievable = forecastDate.getTime() <= targetDateObj.getTime() || maxDaysRequired === 0;

    return (
      <View style={styles.planContainer}>
        {/* Date selections row */}
        <View style={styles.planDatesRow}>
          <View style={styles.planDateCol}>
            <Text style={styles.planDateLabel}>{isUrdu ? 'شروع کرنے کی تاریخ' : 'START DATE'}</Text>
            <TextInput
              style={styles.planDateInput}
              value={planStart}
              onChangeText={setPlanStart}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#888"
            />
          </View>
          <View style={styles.planDateCol}>
            <Text style={styles.planDateLabel}>{isUrdu ? 'ہدف کی تاریخ' : 'TARGET DATE'}</Text>
            <TextInput
              style={styles.planDateInput}
              value={planTarget}
              onChangeText={setPlanTarget}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#888"
            />
          </View>
        </View>

        {/* Steppers widget list */}
        <View style={styles.steppersCard}>
          <Text style={styles.planSectionTitle}>
            {isUrdu ? 'روزانہ نمازوں کا عزم' : 'Daily Commitments'}
          </Text>
          <Text style={styles.planSectionDesc}>
            {isUrdu ? 'ہر نماز کے لیے روزانہ قضاء کی تعداد منتخب کریں:' : 'Set how many qaza prayers to make up daily:'}
          </Text>

          {[
            { label: 'Fajr', val: planFajr, setVal: setPlanFajr },
            { label: 'Dhuhr', val: planDhuhr, setVal: setPlanDhuhr },
            { label: 'Asr', val: planAsr, setVal: setPlanAsr },
            { label: 'Maghrib', val: planMaghrib, setVal: setPlanMaghrib },
            { label: 'Isha', val: planIsha, setVal: setPlanIsha },
          ].map(row => (
            <View key={row.label} style={styles.planStepperRow}>
              <Text style={styles.planStepperName}>{translatePrayerName(row.label)} • {row.label}</Text>
              <View style={styles.stepperControl}>
                <TouchableOpacity 
                  style={styles.planStepperBtn}
                  onPress={() => row.setVal(prev => Math.max(0, prev - 1))}
                >
                  <Text style={styles.planStepperBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.planStepperVal}>{row.val}</Text>
                <TouchableOpacity 
                  style={styles.planStepperBtn}
                  onPress={() => row.setVal(prev => Math.min(5, prev + 1))}
                >
                  <Text style={styles.planStepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Recalculator display panel */}
        <View style={styles.recalculatorCard}>
          <Text style={styles.planSectionTitle}>
            {isUrdu ? 'لائیو پیش گوئی' : 'Commitment Forecast'}
          </Text>

          {maxDaysRequired > 0 ? (
            <View style={{ gap: 8, marginVertical: 8 }}>
              {details.map(d => (
                <Text key={d.prayer} style={styles.forecastLine}>
                  • {translatePrayerName(d.prayer)}: {d.pending} {isUrdu ? 'باقی' : 'pending'} @ {d.commitment}/day → <Text style={{fontWeight: '800'}}>{d.days} {isUrdu ? 'دن' : 'days'}</Text>
                </Text>
              ))}
              
              <View style={styles.planDivider} />

              <Text style={styles.forecastSummaryText}>
                {isUrdu 
                  ? `مکمل سفر میں کل ${maxDaysRequired} دن لگیں گے۔`
                  : `Your full recovery path will take ${maxDaysRequired} days.`}
              </Text>
              <Text style={styles.forecastCompletionText}>
                {isUrdu 
                  ? `تخمینی تکمیل کی تاریخ: ${forecastStr}`
                  : `Estimated Completion Date: ${forecastStr}`}
              </Text>
            </View>
          ) : (
            <Text style={styles.allClearedPlanText}>
              {isUrdu ? 'کوئی قضاء نماز باقی نہیں ہے!' : 'No pending prayers remaining to deviser a plan for!'}
            </Text>
          )}

          {/* Achievability Badge */}
          {maxDaysRequired > 0 && (
            <View style={[styles.statusBadge, isAchievable ? styles.badgeGreen : styles.badgeRed]}>
              <Text style={[styles.statusBadgeText, isAchievable ? { color: '#006c44' } : { color: '#ba1a1a' }]}>
                {isAchievable 
                  ? (isUrdu ? '✓ قابل حصول نظام (ہدف سے پہلے مکمل)' : '✓ Achievable Schedule (Before Target Date)')
                  : (isUrdu ? '⚠ ہدف کی تاریخ سے آگے! عزم یا ہدف تبدیل کریں' : '⚠ Delay Warning! Commitment falls past target date')}
              </Text>
            </View>
          )}
        </View>

        {/* Apply/Sync button */}
        <TouchableOpacity
          style={styles.applyPlanBtn}
          activeOpacity={0.85}
          onPress={() => {
            if (createOrUpdatePlan) {
              createOrUpdatePlan({
                startDate: planStart,
                targetDate: planTarget,
                dailyCommitment: commitments,
                active: true,
              });
              // Sync to active customSchedule in useQazaStore
              useQazaStore.getState().updateCustomSchedule({
                Fajr: planFajr,
                Dhuhr: planDhuhr,
                Asr: planAsr,
                Maghrib: planMaghrib,
                Isha: planIsha,
                Witr: includeWitr ? Math.max(1, Math.min(planFajr, planIsha)) : 0,
              });
              Alert.alert(
                isUrdu ? "منصوبہ لاگو ہو گیا" : "Plan Applied!",
                isUrdu 
                  ? "آپ کا قضاء عزم شیڈول اور اہداف کامیابی سے محفوظ کر دئے گئے ہیں۔"
                  : "Your date-based commitment plans have been updated and synced globally!"
              );
            }
          }}
        >
          <Text style={styles.applyPlanBtnText}>
            {isUrdu ? 'منصوبہ لاگو کریں اور ہم آہنگ کریں' : 'Apply & Sync My Plan'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Premium Gradient Summary Header */}
      <LinearGradient 
        colors={['#003629', '#006c44']} 
        style={styles.headerBanner}
      >
        <View style={styles.headerRow}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryTitle}>{isUrdu ? 'باقی قضاء نمازیں' : 'Total Missed Remaining'}</Text>
            <Text style={styles.summaryValue}>{totalPendingCount}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryTitle}>{isUrdu ? 'ادا شدہ نمازیں' : 'Completed Qaza'}</Text>
            <Text style={styles.summaryValue}>{totalCompletedCount}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Auto-Sync status bar */}
      <View style={styles.syncAlert}>
        <AlertCircle size={16} color="#006c44" />
        <Text style={styles.syncAlertText}>
          {isUrdu ? 'حاضری چیک لسٹ کے ساتھ خودکار سنک فعال ہے ✓' : 'Auto-syncing with your attendance checklist ✓'}
        </Text>
      </View>

      {/* Calculator input card */}
      <View style={styles.calculatorCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.cardHeaderTitle}>{isUrdu ? 'قضاء کیلکولیٹر' : 'Qaza Calculator'}</Text>
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                isUrdu ? "قضاء اور حاضری کا خودکار سنک" : "Auto-Sync Info",
                isUrdu
                  ? "جب آپ نماز کے صفحے پر کسی نماز کو 'چھوٹ گئی / قضاء' کے طور پر نشان زد کریں گے، تو یہاں خود بخود اس نماز کے کھاتے میں ۱ اضافہ ہو جائے گا۔ جب آپ یہاں 'ادا کریں' پر کلک کریں گے، تو وہ نماز آپ کے نامہ اعمال میں بحال کر دی جائے گی!"
                  : "Checking a daily prayer as 'Missed' in the Namaz tab automatically increases its Qaza deficit count by 1 here. When you click 'Offer Now' here, it marks that prayer as spiritually recovered!"
              );
            }}
            activeOpacity={0.7}
            style={{ padding: 4 }}
          >
            <Info size={18} color="#006c44" />
          </TouchableOpacity>
        </View>
        <Text style={styles.cardHeaderDesc}>
          {isUrdu ? 'اپنے چھوٹ جانے والے سالوں کے مطابق قضاء کا صحیح حساب کتاب لگائیں۔' : 'Estimate your historical missed prayers to establish your recovery schedule.'}
        </Text>

        <View style={styles.formRow}>
          <View style={[styles.inputBox, { flex: 1 }]}>
            <Text style={styles.inputLabel}>{isUrdu ? 'موجودہ عمر' : 'CURRENT AGE'}</Text>
            <TextInput
              keyboardType="numeric"
              style={styles.textInput}
              value={currentAge}
              onChangeText={setCurrentAge}
            />
          </View>
          <View style={[styles.inputBox, { flex: 1 }]}>
            <Text style={styles.inputLabel}>{isUrdu ? 'بلوغت کی عمر' : 'OBLIGATORY AGE'}</Text>
            <TextInput
              keyboardType="numeric"
              style={styles.textInput}
              value={obligatoryAge}
              onChangeText={setObligatoryAge}
            />
          </View>
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>{isUrdu ? 'چھوٹے ہوئے سالوں کی تعداد' : 'YEARS MISSED'}</Text>
          <TextInput
            keyboardType="numeric"
            style={styles.textInput}
            value={yearsMissed}
            onChangeText={setYearsMissed}
          />
        </View>

        {profile?.gender === 'Female' && (
          <View style={styles.inputBox}>
            <Text style={styles.inputLabel}>{isUrdu ? 'حیض کے مخصوص ایام' : 'MONTHLY EXCLUSION DAYS'}</Text>
            <TextInput
              keyboardType="numeric"
              style={styles.textInput}
              value={menstruationDays}
              onChangeText={setMenstruationDays}
            />
          </View>
        )}

        <TouchableOpacity 
          style={styles.witrToggleRow} 
          activeOpacity={0.8}
          onPress={() => setIncludeWitr(!includeWitr)}
        >
          <View style={[styles.checkbox, includeWitr && styles.checkboxActive]}>
            {includeWitr && <Check size={10} color="#FFFFFF" />}
          </View>
          <Text style={styles.witrLabel}>{isUrdu ? 'وتر نماز شامل کریں (حنفی مسلک)' : 'Include Witr prayers in deficit calculation'}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.calcBtn}
          activeOpacity={0.85}
          onPress={handleCalculate}
        >
          <Text style={styles.calcBtnText}>{isUrdu ? 'حساب لگائیں' : 'Calculate Deficit'}</Text>
        </TouchableOpacity>
      </View>

      {/* Recitation dashboard cards */}
      {showResults && (
        <View style={styles.recoverySection}>
          <Text style={styles.sectionTitle}>{isUrdu ? 'تفصیلی قضاء ریکارڈ' : 'Your Recovery Plan'}</Text>
          
          <View style={styles.tabRow}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
              onPress={() => setActiveTab('pending')}
            >
              <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
                {isUrdu ? 'باقی نمازیں' : 'Pending'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
              onPress={() => setActiveTab('completed')}
            >
              <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
                {isUrdu ? 'مکمل شدہ' : 'Completed'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tab, activeTab === 'my_plan' && styles.activeTab]}
              onPress={() => setActiveTab('my_plan')}
            >
              <Text style={[styles.tabText, activeTab === 'my_plan' && styles.activeTabText]}>
                {isUrdu ? 'میرا منصوبہ' : 'My Plan'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Prayer cards */}
          {activeTab === 'pending' ? (
            <View style={styles.prayerList}>
              {prayers.map((p) => {
                if (p === 'Witr' && !includeWitr) return null;
                
                const missed = totalMissedInitially[p] || 0;
                const completed = completedQaza[p] || 0;
                const pending = Math.max(0, missed - completed);
                const pct = getPercentage(completed, missed);
                
                const isExpanded = expandedPrayer === p;
                const generatedDates = generateMissedDates(p, Math.min(5, pending));

                return (
                  <View key={p} style={styles.prayerDeficitCard}>
                    <TouchableOpacity 
                      style={styles.prayerCardHeader}
                      activeOpacity={0.8}
                      onPress={() => setExpandedPrayer(isExpanded ? null : p)}
                    >
                      <View style={styles.prayerHeaderLeft}>
                        <Text style={styles.prayerCardTitle}>{translatePrayerName(p)} • {p}</Text>
                        <Text style={styles.prayerCountsText}>
                          {completed} / <Text style={{ color: '#003629', fontWeight: '800' }}>{missed}</Text> {isUrdu ? 'ادا شدہ' : 'offered'}
                        </Text>
                      </View>

                      <View style={styles.prayerHeaderRight}>
                        <Text style={styles.pctBadgeText}>{pct}%</Text>
                        {isExpanded ? <ChevronUp size={16} color="#006c44" /> : <ChevronDown size={16} color="#006c44" />}
                      </View>
                    </TouchableOpacity>

                    {/* Percentage Progress Bar */}
                    <View style={styles.progressLineBg}>
                      <View style={[styles.progressLineFill, { width: `${pct}%` }]} />
                    </View>

                    {/* Expandable detailed log checklist */}
                    {isExpanded && (
                      <View style={styles.expansionPanel}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text style={styles.expansionTitle}>
                            {isUrdu ? 'قضاء لاگ: نمازیں منتخب کر کے ادا کریں' : 'Calendar Logs: Select dates to clear'}
                          </Text>
                          {pending > 0 && (
                            <TouchableOpacity
                              style={styles.offerAllBtn}
                              activeOpacity={0.85}
                              onPress={() => {
                                Alert.alert(
                                  isUrdu ? "تمام ادا کریں؟" : "Offer All?",
                                  isUrdu 
                                    ? `کیا آپ واقعی تمام ${pending} قضاء ${translatePrayerName(p)} کو ادا شدہ کے طور پر نشان زد کرنا چاہتے ہیں؟`
                                    : `Are you sure you want to mark all remaining ${pending} pending ${p} Qaza prayers as offered?`,
                                  [
                                    { text: isUrdu ? "منسوخ" : "Cancel", style: "cancel" },
                                    { text: isUrdu ? "ہاں، تمام" : "Yes, All", onPress: () => logCompletedQaza(p, pending) }
                                  ]
                                );
                              }}
                            >
                              <Text style={styles.offerAllBtnText}>{isUrdu ? 'تمام ادا کریں' : 'Offer All'}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        
                        {pending > 0 ? (
                          generatedDates.map(item => (
                            <View key={item.id} style={styles.dateCheckRow}>
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={styles.dateLabelText}>{item.dateStr}</Text>
                                <Text style={styles.dateStatusText}>{isUrdu ? 'چھوٹ گئی' : 'Missed'}</Text>
                              </View>
                              <TouchableOpacity 
                                style={styles.markOfferedBtn}
                                activeOpacity={0.8}
                                onPress={() => logCompletedQaza(p, 1)}
                              >
                                <Check size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                                <Text style={styles.markOfferedText}>{isUrdu ? 'ادا کی' : 'Mark Offered'}</Text>
                              </TouchableOpacity>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.allClearedText}>
                            🎉 {isUrdu ? 'تمام قضاء نمازیں ادا ہو چکی ہیں!' : 'All Qaza cleared!'}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : activeTab === 'completed' ? (
            <View style={styles.prayerList}>
              {qazaHistory.filter(item => item.action === 'completed').length > 0 ? (
                qazaHistory.filter(item => item.action === 'completed').map(item => (
                  <View key={item.id} style={styles.historyCard}>
                    <View style={styles.historyLeft}>
                      <History size={16} color="#006c44" style={{ marginRight: 8 }} />
                      <View>
                        <Text style={styles.historyTitle}>
                          {translatePrayerName(item.prayer)} • {item.count} {isUrdu ? 'نماز قضاء ادا کی' : 'Offered Qaza'}
                        </Text>
                        <Text style={styles.historyDate}>
                          {new Date(item.date).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={styles.xpLabel}>+{item.count * 10} XP</Text>
                      <View style={styles.compBadge}>
                        <Check size={10} color="#FFFFFF" />
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyHistory}>
                  <Text style={styles.emptyHistoryText}>
                    {isUrdu ? 'ابھی تک کوئی قضاء نماز ادا نہیں کی گئی!' : 'No Qaza prayers offered yet! Complete a prayer to start.'}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            renderMyPlanTab()
          )}

          {/* Milestone Achievements Badges */}
          <View style={styles.milestoneSection}>
            <Text style={styles.sectionSubTitle}>{isUrdu ? 'حاصل کردہ کامیابیوں کے تمغے' : 'Recovery Badges'}</Text>
            
            <View style={styles.badgesGrid}>
              {badges.map(badge => (
                <View key={badge.id} style={[styles.badgeCell, !badge.unlocked && styles.badgeCellLocked]}>
                  <View style={[styles.badgeIconBg, badge.unlocked ? styles.badgeIconUnlocked : styles.badgeIconLocked]}>
                    <Award size={20} color={badge.unlocked ? '#006c44' : '#888'} />
                  </View>
                  <Text style={[styles.badgeCellTitle, !badge.unlocked && { color: '#888' }]}>{badge.title}</Text>
                  <Text style={styles.badgeCellDesc}>{badge.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* ➕ Manual FAB Manual Entry Modal */}
      <Modal
        visible={showFabModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFabModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowFabModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderBar} />
            <Text style={styles.modalTitle}>
              {isUrdu ? 'قضاء نماز درج کریں' : 'Log Missed Qaza'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {isUrdu ? 'دستی طور پر اپنی قضاء نمازیں درج کریں:' : 'Manually record your offered or historical missed Qaza details:'}
            </Text>

            {/* Select Prayer Chips */}
            <Text style={styles.inputLabelField}>{isUrdu ? 'نماز منتخب کریں' : 'SELECT PRAYER'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.prayerChipsRow}>
              {(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Witr'] as const).map(p => {
                if (p === 'Witr' && !includeWitr) return null;
                const isSelected = fabSelectedPrayer === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.prayerChip, isSelected && styles.prayerChipActive]}
                    onPress={() => setFabSelectedPrayer(p)}
                  >
                    <Text style={[styles.prayerChipText, isSelected && styles.prayerChipTextActive]}>
                      {translatePrayerName(p)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Completed Count Input */}
            <View style={styles.modalFormInputRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.inputLabelField}>{isUrdu ? 'تعداد (کتنی نمازیں ادا کیں)' : 'QUANTITY (COUNT)'}</Text>
                <TextInput
                  keyboardType="numeric"
                  style={styles.modalTextInput}
                  value={fabCompletedCount}
                  onChangeText={setFabCompletedCount}
                  placeholder="1"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabelField}>{isUrdu ? 'تاریخ' : 'DATE'}</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={fabDate}
                  onChangeText={setFabDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            {/* Submit & Cancel Actions */}
            <TouchableOpacity
              style={styles.modalSubmitBtn}
              activeOpacity={0.8}
              onPress={() => {
                const count = parseInt(fabCompletedCount, 10);
                if (isNaN(count) || count <= 0) {
                  Alert.alert(isUrdu ? "غلط تعداد" : "Invalid Quantity", isUrdu ? "براہ کرم درست تعداد درج کریں۔" : "Please input a positive numeric count.");
                  return;
                }
                logCompletedQaza(fabSelectedPrayer, count);
                setShowFabModal(false);
                Alert.alert(
                  isUrdu ? "ریکارڈ محفوظ ہو گیا" : "Qaza Recorded",
                  isUrdu
                    ? `${translatePrayerName(fabSelectedPrayer)} کی ${count} قضاء نمازیں ادا شدہ کے طور پر لاگ کر دی گئی ہیں۔`
                    : `Successfully marked ${count} ${fabSelectedPrayer} Qaza prayers as offered!`
                );
              }}
            >
              <Text style={styles.modalSubmitBtnText}>{isUrdu ? 'محفوظ کریں' : 'Confirm & Log'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCancelBtn}
              onPress={() => setShowFabModal(false)}
            >
              <Text style={styles.modalCancelBtnText}>{isUrdu ? 'بند کریں' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Floating Action Quick Log manual trigger */}
      <TouchableOpacity 
        style={styles.fab}
        activeOpacity={0.9}
        onPress={() => setShowFabModal(true)}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbf9f4', // ivory background
  },
  headerBanner: {
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryCol: {
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 10,
    color: '#93f7bf',
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '900',
    marginTop: 6,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  syncAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: 'rgba(0, 108, 68, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  syncAlertText: {
    fontSize: 10,
    color: '#006c44',
    fontWeight: '700',
    flex: 1,
  },
  calculatorCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    elevation: 2,
    shadowColor: 'rgba(27, 77, 62, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#003629',
  },
  cardHeaderDesc: {
    fontSize: 11,
    color: '#404945',
    opacity: 0.7,
    marginTop: 4,
    lineHeight: 16,
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputBox: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#404945',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#fbf9f4',
    color: '#003629',
  },
  witrToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 10,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#006c44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#006c44',
  },
  witrLabel: {
    fontSize: 11,
    color: '#404945',
    fontWeight: '600',
  },
  calcBtn: {
    backgroundColor: '#003629',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  calcBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  recoverySection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#003629',
    marginBottom: 12,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 54, 41, 0.04)',
    borderRadius: 20,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 16,
  },
  activeTab: {
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#003629',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 12,
    color: '#404945',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#006c44',
    fontWeight: '800',
  },
  prayerList: {
    gap: 12,
  },
  prayerDeficitCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
  },
  prayerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prayerHeaderLeft: {
    flex: 1,
  },
  prayerCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#003629',
  },
  prayerCountsText: {
    fontSize: 11,
    color: '#404945',
    opacity: 0.7,
    marginTop: 2,
  },
  prayerHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pctBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#006c44',
  },
  progressLineBg: {
    height: 6,
    backgroundColor: 'rgba(0, 108, 68, 0.05)',
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressLineFill: {
    height: '100%',
    backgroundColor: '#006c44',
    borderRadius: 3,
  },
  expansionPanel: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 54, 41, 0.06)',
    marginTop: 12,
    paddingTop: 12,
    gap: 8,
  },
  expansionTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#404945',
    opacity: 0.7,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dateCheckRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 54, 41, 0.03)',
  },
  dateLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#003629',
  },
  dateStatusText: {
    fontSize: 9,
    color: '#ef4444',
    fontWeight: '600',
    marginTop: 1,
  },
  markOfferedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#006c44',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  markOfferedText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  allClearedText: {
    fontSize: 11,
    color: '#006c44',
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 6,
  },
  milestoneSection: {
    marginTop: 24,
  },
  sectionSubTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#003629',
    marginBottom: 12,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  badgeCell: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
  },
  badgeCellLocked: {
    opacity: 0.5,
  },
  badgeIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeIconUnlocked: {
    backgroundColor: 'rgba(0, 108, 68, 0.08)',
  },
  badgeIconLocked: {
    backgroundColor: 'rgba(0, 54, 41, 0.04)',
  },
  badgeCellTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003629',
  },
  badgeCellDesc: {
    fontSize: 8,
    color: '#404945',
    opacity: 0.6,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#006c44',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#006c44',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  offerAllBtn: {
    backgroundColor: 'rgba(0, 108, 68, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  offerAllBtnText: {
    color: '#006c44',
    fontSize: 9,
    fontWeight: '800',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.04)',
    marginBottom: 8,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#003629',
  },
  historyDate: {
    fontSize: 9,
    color: '#404945',
    opacity: 0.5,
    marginTop: 2,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  xpLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#006c44',
  },
  compBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#006c44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyHistory: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 11,
    color: '#404945',
    opacity: 0.6,
    textAlign: 'center',
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
  inputLabelField: {
    fontSize: 9,
    fontWeight: '800',
    color: '#404945',
    opacity: 0.7,
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 10,
  },
  prayerChipsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  prayerChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  prayerChipActive: {
    backgroundColor: '#006c44',
    borderColor: '#006c44',
  },
  prayerChipText: {
    fontSize: 11,
    color: '#404945',
    fontWeight: '700',
  },
  prayerChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  modalFormInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  planContainer: {
    paddingHorizontal: 4,
    gap: 16,
  },
  planDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  planDateCol: {
    flex: 1,
    gap: 4,
  },
  planDateLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#404945',
    opacity: 0.7,
    letterSpacing: 0.5,
  },
  planDateInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 11,
    color: '#003629',
    fontWeight: '800',
    textAlign: 'center',
  },
  steppersCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
  },
  planSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#003629',
    marginBottom: 4,
  },
  planSectionDesc: {
    fontSize: 10,
    color: '#404945',
    opacity: 0.6,
    marginBottom: 12,
  },
  planStepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 54, 41, 0.02)',
  },
  planStepperName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003629',
  },
  stepperControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planStepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 108, 68, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planStepperBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#006c44',
  },
  planStepperVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#003629',
    width: 14,
    textAlign: 'center',
  },
  recalculatorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
  },
  forecastLine: {
    fontSize: 11,
    color: '#404945',
    fontWeight: '600',
  },
  planDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 54, 41, 0.06)',
    marginVertical: 8,
  },
  forecastSummaryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003629',
  },
  forecastCompletionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#006c44',
  },
  allClearedPlanText: {
    fontSize: 11,
    color: '#006c44',
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 10,
  },
  statusBadge: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  badgeGreen: {
    backgroundColor: 'rgba(0, 108, 68, 0.06)',
  },
  badgeRed: {
    backgroundColor: 'rgba(186, 26, 26, 0.06)',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  applyPlanBtn: {
    backgroundColor: '#006c44',
    borderRadius: 18,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  applyPlanBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});

export default QazaCalculatorScreen;
