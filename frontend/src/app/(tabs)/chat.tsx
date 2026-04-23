import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, Alert, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { 
    ChannelList, 
    Chat, 
    OverlayProvider 
} from 'stream-chat-react-native-core';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/authContext';
import { useChatContext } from '../../context/ChatContext';

const ChatScreen = () => {
    const { COLORS, mode } = useTheme();
    const { user } = useAuth();
    const router = useRouter();
    const { client, createRoom, isConnected } = useChatContext();

    const [groupModalVisible, setGroupModalVisible] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);

    // Stream Chat filters and sort
    const filters = {
        type: 'messaging',
        members: { $in: [user?.id] },
    };

    const sort = { last_message_at: -1 };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || selectedMembers.length < 2) {
            Alert.alert('Error', 'Group name and at least 2 members required');
            return;
        }
        try {
            const roomId = `group_${Date.now()}`;
            const roomData = {
                roomId,
                name: newGroupName,
                type: 'messaging',
                members: [
                    { user_id: user.id, user_type: user.role, role: 'owner' },
                    ...selectedMembers.map(m => ({
                        user_id: m.id,
                        user_type: m.role,
                        role: 'member'
                    }))
                ]
            };
            await createRoom(roomData);
            setGroupModalVisible(false);
            setNewGroupName('');
            setSelectedMembers([]);
        } catch (error) {
            Alert.alert('Error', 'Failed to create group');
        }
    };

    const startDirectChat = async (otherUser) => {
        try {
            const roomId = [user.id, otherUser.id].sort().join('_');
            const roomData = {
                roomId,
                name: `${user.username} & ${otherUser.username}`,
                type: 'messaging',
                members: [
                    { user_id: user.id, user_type: user.role, role: 'member' },
                    { user_id: otherUser.id, user_type: otherUser.role, role: 'member' }
                ]
            };
            await createRoom(roomData);
            
            // Navigate to chat room
            router.push({
                pathname: '/(screens)/ChatRoomScreen',
                params: { roomId: roomData.roomId, roomName: roomData.name }
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to start chat');
        }
    };

    // Handle channel selection
    const onSelectChannel = (channel) => {
        router.push({
            pathname: '/(screens)/ChatRoomScreen',
            params: { 
                roomId: channel.id, 
                roomName: channel.data.name || 'Chat'
            }
        });
    };

    // Custom channel preview component
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

    // Group creation modal
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
                
                {/* TODO: Add user selection component */}
                <Text style={[styles.todoText, { color: COLORS.textSecondary }]}>
                    Member selection component needed
                </Text>
                
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
            <OverlayProvider>
                <Chat client={client}>
                    <ChannelList
                        // filters={filters}
                        // sort={sort}
                        // Preview={CustomChannelPreview}
                        // onSelect={onSelectChannel}
                    />
                </Chat>
            </OverlayProvider>
            
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
    todoText: {
        fontStyle: 'italic',
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

export default ChatScreen;




// import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, TextInput, Image, KeyboardAvoidingView, Platform } from 'react-native';
// import React, { useState, useEffect } from 'react';
// import { StatusBar } from 'expo-status-bar';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import Ionicons from '@expo/vector-icons/Ionicons';
// import { useTheme } from '../../context/ThemeContext';
// import { useAuth } from '../../context/authContext';

// const { width: screenWidth } = Dimensions.get('window');

// // Mock data for chats
// const mockChats = [
//     {
//         id: 1,
//         name: 'Phillip Franci',
//         lastMessage: 'Hey, It\'s been a while since we ve...',
//         time: '10:30 am',
//         avatar: 'https://i.pravatar.cc/150?img=1',
//         isOnline: true,
//         unreadCount: 0,
//         isPinned: true,
//         hasDelivered: true
//     },
//     {
//         id: 2,
//         name: 'Alfredo Saris',
//         lastMessage: 'Hello, Good Morning Bro!',
//         time: '08:30 am',
//         avatar: 'https://i.pravatar.cc/150?img=2',
//         isOnline: false,
//         unreadCount: 1,
//         isPinned: true,
//         hasDelivered: false
//     },
//     {
//         id: 3,
//         name: 'Jaylon Franci',
//         lastMessage: 'Everything\'s good',
//         time: '08:30 am',
//         avatar: 'https://i.pravatar.cc/150?img=3',
//         isOnline: true,
//         unreadCount: 0,
//         isPinned: false,
//         hasDelivered: true
//     },
//     {
//         id: 4,
//         name: 'Tatiana Dorwart',
//         lastMessage: 'Okay Thanks!',
//         time: '06:30 am',
//         avatar: 'https://i.pravatar.cc/150?img=4',
//         isOnline: false,
//         unreadCount: 0,
//         isPinned: false,
//         hasDelivered: false
//     },
//     {
//         id: 5,
//         name: 'Terry Bergson',
//         lastMessage: 'Same here!',
//         time: '06:30 am',
//         avatar: 'https://i.pravatar.cc/150?img=5',
//         isOnline: true,
//         unreadCount: 0,
//         isPinned: false,
//         hasDelivered: true
//     }
// ];

// const mockGroupChats = [
//     {
//         id: 1,
//         name: 'Team Discussion',
//         lastMessage: 'John: Let\'s meet tomorrow',
//         time: '12:45 pm',
//         avatar: 'https://i.pravatar.cc/150?img=10',
//         memberCount: 8,
//         unreadCount: 3,
//         isPinned: true
//     },
//     {
//         id: 2,
//         name: 'Project Alpha',
//         lastMessage: 'Sarah: Updated the documents',
//         time: '11:20 am',
//         avatar: 'https://i.pravatar.cc/150?img=11',
//         memberCount: 12,
//         unreadCount: 0,
//         isPinned: false
//     }
// ];

// const mockCalls = [
//     {
//         id: 1,
//         name: 'Abdurrahman Client',
//         time: '12:33 PM',
//         avatar: 'https://i.pravatar.cc/150?img=6',
//         callType: 'incoming',
//         callStatus: 'missed'
//     },
//     {
//         id: 2,
//         name: '+92 287 918273',
//         time: '4:20 PM',
//         avatar: null,
//         callType: 'outgoing',
//         callStatus: 'answered'
//     },
//     {
//         id: 3,
//         name: 'Christ Client',
//         time: '7:30 AM',
//         avatar: 'https://i.pravatar.cc/150?img=7',
//         callType: 'incoming',
//         callStatus: 'answered'
//     }
// ];

// const recentContacts = [
//     { id: 1, name: 'Phillip', avatar: 'https://i.pravatar.cc/150?img=1' },
//     { id: 2, name: 'Alfredo', avatar: 'https://i.pravatar.cc/150?img=2' },
//     { id: 3, name: 'Jaylon', avatar: 'https://i.pravatar.cc/150?img=3' },
//     { id: 4, name: 'Tatiana', avatar: 'https://i.pravatar.cc/150?img=4' },
//     { id: 5, name: 'Terry', avatar: 'https://i.pravatar.cc/150?img=5' }
// ];

// const ChatScreen = () => {
//     const { COLORS, mode } = useTheme();
//     const auth = useAuth();
//     const user = auth?.user;
//     const [activeTab, setActiveTab] = useState('message');
//     const [searchQuery, setSearchQuery] = useState('');
//     const [showDirectMessage, setShowDirectMessage] = useState(false);

//     const tabs = [
//         { id: 'message', label: 'Messages', icon: 'chatbubble' },
//         { id: 'group', label: 'Groups', icon: 'people' },
//         { id: 'calls', label: 'Calls', icon: 'call' }
//     ];

//     const statusBarStyle = mode === 'dark' || COLORS.background === '#000' ? 'light' : 'dark';

//     const renderTabBar = () => (
//         <View style={[styles.tabContainer, { backgroundColor: COLORS.background }]}>
//             {tabs.map((tab) => (
//                 <TouchableOpacity
//                     key={tab.id}
//                     style={[
//                         styles.tab,
//                         activeTab === tab.id && [styles.activeTab, { backgroundColor: COLORS.primary }]
//                     ]}
//                     onPress={() => setActiveTab(tab.id)}
//                 >
//                     <Ionicons 
//                         name={tab.icon} 
//                         size={20} 
//                         color={activeTab === tab.id ? COLORS.white : COLORS.textSecondary} 
//                     />
//                     <Text style={[
//                         styles.tabText,
//                         { color: activeTab === tab.id ? COLORS.white : COLORS.textSecondary }
//                     ]}>
//                         {tab.label}
//                     </Text>
//                 </TouchableOpacity>
//             ))}
//         </View>
//     );

//     const renderContactsList = () => (
//         <View style={styles.contactsContainer}>
//             <Text style={[styles.contactsTitle, { color: COLORS.textDark }]}>Contact List</Text>
//             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactsScroll}>
//                 {recentContacts.map((contact) => (
//                     <TouchableOpacity key={contact.id} style={styles.contactItem}>
//                         <View style={styles.contactAvatar}>
//                             <Image source={{ uri: contact.avatar }} style={styles.contactAvatarImage} />
//                         </View>
//                         <Text style={[styles.contactName, { color: COLORS.textDark }]}>{contact.name}</Text>
//                     </TouchableOpacity>
//                 ))}
//             </ScrollView>
//         </View>
//     );

//     const renderChatItem = (chat, isPinned = false) => (
//         <TouchableOpacity key={chat.id} style={[styles.chatItem, { backgroundColor: COLORS.background }]}>
//             <View style={styles.chatAvatar}>
//                 <Image source={{ uri: chat.avatar }} style={styles.avatarImage} />
//                 {chat.isOnline && <View style={[styles.onlineIndicator, { backgroundColor: COLORS.success }]} />}
//             </View>
            
//             <View style={styles.chatContent}>
//                 <View style={styles.chatHeader}>
//                     <Text style={[styles.chatName, { color: COLORS.textDark }]}>{chat.name}</Text>
//                     <Text style={[styles.chatTime, { color: COLORS.textSecondary }]}>{chat.time}</Text>
//                 </View>
//                 <View style={styles.chatFooter}>
//                     <Text style={[styles.lastMessage, { color: COLORS.textSecondary }]} numberOfLines={1}>
//                         {chat.lastMessage}
//                     </Text>
//                     <View style={styles.chatIcons}>
//                         {chat.hasDelivered && (
//                             <Ionicons name="checkmark-done" size={16} color={COLORS.primary} />
//                         )}
//                         {chat.unreadCount > 0 && (
//                             <View style={[styles.unreadBadge, { backgroundColor: COLORS.error }]}>
//                                 <Text style={styles.unreadText}>{chat.unreadCount}</Text>
//                             </View>
//                         )}
//                     </View>
//                 </View>
//             </View>
//         </TouchableOpacity>
//     );

//     const renderGroupChatItem = (group) => (
//         <TouchableOpacity key={group.id} style={[styles.chatItem, { backgroundColor: COLORS.background }]}>
//             <View style={styles.chatAvatar}>
//                 <Image source={{ uri: group.avatar }} style={styles.avatarImage} />
//                 <View style={[styles.groupIndicator, { backgroundColor: COLORS.primary }]}>
//                     <Text style={styles.groupMemberCount}>{group.memberCount}</Text>
//                 </View>
//             </View>
            
//             <View style={styles.chatContent}>
//                 <View style={styles.chatHeader}>
//                     <Text style={[styles.chatName, { color: COLORS.textDark }]}>{group.name}</Text>
//                     <Text style={[styles.chatTime, { color: COLORS.textSecondary }]}>{group.time}</Text>
//                 </View>
//                 <View style={styles.chatFooter}>
//                     <Text style={[styles.lastMessage, { color: COLORS.textSecondary }]} numberOfLines={1}>
//                         {group.lastMessage}
//                     </Text>
//                     <View style={styles.chatIcons}>
//                         {group.unreadCount > 0 && (
//                             <View style={[styles.unreadBadge, { backgroundColor: COLORS.error }]}>
//                                 <Text style={styles.unreadText}>{group.unreadCount}</Text>
//                             </View>
//                         )}
//                     </View>
//                 </View>
//             </View>
//         </TouchableOpacity>
//     );

//     const renderCallItem = (call) => (
//         <TouchableOpacity key={call.id} style={[styles.chatItem, { backgroundColor: COLORS.background }]}>
//             <View style={styles.chatAvatar}>
//                 {call.avatar ? (
//                     <Image source={{ uri: call.avatar }} style={styles.avatarImage} />
//                 ) : (
//                     <View style={[styles.avatarPlaceholder, { backgroundColor: COLORS.lightGrey }]}>
//                         <Ionicons name="person" size={24} color={COLORS.textSecondary} />
//                     </View>
//                 )}
//             </View>
            
//             <View style={styles.chatContent}>
//                 <View style={styles.chatHeader}>
//                     <Text style={[styles.chatName, { color: COLORS.textDark }]}>{call.name}</Text>
//                     <Text style={[styles.chatTime, { color: COLORS.textSecondary }]}>{call.time}</Text>
//                 </View>
//                 <View style={styles.chatFooter}>
//                     <View style={styles.callInfo}>
//                         <Ionicons 
//                             name={call.callType === 'incoming' ? 'call-outline' : 'call-outline'} 
//                             size={16} 
//                             color={call.callStatus === 'missed' ? COLORS.error : COLORS.success} 
//                         />
//                         <Text style={[
//                             styles.callStatus, 
//                             { color: call.callStatus === 'missed' ? COLORS.error : COLORS.textSecondary }
//                         ]}>
//                             {call.callStatus === 'missed' ? 'Missed' : 'Answered'}
//                         </Text>
//                     </View>
//                     <TouchableOpacity style={styles.callButton}>
//                         <Ionicons name="call" size={18} color={COLORS.primary} />
//                     </TouchableOpacity>
//                 </View>
//             </View>
//         </TouchableOpacity>
//     );

//     const renderContent = () => {
//         switch (activeTab) {
//             case 'message':
//                 const pinnedChats = mockChats.filter(chat => chat.isPinned);
//                 const regularChats = mockChats.filter(chat => !chat.isPinned);
                
//                 return (
//                   <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}  style={{flex: 1}}>
//                     <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
//                         {renderContactsList()}
                        
//                         <View style={styles.searchContainer}>
//                             <View style={[styles.searchBar, { backgroundColor: COLORS.cardBackground }]}>
//                                 <Ionicons name="search" size={20} color={COLORS.textSecondary} />
//                                 <TextInput
//                                     style={[styles.searchInput, { color: COLORS.textDark }]}
//                                     placeholder="Search..."
//                                     placeholderTextColor={COLORS.textSecondary}
//                                     value={searchQuery}
//                                     onChangeText={setSearchQuery}
//                                 />
//                             </View>
//                             <TouchableOpacity style={styles.filterButton}>
//                                 <Ionicons name="options" size={20} color={COLORS.textSecondary} />
//                             </TouchableOpacity>
//                         </View>

//                         <View style={styles.directMessageContainer}>
//                             <TouchableOpacity 
//                                 style={[styles.directMessageButton, { backgroundColor: COLORS.warning }]}
//                                 onPress={() => setShowDirectMessage(!showDirectMessage)}
//                             >
//                                 <Text style={styles.directMessageText}>Direct Message</Text>
//                                 <View style={[styles.directMessageBadge, { backgroundColor: COLORS.textDark }]}>
//                                     <Text style={styles.directMessageBadgeText}>3</Text>
//                                 </View>
//                             </TouchableOpacity>
//                             <TouchableOpacity style={[styles.groupButton, { backgroundColor: COLORS.cardBackground }]}>
//                                 <Text style={[styles.groupButtonText, { color: COLORS.textDark }]}>Group</Text>
//                                 <Ionicons name="add" size={16} color={COLORS.textDark} />
//                             </TouchableOpacity>
//                         </View>

//                         {pinnedChats.length > 0 && (
//                             <View style={styles.sectionContainer}>
//                                 <Text style={[styles.sectionTitle, { color: COLORS.textDark }]}>
//                                     Pinned Message({pinnedChats.length})
//                                 </Text>
//                                 {pinnedChats.map(chat => renderChatItem(chat, true))}
//                             </View>
//                         )}

//                         <View style={styles.sectionContainer}>
//                             <Text style={[styles.sectionTitle, { color: COLORS.textDark }]}>
//                                 All Message({regularChats.length})
//                             </Text>
//                             {regularChats.map(chat => renderChatItem(chat))}
//                         </View>
//                     </ScrollView>
//                   </KeyboardAvoidingView>
//                 );

//             case 'group':
//                 return (
//                     <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
//                         <View style={styles.searchContainer}>
//                             <View style={[styles.searchBar, { backgroundColor: COLORS.cardBackground }]}>
//                                 <Ionicons name="search" size={20} color={COLORS.textSecondary} />
//                                 <TextInput
//                                     style={[styles.searchInput, { color: COLORS.textDark }]}
//                                     placeholder="Search groups..."
//                                     placeholderTextColor={COLORS.textSecondary}
//                                     value={searchQuery}
//                                     onChangeText={setSearchQuery}
//                                 />
//                             </View>
//                         </View>

//                         <View style={styles.sectionContainer}>
//                             <Text style={[styles.sectionTitle, { color: COLORS.textDark }]}>
//                                 Group Chats({mockGroupChats.length})
//                             </Text>
//                             {mockGroupChats.map(group => renderGroupChatItem(group))}
//                         </View>
//                     </ScrollView>
//                 );

//             case 'calls':
//                 return (
//                     <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
//                         <View style={styles.searchContainer}>
//                             <View style={[styles.searchBar, { backgroundColor: COLORS.cardBackground }]}>
//                                 <Ionicons name="search" size={20} color={COLORS.textSecondary} />
//                                 <TextInput
//                                     style={[styles.searchInput, { color: COLORS.textDark }]}
//                                     placeholder="Search calls..."
//                                     placeholderTextColor={COLORS.textSecondary}
//                                     value={searchQuery}
//                                     onChangeText={setSearchQuery}
//                                 />
//                             </View>
//                         </View>

//                         <View style={styles.sectionContainer}>
//                             <Text style={[styles.sectionTitle, { color: COLORS.textDark }]}>
//                                 Recent Calls({mockCalls.length})
//                             </Text>
//                             {mockCalls.map(call => renderCallItem(call))}
//                         </View>
//                     </ScrollView>
//                 );

//             default:
//                 return null;
//         }
//     };

//     const styles = StyleSheet.create({
//         container: {
//             flex: 1,
//             backgroundColor: COLORS.background,
//         },
//         header: {
//             paddingHorizontal: 20,
//             paddingTop: 10,
//             paddingBottom: 15,
//             backgroundColor: COLORS.background,
//         },
//         headerTop: {
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             marginBottom: 15,
//         },
//         headerTitle: {
//             fontSize: 24,
//             fontWeight: 'bold',
//             color: COLORS.textDark,
//         },
//         headerActions: {
//             flexDirection: 'row',
//             gap: 15,
//         },
//         headerButton: {
//             padding: 8,
//         },
//         messageStats: {
//             backgroundColor: COLORS.primary,
//             borderRadius: 16,
//             padding: 20,
//             marginBottom: 10,
//         },
//         statsText: {
//             color: COLORS.white,
//             fontSize: 14,
//             marginBottom: 5,
//         },
//         statsNumber: {
//             color: COLORS.white,
//             fontSize: 24,
//             fontWeight: 'bold',
//         },
//         contactsContainer: {
//             paddingHorizontal: 20,
//             marginBottom: 20,
//         },
//         contactsTitle: {
//             fontSize: 16,
//             fontWeight: '600',
//             marginBottom: 15,
//         },
//         contactsScroll: {
//             marginHorizontal: -10,
//         },
//         contactItem: {
//             alignItems: 'center',
//             marginHorizontal: 10,
//         },
//         contactAvatar: {
//             width: 60,
//             height: 60,
//             borderRadius: 30,
//             marginBottom: 8,
//         },
//         contactAvatarImage: {
//             width: '100%',
//             height: '100%',
//             borderRadius: 30,
//         },
//         contactName: {
//             fontSize: 12,
//             fontWeight: '500',
//         },
//         tabContainer: {
//             flexDirection: 'row',
//             paddingHorizontal: 20,
//             paddingVertical: 10,
//             gap: 10,
//         },
//         tab: {
//             flexDirection: 'row',
//             alignItems: 'center',
//             paddingHorizontal: 16,
//             paddingVertical: 10,
//             borderRadius: 25,
//             backgroundColor: COLORS.cardBackground,
//             gap: 8,
//         },
//         activeTab: {
//             backgroundColor: COLORS.primary,
//         },
//         tabText: {
//             fontSize: 14,
//             fontWeight: '500',
//         },
//         contentContainer: {
//             flex: 1,
//         },
//         searchContainer: {
//             flexDirection: 'row',
//             paddingHorizontal: 20,
//             marginBottom: 20,
//             gap: 10,
//         },
//         searchBar: {
//             flex: 1,
//             flexDirection: 'row',
//             alignItems: 'center',
//             paddingHorizontal: 15,
//             borderRadius: 12,
//             gap: 10,
//         },
//         searchInput: {
//             flex: 1,
//             fontSize: 16,
//         },
//         filterButton: {
//             padding: 12,
//             borderRadius: 12,
//             backgroundColor: COLORS.cardBackground,
//         },
//         directMessageContainer: {
//             flexDirection: 'row',
//             paddingHorizontal: 20,
//             marginBottom: 20,
//             gap: 10,
//         },
//         directMessageButton: {
//             flex: 1,
//             flexDirection: 'row',
//             alignItems: 'center',
//             justifyContent: 'center',
//             paddingVertical: 12,
//             borderRadius: 12,
//             gap: 8,
//         },
//         directMessageText: {
//             color: COLORS.textDark,
//             fontWeight: '600',
//         },
//         directMessageBadge: {
//             paddingHorizontal: 8,
//             paddingVertical: 2,
//             borderRadius: 10,
//             minWidth: 20,
//             alignItems: 'center',
//         },
//         directMessageBadgeText: {
//             color: COLORS.primaryLight,
//             fontSize: 12,
//             fontWeight: '600',
//         },
//         groupButton: {
//             flexDirection: 'row',
//             alignItems: 'center',
//             paddingHorizontal: 20,
//             paddingVertical: 12,
//             borderRadius: 12,
//             gap: 5,
//         },
//         groupButtonText: {
//             fontWeight: '600',
//         },
//         sectionContainer: {
//             paddingHorizontal: 20,
//             marginBottom: 20,
//         },
//         sectionTitle: {
//             fontSize: 16,
//             fontWeight: '600',
//             marginBottom: 15,
//         },
//         chatItem: {
//             flexDirection: 'row',
//             alignItems: 'center',
//             paddingVertical: 12,
//             gap: 12,
//         },
//         chatAvatar: {
//             position: 'relative',
//         },
//         avatarImage: {
//             width: 50,
//             height: 50,
//             borderRadius: 25,
//         },
//         avatarPlaceholder: {
//             width: 50,
//             height: 50,
//             borderRadius: 25,
//             justifyContent: 'center',
//             alignItems: 'center',
//         },
//         onlineIndicator: {
//             position: 'absolute',
//             bottom: 2,
//             right: 2,
//             width: 12,
//             height: 12,
//             borderRadius: 6,
//             borderWidth: 2,
//             borderColor: COLORS.background,
//         },
//         groupIndicator: {
//             position: 'absolute',
//             bottom: -2,
//             right: -2,
//             paddingHorizontal: 4,
//             paddingVertical: 1,
//             borderRadius: 8,
//             minWidth: 16,
//             alignItems: 'center',
//         },
//         groupMemberCount: {
//             color: COLORS.white,
//             fontSize: 10,
//             fontWeight: '600',
//         },
//         chatContent: {
//             flex: 1,
//         },
//         chatHeader: {
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//             marginBottom: 4,
//         },
//         chatName: {
//             fontSize: 16,
//             fontWeight: '600',
//         },
//         chatTime: {
//             fontSize: 12,
//         },
//         chatFooter: {
//             flexDirection: 'row',
//             justifyContent: 'space-between',
//             alignItems: 'center',
//         },
//         lastMessage: {
//             fontSize: 14,
//             flex: 1,
//             marginRight: 10,
//         },
//         chatIcons: {
//             flexDirection: 'row',
//             alignItems: 'center',
//             gap: 8,
//         },
//         unreadBadge: {
//             paddingHorizontal: 6,
//             paddingVertical: 2,
//             borderRadius: 10,
//             minWidth: 20,
//             alignItems: 'center',
//         },
//         unreadText: {
//             color: COLORS.white,
//             fontSize: 12,
//             fontWeight: '600',
//         },
//         callInfo: {
//             flexDirection: 'row',
//             alignItems: 'center',
//             gap: 5,
//         },
//         callStatus: {
//             fontSize: 12,
//         },
//         callButton: {
//             padding: 8,
//             borderRadius: 20,
//             backgroundColor: COLORS.primaryLight,
//         },
//         fab: {
//             position: 'absolute',
//             bottom: 30,
//             right: 20,
//             width: 56,
//             height: 56,
//             borderRadius: 28,
//             backgroundColor: COLORS.primary,
//             justifyContent: 'center',
//             alignItems: 'center',
//             elevation: 8,
//             shadowColor: COLORS.primary,
//             shadowOffset: { width: 0, height: 4 },
//             shadowOpacity: 0.3,
//             shadowRadius: 8,
//         },
//     });

//     return (
//         <SafeAreaView style={styles.container} edges={['top']}>
//             {/* Header */}
//             <View style={styles.header}>
//                 <View style={styles.headerTop}>
//                     <Text style={styles.headerTitle}>
//                         {activeTab === 'message' ? 'Message' : 
//                         activeTab === 'group' ? 'Groups' : 'Calls'}
//                     </Text>
//                     <View style={styles.headerActions}>
//                         <TouchableOpacity style={styles.headerButton}>
//                             <Ionicons name="notifications-outline" size={24} color={COLORS.textDark} />
//                         </TouchableOpacity>
//                         <TouchableOpacity style={styles.headerButton}>
//                             <Ionicons name="create-outline" size={24} color={COLORS.textDark} />
//                         </TouchableOpacity>
//                     </View>
//                 </View>
                
//                 {activeTab === 'message' && (
//                     <View style={styles.messageStats}>
//                         <Text style={styles.statsText}>Hi, {user?.first_name || 'User'}!</Text>
//                         <Text style={styles.statsText}>You Received</Text>
//                         <Text style={styles.statsNumber}>48 Messages</Text>
//                     </View>
//                 )}
//             </View>

//             {/* Tab Bar */}
//             {renderTabBar()}

//             {/* Content */}
//             {renderContent()}

//             {/* Floating Action Button */}
//             <TouchableOpacity style={styles.fab}>
//                 <Ionicons name="add" size={24} color={COLORS.white} />
//             </TouchableOpacity>

//             <StatusBar style={statusBarStyle} />
//         </SafeAreaView>
//     );
// };

// export default ChatScreen;
