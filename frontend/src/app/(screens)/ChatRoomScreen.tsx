/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChatContext } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/authContext';

type Message = {
  id: string;
  roomId: string;
  userId: string;
  text: string;
  createdAt?: string;
  username?: string;
  firstName?: string;
};

/**
 * Native chat room backed by the WebSocket ChatContext (replaces Stream's
 * Channel/MessageList/MessageInput). Joins the room, renders history + live
 * messages, sends messages and typing signals.
 */
export default function ChatRoomScreen() {
  const { roomId: rawRoomId, roomName } = useLocalSearchParams();
  const roomId = Array.isArray(rawRoomId) ? rawRoomId[0] : (rawRoomId ?? '');
  const name = Array.isArray(roomName) ? roomName[0] : (roomName ?? 'Chat');

  const { COLORS }: any = useTheme();
  const { user }: any = useAuth();
  const {
    messages,
    typingUsers,
    isConnected,
    joinRoom,
    loadHistory,
    sendMessage,
    sendTyping,
    sendReadReceipt,
  }: any = useChatContext();
  const router = useRouter();

  const [draft, setDraft] = useState('');
  const lastTypingSent = useRef(0);
  const listRef = useRef<FlatList<Message>>(null);

  const roomMessages: Message[] = useMemo(
    () => (messages?.[roomId] ?? []) as Message[],
    [messages, roomId],
  );
  const inverted = useMemo(() => [...roomMessages].reverse(), [roomMessages]);
  const typing: string[] = (typingUsers?.[roomId] ?? []).filter((id: string) => id !== user?.id);

  useEffect(() => {
    if (!roomId) return;
    joinRoom(roomId);
    loadHistory(roomId);
  }, [roomId, isConnected, joinRoom, loadHistory]);

  // Mark the newest incoming message read.
  useEffect(() => {
    const latest = roomMessages[roomMessages.length - 1];
    if (latest && String(latest.userId) !== String(user?.id)) {
      sendReadReceipt(roomId, latest.id);
    }
  }, [roomMessages, roomId, user?.id, sendReadReceipt]);

  const onChangeDraft = useCallback(
    (text: string) => {
      setDraft(text);
      const now = Date.now();
      if (now - lastTypingSent.current > 1500) {
        lastTypingSent.current = now;
        sendTyping(roomId);
      }
    },
    [roomId, sendTyping],
  );

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    sendMessage(roomId, text);
    setDraft('');
  }, [draft, roomId, sendMessage]);

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      const mine = String(item.userId) === String(user?.id);
      return (
        <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
          <View
            style={[
              styles.bubble,
              mine
                ? { backgroundColor: COLORS?.primary ?? '#4B7BEC' }
                : { backgroundColor: COLORS?.cardBackground ?? '#EFEFEF' },
            ]}
          >
            {!mine && (item.username || item.firstName) ? (
              <Text style={[styles.author, { color: COLORS?.textSecondary ?? '#777' }]}>
                {item.username ?? item.firstName}
              </Text>
            ) : null}
            <Text style={{ color: mine ? '#fff' : COLORS?.textPrimary ?? '#111' }}>{item.text}</Text>
          </View>
        </View>
      );
    },
    [COLORS, user?.id],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS?.background ?? '#fff' }]}>
      <StatusBar style="auto" />
      <View style={[styles.header, { borderBottomColor: COLORS?.border ?? '#eee' }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={COLORS?.textPrimary ?? '#111'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS?.textPrimary ?? '#111' }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={inverted}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          inverted
          contentContainerStyle={styles.listContent}
        />

        {typing.length > 0 ? (
          <Text style={[styles.typing, { color: COLORS?.textSecondary ?? '#777' }]}>typing…</Text>
        ) : null}

        <View style={[styles.inputBar, { borderTopColor: COLORS?.border ?? '#eee' }]}>
          <TextInput
            style={[styles.input, { color: COLORS?.textPrimary ?? '#111', backgroundColor: COLORS?.cardBackground ?? '#F2F2F2' }]}
            value={draft}
            onChangeText={onChangeDraft}
            placeholder="Message"
            placeholderTextColor={COLORS?.textSecondary ?? '#999'}
            multiline
          />
          <TouchableOpacity onPress={handleSend} disabled={!draft.trim()} accessibilityLabel="Send">
            <Ionicons
              name="send"
              size={24}
              color={draft.trim() ? COLORS?.primary ?? '#4B7BEC' : COLORS?.textSecondary ?? '#bbb'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', marginHorizontal: 8 },
  listContent: { padding: 12 },
  bubbleRow: { marginVertical: 3, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  author: { fontSize: 12, marginBottom: 2 },
  typing: { paddingHorizontal: 16, paddingBottom: 4, fontStyle: 'italic' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, maxHeight: 120, fontSize: 16 },
});
