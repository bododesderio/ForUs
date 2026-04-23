import { View, Text, StyleSheet, ScrollView, Image, useWindowDimensions, TouchableOpacity, Linking, Alert, FlatList, Modal, Dimensions, ActivityIndicator } from 'react-native';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { router, useNavigation } from 'expo-router';
import { EventType } from '../../data/event-data';
import CarouselItem from '../../components/CarouselItem';
import EmptyEventsCarousel from '../../components/EmptyEventsCarousel';
import QuickActionsContent from '../../components/renderQuickActionsContent';
import CommunityFeedContent from '../../components/CommunityFeedContent';
import ModernTabButton from '../../components/ModernTabButton';
import { activities_data } from '../../data/activity-data';
import Activities from '../../components/Activities';
import CustomModal from '../../components/CustomModal';
import { data, DataType } from '../../data/card-data';
import { useUser } from '../../context/userContext';
import { useAuth } from '../../context/authContext';
import { getRecentActivities, getUserMood, setUserMood } from '../../services/api';

const { width: screenWidth } = Dimensions.get('window');

export enum CustomTab {
  QuickActions,
  CommunityFeed
}

type BackendActivity = {
  id: number;
  type: string;
  description: string;
  created_at: string;
};

const activityTypeToImage: Record<string, any> = {
  login: require('../../assets/icons/login.png'),
  appointment_create: require('../../assets/icons/appointment.png'),
  profile_update: require('../../assets/icons/profile.png'),
  event_create: require('../../assets/icons/event.png'),
  review_create: require('../../assets/icons/review.png'),
  default: require('../../assets/icons/default.png'),
};

const UPCOMING_EVENTS_KEY = 'upcomingEvents';

const saveUpcomingEvents = async (events: DataType[]) => {
  try {
    await AsyncStorage.setItem(UPCOMING_EVENTS_KEY, JSON.stringify(events));
  } catch (e) {
    // handle error
  }
};

const loadUpcomingEvents = async (): Promise<DataType[]> => {
  try {
    const json = await AsyncStorage.getItem(UPCOMING_EVENTS_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    return [];
  }
};

const MOOD_KEY = 'userMood';
const MOOD_DATE_KEY = 'userMoodDate';

const moodMessages = [
  'We all have tough days. Remember, you are not alone.', // 1
  'Hang in there. Better days are coming.', // 2
  'Take a deep breath. You are doing your best.', // 3
  'It’s okay to feel down sometimes. Be kind to yourself.', // 4
  'You are stronger than you think.', // 5
  'Keep going, you are making progress.', // 6
  'You’re doing well. Celebrate small wins.', // 7
  'Great job! Keep up the positive energy.', // 8
  'You’re shining bright today!', // 9
  'Amazing! Spread your positivity!', // 10
];

const getTodayString = () => new Date().toISOString().split('T')[0];

// Map mood value to emoji index
const getEmojiIndexForMood = (mood: number | null) => {
  if (!mood) return -1;
  if (mood <= 2) return 0;
  if (mood <= 4) return 1;
  if (mood <= 6) return 2;
  if (mood <= 8) return 3;
  return 4;
};

const moodEmojis = ['😢', '😐', '😊', '😄', '🤩'];

const Index = () => {
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<DataType>>(null);
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedTab, setSelectedTab] = useState(CustomTab.QuickActions);
  const [showEventModal, setShowEventModal] = useState<boolean>(false);
  const [upcomingEvents, setUpcomingEvents] = useState<DataType[]>([]);
  const [recentActivities, setRecentActivities] = useState<BackendActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [selectedMoodValue, setSelectedMoodValue] = useState<number | null>(null);
  const [moodMessage, setMoodMessage] = useState('');
  const navigation = useNavigation();
  const { loading, profile, isAuthenticated } = useUser();
  const { user } = useAuth();
  const { COLORS } = useTheme();

  const activities = useMemo(() => activities_data, []);

  useEffect(() => {
    if (isAuthenticated && !user && !loading) {
      profile();
    }
  }, [user, loading, profile, isAuthenticated]);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const data = await getRecentActivities();
        setRecentActivities(data);
      } catch (e) {
        setRecentActivities([]);
      } finally {
        setActivitiesLoading(false);
      }
    };
    if (user) fetchActivities();
  }, [user]);

  // Load upcoming events from AsyncStorage on mount
  useEffect(() => {
    const fetchEvents = async () => {
      const events = await loadUpcomingEvents();
      setUpcomingEvents(events);
    };
    fetchEvents();
  }, []);

  // Save upcoming events to AsyncStorage whenever they change
  useEffect(() => {
    saveUpcomingEvents(upcomingEvents);
  }, [upcomingEvents]);

  // Auto-scroll carousel
  useEffect(() => {
    if (upcomingEvents.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIndex = prev + 1 >= upcomingEvents.length ? 0 : prev + 1;
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        return nextIndex;
      });
    }, 6000); // Change 3000 to your desired interval in ms
    return () => clearInterval(interval);
  }, [upcomingEvents.length]);

  // Show mood modal on app open if not set for today (use backend)
  useEffect(() => {
    const checkMood = async () => {
      if (!user) return;
      const today = getTodayString();
      try {
        const res = await getUserMood(today);
        if (!res || typeof res.mood !== 'number') {
          setMoodModalVisible(true);
        } else {
          setSelectedMoodValue(res.mood);
          setMoodMessage(moodMessages[res.mood - 1]);
        }
      } catch (e) {
        setMoodModalVisible(true);
      }
    };
    checkMood();
  }, [user]);

  // Save mood selection (to backend)
  const handleMoodSelect = async (value: number) => {
    setSelectedMoodValue(value);
    setMoodMessage(moodMessages[value - 1]);
    setMoodModalVisible(false);
    try {
      await setUserMood(getTodayString(), value);
    } catch (e) {
      // Optionally show error
    }
  };

  const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textDark,
  },
  // Top Bar Styles
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  profileImg: {
    width: 50,
    height: 50,
    borderRadius: 50,
    borderWidth: 2.5,
    borderColor: COLORS.border,
  },
  profileInfo: {
    justifyContent: 'center',
  },
  homeGreeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  greeting: {
    color: COLORS.grey,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    justifyContent: 'flex-end',
    flex: 1,
  },
  notificationDot: {
    borderRadius: 8,
    width: 8,
    height: 8,
    backgroundColor: COLORS.primary,
    position: 'absolute',
    right: 2,
    top: 3,
    zIndex: 1,
  },
  // Mood Tracker Styles
  moodTracker: {
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  moodOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.lightGrey,
  },
  selectedMoodButton: {
    backgroundColor: COLORS.primaryLight || '#E6F0FA',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  moodEmoji: {
    fontSize: 24,
  },
  // Events Section Styles
  eventsSection: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  addButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight || '#E6F0FA',
  },
  // Carousel Styles
  carouselContainer: {
    paddingHorizontal: screenWidth * 0.1,
  },
  // Recent Activities Styles
  activitySection: {
    paddingHorizontal: 16,
    marginTop: 18,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityTitle: {
    fontSize: 25,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  activityScroll: {
    flexGrow: 0,
  },
  tabbedSection: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 20,
  },
  modernTabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 25,
    padding: 4,
    marginBottom: 24,
  },
  tabContent: {
    minHeight: 200,
  },
});

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Mood Modal */}
        <Modal
          visible={moodModalVisible}
          transparent
          animationType="slide"
        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <View style={{ backgroundColor: COLORS.background, borderRadius: 16, padding: 24, width: 320, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: COLORS.textDark }}>How are you feeling today?</Text>
              <Text style={{ color: COLORS.textSecondary, marginBottom: 20 }}>Slide to set your mood</Text>
              <View style={{ width: '100%', marginBottom: 20 }}>
                {/* Mood Bar Container */}
                <View style={{ 
                  width: '100%', 
                  height: 40, 
                  backgroundColor: COLORS.lightGrey,
                  borderRadius: 20,
                  overflow: 'hidden',
                  flexDirection: 'row',
                }}>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={{
                        flex: 1,
                        height: '100%',
                        backgroundColor: i < 2 ? '#FF6B6B' : 
                                       i < 4 ? '#FFD93D' :
                                       i < 6 ? '#6BCB77' :
                                       i < 8 ? '#4D96FF' :
                                       '#9B72AA',
                        opacity: selectedMoodValue && i < selectedMoodValue ? 1 : 0.3,
                      }}
                      onPress={() => handleMoodSelect(i + 1)}
                    />
                  ))}
                </View>
                
                {/* Labels */}
                <View style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between',
                  marginTop: 8,
                  paddingHorizontal: 4,
                }}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Not well</Text>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Very well</Text>
                </View>
                
                {/* Selected Value */}
                {selectedMoodValue && (
                  <Text style={{ 
                    textAlign: 'center', 
                    marginTop: 16, 
                    color: COLORS.textDark,
                    fontSize: 16,
                    fontWeight: '600',
                  }}>
                    {selectedMoodValue}/10
                  </Text>
                )}
              </View>
            </View>
          </View>
        </Modal>
        <ScrollView style={styles.container}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Image
              style={styles.profileImg}
              source={{
                uri: user?.profile_image || undefined,
              }}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.homeGreeting}>Hi, {user?.first_name} {user?.last_name}</Text>
              <Text style={styles.greeting}>How is your mental health</Text>
            </View>
            <View style={styles.rightIcons}> 
              {/* <TouchableOpacity onPress={() => router.push('(screens)/consultantSearch')}>
                <Ionicons name="search" size={24} color={COLORS.textDark} />
              </TouchableOpacity> */}
              <View>
                <View style={styles.notificationDot} />
                <Ionicons name="notifications-outline" size={24} color={COLORS.textDark} />
              </View>
            </View>
          </View>

          {/* Mood Tracker */}
          <View style={styles.moodTracker}>
            <Text style={styles.sectionTitle}>How are you feeling today?</Text>
            <View style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'center' }}>
              <TouchableOpacity
                style={[
                  styles.moodButton,
                  { 
                    width: 80, 
                    height: 80, 
                    borderRadius: 40, 
                    marginRight: 16, 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: COLORS.primaryLight || '#E6F0FA',
                    borderWidth: 2,
                    borderColor: COLORS.primary,
                  }
                ]}
                onPress={() => setMoodModalVisible(true)}
              >
                <Text style={{ fontSize: 48 }}>
                  {selectedMoodValue ? moodEmojis[getEmojiIndexForMood(selectedMoodValue)] : '😐'}
                </Text>
              </TouchableOpacity>
              
              <View style={{ flex: 1 }}>
                {selectedMoodValue ? (
                  <>
                    {/* Mood Bar Container */}
                    <View style={{ 
                      width: '100%', 
                      height: 24, 
                      backgroundColor: COLORS.lightGrey,
                      borderRadius: 12,
                      overflow: 'hidden',
                      flexDirection: 'row',
                      marginBottom: 8
                    }}>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <View
                          key={i}
                          style={{
                            flex: 1,
                            height: '100%',
                            backgroundColor: i < 2 ? '#FF6B6B' : 
                                           i < 4 ? '#FFD93D' :
                                           i < 6 ? '#6BCB77' :
                                           i < 8 ? '#4D96FF' :
                                           '#9B72AA',
                            opacity: i < selectedMoodValue ? 1 : 0.3,
                          }}
                        />
                      ))}
                    </View>
                    <Text style={{ color: COLORS.primary, fontSize: 15, marginBottom: 8 }}>
                      {moodMessage}
                    </Text>
                  </>
                ) : (
                  <Text style={{ color: COLORS.textSecondary, fontSize: 15, marginBottom: 8 }}>
                    Tap to set your mood for today
                  </Text>
                )}
                <TouchableOpacity
                  style={[styles.moodButton, { alignSelf: 'flex-start' }]}
                  onPress={() => setMoodModalVisible(true)}
                >
                  <Text style={{ color: COLORS.primary, fontWeight: '600' }}>
                    {selectedMoodValue ? 'Update Mood' : 'Set Mood'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Upcoming Events Carousel */}
          <View style={styles.eventsSection}>
            <View style={styles.eventsHeader}>
              <Text style={styles.eventText}>Upcoming Event</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => setShowEventModal(true)}
              >
                <Ionicons name="add" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            
            {upcomingEvents.length === 0 ? (
              <EmptyEventsCarousel /> 
            ) : (
              <FlatList
                ref={flatListRef}
                data={upcomingEvents}
                renderItem={({ item, index }) => <CarouselItem item={item} index={index} setUpcomingEvents={setUpcomingEvents} />}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={screenWidth}
                decelerationRate={"fast"}
                snapToAlignment={"center"}
                onMomentumScrollEnd={e => {
                  const newIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
                  setCurrentIndex(newIndex);
                }}
              />
            )}
          </View>

          {/* Recent Activities Section */}
          <View style={styles.activitySection}>
            <View style={styles.activityHeader}>
              <Text style={styles.activityTitle}>Recent Activities</Text>
            </View>
            {activitiesLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : recentActivities.length === 0 ? (
              <Text style={{ color: COLORS.textSecondary }}>No recent activities.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activityScroll}>
                {recentActivities.map((activity, index) => (
                  <Activities
                    key={activity.id || index}
                    activity={{
                      // Map backend activity to Activities component props
                      type: activity.type,
                      timestamp: new Date(activity.created_at).toLocaleString(),
                      image: activityTypeToImage[activity.type] || activityTypeToImage.default,
                    }}
                    index={index}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          {/* Modern Tabbed Section */}
          <View style={styles.tabbedSection}>
            <View style={styles.modernTabContainer}>
              <ModernTabButton
                title="Quick Actions"
                icon="flash"
                isActive={selectedTab === CustomTab.QuickActions}
                onPress={() => setSelectedTab(CustomTab.QuickActions)}
              />
              <ModernTabButton
                title="Community Feed"
                icon="people"
                isActive={selectedTab === CustomTab.CommunityFeed}
                onPress={() => setSelectedTab(CustomTab.CommunityFeed)}
              />
            </View>
            
            <View style={styles.tabContent}>
              {selectedTab === CustomTab.QuickActions ? (
                <QuickActionsContent />
              ) : (
                <CommunityFeedContent />
              )}
            </View>
          </View>

          <CustomModal 
          setShowEventModal={setShowEventModal} 
          setUpcomingEvents={setUpcomingEvents} 
          upcomingEvents={upcomingEvents} 
          showEventModal={showEventModal}
          />
          <StatusBar style="auto" />
        </ScrollView>
      </SafeAreaView>
  );
};

export default Index;