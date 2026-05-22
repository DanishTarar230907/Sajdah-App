// src/screens/AIChatScreen.tsx

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Send, Sparkles, AlertCircle, Compass, Heart } from 'lucide-react-native';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { themes } from '../theme/colors';
import GlassCard from '../components/GlassCard';
import { getCompanionResponse, ChatMessage } from '../services/aiCompanion';

export const AIChatScreen: React.FC = () => {
  const { theme, geminiApiKey } = useUIStore();
  const { profile } = useAuthStore();
  const activeTheme = themes[theme];

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'companion',
      text: `Assalamu Alaikum ${profile?.name || 'my friend'}, I am your Sajdah Spiritual Companion. I am here to help you stay consistent in prayer and recover missed Salah with kindness, mercy, and support. Ask me anything, or select a prompt below!`,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const quickPrompts = [
    "I keep missing Fajr, help.",
    "How to stay consistent?",
    "How to recover lifetime missed Qaza?",
    "I feel spiritual anxiety today."
  ];

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const responseText = await getCompanionResponse(text, messages, geminiApiKey);
      const assistantMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'companion',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      console.error(e);
      const errMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'companion',
        text: "My apologies, but my connection failed. Remember, Allah's mercy is closer than your jugular vein. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Scroll to bottom upon new message
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, loading]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: activeTheme.background }]}
    >
      <View style={styles.header}>
        <Sparkles size={22} color={activeTheme.accent} />
        <Text style={[styles.title, { color: activeTheme.text }]}>AI Spiritual Companion</Text>
        <Heart size={16} color={activeTheme.danger} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.chatArea}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.bubbleWrapper,
              msg.sender === 'user' ? styles.userWrapper : styles.assistantWrapper
            ]}
          >
            <GlassCard
              style={[
                styles.bubble,
                msg.sender === 'user'
                  ? { backgroundColor: activeTheme.primary, borderColor: activeTheme.accent }
                  : { backgroundColor: activeTheme.card, borderColor: activeTheme.cardBorder }
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  { color: msg.sender === 'user' ? '#FFFFFF' : activeTheme.text }
                ]}
              >
                {msg.text}
              </Text>
            </GlassCard>
          </View>
        ))}

        {loading && (
          <View style={[styles.bubbleWrapper, styles.assistantWrapper]}>
            <GlassCard style={[styles.bubble, { backgroundColor: activeTheme.card, borderColor: activeTheme.cardBorder, paddingVertical: 10 }]}>
              <ActivityIndicator size="small" color={activeTheme.accent} />
            </GlassCard>
          </View>
        )}
      </ScrollView>

      {/* Prompts suggestions drawer */}
      {messages.length === 1 && (
        <View style={styles.promptsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptsScroll}>
            {quickPrompts.map((prompt, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.promptBtn, { backgroundColor: activeTheme.card, borderColor: activeTheme.cardBorder }]}
                onPress={() => handleSend(prompt)}
              >
                <Text style={[styles.promptText, { color: activeTheme.primaryLight }]}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Footer Chat Input */}
      <View style={[styles.inputBar, { borderTopColor: activeTheme.cardBorder, backgroundColor: activeTheme.glassBg }]}>
        <TextInput
          style={[styles.input, { borderColor: activeTheme.cardBorder, color: activeTheme.text }]}
          placeholder="Ask for guidance or habit support..."
          placeholderTextColor={activeTheme.textMuted}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSend(inputText)}
        />
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.sendBtn, { backgroundColor: activeTheme.primary }]}
          onPress={() => handleSend(inputText)}
        >
          <Send size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  chatArea: {
    padding: 16,
    paddingBottom: 30,
  },
  bubbleWrapper: {
    width: '100%',
    marginVertical: 6,
    flexDirection: 'row',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  assistantWrapper: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
  },
  bubbleText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  promptsContainer: {
    paddingVertical: 10,
  },
  promptsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  promptBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  promptText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13.5,
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
});
export default AIChatScreen;
