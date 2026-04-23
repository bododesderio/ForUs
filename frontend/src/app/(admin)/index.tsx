import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import {
  getUserAppointments,
  fetchResources,
  getUsers,
  fetchConsultants,
  getUserChatRooms,
  getConsultantReviewsPaginated,
  formatDateForAPI,
  getAllAppointments,
  getStoredUserData
} from '../../services/api'; // Updated imports

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = (screenWidth - 60) / 2;

interface Appointment {
  appointment_datetime: string;
  duration_minutes?: number;
  status: 'pending' | 'cancelled' | 'confirmed' | 'in_session' | 'completed';
  title?: string;
}

interface Resource {
  title: string;
  type: string;
}

interface User {
  profile_image?: string;
}

interface CalendarDay {
  day: number;
  isOtherMonth: boolean;
}

interface AnalyticsItem {
  name: string;
  value: number;
}

type RootDrawerParamList = {
  '/(admin)/profile': undefined;
};

type AdminDrawerNavigationProp = DrawerNavigationProp<RootDrawerParamList>;

const DashboardScreen = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsItem[]>([]);
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [consultants, setConsultants] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const navigation = useNavigation<AdminDrawerNavigationProp>();
  const { COLORS } = useTheme() as { COLORS: any };
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getStoredUserData();
        console.log('User data fetched:', userData);
        setUser(userData);
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load user data. Please try again.');
      }
    };
    fetchUser();
  }, []);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setRefreshing(true);
        console.log('Fetching all appointments...');
        const startDate = new Date(selectedYear, selectedMonth - 2, 1); // 3 months back
        const endDate = new Date(selectedYear, selectedMonth + 1, 0);
        const appointmentData = await getAllAppointments({
          from: formatDateForAPI(startDate),
          to: formatDateForAPI(endDate),
        });
        console.log('Appointments fetched:', appointmentData);
        setAppointments(
          Array.isArray(appointmentData.appointments) ? appointmentData.appointments : []
        );

        console.log('Fetching resources...');
        const resourceData = await fetchResources();
        console.log('Resources fetched:', resourceData);
        setResources(Array.isArray(resourceData.resources) ? resourceData.resources : []);

        console.log('Fetching chat rooms...');
        const chatRoomData = await getUserChatRooms();
        console.log('Chat rooms fetched:', chatRoomData);
        setChatRooms(Array.isArray(chatRoomData.rooms) ? chatRoomData.rooms : []);

        console.log('Fetching users...');
        const userData = await getUsers(); // Fetch first page to get total
        console.log('Users fetched:', userData);
        setUsers(Array.isArray(userData.users) ? userData.users : []);

        console.log('Fetching consultants...');
        const consultantData = await fetchConsultants(); // Fetch first page to get total
        console.log('Consultants fetched:', consultantData);
        setConsultants(Array.isArray(consultantData.consultants) ? consultantData.consultants : []);

        console.log('Fetching reviews...');
        const reviewData = await getConsultantReviewsPaginated(1, 1); // Placeholder consultant ID 1
        console.log('Reviews fetched:', reviewData);
        setReviews(Array.isArray(reviewData.reviews) ? reviewData.reviews : []);
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to load data. Check your connection or try again.');
      } finally {
        setRefreshing(false);
      }
    };
    fetchData();
  }, [selectedMonth, selectedYear]);

  // Process analytics data for appointments
  useEffect(() => {
    const processAnalytics = () => {
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const data = Array.from({ length: daysInMonth }, (_, i) => ({
        name: `${i + 1}`,
        value: 0,
      }));

      appointments.forEach((appt) => {
        const date = new Date(appt.appointment_datetime);
        const utcDate = new Date(date.toISOString().split('T')[0]); // Strip time to compare days
        const day = utcDate.getUTCDate() - 1; // Use UTC day
        if (
          utcDate.getUTCMonth() === selectedMonth &&
          utcDate.getUTCFullYear() === selectedYear &&
          day >= 0 && day < daysInMonth
        ) {
          data[day].value += 1;
        }
      });

      console.log('Processed analytics data:', data);
      setAnalyticsData(data);
    };
    processAnalytics();
  }, [appointments, selectedMonth, selectedYear]);

  // Generate calendar data
  const generateCalendarData = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const weeks = [];
    let week = Array(7).fill(null);
    let dayIndex = 1;

    for (let i = firstDay - 1; i >= 0; i--) {
      const prevMonthLastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      week[i] = { day: prevMonthLastDay - (firstDay - 1 - i), isOtherMonth: true };
    }

    for (let i = 0; i < 42; i++) {
      const pos = i % 7;
      if (i >= firstDay && dayIndex <= daysInMonth) {
        week[pos] = { day: dayIndex, isOtherMonth: false };
        dayIndex++;
      } else if (dayIndex > daysInMonth) {
        week[pos] = { day: i - daysInMonth - firstDay + 1, isOtherMonth: true };
      }
      if (pos === 6) {
        weeks.push(week);
        week = Array(7).fill(null);
      }
    }
    return weeks;
  };

  const calendarData = generateCalendarData();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('Refreshing all appointments...');
      const appointmentData = await getAllAppointments({
        from: formatDateForAPI(new Date(selectedYear, selectedMonth, 1)),
        to: formatDateForAPI(new Date(selectedYear, selectedMonth + 1, 0)),
      });
      setAppointments(Array.isArray(appointmentData.appointments) ? appointmentData.appointments : []);
      console.log('Refreshing resources...');
      const resourceData = await fetchResources();
      setResources(Array.isArray(resourceData.resources) ? resourceData.resources : []);
      console.log('Refreshing chat rooms...');
      const chatRoomData = await getUserChatRooms();
      setChatRooms(Array.isArray(chatRoomData.rooms) ? chatRoomData.rooms : []);
      console.log('Refreshing users...');
      const userData = await getUsers({ limit: 1 });
      setUsers(Array.isArray(userData.users) ? userData.users : []);
      console.log('Refreshing consultants...');
      const consultantData = await fetchConsultants({ limit: 1 });
      setConsultants(Array.isArray(consultantData.consultants) ? consultantData.consultants : []);
      console.log('Refreshing reviews...');
      const reviewData = await getConsultantReviewsPaginated(1, 1); // Placeholder consultant ID
      setReviews(Array.isArray(reviewData.reviews) ? reviewData.reviews : []);
    } catch (error) {
      console.error('Error refreshing data:', error);
      Alert.alert('Error', 'Failed to refresh data. Check your connection.');
    } finally {
      setRefreshing(false);
    }
  };

  const renderCustomHeader = () => {
    const navigation = useNavigation();
    return (
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={28} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={handleRefresh}
          >
            <Ionicons
              name="refresh"
              size={24}
              color={COLORS.textDark}
              style={[refreshing && { transform: [{ rotate: '180deg' }] }]}
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerAvatar}
            onPress={() => navigation.navigate('/(admin)/profile')}
          >
            <Image 
              source={{ uri: user?.profile_image }} 
              style={styles.headerProfileImage}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAppointmentAnalytics = () => {
  const chartData = {
    labels: analyticsData.map((item) => item.name),
    datasets: [
      {
        data: analyticsData.map((item) => item.value),
        color: () => COLORS.primary,
        strokeWidth: 2,
      },
    ],
  };

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const chartWidth = daysInMonth * 40; // 40px per day for readability

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>Appointment Analytics</Text>
          <View style={styles.monthSelector}>
            <TouchableOpacity
              onPress={() => {
                if (selectedMonth === 0) {
                  setSelectedMonth(11);
                  setSelectedYear(selectedYear - 1);
                } else {
                  setSelectedMonth(selectedMonth - 1);
                }
              }}
            >
              <Ionicons name="chevron-back" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {new Date(selectedYear, selectedMonth).toLocaleString('default', {
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (selectedMonth === 11) {
                  setSelectedMonth(0);
                  setSelectedYear(selectedYear + 1);
                } else {
                  setSelectedMonth(selectedMonth + 1);
                }
              }}
            >
              <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.conversionRate}>
          <Text style={styles.metricLabel}>Total Appointments</Text>
          <View style={styles.rateContainer}>
            <Text style={styles.rateValue}>{appointments.length}</Text>
            <View style={styles.rateChange}>
              <Text style={styles.rateChangeText}>
                {appointments.length > 0 ? '+1' : '0'} this month
              </Text>
            </View>
          </View>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={styles.chartScrollContainer}
      >
        <View style={styles.chartWrapper}>
          {analyticsData.length > 0 ? (
            <LineChart
              data={chartData}
              width={chartWidth}
              height={250} // Increased height for better visibility
              chartConfig={{
                backgroundColor: COLORS.cardBackground,
                backgroundGradientFrom: COLORS.cardBackground,
                backgroundGradientTo: COLORS.cardBackground,
                decimalPlaces: 0,
                color: () => COLORS.primary,
                labelColor: () => COLORS.textSecondary,
                style: {
                  paddingLeft: 5, // Reduced from default padding
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: COLORS.primary,
                },
              }}
              bezier
              style={styles.chart}
            />
          ) : (
            <Text style={styles.noDataText}>No data available for chart</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

  const renderMetricsGrid = () => {
    const [activeIndex, setActiveIndex] = useState(0);
    const metricsCount = 9;

    const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const scrollX = event.nativeEvent.contentOffset.x;
      const index = Math.round(scrollX / (cardWidth + 15));
      setActiveIndex(index);
    };

    // Existing metrics
    const totalDuration = appointments.reduce(
      (sum, appt) => sum + (appt.duration_minutes || 60),
      0
    );
    const completedAppointments = appointments.filter(
      (appt) => appt.status === 'completed'
    ).length;
    const pendingAppointments = appointments.filter(
      (appt) => appt.status === 'pending'
    ).length;

    // New metrics from API
    const totalReviews = reviews.length; // Total reviews fetched
    const totalChatRooms = chatRooms.length; // Total chat rooms
    const totalUsers = users.length; // Assuming API returns total in metadata
    const totalConsultants = consultants.length; // Assuming API returns total in metadata
    const totalResources = resources.length;

    return (
      <View style={styles.carouselContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + 15}
          snapToAlignment="center"
          decelerationRate="fast"
          contentContainerStyle={styles.carouselContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* Existing Metrics */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Total Appointments</Text>
              <TouchableOpacity>
                <Text style={styles.viewDetails}>View Details</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.metricValue}>
              <Text style={styles.metricNumber}>{appointments.length}</Text>
              <View style={styles.metricChange}>
                <Text style={styles.metricChangeText}>+{appointments.length}</Text>
              </View>
            </View>
            <View style={styles.miniChart}>
              {analyticsData.slice(0, 4).map((_, index) => (
                <View key={index} style={styles.miniChartBar} />
              ))}
            </View>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Total Duration</Text>
              <TouchableOpacity>
                <Text style={styles.viewDetails}>View Details</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.metricValue}>
              <Text style={styles.metricNumber}>{totalDuration} min</Text>
              <View style={styles.metricChange}>
                <Text style={styles.metricChangeText}>+{totalDuration} min</Text>
              </View>
            </View>
            <View style={styles.miniChart}>
              {analyticsData.slice(0, 4).map((_, index) => (
                <View key={index} style={[styles.miniChartBar, styles.miniChartBarBlue]} />
              ))}
            </View>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Completed</Text>
              <TouchableOpacity>
                <Text style={styles.viewDetails}>View Details</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.metricValue}>
              <Text style={styles.metricNumber}>{completedAppointments}</Text>
              <View style={styles.metricChange}>
                <Text style={styles.metricChangeText}>+{completedAppointments}</Text>
              </View>
            </View>
            <View style={styles.miniChart}>
              {analyticsData.slice(0, 4).map((_, index) => (
                <View key={index} style={[styles.miniChartBar, styles.miniChartBarGreen]} />
              ))}
            </View>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Pending</Text>
              <TouchableOpacity>
                <Text style={styles.viewDetails}>View Details</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.metricValue}>
              <Text style={styles.metricNumber}>{pendingAppointments}</Text>
              <View style={[styles.metricChange, styles.metricChangeNegative]}>
                <Text style={styles.metricChangeTextNegative}>{pendingAppointments}</Text>
              </View>
            </View>
            <View style={styles.miniChart}>
              {analyticsData.slice(0, 4).map((_, index) => (
                <View key={index} style={[styles.miniChartBar, styles.miniChartBarTeal]} />
              ))}
            </View>
          </View>

          {/* New Metrics */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Total Reviews</Text>
              <TouchableOpacity>
                <Text style={styles.viewDetails}>View Details</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.metricValue}>
              <Text style={styles.metricNumber}>{totalReviews}</Text>
              <View style={styles.metricChange}>
                <Text style={styles.metricChangeText}>+{totalReviews}</Text>
              </View>
            </View>
            <View style={styles.miniChart}>
              {analyticsData.slice(0, 4).map((_, index) => (
                <View key={index} style={[styles.miniChartBar, styles.miniChartBarGreen]} />
              ))}
            </View>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Total Chat Rooms</Text>
              <TouchableOpacity>
                <Text style={styles.viewDetails}>View Details</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.metricValue}>
              <Text style={styles.metricNumber}>{totalChatRooms}</Text>
              <View style={styles.metricChange}>
                <Text style={styles.metricChangeText}>+{totalChatRooms}</Text>
              </View>
            </View>
            <View style={styles.miniChart}>
              {analyticsData.slice(0, 4).map((_, index) => (
                <View key={index} style={[styles.miniChartBar, styles.miniChartBarBlue]} />
              ))}
            </View>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Total Users</Text>
              <TouchableOpacity>
                <Text style={styles.viewDetails}>View Details</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.metricValue}>
              <Text style={styles.metricNumber}>{totalUsers}</Text>
              <View style={styles.metricChange}>
                <Text style={styles.metricChangeText}>+{totalUsers}</Text>
              </View>
            </View>
            <View style={styles.miniChart}>
              {analyticsData.slice(0, 4).map((_, index) => (
                <View key={index} style={[styles.miniChartBar, styles.miniChartBarTeal]} />
              ))}
            </View>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Total Consultants</Text>
              <TouchableOpacity>
                <Text style={styles.viewDetails}>View Details</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.metricValue}>
              <Text style={styles.metricNumber}>{totalConsultants}</Text>
              <View style={styles.metricChange}>
                <Text style={styles.metricChangeText}>+{totalConsultants}</Text>
              </View>
            </View>
            <View style={styles.miniChart}>
              {analyticsData.slice(0, 4).map((_, index) => (
                <View key={index} style={[styles.miniChartBar, styles.miniChartBarGreen]} />
              ))}
            </View>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Total Resources</Text>
              <TouchableOpacity>
                <Text style={styles.viewDetails}>View Details</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.metricValue}>
              <Text style={styles.metricNumber}>{totalResources}</Text>
              <View style={styles.metricChange}>
                <Text style={styles.metricChangeText}>+{totalResources}</Text>
              </View>
            </View>
            <View style={styles.miniChart}>
              {analyticsData.slice(0, 4).map((_, index) => (
                <View key={index} style={[styles.miniChartBar, styles.miniChartBarBlue]} />
              ))}
            </View>
          </View>
        </ScrollView>
        <View style={styles.pagination}>
          {Array(metricsCount)
            .fill(0)
            .map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === activeIndex ? styles.paginationDotActive : null,
                ]}
              />
            ))}
        </View>
      </View>
    );
  };

  const renderResources = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Available Resources</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { flex: 2 }]}>Resource Name</Text>
        <Text style={styles.tableHeaderText}>Type</Text>
        <Text style={styles.tableHeaderText}>Action</Text>
      </View>
      {resources.slice(0, 3).map((resource, index) => (
        <View key={index} style={styles.productRow}>
          <View style={styles.productInfo}>
            <Text style={styles.productEmoji}>📄</Text>
            <Text style={styles.productName}>{resource.title || 'Unnamed Resource'}</Text>
          </View>
          <Text style={styles.productQuantity}>{resource.type || 'N/A'}</Text>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderRightColumn = () => {
  const [selectedDayAppointments, setSelectedDayAppointments] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  const getDayStatusColor = (day: CalendarDay): string | null => {
    const matchingAppointments = appointments.filter((appt) => {
      const apptDate = new Date(appt.appointment_datetime);
      // Match only if the appointment is in the selected month and year
      return (
        apptDate.getDate() === day.day &&
        apptDate.getMonth() === selectedMonth &&
        apptDate.getFullYear() === selectedYear
      );
    });

    if (matchingAppointments.length === 0) return null;

    // Priority logic: cancelled > in_session > completed > confirmed > pending
    const priorityOrder = ['cancelled', 'in_session', 'completed', 'confirmed', 'pending'];
    const highestPriorityStatus = matchingAppointments.reduce((prev, curr) => {
      const prevIndex = priorityOrder.indexOf(prev.status);
      const currIndex = priorityOrder.indexOf(curr.status);
      return currIndex < prevIndex ? curr : prev;
    }, matchingAppointments[0]);

    switch (highestPriorityStatus.status) {
      case 'pending':
        return COLORS.warning || '#FFC107'; // Yellow
      case 'cancelled':
        return COLORS.error || '#F44336'; // Red
      case 'confirmed':
        return COLORS.success || '#4CAF50'; // Green
      case 'in_session':
        return COLORS.primary || '#2196F3'; // Blue
      case 'completed':
        return COLORS.purple || '#9C27B0'; // Purple
      default:
        return COLORS.success; // Default to green
    }
  };

  const handleDayPress = (dayObj: CalendarDay): void => {
    if (!dayObj.isOtherMonth) {
      setSelectedDate(dayObj.day);
      const dayAppointments = appointments.filter((appt) => {
        const apptDate = new Date(appt.appointment_datetime);
        return (
          apptDate.getDate() === dayObj.day &&
          apptDate.getMonth() === selectedMonth &&
          apptDate.getFullYear() === selectedYear
        );
      });
      setSelectedDayAppointments(dayAppointments);
      setModalVisible(true);
    }
  };

  return (
    <View style={styles.rightColumn}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              onPress={() => {
                if (selectedMonth === 0) {
                  setSelectedMonth(11);
                  setSelectedYear(selectedYear - 1);
                } else {
                  setSelectedMonth(selectedMonth - 1);
                }
              }}
            >
              <Ionicons name="chevron-back" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (selectedMonth === 11) {
                  setSelectedMonth(0);
                  setSelectedYear(selectedYear + 1);
                } else {
                  setSelectedMonth(selectedMonth + 1);
                }
              }}
            >
              <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.calendar}>
          <View style={styles.calendarWeekdays}>
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
              <Text key={day} style={styles.weekday}>{day}</Text>
            ))}
          </View>
          {calendarData.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.calendarWeek}>
              {week.map((dayObj, dayIndex) => {
                if (!dayObj) return <View key={dayIndex} style={styles.calendarDay} />;
                const statusColor = getDayStatusColor(dayObj);
                return (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.calendarDay,
                      selectedDate === dayObj.day && !dayObj.isOtherMonth && styles.selectedDay,
                      dayObj.isOtherMonth && styles.otherMonthDay,
                      statusColor && { backgroundColor: statusColor, opacity: 0.7 },
                    ]}
                    onPress={() => handleDayPress(dayObj)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        selectedDate === dayObj.day && !dayObj.isOtherMonth && styles.selectedDayText,
                        dayObj.isOtherMonth && styles.otherMonthText,
                        statusColor && { color: COLORS.white }, // White text for better contrast
                      ]}
                    >
                      {dayObj.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: COLORS.warning || '#FFC107' }]} />
            <Text style={styles.legendText}>Pending</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: COLORS.error || '#F44336' }]} />
            <Text style={styles.legendText}>Cancelled</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: COLORS.success || '#4CAF50' }]} />
            <Text style={styles.legendText}>Confirmed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: COLORS.primary || '#2196F3' }]} />
            <Text style={styles.legendText}>In Session</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: COLORS.purple || '#9C27B0' }]} />
            <Text style={styles.legendText}>Completed</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.trackEventsButton}>
          <Text style={styles.trackEventsText}>View Appointments</Text>
        </TouchableOpacity>
      </View>
      {/* Tooltip Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Appointments for Day {selectedDate}</Text>
            {selectedDayAppointments.length === 0 ? (
              <Text style={styles.modalText}>No appointments for this day.</Text>
            ) : (
              selectedDayAppointments.map((appt, index) => (
                <View key={index} style={styles.appointmentItem}>
                  <Text style={styles.modalText}>
                    {new Date(appt.appointment_datetime).toLocaleTimeString()} - {appt.title || 'Consultation'} (Status: {appt.status})
                  </Text>
                </View>
              ))
            )}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Recent Activity</Text>
          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.activityChart}>
          {analyticsData.slice(0, 7).map((item, index) => (
            <View key={index} style={styles.activityBar}>
              <View style={[styles.activityBarFill, { height: `${item.value * 20}%` }]} />
              <Text style={styles.activityDay}>{item.name}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    scrollContainer: {
      flexGrow: 1,
      paddingBottom: 20,
    },
    customHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: COLORS.background,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: COLORS.textDark,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerButton: {
      padding: 4,
    },
    headerAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    headerProfileImage: {
      width: '100%',
      height: '100%',
    },
    subHeader: {
      padding: 16,
      backgroundColor: COLORS.background,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    searchRefreshContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    notificationContainer: {
      alignItems: 'flex-end',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.cardBackground,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      flex: 1,
      marginRight: 15,
    },
    searchPlaceholder: {
      marginLeft: 8,
      color: COLORS.textSecondary,
      fontSize: 14,
    },
    refreshButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.primaryLight,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    refreshText: {
      marginLeft: 6,
      color: COLORS.primary,
      fontSize: 12,
      fontWeight: '500',
    },
    headerBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    userSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: COLORS.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    avatarText: {
      color: COLORS.white,
      fontWeight: 'bold',
      fontSize: 12,
    },
    userName: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.textDark,
    },
    notificationBadge: {
      position: 'relative',
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: COLORS.error,
      borderRadius: 8,
      width: 16,
      height: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    badgeText: {
      color: COLORS.white,
      fontSize: 10,
      fontWeight: 'bold',
    },
    content: {
      padding: 20,
    },
    card: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: COLORS.textDark,
    },
    monthSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 5,
    },
    monthText: {
      marginHorizontal: 10,
      fontSize: 14,
      color: COLORS.textSecondary,
      fontWeight: '500',
    },
    conversionRate: {
      alignItems: 'flex-end',
    },
    metricLabel: {
      fontSize: 12,
      color: COLORS.textSecondary,
      marginBottom: 4,
    },
    rateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rateValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: COLORS.textDark,
      marginRight: 8,
    },
    rateChange: {
      backgroundColor: COLORS.success + '20',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    rateChangeText: {
      color: COLORS.success,
      fontSize: 12,
      fontWeight: '500',
    },
    chartContainer: {
      height: 200,
      marginBottom: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    chartScrollContainer: {
      marginBottom: -20,
    },
    chartWrapper: {
      paddingVertical: 8,
    },
    chart: {
      marginVertical: 8,
      borderRadius: 16,
    },
    noDataText: {
      color: COLORS.textSecondary,
      fontSize: 16,
      textAlign: 'center',
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    metricHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    metricTitle: {
      fontSize: 14,
      color: COLORS.textSecondary,
      fontWeight: '500',
    },
    viewDetails: {
      fontSize: 12,
      color: COLORS.primary,
    },
    metricValue: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    metricNumber: {
      fontSize: 20,
      fontWeight: 'bold',
      color: COLORS.textDark,
      marginRight: 8,
    },
    metricChange: {
      backgroundColor: COLORS.success + '20',
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
    },
    metricChangeNegative: {
      backgroundColor: COLORS.error + '20',
    },
    metricChangeText: {
      color: COLORS.success,
      fontSize: 10,
      fontWeight: '500',
    },
    metricChangeTextNegative: {
      color: COLORS.error,
      fontSize: 10,
      fontWeight: '500',
    },
    miniChart: {
      flexDirection: 'row',
      height: 30,
      alignItems: 'flex-end',
      gap: 2,
    },
    miniChartBar: {
      flex: 1,
      backgroundColor: COLORS.success,
      borderRadius: 2,
      minHeight: 10,
    },
    miniChartBarBlue: {
      backgroundColor: COLORS.primary,
    },
    miniChartBarGreen: {
      backgroundColor: COLORS.success,
    },
    miniChartBarTeal: {
      backgroundColor: COLORS.primaryTeal,
    },
    tableHeader: {
      flexDirection: 'row',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      marginBottom: 16,
    },
    tableHeaderText: {
      flex: 1,
      fontSize: 12,
      color: COLORS.textSecondary,
      fontWeight: '600',
      textAlign: 'center',
    },
    productRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    productInfo: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
    },
    productEmoji: {
      fontSize: 20,
      marginRight: 12,
    },
    productName: {
      fontSize: 14,
      color: COLORS.textDark,
      fontWeight: '500',
      flexShrink: 1,
    },
    productQuantity: {
      flex: 1,
      textAlign: 'center',
      fontSize: 14,
      color: COLORS.textDark,
      fontWeight: '600',
    },
    productSales: {
      flex: 1,
      textAlign: 'center',
      fontSize: 14,
      color: COLORS.textDark,
      fontWeight: '600',
    },
    actionButton: {
      flex: 1,
      alignItems: 'center',
    },
    actionButtonText: {
      fontSize: 12,
      color: COLORS.primary,
      fontWeight: '500',
    },
    rightColumn: {
      marginTop: 0,
    },
    calendarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    calendar: {
      marginBottom: 16,
    },
    calendarWeekdays: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    weekday: {
      fontSize: 12,
      color: COLORS.textSecondary,
      fontWeight: '600',
      width: 32,
      textAlign: 'center',
    },
    calendarWeek: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    calendarDay: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectedDay: {
      backgroundColor: COLORS.primary,
    },
    appointmentDay: {
      borderWidth: 2,
      borderColor: COLORS.success,
    },
    otherMonthDay: {
      opacity: 0.3,
    },
    dayText: {
      fontSize: 14,
      color: COLORS.textDark,
      fontWeight: '500',
    },
    selectedDayText: {
      color: COLORS.white,
      fontWeight: '600',
    },
    otherMonthText: {
      color: COLORS.textSecondary,
    },
    trackEventsButton: {
      backgroundColor: COLORS.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    trackEventsText: {
      color: COLORS.white,
      fontSize: 14,
      fontWeight: '600',
    },
    activityChart: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      height: 100,
    },
    activityBar: {
      alignItems: 'center',
      flex: 1,
    },
    activityBarFill: {
      width: 12,
      backgroundColor: COLORS.primary,
      borderRadius: 6,
      marginBottom: 8,
    },
    activityDay: {
      fontSize: 10,
      color: COLORS.textSecondary,
      fontWeight: '500',
    },
    carouselContainer: {
      marginBottom: 20,
    },
    carouselContent: {
      paddingHorizontal: 15,
      paddingVertical: 10,
    },
    metricCard: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: 16,
      padding: 16,
      width: cardWidth,
      marginHorizontal: 7.5,
    },
    pagination: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 10,
    },
    paginationDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: COLORS.textSecondary,
      marginHorizontal: 4,
    },
    paginationDotActive: {
      backgroundColor: COLORS.primary,
    },
    modalOverlay: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
},
modalContent: {
  backgroundColor: COLORS.cardBackground,
  borderRadius: 16,
  padding: 20,
  width: '80%',
  maxHeight: '70%',
},
modalTitle: {
  fontSize: 18,
  fontWeight: '600',
  color: COLORS.textDark,
  marginBottom: 15,
},
modalText: {
  fontSize: 14,
  color: COLORS.textDark,
  marginBottom: 10,
},
appointmentItem: {
  padding: 8,
  borderBottomWidth: 1,
  borderBottomColor: COLORS.border,
},
modalCloseButton: {
  backgroundColor: COLORS.primary,
  borderRadius: 12,
  paddingVertical: 10,
  alignItems: 'center',
  marginTop: 15,
},
modalCloseText: {
  color: COLORS.white,
  fontSize: 14,
  fontWeight: '600',
},
legendContainer: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  marginTop: 10,
  marginBottom: 15,
},
legendItem: {
  flexDirection: 'row',
  alignItems: 'center',
},
legendColor: {
  width: 12,
  height: 12,
  borderRadius: 2,
  marginRight: 5,
},
legendText: {
  fontSize: 12,
  color: COLORS.textSecondary,
  fontWeight: '500',
},
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderCustomHeader()}
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {renderAppointmentAnalytics()}
          {renderMetricsGrid()}
          {renderResources()}
          {renderRightColumn()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DashboardScreen;