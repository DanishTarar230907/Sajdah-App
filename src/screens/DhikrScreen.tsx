// src/screens/DhikrScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, TextInput, FlatList, Platform, Alert } from 'react-native';
import { ChevronRight, Plus, Minus, Users, Trophy, BookOpen, Trash2, ArrowUpRight } from 'lucide-react-native';
import Svg, { Circle, Rect, G } from 'react-native-svg';
import { useDhikrStore } from '../store/useDhikrStore';
import { useUIStore } from '../store/useUIStore';
import { themes } from '../theme/colors';

const { width } = Dimensions.get('window');

export const DhikrScreen: React.FC = () => {
  const { theme, language } = useUIStore();
  const { goals, activeGoalId, communityChallenge, incrementGoalCount, decrementGoalCount, createNewGoal, setActiveGoal } = useDhikrStore();
  const activeTheme = themes[theme];
  const isUrdu = language === 'UR';

  const [activeTab, setActiveTab] = useState<'my' | 'archived'>('my');
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newEnglish, setNewEnglish] = useState('');
  const [newArabic, setNewArabic] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [newTarget, setNewTarget] = useState('1000');

  // Find active goal
  const activeGoal = goals.find(g => g.id === activeGoalId) || goals[0];

  // Collaborative Shared Family Circles State
  const [sharedCircles, setSharedCircles] = useState([
    { id: 'salawat_circle', title: 'Family Salawat Circle', dhikr: 'Allahumma Salli Ala Muhammad', target: 10000, count: 4550, members: ['You', 'Amina', 'Yusuf', 'Bilal'] },
    { id: 'istighfar_circle', title: 'Joint Astaghfirullah Challenge', dhikr: 'Astaghfirullah Al-Azeem', target: 5000, count: 2120, members: ['You', 'Khadija', 'Hamza'] }
  ]);
  const [showCreateCircle, setShowCreateCircle] = useState(false);
  const [circleTitle, setCircleTitle] = useState('');
  const [circleDhikr, setCircleDhikr] = useState('SubhanAllah');
  const [circleTarget, setCircleTarget] = useState('1000');
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>(['Amina', 'Yusuf']);
  const [toastText, setToastText] = useState<string | null>(null);

  // 📿 Inactivity commit debouncer state
  const [tempCount, setTempCount] = useState<number | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingAmountRef = useRef<number>(0);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleIncrement = (amount: number) => {
    if (!activeGoal) return;
    
    // Calculate new local counter
    const currentBase = tempCount !== null ? tempCount : activeGoal.count;
    const nextVal = currentBase + amount;
    setTempCount(nextVal);
    
    // Accumulate pending amount
    pendingAmountRef.current += amount;
    
    // Debounce commit to store
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (pendingAmountRef.current !== 0) {
        incrementGoalCount(activeGoal.id, pendingAmountRef.current);
        pendingAmountRef.current = 0;
        setTempCount(null);
      }
    }, 2000);
  };

  const handleDecrement = (amount: number) => {
    if (!activeGoal) return;
    
    const currentBase = tempCount !== null ? tempCount : activeGoal.count;
    const nextVal = Math.max(0, currentBase - amount);
    setTempCount(nextVal);
    
    pendingAmountRef.current -= amount;
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (pendingAmountRef.current !== 0) {
        if (pendingAmountRef.current > 0) {
          incrementGoalCount(activeGoal.id, pendingAmountRef.current);
        } else {
          decrementGoalCount(activeGoal.id, Math.abs(pendingAmountRef.current));
        }
        pendingAmountRef.current = 0;
        setTempCount(null);
      }
    }, 2000);
  };

  // Community live additions
  const [feedItems, setFeedItems] = useState<string[]>(communityChallenge.liveFeed);
  useEffect(() => {
    const interval = setInterval(() => {
      const names = ['Amina', 'Yusuf', 'Bilal', 'Mariam', 'Zainab', 'Hamza', 'Khadija'];
      const phrases = ['completed 100 Istighfar', 'added 33 Alhamdulillah', 'began a new 10k goal', 'reached 70% of goal', 'added 100 Salawat'];
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      setFeedItems(prev => [
        `${randomName} ${randomPhrase}...`,
        ...prev.slice(0, 2)
      ]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Collaborative friends auto counts simulation!
  useEffect(() => {
    const simulateCircleUpdates = setInterval(() => {
      const circleNames = ['Family Salawat Circle', 'Joint Astaghfirullah Challenge'];
      const members = ['Amina', 'Yusuf', 'Bilal', 'Khadija', 'Hamza'];
      const amount = [33, 100, 70][Math.floor(Math.random() * 3)];
      const randomCircle = circleNames[Math.floor(Math.random() * circleNames.length)];
      const randomMember = members[Math.floor(Math.random() * members.length)];
      
      setSharedCircles(prev => prev.map(c => {
        if (c.title === randomCircle) {
          return { ...c, count: Math.min(c.target, c.count + amount) };
        }
        return c;
      }));

      // Show notification toast!
      setToastText(`${randomMember} contributed +${amount} to ${randomCircle}!`);
      setTimeout(() => setToastText(null), 2500);
    }, 12000);
    return () => clearInterval(simulateCircleUpdates);
  }, []);

  const handleContributeToCircle = (circleId: string, amount: number) => {
    setSharedCircles(prev => prev.map(c => {
      if (c.id === circleId) {
        return { ...c, count: Math.min(c.target, c.count + amount) };
      }
      return c;
    }));
    setToastText(`You contributed +${amount} counts to circle! ✓`);
    setTimeout(() => setToastText(null), 2500);
  };

  const handleCreateSharedCircle = () => {
    if (!circleTitle.trim() || !circleTarget) return;
    const newCircle = {
      id: 'custom_circle_' + Date.now(),
      title: circleTitle.trim(),
      dhikr: circleDhikr,
      target: parseInt(circleTarget) || 1000,
      count: 0,
      members: ['You', ...selectedInvitees]
    };
    setSharedCircles(prev => [...prev, newCircle]);
    setCircleTitle('');
    setCircleTarget('1000');
    setShowCreateCircle(false);
    setToastText(`Shared Circle "${newCircle.title}" created successfully! 🌟`);
    setTimeout(() => setToastText(null), 2500);
  };

  const handleCreateGoal = () => {
    if (!newEnglish || !newTarget) return;
    createNewGoal(newArabic, newEnglish, newTranslation, parseInt(newTarget) || 1000);
    setNewEnglish('');
    setNewArabic('');
    setNewTranslation('');
    setNewTarget('1000');
    setShowAddGoal(false);
  };

  const getPercentage = (count: number, target: number) => {
    return Math.min(100, Math.floor((count / target) * 100)) || 0;
  };

  // SVGRadialProgress
  const size = 150;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const renderRadialProgress = (count: number, target: number) => {
    const pct = getPercentage(count, target);
    const strokeDashoffset = circumference - (pct / 100) * circumference;

    return (
      <View style={styles.radialContainer}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size/2}, ${size/2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="rgba(0, 108, 68, 0.08)"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#006c44" // secondary/emerald
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </G>
        </Svg>
        <View style={styles.radialTextOverlay}>
          <Text style={styles.radialPctText}>{pct}%</Text>
          <Text style={styles.radialSubText}>{isUrdu ? 'مکمل' : 'Completed'}</Text>
        </View>
      </View>
    );
  };

  // Weekly bar activity renderer
  const renderWeeklyChart = () => {
    if (!activeGoal) return null;
    const history = activeGoal.history || {};
    const dates = Object.keys(history).sort();
    const last7Days = dates.slice(-7);
    
    // Fallback if empty
    const dummyDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const chartHeight = 80;
    const barWidth = 20;

    let maxVal = 100;
    last7Days.forEach(d => {
      if (history[d] > maxVal) maxVal = history[d];
    });

    return (
      <View style={styles.chartWrapper}>
        <Text style={styles.chartTitle}>{isUrdu ? 'پچھلے ۷ دنوں کی سرگرمی' : 'Recitations (Last 7 Days)'}</Text>
        <View style={styles.chartContainer}>
          {dummyDays.map((day, idx) => {
            const dateKey = last7Days[idx];
            const val = dateKey ? (history[dateKey] || 0) : 0;
            const barHeight = maxVal > 0 ? (val / maxVal) * chartHeight : 10;

            return (
              <View key={day} style={styles.chartColumn}>
                <View style={[styles.barBg, { height: chartHeight }]}>
                  <View style={[styles.barFill, { height: barHeight }]} />
                </View>
                <Text style={styles.chartDayLabel}>{day}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Premium Header */}
      <View style={styles.headerBanner}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerSubtitle}>{isUrdu ? 'تسبیح اور ذکر اہداف' : 'SACRED DEVOTION'}</Text>
            <Text style={styles.headerTitle}>{isUrdu ? 'ذکر اہداف' : 'Dhikr Goals'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.addBtn}
            onPress={() => setShowAddGoal(!showAddGoal)}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.addBtnText}>{isUrdu ? 'نیا ہدف' : 'New Goal'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Add Goal Form Overlay */}
      {showAddGoal && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{isUrdu ? 'نیا ذکر شامل کریں' : 'Create New Dhikr Goal'}</Text>
          
          <TextInput
            placeholder={isUrdu ? 'ذکر انگریزی میں (جیسے SubhanAllah)' : 'Dhikr English Name (e.g. SubhanAllah)'}
            placeholderTextColor="#888"
            style={styles.input}
            value={newEnglish}
            onChangeText={setNewEnglish}
          />
          <TextInput
            placeholder={isUrdu ? 'عربی متن (جیسے سُبْحَانَ اللَّهِ)' : 'Arabic Script (e.g. سُبْحَانَ اللَّهِ)'}
            placeholderTextColor="#888"
            style={styles.input}
            value={newArabic}
            onChangeText={setNewArabic}
          />
          <TextInput
            placeholder={isUrdu ? 'ترجمہ (جیسے Glory be to Allah)' : 'Translation (e.g. Glory be to Allah)'}
            placeholderTextColor="#888"
            style={styles.input}
            value={newTranslation}
            onChangeText={setNewTranslation}
          />
          <TextInput
            placeholder={isUrdu ? 'کل ہدف (جیسے 1000)' : 'Target Count (e.g. 1000)'}
            placeholderTextColor="#888"
            keyboardType="numeric"
            style={styles.input}
            value={newTarget}
            onChangeText={setNewTarget}
          />

          <View style={styles.formActions}>
            <TouchableOpacity 
              style={[styles.formBtn, styles.cancelBtn]} 
              onPress={() => setShowAddGoal(false)}
            >
              <Text style={styles.cancelBtnText}>{isUrdu ? 'منسوخ' : 'Cancel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.formBtn, styles.saveBtn]} 
              onPress={handleCreateGoal}
            >
              <Text style={styles.saveBtnText}>{isUrdu ? 'محفوظ کریں' : 'Save Goal'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Goal Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.activeTab]}
          onPress={() => setActiveTab('my')}
        >
          <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>
            {isUrdu ? 'میرے اہداف' : 'My Goals'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'archived' && styles.activeTab]}
          onPress={() => setActiveTab('archived')}
        >
          <Text style={[styles.tabText, activeTab === 'archived' && styles.activeTabText]}>
            {isUrdu ? 'آرکائیو' : 'Archived'}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'my' && activeGoal ? (
        <View style={styles.activeGoalWrapper}>
          {/* Active Goal Primary Display Card */}
          <View style={styles.activeGoalCard}>
            <View style={styles.goalMetaRow}>
              <View style={styles.goalMetaBadge}>
                <BookOpen size={12} color="#006c44" />
                <Text style={styles.goalMetaBadgeText}>{isUrdu ? 'فعال ہدف' : 'ACTIVE GOAL'}</Text>
              </View>
              <Text style={styles.goalMetaDate}>
                {isUrdu ? 'آغاز: ' : 'Since: '}{new Date(activeGoal.dateCreated).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.mainProgressContainer}>
              <View style={styles.progressInfo}>
                <Text style={styles.arabicHeading}>{activeGoal.arabic}</Text>
                <Text style={styles.englishHeading}>{activeGoal.english}</Text>
                <Text style={styles.translationHeading}>{activeGoal.translation}</Text>

                <View style={styles.countsRow}>
                  <View>
                    <Text style={styles.countLabel}>{isUrdu ? 'موجودہ تعداد' : 'RECITED'}</Text>
                    <Text style={styles.countValue}>{(tempCount !== null ? tempCount : activeGoal.count).toLocaleString()}</Text>
                  </View>
                  <View style={styles.countDivider} />
                  <View>
                    <Text style={styles.countLabel}>{isUrdu ? 'کل ہدف' : 'TARGET'}</Text>
                    <Text style={styles.targetValue}>{activeGoal.target.toLocaleString()}</Text>
                  </View>
                </View>
              </View>

              {renderRadialProgress(tempCount !== null ? tempCount : activeGoal.count, activeGoal.target)}
            </View>

            {/* Giant Tasbih Pulse Clicker */}
            <View style={styles.clickerWrapper}>
              <TouchableOpacity 
                activeOpacity={0.85}
                style={styles.giantClicker}
                onPress={() => handleIncrement(1)}
              >
                <View style={styles.clickerRingOuter}>
                  <View style={styles.clickerRingInner}>
                    <Text style={styles.arabicTapLabel}>📿</Text>
                    <Text style={styles.clickerTapText}>{isUrdu ? 'ٹیپ کریں' : 'TAP'}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Adjustments row */}
              <View style={styles.adjustmentRow}>
                <TouchableOpacity 
                  style={styles.adjustBtn} 
                  onPress={() => handleDecrement(1)}
                >
                  <Minus size={16} color="#003629" />
                  <Text style={styles.adjustBtnText}>-1</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.adjustBtn, { width: 80 }]} 
                  onPress={() => handleIncrement(10)}
                >
                  <Plus size={14} color="#003629" />
                  <Text style={styles.adjustBtnText}>+10</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.adjustBtn, { width: 80 }]} 
                  onPress={() => handleIncrement(100)}
                >
                  <Plus size={14} color="#003629" />
                  <Text style={styles.adjustBtnText}>+100</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Weekly Recitations Chart */}
            {renderWeeklyChart()}
          </View>

          {/* List of Collapsed Other Goals */}
          {goals.filter(g => g.id !== activeGoal.id && !g.archived).length > 0 && (
            <View style={styles.otherGoalsSection}>
              <Text style={styles.sectionTitle}>{isUrdu ? 'دیگر ذکر اہداف' : 'Other Goals'}</Text>
              {goals
                .filter(g => g.id !== activeGoal.id && !g.archived)
                .map(g => (
                  <TouchableOpacity 
                    key={g.id}
                    style={styles.miniGoalCard}
                    onPress={() => setActiveGoal(g.id)}
                  >
                    <View style={styles.miniGoalTextInfo}>
                      <Text style={styles.miniGoalArabic}>{g.arabic}</Text>
                      <Text style={styles.miniGoalEnglish}>{g.english}</Text>
                      <Text style={styles.miniGoalCount}>{g.count.toLocaleString()} / {g.target.toLocaleString()}</Text>
                    </View>
                    <View style={styles.miniGoalPercentageCircle}>
                      <Text style={styles.miniGoalPctText}>{getPercentage(g.count, g.target)}%</Text>
                      <ChevronRight size={18} color="#006c44" />
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          )}

          {/* Family & Friends Shared Circles Widget */}
          <View style={styles.sharedCirclesSection}>
            <View style={styles.sharedCirclesHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sharedSectionTitle}>{isUrdu ? 'خاندانی ذکر کے حلقے' : 'Family & Friends Circles'}</Text>
                <Text style={styles.sharedSectionSub}>{isUrdu ? 'اپنے پیاروں کے ساتھ مل کر ذکر کریں' : 'Recite and accumulate counts collaboratively'}</Text>
              </View>
              <TouchableOpacity 
                style={styles.circleCreateBtn}
                onPress={() => setShowCreateCircle(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.circleCreateText}>+ {isUrdu ? 'نیا حلقہ' : 'Create'}</Text>
              </TouchableOpacity>
            </View>

            {sharedCircles.map(c => {
              const pct = getPercentage(c.count, c.target);
              return (
                <View key={c.id} style={styles.circleCard}>
                  <View style={styles.circleCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.circleTitleText}>{c.title}</Text>
                      <Text style={styles.circleDhikrText}>{c.dhikr}</Text>
                      <Text style={styles.circleMembersText}>
                        👥 {isUrdu ? 'حلقہ ممبران: ' : 'Members: '}{c.members.join(', ')}
                      </Text>
                    </View>
                    <View style={styles.circlePctBox}>
                      <Text style={styles.circlePctText}>{pct}%</Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.circleBarBg}>
                    <View style={[styles.circleBarFill, { width: `${pct}%` }]} />
                  </View>

                  <View style={styles.circleCardBottom}>
                    <Text style={styles.circleCountLabel}>
                      {c.count.toLocaleString()} / {c.target.toLocaleString()} {isUrdu ? 'تسبیح' : 'Counts'}
                    </Text>
                    
                    <View style={styles.circleActions}>
                      <TouchableOpacity 
                        style={styles.contributeBtn}
                        onPress={() => {
                          Alert.prompt(
                            isUrdu ? "تعداد شامل کریں" : "Contribute Counts",
                            isUrdu ? "اپنا حصہ درج کریں:" : "How many counts did you recite?",
                            [
                              { text: "Cancel", style: "cancel" },
                              { text: "+33", onPress: () => handleContributeToCircle(c.id, 33) },
                              { text: "+100", onPress: () => handleContributeToCircle(c.id, 100) },
                              { 
                                text: "Submit", 
                                onPress: (val?: string) => {
                                  const num = parseInt(val || '0');
                                  if (num > 0) handleContributeToCircle(c.id, num);
                                } 
                              }
                            ],
                            "plain-text"
                          );
                        }}
                      >
                        <Text style={styles.contributeBtnText}>📿 {isUrdu ? 'شامل کریں' : 'Contribute'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Creation Sheet Modal */}
          {showCreateCircle && (
            <View style={styles.modalBackdrop}>
              <View style={styles.circleModalCard}>
                <Text style={styles.circleModalTitle}>{isUrdu ? 'نیا ذکر کا حلقہ بنائیں' : 'Create Collaborative Circle'}</Text>
                
                <TextInput
                  placeholder={isUrdu ? 'حلقے کا نام (جیسے خاندانی تسبیح)' : 'Circle Name (e.g. Family Tally)'}
                  placeholderTextColor="#888"
                  style={styles.circleInput}
                  value={circleTitle}
                  onChangeText={setCircleTitle}
                />
                
                <TextInput
                  placeholder={isUrdu ? 'ذکر/عبادت (جیسے درود شریف)' : 'Dhikr/Phrase (e.g. Salawat)'}
                  placeholderTextColor="#888"
                  style={styles.circleInput}
                  value={circleDhikr}
                  onChangeText={setCircleDhikr}
                />

                <TextInput
                  placeholder={isUrdu ? 'ہدف تعداد (جیسے 10,000)' : 'Target Goal (e.g. 10000)'}
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                  style={styles.circleInput}
                  value={circleTarget}
                  onChangeText={setCircleTarget}
                />

                {/* Invite list */}
                <Text style={styles.inviteLabel}>{isUrdu ? 'ممبرز شامل کریں:' : 'Invite Family Members:'}</Text>
                <View style={styles.inviteeList}>
                  {['Amina', 'Yusuf', 'Bilal', 'Khadija', 'Hamza'].map(member => {
                    const isSelected = selectedInvitees.includes(member);
                    return (
                      <TouchableOpacity
                        key={member}
                        style={[styles.inviteePill, isSelected && styles.inviteePillActive]}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedInvitees(prev => prev.filter(m => m !== member));
                          } else {
                            setSelectedInvitees(prev => [...prev, member]);
                          }
                        }}
                      >
                        <Text style={[styles.inviteePillText, isSelected && styles.inviteePillTextActive]}>
                          {member} {isSelected ? '✓' : '+'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.circleModalActions}>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.circleCancel]}
                    onPress={() => setShowCreateCircle(false)}
                  >
                    <Text style={styles.circleCancelText}>{isUrdu ? 'منسوخ' : 'Cancel'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.circleSave]}
                    onPress={handleCreateSharedCircle}
                  >
                    <Text style={styles.circleSaveText}>{isUrdu ? 'تخلیق کریں' : 'Create Circle'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Dynamic toast overlay */}
          {toastText && (
            <View style={styles.circleToast}>
              <Text style={styles.circleToastText}>{toastText}</Text>
            </View>
          )}

          {/* Community Challenge Section */}
          <View style={styles.communityCard}>
            <View style={styles.communityHeader}>
              <View>
                <Text style={styles.communitySubtitle}>{communityChallenge.subtitle.toUpperCase()}</Text>
                <Text style={styles.communityTitle}>{communityChallenge.title}</Text>
              </View>
              <View style={styles.participantsBadge}>
                <Users size={12} color="#006c44" style={{ marginRight: 4 }} />
                <Text style={styles.participantsText}>{communityChallenge.participantsCount}</Text>
              </View>
            </View>

            <View style={styles.communityStatsBox}>
              <Text style={styles.globalCountValue}>{communityChallenge.currentCount}</Text>
              <View style={styles.communityBarBg}>
                <View style={[styles.communityBarFill, { width: '45.6%' }]} />
              </View>
              <View style={styles.communityBarLabels}>
                <Text style={styles.communityBarLabel}>{isUrdu ? 'مجموعی تعداد' : 'RECITED'}</Text>
                <Text style={styles.communityBarLabel}>OF {communityChallenge.target}</Text>
              </View>
            </View>

            {/* Top Contributors */}
            <View style={styles.contributorsWrapper}>
              <Text style={styles.contributorsTitle}>
                <Trophy size={14} color="#c8a74b" style={{ marginRight: 6 }} />
                {isUrdu ? 'چیمپئنز بورڈ' : 'Top Ummah Contributors'}
              </Text>
              {communityChallenge.topContributors.map((c) => (
                <View key={c.rank} style={styles.contributorRow}>
                  <View style={styles.contributorLeft}>
                    <Text style={styles.contributorRank}>#{c.rank}</Text>
                    <Text style={styles.contributorName}>{c.name}</Text>
                  </View>
                  <Text style={styles.contributorCount}>{c.count}</Text>
                </View>
              ))}
            </View>

            {/* Simulated live feed ticker */}
            <View style={styles.feedWrapper}>
              <Text style={styles.feedHeading}>{isUrdu ? 'زندہ سرگرمی' : 'LIVE UMMAH FEED'}</Text>
              {feedItems.map((item, idx) => (
                <View key={idx} style={styles.feedItem}>
                  <View style={styles.feedDot} />
                  <Text style={styles.feedText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {activeTab === 'my' 
              ? (isUrdu ? 'کوئی فعال ذکر ہدف نہیں ہے۔' : 'No active goals created yet.')
              : (isUrdu ? 'کوئی آرکائیو شدہ ہدف نہیں ہے۔' : 'No archived goals.')
            }
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbf9f4', // exact ivory background
  },
  headerBanner: {
    backgroundColor: '#003629', // deep green
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 9,
    color: '#93f7bf',
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 26,
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#ffffff',
    margin: 20,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    elevation: 4,
    shadowColor: 'rgba(27, 77, 62, 0.1)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#003629',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1.5,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 10,
    color: '#003629',
    backgroundColor: '#fbf9f4',
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  formBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(0, 54, 41, 0.05)',
  },
  cancelBtnText: {
    color: '#003629',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#006c44',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: 'rgba(0, 54, 41, 0.04)',
    borderRadius: 20,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
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
    fontSize: 13,
    color: '#404945',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#006c44',
    fontWeight: '800',
  },
  activeGoalWrapper: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  activeGoalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    elevation: 3,
    shadowColor: 'rgba(27, 77, 62, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  goalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 108, 68, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  goalMetaBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#006c44',
  },
  goalMetaDate: {
    fontSize: 10,
    color: '#404945',
    opacity: 0.6,
    fontWeight: '600',
  },
  mainProgressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressInfo: {
    flex: 1,
    marginRight: 10,
  },
  arabicHeading: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'serif',
    fontSize: 24,
    color: '#003629',
    textAlign: 'left',
  },
  englishHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#003629',
    marginTop: 2,
  },
  translationHeading: {
    fontSize: 11,
    color: '#404945',
    opacity: 0.8,
    marginTop: 2,
  },
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 12,
  },
  countLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#404945',
    opacity: 0.6,
    letterSpacing: 0.5,
  },
  countValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#006c44',
  },
  targetValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#003629',
  },
  countDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0, 54, 41, 0.08)',
  },
  radialContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  radialTextOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radialPctText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#003629',
  },
  radialSubText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#006c44',
    textTransform: 'uppercase',
  },
  clickerWrapper: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  giantClicker: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(0, 108, 68, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 108, 68, 0.08)',
  },
  clickerRingOuter: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(0, 108, 68, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clickerRingInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#006c44',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#006c44',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  arabicTapLabel: {
    fontSize: 22,
  },
  clickerTapText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 4,
  },
  adjustmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  adjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 54, 41, 0.05)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 2,
  },
  adjustBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003629',
  },
  chartWrapper: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 54, 41, 0.06)',
    paddingTop: 16,
    marginTop: 16,
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#404945',
    opacity: 0.7,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
    paddingHorizontal: 8,
  },
  chartColumn: {
    alignItems: 'center',
    gap: 6,
  },
  barBg: {
    width: 16,
    backgroundColor: 'rgba(0, 54, 41, 0.03)',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: 16,
    backgroundColor: '#006c44',
    borderRadius: 8,
  },
  chartDayLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#404945',
    opacity: 0.6,
  },
  otherGoalsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#003629',
    marginBottom: 10,
  },
  miniGoalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  miniGoalTextInfo: {
    flex: 1,
  },
  miniGoalArabic: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'serif',
    fontSize: 18,
    color: '#003629',
  },
  miniGoalEnglish: {
    fontSize: 13,
    fontWeight: '800',
    color: '#006c44',
    marginTop: 1,
  },
  miniGoalCount: {
    fontSize: 10,
    color: '#404945',
    opacity: 0.6,
    marginTop: 2,
    fontWeight: '600',
  },
  miniGoalPercentageCircle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniGoalPctText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#006c44',
  },
  communityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    padding: 20,
    marginTop: 20,
    marginBottom: 40,
  },
  communityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  communitySubtitle: {
    fontSize: 8,
    fontWeight: '800',
    color: '#006c44',
    letterSpacing: 1.5,
  },
  communityTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#003629',
    marginTop: 2,
  },
  participantsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 108, 68, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  participantsText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#006c44',
  },
  communityStatsBox: {
    backgroundColor: 'rgba(0, 108, 68, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0, 108, 68, 0.06)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  globalCountValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#006c44',
    textAlign: 'center',
  },
  communityBarBg: {
    height: 8,
    backgroundColor: 'rgba(0, 108, 68, 0.06)',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  communityBarFill: {
    height: 8,
    backgroundColor: '#006c44',
    borderRadius: 4,
  },
  communityBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  communityBarLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#404945',
    opacity: 0.6,
  },
  contributorsWrapper: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 54, 41, 0.06)',
    paddingTop: 14,
    marginBottom: 14,
  },
  contributorsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003629',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contributorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 54, 41, 0.03)',
  },
  contributorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contributorRank: {
    fontSize: 10,
    fontWeight: '800',
    color: '#c8a74b',
  },
  contributorName: {
    fontSize: 12,
    color: '#003629',
    fontWeight: '700',
  },
  contributorCount: {
    fontSize: 12,
    color: '#006c44',
    fontWeight: '800',
  },
  feedWrapper: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 54, 41, 0.06)',
    paddingTop: 14,
  },
  feedHeading: {
    fontSize: 8,
    fontWeight: '800',
    color: '#404945',
    opacity: 0.7,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 6,
  },
  feedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#006c44',
  },
  feedText: {
    fontSize: 10,
    color: '#404945',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#404945',
    opacity: 0.6,
    fontWeight: '600',
  },
  sharedCirclesSection: {
    marginHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  sharedCirclesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sharedSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#003629',
  },
  sharedSectionSub: {
    fontSize: 10,
    color: '#707974',
    marginTop: 2,
    fontWeight: '600',
  },
  circleCreateBtn: {
    backgroundColor: 'rgba(0, 108, 68, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  circleCreateText: {
    color: '#006c44',
    fontSize: 11,
    fontWeight: '800',
  },
  circleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    elevation: 2,
    shadowColor: 'rgba(0, 54, 41, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  circleCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  circleTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#003629',
  },
  circleDhikrText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#006c44',
    marginTop: 2,
    fontWeight: '700',
  },
  circleMembersText: {
    fontSize: 9.5,
    color: '#707974',
    marginTop: 4,
    fontWeight: '600',
  },
  circlePctBox: {
    backgroundColor: 'rgba(0, 108, 68, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  circlePctText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#006c44',
  },
  circleBarBg: {
    height: 6,
    backgroundColor: 'rgba(0, 108, 68, 0.04)',
    borderRadius: 3,
    marginVertical: 12,
    overflow: 'hidden',
  },
  circleBarFill: {
    height: 6,
    backgroundColor: '#006c44',
    borderRadius: 3,
  },
  circleCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  circleCountLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#404945',
  },
  circleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  contributeBtn: {
    backgroundColor: '#006c44',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  contributeBtnText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '800',
  },
  circleModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    padding: 20,
    elevation: 8,
    shadowColor: '#003629',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  circleModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#003629',
    marginBottom: 16,
    textAlign: 'center',
  },
  circleInput: {
    borderWidth: 1.5,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 12.5,
    marginBottom: 10,
    color: '#003629',
    backgroundColor: '#fbf9f4',
    fontWeight: '600',
  },
  inviteLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003629',
    marginTop: 6,
    marginBottom: 8,
  },
  inviteeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 18,
  },
  inviteePill: {
    backgroundColor: '#fbf9f4',
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.06)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inviteePillActive: {
    backgroundColor: '#006c44',
    borderColor: '#006c44',
  },
  inviteePillText: {
    fontSize: 10.5,
    color: '#404945',
    fontWeight: '700',
  },
  inviteePillTextActive: {
    color: '#ffffff',
  },
  circleModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  circleCancel: {
    borderWidth: 1.5,
    borderColor: 'rgba(0, 54, 41, 0.06)',
  },
  circleCancelText: {
    color: '#003629',
    fontWeight: '700',
    fontSize: 12.5,
  },
  circleSave: {
    backgroundColor: '#006c44',
  },
  circleSaveText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12.5,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  circleToast: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(0, 54, 41, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'center',
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    zIndex: 9999,
  },
  circleToastText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
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
    zIndex: 9999,
  },
});

export default DhikrScreen;
