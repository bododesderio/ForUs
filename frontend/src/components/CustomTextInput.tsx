import { View, Text, TextInput, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import React, { ComponentProps, useState } from 'react'
import { useController } from 'react-hook-form';
import { useTheme } from '../context/ThemeContext';

type CustomTextInput = {
    label?: string;
    containerStyle?: StyleProp<ViewStyle>;
    focusStyle?: StyleProp<ViewStyle>;
    name: string;
} & ComponentProps<typeof TextInput>

const CustomTextInput = ({ label, containerStyle, focusStyle, name, ...textInputProps } : CustomTextInput) => {
    const [isFocused, setIsFocused] = useState(false);
    const {field: {value, onChange, onBlur}, fieldState: {error}} = useController({
        name, 
        rules: { required: `${name} is required`}
    });
    const {COLORS} = useTheme();

    const handleFocus = (e: any) => {
        setIsFocused(true);
        textInputProps.onFocus?.(e);
    };

    const handleBlur = (e: any) => {
        setIsFocused(false);
        onBlur();
        textInputProps.onBlur?.(e);
    };

    return (
        <View style={containerStyle}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput 
                {...textInputProps}
                value={value}
                onChangeText={onChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={[
                    styles.input, 
                    error ? styles.errorInput : {},
                    isFocused ? [styles.focusedInput, focusStyle] : {},
                    textInputProps.style
                ]} 
            />
            {error && <Text style={styles.error} numberOfLines={1}>{error.message}</Text>}
        </View>
    )
}

const styles = StyleSheet.create({
    input: { 
        borderWidth: 1.5, 
        borderColor: 'gray',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 8,
        marginBottom: 4,
        fontSize: 16,
        backgroundColor: '#FFFFFF',
        color: '#1F2937',
    },
    focusedInput: {
        borderColor: '#3B82F6',
        borderWidth: 2,
        shadowColor: '#3B82F6',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    error: {
        color: '#EF4444',
        fontSize: 12,
        minHeight: 16,
    },
    label: {
        fontWeight: '600',
        color: '#374151',
        fontSize: 14,
        marginBottom: 4,
    },
    errorInput: {
        borderColor: '#EF4444',
        borderWidth: 2,
    }
})

export default CustomTextInput;