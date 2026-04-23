import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

type ProfileOptionProps = {
    title: string;
    description: string;
    onPress?: () => void;
    icon: string;
};

const ProfileOption = ({ title, description, icon, onPress } : ProfileOptionProps) => {
    const {COLORS} = useTheme();

    const styles = StyleSheet.create({
        optionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        },
        optionContent: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
        },
        optionText: {
            marginLeft: 12,
            flex: 1,
            color: COLORS.textPrimary
        },
        optionTitle: {
            fontSize: 16,
            fontWeight: '500',
            marginBottom: 2,
            color: COLORS.textPrimary
        },
        optionDescription: {
            fontSize: 14,
            fontWeight: '400',
            color: COLORS.textPrimary
        },
        separator: {
            height: 1,
            marginLeft: 48,
        },
    })
    return (
        <TouchableOpacity style={styles.optionContainer} onPress={onPress}>
            <View style={styles.optionContent}>
            <Ionicons name={icon} size={20} color={COLORS.textSecondary} />
            <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{title}</Text>
                <Text style={styles.optionDescription}>{description}</Text>
            </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
    );
}

export default ProfileOption;

