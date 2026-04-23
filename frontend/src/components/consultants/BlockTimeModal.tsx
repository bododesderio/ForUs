import { StyleSheet, Text, View, Modal, TouchableOpacity, TextInput } from 'react-native'
import React from 'react'
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';

const BlockTimeModal = ({
        showBlockTimeModal, 
        setShowBlockTimeModal, 
        blockTimeData, 
        setBlockTimeData,
        onConfirm
    }) => {
        const { COLORS } = useTheme();

        const styles = StyleSheet.create({
    
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textDark,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        color: COLORS.textDark,
        fontWeight: '500',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.lightGrey,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: COLORS.textDark,
        backgroundColor: COLORS.white,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    blockTimeButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    blockTimeButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
})

    return (
        <Modal
            visible={showBlockTimeModal}
            transparent
            animationType="slide"
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Block Time</Text>
                        <TouchableOpacity onPress={() => setShowBlockTimeModal(false)}>
                            <Ionicons name="close" size={24} color={COLORS.textDark} />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Time</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Select time"
                            value={blockTimeData.time}
                            onChangeText={(text) => setBlockTimeData({...blockTimeData, time: text})}
                        />
                    </View>
                    
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Duration (minutes)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="60"
                            value={blockTimeData.duration}
                            onChangeText={(text) => setBlockTimeData({...blockTimeData, duration: text})}
                            keyboardType="numeric"
                        />
                    </View>
                    
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Reason</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Personal time, break, etc."
                            value={blockTimeData.reason}
                            onChangeText={(text) => setBlockTimeData({...blockTimeData, reason: text})}
                            multiline
                        />
                    </View>
                    
                    <TouchableOpacity style={styles.blockTimeButton} onPress={onConfirm}>
                        <Text style={styles.blockTimeButtonText}>Block Time</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

export default BlockTimeModal;
