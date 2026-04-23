import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react'

import { convertToLocalDate } from '../../helper/convertDateTime';
import { useTheme } from '../../context/ThemeContext';
import truncateWords from '../../helper/truncateWords';

const SchedulePastAppointment = ({appointment, onViewReview}) => {
    const { COLORS } = useTheme();
    // Handle rating from the joined reviews table
    const hasReview = appointment.review_id !== null;
    const rating = appointment.rating || 0;

    const styles = StyleSheet.create({
    pastAppointmentCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.lightGrey,
    },
    pastAppointmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    pastAppointmentDate: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    reviewSection: {
        alignItems: 'flex-end',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    ratingText: {
        fontSize: 10,
        color: COLORS.textSecondary,
        marginLeft: 4,
        fontWeight: '500',
    },
    noReviewContainer: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: COLORS.lightGrey,
        borderRadius: 4,
    },
    noReviewText: {
        fontSize: 10,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
    },
    pastPatientName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 4,
    },
    pastCondition: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    pastNotes: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        marginBottom: 12,
    },
    reviewTextContainer: {
        backgroundColor: COLORS.background,
        padding: 8,
        borderRadius: 8,
        marginBottom: 12,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.warning,
    },
    reviewLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 2,
    },
    reviewText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        lineHeight: 16,
    },
    pastAppointmentFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    pastDuration: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    footerRight: {
        alignItems: 'flex-end',
    },
    reviewDate: {
        fontSize: 10,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    pastStatus: {
        fontSize: 12,
        fontWeight: '500',
    },
})
    
    return (
        <View key={appointment.id} style={styles.pastAppointmentCard}>
            <View style={styles.pastAppointmentHeader}>
                <Text style={styles.pastAppointmentDate}>{convertToLocalDate(appointment.appointment_datetime)}</Text>
                <View style={styles.reviewSection}>
                    {hasReview ? (
                        <TouchableOpacity 
                            style={styles.ratingContainer}
                            onPress={() => onViewReview && onViewReview(appointment)}
                        >
                            {[...Array(5)].map((_, i) => (
                                <Ionicons
                                    key={i}
                                    name="star"
                                    size={12}
                                    color={i < rating ? COLORS.warning : COLORS.lightGrey}
                                />
                            ))}
                            <Text style={styles.ratingText}>({rating})</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.noReviewContainer}>
                            <Text style={styles.noReviewText}>No review</Text>
                        </View>
                    )}
                </View>
            </View>
            <Text style={styles.pastPatientName}>{appointment.user_name}</Text>
            <Text style={styles.pastCondition}>{truncateWords({ text: appointment.description, maxWords: 5 })}</Text>
            <Text style={styles.pastNotes}>{truncateWords({ text: appointment.title, maxWords: 5 })}</Text>
            
            {/* Show review text if available */}
            {hasReview && appointment.review_text && (
                <View style={styles.reviewTextContainer}>
                    <Text style={styles.reviewLabel}>Review:</Text>
                    <Text style={styles.reviewText}>
                        {truncateWords({ text: appointment.review_text, maxWords: 10 })}
                    </Text>
                </View>
            )}
            
            <View style={styles.pastAppointmentFooter}>
                <Text style={styles.pastDuration}>{appointment.duration_minutes} mins</Text>
                <View style={styles.footerRight}>
                    {hasReview && (
                        <Text style={styles.reviewDate}>
                            Reviewed {convertToLocalDate(appointment.review_date)}
                        </Text>
                    )}
                    <Text style={[styles.pastStatus, { color: appointment.status === 'completed' ? COLORS.success : COLORS.error }]}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </Text>
                </View>
            </View>
        </View>
    );
}

export default SchedulePastAppointment;