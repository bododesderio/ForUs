import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native'
import React from 'react'
import Ionicons from '@expo/vector-icons/Ionicons';

import { calculateAge } from '../../helper/calculateAge';
import { useTheme } from '../../context/ThemeContext';
import { formatTime, convertToLocalDate } from '../../helper/convertDateTime';

const SchedulePendingAppointment = ({appointment, rejectAppointment, confirmAppointment}) => {
    const { COLORS } = useTheme();

    const styles = StyleSheet.create({
    pendingAppointmentCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.lightGrey,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.warning,
    },
    pendingAppointmentHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    pendingPatientAvatar: {
        width: 50,
        height: 50,
        borderRadius: 12,
        marginRight: 12,
    },
    pendingAppointmentInfo: {
        flex: 1,
    },
    pendingPatientName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 4,
    },
    pendingPatientDetails: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    pendingAppointmentTime: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '500',
        marginBottom: 2,
    },
    pendingDuration: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    pendingStatusBadge: {
        backgroundColor: COLORS.warning + '20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    pendingStatusText: {
        fontSize: 12,
        color: COLORS.warning,
        fontWeight: '500',
    },
    pendingNotesContainer: {
        backgroundColor: COLORS.lightGrey,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    pendingNotesLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
        marginBottom: 4,
    },
    pendingNotes: {
        fontSize: 14,
        color: COLORS.textDark,
        lineHeight: 18,
    },
    pendingActionsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    rejectButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.error + '10',
        borderRadius: 8,
        paddingVertical: 12,
        gap: 6,
        borderWidth: 1,
        borderColor: COLORS.error + '30',
    },
    rejectButtonText: {
        color: COLORS.error,
        fontSize: 14,
        fontWeight: '500',
    },
    confirmButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        paddingVertical: 12,
        gap: 6,
    },
    confirmButtonText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '500',
    },
})
    return (
        <View key={appointment.id} style={styles.pendingAppointmentCard}>
            <View style={styles.pendingAppointmentHeader}>
                <Image source={{ uri: appointment.profile_image }} style={styles.pendingPatientAvatar} />
                <View style={styles.pendingAppointmentInfo}>
                    <Text style={styles.pendingPatientName}>{appointment.user_name}</Text>
                    <Text style={styles.pendingPatientDetails}>{calculateAge(appointment.dob)} years • {appointment.condition}</Text>
                    <Text style={styles.pendingAppointmentTime}>
                        {convertToLocalDate(appointment.appointment_datetime)} at {formatTime(appointment.appointment_datetime)}
                    </Text>
                    <Text style={styles.pendingDuration}>Duration: {appointment.duration_minutes}</Text>
                </View>
                <View style={styles.pendingStatusBadge}>
                    <Text style={styles.pendingStatusText}>Pending</Text>
                </View>
            </View>
            
            {appointment.notes && (
                <View style={styles.pendingNotesContainer}>
                    <Text style={styles.pendingNotesLabel}>Notes:</Text>
                    <Text style={styles.pendingNotes}>{appointment.notes}</Text>
                </View>
            )}
            
            <View style={styles.pendingActionsContainer}>
                <TouchableOpacity 
                    style={styles.rejectButton}
                    onPress={() => rejectAppointment(appointment.id)}
                >
                    <Ionicons name="close" size={16} color={COLORS.error} />
                    <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.confirmButton}
                    onPress={() => confirmAppointment(appointment.id)}
                >
                    <Ionicons name="checkmark" size={16} color={COLORS.white} />
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default SchedulePendingAppointment;
