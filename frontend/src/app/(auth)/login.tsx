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

import { useTheme } from '../../context/ThemeContext';
import CustomTextInput from '../../components/CustomTextInput';
import KeyboardAwareScrollView from '../../components/KeyboardAwareView';
import { useAuth } from '../../context/authContext';

const { width } = Dimensions.get("window");

const LoginInfo = z.object({
    email: z.string({message: "Email is required."}).min(1, {message: "Email must be longer than 1."}).regex(/^\S+@\S+\.\S+$/, 'Email must be in the format @example.com'),
    password: z.string({message: "Password is required."}).min(1, {message: "Password must be longer than 1."}),
});

type LoginScreen = z.infer<typeof LoginInfo>; 

const LoginScreen = () => {
    const {COLORS} = useTheme();
    const [loading, setLoading] = useState(false)
    const { login } = useAuth();
    const router = useRouter();
    const form = useForm<LoginScreen>({
        resolver: zodResolver(LoginInfo)
    });

    const handleLogin: SubmitHandler<LoginScreen> = async (data) => {
        if(!data.email.trim() || !data.password.trim()){
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true)
        try {
            const response = await login(data.email, data.password);
            console.log(response)
            
            if (response.success) {
                // Redirect based on role
                if (response.user && response.user.role === 'consultant') {
                    router.replace("/(consultants)");
                } else {
                    if(response.user && response.user.role === 'user') {
                        router.replace("/(users)");
                    } else {
                        router.replace("/(admin)");
                    }
                }
            } else {
                Alert.alert('Login Failed', response.message);
            }
        } catch (error) {
            Alert.alert('Login Error', error.message);
        } finally {
            setLoading(false)
        }
    }

    const handleSignUpPress = () => {
        router.push("/signup");
    }

    const styles = StyleSheet.create({
    illustrationContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
    },
    illustration: {
        width: width * 0.7,
        height: width * 0.7,
        maxHeight: 240,
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
    loginButton: {
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
    loginButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.white,
    },
    signUpSection: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    signUpText: {
        fontSize: 14,
        color: COLORS.grey,
    },
    signUpLink: {
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
                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={form.handleSubmit(handleLogin)}
                        activeOpacity={0.9}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginButtonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>
                    
                    <View style={styles.signUpSection}>
                        <Text style={styles.signUpText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={handleSignUpPress}>
                            <Text style={styles.signUpLink}>Sign up</Text>
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

export default LoginScreen;