import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal, TextInput, Alert } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import ScheduleAppointmentCard from '../../components/consultants/ScheduleAppointmentCard';
import SchedulePastAppointment from '../../components/consultants/SchedulePastAppointment';
import SchedulePendingAppointment from '../../components/consultants/SchedulePendingAppointment';
import BlockTimeModal from '../../components/consultants/BlockTimeModal';
import { router } from 'expo-router';
import { getConsultantAppointments, blockConsultantSlot, confirmAppointment as apiConfirmAppointment, rejectAppointment as apiRejectAppointment, rescheduleAppointment as apiRescheduleAppointment, cancelAppointment as apiCancelAppointment } from '../../services/api';
import { useAuth } from '../../context/authContext';
import generateTimeSlots from '../../helper/timeSlot';

const { width: screenWidth } = Dimensions.get('window');

type CalendarDate = {
    date: Date;
    day: string;
    isToday: boolean;
    appointmentCount: number;
};

type TimeSlot = {
    id: string;
    start: string;
    end: string;
    status: string;
    [key: string]: any;
};

// Define types for appointments
interface Appointment {
    id: string | number;
    appointment_datetime: string;
    // ...other fields as needed
}

// Fix 1: Type useAuth return
interface AuthUser {
    id: string | number;
    [key: string]: any;
}
interface AuthContext {
    user?: AuthUser;
    [key: string]: any;
}

const ScheduleScreen = () => {
    const auth = useAuth() as AuthContext;
    const { COLORS, mode } = useTheme();
    const user = auth?.user;
    const consultantId = user?.id;
    const today = new Date();
    const [selectedDate, setSelectedDate] = useState<Date>(today);
    const [calendarDates, setCalendarDates] = useState<CalendarDate[]>([]);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [activeTab, setActiveTab] = useState('today');
    const [showBlockTimeModal, setShowBlockTimeModal] = useState(false);
    const [blockTimeData, setBlockTimeData] = useState({ time: '', duration: '' });
    const [viewMode, setViewMode] = useState('list'); // list or timeline
    // Define state for pending and past appointments
    const [pendingList, setPendingList] = useState<Appointment[]>([]);
    const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
    // --- Week View State ---
    const [weekDates, setWeekDates] = useState<CalendarDate[]>([]);
    const [weekAppointments, setWeekAppointments] = useState<{ [date: string]: Appointment[] }>({});

    const tabs = [
        { id: 'today', label: 'Today', icon: 'today' },
        { id: 'pending', label: 'Pending', icon: 'hourglass' },
        { id: 'week', label: 'This Week', icon: 'calendar' },
        { id: 'history', label: 'History', icon: 'time' },
    ];

    const statusBarStyle = mode === 'dark' || COLORS.background === '#000' ? 'light' : 'dark';

    // Add functions to handle pending appointment actions
    const confirmAppointment = async (appointmentId: string | number) => {
        try {
            await apiConfirmAppointment(appointmentId);
            setPendingList(prev => prev.filter(apt => String(apt.id) !== String(appointmentId)));
        } catch (error) {
            // Optionally show error to user
            console.error('Failed to confirm appointment:', error);
        }
    };

    const rejectAppointment = async (appointmentId: string | number) => {
        try {
            await apiRejectAppointment(appointmentId);
            setPendingList(prev => prev.filter(apt => String(apt.id) !== String(appointmentId)));
        } catch (error) {
            // Optionally show error to user
            console.error('Failed to reject appointment:', error);
        }
    };

    // In ScheduleScreen, update handlePatientDetails to accept appointment and navigate with params
const handlePatientDetails = (appointment: Appointment) => {
    router.push({
        pathname: '/(screens)/consultants/patientDetailsScreen',
        params: { patient: JSON.stringify(appointment) }
    });
}

    // Move formatDate above its first usage
    // Helper to format date for API (YYYY-MM-DD)
    const formatDate = (date: Date): string => {
        return date.toISOString().split('T')[0];
    };

    // Helper to parse 12h/24h time string to Date object for a given day
    const parseTimeToDate = (baseDate: Date, timeStr: string) => {
        // Accepts '09:00 AM' or '17:00' or '17:00 PM'
        let [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        hours = hours.padStart(2, '0');
        if (modifier) {
            if (hours === '12') hours = '00';
            if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
        }
        const d = new Date(baseDate);
        d.setHours(Number(hours), Number(minutes), 0, 0);
        return d;
    };

    // Generate calendar dates for the week (centered on selectedDate)
    useEffect(() => {
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dates: CalendarDate[] = [];
        for (let i = -2; i <= 2; i++) {
            const d = new Date(selectedDate);
            d.setDate(selectedDate.getDate() + i);
            dates.push({
                date: d,
                day: daysOfWeek[d.getDay()],
                isToday: d.toDateString() === (new Date()).toDateString(),
                appointmentCount: 0
            });
        }
        setCalendarDates(dates);
    }, [selectedDate]);

    // Fetch timeslots for selected date
    const fetchTimeSlots = useCallback(async (date: Date) => {
        if (!consultantId) return;
        try {
            // Use selectedDate as base for slot generation
            // Use 24-hour format directly from DB
            const available_from = user?.available_from || '09:00';
            const available_to = user?.available_to || '17:00';
            const slotDuration = 90;
            const allSlots = generateTimeSlots(available_from, available_to, slotDuration);

            // Fetch all appointments for the selected date (confirmed and blocked)
            const filters = { date: formatDate(date) };
            const result = await getConsultantAppointments(consultantId, filters);
            let bookedAppointments: any[] = [];
            let blockedAppointments: any[] = [];
            if (result.success && result.appointments) {
                bookedAppointments = result.appointments
                    .filter((apt: any) => apt.status === 'confirmed')
                    .map((apt: any) => {
                        // Convert backend UTC appointment time to local time string (HH:mm)
                        const localDate = new Date(apt.appointment_datetime);
                        const hours = localDate.getHours().toString().padStart(2, '0');
                        const minutes = localDate.getMinutes().toString().padStart(2, '0');
                        return {
                            ...apt,
                            localTime: `${hours}:${minutes}`
                        };
                    });
                blockedAppointments = result.appointments
                    .filter((apt: any) => apt.status === 'blocked')
                    .map((apt: any) => {
                        const localDate = new Date(apt.appointment_datetime);
                        const hours = localDate.getHours().toString().padStart(2, '0');
                        const minutes = localDate.getMinutes().toString().padStart(2, '0');
                        return {
                            ...apt,
                            localTime: `${hours}:${minutes}`
                        };
                    });
            }
            const bookedTimes = bookedAppointments.map(apt => apt.localTime);
            const blockedTimes = blockedAppointments.map(apt => apt.localTime);

            console.log('All appointments:', result.appointments);
            console.log('Blocked appointments:', blockedAppointments);

            // Mark slots as booked or blocked if they match an appointment (local time)
        
            const slotsWithStatus = allSlots.map((slot: any) => {
                const slotDate = parseTimeToDate(date, slot.time);
                const slotLocal = `${slotDate.getHours().toString().padStart(2, '0')}:${slotDate.getMinutes().toString().padStart(2, '0')}`;
                const blockedApt = blockedAppointments.find(apt => apt.localTime === slotLocal);
                console.log('Blocked appointment: ', blockedApt)
                console.log('Slot time:', slot.time, 'Slot local:', slotLocal);
                console.log('Blocked localTimes:', blockedAppointments.map(b => b.localTime));
                if (blockedApt) {
                    return {
                        ...slot,
                        status: 'blocked',
                        isBooked: false,
                        appointment: null,
                        reason: blockedApt.reason || undefined,
                    };
                }
                const apt = bookedAppointments.find(apt => apt.localTime === slotLocal);
                const isBooked = Boolean(apt);
                return {
                    ...slot,
                    status: isBooked ? 'occupied' : 'available',
                    isBooked,
                    appointment: apt || null,
                };
            });
            setTimeSlots(slotsWithStatus);
            setCalendarDates(prev => prev.map(item =>
                formatDate(item.date) === formatDate(date)
                    ? { ...item, appointmentCount: slotsWithStatus.filter(s => s.isBooked).length }
                    : item
            ));
        } catch (e) {
            setTimeSlots([]);
        }
    }, [consultantId, user]);

    // Fetch timeslots when selectedDate changes
    useEffect(() => {
        if (selectedDate) {
            fetchTimeSlots(selectedDate);
        }
    }, [selectedDate, fetchTimeSlots]);

    useEffect(() => {
    console.log('Fetched time slots:', timeSlots);
}, [timeSlots]);

    // Update selectedDate when user taps a calendar date
    const handleCalendarDatePress = (dateObj: CalendarDate) => {
        setSelectedDate(dateObj.date);
    };

    const renderTabBar = () => (
        <View style={styles.tabContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.id}
                        style={[
                            styles.tab,
                            activeTab === tab.id && styles.activeTab
                        ]}
                        onPress={() => setActiveTab(tab.id)}
                    >
                        <Ionicons 
                            name={tab.icon as any} 
                            size={18} 
                            color={activeTab === tab.id ? COLORS.primary : COLORS.textSecondary} 
                        />
                        <Text style={[
                            styles.tabText,
                            activeTab === tab.id && styles.activeTabText
                        ]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    // Update renderCalendarDate to highlight selected and today differently
    const renderCalendarDate = (item: CalendarDate) => {
        const isSelected = formatDate(item.date) === formatDate(selectedDate);
        const isToday = item.isToday;
        return (
            <TouchableOpacity
                key={item.date.toISOString()}
                style={[
                    styles.calendarDateContainer,
                    isSelected && styles.calendarDateActive,
                    !isSelected && isToday && styles.calendarDateToday // lighter color for today if not selected
                ]}
                onPress={() => handleCalendarDatePress(item)}
            >
                <View style={[
                    styles.dateCircle,
                    isSelected && styles.dateCircleActive,
                    !isSelected && isToday && styles.dateCircleToday
                ]}>
                    <Text style={[
                        styles.calendarDate,
                        isSelected && styles.calendarDateActiveText,
                        !isSelected && isToday && styles.calendarDateTodayText
                    ]}>
                        {item.date.getDate()}
                    </Text>
                </View>
                <Text style={[
                    styles.calendarDay,
                    isSelected && styles.calendarDayActiveText,
                    !isSelected && isToday && styles.calendarDayTodayText
                ]}>
                    {item.day}
                </Text>
                <View style={styles.appointmentDots}>
                    {Array.from({ length: Math.min(item.appointmentCount, 4) }).map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.appointmentDot,
                                isSelected && styles.appointmentDotActive,
                                !isSelected && isToday && styles.appointmentDotToday
                            ]}
                        />
                    ))}
                </View>
            </TouchableOpacity>
        );
    };

    // Ensure renderTimeSlot is defined before renderContent
    const renderTimeSlot = (slot: TimeSlot, index: number) => {
        const getSlotColor = (status: string) => {
            switch (status) {
                case 'occupied': return COLORS.primary;
                case 'available': return COLORS.success;
                case 'blocked': return COLORS.error;
                case 'break': return COLORS.warning;
                case 'confirmed': return COLORS.primaryTeal;
                default: return COLORS.textSecondary;
            }
        };
        const getSlotIcon = (status: string) => {
            switch (status) {
                case 'occupied': return 'person';
                case 'available': return 'checkmark-circle';
                case 'blocked': return 'close-circle';
                case 'break': return 'cafe';
                case 'confirmed': return 'checkmark-done';
                default: return 'time';
            }
        };
        return (
            <TouchableOpacity key={slot.id || index} style={styles.timeSlotCard} disabled={slot.status === 'blocked'}>
                <View style={styles.timeSlotHeader}>
                    <Text style={styles.timeSlotTime}>{slot.time || slot.start}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getSlotColor(slot.status) + '20' }]}> 
                        <Ionicons name={getSlotIcon(slot.status) as any} size={14} color={getSlotColor(slot.status)} />
                        <Text style={[styles.statusText, { color: getSlotColor(slot.status) }]}> 
                            {slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
                        </Text>
                    </View>
                </View>
                {slot.status === 'available' && (
                    <TouchableOpacity style={{ marginTop: 8, alignSelf: 'flex-end' }} onPress={() => handleBlockSlotPress(slot.time)}>
                        <Text style={{ color: COLORS.error, fontSize: 12 }}>Block Slot</Text>
                    </TouchableOpacity>
                )}
                {slot.status === 'blocked' && (
                    <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 8 }}>Blocked</Text>
                )}
                {slot.patient && (
                    <Text style={styles.slotPatient}>{slot.patient}</Text>
                )}
                {slot.reason && (
                    <Text style={styles.slotReason}>{slot.reason}</Text>
                )}
                <Text style={styles.slotDuration}>{slot.appointment_duration} min</Text>
            </TouchableOpacity>
        );
    };

    // In renderContent, pass onDateChange to ScheduleAppointmentCard
    const renderContent = () => {
        switch (activeTab) {
            case 'today':
                return (
                    <>
                        <View style={styles.calendarContainer}>
                            {calendarDates.map(renderCalendarDate)}
                        </View>
                        <View style={styles.viewModeToggle}>
                            <TouchableOpacity
                                style={[styles.viewModeButton, viewMode === 'list' && styles.activeViewMode]}
                                onPress={() => setViewMode('list')}
                            >
                                <Ionicons name="list" size={16} color={viewMode === 'list' ? COLORS.white : COLORS.textSecondary} />
                                <Text style={[styles.viewModeText, viewMode === 'list' && styles.activeViewModeText]}>List</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.viewModeButton, viewMode === 'timeline' && styles.activeViewMode]}
                                onPress={() => setViewMode('timeline')}
                            >
                                <Ionicons name="time" size={16} color={viewMode === 'timeline' ? COLORS.white : COLORS.textSecondary} />
                                <Text style={[styles.viewModeText, viewMode === 'timeline' && styles.activeViewModeText]}>Timeline</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.appointmentsContainer}>
                            {viewMode === 'list' ? (
                                (() => {
                                    const occupiedSlots = timeSlots.filter(slot => slot.status === 'occupied' && slot.appointment);
                                    if (occupiedSlots.length === 0) {
                                        return (
                                            <View style={styles.emptyAppointmentsContainer}>
                                                <Ionicons name="calendar-clear-outline" size={48} color={COLORS.textSecondary} />
                                                <Text style={styles.emptyAppointmentsTitle}>No Appointments</Text>
                                                <Text style={styles.emptyAppointmentsText}>You have no appointments for this day.</Text>
                                            </View>
                                        );
                                    }
                                    const availableSlots = getAvailableSlotsForReschedule();
                                    return occupiedSlots.map((slot, idx) => (
                                        <ScheduleAppointmentCard
                                            key={slot.id || idx}
                                            appointment={{ ...slot.appointment, time: slot.time}}
                                            handlePatientDetails={handlePatientDetails}
                                            availableSlots={availableSlots}
                                            onReschedule={handleReschedule}
                                            onCancel={handleCancel}
                                            onDateChange={getAvailableSlotsForDate}
                                        />
                                    ));
                                })()
                            ) : (
                                timeSlots.length === 0 ? (
                                    <View style={styles.emptyAppointmentsContainer}>
                                        <Ionicons name="calendar-clear-outline" size={48} color={COLORS.textSecondary} />
                                        <Text style={styles.emptyAppointmentsTitle}>No Appointments</Text>
                                        <Text style={styles.emptyAppointmentsText}>You have no appointments for this day.</Text>
                                    </View>
                                ) : (
                                    timeSlots.map(renderTimeSlot)
                                )
                            )}
                        </View>
                    </>
                );
            case 'pending':
                return (
                    <View style={styles.pendingContainer}>
                        <View style={styles.pendingHeader}>
                            <Text style={styles.sectionTitle}>Pending Appointments</Text>
                            <View style={styles.pendingCountBadge}>
                                <Text style={styles.pendingCountText}>{pendingList.length}</Text>
                            </View>
                        </View>
                        
                        {pendingList.length === 0 ? (
                            <View style={styles.emptyPendingContainer}>
                                <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
                                <Text style={styles.emptyPendingTitle}>All caught up!</Text>
                                <Text style={styles.emptyPendingText}>No pending appointments to review</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={styles.pendingSubtitle}>
                                    Review and confirm the following appointment requests
                                </Text>
                                {pendingList.map((appointment: Appointment) => (
                                    <SchedulePendingAppointment 
                                    key={appointment.id}
                                    appointment={appointment} 
                                    confirmAppointment={confirmAppointment} 
                                    rejectAppointment={rejectAppointment} 
                                    />
                                ))}
                            </>
                        )}
                    </View>
                );

            case 'week':
                return (
                    <View style={styles.weekViewContainer}>
                        <Text style={styles.sectionTitle}>Weekly Schedule</Text>
                        <View style={styles.weekGrid}>
                            {weekDates.map((dayObj, index) => {
                                const appts = weekAppointments[formatDate(dayObj.date)] || [];
                                return (
                                    <View key={dayObj.day} style={styles.weekDayColumn}>
                                        <Text style={styles.weekDayHeader}>{dayObj.day}</Text>
                                        <View style={styles.weekDayContent}>
                                            <Text style={styles.weekDayDate}>{dayObj.date.getDate()}</Text>
                                            <View style={styles.weekAppointments}>
                                                {appts.length === 0 ? (
                                                    <Text style={{ color: COLORS.textSecondary, fontSize: 10, textAlign: 'center' }}>No appts</Text>
                                                ) : (
                                                    appts.map((apt, i) => (
                                                        <View key={apt.id || i} style={styles.weekAppointmentBlock} />
                                                    ))
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                );
            case 'history':
                return (
                    <View style={styles.historyContainer}>
                        <View style={styles.historyHeader}>
                            <Text style={styles.sectionTitle}>Session History</Text>
                            <TouchableOpacity style={styles.filterButton}>
                                <Ionicons name="filter" size={16} color={COLORS.primary} />
                                <Text style={styles.filterButtonText}>Filter</Text>
                            </TouchableOpacity>
                        </View>
                        {pastAppointments.map((appointment: Appointment) => (
                            <SchedulePastAppointment key={appointment.id} appointment={appointment} />
                        ))}
                    </View>
                );
            default:
                return null;
        }
    };

    // Add effect to fetch pending and past appointments when tab changes
    useEffect(() => {
        if (!consultantId) return;
        const fetchPending = async () => {
            const filters = { status: 'pending', limit: 100 };
            const result = await getConsultantAppointments(consultantId, filters);
            if (result.success && result.appointments) {
                setPendingList(result.appointments);
            } else {
                setPendingList([]);
            }
        };
        const fetchPast = async () => {
            const filters = { status: 'completed', limit: 100 };
            const result = await getConsultantAppointments(consultantId, filters);
            if (result.success && result.appointments) {
                setPastAppointments(result.appointments);
            } else {
                setPastAppointments([]);
            }
        };
        if (activeTab === 'pending') fetchPending();
        if (activeTab === 'history') fetchPast();
    }, [activeTab, consultantId]);

    // --- Week View Effects ---
    // Generate week dates (Mon-Sun) based on selectedDate
    useEffect(() => {
        if (activeTab !== 'week') return;
        const startOfWeek = getStartOfWeek(selectedDate);
        const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dates: CalendarDate[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            dates.push({
                date: d,
                day: daysOfWeek[i],
                isToday: d.toDateString() === (new Date()).toDateString(),
                appointmentCount: 0
            });
        }
        setWeekDates(dates);
    }, [selectedDate, activeTab]);

    // Fetch all confirmed appointments for the week
    useEffect(() => {
        if (activeTab !== 'week' || !consultantId || weekDates.length === 0) return;
        const fetchWeekAppointments = async () => {
            const weekAppts: { [date: string]: Appointment[] } = {};
            for (const dayObj of weekDates) {
                const filters = { date: formatDate(dayObj.date), status: 'confirmed' };
                const result = await getConsultantAppointments(consultantId, filters);
                if (result.success && result.appointments) {
                    weekAppts[formatDate(dayObj.date)] = result.appointments;
                } else {
                    weekAppts[formatDate(dayObj.date)] = [];
                }
            }
            setWeekAppointments(weekAppts);
        };
        fetchWeekAppointments();
    }, [activeTab, consultantId, weekDates]);

    // Helper to get start of week (Monday)
    const getStartOfWeek = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
        return new Date(d.setDate(diff));
    };

    // --- Block Slot Functionality ---
    // Open modal and set slot time
    const handleBlockSlotPress = (slotTime: string) => {
        setBlockTimeData({ ...blockTimeData, time: slotTime });
        setShowBlockTimeModal(true);
    };

    // Called from modal to actually block the slot
    const confirmBlockTimeSlot = async () => {
        if (!consultantId || !blockTimeData.time) return;
        let [hours, minutes] = blockTimeData.time.split(':');
        if (minutes && minutes.length > 2) minutes = minutes.slice(0, 2);
        const blockDate = new Date(selectedDate);
        blockDate.setHours(Number(hours), Number(minutes), 0, 0);
        const appointment_datetime = blockDate.toISOString();
        try {
            await blockConsultantSlot({ appointment_datetime, duration_minutes: Number(blockTimeData.duration) || 90 });
            setShowBlockTimeModal(false);
            setBlockTimeData({ time: '', duration: '' });
            fetchTimeSlots(selectedDate);
        } catch (e) {
            console.error('Failed to block slot', e);
        }
    };

    // Helper to format date for display (e.g., Monday, 30 June 2025)
    const formatDisplayDate = (date: Date): string => {
        return date.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Helper to check if selected date is today
    const isToday = (date: Date) => {
        const now = new Date();
        return (
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
        );
    };

    // Get number of patients for selected date
    const numPatients = timeSlots.filter(slot => slot.status === 'occupied' && slot.appointment).length;
    const subGreetingText = isToday(selectedDate)
        ? `You have ${numPatients} patient${numPatients === 1 ? '' : 's'} today`
        : `You have ${numPatients} patient${numPatients === 1 ? '' : 's'} on ${formatDisplayDate(selectedDate)}`;

    // Helper to format date for header (e.g., Sun, 18 Jun)
    const formatHeaderDate = (date: Date): string =>
  date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

const handlePrevDay = () => setSelectedDate(prev => {
  const d = new Date(prev);
  d.setDate(d.getDate() - 1);
  return d;
});
const handleNextDay = () => setSelectedDate(prev => {
  const d = new Date(prev);
  d.setDate(d.getDate() + 1);
  return d;
});
const handleToday = () => setSelectedDate(new Date());

    // Only slots that are 'available' (not occupied/blocked)
    const getAvailableSlotsForReschedule = () => {
        return timeSlots.filter(slot => slot.status === 'available').map(slot => slot.time);
    };

    // Helper to get available slots for a given date
    const getAvailableSlotsForDate = async (date: Date) => {
        await fetchTimeSlots(date); // This updates timeSlots state
        // Wait for state update, so return slots for this date
        // Instead, regenerate slots for the date synchronously
        const available_from = user?.available_from || '09:00';
        const available_to = user?.available_to || '17:00';
        const slotDuration = 90;
        const allSlots = generateTimeSlots(available_from, available_to, slotDuration);
        const filters = { date: formatDate(date) };
        const result = await getConsultantAppointments(consultantId, filters);
        let bookedAppointments: any[] = [];
        let blockedAppointments: any[] = [];
        if (result.success && result.appointments) {
            bookedAppointments = result.appointments.filter((apt: any) => apt.status === 'confirmed').map((apt: any) => {
                const localDate = new Date(apt.appointment_datetime);
                const hours = localDate.getHours().toString().padStart(2, '0');
                const minutes = localDate.getMinutes().toString().padStart(2, '0');
                return `${hours}:${minutes}`;
            });
            blockedAppointments = result.appointments.filter((apt: any) => apt.status === 'blocked').map((apt: any) => {
                const localDate = new Date(apt.appointment_datetime);
                const hours = localDate.getHours().toString().padStart(2, '0');
                const minutes = localDate.getMinutes().toString().padStart(2, '0');
                return `${hours}:${minutes}`;
            });
        }
        return allSlots.filter(slot => !bookedAppointments.includes(slot.time) && !blockedAppointments.includes(slot.time)).map(slot => slot.time);
    };

    const handleReschedule = async (appointment, newDate, newTime) => {
        try {
            // Ensure newDate is a valid Date object
            const dateObj = (newDate instanceof Date) ? new Date(newDate) : new Date(newDate);
            if (isNaN(dateObj.getTime())) throw new Error('Invalid date');

            // Handle both 12-hour (e.g. "12:30 PM") and 24-hour (e.g. "14:30") formats
            let hours, minutes;
            if (/AM|PM/i.test(newTime)) {
                // 12-hour format
                let [time, modifier] = newTime.split(' ');
                [hours, minutes] = time.split(':');
                if (hours === '12') hours = '00';
                if (modifier.toUpperCase() === 'PM') hours = (parseInt(hours, 10) + 12).toString();
            } else {
                // 24-hour format
                [hours, minutes] = newTime.split(':');
            }
            if (hours === undefined || minutes === undefined) throw new Error('Invalid time format');
            dateObj.setHours(Number(hours), Number(minutes), 0, 0);
            if (isNaN(dateObj.getTime())) throw new Error('Date value out of bounds after setHours');
            const new_datetime = dateObj.toISOString();
            const result = await apiRescheduleAppointment(appointment.id, new_datetime);
            if (result.success) {
                console.log('Rescheduled appointments: ', result)
                // Optionally refresh appointments or show a success message
            } else {
                console.log('Error occurred during reschedule')
                // Show error to user
            }
        } catch (error) {
            console.log('Reschedule error: ', error)
            // Show error to user
        }
    };

    const handleCancel = async (appointment, reason = '') => {
        try {
            const result = await apiCancelAppointment(appointment, { cancellation_reason: reason });
            if (result.success) {
                Alert.alert('Cancelled', 'Appointment cancelled successfully');
                // Optionally refresh appointments here
            } else {
                Alert.alert('Error', result.message || 'Failed to cancel appointment');
            }
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to cancel appointment');
        }
    };

    const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    contentContainer: {
        flex: 1,
    },
    // Header Styles
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.textDark,
        flexShrink: 1,
        marginRight: 8,
    },
    headerNavButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: COLORS.cardBackground,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 5,
        minWidth: 0,
        maxWidth: 200,
    },
    headerIconButton: {
        padding: 2,
        borderRadius: 8,
    },
    todayButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 5,
        marginHorizontal: 4,
        minWidth: 0,
    },
    todayButtonText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 14,
    },
    headerDateText: {
        fontSize: 14,
        color: COLORS.textDark,
        fontWeight: '500',
        marginHorizontal: 6,
        minWidth: 50,
        textAlign: 'center',
    },
    greetingSection: {
        marginBottom: 10,
    },
    greeting: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 4,
    },
    subGreeting: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    // Tab Styles
    tabContainer: {
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        borderRadius: 20,
        backgroundColor: COLORS.cardBackground,
        gap: 6,
    },
    activeTab: {
        backgroundColor: COLORS.primaryLight,
    },
    tabText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    activeTabText: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    // Calendar Styles
    calendarContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        justifyContent: 'space-between',
        marginBottom: 20,
        marginTop: 20,
    },
    calendarDateContainer: {
        alignItems: 'center',
        paddingVertical: 5,
        borderRadius: 38,
        minWidth: 50,
        backgroundColor: COLORS.background,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    calendarDateActive: {
        borderColor: COLORS.primary,
    },
    dateCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.cardBackground,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    dateCircleActive: {
        backgroundColor: COLORS.primary,
    },
    calendarDate: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textDark,
    },
    calendarDateActiveText: {
        color: COLORS.white,
    },
    calendarDay: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
        marginBottom: 8,
    },
    calendarDayActiveText: {
        color: COLORS.primary,
        fontSize: 16
    },
    appointmentDots: {
        flexDirection: 'row',
        gap: 3,
        justifyContent: 'center',
        minHeight: 8,
    },
    appointmentDot: {
        width: 4,
        height: 4,
        borderRadius: 3,
        backgroundColor: COLORS.lightGrey,
    },
    appointmentDotActive: {
        backgroundColor: COLORS.primary,
    },
    // View Mode Toggle
    viewModeToggle: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginBottom: 20,
        backgroundColor: COLORS.cardBackground,
        borderRadius: 12,
        padding: 4,
    },
    viewModeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    activeViewMode: {
        backgroundColor: COLORS.primary,
    },
    viewModeText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    activeViewModeText: {
        color: COLORS.white,
    },
    // Time Slot Styles
    timeSlotCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    timeSlotHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    timeSlotTime: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textDark,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    slotPatient: {
        fontSize: 14,
        color: COLORS.textDark,
        fontWeight: '500',
        marginBottom: 4,
    },
    slotReason: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        marginBottom: 4,
    },
    slotDuration: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    // Appointments Styles
    appointmentsContainer: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    // Week View Styles
    weekViewContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 20,
    },
    weekGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    weekDayColumn: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 2,
    },
    weekDayHeader: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
        marginBottom: 8,
    },
    weekDayContent: {
        alignItems: 'center',
        backgroundColor: COLORS.cardBackground,
        borderRadius: 8,
        padding: 8,
        minHeight: 80,
        width: '100%',
    },
    weekDayDate: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 8,
    },
    weekAppointments: {
        gap: 2,
        width: '100%',
    },
    weekAppointmentBlock: {
        height: 4,
        backgroundColor: COLORS.primary,
        borderRadius: 2,
    },
    // History Styles
    historyContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    filterButtonText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '500',
    },
    // Analytics Styles
    analyticsContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    analyticsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    analyticsCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        width: (screenWidth - 52) / 2,
        borderWidth: 1,
        borderColor: COLORS.lightGrey,
    },
    analyticsNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.textDark,
        marginTop: 12,
        marginBottom: 4,
    },
    analyticsLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'center',
        fontWeight: '500',
    },
    // Floating Action Button
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    pendingContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 30,
    },
    pendingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    pendingCountBadge: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        minWidth: 24,
        alignItems: 'center',
    },
    pendingCountText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: '600',
    },
    pendingSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 20,
        lineHeight: 20,
    },
    emptyPendingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyPendingTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textDark,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyPendingText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    calendarDateToday: {
        backgroundColor: COLORS.primaryLight,
    },
    dateCircleToday: {
        backgroundColor: COLORS.primaryLight,
    },
    calendarDateTodayText: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    calendarDayTodayText: {
        color: COLORS.primary,
        fontWeight: '500',
    },
    appointmentDotToday: {
        backgroundColor: COLORS.primaryLight,
    },
    emptyAppointmentsContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyAppointmentsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textDark,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyAppointmentsText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
});

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>My Schedule</Text>
                    <View style={styles.headerNavButtons}>
                        <TouchableOpacity onPress={handlePrevDay} style={styles.headerIconButton}>
                            <Ionicons name="chevron-back" size={18} color={COLORS.textDark} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleToday} style={styles.todayButton}>
                            <Text style={styles.todayButtonText}>Today</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerDateText}>{formatHeaderDate(selectedDate)}</Text>
                        <TouchableOpacity onPress={handleNextDay} style={styles.headerIconButton}>
                            <Ionicons name="chevron-forward" size={18} color={COLORS.textDark} />
                        </TouchableOpacity>
                    </View>
                </View>
                
                <View style={styles.greetingSection}>
                    <Text style={styles.greeting}>Hello, Dr. {user?.first_name} {user?.last_name} 👋</Text>
                    <Text style={styles.subGreeting}>{subGreetingText}</Text>
                </View>
            </View>

            {/* Tab Bar */}
            {renderTabBar()}

            {/* Content */}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.contentContainer}>
                {renderContent()}
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity 
                style={styles.fab}
                onPress={() => setShowBlockTimeModal(true)}
            >
                <Ionicons name="add" size={24} color={COLORS.white} />
            </TouchableOpacity>

            {/* Block Time Modal */}
            <BlockTimeModal 
                showBlockTimeModal={showBlockTimeModal} 
                setBlockTimeData={setBlockTimeData} 
                setShowBlockTimeModal={setShowBlockTimeModal} 
                blockTimeData={blockTimeData} 
                onConfirm={confirmBlockTimeSlot}
            />

            <StatusBar style={statusBarStyle} />
        </SafeAreaView>
    );
};

export default ScheduleScreen;