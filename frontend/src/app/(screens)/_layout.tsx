import { Stack } from "expo-router";

export default function AuthLayout() {
    return (
        <Stack screenOptions={{ headerShown: false}} >
            <Stack.Screen name="resourceScreen" />
            <Stack.Screen name="ChatRoomScreen" />
        </Stack>
    );
}