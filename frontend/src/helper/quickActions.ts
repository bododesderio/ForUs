import { router } from "expo-router";
import { useCallback } from "react";
import { Alert, Linking } from "react-native";

export const handleEmergencyCall = useCallback(() => {
    Alert.alert(
        'Emergency Support',
        'Would you like to call the mental health crisis line?',
        [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Call Now', onPress: () => Linking.openURL('tel:988') },
        ]
        );
    }, []);

export const handleResources = useCallback(() => {
router.push('/(screens)/resourceScreen')
}, []);

export const handleFindTherapist = useCallback(() => {
router.push('/(screens)/consultantSearch')
}, []);

export const handleWellnessChat = useCallback(() => {
console.log('Opening wellness chat');
}, []);