// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

function AuthLayout() {
    const { COLORS } = useTheme();

    // Provide fallback if COLORS is not ready
    const backgroundColor = COLORS?.background || '#ffffff';
    const borderColor = COLORS?.border || '#e0e0e0';

    return (
        <View style={{ flex: 1, backgroundColor }}>
            <Stack 
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor },
                    // Remove any style prop that might cause React.Fragment issues
                }}
            >
                <Stack.Screen 
                    name="login" 
                    options={{ 
                        headerShown: false,
                        contentStyle: { backgroundColor }
                    }} 
                />
                <Stack.Screen 
                    name="signup" 
                    options={{ 
                        headerShown: false,
                        contentStyle: { backgroundColor }
                    }} 
                />
                <Stack.Screen 
                    name="onBoarding" 
                    options={{ 
                        headerShown: false,
                        contentStyle: { backgroundColor }
                    }} 
                />
            </Stack>
        </View>
    );
}

export default AuthLayout;