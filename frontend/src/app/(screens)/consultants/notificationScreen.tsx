import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../context/ThemeContext';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { fetchConsultantNotifications, markNotificationAsRead } from '../../../services/api';

// Helper to group notifications by date
const groupNotificationsByDate = (notifications) => {
  const groups = {};
  notifications.forEach((notif) => {
    const dateObj = new Date(notif.created_at);
    const today = new Date();
    let label;
    if (
      dateObj.getDate() === today.getDate() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getFullYear() === today.getFullYear()
    ) {
      label = `Today, ${today.getDate()} ${today.toLocaleString('default', { month: 'short' })} ${today.getFullYear().toString().slice(-2)}`;
    } else {
      label = `${dateObj.toLocaleString('default', { weekday: 'long' })}, ${dateObj.getDate()} ${dateObj.toLocaleString('default', { month: 'short' })} ${dateObj.getFullYear().toString().slice(-2)}`;
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(notif);
  });
  // Convert to array of {id, category, notifications}
  return Object.entries(groups).map(([category, notifications], idx) => ({
    id: idx + 1,
    category,
    notifications,
  }));
};

const NotificationScreen = () => {
  const [activeTab, setActiveTab] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const notificationListener = useRef(null);
  const responseListener = useRef(null);
  const { COLORS } = useTheme();

  // Fetch notifications from backend
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const notifs = await fetchConsultantNotifications();
      setNotifications(notifs);
    } catch (e) {
      // Optionally handle error
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(async (notification) => {
      // Optionally, you can optimistically add to UI
      await loadNotifications();
    });
    responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      // Optionally handle notification tap
      await loadNotifications();
    });
    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, []);

  const handleNotificationPress = async (notificationId) => {
    // Mark notification as read in backend and update UI
    try {
      await markNotificationAsRead(notificationId);
      await loadNotifications();
    } catch (e) {
      // Optionally handle error
    }
  };

  const getFilteredNotifications = () => {
    let filtered = notifications;
    if (activeTab === 'Unread') {
      filtered = notifications.filter((notif) => !notif.is_read);
    }
    return groupNotificationsByDate(filtered);
  };

  const renderNotificationItem = (notification) => (
    <TouchableOpacity
      key={notification.id}
      style={[
        styles.notificationItem,
        !notification.is_read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(notification.id)}
    >
      <View style={[styles.iconContainer, { backgroundColor: notification.iconBg || '#FFF3E0' }]}> {/* fallback color */}
        <Ionicons
          name={notification.icon || 'calendar-outline'}
          size={20}
          color={notification.iconColor || '#FF9800'}
        />
      </View>
      <View style={styles.notificationContent}>
        <Text style={[
          styles.notificationTitle,
          !notification.is_read && styles.unreadTitle
        ]}>
          {notification.title}
        </Text>
        <Text style={styles.notificationDescription}>
          {notification.body}
        </Text>
        <Text style={styles.notificationTime}>
          {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      {!notification.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGrey,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  searchButton: {
    padding: 4,
  },
  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.lightGrey,
  },
  activeTabButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  activeTabButtonText: {
    color: COLORS.white,
  },
  // Content Styles
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 16,
  },
  notificationsContainer: {
    gap: 12,
  },
  // Notification Item Styles
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGrey,
    gap: 12,
  },
  unreadNotification: {
    backgroundColor: '#F8F9FA',
    borderColor: COLORS.primary + '20',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '600',
  },
  notificationDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 11,
    color: COLORS.grey,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 6,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
});

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search-outline" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
      </View>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'All' && styles.activeTabButton
          ]}
          onPress={() => setActiveTab('All')}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'All' && styles.activeTabButtonText
          ]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'Unread' && styles.activeTabButton
          ]}
          onPress={() => setActiveTab('Unread')}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'Unread' && styles.activeTabButtonText
          ]}>
            Unread
          </Text>
        </TouchableOpacity>
      </View>
      {/* Notifications List */}
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Loading...</Text>
          </View>
        ) : getFilteredNotifications().length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color={COLORS.lightGrey} />
            <Text style={styles.emptyStateText}>No notifications found</Text>
          </View>
        ) : (
          getFilteredNotifications().map((category) => (
            <View key={category.id} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category.category}</Text>
              <View style={styles.notificationsContainer}>
                {category.notifications.map((notification) =>
                  renderNotificationItem(notification)
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
};

export default NotificationScreen;