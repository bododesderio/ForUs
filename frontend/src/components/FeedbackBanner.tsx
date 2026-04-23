import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import React from 'react'
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';

const FeedbackBanner = () => {
    const { COLORS } = useTheme();

    const styles = StyleSheet.create({
    feedbackBanner: {
        backgroundColor: '#ff8a65',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
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
})
    return (
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
}

export default FeedbackBanner