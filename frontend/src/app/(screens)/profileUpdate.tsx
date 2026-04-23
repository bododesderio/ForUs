import { View, Text, Image, TouchableOpacity, Dimensions, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

import { useTheme } from '../../context/ThemeContext';
import CustomTextInput from '../../components/CustomTextInput';
import KeyboardAwareScrollView from '../../components/KeyboardAwareView';
import { useAuth } from '../../context/authContext';
import { useUser } from '../../context/userContext';
import ToastMessage from '../../components/ToastMessage';
import { uploadToCloudinarySigned } from '../../services/cloudinaryUpload';
import { API_BASE_URL } from '../../services/api';

const { width } = Dimensions.get("window");

const ProfileUpdateInfo = z.object({
    firstName: z.string().min(1, {message: "First name is required."}),
    lastName: z.string().min(1, {message: "Last name is required."}),
    username: z.string().min(3, {message: "Username must be at least 3 characters."}).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: z.string({message: "Email is required."}).min(1, {message: "Email must be longer than 1."}).regex(/^\S+@\S+\.\S+$/, 'Email must be in the format @example.com'),
    phone: z.string().optional(),
    dob: z.string().optional(),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
    profileImage: z.string().optional(), // Add profile image to schema
});

type ProfileUpdateScreen = z.infer<typeof ProfileUpdateInfo>;

const ProfileUpdateScreen = () => {
    const [loading, setLoading] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [selectedGender, setSelectedGender] = useState('');
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [localImageUri, setLocalImageUri] = useState(null); // For immediate preview

    const { user, setUser } = useAuth();
    const { updateProfile } = useUser();
    const { COLORS, mode } = useTheme();
    const router = useRouter();

    const statusBarStyle = mode === 'dark' || COLORS.background === '#000' ? 'light' : 'dark';
    
    const form = useForm<ProfileUpdateScreen>({
        resolver: zodResolver(ProfileUpdateInfo),
        defaultValues: {
            firstName: user?.first_name || '',
            lastName: user?.last_name || '',
            username: user?.username || '',
            email: user?.email || '',
            phone: user?.phone || '',
            dob: user?.dob || '',
            gender: user?.gender || undefined,
            profileImage: user?.profile_image || user?.profile_image || '',
        }
    });

    useEffect(() => {
        if (user) {
            form.reset({
                firstName: user.first_name || '',
                lastName: user.last_name || '',
                username: user.username || '',
                email: user.email || '',
                phone: user.phone || '',
                dob: user.dob || '',
                gender: user.gender || undefined,
                profileImage: user.profile_image || user.profile_image || '',
            });
            setSelectedGender(user.gender || '');
        }
    }, [user, form]);

    // Function to upload image to Cloudinary (signed)
    const uploadImageToCloudinary = async (imageUri: string) => {
        try {
            setImageUploading(true);
            // Replace with your backend endpoint
            const backendSignatureUrl = `${API_BASE_URL}/cloudinary-signature`;
            const secureUrl = await uploadToCloudinarySigned(imageUri, backendSignatureUrl);
            form.setValue('profileImage', secureUrl);
            setLocalImageUri(null);
            Alert.alert('Success', 'Profile image uploaded successfully!');
            return secureUrl;
        } catch (error: any) {
            console.error('Cloudinary upload error:', error);
            Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
            setLocalImageUri(null);
            return null;
        } finally {
            setImageUploading(false);
        }
    };

    // Function to handle image selection
    const selectImage = async () => {
        try {
            // Request permission to access media library
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant permission to access your photos.');
                return;
            }

            // Show action sheet for image source selection
            Alert.alert(
                'Select Image',
                'Choose an option',
                [
                    { text: 'Camera', onPress: () => openCamera() },
                    { text: 'Photo Library', onPress: () => openImagePicker() },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        } catch (error) {
            console.error('Image selection error:', error);
            Alert.alert('Error', 'Failed to select image');
        }
    };

    const openCamera = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant camera permission.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setLocalImageUri(result.assets[0].uri); // Show immediate preview
                await uploadImageToCloudinary(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Camera error:', error);
            Alert.alert('Error', 'Failed to take photo');
        }
    };

    const openImagePicker = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setLocalImageUri(result.assets[0].uri); // Show immediate preview
                await uploadImageToCloudinary(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert('Error', 'Failed to select image');
        }
    };

    const handleUpdateProfile: SubmitHandler<ProfileUpdateScreen> = async (data) => {
        const requiredFields = [data.firstName, data.lastName, data.username, data.email];
        if(requiredFields.some(field => !field?.trim())){
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }
        console.log('updating data', data)
        setLoading(true);
        try {
            const profileData = {
                ...data,
                gender: selectedGender || data.gender
            };
            
            const response = await updateProfile(profileData);
            
            if (response.success) {
                if(response.user){
                    setUser(response.user);
                }
                setShowSuccessMessage(true);
                setTimeout(() => {
                    setShowSuccessMessage(false);
                }, 3000);
            } else {
                Alert.alert('Update Failed', response.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            Alert.alert('Update Error', error.message || 'An error occurred while updating profile');
        } finally {
            setLoading(false);
        }
    }

    const handleGoBack = () => {
        router.back();
    }

    // Function to get the current profile image URI
    const getCurrentImageUri = () => {
        if (localImageUri) return localImageUri; // Show local preview first
        if (form.watch('profileImage')) return form.watch('profileImage');
        return user?.profileImage || user?.profile_image || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTi7OjMMcQCicrkDxnax7RiNpMkvyG7-AjtBg&s";
    };

    // Fix 4: Add loading state for initial data
    if (!user) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 16, color: COLORS.textSecondary }}>Loading profile...</Text>
            </View>
        );
    }

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
    profileImageSection: {
        alignItems: 'center',
        paddingBottom: 25,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: COLORS.border,
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    changePhotoText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    formSection: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textDark,
        letterSpacing: 0.5,
        marginBottom: 16,
        textTransform: 'uppercase',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    halfInput: {
        flex: 1,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.textDark,
        marginBottom: 8,
    },
    textInput: {
        paddingHorizontal: 16,
        paddingVertical: 16,
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
    pickerContainer: {
        borderWidth: 1.5,
        borderColor: COLORS.grey + '40',
        borderRadius: 12,
        backgroundColor: COLORS.inputBackground,
        overflow: 'hidden',
    },
    picker: {
        height: 56,
        color: COLORS.textPrimary,
    },
    updateButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginBottom: 16,
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
    updateButtonDisabled: {
        backgroundColor: COLORS.grey,
        shadowOpacity: 0.1,
    },
    updateButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.white,
    },
    requiredText: {
        textAlign: "center",
        fontSize: 12,
        color: COLORS.grey,
        fontStyle: 'italic',
    },
    uploadingText: {
        textAlign: "center",
        fontSize: 12,
        color: COLORS.primary,
        marginTop: 8,
        fontStyle: 'italic',
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
                    <Text style={styles.headerTitle}>Update Profile</Text>
                    <Text style={styles.headerSubtitle}>Manage your personal information</Text>
                </View>
            </View>
            
            <KeyboardAwareScrollView>
                <FormProvider {...form}>
                {/* Profile Image Section */}
                <View style={styles.profileImageSection}>
                    <View style={styles.avatarContainer}>
                        <Image 
                            source={{ uri: getCurrentImageUri() }}
                            style={styles.avatar}
                        />
                        <TouchableOpacity 
                            style={styles.cameraButton}
                            onPress={selectImage}
                            disabled={imageUploading}
                        >
                            {imageUploading ? (
                                <ActivityIndicator size={16} color={COLORS.white} />
                            ) : (
                                <Ionicons name="camera" size={16} color={COLORS.white} />
                            )}
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.changePhotoText}>
                        {imageUploading ? 'Uploading...' : 'Tap to change photo'}
                    </Text>
                </View>

                {/* Form Section */}
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>PERSONAL INFORMATION</Text>
                    
                    <View style={styles.row}>
                        <View style={styles.halfInput}>
                            <CustomTextInput 
                                placeholder='First Name' 
                                name='firstName' 
                                label='First Name *' 
                                containerStyle={styles.inputContainer}
                                style={styles.textInput}
                                focusStyle={styles.textInputFocused}
                            />
                        </View>
                        <View style={styles.halfInput}>
                            <CustomTextInput 
                                placeholder='Last Name' 
                                name='lastName' 
                                label='Last Name *' 
                                containerStyle={styles.inputContainer}
                                style={styles.textInput}
                                focusStyle={styles.textInputFocused}
                            />
                        </View>
                    </View>

                    <CustomTextInput 
                        placeholder='Username' 
                        name='username' 
                        label='Username *' 
                        containerStyle={styles.inputContainer}
                        style={styles.textInput}
                        focusStyle={styles.textInputFocused}
                    />

                    <CustomTextInput 
                        placeholder='email@example.com' 
                        name='email' 
                        label='Email *' 
                        containerStyle={styles.inputContainer}
                        style={styles.textInput}
                        focusStyle={styles.textInputFocused}
                        keyboardType="email-address"
                    />

                    <CustomTextInput 
                        placeholder='Phone Number' 
                        name='phone' 
                        label='Phone' 
                        containerStyle={styles.inputContainer}
                        style={styles.textInput}
                        focusStyle={styles.textInputFocused}
                        keyboardType="phone-pad"
                    />

                    <CustomTextInput 
                        placeholder='YYYY-MM-DD' 
                        name='dob' 
                        label='Date of Birth' 
                        containerStyle={styles.inputContainer}
                        style={styles.textInput}
                        focusStyle={styles.textInputFocused}
                    />

                    {/* Gender Picker */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Gender</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={selectedGender || form.watch('gender')}
                                onValueChange={(itemValue) => {
                                    setSelectedGender(itemValue);
                                    form.setValue('gender', itemValue);
                                }}
                                style={styles.picker}
                            >
                                <Picker.Item label="Select Gender" value="" />
                                <Picker.Item label="Male" value="male" />
                                <Picker.Item label="Female" value="female" />
                                <Picker.Item label="Other" value="other" />
                                <Picker.Item label="Prefer not to say" value="prefer_not_to_say" />
                            </Picker>
                        </View>
                    </View>

                    {/* Update Button */}
                    <TouchableOpacity
                        style={[styles.updateButton, (loading || imageUploading) && styles.updateButtonDisabled]}
                        onPress={form.handleSubmit(handleUpdateProfile)}
                        activeOpacity={0.9}
                        disabled={loading || imageUploading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.updateButtonText}>Update Profile</Text>
                        )}
                    </TouchableOpacity>
                    
                    <Text style={styles.requiredText}>* Required fields</Text>
                    
                    {imageUploading && (
                        <Text style={styles.uploadingText}>Please wait while your image is being uploaded...</Text>
                    )}
                </View>
                </FormProvider>
            </KeyboardAwareScrollView>
            <StatusBar style={statusBarStyle} />
            {showSuccessMessage && (
                <ToastMessage />
            )}
        </View>
    );
}

export default ProfileUpdateScreen;