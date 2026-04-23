// components/ChatComponent.tsx (Create this file)
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, Alert, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { 
    ChannelList, 
    Chat, 
    ChannelPreviewMessenger 
} from 'stream-chat-react-native-core';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/authContext';
import { useChatContext } from '../context/ChatContext';

const ChatComponent = () => {
    const { COLORS, mode } = useTheme();
    const { user } = useAuth();
    const router = useRouter();
    const { client, createRoom, isConnected } = useChatContext();

    const [groupModalVisible, setGroupModalVisible] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    // Stream Chat filters
    const filters = {
        type: 'messaging',
        members: { $in: [user?.id] },
    };

    const sort = { last_message_at: -1 };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) {
            Alert.alert('Error', 'Group name is required');
            return;
        }
        try {
            const roomId = `group_${Date.now()}`;
            const roomData = {
                roomId,
                name: newGroupName,
                type: 'messaging',
                members: [
                    { user_id: user.id, user_type: user.role, role: 'owner' }
                ]
            };
            await createRoom(roomData);
            setGroupModalVisible(false);
            setNewGroupName('');
        } catch (error) {
            Alert.alert('Error', 'Failed to create group');
        }
    };

    const onSelectChannel = (channel) => {
        router.push({
            pathname: '/(screens)/ChatRoomScreen',
            params: { 
                roomId: channel.id, 
                roomName: channel.data.name || 'Chat'
            }
        });
    };

    const CustomChannelPreview = ({ channel, ...props }) => (
        <TouchableOpacity
            style={[styles.channelPreview, { borderColor: COLORS.border }]}
            onPress={() => onSelectChannel(channel)}
        >
            <View style={styles.channelInfo}>
                <Text style={[styles.channelName, { color: COLORS.textDark }]}>
                    {channel.data.name || 'Unnamed Channel'}
                </Text>
                <Text style={[styles.lastMessage, { color: COLORS.textSecondary }]}>
                    {channel.state.messages.length > 0 
                        ? channel.state.messages[channel.state.messages.length - 1].text 
                        : 'No messages yet'
                    }
                </Text>
            </View>
            {channel.countUnread() > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: COLORS.primary }]}>
                    <Text style={[styles.unreadCount, { color: COLORS.white }]}>
                        {channel.countUnread()}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const renderGroupModal = () => (
        <Modal visible={groupModalVisible} animationType="slide">
            <View style={[styles.modalContainer, { backgroundColor: COLORS.background }]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: COLORS.textDark }]}>
                        Create Group
                    </Text>
                    <TouchableOpacity onPress={() => setGroupModalVisible(false)}>
                        <Ionicons name="close" size={24} color={COLORS.textDark} />
                    </TouchableOpacity>
                </View>
                
                <TextInput
                    placeholder="Group Name"
                    placeholderTextColor={COLORS.textSecondary}
                    value={newGroupName}
                    onChangeText={setNewGroupName}
                    style={[styles.input, { 
                        borderColor: COLORS.border, 
                        color: COLORS.textDark 
                    }]}
                />
                
                <View style={styles.modalButtons}>
                    <TouchableOpacity 
                        onPress={handleCreateGroup} 
                        style={[styles.createButton, { backgroundColor: COLORS.primary }]}
                    >
                        <Text style={[styles.buttonText, { color: COLORS.white }]}>
                            Create Group
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        onPress={() => setGroupModalVisible(false)} 
                        style={[styles.cancelButton, { borderColor: COLORS.border }]}
                    >
                        <Text style={[styles.buttonText, { color: COLORS.textDark }]}>
                            Cancel
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    if (!isConnected || !client) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: COLORS.background }]}>
                <Text style={[styles.loadingText, { color: COLORS.textDark }]}>
                    Connecting to chat...
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: COLORS.background }]}>
            <Chat client={client}>
                <ChannelList
                    filters={filters}
                    sort={sort}
                    Preview={CustomChannelPreview}
                    onSelect={onSelectChannel}
                />
            </Chat>
            
            <TouchableOpacity 
                style={[styles.fab, { backgroundColor: COLORS.primary }]}
                onPress={() => setGroupModalVisible(true)}
            >
                <Ionicons name="add" size={24} color={COLORS.white} />
            </TouchableOpacity>
            
            {renderGroupModal()}
            <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
    },
    channelPreview: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        alignItems: 'center',
    },
    channelInfo: {
        flex: 1,
    },
    channelName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    lastMessage: {
        fontSize: 14,
    },
    unreadBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadCount: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalContainer: {
        flex: 1,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    input: {
        borderBottomWidth: 1,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 20,
    },
    modalButtons: {
        marginTop: 'auto',
    },
    createButton: {
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
    },
    cancelButton: {
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
    },
    buttonText: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default ChatComponent;