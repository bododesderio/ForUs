import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, TextInput, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/authContext';
import { useChatContext } from '../../context/ChatContext';
import { getUserChatRooms } from '../../services/api';

// Stream Chat Components
import { 
  Chat, 
  ChannelList, 
  OverlayProvider,
  ChannelPreviewMessenger,
  ChannelListHeaderNetworkDownIndicator,
  ChannelListLoadingIndicator,
  ChannelListMessenger,
  Channel,
  Avatar
} from 'stream-chat-expo';

const { width: screenWidth } = Dimensions.get('window');

// Create Stream Chat theme for channel list
const createStreamChatChannelListTheme = (COLORS) => ({
  channelListHeaderErrorIndicator: {
    container: {
      backgroundColor: COLORS.error,
    },
    errorText: {
      color: COLORS.white,
    },
  },
  channelListLoadingIndicator: {
    container: {
      backgroundColor: COLORS.background,
    },
  },
  channelListMessenger: {
    flatList: {
      backgroundColor: COLORS.background,
    },
    flatListContent: {
      backgroundColor: COLORS.background,
    },
  },
  channelPreviewMessenger: {
    container: {
      backgroundColor: COLORS.white,
      borderBottomColor: COLORS.border,
      borderBottomWidth: 0.5,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    contentContainer: {
      backgroundColor: COLORS.white,
      flex: 1,
    },
    avatarContainer: {
      marginRight: 12,
    },
    avatar: {
      width: 500,
      height: 500,
      borderRadius: 25,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    title: {
      // color: colors.white,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    message: {
      color: COLORS.white,
      fontSize: 14,
      flex: 1,
    },
    date: {
      color: COLORS.textSecondary,
      fontSize: 12,
    },
    unreadContainer: {
      backgroundColor: COLORS.primary,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
    },
    unreadText: {
      color: COLORS.white,
      fontSize: 12,
      fontWeight: '600',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    details: {
      flex: 1,
    },
    detailsTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    detailsBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: COLORS.background,
      backgroundColor: COLORS.success,
    },
  },
  colors: {
    primary: COLORS.primary,
    secondary: COLORS.primaryTeal,
    accent_blue: COLORS.primary,
    accent_green: COLORS.success,
    accent_red: COLORS.error,
    bg_gradient_end: COLORS.gradientEnd,
    bg_gradient_start: COLORS.gradientStart,
    black: COLORS.black,
    blue_alice: COLORS.primaryLight,
    border: COLORS.border,
    grey: COLORS.grey,
    grey_gainsboro: COLORS.lightGrey,
    grey_whisper: COLORS.cardBackground,
    icon: COLORS.textSecondary,
    modal: COLORS.background,
    overlay: COLORS.background + '80',
    shadow_icon: COLORS.textSecondary,
    targetedMessageBackground: COLORS.primaryLight,
    transparent: 'transparent',
    white: COLORS.white,
    white_smoke: COLORS.background,
    white_snow: COLORS.cardBackground,
  },
});

const UsersChatScreen = () => {
  const { COLORS, mode } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { client, createRoom, isConnected, loading, error } = useChatContext();

  // State management
  const [activeTab, setActiveTab] = useState('message');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const tabs = [
    { id: 'message', label: 'Messages', icon: 'chatbubbles-outline' as const },
    { id: 'group', label: 'Groups', icon: 'people-outline' as const },
    { id: 'calls', label: 'Calls', icon: 'call-outline' as const }
  ];

  const statusBarStyle = mode === 'dark' || COLORS.background === '#000' ? 'light' : 'dark';

  // Create the Stream Chat theme
  const streamChatTheme = useMemo(() => createStreamChatChannelListTheme(COLORS), [COLORS]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 15,
      backgroundColor: COLORS.background,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: COLORS.textDark,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 15,
    },
    headerButton: {
      padding: 8,
    },
    messageStats: {
      backgroundColor: COLORS.primary,
      borderRadius: 16,
      padding: 20,
      marginBottom: 10,
    },
    statsText: {
      color: COLORS.white,
      fontSize: 14,
      marginBottom: 5,
    },
    statsNumber: {
      color: COLORS.white,
      fontSize: 24,
      fontWeight: 'bold',
    },
    tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 10,
      gap: 10,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 25,
      backgroundColor: COLORS.cardBackground,
      gap: 8,
    },
    activeTab: {
      backgroundColor: COLORS.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '500',
    },
    contentContainer: {
      flex: 1,
    },
    searchContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      marginBottom: 20,
      gap: 10,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 15,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
    },
    directMessageContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      marginBottom: 20,
      gap: 10,
    },
    directMessageButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      gap: 8,
    },
    directMessageText: {
      color: COLORS.textDark,
      fontWeight: '600',
    },
    groupButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      gap: 5,
    },
    groupButtonText: {
      fontWeight: '600',
    },
    channelListContainer: {
      flex: 1,
    },
    channelFlatList: {
      flex: 1,
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      textAlign: 'center',
      fontSize: 14,
      fontStyle: 'italic',
    },
    fab: {
      position: 'absolute',
      bottom: 30,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: COLORS.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
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

  // Custom Empty State Component
  const CustomEmptyState = ({ listType }) => {
    const { COLORS } = useTheme();
    
    const getEmptyMessage = () => {
      switch (listType) {
        case 'messaging':
          return 'No direct messages yet';
        case 'group':
          return 'No group chats yet';
        case 'calls':
          return 'No recent calls';
        default:
          return 'No channels yet';
      }
    };

    return (
      <View style={styles.emptyStateContainer}>
        <Text style={[styles.emptyText, { color: COLORS.textSecondary }]}>
          {getEmptyMessage()}
        </Text>
      </View>
    );
  };

  // Custom Loading Component
  const CustomLoadingIndicator = () => {
    const { COLORS } = useTheme();
    
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { color: COLORS.textSecondary }]}>
          Loading channels...
        </Text>
      </View>
    );
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Error', 'Group name is required');
      return;
    }
    try {
      const roomId = `group_${Date.now()}`;
      const channel = client.channel('messaging', roomId, {
        name: newGroupName,
        members: [client.userID],
      });
      await channel.create();
      setGroupModalVisible(false);
      setNewGroupName('');
    } catch (error) {
      Alert.alert('Error', 'Failed to create group');
    }
  };

  const onSelectChannel = (channel) => {
    const channelName = channel.data?.name || 
      Object.values(channel.state.members)
        .filter(member => member.user?.id !== client.userID)
        .map(member => member.user?.name || member.user?.id)
        .join(', ') || 'Chat';

    router.push({
      pathname: '/(screens)/ChatRoomScreen',
      params: { 
        roomId: channel.id, 
        roomName: channelName
      }
    });
  };

  // Channel list filters
  const getChannelFilters = () => {
    const baseFilter = {
      type: 'messaging',
      members: { $in: [client.userID] },
    };

    if (searchQuery) {
      baseFilter.$or = [
        { name: { $autocomplete: searchQuery } },
        { 'member.user.name': { $autocomplete: searchQuery } },
      ];
    }

    switch (activeTab) {
      case 'group':
        return { ...baseFilter, member_count: { $gt: 2 } };
      case 'message':
        return { ...baseFilter, member_count: { $lte: 2 } };
      default:
        return baseFilter;
    }
  };

  // Custom Avatar Generator for Channel Preview
  const generateAvatarProps = (channel) => {
    const { user } = useAuth();
    const isGroupChannel = channel.data?.name || Object.keys(channel.state.members || {}).length > 2;
    
    if (isGroupChannel) {
      return {
        image: null,
        name: channel.data?.name || 'Group',
        size: 50,
      };
    }

    const members = Object.values(channel.state.members || {});
    const otherMember = members.find(member => member.user?.id !== user?.id);
    
    return {
      image: otherMember?.user?.image,
      name: otherMember?.user?.name || 'User',
      size: 50,
      online: otherMember?.user?.online,
    };
  };

  const renderTabBar = () => (
    <View style={[styles.tabContainer, { backgroundColor: COLORS.background }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.tab,
            activeTab === tab.id && [styles.activeTab, { backgroundColor: COLORS.primary }]
          ]}
          onPress={() => setActiveTab(tab.id)}
        >
          <Ionicons 
            name={tab.icon} 
            size={20} 
            color={activeTab === tab.id ? COLORS.white : COLORS.textSecondary} 
          />
          <Text style={[
            styles.tabText,
            { color: activeTab === tab.id ? COLORS.white : COLORS.textSecondary }
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
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

  const renderContent = () => {
    if (activeTab === 'calls') {
      return (
        <View style={styles.contentContainer}>
          <View style={styles.searchContainer}>
            <View style={[styles.searchBar, { backgroundColor: COLORS.cardBackground }]}>
              <Ionicons name="search" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: COLORS.textDark }]}
                placeholder="Search calls..."
                placeholderTextColor={COLORS.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
          <CustomEmptyState listType="calls" />
        </View>
      );
    }

    return (
      <View style={styles.contentContainer}>
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: COLORS.cardBackground }]}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: COLORS.textDark }]}
              placeholder={`Search ${activeTab === 'group' ? 'groups' : 'messages'}...`}
              placeholderTextColor={COLORS.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View style={styles.channelListContainer}>
          <ChannelList
            filters={getChannelFilters()}
            sort={{ last_message_at: -1 }}
            options={{ 
              state: true, 
              watch: true, 
              presence: true,
              limit: 20,
            }}
            onSelect={onSelectChannel}
            Preview={(props) => (
              <ChannelPreviewMessenger 
                {...props}
                Avatar={(avatarProps) => {
                  const customAvatarProps = generateAvatarProps(props.channel);
                  return (
                    <View style={styles.channelAvatar}>
                      <Avatar
                        {...avatarProps}
                        image={customAvatarProps.image}
                        name={customAvatarProps.name}
                        size={customAvatarProps.size}
                      />
                      {customAvatarProps.online && !customAvatarProps.image && (
                        <View style={styles.onlineIndicator} />
                      )}
                      {props.channel.data?.name && (
                        <View style={[styles.groupIndicator, { backgroundColor: COLORS.primary }]}>
                          <Text style={styles.groupMemberCount}>
                            {Object.keys(props.channel.state.members || {}).length}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                }}
              />
            )}
            EmptyStateIndicator={() => <CustomEmptyState listType={activeTab} />}
            LoadingIndicator={CustomLoadingIndicator}
            HeaderErrorIndicator={ChannelListHeaderNetworkDownIndicator}
            List={ChannelListMessenger}
            additionalFlatListProps={{
              style: [styles.channelFlatList, { backgroundColor: COLORS.background }],
              showsVerticalScrollIndicator: false,
              keyboardShouldPersistTaps: 'handled',
            }}
          />
        </View>
      </View>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: COLORS.background }]}>
        <Text style={[styles.loadingText, { color: COLORS.textDark }]}>
          Connecting to chat...
        </Text>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: COLORS.background }]}>
        <Text style={[styles.loadingText, { color: 'red' }]}>
          Error: {error}
        </Text>
      </View>
    );
  }

  // Show not connected state
  if (!isConnected || !client) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: COLORS.background }]}>
        <Text style={[styles.loadingText, { color: COLORS.textDark }]}>
          Chat not connected
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>
            {activeTab === 'message' ? 'Messages' : 
            activeTab === 'group' ? 'Groups' : 'Calls'}
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="notifications-outline" size={24} color={COLORS.textDark} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="create-outline" size={24} color={COLORS.textDark} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Tab Bar */}
      {renderTabBar()}

      {/* Content with Stream Chat */}
      <OverlayProvider>
        <Chat client={client} style={streamChatTheme}>
          {renderContent()}
        </Chat>
      </OverlayProvider>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setGroupModalVisible(true)}
      >
        <Ionicons name="add" size={24} color={COLORS.white} />
      </TouchableOpacity>

      {/* Group Creation Modal */}
      {renderGroupModal()}

      <StatusBar style={statusBarStyle} />
    </SafeAreaView>
  );
};

export default UsersChatScreen;