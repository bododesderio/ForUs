/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useChatContext } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';

type Room = {
  id: string;
  name?: string;
  type?: string;
  role?: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
};

/**
 * Native room list backed by the WebSocket ChatContext (replaces the Stream
 * ChannelList). Lists the caller's rooms and opens the native room screen.
 */
export default function ChatRoomList({ title = 'Chats' }: { title?: string }) {
  const { COLORS }: any = useTheme();
  const { fetchRooms, createRoom }: any = useChatContext();
  const router = useRouter();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');

  const load = useCallback(async () => {
    setRefreshing(true);
    const result = await fetchRooms();
    setRooms(Array.isArray(result) ? result : []);
    setRefreshing(false);
  }, [fetchRooms]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openRoom = (room: Room) => {
    router.push({
      pathname: '/(screens)/ChatRoomScreen',
      params: { roomId: room.id, roomName: room.name ?? 'Chat' },
    });
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const roomId = await createRoom({ name, type: 'team' });
    setModalVisible(false);
    setNewName('');
    if (roomId) {
      router.push({ pathname: '/(screens)/ChatRoomScreen', params: { roomId, roomName: name } });
    }
  };

  const renderItem = ({ item }: { item: Room }) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: COLORS?.border ?? '#eee' }]}
      onPress={() => openRoom(item)}
    >
      <View style={[styles.avatar, { backgroundColor: COLORS?.primary ?? '#4B7BEC' }]}>
        <Text style={styles.avatarText}>{(item.name ?? 'C').slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.roomName, { color: COLORS?.textPrimary ?? '#111' }]} numberOfLines={1}>
          {item.name ?? 'Chat'}
        </Text>
        <Text style={[styles.preview, { color: COLORS?.textSecondary ?? '#777' }]} numberOfLines={1}>
          {item.lastMessage ?? 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS?.background ?? '#fff' }]}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={[styles.title, { color: COLORS?.textPrimary ?? '#111' }]}>{title}</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} accessibilityLabel="New chat">
          <Ionicons name="create-outline" size={26} color={COLORS?.primary ?? '#4B7BEC'} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: COLORS?.textSecondary ?? '#777' }]}>
            No conversations yet.
          </Text>
        }
      />

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: COLORS?.cardBackground ?? '#fff' }]}>
            <Text style={[styles.modalTitle, { color: COLORS?.textPrimary ?? '#111' }]}>New group</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Group name"
              placeholderTextColor={COLORS?.textSecondary ?? '#999'}
              style={[styles.input, { color: COLORS?.textPrimary ?? '#111', borderColor: COLORS?.border ?? '#ddd' }]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ color: COLORS?.textSecondary ?? '#777' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreate}>
                <Text style={{ color: COLORS?.primary ?? '#4B7BEC', fontWeight: '600' }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  rowBody: { flex: 1 },
  roomName: { fontSize: 16, fontWeight: '600' },
  preview: { fontSize: 14, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 40 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalCard: { borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 16 },
});
