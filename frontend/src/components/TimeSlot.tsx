import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import React from 'react'
import { useTheme } from '../context/ThemeContext';

export type TimeSlot = {
    time: string;
    isBooked?: boolean;
    isBlocked?: boolean;
}

type TimeSlotProp = {
    timeSlot: TimeSlot;
    index: number;
    selectedTime: string;
    handleTimeSelect: (time: string, index: number) => void;
}



const RenderTimeSlot = ({timeSlot, index, selectedTime, handleTimeSelect}: TimeSlotProp) => {
    const isSelected = timeSlot.time === selectedTime;
    const { COLORS } = useTheme();

    const styles = StyleSheet.create({  
        timeSlot: {
            backgroundColor: COLORS.cardBackground,
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            minWidth: 60,
            alignItems: 'center',
        },
        selectedTimeSlot: {
            backgroundColor: COLORS.primary,
            borderColor: COLORS.primary,
        },
        timeText: {
            fontSize: 14,
            color: COLORS.textDark,
            fontWeight: '500',
        },
        selectedTimeText: {
            color: COLORS.white,
            fontWeight: '600',
        },
        bookedTimeSlot: {
            backgroundColor: '#ffebee',
            borderWidth: 1,
            borderColor: timeSlot.isBlocked ? '#ff9800' : '#ff4444',
        },
        bookedTimeText: {
            color: timeSlot.isBlocked ? '#ff9800' : '#ff4444',
        },
        bookedLabel: {
            fontSize: 10,
            color: timeSlot.isBlocked ? '#ff9800' : '#ff4444',
            marginTop: 2,
        },
    })

    return (
        <View style={{ position: 'relative', margin: 2 }}>
            <TouchableOpacity
            key={index}
            style={[
                styles.timeSlot,
                isSelected && !timeSlot.isBooked && styles.selectedTimeSlot,
                timeSlot.isBooked && styles.bookedTimeSlot,
            ]}
            onPress={() => handleTimeSelect(timeSlot.time, index)}
            disabled={timeSlot.isBooked}
            >
            <Text
                style={[
                styles.timeText,
                isSelected && !timeSlot.isBooked && styles.selectedTimeText,
                timeSlot.isBooked && styles.bookedTimeText,
                ]}
            >
                {timeSlot.time}
            </Text>
            </TouchableOpacity>
            {timeSlot.isBooked && (
            <View style={{
                position: 'absolute',
                top: -10,
                left: 0,
                right: 0,
                alignItems: 'center',
                zIndex: 2,
            }}>
                <Text style={[styles.bookedLabel, { backgroundColor: timeSlot.isBlocked ? '#ff9800' : '#ff4444', color: '#fff', paddingHorizontal: 6, borderRadius: 6 }]}> 
                {timeSlot.isBlocked ? 'Blocked' : 'Booked'}
                </Text>
            </View>
            )}
        </View>
    );
};

export default RenderTimeSlot;
