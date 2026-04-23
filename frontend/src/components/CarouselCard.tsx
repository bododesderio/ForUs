import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions, Modal, TextInput, Alert } from 'react-native'
import React, { useState, useEffect } from 'react'
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { convertToLocalDate, formatTime, toLocalDateTimeString } from '../helper/convertDateTime';
import { startSession, updateStatus } from '../services/api'; // Import updateStatus
const { width: screenWidth } = Dimensions.get('window');

// Fix UpcomingType to include all used fields
export type UpcomingType = {
    id: number;
    appointment_datetime: string;
    consultant_name: string;
    profile_image: string;
    profession: string;
    location: string;
    status: string;
    user_id: number;
    consultant_id: number;
    [key: string]: any;
};

type CarouselCardProps = {
    appointment: UpcomingType;
    onCancelPress: (appointment: UpcomingType, reason: string) => void;
    onChatPress?: (appointment: UpcomingType) => void;
}

const CarouselCard = ({ appointment, onCancelPress, onChatPress }: CarouselCardProps) => {
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [isChatActive, setIsChatActive] = useState(false);
    const { COLORS } = useTheme();

    // Check if chat should be active based on appointment time
    useEffect(() => {
        const checkChatAvailability = () => {
            const now = new Date();
            const appointmentDateTime = appointment.appointment_datetime ? new Date(appointment.appointment_datetime) : new Date(`${appointment.appointment_date} ${appointment.appointment_time}`);
            const fifteenMinutesBefore = new Date(appointmentDateTime.getTime() - 15 * 60 * 1000);
            const twoHoursAfter = new Date(appointmentDateTime.getTime() + 2 * 60 * 60 * 1000);
            setIsChatActive(now >= fifteenMinutesBefore && now <= twoHoursAfter);
        };

        checkChatAvailability();
        const interval = setInterval(checkChatAvailability, 60000);
        return () => clearInterval(interval);
    }, [appointment.appointment_datetime, appointment.appointment_date, appointment.appointment_time]);

    const handleCancelPress = () => {
        setShowCancelModal(true);
    };

    const handleConfirmCancel = () => {
        if (cancellationReason.trim()) {
            onCancelPress(appointment, cancellationReason.trim());
            setShowCancelModal(false);
            setCancellationReason('');
        } else {
            Alert.alert('Error', 'Please provide a reason for cancellation');
        }
    };

    const handleModalClose = () => {
        setShowCancelModal(false);
        setCancellationReason('');
    };

    const handleChatPress = async () => {
        // if (!isChatActive) {
        //     Alert.alert(
        //         'Chat Not Available',
        //         'Chat will be available 15 minutes before your appointment time.'
        //     );
        //     return;
        // }

        try {
            // Update appointment status to 'in_session'
            const response = await startSession(appointment.id);
            if (!response.success) {
                Alert.alert('Error', response.message || 'Failed to start session');
                return;
            }

            if (onChatPress) {
                onChatPress(appointment);
            }
        } catch (error) {
            console.error('Error starting session:', error);
            Alert.alert('Error', 'Failed to start session. Please try again.');
        }
    };

    const isConfirmed = appointment.status === 'confirmed';

    const styles = StyleSheet.create({
        carouselCard: {
            backgroundColor: COLORS.cardBackground,
            borderRadius: 20,
            padding: 20,
            marginRight: 16,
            width: screenWidth - 80,
            shadowColor: COLORS.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 4,
        },
        cardHeader: {
            marginBottom: 8,
        },
        statusBadge: {
            backgroundColor: COLORS.border,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
            alignSelf: 'flex-start',
            marginBottom: 8,
        },
        statusText: {
            color: COLORS.white,
            fontSize: 12,
            fontWeight: '600',
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
        actionButtonsContainer: {
            flexDirection: 'row',
            gap: 12,
        },
        chatButton: {
            flex: 1,
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
        },
        chatButtonActive: {
            backgroundColor: '#4CAF50',
        },
        chatButtonInactive: {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.2)',
        },
        chatButtonText: {
            fontSize: 16,
            fontWeight: '600',
        },
        chatButtonTextActive: {
            color: COLORS.white,
        },
        chatButtonTextInactive: {
            color: COLORS.textLight,
        },
        cancelButton: {
            backgroundColor: '#FF4444',
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
        },
        cancelButtonText: {
            color: COLORS.white,
            fontSize: 16,
            fontWeight: '600',
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        modalContainer: {
            backgroundColor: COLORS.white,
            borderRadius: 16,
            width: '100%',
            maxWidth: 400,
            padding: 24,
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
        },
        modalTitle: {
            fontSize: 20,
            fontWeight: '700',
            color: COLORS.textDark,
        },
        modalSubtitle: {
            fontSize: 16,
            color: COLORS.textDark,
            marginBottom: 20,
            lineHeight: 22,
        },
        reasonInput: {
            borderWidth: 1,
            borderColor: COLORS.lightGrey,
            borderRadius: 12,
            padding: 16,
            fontSize: 16,
            color: COLORS.textDark,
            minHeight: 100,
            marginBottom: 24,
        },
        modalButtons: {
            flexDirection: 'row',
            gap: 12,
        },
        modalCancelButton: {
            flex: 1,
            backgroundColor: COLORS.lightGrey,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
        },
        modalCancelButtonText: {
            color: COLORS.textDark,
            fontSize: 16,
            fontWeight: '600',
        },
        modalConfirmButton: {
            flex: 1,
            backgroundColor: '#FF4444',
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
        },
        modalConfirmButtonText: {
            color: COLORS.white,
            fontSize: 16,
            fontWeight: '600',
        },
    })

    return (
        <>
            <View style={styles.carouselCard}>
                <View style={styles.cardHeader}>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>
                            {appointment.status === 'in_session' ? 'IN SESSION' : isConfirmed ? 'CONFIRMED' : 'PENDING'}
                        </Text>
                    </View>
                    <Text style={styles.location}>{appointment.location}</Text>
                </View>
                
                <View style={styles.dateTimeContainer}>
                    <Text style={styles.appointmentDate}>{convertToLocalDate(appointment.appointment_datetime || appointment.appointment_date)}</Text>
                    <Text style={styles.appointmentTime}>{formatTime(appointment.appointment_datetime || appointment.appointment_time)}</Text>
                </View>
                
                <View style={styles.doctorSection}> 
                    <Image source={{ uri: appointment.profile_image }} style={styles.doctorAvatar} />
                    <View style={styles.doctorInfo}>
                        <Text style={styles.doctorName}>{appointment.consultant_name}</Text>
                        <Text style={styles.specialty}>{appointment.profession}</Text>
                    </View>
                </View>
                
                <View style={styles.actionButtonsContainer}>
                    {isConfirmed && (
                        <TouchableOpacity 
                            style={[
                                styles.chatButton,
                                isChatActive ? styles.chatButtonActive : styles.chatButtonInactive
                            ]}
                            onPress={handleChatPress}
                        >
                            <Ionicons 
                                name="chatbubble-outline" 
                                size={16} 
                                color={isChatActive ? COLORS.white : COLORS.textLight} 
                            />
                            <Text style={[
                                styles.chatButtonText,
                                isChatActive ? styles.chatButtonTextActive : styles.chatButtonTextInactive
                            ]}>
                                {isChatActive ? 'Start Chat' : 'Chat Soon'}
                            </Text>
                        </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity 
                        style={[
                            styles.cancelButton,
                            isConfirmed ? { flex: 1 } : { flex: 1 }
                        ]}
                        onPress={handleCancelPress}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                        <Ionicons name="close-circle-outline" size={16} color={COLORS.white} />
                    </TouchableOpacity>
                </View>
            </View>

            <Modal
                visible={showCancelModal}
                transparent={true}
                animationType="fade"
                onRequestClose={handleModalClose}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Cancel Appointment</Text>
                            <TouchableOpacity onPress={handleModalClose}>
                                <Ionicons name="close" size={24} color={COLORS.textDark} />
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.modalSubtitle}>
                            Please provide a reason for cancelling your appointment with {appointment.consultant_name}
                        </Text>
                        
                        <TextInput
                            style={styles.reasonInput}
                            placeholder="Enter reason for cancellation..."
                            placeholderTextColor={COLORS.textLight}
                            value={cancellationReason}
                            onChangeText={setCancellationReason}
                            multiline={true}
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                        
                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={styles.modalCancelButton}
                                onPress={handleModalClose}
                            >
                                <Text style={styles.modalCancelButtonText}>Keep Appointment</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={styles.modalConfirmButton}
                                onPress={handleConfirmCancel}
                            >
                                <Text style={styles.modalConfirmButtonText}>Confirm Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

export default CarouselCard;