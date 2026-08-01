/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import { View, Text, Image, TouchableOpacity, Dimensions, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import KeyboardAwareScrollView from '../../components/KeyboardAwareView';
import { useTheme } from '../../context/ThemeContext';
import CustomTextInput from '../../components/CustomTextInput';
import { useAuth } from '../../context/authContext';

const { width } = Dimensions.get("window");

const SignUpInfo = z.object({
    firstName: z.string({message: "First name is required."}).min(1, {message: "First name must be longer than 1."}),
    lastName: z.string({message: "Last name is required."}).min(1, {message: "Last name must be longer than 1."}),
    username: z.string({message: "Username is required."}).min(1, {message: "Username must be longer than 1."}),
    email: z.string({message: "Email is required."}).min(1, {message: "Email must be longer than 1."}).regex(/^\S+@\S+\.\S+$/, 'Email must be in the format @example.com'),
    password: z.string({message: "Password is required."}).min(1, {message: "Password must be longer than 1."}).min(8, {message: "Password must be at least 8 characters long"}),
    confirmPassword: z.string({message: "Confirm Password is required."}).min(1, {message: "Confirm Password must be longer than 1."}),
}).superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Passwords don't match",
            path: ["confirmPassword"],
        });
    }
});

type SiginupScreen = z.infer<typeof SignUpInfo>;

const SiginupScreen = () => {
    const [loading, setLoading] = useState(false)
    const { register } = useAuth();
    const {COLORS} = useTheme();
    const router = useRouter();
    const form = useForm<SiginupScreen>({
        resolver: zodResolver(SignUpInfo),
    });

    const handleSignUp: SubmitHandler<SiginupScreen> = async (data) => {
        if(!data.email.trim() || !data.password.trim()){
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true)
        try {
            const response = await register(data.username, data.email, data.password);
            console.log(response)
            
            if (response.success) {
                router.replace("/(auth)/login");
            } else {
                Alert.alert('Login Failed', response.message);
            }
        } catch (error) {
            Alert.alert('Login Error', error.message);
        } finally {
            setLoading(false)
        }
    }

    const handleLogInPress = () => {
        router.push("/login"); 
    }

    const styles = StyleSheet.create({
    illustrationContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    illustration: {
        width: width * 0.3,
        height: width * 0.3,
        maxHeight: 100,
    },
    loginSection: {
        width: "100%",
        paddingHorizontal: 24,
        paddingBottom: 40,
        alignItems: "center",
    },
    inputContainer: {
        width: '100%',
        marginBottom: 20,
    },
    textInput: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontSize: 16,
        borderWidth: 1.5,
        borderColor: COLORS.grey + '40', // Semi-transparent grey
        borderRadius: 12,
        backgroundColor: COLORS.inputBackground,
        color: COLORS.textPrimary,
    },
    textInputFocused: {
        borderColor: COLORS.primary,
        borderWidth: 2,
        shadowColor: COLORS.primary,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    signUpButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginBottom: 24,
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: COLORS.primary,
        shadowOffset: {
            width: 0,
            height: 4,
        }, 
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    signUpText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.white,
    },
    logInSection: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    logInText: {
        fontSize: 14,
        color: COLORS.grey,
    },
    logInLink: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.primary,
        textDecorationLine: "underline",
    },
    termsText: {
        textAlign: "center",
        fontSize: 12,
        color: COLORS.grey,
        maxWidth: 280,
        lineHeight: 16,
    },
});

    return (
        <KeyboardAwareScrollView>
            <FormProvider {...form}>
                <View style={styles.illustrationContainer}>
                    <Image 
                        source={require("../../assets/splash-icon.png")}
                        style={styles.illustration}
                        resizeMode='cover'
                    />
                </View>
                <View style={styles.loginSection}>
                    <CustomTextInput 
                        placeholder='John Don' 
                        name='username' 
                        label='Username' 
                        containerStyle={styles.inputContainer}
                        style={styles.textInput}
                        focusStyle={styles.textInputFocused}
                    />
                    <CustomTextInput 
                        placeholder='email@example.com' 
                        name='email' 
                        label='Email' 
                        containerStyle={styles.inputContainer}
                        style={styles.textInput}
                        focusStyle={styles.textInputFocused}
                    />
                    <CustomTextInput 
                        placeholder='Password' 
                        name='password' 
                        label='Password' 
                        secureTextEntry
                        containerStyle={styles.inputContainer}
                        style={styles.textInput}
                        focusStyle={styles.textInputFocused}
                    />
                    <CustomTextInput 
                        placeholder='Confirm Password' 
                        name='confirmPassword' 
                        label='Confirm Password' 
                        secureTextEntry
                        containerStyle={styles.inputContainer}
                        style={styles.textInput}
                        focusStyle={styles.textInputFocused}
                    />
                    <TouchableOpacity
                        style={styles.signUpButton}
                        onPress={form.handleSubmit(handleSignUp)}
                        activeOpacity={0.9}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.signUpText}>Register</Text>
                        )}
                    </TouchableOpacity>
                    
                    <View style={styles.logInSection}>
                        <Text style={styles.logInText}>Already have an account? </Text>
                        <TouchableOpacity onPress={handleLogInPress}>
                            <Text style={styles.logInLink}>Sign In</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.termsText}>
                        By continuing, you agree to our Terms and Privacy Policy
                    </Text>
                </View>
            </FormProvider>
        </KeyboardAwareScrollView>
    );
}

export default SiginupScreen;