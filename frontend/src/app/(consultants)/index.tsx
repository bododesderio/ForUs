import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { fetchResources } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

import { useAuth } from '../../context/authContext';
import { getConsultantAppointments, getConsultantReviewsPaginated } from '../../services/api';
import { convertToLocalDate, formatTime } from '../../helper/convertDateTime';
import truncateWords from '../../helper/truncateWords';

const { width: screenWidth } = Dimensions.get('window');

// Add types for user, appointment, review, and review stats
interface User {
  id: string | number;
  first_name?: string;
  last_name?: string;
  profile_image?: string;
  [key: string]: any;
}

interface Appointment {
  id: string | number;
  user_name?: string;
  profile_image?: string;
  mood?: number;
  condition?: string;
  date?: string;
  time?: string;
  status?: string;
  [key: string]: any;
}

interface Review {
  id: string | number;
  user_name?: string;
  user_profile_image?: string;
  rating: number;
  review_text?: string;
  created_at: string;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { stars: number; count: number }[];
}

const tabsData = [
  { id: 'overview', title: 'Overview', icon: 'grid-outline' },
  { id: 'mood', title: 'Mood Tracker', icon: 'happy-outline' },
  { id: 'resources', title: 'Resources', icon: 'library-outline' },
  { id: 'reviews', title: 'Reviews', icon: 'star-outline' },
  { id: 'reports', title: 'Reports', icon: 'document-text-outline' }
];

// Resource type for backend resource objects
interface Resource {
  id: number;
  title: string;
  description: string;
  type: string;
  file_url: string;
  preview_image_url?: string;
  [key: string]: any;
}

const ConsultantAdminHome = () => {
  const { user }: { user?: User } = useAuth() as { user?: User };
  const { COLORS, mode } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const flatListRef = useRef<FlatList<Appointment>>(null);
  const [confirmedAppointments, setConfirmedAppointments] = useState<Appointment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({ averageRating: 0, totalReviews: 0, ratingDistribution: [] });
  const [moodDistribution, setMoodDistribution] = useState([
    { mood: "Excellent", count: 0, color: "#4CAF50", icon: "happy-outline" },
    { mood: "Good", count: 0, color: "#8BC34A", icon: "checkmark-circle-outline" },
    { mood: "Neutral", count: 0, color: "#FFC107", icon: "remove-circle-outline" },
    { mood: "Poor", count: 0, color: "#FF9800", icon: "sad-outline" },
    { mood: "Critical", count: 0, color: "#F44336", icon: "alert-circle-outline" }
  ]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesError, setResourcesError] = useState(null);
  // Add state for mood trends
  const [moodTrends, setMoodTrends] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });

  const statusBarStyle = mode === 'dark' || COLORS.background === '#000' ? 'light' : 'dark';

  useEffect(() => {
    const loadResources = async () => {
      setResourcesLoading(true);
      setResourcesError(null);
      try {
        const data = await fetchResources();
        console.log('Fetched resources:', data);
        setResources(data.resources || []);
      } catch (err) {
        console.log('Resource fetch error:', err);
        setResourcesError('Failed to load resources.');
      } finally {
        setResourcesLoading(false);
      }
    };
    loadResources();
  }, []);

  useEffect(() => {
    const fetchConfirmedAppointments = async () => {
      if (!user?.id) return;
      try {
        const filters = { status: 'confirmed', limit: 10 };
        const result = await getConsultantAppointments(user.id, filters);
        if (result.success && result.appointments) {
          setConfirmedAppointments(result.appointments);
        } else {
          setConfirmedAppointments([]);
        }
      } catch (e) {
        setConfirmedAppointments([]);
      }
    };
    fetchConfirmedAppointments();
  }, [user?.id]);

  // Auto-scroll carousel
  useEffect(() => {
    if (confirmedAppointments.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIndex = prev + 1 >= confirmedAppointments.length ? 0 : prev + 1;
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        return nextIndex;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [confirmedAppointments]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user?.id) return;
      try {
        const result = await getConsultantReviewsPaginated(user.id, 1, 10, 'created_at', 'DESC');
        if (result.success && result.reviews) {
          setReviews(result.reviews);
          // Calculate stats
          const totalReviews = result.pagination?.total || result.reviews.length;
          const averageRating = result.reviews.length
            ? result.reviews.reduce((sum: number, r: Review) => sum + (r.rating || 0), 0) / result.reviews.length
            : 0;
          // Distribution: count of each star (1-5)
          const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
            stars: star,
            count: result.reviews.filter((r: Review) => r.rating === star).length
          }));
          setReviewStats({ averageRating, totalReviews, ratingDistribution });
        } else {
          setReviews([]);
          setReviewStats({ averageRating: 0, totalReviews: 0, ratingDistribution: [] });
        }
      } catch (e) {
        setReviews([]);
        setReviewStats({ averageRating: 0, totalReviews: 0, ratingDistribution: [] });
      }
    };
    fetchReviews();
  }, [user?.id]);

  useEffect(() => {
    const fetchMoodDistribution = async () => {
      if (!user?.id) return;
      try {
        // Fetch all confirmed appointments (limit high for summary)
        const filters = { status: 'confirmed', limit: 100 };
        const result = await getConsultantAppointments(user.id, filters);
        if (result.success && result.appointments) {
          // Aggregate moods
          const moods = result.appointments.map((apt: any) => apt.mood).filter((m: any) => typeof m === 'number');
          // Map moods to buckets
          const buckets = [
            { mood: "Excellent", count: 0, color: "#4CAF50", icon: "happy-outline", range: [9, 10] },
            { mood: "Good", count: 0, color: "#8BC34A", icon: "checkmark-circle-outline", range: [7, 8] },
            { mood: "Neutral", count: 0, color: "#FFC107", icon: "remove-circle-outline", range: [5, 6] },
            { mood: "Poor", count: 0, color: "#FF9800", icon: "sad-outline", range: [3, 4] },
            { mood: "Critical", count: 0, color: "#F44336", icon: "alert-circle-outline", range: [1, 2] }
          ];
          moods.forEach((m: number) => {
            if (m >= 9) buckets[0].count++;
            else if (m >= 7) buckets[1].count++;
            else if (m >= 5) buckets[2].count++;
            else if (m >= 3) buckets[3].count++;
            else if (m >= 1) buckets[4].count++;
          });
          setMoodDistribution(buckets.map(({ range, ...rest }) => rest));
        } else {
          setMoodDistribution(moodDistribution.map(md => ({ ...md, count: 0 })));
        }
      } catch (e) {
        setMoodDistribution(moodDistribution.map(md => ({ ...md, count: 0 })));
      }
    };
    fetchMoodDistribution();
  }, [user?.id]);

  // Helper: Aggregate average mood per week
  function getMoodTrends(appointments: Appointment[], period: 'week' | 'month' = 'week') {
    if (!appointments || appointments.length === 0) return { labels: [], data: [] };
    // Group by week or month
    const groups: { [key: string]: { sum: number; count: number } } = {};
    appointments.forEach((apt) => {
      if (typeof apt.mood !== 'number' || !apt.appointment_datetime) return;
      const date = new Date(apt.appointment_datetime);
      let key = '';
      if (period === 'week') {
        // Get year-week string
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `${date.getFullYear()}-W${week}`;
      } else {
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      }
      if (!groups[key]) groups[key] = { sum: 0, count: 0 };
      groups[key].sum += apt.mood;
      groups[key].count++;
    });
    // Sort keys
    const sortedKeys = Object.keys(groups).sort();
    return {
      labels: sortedKeys,
      data: sortedKeys.map((k) => groups[k].count ? parseFloat((groups[k].sum / groups[k].count).toFixed(2)) : 0),
    };
  }

  // Update mood trends when confirmedAppointments change
  useEffect(() => {
    setMoodTrends(getMoodTrends(confirmedAppointments, 'week'));
  }, [confirmedAppointments]);

  // Export moods as CSV
  const handleExportMoodCSV = async () => {
    if (!confirmedAppointments.length) return;
    let csv = 'Date,Patient,Mood\n';
    confirmedAppointments.forEach((apt) => {
      const date = apt.appointment_datetime ? new Date(apt.appointment_datetime).toLocaleDateString() : '';
      csv += `${date},${apt.user_name || ''},${apt.mood ?? ''}\n`;
    });
    const fileUri = FileSystem.cacheDirectory + 'mood_data.csv';
    await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export Mood Data' });
  };

  const handleNotificationPress = () => {
    router.push('/(screens)/consultants/notificationScreen')
  }

  const handleChatPress = (appointment: Appointment) => {
    console.log('Starting chat with:', appointment.user_name);
  };
  const handleViewAllReviews = () => {
    router.push('/(screens)/allReviews');
  };
  const renderAppointmentCard = ({ item }: { item: Appointment }) => (
    <View style={styles.appointmentCarouselCard}>
      <View style={styles.cardHeader}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {item.status === 'confirmed' ? 'CONFIRMED' : 'PENDING'}
          </Text>
        </View>
        <View style={styles.moodIndicator}>
          <Ionicons
            name={((item.mood ?? 0) >= 7 ? "happy" : (item.mood ?? 0) >= 5 ? "happy-outline" : "sad-outline") as any}
            size={16}
            color={(item.mood ?? 0) >= 7 ? "#4CAF50" : (item.mood ?? 0) >= 5 ? "#FFC107" : "#F44336"}
          />
          <Text style={styles.moodText}>{item.mood !== undefined ? item.mood : '-'} /10</Text>
        </View>
      </View>

      <View style={styles.patientSection}>
        <Image source={{ uri: item.profile_image }} style={styles.patientAvatar} />
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{item.user_name}</Text>
          <Text style={styles.conditionText}>{truncateWords({ text: item.description, maxWords: 5 })}</Text>
        </View>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => handleChatPress(item)}
        >
          <Ionicons name="chatbubble-outline" size={16} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.dateTimeContainer}>
        <View style={styles.dateTime}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.textPrimary} />
          <Text style={styles.appointmentDate}>{convertToLocalDate(item.appointment_datetime)}</Text>
        </View>
        <View style={styles.dateTime}>
          <Ionicons name="time-outline" size={20} color={COLORS.textPrimary} />
          <Text style={styles.appointmentTime}>{formatTime(item.appointment_datetime)}</Text>
        </View>
      </View>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'mood':
        return renderMoodTab();
      case 'resources':
        return renderResourcesTab();
      case 'reviews':
        return renderReviewsTab();
      case 'reports':
        return renderReportsTab();
      default:
        return renderOverviewTab();
    }
  };

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statContent}>
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statValue}>8</Text>
              <Text style={styles.statTitle}>Today's Schedule</Text>
              <Text style={styles.statChange}>+2 vs. last month</Text>
            </View>
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statContent}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statValue}>320</Text>
              <Text style={styles.statTitle}>Total Patients</Text>
              <Text style={styles.statChange}>+12 vs. last month</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statContent}>
            <View style={styles.statIconContainer}>
              <Ionicons name="happy-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statValue}>7.2</Text>
              <Text style={styles.statTitle}>Avg Mood Score</Text>
              <Text style={styles.statChange}>+0.3 vs. last week</Text>
            </View>
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statContent}>
            <View style={styles.statIconContainer}>
              <Ionicons name="star-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statValue}>4.8</Text>
              <Text style={styles.statTitle}>Your Rating</Text>
              <Text style={styles.statChange}>324 reviews</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderMoodTab = () => {
    const total = moodDistribution.reduce((sum, m) => sum + m.count, 0) || 1;
    return (
      <View style={styles.tabContent}>
        <Text style={styles.tabTitle}>Patient Mood Distribution</Text>
        {moodDistribution.map((mood, index) => (
          <View key={index} style={styles.moodItem}>
            <View style={styles.moodLeft}>
              <Ionicons name={mood.icon as any} size={24} color={mood.color} />
              <Text style={styles.moodLabel}>{mood.mood}</Text>
            </View>
            <View style={styles.moodRight}>
              <View style={[styles.moodBar, { backgroundColor: mood.color + '20' }]}>
                <View
                  style={[styles.moodBarFill, { backgroundColor: mood.color, width: `${(mood.count / total) * 100}%` }]}
                />
              </View>
              <Text style={styles.moodCount}>{mood.count}</Text>
            </View>
          </View>
        ))}
        {/* Mood Trends Chart */}
        <Text style={[styles.tabTitle, { marginTop: 24 }]}>Mood Trends Over Time</Text>
        {moodTrends.labels.length > 0 ? (
          <LineChart
            data={{
              labels: moodTrends.labels,
              datasets: [{ data: moodTrends.data }],
            }}
            width={screenWidth - 48}
            height={220}
            yAxisSuffix="/10"
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: '4', strokeWidth: '2', stroke: '#4CAF50' },
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
        ) : (
          <Text style={{ color: '#888', marginBottom: 16 }}>Not enough data for trends.</Text>
        )}
        {/* Export Button */}
        <TouchableOpacity style={styles.actionButton} onPress={handleExportMoodCSV}>
          <Ionicons name="download-outline" size={20} color={COLORS.white} />
          <Text style={styles.actionButtonText}>Export Mood Data (CSV)</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderResourcesTab = () => {
    // Only show these categories
    const categories: Array<{ id: keyof typeof typeMap; label: string; icon: string; color: string }> = [
      { id: 'audio', label: 'Audio', icon: 'headset-outline', color: '#f093fb' },
      { id: 'music', label: 'Music', icon: 'musical-notes-outline', color: '#9C27B0' },
      { id: 'books', label: 'Books', icon: 'book-outline', color: '#667eea' },
      { id: 'articles', label: 'Articles', icon: 'document-text-outline', color: '#4CAF50' },
      { id: 'routines', label: 'Routine', icon: 'alarm-outline', color: '#43e97b' },
      { id: 'podcasts', label: 'Podcasts', icon: 'mic-outline', color: '#E91E63' },
    ];
    // Map backend types
    const typeMap = {
      audio: 'audio',
      music: 'music',
      books: 'book',
      articles: 'article',
      routines: 'routine',
      podcasts: 'podcast',
    } as const;
    return (
      <View style={styles.tabContent}>
        <Text style={styles.tabTitle}>Your Resources Library</Text>
        {resourcesLoading ? (
          <View style={{ alignItems: 'center', padding: 32 }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : resourcesError ? (
          <Text style={{ color: COLORS.error, textAlign: 'center', marginVertical: 16 }}>{resourcesError}</Text>
        ) : (
          <>
            <View style={styles.resourceGrid}>
              {categories.map((cat) => {
                const count = resources.filter(r => r.type === typeMap[cat.id]).length;
                return (
                  <View key={cat.id} style={styles.resourceCard}>
                    <Ionicons name={cat.icon as any} size={32} color={cat.color} />
                    <Text style={styles.resourceCount}>{count}</Text>
                    <Text style={styles.resourceLabel}>{cat.label}</Text>
                  </View>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(screens)/consultants/resourceLibrary')}
            >
              <Ionicons name="cloud-upload-outline" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Upload New Resource</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  const renderReviewsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Patient Reviews & Ratings</Text>
      <View style={styles.ratingOverview}>
        <View style={styles.ratingLeft}>
          <Text style={styles.averageRating}>{reviewStats.averageRating.toFixed(1)}</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name="star"
                size={20}
                color={star <= Math.floor(reviewStats.averageRating) ? "#FFD700" : "#E0E0E0"}
              />
            ))}
          </View>
          <Text style={styles.totalReviews}>{reviewStats.totalReviews} reviews</Text>
        </View>
        <View style={styles.ratingRight}>
          {reviewStats.ratingDistribution.map((rating, index) => (
            <View key={index} style={styles.ratingRow}>
              <Text style={styles.starLabel}>{rating.stars}★</Text>
              <View style={styles.ratingBarContainer}>
                <View
                  style={[
                    styles.ratingBarFill,
                    { width: `${(reviewStats.totalReviews ? (rating.count / reviewStats.totalReviews) * 100 : 0)}%` }
                  ]}
                />
              </View>
              <Text style={styles.ratingCount}>{rating.count}</Text>
            </View>
          ))}
        </View>
      </View>
      {/* List of reviews */}
      <ScrollView style={{ maxHeight: 200, marginTop: 16 }}>
        {reviews.length === 0 ? (
          <Text style={{ color: '#888', textAlign: 'center', marginTop: 16 }}>No reviews yet.</Text>
        ) : (
          reviews.map((review, idx) => (
            <View key={idx} style={{ marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Image source={{ uri: review.user_profile_image }} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8 }} />
                <Text style={{ fontWeight: '600', color: COLORS.textDark }}>{review.user_name}</Text>
                <Ionicons name="star" size={16} color="#FFD700" style={{ marginLeft: 8 }} />
                <Text style={{ color: COLORS.textDark, marginLeft: 2 }}>{review.rating}</Text>
              </View>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>{review.review_text}</Text>
              <Text style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>{new Date(review.created_at).toLocaleDateString()}</Text>
            </View>
          ))
        )}
      </ScrollView>
      <TouchableOpacity style={styles.actionButton} onPress={handleViewAllReviews}>
        <Ionicons name="chatbubbles-outline" size={20} color={COLORS.white} />
        <Text style={styles.actionButtonText}>View All Reviews</Text>
      </TouchableOpacity>
    </View>
  );

  const renderReportsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Generate Reports</Text>

      <View style={styles.reportOptions}>
        <TouchableOpacity style={styles.reportCard}>
          <Ionicons name="bar-chart-outline" size={32} color={COLORS.primary} />
          <Text style={styles.reportTitle}>Patient Progress</Text>
          <Text style={styles.reportDescription}>Weekly/Monthly progress reports</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.reportCard}>
          <Ionicons name="pie-chart-outline" size={32} color={COLORS.primary} />
          <Text style={styles.reportTitle}>Mood Analytics</Text>
          <Text style={styles.reportDescription}>Mood trends and patterns</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.reportCard}>
          <Ionicons name="trending-up-outline" size={32} color={COLORS.primary} />
          <Text style={styles.reportTitle}>Performance Report</Text>
          <Text style={styles.reportDescription}>Your consultation metrics</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.reportCard}>
          <Ionicons name="calendar-outline" size={32} color={COLORS.primary} />
          <Text style={styles.reportTitle}>Appointment Summary</Text>
          <Text style={styles.reportDescription}>Schedule and attendance data</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.actionButton}>
        <Ionicons name="download-outline" size={20} color={COLORS.white} />
        <Text style={styles.actionButtonText}>Generate Custom Report</Text>
      </TouchableOpacity>
    </View>
  );
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    // Top Bar Styles
    topBar: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 20,
      gap: 12,
      alignItems: 'center',
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
      flex: 1,
    },
    homeGreeting: {
      fontSize: 20,
      fontWeight: 'bold',
      color: COLORS.textDark,
    },
    greeting: {
      color: COLORS.grey,
      fontSize: 14,
      marginTop: 2,
    },
    rightIcons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 18,
      justifyContent: 'flex-end',
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
    // Appointments Section
    appointmentsSection: {
      paddingHorizontal: 16,
      marginTop: 8,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: COLORS.textDark,
    },
    seeAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    seeAllText: {
      fontSize: 14,
      color: COLORS.primary,
      fontWeight: '600',
    },
    carouselContainer: {
      paddingHorizontal: 16,
    },
    // Appointment Carousel Card Styles
    appointmentCarouselCard: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: 20,
      padding: 20,
      marginHorizontal: 8,
      marginVertical: 5,
      width: screenWidth - 48,
      borderColor: COLORS.lightGrey,
      borderWidth: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 5,
    },
    statusBadge: {
      backgroundColor: COLORS.infoBackground,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusText: {
      color: COLORS.infoText,
      fontSize: 12,
      fontWeight: '600',
    },
    moodIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: COLORS.background,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    moodText: {
      fontSize: 12,
      fontWeight: '600',
      color: COLORS.textDark,
    },
    patientSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 15,
      gap: 12,
    },
    patientAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    patientInfo: {
      flex: 1,
    },
    patientName: {
      color: COLORS.textPrimary,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    conditionText: {
      color: COLORS.textSecondary,
      fontSize: 14,
      opacity: 0.8,
      marginBottom: 6,
    },
    chatButton: {
      backgroundColor: COLORS.primary,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      shadowColor: COLORS.textDark,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.20,
      shadowRadius: 1.41,
      elevation: 2,
    },
    dateTimeContainer: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: COLORS.background,
      padding: 12,
      borderRadius: 12
    },
    dateTime: {
      flexDirection: "row",
      gap: 5,
      alignItems: "center"
    },
    appointmentDate: {
      color: COLORS.textPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    appointmentTime: {
      color: COLORS.textPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    // Pagination Styles
    paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
      gap: 8,
    },
    paginationDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    paginationDotActive: {
      backgroundColor: COLORS.primary,
    },
    paginationDotInactive: {
      backgroundColor: COLORS.lightGrey,
    },
    // Tab Styles
    tabContainer: {
      paddingHorizontal: 16,
      marginTop: 30,
    },
    tabScrollContainer: {
      paddingRight: 16,
    },
    tabButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginRight: 12,
      borderRadius: 25,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.lightGrey,
    },
    tabButtonActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    tabButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.textSecondary,
    },
    tabButtonTextActive: {
      color: COLORS.white,
    },
    // Tab Content Styles
    tabContent: {
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 30,
    },
    tabTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: COLORS.textDark,
      marginBottom: 20,
    },
    // Stats Styles
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: COLORS.cardBackground,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: COLORS.lightGrey,
    },
    statContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    statIconContainer: {
      backgroundColor: COLORS.primaryLight,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statTextContainer: {
      flex: 1,
    },
    statTitle: {
      fontSize: 12,
      color: COLORS.textSecondary,
      marginBottom: 2,
    },
    statValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: COLORS.textDark,
      marginBottom: 2,
    },
    statChange: {
      fontSize: 11,
      color: COLORS.textSecondary,
    },
    // Mood Tab Styles
    moodItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.lightGrey,
    },
    moodLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    moodLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: COLORS.textDark,
    },
    moodRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 2,
    },
    moodBar: {
      height: 8,
      borderRadius: 4,
      flex: 1,
      overflow: 'hidden',
    },
    moodBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    moodCount: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.textDark,
      minWidth: 30,
      textAlign: 'center',
    },
    // Resources Tab Styles
    resourceGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 12,
      justifyContent: 'space-between',
    },
    resourceCard: {
      width: '48%', // Two columns with spacing
      backgroundColor: COLORS.cardBackground,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.lightGrey,
      marginBottom: 12,
    },

    resourceCount: {
      color: COLORS.textDark
    },
    resourceLabel: {
      color: COLORS.textDark
    },
  
    // Reviews Tab Styles
    ratingOverview: {
      flexDirection: 'row',
      backgroundColor: COLORS.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: COLORS.lightGrey,
    },
    ratingLeft: {
      flex: 1,
      alignItems: 'center',
      paddingRight: 20,
    },
    averageRating: {
      fontSize: 36,
      fontWeight: 'bold',
      color: COLORS.textDark,
      marginBottom: 8,
    },
    starsContainer: {
      flexDirection: 'row',
      gap: 2,
      marginBottom: 8,
    },
    totalReviews: {
      fontSize: 14,
      color: COLORS.textSecondary,
    },
    ratingRight: {
      flex: 2,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
      gap: 8,
    },
    starLabel: {
      fontSize: 12,
      color: COLORS.textSecondary,
      minWidth: 20,
    },
    ratingBarContainer: {
      flex: 1,
      height: 6,
      backgroundColor: '#E0E0E0',
      borderRadius: 3,
      overflow: 'hidden',
    },
    ratingBarFill: {
      height: '100%',
      backgroundColor: '#FFD700',
    },
    ratingCount: {
      fontSize: 12,
      color: COLORS.textSecondary,
      minWidth: 30,
      textAlign: 'right',
    },
    // Reports Tab Styles
    reportOptions: {
      gap: 12,
    },
    reportCard: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: COLORS.lightGrey,
      alignItems: 'center',
    },
    reportTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.textDark,
      marginTop: 12,
      marginBottom: 4,
    },
    reportDescription: {
      fontSize: 12,
      color: COLORS.textSecondary,
      textAlign: 'center',
    },
    // Action Button Styles
    actionButton: {
      backgroundColor: COLORS.primary,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 20,
    },
    actionButtonText: {
      color: COLORS.white,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Image
              style={styles.profileImg}
              source={{ uri: user?.profile_image || undefined, }}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.homeGreeting}>Dr. {user?.first_name} {user?.last_name}</Text>
              <Text style={styles.greeting}>Ready to help clients today?</Text>
            </View>
            <View style={styles.rightIcons}>
              <TouchableOpacity onPress={handleNotificationPress}>
                <View style={styles.notificationDot} />
                <Ionicons name="notifications-outline" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Upcoming Appointments Section */}
          <View style={styles.appointmentsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
              {/* See All button can go here if needed */}
            </View>
            {confirmedAppointments.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 32 }}>
                <Ionicons name="calendar-outline" size={48} color={COLORS.lightGrey} style={{ marginBottom: 12 }} />
                <Text style={{ color: COLORS.grey, fontSize: 16, textAlign: 'center' }}>
                  No upcoming confirmed appointments.
                </Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={confirmedAppointments}
                renderItem={renderAppointmentCard}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                snapToAlignment="center"
                decelerationRate="fast"
                contentContainerStyle={styles.carouselContainer}
                getItemLayout={(_, index) => ({ length: screenWidth - 48, offset: (screenWidth - 48) * index, index })}
                initialScrollIndex={currentIndex}
                onMomentumScrollEnd={e => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / (screenWidth - 48));
                  setCurrentIndex(index);
                }}
              />
            )}
            {/* Pagination Dots */}
            {confirmedAppointments.length > 1 && (
              <View style={styles.paginationContainer}>
                {confirmedAppointments.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.paginationDot,
                      idx === currentIndex ? styles.paginationDotActive : styles.paginationDotInactive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Tabs and Tab Content ...existing code... */}
          <View style={styles.tabContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContainer}>
              {tabsData.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tabButton,
                    activeTab === tab.id && styles.tabButtonActive,
                  ]}
                  onPress={() => {
                    setActiveTab(tab.id);
                  }}
                >
                  <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.id ? COLORS.white : COLORS.textSecondary} />
                  <Text style={[
                    styles.tabButtonText,
                    activeTab === tab.id && styles.tabButtonTextActive,
                  ]}>{tab.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {renderTabContent()}
          </View>

        </ScrollView>
      </SafeAreaView>
  );

};


export default ConsultantAdminHome;