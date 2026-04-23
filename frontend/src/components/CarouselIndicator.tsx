import { View, Text, StyleSheet } from 'react-native'
import React from 'react'
import { useTheme } from '../context/ThemeContext'

type CarouselIndicatorProps = {
    total: number;
    current: number;
}

const CarouselIndicator = ({ total, current }: CarouselIndicatorProps) => {
    const { COLORS } = useTheme();
    
    const styles = StyleSheet.create({
    indicatorContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        gap: 8,
    },
    indicator: {
        height: 6,
        borderRadius: 3,
    },
    activeIndicator: {
        width: 20,
        backgroundColor: COLORS.primary,
    },
    inactiveIndicator: {
        width: 6,
        backgroundColor: COLORS.lightGrey,
    },
})
    return (
        <View style={styles.indicatorContainer}>
            {Array.from({ length: total }).map((_, index) => (
            <View
                key={index}
                style={[
                styles.indicator,
                index === current ? styles.activeIndicator : styles.inactiveIndicator
                ]}
            />
            ))}
        </View>
    );
}



export default CarouselIndicator