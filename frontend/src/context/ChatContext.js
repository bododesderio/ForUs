/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { getAccessToken, API_BASE_URL } from '../services/api';
import { getStoredUserData } from '../services/api';

const ChatContext = createContext();

export const useChatContext = () => {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChatContext must be used within a ChatProvider');
    return context;
};

export const ChatProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const [messages, setMessages] = useState({}); // { roomId: Message[] }
    const [typingUsers, setTypingUsers] = useState({}); // { roomId: userId[] }
    const wsRef = useRef(null);
    const reconnectTimer = useRef(null);
    const reconnectAttempts = useRef(0);

    const getWsUrl = () => {
        const httpUrl = API_BASE_URL.replace('/api', '');
        const wsUrl = httpUrl.replace(/^http/, 'ws');
        return `${wsUrl}/ws`;
    };

    // Normalize a message from either casing (WS new_message / REST + room_history)
    // to a single camelCase shape the UI can render consistently.
    const normalizeMessage = (m) => ({
        id: m.id,
        roomId: m.roomId ?? m.room_id,
        userId: m.userId ?? m.user_id,
        text: m.text,
        attachments: m.attachments ?? [],
        parentId: m.parentId ?? m.parent_id ?? null,
        createdAt: m.createdAt ?? m.created_at,
        username: m.username,
        firstName: m.firstName ?? m.first_name,
        lastName: m.lastName ?? m.last_name,
        profileImage: m.profileImage ?? m.profile_image,
    });

    const authFetch = async (path, opts = {}) => {
        const token = await getAccessToken();
        return fetch(`${API_BASE_URL}${path}`, {
            ...opts,
            headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` },
        });
    };

    const connect = useCallback(async () => {
        try {
            const token = await getAccessToken();
            const userData = await getStoredUserData();
            if (!token || !userData) return;

            // SEC-4: exchange the bearer token for a short-lived single-use WS ticket
            // so no long-lived token ever appears in the WebSocket URL / proxy logs.
            const ticketRes = await authFetch('/chat/token');
            if (!ticketRes.ok) {
                setError('Failed to authorize chat');
                return;
            }
            const { ticket } = await ticketRes.json();
            if (!ticket) return;

            const url = `${getWsUrl()}?ticket=${encodeURIComponent(ticket)}`;
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                setError(null);
                reconnectAttempts.current = 0;
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleEvent(data, userData);
                } catch (e) {
                    // ignore malformed messages
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                wsRef.current = null;
                scheduleReconnect();
            };

            ws.onerror = () => {
                setError('Connection error');
                setIsConnected(false);
            };
        } catch (err) {
            setError(err.message);
        }
    }, []);

    const handleEvent = (data, currentUser) => {
        switch (data.type) {
            case 'new_message': {
                const message = normalizeMessage(data.message);
                setMessages(prev => {
                    const roomMessages = prev[message.roomId] || [];
                    if (roomMessages.some(m => m.id === message.id)) return prev;
                    return { ...prev, [message.roomId]: [...roomMessages, message] };
                });
                // Show local notification if message is from someone else
                if (String(message.userId) !== String(currentUser?.id)) {
                    Notifications.scheduleNotificationAsync({
                        content: {
                            title: 'New Message',
                            body: message.text,
                            data: { roomId: message.roomId },
                        },
                        trigger: null,
                    }).catch(() => {});
                }
                break;
            }

            case 'room_history':
                setMessages(prev => ({ ...prev, [data.roomId]: (data.messages || []).map(normalizeMessage) }));
                break;

            case 'typing':
                setTypingUsers(prev => {
                    const current = prev[data.roomId] || [];
                    if (current.includes(data.userId)) return prev;
                    return { ...prev, [data.roomId]: [...current, data.userId] };
                });
                // Clear typing indicator after 3s
                setTimeout(() => {
                    setTypingUsers(prev => ({
                        ...prev,
                        [data.roomId]: (prev[data.roomId] || []).filter(id => id !== data.userId),
                    }));
                }, 3000);
                break;

            default:
                break;
        }
    };

    const scheduleReconnect = () => {
        if (reconnectAttempts.current >= 5) return;
        const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
        reconnectAttempts.current += 1;
        reconnectTimer.current = setTimeout(connect, delay);
    };

    const sendMessage = useCallback((roomId, text, attachments = [], parentId = null) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({ type: 'send_message', roomId, text, attachments, parentId }));
    }, []);

    const sendTyping = useCallback((roomId) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({ type: 'typing', roomId }));
    }, []);

    const joinRoom = useCallback((roomId) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({ type: 'join_room', roomId }));
    }, []);

    const sendReadReceipt = useCallback((roomId, messageId) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({ type: 'read_receipt', roomId, messageId }));
    }, []);

    // REST helpers (replace the Stream client for room list + history load).
    const fetchRooms = useCallback(async () => {
        try {
            const res = await authFetch('/chat/rooms');
            if (!res.ok) return [];
            const data = await res.json();
            return data.rooms || [];
        } catch {
            return [];
        }
    }, []);

    const loadHistory = useCallback(async (roomId, before = null) => {
        try {
            const q = before ? `?before=${encodeURIComponent(before)}` : '';
            const res = await authFetch(`/chat/rooms/${roomId}/messages${q}`);
            if (!res.ok) return [];
            const data = await res.json();
            const history = (data.messages || []).map(normalizeMessage);
            setMessages(prev => ({ ...prev, [roomId]: history }));
            return history;
        } catch {
            return [];
        }
    }, []);

    const disconnect = useCallback(() => {
        clearTimeout(reconnectTimer.current);
        wsRef.current?.close();
        wsRef.current = null;
        setIsConnected(false);
    }, []);

    useEffect(() => {
        connect();
        return () => {
            clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
    }, [connect]);

    return (
        <ChatContext.Provider value={{
            isConnected,
            error,
            messages,
            typingUsers,
            sendMessage,
            sendTyping,
            joinRoom,
            sendReadReceipt,
            fetchRooms,
            loadHistory,
            connect,
            disconnect,
        }}>
            {children}
        </ChatContext.Provider>
    );
};
