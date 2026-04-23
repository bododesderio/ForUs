import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

const upcomingAppointments = [
  {
    id: 1,
    doctorName: "Dr. Sarah Wilson",
    specialty: "Cardiologist",
    date: "7 June",
    time: "9:00 AM",
    location: "Berlin, Kurfürstendamm 23",
    price: 35,
    status: "confirmed",
    image: "https://images.unsplash.com/photo-1594824475520-b9e8a5f2a8a5?w=400&h=400&fit=crop&crop=face"
  },
  {
    id: 2,
    doctorName: "Dr. Michael Chen",
    specialty: "Dermatologist",
    date: "8 June",
    time: "2:30 PM",
    location: "Munich, Maximilianstraße 15",
    price: 45,
    status: "pending",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face"
  }
  ,
  {
    id: 6,
    doctorName: "Dr. Michael Chen",
    specialty: "Dermatologist",
    date: "8 June",
    time: "2:30 PM",
    location: "Munich, Maximilianstraße 15",
    price: 45,
    status: "pending",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face"
  }
];

const pastAppointments = [
  {
    id: 3,
    doctorName: "Eleanor Padilla",
    specialty: "Dentist",
    date: "16 April",
    time: "2:00 PM",
    price: 45,
    status: "completed",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face"
  },
  {
    id: 4,
    doctorName: "Vinny Vang",
    specialty: "Oculist",
    date: "11 May",
    time: "9:00 AM",
    price: 25,
    status: "completed",
    image: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop&crop=face"
  },
  {
    id: 5,
    doctorName: "Dr. Emma Rodriguez",
    specialty: "General Practitioner",
    date: "3 May",
    time: "11:15 AM",
    price: 40,
    status: "completed",
    image: "https://images.unsplash.com/photo-1594824475520-b9e8a5f2a8a5?w=400&h=400&fit=crop&crop=face"
  }
];

export default function AppointmentsScreen() {
  const navigation = useNavigation();
  const { COLORS } = useTheme();
  const [activeTab, setActiveTab] = useState('upcoming');

  const handlePayPress = (appointment) => {
    Alert.alert(
      "Payment",
      `Proceed to pay ${appointment.price}$ for appointment with ${appointment.doctorName}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Pay Now", onPress: () => console.log("Payment processed") }
      ]
    );
  };

  const TabButton = ({ title, isActive, onPress, count }) => (
  <TouchableOpacity
    style={[styles.tabButton, isActive && styles.activeTabButton]}
    onPress={onPress}
  >
    <View style={styles.tabContent}>
      <Text style={[styles.tabText, isActive && styles.activeTabText]}>
        {title}
      </Text>
      {count > 0 && (
        <View style={[styles.badge, isActive && styles.activeBadge]}>
          <Text style={[styles.badgeText, isActive && styles.activeBadgeText]}>
            {count}
          </Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
);

const UpcomingAppointmentCard = ({ appointment, onPayPress }) => (
  <View style={styles.upcomingCard}>
    <View style={styles.cardHeader}>
      <Text style={styles.location}>{appointment.location}</Text>
    </View>
    
    <View style={styles.dateTimeContainer}>
      <Text style={styles.appointmentDate}>{appointment.date}</Text>
      <Text style={styles.appointmentTime}>{appointment.time}</Text>
    </View>
    
    <View style={styles.doctorSection}>
      <Image source={{ uri: appointment.image }} style={styles.doctorAvatar} />
      <View style={styles.doctorInfo}>
        <Text style={styles.doctorName}>{appointment.doctorName}</Text>
        <Text style={styles.specialty}>{appointment.specialty}</Text>
      </View>
    </View>
    
    <TouchableOpacity 
      style={styles.payButton}
      onPress={() => onPayPress(appointment)}
    >
      <Text style={styles.payButtonText}>Pay now • {appointment.price}$</Text>
      <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
    </TouchableOpacity>
  </View>
);

const PastAppointmentCard = ({ appointment }) => (
  <View style={styles.pastCard}>
    <Image source={{ uri: appointment.image }} style={styles.pastDoctorAvatar} />
    <View style={styles.pastDoctorInfo}>
      <Text style={styles.pastDoctorName}>{appointment.doctorName}</Text>
      <Text style={styles.pastAppointmentDetails}>
        {appointment.specialty} — {appointment.date} • {appointment.time}
      </Text>
    </View>
    <View style={styles.pastPriceContainer}>
      <Text style={styles.pastPrice}>{appointment.price}$</Text>
    </View>
  </View>
);

const FeedbackBanner = () => (
  <View style={styles.feedbackBanner}>
    <View style={styles.feedbackContent}>
      <Text style={styles.feedbackTitle}>Feedback for</Text>
      <Text style={styles.feedbackSubtitle}>50 VITAMINS</Text>
    </View>
    <View style={styles.feedbackIcon}>
      <TouchableOpacity style={styles.feedbackArrow}>
        <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  </View>
);

  const renderTabContent = () => {
    if (activeTab === 'upcoming') {
      return (
        <View style={styles.tabContent}>
          {upcomingAppointments.map((appointment) => (
            <UpcomingAppointmentCard
              key={appointment.id}
              appointment={appointment}
              onPayPress={handlePayPress}
            />
          ))}
        </View>
      );
    } else {
      return (
        <View style={styles.tabContent}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Past</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          
          {pastAppointments.map((appointment) => (
            <PastAppointmentCard
              key={appointment.id}
              appointment={appointment}
            />
          ))}
          
          <FeedbackBanner />
        </View>
      );
    }
  };

  const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  moreButton: {
    padding: 8,
    marginRight: -8,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.lightGrey,
  },
  activeTabButton: {
    backgroundColor: COLORS.selectedTab,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.inactiveTab,
    textAlign: 'center',
  },
  activeTabText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  activeBadge: {
    backgroundColor: COLORS.white,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.selectedTab,
  },
  activeBadgeText: {
    color: COLORS.selectedTab,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  tabContent: {
    gap: 16,
  },
  
  // Upcoming appointment card styles
  upcomingCard: {
    backgroundColor: COLORS.textDark,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    marginBottom: 8,
  },
  location: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.8,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
    gap: 16,
  },
  appointmentDate: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '700',
  },
  appointmentTime: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '700',
  },
  doctorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  doctorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  specialty: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.7,
  },
  payButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Past appointment card styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  pastCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  pastDoctorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  pastDoctorInfo: {
    flex: 1,
  },
  pastDoctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  pastAppointmentDetails: {
    fontSize: 14,
    color: COLORS.grey,
  },
  pastPriceContainer: {
    backgroundColor: COLORS.textDark,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pastPrice: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Feedback banner styles
  feedbackBanner: {
    backgroundColor: 'linear-gradient(135deg, #ff9a56, #ff6b6b)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    // Fallback for React Native
    backgroundColor: '#ff8a65',
  },
  feedbackContent: {
    flex: 1,
  },
  feedbackTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  feedbackSubtitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  feedbackIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackArrow: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 8,
  },
});

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Appointment</Text>
        
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TabButton
          title="Upcoming"
          isActive={activeTab === 'upcoming'}
          onPress={() => setActiveTab('upcoming')}
          count={upcomingAppointments.length}
        />
        <TabButton
          title="Past"
          isActive={activeTab === 'past'}
          onPress={() => setActiveTab('past')}
          count={0}
        />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
}