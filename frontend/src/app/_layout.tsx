import { Stack } from "expo-router";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { AuthProvider } from "../context/authContext";
import { UserProvider } from "../context/userContext";
import { ConsultantProvider } from "../context/consultantContext";
import { ThemeProvider as CustomThemeProvider, useTheme } from '../context/ThemeContext';
import { ChatProvider } from "../context/ChatContext";
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // ✅ IMPORT THIS

// Set notification handler globally
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

function RootLayoutNav() {
    const { mode, COLORS } = useTheme();

    if (!COLORS || !COLORS.grey) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    const navTheme = mode === 'dark' ? DarkTheme : DefaultTheme;

    return (
        <ThemeProvider value={navTheme}>
            <AuthProvider>
                <UserProvider>
                    <ConsultantProvider> 
                        <ChatProvider>
                            <Stack screenOptions={{ headerShown: false }} />
                        </ChatProvider>          
                    </ConsultantProvider>
                </UserProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}> {/* ✅ WRAP WITH THIS */}
            <CustomThemeProvider>
                <RootLayoutNav />
            </CustomThemeProvider>
        </GestureHandlerRootView>
    );
}
