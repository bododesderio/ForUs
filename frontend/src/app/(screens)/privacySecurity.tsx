import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Switch } from 'react-native';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '../../context/ThemeContext';
import CustomTextInput from '../../components/CustomTextInput';
import KeyboardAwareScrollView from '../../components/KeyboardAwareView';
import { useAuth } from '../../context/authContext';
import PrivacyItem from '../../components/PrivacyItem';
import { changePassword as changePasswordApi } from '../../services/api';

const PasswordChangeSchema = z.object({
    currentPassword: z.string().min(1, {message: "Current password is required."}),
    newPassword: z.string().min(8, {message: "New password must be at least 8 characters."}),
    confirmPassword: z.string().min(1, {message: "Please confirm your new password."}),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type PasswordChangeForm = z.infer<typeof PasswordChangeSchema>;

export type PrivacySettingsProps = {
    profileVisibility: boolean;
    activityStatus: boolean;
    readReceipts: boolean;
    dataCollection: boolean;
    marketingEmails: boolean;
    pushNotifications: boolean;
    twoFactorAuth: boolean;
};

const PrivacySecurityScreen = () => {
    const [loading, setLoading] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const { COLORS, mode } = useTheme();
    const statusBarStyle = mode === 'dark' || COLORS.background === '#000' ? 'light' : 'dark';
    
    // Privacy Settings State
    const [privacySettings, setPrivacySettings] = useState<PrivacySettingsProps>({
        profileVisibility: true,
        activityStatus: true,
        readReceipts: false,
        dataCollection: true,
        marketingEmails: false,
        pushNotifications: true,
        twoFactorAuth: false,
    });

    const { user, changePassword, updatePrivacySettings } = useAuth();
    const router = useRouter();
    
    const form = useForm<PasswordChangeForm>({
        resolver: zodResolver(PasswordChangeSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        }
    });

    const handlePasswordChange: SubmitHandler<PasswordChangeForm> = async (data) => {
        setLoading(true);
        try {
            const response = await changePasswordApi({
                currentPassword: data.currentPassword,
                newPassword: data.newPassword
            });
            if (response.success) {
                Alert.alert('Success', 'Password changed successfully', [
                    { text: 'OK', onPress: () => form.reset() }
                ]);
            } else {
                Alert.alert('Password Change Failed', response.message);
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePrivacySettingChange = async (setting: string, value: boolean) => {
        setPrivacySettings(prev => ({
            ...prev,
            [setting]: value
        }));
        
        // You can add API call here to save privacy settings
        try {
            await updatePrivacySettings({ [setting]: value });
        } catch (error) {
            console.log('Error updating privacy setting:', error);
            // Revert the change if API call fails
            setPrivacySettings(prev => ({
                ...prev,
                [setting]: !value
            }));
        }
    };

    const togglePasswordVisibility = (field: string) => {
        setPasswordVisible(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleGoBack = () => {
        router.back();
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: () => {
                        // Handle account deletion
                        console.log('Account deletion requested');
                    }
                }
            ]
        );
    };

    const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 24,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        padding: 8,
        marginRight: 12,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.textDark || '#1a1a1a',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.grey || '#666',
        marginTop: 2,
        fontWeight: '400',
    },
    section: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: COLORS.background,
        marginBottom: 12,
        borderRadius: 10,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textDark,
        letterSpacing: 0.5,
        marginBottom: 16,
        textTransform: 'uppercase',
    },
    passwordInputContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    inputContainer: {
        width: '100%',
    },
    textInput: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingRight: 50,
        fontSize: 16,
        borderWidth: 1.5,
        borderColor: COLORS.grey + '40',
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
    eyeIcon: {
        position: 'absolute',
        right: 16,
        top: 50,
        transform: [{ translateY: -10 }],
    },
    changePasswordButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
    securityButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.grey + '20',
    },
    securityButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    securityButtonText: {
        marginLeft: 12,
        flex: 1,
    },
    securityButtonTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.textDark,
        marginBottom: 2,
    },
    securityButtonDescription: {
        fontSize: 14,
        color: COLORS.grey,
    },
    dangerSection: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: COLORS.background,
        marginBottom: 40,
    },
    dangerSectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.error || '#FF3B30',
        letterSpacing: 0.5,
        marginBottom: 16,
        textTransform: 'uppercase',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.error + '40' || '#FF3B30' + '40',
        backgroundColor: COLORS.error + '10' || '#FF3B30' + '10',
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.error || '#FF3B30',
        marginLeft: 12,
    },
});

    return (
        <View style={styles.container}>
            {/* Custom Header */}
            <View style={styles.headerContainer}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleGoBack}
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.textDark || '#333'} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Privacy & Security</Text>
                    <Text style={styles.headerSubtitle}>Manage your account security and privacy</Text>
                </View>
            </View>
            
            <KeyboardAwareScrollView>
                <FormProvider {...form}>
                    {/* Password Change Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>CHANGE PASSWORD</Text>
                        
                        <View style={styles.passwordInputContainer}>
                            <CustomTextInput 
                                placeholder='Current Password' 
                                name='currentPassword' 
                                label='Current Password *' 
                                containerStyle={styles.inputContainer}
                                style={styles.textInput}
                                focusStyle={styles.textInputFocused}
                                secureTextEntry={!passwordVisible.current}
                            />
                            <TouchableOpacity
                                style={styles.eyeIcon}
                                onPress={() => togglePasswordVisibility('current')}
                            >
                                <Ionicons 
                                    name={passwordVisible.current ? "eye-off" : "eye"} 
                                    size={20} 
                                    color={COLORS.grey} 
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.passwordInputContainer}>
                            <CustomTextInput 
                                placeholder='New Password' 
                                name='newPassword' 
                                label='New Password *' 
                                containerStyle={styles.inputContainer}
                                style={styles.textInput}
                                focusStyle={styles.textInputFocused}
                                secureTextEntry={!passwordVisible.new}
                            />
                            <TouchableOpacity
                                style={styles.eyeIcon}
                                onPress={() => togglePasswordVisibility('new')}
                            >
                                <Ionicons 
                                    name={passwordVisible.new ? "eye-off" : "eye"} 
                                    size={20} 
                                    color={COLORS.grey} 
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.passwordInputContainer}>
                            <CustomTextInput 
                                placeholder='Confirm New Password' 
                                name='confirmPassword' 
                                label='Confirm New Password *' 
                                containerStyle={styles.inputContainer}
                                style={styles.textInput}
                                focusStyle={styles.textInputFocused}
                                secureTextEntry={!passwordVisible.confirm}
                            />
                            <TouchableOpacity
                                style={styles.eyeIcon}
                                onPress={() => togglePasswordVisibility('confirm')}
                            >
                                <Ionicons 
                                    name={passwordVisible.confirm ? "eye-off" : "eye"} 
                                    size={20} 
                                    color={COLORS.grey} 
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.changePasswordButton}
                            onPress={form.handleSubmit(handlePasswordChange)}
                            activeOpacity={0.9}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Change Password</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Privacy Settings Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>PRIVACY SETTINGS</Text>

                        <PrivacyItem 
                            title='Profile Visibility' 
                            description='Allow others to see your profile information' 
                            setting='profileVisibility'
                            value={privacySettings.profileVisibility}
                            handlePrivacySettingChange={handlePrivacySettingChange}
                        />
                        <PrivacyItem 
                            title='Activity Status' 
                            description='Show when you were last active' 
                            setting='activityStatus'
                            value={privacySettings.activityStatus}
                            handlePrivacySettingChange={handlePrivacySettingChange}
                        />
                        <PrivacyItem 
                            title='Read Receipts' 
                            description='Let others know when you have read their messages' 
                            setting='readReceipts'
                            value={privacySettings.readReceipts}
                            handlePrivacySettingChange={handlePrivacySettingChange}
                        />
                        <PrivacyItem 
                            title='Data Collection' 
                            description='Allow others to see your profile information' 
                            setting='dataCollection'
                            value={privacySettings.dataCollection}
                            handlePrivacySettingChange={handlePrivacySettingChange}
                        />
                    </View>

                    {/* Communication Settings Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>COMMUNICATION</Text>

                        <PrivacyItem 
                            title='Marketing Emails' 
                            description='Receive promotional emails and updates' 
                            setting='marketingEmails'
                            value={privacySettings.marketingEmails}
                            handlePrivacySettingChange={handlePrivacySettingChange}
                        />

                        <PrivacyItem 
                            title='Push Notifications' 
                            description='Receive push notifications on your device' 
                            setting='pushNotifications'
                            value={privacySettings.pushNotifications}
                            handlePrivacySettingChange={handlePrivacySettingChange}
                        />
                    </View>

                    {/* Security Settings Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>SECURITY</Text>
                        
                        <PrivacyItem 
                            title='Two-Factor Authentication' 
                            description='Add an extra layer of security to your account' 
                            setting='twoFactorAuth'
                            value={privacySettings.twoFactorAuth}
                            handlePrivacySettingChange={handlePrivacySettingChange}
                        />
                        
                        <TouchableOpacity style={styles.securityButton}>
                            <View style={styles.securityButtonContent}>
                                <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
                                <View style={styles.securityButtonText}>
                                    <Text style={styles.securityButtonTitle}>Login Sessions</Text>
                                    <Text style={styles.securityButtonDescription}>Manage active sessions</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.grey} />
                        </TouchableOpacity>
                    </View>

                    {/* Danger Zone */}
                    <View style={styles.dangerSection}>
                        <Text style={styles.dangerSectionTitle}>DANGER ZONE</Text>
                        
                        <TouchableOpacity 
                            style={styles.deleteButton}
                            onPress={handleDeleteAccount}
                        >
                            <Ionicons name="trash" size={20} color={COLORS.error || '#FF3B30'} />
                            <Text style={styles.deleteButtonText}>Delete Account</Text>
                        </TouchableOpacity>
                    </View>
                </FormProvider>
            </KeyboardAwareScrollView>
            <StatusBar style={statusBarStyle} />
        </View>
    );
};

export default PrivacySecurityScreen;