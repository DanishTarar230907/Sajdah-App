// src/screens/SettingsScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Platform } from 'react-native';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { themes, ThemeType } from '../theme/colors';
import { Madhhab, CalculationMethod } from '../services/prayerEngine';
import GlassCard from '../components/GlassCard';
import { Book, Globe, Shield, Sparkles, Sliders } from 'lucide-react-native';

export const SettingsScreen: React.FC = () => {
  const { theme, setTheme, language, setLanguage, geminiApiKey, setGeminiApiKey, isNotificationsEnabled, setNotificationsEnabled } = useUIStore();
  const { profile, updateProfile } = useAuthStore();
  const activeTheme = themes[theme];

  const madhhabs: Madhhab[] = ['Shafi\'i', 'Hanafi', 'Maliki', 'Hanbali', 'Jafari'];
  const calcMethods: CalculationMethod[] = ['MWL', 'ISNA', 'KARACHI', 'EGYPT', 'TEHRAN', 'GULF'];
  const languages = ['EN', 'AR', 'UR'] as const;

  return (
    <ScrollView style={[styles.container, { backgroundColor: activeTheme.background }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: activeTheme.text }]}>Configurations & Settings</Text>
      <Text style={[styles.subtitle, { color: activeTheme.textMuted }]}>
        Customize your Islamic calculation methods, active jurisprudence, application themes, and live AI API keys.
      </Text>

      {/* Jurisprudence Selection Card */}
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Book size={18} color={activeTheme.primary} />
          <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Jurisprudence & Madhhab</Text>
        </View>
        <Text style={[styles.hintText, { color: activeTheme.textMuted }]}>
          Affects the calculation of Asr prayer shadow length thresholds.
        </Text>
        
        <View style={styles.rowSelector}>
          {madhhabs.map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.selectItem,
                {
                  backgroundColor: profile?.madhhab === m ? activeTheme.primary : 'rgba(0,0,0,0.02)',
                  borderColor: profile?.madhhab === m ? activeTheme.accent : activeTheme.cardBorder,
                },
              ]}
              onPress={() => updateProfile({ madhhab: m })}
            >
              <Text
                style={[
                  styles.selectText,
                  { color: profile?.madhhab === m ? '#FFFFFF' : activeTheme.textMuted },
                ]}
              >
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </GlassCard>

      {/* Calculation Methods Card */}
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Sliders size={18} color={activeTheme.primary} />
          <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Calculation Conventions</Text>
        </View>
        <Text style={[styles.hintText, { color: activeTheme.textMuted }]}>
          Adjusts astronomical angle equations for Fajr and Isha prayers.
        </Text>

        <View style={styles.rowSelectorWrap}>
          {calcMethods.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.selectItemHalf,
                {
                  backgroundColor: profile?.calculationMethod === c ? activeTheme.primary : 'rgba(0,0,0,0.02)',
                  borderColor: profile?.calculationMethod === c ? activeTheme.accent : activeTheme.cardBorder,
                },
              ]}
              onPress={() => updateProfile({ calculationMethod: c })}
            >
              <Text
                style={[
                  styles.selectText,
                  { color: profile?.calculationMethod === c ? '#FFFFFF' : activeTheme.textMuted },
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </GlassCard>

      {/* Live AI Integration Card */}
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Sparkles size={18} color={activeTheme.accent} />
          <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Live AI Companion API Key</Text>
        </View>
        <Text style={[styles.hintText, { color: activeTheme.textMuted }]}>
          Enter your Gemini API key to activate the high-fidelity conversational agent. If empty, the app runs on a locally simulated empathetic counseling engine.
        </Text>

        <TextInput
          style={[styles.input, { borderColor: activeTheme.cardBorder, color: activeTheme.text }]}
          placeholder="Enter Gemini API key..."
          placeholderTextColor={activeTheme.textMuted}
          secureTextEntry={true}
          value={geminiApiKey}
          onChangeText={setGeminiApiKey}
        />
      </GlassCard>

      {/* Theme selection */}
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Globe size={18} color={activeTheme.primary} />
          <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>App Aesthetic Theme</Text>
        </View>

        <View style={styles.rowSelectorWrap}>
          {([
            { key: 'emerald', label: 'Emerald' },
            { key: 'nightMosque', label: 'Night Mosque' },
            { key: 'dark', label: 'Dark Mode' },
            { key: 'light', label: 'Teal Light' }
          ] as { key: ThemeType; label: string }[]).map((thm) => (
            <TouchableOpacity
              key={thm.key}
              style={[
                styles.selectItemHalf,
                {
                  backgroundColor: theme === thm.key ? activeTheme.primary : 'rgba(0,0,0,0.02)',
                  borderColor: theme === thm.key ? activeTheme.accent : activeTheme.cardBorder,
                },
              ]}
              onPress={() => setTheme(thm.key)}
            >
              <Text
                style={[
                  styles.selectText,
                  { color: theme === thm.key ? '#FFFFFF' : activeTheme.textMuted },
                ]}
              >
                {thm.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </GlassCard>

      {/* Language selections */}
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Globe size={18} color={activeTheme.primary} />
          <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Language / Internationalization</Text>
        </View>

        <View style={styles.rowSelector}>
          {languages.map((l) => (
            <TouchableOpacity
              key={l}
              style={[
                styles.selectItem,
                {
                  backgroundColor: language === l ? activeTheme.primary : 'rgba(0,0,0,0.02)',
                  borderColor: language === l ? activeTheme.accent : activeTheme.cardBorder,
                },
              ]}
              onPress={() => setLanguage(l)}
            >
              <Text
                style={[
                  styles.selectText,
                  { color: language === l ? '#FFFFFF' : activeTheme.textMuted },
                ]}
              >
                {l}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </GlassCard>

      {/* Notifications toggles */}
      <GlassCard style={styles.card}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchTitle, { color: activeTheme.text }]}>Local Reminders & Adhan Alerts</Text>
            <Text style={[styles.hintText, { color: activeTheme.textMuted, marginTop: 4 }]}>
              Trigger silent background sound reminders and notify active schedules.
            </Text>
          </View>
          <Switch
            value={isNotificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#D1D5DB', true: activeTheme.primaryLight }}
            thumbColor={isNotificationsEnabled ? activeTheme.accent : '#F3F4F6'}
          />
        </View>
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
    marginBottom: 20,
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  hintText: {
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 14,
  },
  rowSelector: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  rowSelectorWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    minWidth: 70,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  selectItemHalf: {
    width: '48%',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  selectText: {
    fontSize: 11,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
});
export default SettingsScreen;
