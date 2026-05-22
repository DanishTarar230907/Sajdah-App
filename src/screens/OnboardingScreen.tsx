// src/screens/OnboardingScreen.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, Image } from 'react-native';
import { ChevronRight, ChevronLeft, Check, Award, Compass, BookOpen, Camera, Globe } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { useQazaStore } from '../store/useQazaStore';
import { themes } from '../theme/colors';
import { Madhhab, CalculationMethod } from '../services/prayerEngine';

interface OnboardingScreenProps {
  navigation: any;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const { theme, language, setLanguage } = useUIStore();
  const { updateProfile, profile, updateAvatar } = useAuthStore();
  const { calculateMissedPrayers } = useQazaStore();
  const activeTheme = themes[theme];

  const activeLang = language === 'UR' ? 'UR' : 'EN';

  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Local Form state
  const [name, setName] = useState(profile?.name || '');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Prefer not to say'>('Prefer not to say');
  const [birthYear, setBirthYear] = useState('1998');
  const [obligatoryAge, setObligatoryAge] = useState('15');
  const [madhhab, setMadhhab] = useState<Madhhab>('Hanafi');
  const [yearsMissed, setYearsMissed] = useState('3');
  const [menstruationDays, setMenstruationDays] = useState('7');
  const [includeWitr, setIncludeWitr] = useState(true);
  const [avatarUri, setLocalAvatarUri] = useState<string | null>(null);

  // Pick Profile Picture
  const pickImage = async (useCamera: boolean) => {
    try {
      const permissionResult = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        alert(activeLang === 'UR' ? 'کیمرہ/گیلری کی اجازت درکار ہے!' : 'Permission to access camera/gallery is required!');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
          });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        setLocalAvatarUri(result.assets[0].uri);
        updateAvatar(result.assets[0].uri);
      }
    } catch (e) {
      console.log('Error selecting image:', e);
    }
  };

  const nextStep = () => {
    if (step === 1 && !name.trim()) {
      alert(activeLang === 'UR' ? 'براہ کرم اپنا نام درج کریں!' : 'Please enter your name!');
      return;
    }
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      completeSetup();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const completeSetup = () => {
    const age = new Date().getFullYear() - parseInt(birthYear);
    
    // Automatically link Madhhab to default Calculation Method
    let calculatedMethod: CalculationMethod = 'MWL';
    if (madhhab === 'Hanafi') calculatedMethod = 'KARACHI';
    else if (madhhab === 'Jafari') calculatedMethod = 'TEHRAN';

    const updates = {
      name,
      gender,
      birthYear: parseInt(birthYear) || 1998,
      obligatoryAge: parseInt(obligatoryAge) || 15,
      madhhab,
      calculationMethod: calculatedMethod,
      menstruationExclusionsDaysPerMonth: gender === 'Female' ? parseInt(menstruationDays) : 0,
      isOnboarded: true,
    };

    updateProfile(updates);

    // Calculate initial lifetime missed prayers
    calculateMissedPrayers({
      currentAge: age,
      obligatoryAge: parseInt(obligatoryAge) || 15,
      yearsMissed: parseFloat(yearsMissed) || 0,
      partialYearsConsistent: 0,
      menstruationExclusionDaysPerMonth: gender === 'Female' ? parseInt(menstruationDays) : 0,
      gender,
      includeWitr,
    });

    navigation.replace('Main');
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Compass size={44} color={activeTheme.accent} style={styles.icon} />
            <Text style={[styles.stepTitle, { color: activeTheme.text }]}>
              {activeLang === 'UR' ? 'سجدہ ایپ میں خوش آمدید' : 'Welcome to Sajdah'}
            </Text>
            <Text style={[styles.stepSub, { color: activeTheme.textMuted }]}>
              {activeLang === 'UR' 
                ? 'اپنا نام درج کریں اور ایک خوبصورت اوتار یا اپنی پروفائل تصویر منتخب کریں۔'
                : 'Let us start by entering your name and choosing your profile avatar.'}
            </Text>

            {/* Profile Image Select */}
            <View style={styles.avatarSelectionContainer}>
              <View style={[styles.avatarCircle, { borderColor: activeTheme.accent, backgroundColor: activeTheme.primaryDark }]}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage as any} />
                ) : (
                  <Text style={[styles.avatarLetter, { color: activeTheme.accent }]}>
                    {name ? name.charAt(0).toUpperCase() : 'S'}
                  </Text>
                )}
              </View>
              <View style={styles.avatarActionRow}>
                <TouchableOpacity 
                  activeOpacity={0.8}
                  style={[styles.avatarBtn, { backgroundColor: activeTheme.primary }]}
                  onPress={() => pickImage(false)}
                >
                  <Camera size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.avatarBtnText}>{activeLang === 'UR' ? 'گیلری' : 'Gallery'}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  activeOpacity={0.8}
                  style={[styles.avatarBtn, { backgroundColor: activeTheme.primary }]}
                  onPress={() => pickImage(true)}
                >
                  <Camera size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.avatarBtnText}>{activeLang === 'UR' ? 'کیمرہ' : 'Camera'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputBox}>
              <Text style={[styles.inputLabel, { color: activeTheme.text }]}>{activeLang === 'UR' ? 'پورا نام' : 'FULL NAME'}</Text>
              <TextInput
                style={[styles.input, { borderColor: activeTheme.cardBorder, color: activeTheme.text }]}
                placeholder={activeLang === 'UR' ? 'اپنا نام لکھیں...' : 'Enter name...'}
                placeholderTextColor={activeTheme.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputBox}>
              <Text style={[styles.inputLabel, { color: activeTheme.text }]}>{activeLang === 'UR' ? 'جنس' : 'GENDER'}</Text>
              <View style={styles.rowButtons}>
                {(['Male', 'Female', 'Prefer not to say'] as const).map((g) => {
                  const label = g === 'Male' ? (activeLang === 'UR' ? 'مرد' : 'Male') : g === 'Female' ? (activeLang === 'UR' ? 'خواتین' : 'Female') : (activeLang === 'UR' ? 'پوشیدہ' : 'Secret');
                  return (
                    <TouchableOpacity
                      key={g}
                      activeOpacity={0.8}
                      style={[
                        styles.choiceBtn,
                        {
                          backgroundColor: gender === g ? activeTheme.primary : activeTheme.primaryDark,
                          borderColor: gender === g ? activeTheme.accent : activeTheme.cardBorder,
                        },
                      ]}
                      onPress={() => setGender(g)}
                    >
                      <Text style={[styles.choiceText, { color: gender === g ? '#FFFFFF' : activeTheme.textMuted }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Globe size={44} color={activeTheme.accent} style={styles.icon} />
            <Text style={[styles.stepTitle, { color: activeTheme.text }]}>
              {activeLang === 'UR' ? 'زبان کا انتخاب' : 'Language Preference'}
            </Text>
            <Text style={[styles.stepSub, { color: activeTheme.textMuted }]}>
              {activeLang === 'UR' 
                ? 'اپنے آرام کے لیے ترجیحی زبان کا انتخاب کریں۔ اسے بعد میں بھی تبدیل کیا جا سکتا ہے۔'
                : 'Select your preferred language for the application interface.'}
            </Text>

            <View style={styles.languageBox}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.languageCard,
                  {
                    backgroundColor: language === 'EN' ? activeTheme.primary : activeTheme.primaryDark,
                    borderColor: language === 'EN' ? activeTheme.accent : activeTheme.cardBorder,
                  }
                ]}
                onPress={() => setLanguage('EN')}
              >
                <Text style={[styles.langTextBig, { color: '#FFFFFF' }]}>English</Text>
                <Text style={[styles.langTextDesc, { color: activeTheme.textMuted }]}>Interface in English language</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.languageCard,
                  {
                    backgroundColor: language === 'UR' ? activeTheme.primary : activeTheme.primaryDark,
                    borderColor: language === 'UR' ? activeTheme.accent : activeTheme.cardBorder,
                    marginTop: 12,
                  }
                ]}
                onPress={() => setLanguage('UR')}
              >
                <Text style={[styles.langTextBig, { color: '#FFFFFF', fontFamily: Platform.OS === 'ios' ? 'System' : 'normal' }]}>اردو (Urdu)</Text>
                <Text style={[styles.langTextDesc, { color: activeTheme.textMuted }]}>اردو جمیل نوری نستعلیق انٹرفیس</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 3:
        const madhabOptions: { key: Madhhab; nameEN: string; nameUR: string; descEN: string; descUR: string }[] = [
          {
            key: 'Hanafi',
            nameEN: 'Hanafi',
            nameUR: 'حنفی',
            descEN: 'Most common in Pakistan, India, Bangladesh, Turkey.',
            descUR: 'پاکستان، ہندوستان، بنگلہ دیش اور ترکی میں سب سے زیادہ رائج۔'
          },
          {
            key: 'Shafi\'i',
            nameEN: 'Shafi\'i',
            nameUR: 'شافعی',
            descEN: 'Commonly followed in East Africa, Southeast Asia, Yemen, Egypt.',
            descUR: 'مشرقی افریقہ، جنوب مشرقی ایشیا، یمن اور مصر میں عام۔'
          },
          {
            key: 'Maliki',
            nameEN: 'Maliki',
            nameUR: 'مالکی',
            descEN: 'Predominant in North and West Africa.',
            descUR: 'شمالی اور مغربی افریقہ میں سب سے زیادہ رائج۔'
          },
          {
            key: 'Hanbali',
            nameEN: 'Hanbali',
            nameUR: 'حنبلی',
            descEN: 'Mainly followed in Saudi Arabia and the Gulf region.',
            descUR: 'بنیادی طور پر سعودی عرب اور خلیجی ممالک میں رائج۔'
          },
          {
            key: 'Jafari',
            nameEN: 'Jafari (Shia)',
            nameUR: 'جعفری (شیعہ)',
            descEN: 'Mainly followed in Iran, Iraq, Azerbaijan, and Lebanon.',
            descUR: 'بنیادی طور پر ایران، عراق، آذربائیجان اور لبنان میں رائج۔'
          }
        ];

        return (
          <View style={styles.stepContainer}>
            <BookOpen size={44} color={activeTheme.accent} style={styles.icon} />
            <Text style={[styles.stepTitle, { color: activeTheme.text }]}>
              {activeLang === 'UR' ? 'فقہی مسلک (Madhab)' : 'Jurisprudence (Madhab)'}
            </Text>
            <Text style={[styles.stepSub, { color: activeTheme.textMuted }]}>
              {activeLang === 'UR' 
                ? 'اپنے مسلک کا انتخاب کریں۔ یہ عصر کے اوقات اور ریاضی کے فارمولوں پر اثرانداز ہوگا۔'
                : 'Select your jurisprudence. This dynamically adjusts your Asr shadowing calculations.'}
            </Text>

            <ScrollView style={styles.madhabScroll} showsVerticalScrollIndicator={false}>
              {madhabOptions.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  activeOpacity={0.8}
                  style={[
                    styles.madhabCard,
                    {
                      backgroundColor: madhhab === m.key ? activeTheme.primary : activeTheme.primaryDark,
                      borderColor: madhhab === m.key ? activeTheme.accent : activeTheme.cardBorder,
                    }
                  ]}
                  onPress={() => setMadhhab(m.key)}
                >
                  <View style={styles.madhabHeaderRow}>
                    <Text style={[styles.madhabTitle, { color: '#FFFFFF' }]}>
                      {activeLang === 'UR' ? m.nameUR : m.nameEN}
                    </Text>
                    {madhhab === m.key && (
                      <View style={[styles.checkCircle, { backgroundColor: activeTheme.accent }]}>
                        <Check size={10} color={activeTheme.primaryDark} />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.madhabDesc, { color: activeTheme.textMuted }]}>
                    {activeLang === 'UR' ? m.descUR : m.descEN}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Award size={44} color={activeTheme.accent} style={styles.icon} />
            <Text style={[styles.stepTitle, { color: activeTheme.text }]}>
              {activeLang === 'UR' ? 'قضا نمازوں کا حساب' : 'Lifetime Qaza Estimation'}
            </Text>
            <Text style={[styles.stepSub, { color: activeTheme.textMuted }]}>
              {activeLang === 'UR' 
                ? 'تربیتی سفر شروع کرنے سے پہلے غیر مستقل مزاج سالوں کا اندازہ لگائیں۔'
                : 'Enter your historical missed details to build your outstanding qaza record.'}
            </Text>

            <View style={styles.row}>
              <View style={[styles.inputBox, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.inputLabel, { color: activeTheme.text }]}>{activeLang === 'UR' ? 'سالِ پیدائش' : 'BIRTH YEAR'}</Text>
                <TextInput
                  keyboardType="numeric"
                  style={[styles.input, { borderColor: activeTheme.cardBorder, color: activeTheme.text }]}
                  value={birthYear}
                  onChangeText={setBirthYear}
                />
              </View>
              <View style={[styles.inputBox, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.inputLabel, { color: activeTheme.text }]}>{activeLang === 'UR' ? 'سنِ بلوغت' : 'OBLIGATORY AGE'}</Text>
                <TextInput
                  keyboardType="numeric"
                  style={[styles.input, { borderColor: activeTheme.cardBorder, color: activeTheme.text }]}
                  value={obligatoryAge}
                  onChangeText={setObligatoryAge}
                />
              </View>
            </View>

            <View style={styles.inputBox}>
              <Text style={[styles.inputLabel, { color: activeTheme.text }]}>{activeLang === 'UR' ? 'غیر مستقل مزاج سال' : 'YEARS MISSED'}</Text>
              <TextInput
                keyboardType="numeric"
                style={[styles.input, { borderColor: activeTheme.cardBorder, color: activeTheme.text }]}
                value={yearsMissed}
                onChangeText={setYearsMissed}
              />
            </View>

            {gender === 'Female' && (
              <View style={styles.inputBox}>
                <Text style={[styles.inputLabel, { color: activeTheme.text }]}>
                  {activeLang === 'UR' ? 'حیض کے ایام (ماہانہ چھوٹ)' : 'MENSTRUATION EXCLUSIONS'}
                </Text>
                <TextInput
                  keyboardType="numeric"
                  style={[styles.input, { borderColor: activeTheme.cardBorder, color: activeTheme.text }]}
                  value={menstruationDays}
                  onChangeText={setMenstruationDays}
                />
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.witrRow}
              onPress={() => setIncludeWitr(!includeWitr)}
            >
              <View style={[styles.checkbox, { borderColor: activeTheme.accent, backgroundColor: includeWitr ? activeTheme.primary : 'transparent' }]}>
                {includeWitr && <Check size={12} color="#FFFFFF" />}
              </View>
              <Text style={[styles.witrLabel, { color: activeTheme.text }]}>
                {activeLang === 'UR' ? 'وتر قضا شامل کریں (حنفی میں واجب ہے)' : 'Include Witr Qaza (Wajib in Hanafi)'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <View style={styles.progressHeader}>
        <Text style={[styles.stepsText, { color: activeTheme.textMuted }]}>
          {activeLang === 'UR' ? `مرحلہ ${step} از ${totalSteps}` : `Step ${step} of ${totalSteps}`}
        </Text>
        <View style={[styles.progressBarBg, { backgroundColor: activeTheme.cardBorder }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: activeTheme.accent,
                width: `${(step / totalSteps) * 100}%`,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.cardWrapper}>
        <View style={[styles.solidCard, { backgroundColor: activeTheme.primary }]}>
          {renderStepContent()}
        </View>
      </View>

      {/* Dynamic Nav Buttons */}
      <View style={styles.navigationRow}>
        {step > 1 ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.navBtn, styles.backBtn, { borderColor: activeTheme.cardBorder }]}
            onPress={prevStep}
          >
            <ChevronLeft size={20} color={activeTheme.text} />
            <Text style={[styles.navText, { color: activeTheme.text }]}>{activeLang === 'UR' ? 'واپس' : 'Back'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.navBtn, styles.nextBtn, { backgroundColor: activeTheme.accent }]}
          onPress={nextStep}
        >
          <Text style={[styles.nextTextVal, { color: activeTheme.primaryDark }]}>
            {step === totalSteps 
              ? (activeLang === 'UR' ? 'مکمل کریں' : 'Complete') 
              : (activeLang === 'UR' ? 'جاری رکھیں' : 'Continue')}
          </Text>
          <ChevronRight size={20} color={activeTheme.primaryDark} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  progressHeader: {
    marginTop: Platform.OS === 'ios' ? 40 : 20,
    marginBottom: 10,
    width: '100%',
  },
  stepsText: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
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
  cardWrapper: {
    flex: 1,
    marginVertical: 16,
    justifyContent: 'center',
  },
  solidCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    maxHeight: '90%',
  },
  stepContainer: {
    width: '100%',
    alignItems: 'center',
  },
  icon: {
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
  },
  stepSub: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  avatarSelectionContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: '900',
  },
  avatarActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  avatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  avatarBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  inputBox: {
    width: '100%',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  row: {
    flexDirection: 'row',
  },
  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
  },
  choiceBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  choiceText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  languageBox: {
    width: '100%',
    marginTop: 10,
  },
  languageCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    alignItems: 'center',
  },
  langTextBig: {
    fontSize: 16,
    fontWeight: '900',
  },
  langTextDesc: {
    fontSize: 11,
    marginTop: 4,
  },
  madhabScroll: {
    width: '100%',
    maxHeight: 280,
  },
  madhabCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 8,
  },
  madhabHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  madhabTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  madhabDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  witrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  witrLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    flex: 1,
  },
  backBtn: {
    borderWidth: 1.5,
  },
  nextBtn: {
    flexDirection: 'row-reverse',
  },
  navText: {
    fontSize: 13.5,
    fontWeight: '800',
    marginLeft: 6,
  },
  nextTextVal: {
    fontSize: 13.5,
    fontWeight: '800',
    marginRight: 6,
  },
});

export default OnboardingScreen;
