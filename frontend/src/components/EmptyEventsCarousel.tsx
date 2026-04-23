import { View, Text, StyleSheet, Dimensions } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react'
import { useTheme } from '../context/ThemeContext';
const { width: screenWidth } = Dimensions.get('window');

const EmptyEventsCarousel = () => {
    const { COLORS } = useTheme();

    const styles = StyleSheet.create({
    emptyCarousel: {
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyEventCard: {
        width: screenWidth * 0.8,
        height: 180,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: COLORS.border || '#E0E0E0',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.cardBackground,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.grey,
        marginTop: 12,
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 14,
        color: COLORS.grey,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
})
    return (
        <View style={styles.emptyCarousel}>
            <View style={styles.emptyEventCard}>
                <Ionicons name="calendar-outline" size={48} color={COLORS.grey} />
                <Text style={styles.emptyTitle}>No Events Yet</Text>
                <Text style={styles.emptyDescription}>Tap the + button to add your first wellness event</Text>
            </View>
        </View>
    );
}

export default EmptyEventsCarousel;