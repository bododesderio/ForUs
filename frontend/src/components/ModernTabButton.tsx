import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react'
import { useTheme } from '../context/ThemeContext';

type ModernTabButton = {
    title: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    isActive: boolean;
    onPress: () => void;
}

const ModernTabButton = ({title, icon, isActive, onPress}: ModernTabButton) => {
    const { COLORS } = useTheme();

    const styles = StyleSheet.create({  
    modernTabButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 20,
        position: 'relative',
        overflow: 'hidden',
    },
    modernTabButtonActive: {
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    tabButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabIcon: {
        marginRight: 6,
    },
    modernTabText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.grey,
        textAlign: 'center',
    },
    modernTabTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: [{ translateX: -15 }],
        width: 30,
        height: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 2,
    },
})
    return (
    <TouchableOpacity
        style={[styles.modernTabButton, isActive && styles.modernTabButtonActive]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={styles.tabButtonContent}>
            {icon && (
            <Ionicons 
                name={icon} 
                size={18} 
                color={isActive ? '#FFFFFF' : COLORS.grey} 
                style={styles.tabIcon}
            />
            )}
            <Text style={[styles.modernTabText, isActive && styles.modernTabTextActive]}>
            {title}
            </Text>
        </View>
        {isActive && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
    );
}

export default ModernTabButton;