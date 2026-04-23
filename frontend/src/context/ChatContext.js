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

    const connect = useCallback(async () => {
        try {
            const token = await getAccessToken();
            const userData = await getStoredUserData();
            if (!token || !userData) return;

            const url = `${getWsUrl()}?token=${token}`;
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
            case 'new_message':
                setMessages(prev => {
                    const roomMessages = prev[data.message.roomId] || [];
                    const exists = roomMessages.some(m => m.id === data.message.id);
                    if (exists) return prev;
                    return { ...prev, [data.message.roomId]: [...roomMessages, data.message] };
                });
                // Show local notification if message is from someone else
                if (data.message.userId !== currentUser?.id) {
                    Notifications.scheduleNotificationAsync({
                        content: {
                            title: 'New Message',
                            body: data.message.text,
                            data: { roomId: data.message.roomId },
                        },
                        trigger: null,
                    }).catch(() => {});
                }
                break;

            case 'room_history':
                setMessages(prev => ({ ...prev, [data.roomId]: data.messages }));
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
            connect,
            disconnect,
        }}>
            {children}
        </ChatContext.Provider>
    );
};
