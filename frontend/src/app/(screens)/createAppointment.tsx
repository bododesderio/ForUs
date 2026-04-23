import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { useConsultant } from '../../context/consultantContext';
import generateTimeSlots from '../../helper/timeSlot';
import RenderTimeSlot, { TimeSlot } from '../../components/TimeSlot';
import { createAppointment, getConsultantAppointments, getDateRange, sendPushNotificationToConsultant } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';


// Calendar utility functions
const getMonthNames = () => [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1).getDay();
  return firstDay === 0 ? 6 : firstDay - 1; // Convert Sunday (0) to be 6, Monday (1) to be 0
};

const isDateInPast = (year: number, month: number, day: number) => {
  const today = new Date();
  const checkDate = new Date(year, month, day);
  today.setHours(0, 0, 0, 0);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
};

const isToday = (year: number, month: number, day: number) => {
  const today = new Date();
  return today.getFullYear() === year && 
        today.getMonth() === month && 
        today.getDate() === day;
};

const formatDate = (year: number, month: number, day: number) => {
  return `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`;
};

const generateCalendarDays = (year: number, month: number) => {
  const days = [];
  const daysInMonth = getDaysInMonth(year, month);
  const startDay = getFirstDayOfMonth(year, month);

  // Add empty cells for days before month starts
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = date.getDay().toString().padStart(2, '0');
    const fullDate = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    days.push({
      day,
      fullDate,
      date: dateStr,
      isPast: isDateInPast(year, month, day),
      isToday: isToday(year, month, day),
      isAvailable: true, // Default, updated by updateDateAvailability
      bookedSlots: [],  // Default, updated by updateDateAvailability
    });
  }

  return days;
};

const practitioner = {
  name: "Dr. Claire Jenkins",
  specialty: "General practitioners",
  profilePicture: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face",
  price: 80
};

// Types for calendar and time slot
interface CalendarDay {
  day: number;
  fullDate: string;
  date: string;
  isPast: boolean;
  isToday: boolean;
  isAvailable: boolean;
  bookedSlots: string[];
}

const moodMessages = [
  'We all have tough days. Remember, you are not alone.',
  'Hang in there. Better days are coming.',
  'Take a deep breath. You are doing your best.',
  'It’s okay to feel down sometimes. Be kind to yourself.',
  'You are stronger than you think.',
  'Keep going, you are making progress.',
  'You’re doing well. Celebrate small wins.',
  'Great job! Keep up the positive energy.',
  'You’re shining bright today!',
  'Amazing! Spread your positivity!',
];
const getTodayString = () => new Date().toISOString().split('T')[0];

export default function AppointmentScheduleScreen() {
  const { selectedConsultant, appointmentData, updateAppointmentData, clearConsultant } = useConsultant();
  const navigation = useNavigation();
  const { COLORS } = useTheme();
  
  // Initialize with current date
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<CalendarDay | null>(null);
  const [selectedTime, setSelectedTime] = useState("12:30 PM");
  const [reasonForVisit, setReasonForVisit] = useState("I have been experiencing persistent headaches for several days, and they do not improve with over-the-counter pain relievers.");
  
  const monthNames = getMonthNames();
  const calendarDays = generateCalendarDays(currentYear, currentMonth);
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const timeSlots = generateTimeSlots(selectedConsultant.available_from, selectedConsultant.available_to, 90);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
  const [isBookingAppointment, setIsBookingAppointment] = useState(false);
  const [bookedAppointments, setBookedAppointments] = useState([]);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(1);
  const [availableDates, setAvailableDates] = useState<(CalendarDay | null)[]>(calendarDays);
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [selectedMoodValue, setSelectedMoodValue] = useState<number | null>(null);
  const [moodMessage, setMoodMessage] = useState('');

  // Auto-update calendar every minute to handle date changes
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      // Only update if the date has actually changed
      if (now.getDate() !== today.getDate() || 
          now.getMonth() !== today.getMonth() || 
          now.getFullYear() !== today.getFullYear()) {
        // Force re-render by updating state
        setCurrentYear(now.getFullYear());
        setCurrentMonth(now.getMonth());
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Fetch existing appointments for the consultant
  const fetchConsultantAppointments = async () => {
      if (!selectedConsultant?.id) return;
      
      try {
          setIsLoadingAvailability(true);
          
          // Get next 30 days date range
          const dateRange = getDateRange(30);
          
          // Fetch both confirmed and blocked slots
          const response = await getConsultantAppointments(
              selectedConsultant.id,
              {
                  date_from: dateRange.from,
                  date_to: dateRange.to,
                  status: 'confirmed,blocked' // <-- include blocked
              }
          );

          console.log(response)
          
          if (response.success) {
              setBookedAppointments(response.appointments || []);
              updateDateAvailability(response.appointments || []);
          } else {
              console.error('Failed to fetch appointments:', response.message);
              Alert.alert('Error', 'Failed to load appointment availability');
          }
      } catch (error) {
          console.error('Error fetching appointments:', error);
          Alert.alert('Error', 'Failed to load appointment availability');
      } finally {
          setIsLoadingAvailability(false);
      }
  };

  // Helper function to convert 12-hour format to 24-hour format
  const convertTo24Hour = (time12h: string): string => {
    let [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
    return `${hours.padStart(2, '0')}:${minutes}`;
  };

  // Updated function to handle timezone and time format issues
  const updateDateAvailability = (appointments: any[]): void => {
    console.log('Total appointments received:', appointments.length);

    const updatedDates = availableDates.map((dateInfo) => {
      if (!dateInfo) {
        return dateInfo;
      }

      const appointmentsOnDate = appointments.filter((apt) => {
        let appointmentDate;
        const utcDate = new Date(apt.appointment_datetime);
        const year = utcDate.getFullYear();
        const month = (utcDate.getMonth() + 1).toString().padStart(2, '0');
        const day = utcDate.getDate().toString().padStart(2, '0');
        appointmentDate = `${year}-${month}-${day}`;
        
        return appointmentDate === dateInfo.fullDate;
      });

      console.log(`Date ${dateInfo.fullDate}: ${appointmentsOnDate.length} appointments found`);

      // Mark both confirmed and blocked slots as unavailable
      const unavailableTimesIn24Hour = appointmentsOnDate
        .filter((apt) => apt.status === 'confirmed' || apt.status === 'blocked')
        .map((apt) => {
          if (!apt.appointment_datetime) return null;
          const localDate = new Date(apt.appointment_datetime);
          const hours = localDate.getHours().toString().padStart(2, '0');
          const minutes = localDate.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        })
        .filter((time) => time !== null);

      const timeSlotsIn24Hour = timeSlots.map((slot) => convertTo24Hour(slot.time));
      console.log(`Available time slots (24h format):`, timeSlotsIn24Hour);

      const availableSlots = timeSlots.filter((slot, index) => {
        const slot24h = timeSlotsIn24Hour[index];
        const isUnavailable = unavailableTimesIn24Hour.includes(slot24h);
        console.log(`Slot ${slot.time} (${slot24h}) is ${isUnavailable ? 'UNAVAILABLE' : 'AVAILABLE'}`);
        return !isUnavailable;
      });

      const isDateAvailable = availableSlots.length > 0;

      console.log(
        `Date ${dateInfo.fullDate}: ${availableSlots.length}/${timeSlots.length} slots available, isAvailable: ${isDateAvailable}`
      );

      return {
        ...dateInfo,
        isAvailable: isDateAvailable,
        bookedSlots: unavailableTimesIn24Hour,
      };
    });

    setAvailableDates(updatedDates as (CalendarDay | null)[]);
  };

  // Get available time slots for selected date
  const getAvailableTimeSlots = (): TimeSlot[] => {
    const selectedDateObj = availableDates[selectedDateIndex];
    if (!selectedDateObj) return timeSlots;
    // Mark both confirmed and blocked as booked/unavailable
    const unavailableTimes = bookedAppointments
      .filter((apt: any) => {
        let appointmentDate;
        const localDate = new Date(apt.appointment_datetime);
        const year = localDate.getFullYear();
        const month = (localDate.getMonth() + 1).toString().padStart(2, '0');
        const day = localDate.getDate().toString().padStart(2, '0');
        appointmentDate = `${year}-${month}-${day}`;
        return appointmentDate === selectedDateObj.fullDate && (apt.status === 'confirmed' || apt.status === 'blocked');
      })
      .map((apt: any) => {
        const localDate = new Date(apt.appointment_datetime);
        const hours = localDate.getHours().toString().padStart(2, '0');
        const minutes = localDate.getMinutes().toString().padStart(2, '0');
        return {
          time: `${hours}:${minutes}`,
          isBlocked: apt.status === 'blocked',
        };
      });
    return timeSlots.map((slot, index) => {
      const slot24h = convertTo24Hour(slot.time);
      const match = unavailableTimes.find((t) => t.time === slot24h);
      return {
        ...slot,
        isBooked: !!match,
        isBlocked: match ? match.isBlocked : false,
      };
    });
  };

  const handleDateSelect = (dayObj: CalendarDay, index: number) => {
    if (dayObj && !dayObj.isPast && dayObj.isAvailable) {
      setSelectedDateIndex(index);
      setSelectedTimeIndex(0);
      setSelectedDate(dayObj);
      updateAppointmentData({
        selectedDate: dayObj,
        selectedFullDate: dayObj.fullDate,
      });
    } else {
      Alert.alert('Unavailable', 'No appointments available on this date');
    }
  };

  const handleTimeSelect = (time: string, index: number) => {
    const availableSlots = getAvailableTimeSlots();
    const selectedSlot = availableSlots[index];
    if (selectedSlot && selectedSlot.isBooked) {
      Alert.alert('Unavailable', 'This time slot is already booked');
      return;
    }
    setSelectedTime(time);
    setSelectedTimeIndex(index);
    updateAppointmentData({ selectedTime: selectedSlot.time });
  };

  const navigateMonth = (direction: number) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    const today = new Date();
    const targetDate = new Date(newYear, newMonth, 1);
    const currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
    if (targetDate >= currentDate) {
      setCurrentMonth(newMonth);
      setCurrentYear(newYear);
      // Clear selected date if it's no longer valid in the new month
      if (selectedDate && selectedDate.fullDate) {
        const [selYear, selMonth] = selectedDate.fullDate.split('-');
        if (parseInt(selYear) !== newYear || parseInt(selMonth) - 1 !== newMonth) {
          setSelectedDate(null);
          updateAppointmentData({ selectedDate: null });
        }
      }
    }
  };

  const handleBookAppointment = async () => {
      const selectedDateObj = availableDates[selectedDateIndex];
      const availableSlots = getAvailableTimeSlots();
      const selectedTimeObj = availableSlots[selectedTimeIndex];
      if (!selectedDateObj) {
        Alert.alert('Error', 'No date selected');
        return;
      }
      if (!selectedDateObj.isAvailable) {
        Alert.alert('Error', 'Selected date is not available');
        return;
      }
      if (!selectedTimeObj) {
        Alert.alert('Error', 'No time selected');
        return;
      }
      if (selectedTimeObj.isBooked) {
        Alert.alert('Error', 'Selected time slot is already booked');
        return;
      }
      if (!selectedConsultant?.id) {
        Alert.alert('Error', 'No consultant selected');
        return;
      }

      // Combine selected date and time into a single UTC ISO string
      // selectedDateObj.fullDate: YYYY-MM-DD, selectedTimeObj.time: e.g. "12:30 PM"
      const [year, month, day] = selectedDateObj.fullDate.split('-');
      const time24h = convertTo24Hour(selectedTimeObj.time); // HH:mm
      const [hours, minutes] = time24h.split(":");
      // Create a Date object in local time, then convert to UTC ISO string
      const localDate = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours),
        Number(minutes),
        0,
        0
      );
      const appointment_datetime = localDate.toISOString(); // always UTC

      // Prepare appointment data for API
      const appointmentData = {
        consultant_id: selectedConsultant.id,
        title: `Consultation with ${selectedConsultant.first_name} ${selectedConsultant.last_name}`,
        description: reasonForVisit,
        appointment_datetime, // UTC ISO string
        duration_minutes: 90,
        mood: selectedMoodValue // <-- include mood in appointment
      };

      try {
        setIsBookingAppointment(true);
        const response = await createAppointment(appointmentData);
        if (response.success) {
          updateAppointmentData({
            appointment_datetime,
            consultantId: selectedConsultant.id,
            appointmentId: response.appointment.id
          });
          // Send push notification to consultant
          try {
            await sendPushNotificationToConsultant(
              selectedConsultant.id,
              'New Appointment Booked',
              `You have a new appointment with a patient on ${selectedDateObj.fullDate} at ${selectedTimeObj.time}.`,
              {
                appointmentId: response.appointment?.id,
                date: selectedDateObj.fullDate,
                time: selectedTimeObj.time,
              }
            );
          } catch (notifyErr) {
            console.warn('Failed to send push notification to consultant:', notifyErr);
          }
          Alert.alert(
            'Appointment Booked!',
            `Your appointment with ${selectedConsultant.first_name} ${selectedConsultant.last_name} has been scheduled for ${selectedDateObj.fullDate} at ${selectedTimeObj.time}`,
            [
              {
                text: 'OK',
                onPress: () => {
                  fetchConsultantAppointments();
                  router.push("/(users)/schedule");
                }
              }
            ]
          );
        } else {
          Alert.alert('Booking Failed', response.message || 'Failed to book appointment');
        }
      } catch (error) {
        console.error('Error booking appointment:', error);
        Alert.alert('Error', 'Failed to book appointment. Please try again.');
      } finally {
        setIsBookingAppointment(false);
      }
  };

  const renderCalendarDay = (dayObj: CalendarDay | null, index: number) => {
    if (!dayObj) {
      return <View key={index} style={styles.calendarDay} />;
    }

    const isSelected = selectedDate && (selectedDate as CalendarDay).day === dayObj.day;
    const isUnavailable = !dayObj.isAvailable && !dayObj.isPast;

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.calendarDay,
          isSelected && styles.selectedDay,
          dayObj.isToday && !isSelected && styles.todayDay,
          dayObj.isPast && styles.pastDay,
          isUnavailable && styles.unavailableDateCard,
        ]}
        onPress={() => handleDateSelect(dayObj, index)}
        disabled={dayObj.isPast || !dayObj.isAvailable}
      >
        <Text
          style={[
            styles.calendarDayText,
            isSelected && styles.selectedDayText,
            dayObj.isToday && !isSelected && styles.todayDayText,
            dayObj.isPast && styles.pastDayText,
            isUnavailable && styles.unavailableDateText,
          ]}
        >
          {dayObj.day}
        </Text>
        {isUnavailable && (
          <View style={styles.unavailableBadge}>
            <Text style={styles.unavailableBadgeText}>Full</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Check if we can navigate to previous month
  const canNavigatePrevious = () => {
    const today = new Date();
    const prevMonth = currentMonth - 1;
    const prevYear = prevMonth < 0 ? currentYear - 1 : currentYear;
    const targetMonth = prevMonth < 0 ? 11 : prevMonth;
    
    return new Date(prevYear, targetMonth, 1) >= new Date(today.getFullYear(), today.getMonth(), 1);
  };

  // Fetch appointments when component mounts
  useEffect(() => {
      if (!selectedConsultant) {
          console.warn('No consultant selected, using default data');
          setIsLoadingAvailability(false);
          return;
      }
      
      fetchConsultantAppointments();
  }, [selectedConsultant]);

  // Re-fetch when dates change (for real-time updates)
  useEffect(() => {
    const interval = setInterval(() => {
      const newDates = generateCalendarDays(currentYear, currentMonth);
      setAvailableDates(newDates);
      if (selectedConsultant?.id) {
        fetchConsultantAppointments();
      }
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [selectedConsultant, currentYear, currentMonth]);

  // Only show mood modal if no mood is set
  useEffect(() => {
    if (selectedMoodValue === null) {
      setMoodModalVisible(true);
    }
  }, [selectedMoodValue]);

  // Save mood selection (local only)
  const handleMoodSelect = (value: number) => {
    setSelectedMoodValue(value);
    setMoodMessage(moodMessages[value - 1]);
    setMoodModalVisible(false);
  };

  const availableSlots = getAvailableTimeSlots();

  const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 30,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 12,
    marginRight: 16,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    marginTop: -20,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.infoBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.textDark,
    lineHeight: 20,
  },
  infoHighlight: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  doctorCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  doctorImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  doctorSpecialty: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.8,
  },
  appointmentTimeInfo: {
    alignItems: 'flex-end',
  },
  appointmentTime: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  appointmentDate: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.8,
  },
  calendarContainer: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  monthNavigation: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    padding: 8,
  },
  disabledNavButton: {
    opacity: 0.3,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  weekDayText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedDay: {
    backgroundColor: COLORS.selectedDate,
    borderRadius: 20,
  },
  todayDay: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
  },
  pastDay: {
    backgroundColor: COLORS.pastDateBackground,
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 16,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  selectedDayText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  todayDayText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  pastDayText: {
    color: COLORS.disabledText,
    fontWeight: '400',
  },
  timeContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 16,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonContainer: {
    marginBottom: 24,
  },
  bottomPadding: {
    height: 120, // Space for fixed bottom container
  },
  fixedBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    padding: 20,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    gap: 16,
  },
  reasonInput: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.textDark,
    textAlignVertical: 'top',
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bottomContainer: {
    gap: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  appointmentDetails: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bookButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  unavailableDateCard: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  unavailableDateText: {
    color: '#999',
  },
  unavailableBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff4444',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  unavailableBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  moodBar: {
    width: '100%',
    height: 40,
    backgroundColor: COLORS.lightGrey,
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  moodBarSection: {
    flex: 1,
    height: '100%',
  },
  moodLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  moodLabelText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  selectedMoodText: {
    textAlign: 'center',
    marginTop: 16,
    color: COLORS.textDark,
    fontSize: 16,
    fontWeight: '600',
  },
  moodMessageText: {
    textAlign: 'center',
    marginTop: 8,
    color: COLORS.primary,
    fontSize: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 16,
  },
  moodOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 16,
  },
  moodOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    margin: 4,
  },
  selectedMoodOption: {
    backgroundColor: COLORS.primary,
  },
  moodOptionText: {
    fontSize: 16,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  moodMessage: {
    fontSize: 14,
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 16,
  },
  closeModalButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Schedule Your Appointment</Text>
        </View>
      </View>

      <View style={styles.mainContent}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            
            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>
                If you do not attend the consultation, it will be{' '}
                <Text style={styles.infoHighlight}>canceled 10 minutes after</Text> it starts, and no refund will be provided.
              </Text>
            </View>

            {/* Doctor Info Card */}
            <View style={styles.doctorCard}>
              <Image 
                source={{ uri: selectedConsultant?.profile_image || practitioner.profilePicture }}
                style={styles.doctorImage}
              />
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>
                  {selectedConsultant ? `${selectedConsultant.first_name} ${selectedConsultant.last_name}` : practitioner.name}
                </Text>
                <Text style={styles.doctorSpecialty}>
                  {selectedConsultant?.profession || practitioner.specialty}
                </Text>
              </View>
              <View style={styles.appointmentTimeInfo}>
                <Text style={styles.appointmentTime}>{selectedTime}</Text>
                <Text style={styles.appointmentDate}>
                  {selectedDate ? selectedDate.fullDate : 'Select date'}
                </Text>
              </View>
            </View>

            {/* Enhanced Calendar */}
            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeader}>
                <Text style={styles.monthYear}>
                  {monthNames[currentMonth]} {currentYear}
                </Text>
                <View style={styles.monthNavigation}>
                  <TouchableOpacity 
                    style={[styles.navButton, !canNavigatePrevious() && styles.disabledNavButton]}
                    onPress={() => navigateMonth(-1)}
                    disabled={!canNavigatePrevious()}
                  >
                    <Ionicons 
                      name="chevron-back" 
                      size={20} 
                      color={canNavigatePrevious() ? COLORS.textDark : COLORS.disabledText} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.navButton} onPress={() => navigateMonth(1)}>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textDark} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.weekDaysContainer}>
                {weekDays.map((day, index) => (
                  <Text key={index} style={styles.weekDayText}>{day}</Text>
                ))}
              </View>
              
              <View style={styles.calendarGrid}>
                {calendarDays.map((dayObj, index) => renderCalendarDay(dayObj, index))}
              </View>
            </View>

            {/* Time Selection */}
            <View style={styles.timeContainer}>
              <Text style={styles.sectionTitle}>Time</Text>
              {isLoadingAvailability ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <View style={styles.timeSlotsGrid}>
                  {availableSlots.map((timeSlot, index) => <RenderTimeSlot key={index} timeSlot={timeSlot} index={index} selectedTime={selectedTime} handleTimeSelect={handleTimeSelect} />)}
                </View>
              )}
            </View>

            {/* Reason for Visit */}
            <View style={styles.reasonContainer}>
              <Text style={styles.sectionTitle}>Describe a reason for visit</Text>
              <TextInput
                style={styles.reasonInput}
                multiline
                value={reasonForVisit}
                onChangeText={setReasonForVisit}
                placeholder="Describe your symptoms or reason for the visit..."
                placeholderTextColor={COLORS.placeholderText}
              />
            </View>
            
            {/* Add bottom padding to prevent content from being hidden behind fixed bottom */}
            <View style={styles.bottomPadding} />
          </View>
        </ScrollView>

        {/* Fixed Bottom Container */}
        <View style={styles.fixedBottomContainer}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>{practitioner.price},00 USD</Text>
            <Text style={styles.appointmentDetails}>
              {selectedTime}, {selectedDate ? selectedDate.fullDate : 'No date selected'}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.bookButton} onPress={handleBookAppointment}>
            <Text style={styles.bookButtonText}>Book now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mood Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={moodModalVisible}
        onRequestClose={() => setMoodModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>How do you feel today?</Text>
            <Text style={{ color: COLORS.textSecondary, marginBottom: 20 }}>Slide to set your mood</Text>
            <View style={{ width: '100%', marginBottom: 20 }}>
              {/* Mood Bar Container */}
              <View style={styles.moodBar}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.moodBarSection,
                      {
                        backgroundColor: i < 2 ? '#FF6B6B' : 
                                       i < 4 ? '#FFD93D' :
                                       i < 6 ? '#6BCB77' :
                                       i < 8 ? '#4D96FF' :
                                       '#9B72AA',
                        opacity: selectedMoodValue && i < selectedMoodValue ? 1 : 0.3,
                      }
                    ]}
                    onPress={() => handleMoodSelect(i + 1)}
                  />
                ))}
              </View>
              
              <View style={styles.moodLabels}>
                <Text style={styles.moodLabelText}>Not well</Text>
                <Text style={styles.moodLabelText}>Very well</Text>
              </View>
              
              {selectedMoodValue && (
                <View>
                  <Text style={styles.selectedMoodText}>
                    {selectedMoodValue}/10
                  </Text>
                  <Text style={styles.moodMessageText}>
                    {moodMessage}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.closeModalButton} onPress={() => setMoodModalVisible(false)}>
              <Text style={styles.closeModalButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
    </SafeAreaView>
  );
}
