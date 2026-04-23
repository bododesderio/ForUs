import React from "react";
import { Drawer } from "expo-router/drawer";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/authContext";
import { DrawerContentScrollView, DrawerItemList, DrawerContentComponentProps } from '@react-navigation/drawer';



const drawerLabels: Record<string, string> = {
    index: "Dashboard",
    appointments: "Appointments",
    consultants: "Consultants",
    users: "Users",
    resources: "Resources",
    profile: "Settings",
};

const drawerIcons: Record<string, string> = {
    index: "grid-outline",
    appointments: "calendar-outline",
    consultants: "people-outline",
    users: "person-outline",
    resources: "book-outline",
    profile: "settings-outline",
};

function CustomDrawerContent(props: DrawerContentComponentProps) {
    const {COLORS} = useTheme();
    const auth = useAuth() || {};
    const user = auth.user || {};

    // Filter out the profile screen from main items
    const mainDrawerItems = React.useMemo(() => {
        const { state } = props;
        return state.routes.filter(route => route.name !== 'profile');
    }, [props.state]);

    const profileDrawerItem = React.useMemo(() => {
        const { state } = props;
        return state.routes.find(route => route.name === 'profile');
    }, [props.state]);

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            <DrawerContentScrollView {...props} style={{ backgroundColor: COLORS.background }}>
                <View style={styles.profileContainer}>
                    <Image
                        source={user.profile_image ? { uri: user.profile_image } : require("../../assets/emoje-logo.png")}
                        style={styles.profilePic}
                    />
                    <Text style={[styles.profileName, { color: COLORS.textDark }]}>
                        {user.first_name} {user.last_name}
                    </Text>
                    <Text style={[styles.profileEmail, { color: COLORS.textSecondary }]}>
                        {user.email}
                    </Text>
                </View>
                
                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, { color: COLORS.textSecondary }]}>DASHBOARD</Text>
                    {mainDrawerItems.map((route) => {
                        if (route.name === 'index') {
                            const { options } = props.descriptors[route.key];
                            const label = drawerLabels[route.name as keyof typeof drawerLabels];
                            const focused = props.state.index === props.state.routes.findIndex(r => r.key === route.key);
                            
                            return (
                                <TouchableOpacity
                                    key={route.key}
                                    onPress={() => props.navigation.navigate(route.name)}
                                    style={[
                                        styles.drawerItem,
                                        focused && { backgroundColor: `${COLORS.primary}20` }
                                    ]}
                                >
                                    {options.drawerIcon && options.drawerIcon({ 
                                        size: 24, 
                                        color: focused ? COLORS.primary : COLORS.textSecondary,
                                        focused 
                                    })}
                                    <Text style={[
                                        styles.drawerLabel,
                                        { color: focused ? COLORS.primary : COLORS.textSecondary }
                                    ]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }
                        return null;
                    })}
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, { color: COLORS.textSecondary }]}>MANAGEMENT</Text>
                    {mainDrawerItems.map((route) => {
                        if (['appointments', 'consultants', 'users', 'resources'].includes(route.name)) {
                            const { options } = props.descriptors[route.key];
                            const label = drawerLabels[route.name as keyof typeof drawerLabels];
                            const focused = props.state.index === props.state.routes.findIndex(r => r.key === route.key);
                            
                            return (
                                <TouchableOpacity
                                    key={route.key}
                                    onPress={() => props.navigation.navigate(route.name)}
                                    style={[
                                        styles.drawerItem,
                                        focused && { backgroundColor: `${COLORS.primary}20` }
                                    ]}
                                >
                                    {options.drawerIcon && options.drawerIcon({ 
                                        size: 24, 
                                        color: focused ? COLORS.primary : COLORS.textSecondary,
                                        focused 
                                    })}
                                    <Text style={[
                                        styles.drawerLabel,
                                        { color: focused ? COLORS.primary : COLORS.textSecondary }
                                    ]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }
                        return null;
                    })}
                </View>
            </DrawerContentScrollView>
            
            {/* Profile section at bottom */}
            {profileDrawerItem && (
                <View style={[styles.bottomSection, { borderTopColor: COLORS.border }]}>
                    <TouchableOpacity
                        onPress={() => props.navigation.navigate('profile')}
                        style={[
                            styles.drawerItem,
                            props.state.index === props.state.routes.findIndex(r => r.name === 'profile') && 
                            { backgroundColor: `${COLORS.primary}20` }
                        ]}
                    >
                        {props.descriptors[profileDrawerItem.key].options.drawerIcon && 
                         props.descriptors[profileDrawerItem.key].options.drawerIcon({ 
                            size: 24, 
                            color: props.state.index === props.state.routes.findIndex(r => r.name === 'profile') 
                                ? COLORS.primary 
                                : COLORS.textSecondary,
                            focused: props.state.index === props.state.routes.findIndex(r => r.name === 'profile')
                        })}
                        <Text style={[
                            styles.drawerLabel,
                            { 
                                color: props.state.index === props.state.routes.findIndex(r => r.name === 'profile')
                                    ? COLORS.primary 
                                    : COLORS.textSecondary 
                            }
                        ]}>
                            {drawerLabels[profileDrawerItem.name as keyof typeof drawerLabels]}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    profileContainer: {
        alignItems: "center",
        paddingVertical: 32,
        backgroundColor: "transparent",
    },
    profilePic: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 12,
        backgroundColor: "#eee",
    },
    profileName: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 2,
    },
    profileEmail: {
        fontSize: 13,
        marginBottom: 2,
    },
    sectionContainer: {
        marginTop: 8,
        paddingHorizontal: 8,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "600",
        letterSpacing: 0.5,
        marginLeft: 16,
        marginVertical: 8,
    },
    bottomSection: {
        borderTopWidth: 1,
        paddingVertical: 4,
        marginTop: 'auto',
    },
    drawerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginHorizontal: 8,
        borderRadius: 8,
    },
    drawerLabel: {
        marginLeft: 18,
        fontSize: 16,
        fontWeight: '500',
    },
});

export default function AdminLayout() {
    const {COLORS} = useTheme();
    return (
        <Drawer
            screenOptions={({ route }) => ({
                drawerActiveTintColor: COLORS.primary,
                drawerInactiveTintColor: COLORS.textSecondary,
                drawerStyle: { backgroundColor: COLORS.background },
                drawerLabelStyle: { fontWeight: "500" },
                drawerIcon: ({ color, size, focused }) => {
                    const iconName = drawerIcons[route.name as keyof typeof drawerIcons] as any || "ellipse-outline";
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                headerShown: false
            })}
            drawerContent={props => <CustomDrawerContent {...props} />}
        />
    );
}