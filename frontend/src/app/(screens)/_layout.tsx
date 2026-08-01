/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import { Stack } from "expo-router";

export default function AuthLayout() {
    return (
        <Stack screenOptions={{ headerShown: false}} >
            <Stack.Screen name="resourceScreen" />
            <Stack.Screen name="ChatRoomScreen" />
        </Stack>
    );
}