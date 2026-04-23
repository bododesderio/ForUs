import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { createTamagui } from 'tamagui'
import { defaultConfig } from '@tamagui/config/v4'
import { Redirect } from 'expo-router';
import { useAuth } from '../context/authContext';

const config = createTamagui(defaultConfig)

export default function App() {
    const {loading, isAuthenticated, user} = useAuth();
    
    if (loading) {
        return (
            <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
                <Text>Loading...</Text>
            </View>
        );
    }
    
    return (
        <>
            {/* <Redirect href={'/(screens)/consultants/realestate'} /> */}
            {isAuthenticated ? 
                <Redirect href={
                    user?.role === 'consultant' ? '/(consultants)/' : 
                    user?.role === 'admin' ? '/(admin)/' : 
                    '/(users)/'
                } /> : 
                <Redirect href={'/(auth)/login'} />
            }
        </>
    );
}


