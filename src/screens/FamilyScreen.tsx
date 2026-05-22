// src/screens/FamilyScreen.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, Alert } from 'react-native';
import { Users, Award, ShieldAlert, Heart, MessageSquare, Plus, BookOpen } from 'lucide-react-native';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { themes } from '../theme/colors';
import GlassCard from '../components/GlassCard';

export const FamilyScreen: React.FC = () => {
  const { theme } = useUIStore();
  const { profile } = useAuthStore();
  const activeTheme = themes[theme];

  // Mock Family Member list
  const [members, setMembers] = useState([
    { name: 'Fatima (Child)', streak: 12, qazaCompleted: 140, role: 'Child', activeGoal: '100% Fajr Week' },
    { name: 'Zainab (Wife)', streak: 28, qazaCompleted: 450, role: 'Parent', activeGoal: 'Dhuhr Mosque' }
  ]);

  const [dhikrFeed, setDhikrFeed] = useState([
    { name: 'Zaid', text: 'Zaid completed 100x Astaghfirullah', avatar: 'Z', count: 100, item: 'Astaghfirullah', tally: { Astaghfirullah: 100, SubhanAllah: 150, Alhamdulillah: 200 } },
    { name: 'Fatima', text: 'Fatima completed 50x SubhanAllah', avatar: 'F', count: 50, item: 'SubhanAllah', tally: { SubhanAllah: 50, Alhamdulillah: 100 } },
    { name: 'Sajid', text: 'Sajid completed 300x Alhamdulillah', avatar: 'S', count: 300, item: 'Alhamdulillah', tally: { Alhamdulillah: 300, Astaghfirullah: 50, 'Allahu Akbar': 100 } }
  ]);

  const [selectedFriend, setSelectedFriend] = useState<any | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [loveLogs, setLoveLogs] = useState<Record<string, number>>({});

  const handleSendDua = (name: string) => {
    setLoveLogs(prev => ({
      ...prev,
      [name]: (prev[name] || 0) + 1
    }));
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: activeTheme.background }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: activeTheme.text }]}>Family Circles</Text>
      <Text style={[styles.subtitle, { color: activeTheme.textMuted }]}>
        Build cooperative streaks, set shared family Salah goals, and send supportive Duas to keep each other motivated.
      </Text>

      {/* Shared Family Goal Card */}
      <GlassCard style={styles.sharedGoalCard}>
        <View style={styles.goalHeader}>
          <Award size={22} color={activeTheme.accent} />
          <Text style={[styles.goalHeaderLabel, { color: activeTheme.accent }]}>ACTIVE FAMILY CHALLENGE</Text>
        </View>
        <Text style={[styles.challengeTitle, { color: activeTheme.text }]}>Family Fajr Club</Text>
        <Text style={[styles.challengeDesc, { color: activeTheme.textMuted }]}>
          All family members must pray Fajr consistently on time for 7 consecutive days.
        </Text>
        
        <View style={[styles.progressBg, { backgroundColor: activeTheme.cardBorder }]}>
          <View style={[styles.progressFill, { backgroundColor: activeTheme.primary, width: '75%' }]} />
        </View>
        <Text style={[styles.progressText, { color: activeTheme.textMuted }]}>Challenge Progress: 5 of 7 Days completed</Text>
      </GlassCard>

      {/* Dhikr Circles Feed */}
      <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Dhikr Circles Feed</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.feedScroll} contentContainerStyle={{ paddingRight: 20 }}>
        {dhikrFeed.map((feedItem, idx) => (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.85}
            style={[styles.feedCard, { backgroundColor: '#ffffff', borderColor: 'rgba(0, 54, 41, 0.05)' }]}
            onPress={() => {
              setSelectedFriend(feedItem);
              setShowInviteModal(true);
            }}
          >
            <View style={styles.feedCardHeader}>
              <View style={[styles.feedAvatar, { backgroundColor: activeTheme.accentLight }]}>
                <Text style={[styles.feedAvatarText, { color: activeTheme.primary }]}>{feedItem.avatar}</Text>
              </View>
              <Text style={[styles.feedName, { color: activeTheme.text }]}>{feedItem.name}</Text>
            </View>
            <Text style={[styles.feedText, { color: activeTheme.text }]}>{feedItem.text}</Text>
            <View style={styles.feedFooter}>
              <BookOpen size={12} color={activeTheme.accent} />
              <Text style={[styles.feedFooterText, { color: activeTheme.textMuted }]}>Tap to view daily tally</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Members Grid List */}
      <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Family Members</Text>

      {members.map((member, idx) => {
        const duaCount = loveLogs[member.name] || 0;
        
        return (
          <GlassCard key={idx} style={styles.memberCard}>
            <View style={styles.memberHeader}>
              <View style={styles.memberLeft}>
                <View style={[styles.avatarCircle, { backgroundColor: activeTheme.primaryLight }]}>
                  <Users size={16} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={[styles.memberName, { color: activeTheme.text }]}>{member.name}</Text>
                  <Text style={[styles.memberRole, { color: activeTheme.textMuted }]}>
                    Role: {member.role} • Target: {member.activeGoal}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.duaBtn,
                  {
                    backgroundColor: duaCount > 0 ? activeTheme.accentLight : 'rgba(0,0,0,0.02)',
                    borderColor: activeTheme.accent,
                  },
                ]}
                onPress={() => handleSendDua(member.name)}
              >
                <Heart size={14} color={duaCount > 0 ? activeTheme.primary : activeTheme.textMuted} fill={duaCount > 0 ? activeTheme.primary : 'none'} />
                <Text style={[styles.duaText, { color: activeTheme.primary }]}>
                  {duaCount > 0 ? `Sent ${duaCount} Dua` : 'Send Dua'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: activeTheme.cardBorder }]} />

            <View style={styles.memberStats}>
              <View style={styles.statCell}>
                <Text style={[styles.statLabel, { color: activeTheme.textMuted }]}>SALAH STREAK</Text>
                <Text style={[styles.statVal, { color: activeTheme.text }]}>{member.streak} Days</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={[styles.statLabel, { color: activeTheme.textMuted }]}>QAZAS RECOVERED</Text>
                <Text style={[styles.statVal, { color: activeTheme.accent }]}>{member.qazaCompleted} Salahs</Text>
              </View>
            </View>
          </GlassCard>
        );
      })}

      {/* Invite Member action */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.inviteBtn, { borderColor: activeTheme.primaryLight, borderStyle: 'dashed' }]}
      >
        <Plus size={18} color={activeTheme.primaryLight} />
        <Text style={[styles.inviteText, { color: activeTheme.primaryLight }]}>Link Family Member Account</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* Bottom Sheet for Friend Dhikr Tally & Goal Invitation */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInviteModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowInviteModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderBar} />
            {selectedFriend && (
              <View>
                <Text style={styles.modalTitle}>
                  {selectedFriend.name}'s Daily Dhikr
                </Text>
                <Text style={styles.modalSubtitle}>
                  Here is today's progress for {selectedFriend.name}.
                </Text>

                <View style={styles.tallyContainer}>
                  {Object.entries(selectedFriend.tally).map(([dhikrName, count]) => (
                    <View key={dhikrName} style={styles.tallyRow}>
                      <Text style={styles.tallyName}>{dhikrName}</Text>
                      <Text style={styles.tallyCount}>{count as number}x</Text>
                    </View>
                  ))}
                </View>

                {/* Invite Button */}
                <TouchableOpacity
                  style={styles.inviteButton}
                  activeOpacity={0.85}
                  onPress={() => {
                    setShowInviteModal(false);
                    Alert.alert(
                      "Invitation Sent! 🤝",
                      `Joint Dhikr goal invite has been dispatched to ${selectedFriend.name}.`
                    );
                  }}
                >
                  <Text style={styles.inviteButtonText}>Invite to joint Dhikr goal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  activeOpacity={0.85}
                  onPress={() => setShowInviteModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
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
  sharedGoalCard: {
    padding: 16,
    marginBottom: 24,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  goalHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  challengeDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  memberCard: {
    padding: 14,
    marginBottom: 12,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
  },
  memberRole: {
    fontSize: 10.5,
    marginTop: 2,
  },
  duaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  duaText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  memberStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCell: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  inviteBtn: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  inviteText: {
    fontSize: 13,
    fontWeight: '700',
  },
  feedScroll: {
    marginBottom: 20,
  },
  feedCard: {
    width: 220,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginRight: 12,
  },
  feedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  feedAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedAvatarText: {
    fontSize: 12,
    fontWeight: '800',
  },
  feedName: {
    fontSize: 12,
    fontWeight: '800',
  },
  feedText: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 10,
    fontWeight: '600',
  },
  feedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedFooterText: {
    fontSize: 9,
    fontWeight: '700',
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
    marginBottom: 20,
  },
  tallyContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    gap: 12,
    marginBottom: 20,
  },
  tallyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tallyName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#003629',
  },
  tallyCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#006c44',
  },
  inviteButton: {
    backgroundColor: '#006c44',
    borderRadius: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  inviteButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  cancelButton: {
    backgroundColor: 'rgba(0, 54, 41, 0.05)',
    borderRadius: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#003629',
    fontSize: 13,
    fontWeight: '800',
  },
});
export default FamilyScreen;
