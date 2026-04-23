import { StyleSheet, Text, View, Image, TouchableOpacity, Pressable, TextInput } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import React, { useState, useEffect } from 'react'
import { Picker } from '@react-native-picker/picker';
import Modal from 'react-native-modal';

// Calendar utility functions (from createAppointment.tsx)
type CalendarDay = {
  day: number;
  fullDate: string;
  isPast: boolean;
  isToday: boolean;
} | null;

const getMonthNames = (): string[] => [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const getDaysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number): number => {
  const firstDay = new Date(year, month, 1).getDay();
  return firstDay === 0 ? 6 : firstDay - 1;
};
const isDateInPast = (year: number, month: number, day: number): boolean => {
  const today = new Date();
  const checkDate = new Date(year, month, day);
  today.setHours(0, 0, 0, 0);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
};
const isToday = (year: number, month: number, day: number): boolean => {
  const today = new Date();
  return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
};
const generateCalendarDays = (year: number, month: number): CalendarDay[] => {
  const days: CalendarDay[] = [];
  const daysInMonth = getDaysInMonth(year, month);
  const startDay = getFirstDayOfMonth(year, month);
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const fullDate = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    days.push({
      day,
      fullDate,
      isPast: isDateInPast(year, month, day),
      isToday: isToday(year, month, day),
    });
  }
  return days;
};

// Props types
interface ScheduleAppointmentCardProps {
  appointment: any;
  handlePatientDetails?: (appointment: any) => void;
  onReschedule?: (appointment: any, newDate: Date, newTime: string) => void;
  onCancel?: (appointment: any, reason: string) => void;
  availableSlots?: string[];
  onDateChange?: (date: Date) => Promise<string[]>;
}

const ScheduleAppointmentCard: React.FC<ScheduleAppointmentCardProps> = ({ appointment, handlePatientDetails, onReschedule, onCancel, availableSlots = [], onDateChange }) => {
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [newTime, setNewTime] = useState<string>(appointment.time);
    const [cancelReason, setCancelReason] = useState('');
    const [newDate, setNewDate] = useState<Date>(new Date(appointment.appointment_datetime));
    const [slotsForDate, setSlotsForDate] = useState<string[]>(availableSlots);
    const { COLORS } = useTheme();

    // Calendar state for modal
    const today = new Date();
    const [calendarYear, setCalendarYear] = useState<number>(newDate.getFullYear());
    const [calendarMonth, setCalendarMonth] = useState<number>(newDate.getMonth());
    const [selectedDay, setSelectedDay] = useState<number | null>(newDate.getDate());
    const monthNames = getMonthNames();
    const calendarDays = generateCalendarDays(calendarYear, calendarMonth);
    
    useEffect(() => {
        // When modal opens, sync calendar to current newDate
        if (showRescheduleModal) {
            setCalendarYear(newDate.getFullYear());
            setCalendarMonth(newDate.getMonth());
            setSelectedDay(newDate.getDate());
        }
    }, [showRescheduleModal]);

    const handleReschedulePress = () => {
        setShowRescheduleModal(true);
    };
    const handleCancelPress = () => {
        setShowCancelModal(true);
    };
    const handleRescheduleConfirm = () => {
        if (onReschedule) onReschedule(appointment, newDate, newTime);
        setShowRescheduleModal(false);
    };
    const handleCancelConfirm = () => {
        if (onCancel) onCancel(appointment, cancelReason);
        setShowCancelModal(false);
        setCancelReason('');
    };
    // Custom calendar date select
    const handleCalendarDaySelect = (dayObj: CalendarDay) => {
        if (!dayObj || dayObj.isPast) return;
        setSelectedDay(dayObj.day);
        const selected = new Date(calendarYear, calendarMonth, dayObj.day);
        setNewDate(selected);
        if (onDateChange) {
            onDateChange(selected).then((slots: string[]) => {
                setSlotsForDate(slots);
                setNewTime(slots[0] || '');
            });
        }
    };
    // Calendar navigation
    const navigateMonth = (direction: number) => {
        let newMonth = calendarMonth + direction;
        let newYear = calendarYear;
        if (newMonth > 11) {
            newMonth = 0;
            newYear += 1;
        } else if (newMonth < 0) {
            newMonth = 11;
            newYear -= 1;
        }
        setCalendarMonth(newMonth);
        setCalendarYear(newYear);
        setSelectedDay(null);
    };

    const styles = StyleSheet.create({
    appointmentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    timeContainer: {
        alignItems: 'center',
        marginRight: 16,
    },
    appointmentTimeBox: {
        backgroundColor: COLORS.border,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        minWidth: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    appointmentTime: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textDark,
    },
    verticalLine: {
        width: 2,
        height: 40,
        backgroundColor: COLORS.border,
    },
    appointmentContent: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: COLORS.cardBackground,
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    patientAvatar: {
        width: 50,
        height: 50,
        borderRadius: 12,
        marginRight: 12,
    },
    appointmentDetails: {
        flex: 1,
    },
    patientHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    patientName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textDark,
        marginRight: 8,
    },
    patientCondition: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    appointmentInfo: {
        flexDirection: 'row',
        gap: 16,
    },
    appointmentAction: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    appointmentActionReschedule: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '500',
        backgroundColor: COLORS.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4
    },
    appointmentActionCancel: {
        fontSize: 14,
        color: COLORS.error,
        fontWeight: '500',
        backgroundColor: COLORS.bgError,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4
    },
    actionButton: {
        justifyContent: 'center',
        alignItems: 'center',
    },
})

const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBox: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: 16,
        padding: 24,
        width: 320,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        color: COLORS.textDark,
    },
    modalLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: COLORS.lightGrey,
        borderRadius: 8,
        marginBottom: 16,
        backgroundColor: COLORS.background,
    },
    picker: {
        height: 50,
        width: '100%',
        color: COLORS.textDark,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    cancelBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: COLORS.lightGrey,
    },
    cancelText: {
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    confirmBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: COLORS.primary,
    },
    confirmText: {
        color: COLORS.white,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.lightGrey,
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        marginBottom: 16,
        color: COLORS.textDark,
        backgroundColor: COLORS.background,
        minHeight: 44,
    },
});

    return (
        <View key={appointment.id} style={styles.appointmentCard}>
            <View style={styles.timeContainer}>
                <View style={styles.verticalLine} />
                <View style={styles.appointmentTimeBox}>
                    <Text style={styles.appointmentTime}>{appointment.time}</Text>
                </View>
                <View style={styles.verticalLine} />
            </View>
            <View style={styles.appointmentContent}>
                <Image source={{ uri: appointment.profile_image }} style={styles.patientAvatar} />
                <View style={styles.appointmentDetails}>
                    <View style={styles.patientHeader}>
                        <Text style={styles.patientName}>{appointment.user_name}</Text>
                    </View>
                    <Text style={styles.patientCondition}>{appointment.age} years • {appointment.condition}</Text>
                    <View style={styles.appointmentInfo}>
                        <TouchableOpacity style={styles.appointmentAction} onPress={handleReschedulePress}>
                            <Text style={styles.appointmentActionReschedule}>Reschedule</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.appointmentAction} onPress={handleCancelPress}>
                            <Text style={styles.appointmentActionCancel}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handlePatientDetails && handlePatientDetails(appointment)}
                >
                    <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            {/* Reschedule Modal */}
            <Modal
                isVisible={showRescheduleModal}
                onBackdropPress={() => setShowRescheduleModal(false)}
                onBackButtonPress={() => setShowRescheduleModal(false)}
                useNativeDriver
                hideModalContentWhileAnimating
                style={{ margin: 0 }}
            >
                <View style={modalStyles.overlay}>
                    <View style={modalStyles.modalBox}>
                        <Text style={modalStyles.modalTitle}>Reschedule Appointment</Text>
                        <Text style={modalStyles.modalLabel}>Select new date:</Text>
                        {/* Custom Calendar UI */}
                        <View style={{marginBottom: 16}}>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                                <TouchableOpacity onPress={() => navigateMonth(-1)} disabled={calendarYear < today.getFullYear() || (calendarYear === today.getFullYear() && calendarMonth <= today.getMonth())}>
                                    <Ionicons name="chevron-back" size={22} color={COLORS.textSecondary} style={{opacity: (calendarYear < today.getFullYear() || (calendarYear === today.getFullYear() && calendarMonth <= today.getMonth())) ? 0.3 : 1}} />
                                </TouchableOpacity>
                                <Text style={{fontWeight: '600', fontSize: 16}}>{monthNames[calendarMonth]} {calendarYear}</Text>
                                <TouchableOpacity onPress={() => navigateMonth(1)}>
                                    <Ionicons name="chevron-forward" size={22} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
                                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, i) => (
                                    <Text key={i} style={{width: 32, textAlign: 'center', color: COLORS.textSecondary, fontSize: 13}}>{d}</Text>
                                ))}
                            </View>
                            <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                                {calendarDays.map((dayObj, idx) => {
                                    if (!dayObj) return <View key={idx} style={{width: 32, height: 32, margin: 2}} />;
                                    const isSelected = dayObj.day === selectedDay && calendarMonth === newDate.getMonth() && calendarYear === newDate.getFullYear();
                                    return (
                                        <TouchableOpacity
                                            key={idx}
                                            style={{
                                                width: 32, height: 32, margin: 2, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                                                backgroundColor: isSelected ? COLORS.primary : dayObj.isToday ? COLORS.primaryLight : 'transparent',
                                                opacity: dayObj.isPast ? 0.3 : 1,
                                                borderWidth: isSelected ? 2 : 0, borderColor: isSelected ? COLORS.primary : 'transparent',
                                            }}
                                            disabled={dayObj.isPast}
                                            onPress={() => handleCalendarDaySelect(dayObj)}
                                        >
                                            <Text style={{color: isSelected ? COLORS.white : COLORS.textDark, fontWeight: isSelected ? '700' : '500'}}>{dayObj.day}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                        <Text style={modalStyles.modalLabel}>Select new time slot:</Text>
                        <View style={modalStyles.pickerWrapper}>
                            {slotsForDate.length === 0 ? (
                                <Text style={{ color: COLORS.error, marginBottom: 8 }}>No available slots for this date.</Text>
                            ) : (
                                <Picker
                                    key={newDate.toDateString()}
                                    selectedValue={newTime}
                                    onValueChange={setNewTime}
                                    style={modalStyles.picker}
                                >
                                    {slotsForDate.map((slot, idx) => (
                                        <Picker.Item key={idx} label={slot} value={slot} />
                                    ))}
                                </Picker>
                            )}
                        </View>
                        <View style={modalStyles.modalActions}>
                            <Pressable style={modalStyles.cancelBtn} onPress={() => setShowRescheduleModal(false)}>
                                <Text style={modalStyles.cancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={modalStyles.confirmBtn} onPress={handleRescheduleConfirm} disabled={!newTime}>
                                <Text style={modalStyles.confirmText}>Confirm</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* Cancel Modal */}
            <Modal
                isVisible={showCancelModal}
                onBackdropPress={() => setShowCancelModal(false)}
                onBackButtonPress={() => setShowCancelModal(false)}
                useNativeDriver
                hideModalContentWhileAnimating
                style={{ margin: 0 }}
            >
                <View style={modalStyles.overlay}>
                    <View style={modalStyles.modalBox}>
                        <Text style={modalStyles.modalTitle}>Cancel Appointment</Text>
                        <Text style={modalStyles.modalLabel}>Please provide a reason for cancellation:</Text>
                        <TextInput
                            style={modalStyles.input}
                            value={cancelReason}
                            onChangeText={setCancelReason}
                            placeholder="Enter reason..."
                            multiline
                        />
                        <View style={modalStyles.modalActions}>
                            <Pressable style={modalStyles.cancelBtn} onPress={() => setShowCancelModal(false)}>
                                <Text style={modalStyles.cancelText}>Back</Text>
                            </Pressable>
                            <Pressable style={modalStyles.confirmBtn} onPress={handleCancelConfirm} disabled={!cancelReason.trim()}>
                                <Text style={modalStyles.confirmText}>Confirm</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default ScheduleAppointmentCard;
