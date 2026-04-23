import { Tabs } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from "react-native";
import { useTheme } from "../../context/ThemeContext";


export default function UsersLayout() {
    const { COLORS } = useTheme();

    return (
        <Tabs screenOptions={{
            tabBarActiveTintColor: COLORS.primary,
            tabBarStyle: {
                backgroundColor: COLORS.background,
            },
            headerShown: false,
            }}>
                <Tabs.Screen 
                name="index" 
                options={{ 
                    tabBarLabel: ({ focused, color }) => (
                        <Text style={{
                            color: color,
                            fontSize: focused ? 14 : 12,
                            fontWeight: focused ? 'bold' : 'normal',
                            textTransform: 'capitalize',
                        }}>
                            Home
                        </Text>
                        ), 
                    tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={26} color={color} />}} 
                />
                <Tabs.Screen 
                name="schedule" 
                options={{ 
                    tabBarLabel: ({ focused, color }) => (
                        <Text style={{
                            color: color,
                            fontSize: focused ? 14 : 12,
                            fontWeight: focused ? 'bold' : 'normal',
                            textTransform: 'capitalize',
                        }}>
                            Schedule
                        </Text>
                        ),
                    tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "calendar" : "calendar-outline"} size={26} color={color} />}} 
                />
                <Tabs.Screen 
                name="chat" 
                options={{ 
                    tabBarLabel: ({ focused, color }) => (
                        <Text style={{
                            color: color,
                            fontSize: focused ? 14 : 12,
                            fontWeight: focused ? 'bold' : 'normal',
                            textTransform: 'capitalize',
                        }}>
                            Chat
                        </Text>
                        ), 
                    tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "chatbubble" : "chatbubble-outline"} size={26} color={color} />}} 
                />
                <Tabs.Screen 
                name="profile" 
                options={{ 
                    tabBarLabel: ({ focused, color }) => (
                        <Text style={{
                            color: color,
                            fontSize: focused ? 14 : 12,
                            fontWeight: focused ? 'bold' : 'normal',
                            textTransform: 'capitalize',
                        }}>
                            Account
                        </Text>
                        ),
                    tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "person" : "person-outline"} size={26} color={color} />
                }} 
                /> 
            </Tabs>
    );
}


