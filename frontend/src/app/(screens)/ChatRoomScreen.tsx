import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Button,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Channel,
  Chat,
  OverlayProvider,
  MessageList,
  MessageInput,
  useChatContext as useStreamChatContext,
  useChannelContext,
  useThreadContext,
  useMessageComposerHasSendableData,
  RootSvg,
  RootPath,
  useMessageInputContext,
  AttachmentUploadPreviewList,
  AutoCompleteInput,
  useMessageContext
} from 'stream-chat-expo';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/authContext';
import { useChatContext } from '../../context/ChatContext';
import { Audio } from 'expo-av';

// Reaction Emoji Options
const REACTION_EMOJIS = [
  { emoji: '👍', type: 'thumbs_up' },
  { emoji: '❤️', type: 'heart' },
  { emoji: '😂', type: 'joy' },
  { emoji: '😮', type: 'open_mouth' },
  { emoji: '😢', type: 'cry' },
  { emoji: '🔥', type: 'fire' }
];

// Custom Header Component
const CustomHeader = ({ roomName, onBack }) => {
  const theme = useTheme();
  const COLORS = theme?.COLORS || {};
  const { channel } = useChannelContext();

  const getChannelName = () => {
    if (roomName) return roomName;
    if (channel?.data?.name) return channel.data.name;
    return 'Chat Room';
  };

  const getInitials = (name) => {
    if (!name) return 'CR';
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
  };

  return (
    <View style={[styles.header, { backgroundColor: COLORS.background, borderBottomColor: COLORS.border }]}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={COLORS.textDark} />
      </TouchableOpacity>
      <View style={styles.headerInfo}>
        <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}>
          <Text style={styles.avatarText}>{getInitials(getChannelName())}</Text>
        </View>
        <Text style={[styles.headerTitle, { color: COLORS.textDark }]}>
          {getChannelName()}
        </Text>
      </View>
    </View>
  );
};

// Create Stream Chat theme from your custom colors
// Enhanced Stream Chat theme with reply and audio attachment styling
const createStreamChatTheme = (COLORS, currentUserId) => ({
  messageList: {
    container: {
      backgroundColor: COLORS.background,
    },
  },
  messageInput: {
    container: {
      backgroundColor: COLORS.background,
      borderTopColor: COLORS.border,
      borderTopWidth: 1,
    },
    inputBox: {
      backgroundColor: COLORS.cardBackground,
      borderColor: COLORS.border,
    },
    inputBoxContainer: {
      backgroundColor: COLORS.cardBackground,
      borderColor: COLORS.border,
    },
    autoCompleteInputContainer: {
      backgroundColor: COLORS.cardBackground,
    },
    autoCompleteInput: {
      color: COLORS.textPrimary,
    },
    sendButton: {
      backgroundColor: COLORS.primary,
    },
    sendButtonContainer: {
      backgroundColor: COLORS.primary,
    },
    attachButton: {
      backgroundColor: COLORS.cardBackground,
    },
    attachButtonContainer: {
      backgroundColor: COLORS.cardBackground,
    },
    attachButtonIcon: {
      color: COLORS.primary,
    },
    micButton: {
      backgroundColor: COLORS.cardBackground,
    },
    micButtonContainer: {
      backgroundColor: COLORS.cardBackground,
    },
    micButtonIcon: {
      color: COLORS.primary,
    },
    // Reply styling
    replyContainer: {
      backgroundColor: COLORS.cardBackground,
      borderColor: COLORS.border,
      borderWidth: 1,
      borderRadius: 8,
      marginBottom: 8,
    },
    replyText: {
      color: COLORS.textSecondary,
      fontSize: 14,
    },
    replyToText: {
      color: COLORS.textPrimary,
      fontWeight: '500',
    },
    replyCancelButton: {
      backgroundColor: COLORS.background,
      borderColor: COLORS.border,
    },
    replyCancelButtonIcon: {
      color: COLORS.textSecondary,
    },
  },
  messageSimple: {
    content: {
      container: {
        // backgroundColor: COLORS.cardBackground,
        // borderColor: COLORS.border,
      },
      textContainer: {
        // backgroundColor: COLORS.cardBackground,
      },
      text: {
        color: COLORS.textPrimary,
      },
      markdown: {
        text: {
          color: COLORS.textPrimary,
        },
      },
      containerInner: {
        backgroundColor: currentUserId ? COLORS.cardBackground : COLORS.cardBackground,
        borderWidth: 0
      },
      // Reply message styling
      replyContainer: {
        backgroundColor: COLORS.background,
        borderLeftColor: COLORS.primary,
        borderLeftWidth: 4,
        borderRadius: 8,
        marginBottom: 8,
        paddingLeft: 12,
        paddingVertical: 8,
      },
      replyText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontStyle: 'italic',
      },
      replyAuthor: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
      },
    },
    card: {
      container: {
        backgroundColor: COLORS.cardBackground,
        borderColor: COLORS.border,
      },
    },
    file: {
      container: {
        backgroundColor: COLORS.cardBackground,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 12,
      },
      icon: {
        color: COLORS.primary,
      },
      fileText: {
        color: COLORS.textPrimary,
      },
      details: {
        color: COLORS.textSecondary,
      },
      size: {
        color: COLORS.textSecondary,
        fontSize: 12,
      },
    },
    gallery: {
      container: {
        backgroundColor: COLORS.cardBackground,
        borderColor: COLORS.border,
      },
    },
    giphy: {
      container: {
        backgroundColor: COLORS.cardBackground,
        borderColor: COLORS.border,
      },
    },
    avatar: {
      container: {
        backgroundColor: COLORS.primary,
      },
    },
    status: {
      checkAllIcon: {
        color: COLORS.primary,
      },
      checkIcon: {
        color: COLORS.textSecondary,
      },
      timeIcon: {
        color: COLORS.textSecondary,
      },
    },
  },
  // Different styles for current user vs others
  messageSimpleCurrentUser: {
    content: {
      container: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
      },
      textContainer: {
        backgroundColor: COLORS.primary,
      },
      text: {
        color: COLORS.white,
      },
      markdown: {
        text: {
          color: COLORS.white,
        },
      },
      // Reply styling for current user
      replyContainer: {
        backgroundColor: COLORS.primaryLight || COLORS.background,
        borderLeftColor: COLORS.white,
        borderLeftWidth: 4,
        borderRadius: 8,
        marginBottom: 8,
        paddingLeft: 12,
        paddingVertical: 8,
      },
      replyText: {
        color: COLORS.white,
        fontSize: 12,
        fontStyle: 'italic',
        opacity: 0.8,
      },
      replyAuthor: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
      },
    },
    card: {
      container: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
      },
    },
    file: {
      container: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
        borderRadius: 12,
        padding: 12,
      },
      icon: {
        color: COLORS.white,
      },
      fileText: {
        color: COLORS.white,
      },
      details: {
        color: COLORS.white,
        opacity: 0.8,
      },
      size: {
        color: COLORS.white,
        fontSize: 12,
        opacity: 0.8,
      },
    },
    gallery: {
      container: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
      },
    },
    giphy: {
      container: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
      },
    },
    avatar: {
      container: {
        backgroundColor: COLORS.primaryTeal,
      },
    },
    status: {
      checkAllIcon: {
        color: COLORS.white,
      },
      checkIcon: {
        color: COLORS.white,
      },
      timeIcon: {
        color: COLORS.white,
      },
    },
  },

  messageActionSheet: {
    actionText: {
      color: COLORS.textPrimary,
    },
    container: {
      backgroundColor: COLORS.error,
    },
  },
  reactionPicker: {
    reactionText: {
      color: COLORS.textPrimary,
    },
    container: {
      backgroundColor: COLORS.error,
    },
  },
  // Audio attachment specific styling
  audioAttachment: {
    container: {
      backgroundColor: COLORS.cardBackground,
      borderColor: COLORS.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 12,
      marginVertical: 4,
    },
    playButton: {
      backgroundColor: COLORS.primary,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    playButtonIcon: {
      color: COLORS.white,
    },
    pauseButton: {
      backgroundColor: COLORS.textSecondary,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pauseButtonIcon: {
      color: COLORS.white,
    },
    progressBar: {
      backgroundColor: COLORS.border,
      borderRadius: 2,
      height: 4,
      flex: 1,
      marginHorizontal: 12,
    },
    progressBarFill: {
      backgroundColor: COLORS.primary,
      borderRadius: 2,
      height: 4,
    },
    duration: {
      color: COLORS.textSecondary,
      fontSize: 12,
    },
    waveform: {
      // backgroundColor: COLORS.border,
    },
    waveformActive: {
      backgroundColor: COLORS.error,
    },
  },
  // Audio attachment for current user
  audioAttachmentCurrentUser: {
    container: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
      borderWidth: 1,
      borderRadius: 16,
      padding: 12,
      marginVertical: 4,
    },
    playButton: {
      backgroundColor: COLORS.primary,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    playButtonIcon: {
      color: COLORS.primary,
    },
    pauseButton: {
      backgroundColor: COLORS.white,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pauseButtonIcon: {
      color: COLORS.primary,
    },
    progressBar: {
      backgroundColor: COLORS.white,
      opacity: 0.3,
      borderRadius: 2,
      height: 4,
      flex: 1,
      marginHorizontal: 12,
    },
    progressBarFill: {
      backgroundColor: COLORS.white,
      borderRadius: 2,
      height: 4,
    },
    duration: {
      color: COLORS.white,
      fontSize: 12,
    },
    waveform: {
      backgroundColor: COLORS.white,
      opacity: 0.3,
    },
    waveformActive: {
      backgroundColor: COLORS.white,
    },
  },
  // Voice recording styling
  voiceRecording: {
    container: {
      backgroundColor: COLORS.cardBackground,
      borderColor: COLORS.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 12,
      marginVertical: 4,
    },
    recordButton: {
      backgroundColor: COLORS.error,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    recordButtonIcon: {
      color: COLORS.white,
    },
    stopButton: {
      backgroundColor: COLORS.textSecondary,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stopButtonIcon: {
      color: COLORS.white,
    },
    waveform: {
      backgroundColor: COLORS.border,
    },
    waveformActive: {
      backgroundColor: COLORS.error,
    },
    duration: {
      color: COLORS.textPrimary,
      fontSize: 14,
      fontWeight: '500',
    },
  },
  overlay: {
    container: {
      backgroundColor: COLORS.background + '80', // 50% opacity
    },
  },
  attachment: {
    selectButton: {
      backgroundColor: COLORS.primary,
    },
    selectButtonText: {
      color: COLORS.white,
    },
  },
  // Reply overlay styling
  replyOverlay: {
    container: {
      backgroundColor: COLORS.background,
      borderTopColor: COLORS.border,
      borderTopWidth: 1,
    },
    header: {
      backgroundColor: COLORS.cardBackground,
      borderBottomColor: COLORS.border,
      borderBottomWidth: 1,
    },
    title: {
      color: COLORS.textPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    subtitle: {
      color: COLORS.textSecondary,
      fontSize: 14,
    },
    closeButton: {
      backgroundColor: COLORS.background,
      borderColor: COLORS.border,
    },
    closeButtonIcon: {
      color: COLORS.textSecondary,
    },
  },
  channelListHeaderErrorIndicator: {
    container: {
      backgroundColor: COLORS.error,
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
  },
  channelPreviewMessenger: {
    container: {
      backgroundColor: COLORS.background,
      borderBottomColor: COLORS.border,
    },
    contentContainer: {
      backgroundColor: COLORS.background,
    },
    title: {
      color: COLORS.textDark,
    },
    message: {
      color: COLORS.textSecondary,
    },
    date: {
      color: COLORS.textSecondary,
    },
    unreadContainer: {
      backgroundColor: COLORS.primary,
    },
    unreadText: {
      color: COLORS.white,
    },
  },
  thread: {
    container: {
      backgroundColor: COLORS.background,
    },
  },
  typing: {
    text: {
      color: COLORS.textSecondary,
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

const CustomInput = () => {
  const { 
    sendMessage, 
    toggleAttachmentPicker, 
  } = useMessageInputContext();
  const { COLORS } = useTheme();
  
  const hasSendableData = useMessageComposerHasSendableData();

  return (
    <View style={[styles.inputContainer, { backgroundColor: COLORS.background, borderTopColor: COLORS.border }]}>
      <AttachmentUploadPreviewList />
      <View style={styles.inputRow}>
        <>
          <TouchableOpacity
            style={[styles.attachButton, { backgroundColor: COLORS.cardBackground }]}
            onPress={toggleAttachmentPicker}
          >
            <Ionicons name="add" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.attachButton, { backgroundColor: COLORS.cardBackground }]}
          >
            <Ionicons 
              name={"mic-outline"} 
              size={20} 
              color={COLORS.primary} 
            />
          </TouchableOpacity>
        </>
        
        <View style={[styles.textInputContainer, { backgroundColor: COLORS.cardBackground }]}>
          <AutoCompleteInput style={{
            color: COLORS.textPrimary,
            paddingTop: 13,
          }} />
        </View>
        
        {(hasSendableData) && (
          <TouchableOpacity 
            style={[styles.sendButton, { backgroundColor: COLORS.primary }]}
            onPress={sendMessage}
          >
            <Ionicons name={"send"} size={16} color={'#ffffff'} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Enhanced Custom Channel Component
const CustomChannelComponent = ({ roomName, onBack, streamChatTheme }) => {
  const { thread } = useThreadContext();
  const { channel } = useChannelContext();
  const { client } = useStreamChatContext();
  const theme = useTheme();
  const COLORS = theme?.COLORS || {};

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const handleDeleteMessage = async (message) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await client.deleteMessage(message.id);
            } catch (error) {
              console.error('Error deleting message:', error);
              Alert.alert('Error', 'Failed to delete message');
            }
          },
        },
      ]
    );
  };

  if (thread) {
    return (
      <View style={styles.channelContainer}>
        <CustomHeader roomName={roomName} onBack={onBack} />
        <Text style={[styles.threadText, { color: COLORS.textSecondary }]}>
          Thread view not implemented
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.channelContainer}>
      <CustomHeader roomName={roomName} onBack={onBack} />
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <MessageList
          additionalFlatListProps={{
            style: [styles.messagesList, { backgroundColor: COLORS.background }],
            contentContainerStyle: styles.messagesContainer,
            showsVerticalScrollIndicator: false,
            removeClippedSubviews: true,
            initialNumToRender: 20,
            maxToRenderPerBatch: 10,
            windowSize: 10,
          }}
        />
        <MessageInput
          Input={CustomInput}
        />
      </KeyboardAvoidingView>
    </View>
  );
};

// Main Chat Room Screen Component
const ChatRoomScreen = () => {
  const { COLORS, mode } = useTheme();
  const { user } = useAuth();
  const { client, isConnected } = useChatContext();
  const router = useRouter();
  const { roomId, roomName } = useLocalSearchParams();
  console.log('Received params:', { roomId, roomName });

  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  console.log('Chat Context:', { isConnected, client: client ? 'Initialized' : 'Null' });

  const statusBarStyle = mode === 'dark' || COLORS.background === '#000' ? 'light' : 'dark';

  // Create the Stream Chat theme based on your custom colors
  const streamChatTheme = useMemo(() => createStreamChatTheme(COLORS, user?.id), [COLORS, user?.id]);

  useEffect(() => {
    if (!client || !isConnected || !roomId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const setupChannel = async () => {
      try {
        setLoading(true);
        const streamChannel = client.channel('messaging', roomId, {
          name: roomName || 'Chat Room',
          members: [client.userID],
        });
        await streamChannel.create();
        await streamChannel.watch();
        if (isMounted) {
          setChannel(streamChannel);
          setError(null);
        }
      } catch (err) {
        console.error('Error setting up channel:', err);
        if (isMounted) {
          try {
            const streamChannel = client.channel('messaging', roomId);
            await streamChannel.watch();
            setChannel(streamChannel);
            setError(null);
          } catch (watchErr) {
            console.error('Error watching channel:', watchErr);
            setError('Failed to load chat room');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    setupChannel();

    return () => {
      isMounted = false;
    };
  }, [client, isConnected, roomId, roomName]);

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
        <StatusBar style={statusBarStyle} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: COLORS.textDark }]}>
            Loading chat room...
          </Text>
        </View>
      </SafeAreaView>
    );  
  }

  if (error || !isConnected || !client || !channel) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
        <StatusBar style={statusBarStyle} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: COLORS.error }]}>
            {error || 'Failed to connect to chat'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar style={statusBarStyle} />
      <OverlayProvider>
        <Chat client={client} style={streamChatTheme}>
          <Channel channel={channel}>
            <CustomChannelComponent 
              roomName={roomName} 
              onBack={handleBack} 
              streamChatTheme={streamChatTheme}
            />
          </Channel>
        </Chat>
      </OverlayProvider>
    </SafeAreaView>
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
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
  channelContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  threadText: {
    flex: 1,
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  inputContainer: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 6,
    flex: 1
  },
  editingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  editingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  attachmentsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  attachmentPreview: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  previewFile: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  previewFileName: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  removeAttachment: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInputContainer: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    // paddingVertical: 8,
    minHeight: 44,
    maxHeight: 100,
  },
  textInput: {
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatRoomScreen;