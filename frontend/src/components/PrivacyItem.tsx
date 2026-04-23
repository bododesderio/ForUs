import { View, Text, StyleSheet, Switch } from 'react-native'
import React from 'react'
import { useTheme } from '../context/ThemeContext';
import { PrivacySettingsProps } from '../app/(screens)/privacySecurity';

type PrivacyItemProps = {
    title: string; 
    description: string;
    setting: string;
    value: boolean;
    handlePrivacySettingChange: (setting: string, value: boolean) => void;
}


const PrivacyItem = ({title, description, setting, value, handlePrivacySettingChange}: PrivacyItemProps) => {
    const { COLORS } = useTheme();

    const styles = StyleSheet.create({
    privacyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.grey + '20',
    },
    privacyItemContent: {
        flex: 1,
        marginRight: 16,
    },
    privacyItemTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.textDark,
        marginBottom: 4,
    },
    privacyItemDescription: {
        fontSize: 14,
        color: COLORS.grey,
        lineHeight: 20,
    },
})
    return (
        <View style={styles.privacyItem}>
            <View style={styles.privacyItemContent}>
                <Text style={styles.privacyItemTitle}>{title}</Text>
                <Text style={styles.privacyItemDescription}>{description}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={(newValue) => handlePrivacySettingChange(setting, newValue)}
                trackColor={{ false: COLORS.grey + '40', true: COLORS.primary + '40' }}
                thumbColor={value ? COLORS.primary : COLORS.grey}
            />
        </View>
        );
}

export default PrivacyItem;