import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons';
import React from 'react'

const ToastMessage = () => {
    return (
        <View style={styles.successToast}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.successToastText}>Profile updated successfully!</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    successToast: {
        position: 'absolute',
        top: 100,
        left: 20,
        right: 20,
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 1000,
    },
    successToastText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
    },
})

export default ToastMessage;