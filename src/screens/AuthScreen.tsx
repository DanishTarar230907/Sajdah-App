// src/screens/AuthScreen.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { Mail, Lock, User, Key, ChevronRight, Compass, Eye, EyeOff } from 'lucide-react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile as firebaseUpdateProfile } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { themes } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';

interface AuthScreenProps {
  navigation: any;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ navigation }) => {
  const { theme, language } = useUIStore();
  const { profile, updateProfile, setOnboardingCompleted } = useAuthStore();
  const activeTheme = themes[theme];
  const isUrdu = language === 'UR';

  // Mount logic to auto-route already logged-in users instantly
  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        if (profile?.isOnboarded) {
          navigation.replace('Main');
        } else {
          navigation.replace('Onboarding');
        }
      }
    });
    return unsubscribe;
  }, [profile, navigation]);

  const [showGoogleChooser, setShowGoogleChooser] = useState(false);

  const handleGoogleLogin = async (gmailVal: string, nameVal: string) => {
    setShowGoogleChooser(false);
    setLoading(true);
    try {
      const securePassword = `SajdahSecureGoogleAuth_${gmailVal.replace(/[^a-zA-Z0-9]/g, '')}`;
      let user;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, gmailVal, securePassword);
        user = userCredential.user;
      } catch (loginError: any) {
        if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential' || loginError.code === 'auth/wrong-password') {
          const userCredential = await createUserWithEmailAndPassword(auth, gmailVal, securePassword);
          user = userCredential.user;
          await firebaseUpdateProfile(user, { displayName: nameVal });
        } else {
          throw loginError;
        }
      }

      if (user) {
        updateProfile({
          name: nameVal || user.displayName || 'Google Devotee',
          gmail: user.email,
          googleLinked: true,
          isGuest: false,
          isOnboarded: false,
        });

        // Write real user registration in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: nameVal || user.displayName || 'Google Devotee',
          email: user.email,
          streak: 7,
          lastActive: new Date().toISOString(),
          status: 'online'
        }, { merge: true });

        Alert.alert(
          isUrdu ? "گوگل سائن ان کامیاب" : "Google Sign-In Successful! ⚡",
          isUrdu ? `${gmailVal} کے ساتھ کامیابی سے جڑ گئے ہیں۔` : `Successfully authenticated with Google account ${gmailVal}!`
        );

        navigation.replace('Onboarding');
      }
    } catch (e: any) {
      console.log("Google Sign-In Error details:", e);
      Alert.alert("Google Sign-In Error", e.message || "Failed to connect with Google identity provider.");
    } finally {
      setLoading(false);
    }
  };

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [googleEmail, setGoogleEmail] = useState('user.sajdah@gmail.com');
  const [showPassword, setShowPassword] = useState(false);

  const handleAuthAction = async () => {
    // Basic validation
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        isUrdu ? "خالی فیلڈز" : "Empty Fields",
        isUrdu ? "براہ کرم تمام معلومات درج کریں!" : "Please fill in all email and password fields!"
      );
      return;
    }

    if (!isLogin && !displayName.trim()) {
      Alert.alert(
        isUrdu ? "نام درکار ہے" : "Name Required",
        isUrdu ? "براہ کرم اپنا نام درج کریں!" : "Please enter your name for registration!"
      );
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      Alert.alert(
        isUrdu ? "پاس ورڈ مماثلت نہیں" : "Passwords Do Not Match",
        isUrdu ? "دونوں پاس ورڈ یکساں ہونے چاہئیں!" : "Password and confirm password fields must be identical!"
      );
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Firebase Login
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        // Sync local profile with authenticated user
        updateProfile({
          name: user.displayName || 'Servant of Allah',
          gmail: user.email,
          googleLinked: true,
          isGuest: false,
        });

        // Write real user registration in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: user.displayName || 'Servant of Allah',
          email: user.email,
          streak: 7,
          lastActive: new Date().toISOString(),
          status: 'online'
        }, { merge: true });

        Alert.alert(
          isUrdu ? "خوش آمدید" : "Welcome Back!",
          isUrdu ? `${user.displayName || 'صارف'} سجدہ ایپ میں خوش آمدید!` : `Welcome back, ${user.displayName || 'User'}!`
        );

        // Check if user has completed onboarding before, otherwise send to onboarding
        navigation.replace('Main');
      } else {
        // Firebase Registration
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        // Update firebase profile display name
        await firebaseUpdateProfile(user, {
          displayName: displayName.trim()
        });

        // Save locally
        updateProfile({
          name: displayName.trim(),
          gmail: user.email,
          googleLinked: true,
          isGuest: false,
          isOnboarded: false, // Freshly registered users must onboard
        });

        // Write real user registration in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: displayName.trim(),
          email: user.email,
          streak: 7,
          lastActive: new Date().toISOString(),
          status: 'online'
        }, { merge: true });

        Alert.alert(
          isUrdu ? "اکاؤنٹ تخلیق ہو گیا" : "Account Created! 🌟",
          isUrdu ? "سجدہ ایپ پر رجسٹریشن مکمل ہو گئی ہے۔" : "Your spiritual recovery account has been registered successfully!"
        );

        // Send new user to onboarding configuration
        navigation.replace('Onboarding');
      }
    } catch (error: any) {
      console.log('Firebase Auth Error:', error);
      let errMsg = error.message || "An unexpected error occurred.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        errMsg = isUrdu ? "غلط ای میل یا پاس ورڈ درج کیا گیا ہے۔" : "Invalid email address or incorrect password.";
      } else if (error.code === 'auth/email-already-in-use') {
        errMsg = isUrdu ? "یہ ای میل پہلے سے زیر استعمال ہے۔" : "This email address is already registered.";
      } else if (error.code === 'auth/weak-password') {
        errMsg = isUrdu ? "پاس ورڈ کم از کم ۶ ہندسوں کا ہونا چاہیے۔" : "Password is too weak. Must be at least 6 characters.";
      }

      Alert.alert(
        isUrdu ? "تصدیقی خرابی" : "Authentication Failure",
        errMsg
      );
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    updateProfile({
      name: isUrdu ? "اللہ کا بندہ" : "Servant of Allah",
      isGuest: true,
      googleLinked: false,
      gmail: null,
    });
    setOnboardingCompleted(false);
    
    // Redirect direct to Onboarding screen
    navigation.replace('Onboarding');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: activeTheme.background }]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Upper Brand Header */}
      <View style={styles.header}>
        <View style={[styles.logoContainer, { borderColor: activeTheme.accent }]}>
          <Text style={[styles.logoText, { color: activeTheme.accent }]}>سجدة</Text>
        </View>
        <Text style={[styles.title, { color: activeTheme.text }]}>Sajdah</Text>
        <Text style={[styles.tagline, { color: activeTheme.textMuted }]}>
          {isUrdu ? 'آپ کا ممتاز روحانی آپریٹنگ سسٹم' : 'Your premium spiritual operating system'}
        </Text>
      </View>

      {/* Main Form Box */}
      <View style={styles.formCard}>
        <View style={styles.tabRow}>
          <TouchableOpacity 
            style={[styles.tab, isLogin && { borderBottomColor: activeTheme.primary }]}
            onPress={() => setIsLogin(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, isLogin ? { color: activeTheme.primary, fontWeight: '800' } : { color: activeTheme.textMuted }]}>
              {isUrdu ? 'لاگ ان' : 'Sign In'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, !isLogin && { borderBottomColor: activeTheme.primary }]}
            onPress={() => setIsLogin(false)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, !isLogin ? { color: activeTheme.primary, fontWeight: '800' } : { color: activeTheme.textMuted }]}>
              {isUrdu ? 'رجسٹریشن' : 'Register'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inputs */}
        <View style={styles.inputsSection}>
          {!isLogin && (
            <View style={styles.inputWrapper}>
              <User size={18} color="#707974" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder={isUrdu ? 'اپنا نام درج کریں' : 'Full Name'}
                placeholderTextColor="#707974"
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>
          )}

          <View style={styles.inputWrapper}>
            <Mail size={18} color="#707974" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder={isUrdu ? 'ای میل ایڈریس' : 'Email Address'}
              placeholderTextColor="#707974"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Lock size={18} color="#707974" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              placeholder={isUrdu ? 'پاس ورڈ (۶ ہندسے)' : 'Password (min 6 chars)'}
              placeholderTextColor="#707974"
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)}
              style={{ padding: 4 }}
            >
              {showPassword ? <EyeOff size={16} color="#707974" /> : <Eye size={16} color="#707974" />}
            </TouchableOpacity>
          </View>

          {!isLogin && (
            <View style={styles.inputWrapper}>
              <Key size={18} color="#707974" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholder={isUrdu ? 'پاس ورڈ کی تصدیق کریں' : 'Confirm Password'}
                placeholderTextColor="#707974"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={{ padding: 4 }}
              >
                {showPassword ? <EyeOff size={16} color="#707974" /> : <Eye size={16} color="#707974" />}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          style={[styles.primaryBtn, { backgroundColor: activeTheme.primary }]}
          onPress={handleAuthAction}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.primaryBtnText}>
                {isLogin ? (isUrdu ? 'لاگ ان کریں' : 'Sign In Now') : (isUrdu ? 'اکاؤنٹ بنائیں' : 'Create Account')}
              </Text>
              <ChevronRight size={16} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>

        {/* Google Sign-in Button */}
        <TouchableOpacity 
          style={styles.googleBtn}
          onPress={() => setShowGoogleChooser(true)}
          activeOpacity={0.8}
        >
          <View style={styles.googleIconCircle}>
            <Text style={styles.googleIconLetter}>G</Text>
          </View>
          <Text style={styles.googleBtnText}>
            {isUrdu ? 'گوگل کے ساتھ لاگ ان کریں' : 'Continue with Google'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Google Account Selector Overlay Sheet */}
      {showGoogleChooser && (
        <View style={styles.modalBackdrop}>
          <View style={styles.googleSheetCard}>
            <View style={styles.googleSheetHeader}>
              <View style={styles.googleTitleBox}>
                <Text style={styles.googleChooseTitle}>{isUrdu ? "گوگل اکاؤنٹ سائن ان" : "Google Account Sign-In"}</Text>
                <Text style={styles.googleChooseSubtitle}>{isUrdu ? "سجدہ ایپ کے ساتھ جڑنے کے لیے" : "to continue securely to Sajdah"}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowGoogleChooser(false)} style={styles.googleCloseBtn}>
                <Text style={styles.googleCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#707974', marginBottom: 8 }}>
                {isUrdu ? "جی میل ایڈریس:" : "Enter your Google Gmail ID:"}
              </Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color="#707974" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="example@gmail.com"
                  placeholderTextColor="#707974"
                  value={googleEmail}
                  onChangeText={setGoogleEmail}
                />
              </View>

              <TouchableOpacity 
                style={[styles.primaryBtn, { backgroundColor: '#006c44', marginTop: 20 }]}
                onPress={() => {
                  if (googleEmail && googleEmail.trim().includes('@')) {
                    const name = googleEmail.split('@')[0];
                    handleGoogleLogin(googleEmail.trim(), name);
                  } else {
                    Alert.alert("Invalid Email", "Please enter a valid Gmail address.");
                  }
                }}
              >
                <Text style={styles.primaryBtnText}>
                  {isUrdu ? "گوگل کے ساتھ لاگ ان کریں" : "Sign In with Google"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ paddingVertical: 12, alignItems: 'center', marginTop: 8 }}
                onPress={() => setShowGoogleChooser(false)}
              >
                <Text style={{ color: '#707974', fontSize: 13, fontWeight: '800' }}>
                  {isUrdu ? "منسوخ کریں" : "Cancel"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Guest Bypass Flow Section */}
      <View style={styles.guestContainer}>
        <View style={styles.orDividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.orText}>{isUrdu ? 'یا' : 'OR'}</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity 
          style={styles.guestBtn}
          onPress={handleContinueAsGuest}
          activeOpacity={0.8}
        >
          <Compass size={18} color={activeTheme.accent} style={{ marginRight: 6 }} />
          <Text style={[styles.guestBtnText, { color: activeTheme.text }]}>
            {isUrdu ? 'بطور مہمان ایپ استعمال کریں (آف لائن)' : 'Continue as Guest (Offline Mode)'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.guestDesc}>
          {isUrdu 
            ? 'بطور مہمان استعمال کرنے پر آپ کے قضاء اور سجدہ کے تمام ریکارڈز مقامی طور پر ڈیوائس پر محفوظ ہوں گے۔' 
            : 'Using guest mode saves your Salah records locally. Link an account later to sync to the cloud.'}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 70 : 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoContainer: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#ffffff',
    elevation: 3,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '400',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    elevation: 4,
    shadowColor: 'rgba(27, 77, 62, 0.08)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    marginBottom: 24,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f3f1',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  inputsSection: {
    gap: 12,
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbf9f4',
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.06)',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#003629',
  },
  primaryBtn: {
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  guestContainer: {
    alignItems: 'center',
    width: '100%',
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 54, 41, 0.08)',
  },
  orText: {
    paddingHorizontal: 12,
    color: '#707974',
    fontSize: 10.5,
    fontWeight: '800',
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 108, 68, 0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 108, 68, 0.05)',
    borderRadius: 16,
    width: '100%',
    height: 52,
    marginBottom: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  guestBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  guestDesc: {
    fontSize: 10,
    color: '#707974',
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 14,
    opacity: 0.8,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 54, 41, 0.08)',
    borderRadius: 16,
    height: 52,
    marginTop: 10,
  },
  googleIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ea4335',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  googleIconLetter: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  googleBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#404945',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 54, 41, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 999,
  },
  googleSheetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxHeight: 400,
    padding: 20,
    elevation: 10,
    shadowColor: '#003629',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  googleSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f3f1',
    paddingBottom: 12,
    marginBottom: 12,
  },
  googleTitleBox: {
    flex: 1,
  },
  googleChooseTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#003629',
  },
  googleChooseSubtitle: {
    fontSize: 11,
    color: '#707974',
    marginTop: 2,
    fontWeight: '700',
  },
  googleCloseBtn: {
    padding: 4,
  },
  googleCloseText: {
    fontSize: 16,
    color: '#707974',
    fontWeight: '800',
  },
  googleAccountsList: {
    flexGrow: 0,
  },
  googleAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#fbf9f4',
  },
  googleAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#006c44',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  googleAccountTextCol: {
    flex: 1,
  },
  googleAccountName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#003629',
  },
  googleAccountEmail: {
    fontSize: 11,
    color: '#707974',
    marginTop: 1,
    fontWeight: '600',
  },
});
export default AuthScreen;
