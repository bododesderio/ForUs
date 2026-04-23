import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Pressable } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTheme } from '../context/ThemeContext';
import { useChatContext } from '../context/ChatContext';
import Ionicons from '@expo/vector-icons/Ionicons';

// Reaction Emoji Options
const REACTION_EMOJIS = [
  { emoji: '👍', type: 'thumbs_up' },
  { emoji: '❤️', type: 'heart' },
  { emoji: '😂', type: 'joy' },
  { emoji: '😮', type: 'open_mouth' },
  { emoji: '😢', type: 'cry' },
  { emoji: '🔥', type: 'fire' },
];

// Custom Message Component
const CustomMessage = ({ message, onThreadSelect, groupStyles }) => {
  const { COLORS } = useTheme();
  const { client } = useChatContext();
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Determine if the message is from the current user
  const isOwnMessage = message.user?.id === client.userID;

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Long-press handler for message actions
  const handleLongPress = () => {
    Alert.alert(
      'Message Options',
      '',
      [
        {
          text: 'Reply',
          onPress: () => {
            if (onThreadSelect) {
              onThreadSelect(message);
            }
          },
        },
        {
          text: 'Copy',
          onPress: () => {
            Clipboard.setString(message.text || '');
            Alert.alert('Copied', 'Message copied to clipboard');
          },
        },
        ...(isOwnMessage
          ? [
              {
                text: 'Edit',
                onPress: () => {
                  Alert.alert('Edit', 'Edit functionality not implemented yet');
                },
              },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await client.deleteMessage(message.id);
                    Alert.alert('Success', 'Message deleted');
                  } catch (error) {
                    console.error('Error deleting message:', error);
                    Alert.alert('Error', 'Failed to delete message');
                  }
                },
              },
            ]
          : []),
        {
          text: 'React',
          onPress: () => setShowReactionPicker(!showReactionPicker),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  // Handle adding a reaction
  const handleReaction = async (reactionType) => {
    try {
      await client.upsertReaction(message.id, { type: reactionType }, client.userID);
      setShowReactionPicker(false);
    } catch (error) {
      console.error('Error adding reaction:', error);
      Alert.alert('Error', 'Failed to add reaction');
    }
  };

  // Render attachments (images, files, etc.)
  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) return null;
    return message.attachments.map((attachment, index) => {
      if (attachment.type === 'image') {
        return (
          <Image
            key={index}
            source={{ uri: attachment.image_url || attachment.thumb_url }}
            style={styles.attachmentImage}
          />
        );
      }
      return (
        <View key={index} style={styles.attachmentFile}>
          <Text style={styles.attachmentText}>{attachment.title || 'File'}</Text>
        </View>
      );
    });
  };

  // Render reactions
  const renderReactions = () => {
    if (!message.reactions || message.reactions.length === 0) return null;
    const reactionCounts = message.reactions.reduce((acc, reaction) => {
      acc[reaction.type] = (acc[reaction.type] || 0) + 1;
      return acc;
    }, {});

    return (
      <View style={styles.reactionContainer}>
        {Object.entries(reactionCounts).map(([type, count]) => {
          const emoji = REACTION_EMOJIS.find((r) => r.type === type)?.emoji || '❓';
          return (
            <TouchableOpacity
              key={type}
              style={styles.reactionBubble}
              onPress={() => handleReaction(type)}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              <Text style={styles.reactionCount}>{count}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Render reaction picker
  const renderReactionPicker = () => {
    if (!showReactionPicker) return null;
    return (
      <View style={[styles.reactionPicker, { backgroundColor: COLORS.cardBackground }]}>
        {REACTION_EMOJIS.map(({ emoji, type }) => (
          <TouchableOpacity
            key={type}
            onPress={() => handleReaction(type)}
            style={styles.reactionPickerItem}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render message status (sent, delivered, read)
  const renderMessageStatus = () => {
    if (!isOwnMessage) return null;
    let statusIcon = 'clock';
    let statusColor = COLORS.textSecondary;

    if (message.status === 'received') {
      statusIcon = 'checkmark';
      statusColor = COLORS.primary;
    } else if (message.status === 'sending') {
      statusIcon = 'clock';
      statusColor = COLORS.textSecondary;
    }

    return (
      <Ionicons
        name={statusIcon}
        size={12}
        color={statusColor}
        style={styles.statusIcon}
      />
    );
  };

  // Determine group style for message spacing
  const groupStyle = Array.isArray(groupStyles) ? groupStyles[0] : groupStyles;
  const isTop = groupStyle === 'top' || groupStyle === 'single';
  const isBottom = groupStyle === 'bottom' || groupStyle === 'single';

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      style={[
        styles.messageContainer,
        {
          alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
          backgroundColor: isOwnMessage ? COLORS.primary : COLORS.cardBackground,
          borderBottomRightRadius: isOwnMessage && isBottom ? 6 : 20,
          borderBottomLeftRadius: !isOwnMessage && isBottom ? 6 : 20,
          borderTopRightRadius: isOwnMessage && isTop ? 20 : isOwnMessage ? 6 : 20,
          borderTopLeftRadius: !isOwnMessage && isTop ? 20 : !isOwnMessage ? 6 : 20,
          marginTop: isTop ? 8 : 2,
          marginBottom: isBottom ? 8 : 2,
        },
      ]}
    >
      {/* Avatar (for non-own messages) */}
      {message.user?.image && !isOwnMessage && isTop && (
        <Image
          source={{ uri: message.user.image }}
          style={styles.avatar}
        />
      )}

      {/* Message Content */}
      <View style={styles.messageContent}>
        {/* Sender Name (for non-own messages, shown on top message) */}
        {!isOwnMessage && isTop && (
          <Text style={[styles.senderName, { color: COLORS.textDark }]}>
            {message.user?.name || message.user?.username || 'Unknown'}
          </Text>
        )}

        {/* Quoted Message */}
        {message.quoted_message && (
          <View style={[styles.quotedMessage, { borderLeftColor: COLORS.primary }]}>
            <Text style={[styles.quotedText, { color: COLORS.textSecondary }]}>
              {message.quoted_message.text}
            </Text>
          </View>
        )}

        {/* Attachments */}
        {renderAttachments()}

        {/* Message Text */}
        {message.text && (
          <Text
            style={{
              color: isOwnMessage ? COLORS.white : COLORS.textDark,
              fontSize: 16,
              lineHeight: 22,
            }}
          >
            {message.text}
          </Text>
        )}

        {/* Reactions */}
        {renderReactions()}

        {/* Reaction Picker */}
        {renderReactionPicker()}

        {/* Timestamp, Edited Indicator, and Status */}
        <View style={styles.footer}>
          <Text style={[styles.timestamp, { color: COLORS.textSecondary }]}>
            {formatTime(message.created_at)}
          </Text>
          {message.updated_at !== message.created_at && (
            <Text style={[styles.editedLabel, { color: isOwnMessage ? COLORS.white : COLORS.textSecondary }]}>
              (edited)
            </Text>
          )}
          {renderMessageStatus()}
        </View>

        {/* Reply Indicator */}
        {message.reply_count > 0 && (
          <TouchableOpacity
            style={styles.replyIndicator}
            onPress={() => onThreadSelect && onThreadSelect(message)}
          >
            <Text style={[styles.replyText, { color: COLORS.textSecondary }]}>
              {message.reply_count} {message.reply_count === 1 ? 'Reply' : 'Replies'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Styles for CustomMessage
const styles = StyleSheet.create({
  messageContainer: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  messageContent: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  quotedMessage: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  quotedText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  attachmentImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  attachmentFile: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 8,
  },
  attachmentText: {
    fontSize: 12,
    color: '#333',
  },
  reactionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  reactionBubble: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  reactionPicker: {
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  reactionPickerItem: {
    padding: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 12,
    marginHorizontal: 8,
  },
  editedLabel: {
    fontSize: 12,
    fontStyle: 'italic',
    marginLeft: 4,
  },
  statusIcon: {
    marginLeft: 4,
  },
  replyIndicator: {
    marginTop: 4,
    padding: 4,
  },
  replyText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default CustomMessage;