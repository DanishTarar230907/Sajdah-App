// src/screens/SocialHubScreen.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, Platform, Alert, ActivityIndicator } from 'react-native';
import { Users, MessageSquare, Flame, Search, Send, UserPlus, BellRing, Sparkles, Check, X } from 'lucide-react-native';
import { collection, query, orderBy, onSnapshot, doc, setDoc, addDoc, getDocs, where, limit } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSalahStore } from '../store/useSalahStore';
import { themes } from '../theme/colors';

export const SocialHubScreen: React.FC = () => {
  const { theme, language } = useUIStore();
  const { profile } = useAuthStore();
  const { dailyStreak } = useSalahStore();
  const activeTheme = themes[theme];
  const isUrdu = language === 'UR';

  const [activeSubTab, setActiveSubTab] = useState<'friends' | 'chat' | 'streaks'>('friends');
  
  // Real-time Firestore users list state
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Real-time pending received friend requests state
  const [friendRequestsList, setFriendRequestsList] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Chat window state
  const [activeChatFriend, setActiveChatFriend] = useState<any | null>(null);
  const [typedMessage, setTypedMessage] = useState('');
  const [chatMessagesList, setChatMessagesList] = useState<any[]>([]);
  const [typing, setTyping] = useState(false);

  // Subscribe to real-time accepted friendships in Firestore
  useEffect(() => {
    if (!auth.currentUser) return;
    const currentUid = auth.currentUser.uid;
    setLoadingUsers(true);

    const q = query(
      collection(db, 'friendRequests'),
      where('status', '==', 'accepted')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeFriends: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.senderId === currentUid || data.receiverId === currentUid) {
          const isSender = data.senderId === currentUid;
          activeFriends.push({
            id: isSender ? data.receiverId : data.senderId,
            name: isSender ? data.receiverName : data.senderName,
            email: isSender ? data.receiverEmail : data.senderEmail,
            streak: data.streak || 0,
            status: 'online',
            activeAgo: 'Active'
          });
        }
      });
      setFriendsList(activeFriends);
      setLoadingUsers(false);
    }, (error) => {
      console.log("Error listening to accepted friends:", error);
      setLoadingUsers(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to real-time pending received friend requests
  useEffect(() => {
    if (!auth.currentUser) return;
    const currentUid = auth.currentUser.uid;
    setLoadingRequests(true);

    const q = query(
      collection(db, 'friendRequests'),
      where('receiverId', '==', currentUid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        requests.push({
          docId: docSnap.id,
          ...data
        });
      });
      setFriendRequestsList(requests);
      setLoadingRequests(false);
    }, (error) => {
      console.log("Error listening to friend requests:", error);
      setLoadingRequests(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to real-time chat messages between current user and active friend
  useEffect(() => {
    if (!activeChatFriend || !auth.currentUser) {
      setChatMessagesList([]);
      return;
    }

    const currentUid = auth.currentUser.uid;
    const friendUid = activeChatFriend.id;
    // Consistent sorted document ID for the private chat
    const chatId = [currentUid, friendUid].sort().join('_');

    const messagesRef = collection(db, 'chats', `chat_${chatId}`, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        msgs.push({
          sender: data.senderId === currentUid ? 'me' : 'them',
          text: data.text || '',
          time: data.time || '10:00 AM'
        });
      });
      setChatMessagesList(msgs);
    }, (error) => {
      console.log("Error listening to chat messages:", error);
    });

    return () => unsubscribe();
  }, [activeChatFriend]);

  // Friend Request Action Handlers
  const handleAcceptFriendRequest = async (docId: string, senderName: string) => {
    try {
      const reqRef = doc(db, 'friendRequests', docId);
      await setDoc(reqRef, { status: 'accepted' }, { merge: true });
      Alert.alert(
        isUrdu ? "درخواست منظور ہو گئی! 🎉" : "Friend Connected! 🎉",
        isUrdu 
          ? `آپ اب ${senderName} کے ساتھ جڑ چکے ہیں۔` 
          : `You are now connected with ${senderName}! Feel free to chat.`
      );
    } catch (err) {
      console.log("Error accepting friend request:", err);
    }
  };

  const handleDeclineFriendRequest = async (docId: string, senderName: string) => {
    try {
      const reqRef = doc(db, 'friendRequests', docId);
      await setDoc(reqRef, { status: 'declined' }, { merge: true });
      Alert.alert(
        isUrdu ? "درخواست مسترد" : "Friend Request Declined",
        isUrdu 
          ? `آپ نے ${senderName} کی درخواست مسترد کر دی ہے۔` 
          : `You have declined the request from ${senderName}.`
      );
    } catch (err) {
      console.log("Error declining friend request:", err);
    }
  };

  // Search & add real-time registered friend in Firestore
  const handleAddFriend = () => {
    Alert.prompt(
      isUrdu ? "نیا دوست تلاش کریں" : "Search Ummah Friend",
      isUrdu ? "دوست کا ای میل درج کریں:" : "Enter your friend's exact Gmail ID to search:",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Search", 
          onPress: async (text?: string) => {
            if (text && text.trim().length > 2) {
              const searchEmail = text.trim().toLowerCase();
              if (searchEmail === auth.currentUser?.email) {
                Alert.alert(
                  isUrdu ? "غلطی" : "Invalid Action",
                  isUrdu ? "آپ اپنے آپ کو دوست کے طور پر شامل نہیں کر سکتے۔" : "You cannot send a friend request to yourself!"
                );
                return;
              }
              try {
                const q = query(collection(db, 'users'), where('email', '==', searchEmail));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                  const friendDoc = querySnapshot.docs[0].data();
                  
                  // Ask if they want to send a friend request
                  Alert.alert(
                    isUrdu ? "صارف مل گیا! 🌟" : "User Found! 🌟",
                    isUrdu 
                      ? `کیا آپ ${friendDoc.name} کو دوست کی درخواست بھیجنا چاہتے ہیں؟` 
                      : `Would you like to send a friend request to ${friendDoc.name} (${friendDoc.email})?`,
                    [
                      { text: "No", style: "cancel" },
                      {
                        text: "Yes, Send",
                        onPress: async () => {
                          const currentUid = auth.currentUser?.uid;
                          if (!currentUid) return;

                          // Check if a request already exists
                          const qExist = query(
                            collection(db, 'friendRequests'),
                            where('senderId', 'in', [currentUid, friendDoc.uid]),
                            where('receiverId', 'in', [currentUid, friendDoc.uid])
                          );
                          const existSnapshot = await getDocs(qExist);
                          if (!existSnapshot.empty) {
                            const existingReq = existSnapshot.docs[0].data();
                            const docId = existSnapshot.docs[0].id;
                            if (existingReq.status === 'accepted') {
                              Alert.alert("Already Connected", `You are already friends with ${friendDoc.name}!`);
                            } else if (existingReq.status === 'pending') {
                              Alert.alert("Request Pending", `A friend request with ${friendDoc.name} is already pending.`);
                            } else {
                              // If previously declined, let's reopen it
                              await setDoc(doc(db, 'friendRequests', docId), {
                                status: 'pending',
                                senderId: currentUid,
                                senderName: profile?.name || auth.currentUser?.displayName || 'Ummah Brother',
                                senderEmail: auth.currentUser?.email,
                                receiverId: friendDoc.uid,
                                receiverName: friendDoc.name,
                                receiverEmail: friendDoc.email,
                                createdAt: new Date().toISOString()
                              }, { merge: true });
                              Alert.alert("Success", `Sent a new friend request to ${friendDoc.name}!`);
                            }
                          } else {
                            // Create new request
                            await addDoc(collection(db, 'friendRequests'), {
                              senderId: currentUid,
                              senderName: profile?.name || auth.currentUser?.displayName || 'Ummah Brother',
                              senderEmail: auth.currentUser?.email,
                              receiverId: friendDoc.uid,
                              receiverName: friendDoc.name,
                              receiverEmail: friendDoc.email,
                              status: 'pending',
                              createdAt: new Date().toISOString()
                            });
                            Alert.alert("Success", `Friend request successfully sent to ${friendDoc.name}!`);
                          }
                        }
                      }
                    ]
                  );
                } else {
                  Alert.alert(
                    isUrdu ? "صارف نہیں ملا" : "User Not Found",
                    isUrdu ? "یہ ای میل سجدہ ایپ پر رجسٹرڈ نہیں ہے۔" : "No user with this Gmail ID is registered in the Sajdah app yet."
                  );
                }
              } catch (err) {
                console.log("Error searching friend:", err);
              }
            }
          } 
        }
      ],
      "plain-text"
    );
  };

  // Send message to Firestore real-time sub-collection
  const handleSendMessage = async () => {
    if (!typedMessage.trim() || !activeChatFriend || !auth.currentUser) return;
    const currentUid = auth.currentUser.uid;
    const friendUid = activeChatFriend.id;
    const chatId = [currentUid, friendUid].sort().join('_');
    const msgText = typedMessage.trim();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setTypedMessage('');

    try {
      const messagesRef = collection(db, 'chats', `chat_${chatId}`, 'messages');
      await addDoc(messagesRef, {
        senderId: currentUid,
        receiverId: friendUid,
        text: msgText,
        time: nowTime,
        createdAt: new Date().toISOString()
      });

      // Update primary chat document metadata
      await setDoc(doc(db, 'chats', `chat_${chatId}`), {
        lastMessage: msgText,
        lastMessageTime: nowTime,
        lastMessageAt: new Date().toISOString(),
        participants: [currentUid, friendUid]
      }, { merge: true });

    } catch (err) {
      console.log("Error sending message to Firestore:", err);
    }
  };

  // Leaderboard ranking dynamic calculation from Firestore users
  const getLeaderboard = () => {
    const list = [...friendsList];
    const hasMe = list.some(u => u.id === auth.currentUser?.uid);
    if (!hasMe && auth.currentUser) {
      list.push({
        id: auth.currentUser.uid,
        name: profile?.name || auth.currentUser.displayName || 'You',
        email: auth.currentUser.email || 'you@sajdah.com',
        streak: dailyStreak || 7,
        status: 'online',
        activeAgo: 'Active'
      });
    }
    return list.sort((a, b) => b.streak - a.streak);
  };

  // Support Nudge Trigger
  const handleNudgeFriend = (friendName: string) => {
    Alert.alert(
      isUrdu ? "روحانی یاد دہانی" : "Spiritual Nudge Sent! 🔔",
      isUrdu 
        ? `آپ نے ${friendName} کو نماز کی یاد دہانی بھیجی ہے۔` 
        : `Sent a supportive nudge to ${friendName}: "Assalamu Alaikum! Don't forget your next prayer streak. Let's stand in prayer together!"`
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      {/* Premium Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>{isUrdu ? 'امت نیٹ ورک' : 'UMMAH CONNECT'}</Text>
          <Text style={styles.headerTitle}>{isUrdu ? 'سماجی مرکز' : 'Social Hub'}</Text>
        </View>
        <TouchableOpacity 
          style={styles.addFriendTopBtn}
          onPress={handleAddFriend}
          activeOpacity={0.8}
        >
          <UserPlus size={16} color="#FFFFFF" />
          <Text style={styles.addFriendTopText}>{isUrdu ? 'دوست تلاش کریں' : 'Find Friend'}</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.subTabRow}>
        {(['friends', 'chat', 'streaks'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.subTab, activeSubTab === tab && styles.subTabActive]}
            onPress={() => setActiveSubTab(tab)}
          >
            {tab === 'friends' && <Users size={14} color={activeSubTab === tab ? '#006c44' : '#707974'} />}
            {tab === 'chat' && <MessageSquare size={14} color={activeSubTab === tab ? '#006c44' : '#707974'} />}
            {tab === 'streaks' && <Flame size={14} color={activeSubTab === tab ? '#006c44' : '#707974'} />}
            <Text style={[styles.subTabText, activeSubTab === tab && styles.subTabTextActive]}>
              {tab === 'friends' ? (isUrdu ? 'دوست' : 'Friends') : tab === 'chat' ? (isUrdu ? 'چیٹ' : 'Chats') : (isUrdu ? 'اسٹریک' : 'Streaks')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeSubTab === 'friends' && (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          {/* Search bar */}
          <View style={styles.searchWrapper}>
            <Search size={16} color="#707974" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={isUrdu ? 'دوست تلاش کریں...' : 'Search by name or email...'}
              placeholderTextColor="#707974"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Pending Friend Requests Feed */}
          {friendRequestsList.length > 0 && (
            <View style={styles.requestsSection}>
              <Text style={styles.requestsSectionHeading}>
                {isUrdu ? 'زیر التواء دوست کی درخواستیں' : 'PENDING FRIEND REQUESTS'}
              </Text>
              {friendRequestsList.map((req) => (
                <View key={req.docId} style={styles.requestCard}>
                  <View style={styles.requestCardLeft}>
                    <View style={[styles.avatarCircle, { width: 34, height: 34 }]}>
                      <Text style={[styles.avatarText, { fontSize: 13 }]}>{req.senderName[0]}</Text>
                    </View>
                    <View style={{ marginLeft: 8 }}>
                      <Text style={styles.requestName}>{req.senderName}</Text>
                      <Text style={styles.requestEmail}>{req.senderEmail}</Text>
                    </View>
                  </View>
                  <View style={styles.requestCardRight}>
                    <TouchableOpacity
                      style={[styles.actionRequestBtn, { backgroundColor: '#006c44' }]}
                      onPress={() => handleAcceptFriendRequest(req.docId, req.senderName)}
                      activeOpacity={0.8}
                    >
                      <Check size={12} color="#FFFFFF" />
                      <Text style={styles.actionRequestText}>{isUrdu ? 'قبول' : 'Accept'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionRequestBtn, { backgroundColor: '#ea4335' }]}
                      onPress={() => handleDeclineFriendRequest(req.docId, req.senderName)}
                      activeOpacity={0.8}
                    >
                      <X size={12} color="#FFFFFF" />
                      <Text style={styles.actionRequestText}>{isUrdu ? 'مسترد' : 'Decline'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {loadingUsers ? (
            <ActivityIndicator size="large" color="#006c44" style={{ marginTop: 24 }} />
          ) : (
            /* Friends List cards */
            <View style={styles.friendsListWrapper}>
              {friendsList.length === 0 ? (
                <Text style={styles.noDataText}>
                  {isUrdu ? 'نیٹ ورک میں کوئی دوست نہیں ملا۔' : 'No registered users found in the network yet.'}
                </Text>
              ) : (
                friendsList
                  .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.email.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(f => (
                    <View key={f.id} style={styles.friendCard}>
                      <View style={styles.friendCardLeft}>
                        <View style={styles.avatarCircle}>
                          <Text style={styles.avatarText}>{f.name[0]}</Text>
                          <View style={[styles.statusDot, { backgroundColor: f.status === 'online' ? '#93f7bf' : '#c0c9c3' }]} />
                        </View>
                        <View>
                          <Text style={styles.friendName}>{f.name}</Text>
                          <Text style={styles.friendEmail}>{f.email}</Text>
                        </View>
                      </View>
                      <View style={styles.friendCardRight}>
                        <View style={styles.streakBadge}>
                          <Flame size={12} color="#ea4335" />
                          <Text style={styles.streakText}>{f.streak}d</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.chatActionBtn}
                          onPress={() => {
                            setActiveChatFriend(f);
                          }}
                          activeOpacity={0.8}
                        >
                          <MessageSquare size={12} color="#006c44" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {activeSubTab === 'chat' && (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionHeading}>{isUrdu ? 'حالیہ گفتگو' : 'ACTIVE CONVERSATIONS'}</Text>
          
          {loadingUsers ? (
            <ActivityIndicator size="large" color="#006c44" style={{ marginTop: 24 }} />
          ) : (
            <View style={styles.chatListWrapper}>
              {friendsList.length === 0 ? (
                <Text style={styles.noDataText}>
                  {isUrdu ? 'حالیہ گفتگو شروع کرنے کے لیے کوئی صارف نہیں ملے۔' : 'No users found to chat with yet.'}
                </Text>
              ) : (
                friendsList.map(f => (
                  <TouchableOpacity
                    key={f.id}
                    style={styles.chatRowCard}
                    onPress={() => setActiveChatFriend(f)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{f.name[0]}</Text>
                      <View style={[styles.statusDot, { backgroundColor: f.status === 'online' ? '#93f7bf' : '#c0c9c3' }]} />
                    </View>
                    <View style={styles.chatRowMiddle}>
                      <Text style={styles.chatRowName}>{f.name}</Text>
                      <Text style={styles.chatRowMsg} numberOfLines={1}>
                        {isUrdu ? 'رابطہ قائم کرنے کے لیے ٹیپ کریں...' : 'Tap to converse in real-time...'}
                      </Text>
                    </View>
                    <ChevronTextIcon active={f.status === 'online'} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {activeSubTab === 'streaks' && (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          <View style={styles.streaksDashboardHeader}>
            <Sparkles size={16} color="#c8a74b" />
            <Text style={styles.streaksHeading}>{isUrdu ? 'نماز مقابلہ چیمپئنز' : 'SPIRITUAL COMPETITION LEADERBOARD'}</Text>
          </View>

          {/* Comparative Fire Streaks */}
          <View style={styles.leaderboardWrapper}>
            {getLeaderboard().map((member, idx) => {
              const isUser = member.id === auth.currentUser?.uid;
              return (
                <View key={member.id} style={[styles.leaderboardRow, isUser && styles.userLeaderboardRow]}>
                  <View style={styles.leaderRowLeft}>
                    <Text style={[styles.rankNumber, idx === 0 && { color: '#c8a74b' }]}>#{idx + 1}</Text>
                    <View style={[styles.avatarCircle, { width: 32, height: 32 }]}>
                      <Text style={[styles.avatarText, { fontSize: 13 }]}>{member.name[0]}</Text>
                    </View>
                    <View>
                      <Text style={[styles.leaderName, isUser && { fontWeight: '900', color: '#006c44' }]}>
                        {member.name} {isUser && `(${isUrdu ? 'آپ' : 'You'})`}
                      </Text>
                      <Text style={styles.leaderStatus}>{member.activeAgo}</Text>
                    </View>
                  </View>

                  <View style={styles.leaderRowRight}>
                    <View style={styles.fireStreakContainer}>
                      <Flame size={14} color="#ea4335" />
                      <Text style={styles.fireStreakText}>{member.streak} {isUrdu ? 'دن' : 'days'}</Text>
                    </View>

                    {member.status === 'offline' && (
                      <TouchableOpacity 
                        style={styles.nudgeBtn}
                        onPress={() => handleNudgeFriend(member.name)}
                        activeOpacity={0.8}
                      >
                        <BellRing size={12} color="#006c44" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* FULL SCREEN CHAT OVERLAY WINDOW */}
      {activeChatFriend && (
        <View style={styles.chatOverlayBackdrop}>
          <View style={styles.chatOverlayCard}>
            <View style={styles.chatOverlayHeader}>
              <TouchableOpacity onPress={() => setActiveChatFriend(null)} style={styles.backBtn}>
                <Text style={styles.backBtnText}>✕</Text>
              </TouchableOpacity>
              <View style={styles.chatHeaderMiddle}>
                <Text style={styles.chatHeaderName}>{activeChatFriend.name}</Text>
                <Text style={styles.chatHeaderStatus}>
                  {activeChatFriend.status === 'online' ? (isUrdu ? 'آن لائن' : 'online') : (isUrdu ? 'آف لائن' : 'offline')}
                </Text>
              </View>
              <View style={[styles.statusDotHeader, { backgroundColor: activeChatFriend.status === 'online' ? '#93f7bf' : '#c0c9c3' }]} />
            </View>

            {/* Conversation message feed list */}
            <FlatList
              data={chatMessagesList}
              keyExtractor={(_, index) => index.toString()}
              contentContainerStyle={styles.messageFeedList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isMe = item.sender === 'me';
                return (
                  <View style={[styles.bubbleWrapper, isMe ? styles.myBubbleWrapper : styles.theirBubbleWrapper]}>
                    <View style={[styles.msgBubble, isMe ? styles.myMsgBubble : styles.theirMsgBubble]}>
                      <Text style={[styles.bubbleText, isMe ? styles.myBubbleText : styles.theirBubbleText]}>{item.text}</Text>
                      <Text style={styles.bubbleTime}>{item.time}</Text>
                    </View>
                  </View>
                );
              }}
              ListFooterComponent={
                typing ? (
                  <View style={styles.typingRow}>
                    <ActivityIndicator size="small" color="#006c44" />
                    <Text style={styles.typingText}>{activeChatFriend.name} {isUrdu ? 'ٹائپ کر رہے ہیں...' : 'is typing...'}</Text>
                  </View>
                ) : null
              }
            />

            {/* Input Message panel */}
            <View style={styles.inputPanelRow}>
              <TextInput
                style={styles.chatInput}
                placeholder={isUrdu ? 'اپنا پیغام لکھیں...' : 'Type your message...'}
                placeholderTextColor="#707974"
                value={typedMessage}
                onChangeText={setTypedMessage}
              />
              <TouchableOpacity 
                style={styles.sendBtn}
                onPress={handleSendMessage}
                activeOpacity={0.8}
              >
                <Send size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const ChevronTextIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <View style={styles.chevronBox}>
    <View style={[styles.activeDotLabel, { backgroundColor: active ? '#006c44' : '#c0c9c3' }]} />
    <Text style={styles.chevronText}>→</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#1b4d3e', // primary container/sage green
    paddingTop: Platform.OS === 'ios' ? 65 : 45,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerSubtitle: {
    fontSize: 9,
    color: '#93f7bf',
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 2,
  },
  addFriendTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  addFriendTopText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  subTabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 54, 41, 0.04)',
    borderRadius: 16,
    padding: 4,
    marginHorizontal: 20,
    marginVertical: 14,
  },
  subTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 4,
  },
  subTabActive: {
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: 'rgba(0, 54, 41, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  subTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#707974',
  },
  subTabTextActive: {
    color: '#006c44',
    fontWeight: '800',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.06)',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#003629',
    fontWeight: '600',
  },
  friendsListWrapper: {
    gap: 10,
    paddingBottom: 24,
  },
  friendCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.04)',
  },
  friendCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#006c44',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  friendName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#003629',
  },
  friendEmail: {
    fontSize: 10,
    color: '#707974',
    marginTop: 1,
    fontWeight: '600',
  },
  friendCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 67, 53, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 2,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea4335',
  },
  chatActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 108, 68, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeading: {
    fontSize: 9,
    fontWeight: '800',
    color: '#404945',
    opacity: 0.7,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  chatListWrapper: {
    gap: 10,
    paddingBottom: 24,
  },
  chatRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.04)',
  },
  chatRowMiddle: {
    flex: 1,
    marginLeft: 12,
  },
  chatRowName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#003629',
  },
  chatRowMsg: {
    fontSize: 11,
    color: '#707974',
    marginTop: 2,
    fontWeight: '600',
  },
  chevronBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDotLabel: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chevronText: {
    fontSize: 14,
    color: '#707974',
    fontWeight: '700',
  },
  streaksDashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  streaksHeading: {
    fontSize: 9,
    fontWeight: '800',
    color: '#003629',
    letterSpacing: 1,
  },
  leaderboardWrapper: {
    gap: 10,
    paddingBottom: 24,
  },
  leaderboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.04)',
  },
  userLeaderboardRow: {
    borderColor: '#006c44',
    borderWidth: 1.5,
    backgroundColor: 'rgba(0, 108, 68, 0.02)',
  },
  leaderRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankNumber: {
    fontSize: 11,
    fontWeight: '900',
    color: '#707974',
    width: 24,
    textAlign: 'center',
  },
  leaderName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#003629',
  },
  leaderStatus: {
    fontSize: 9.5,
    color: '#707974',
    marginTop: 1,
    fontWeight: '600',
  },
  leaderRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fireStreakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 67, 53, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 2,
  },
  fireStreakText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea4335',
  },
  nudgeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 108, 68, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatOverlayBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 54, 41, 0.45)',
    zIndex: 9999,
    justifyContent: 'flex-end',
  },
  chatOverlayCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '85%',
    width: '100%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  chatOverlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f3f1',
    padding: 16,
    backgroundColor: '#fbf9f4',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  backBtnText: {
    fontSize: 16,
    color: '#707974',
    fontWeight: '800',
  },
  chatHeaderMiddle: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#003629',
  },
  chatHeaderStatus: {
    fontSize: 10,
    color: '#006c44',
    fontWeight: '700',
    marginTop: 1,
  },
  statusDotHeader: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  messageFeedList: {
    padding: 16,
    gap: 12,
  },
  bubbleWrapper: {
    flexDirection: 'row',
    width: '100%',
  },
  myBubbleWrapper: {
    justifyContent: 'flex-end',
  },
  theirBubbleWrapper: {
    justifyContent: 'flex-start',
  },
  msgBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '75%',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  myMsgBubble: {
    backgroundColor: '#006c44',
    borderBottomRightRadius: 2,
  },
  theirMsgBubble: {
    backgroundColor: '#fbf9f4',
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    borderBottomLeftRadius: 2,
  },
  bubbleText: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
  },
  myBubbleText: {
    color: '#ffffff',
  },
  theirBubbleText: {
    color: '#003629',
  },
  bubbleTime: {
    fontSize: 8.5,
    color: '#707974',
    marginTop: 4,
    textAlign: 'right',
    opacity: 0.7,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    marginTop: 4,
  },
  typingText: {
    fontSize: 11,
    color: '#707974',
    fontStyle: 'italic',
    fontWeight: '600',
  },
  inputPanelRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f3f1',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
  },
  chatInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#fbf9f4',
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.05)',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 12.5,
    color: '#003629',
    fontWeight: '600',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#006c44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    textAlign: 'center',
    color: '#707974',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 30,
    fontStyle: 'italic',
  },
  requestsSection: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
    padding: 14,
    backgroundColor: 'rgba(0, 108, 68, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 108, 68, 0.1)',
  },
  requestsSectionHeading: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#006c44',
    letterSpacing: 1,
    marginBottom: 10,
  },
  requestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 54, 41, 0.04)',
  },
  requestCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requestName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#003629',
  },
  requestEmail: {
    fontSize: 9.5,
    color: '#707974',
    fontWeight: '600',
  },
  actionRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  actionRequestText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
