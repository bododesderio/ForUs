import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ProfileOption from '../../components/ProfileOption';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/userContext';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/authContext';
import { logoutUser } from '../../services/api';


export default function ProfileScreen() {
  const {user, setUser} = useAuth();
  const {COLORS} = useTheme();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Guard: show fallback UI if user is null
  if (!user) {
    return (
      <View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:COLORS.white}}>
        <Text style={{color:COLORS.textDark}}>Loading...</Text>
      </View>
    );
  }

  console.log('Profile; ', user)

  const handleOptionPress = (option: string) => {
    if(option === 'profile'){
      router.push("/(screens)/profileUpdate");
    } else if(option === 'reviews') {
      router.push('/(screens)/allReviews');
    } else if(option === 'privacy') {
      router.push("/(screens)/privacySecurity");
    } else if(option === 'settings'){
      router.push("/(screens)/preference");
    } else {
      router.push("/(screens)/consultants/resourceLibrary");
    }
  };

  const handleLogoutCustom = () => {
    setShowLogoutModal(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowLogoutModal(false);
    });
  };

  const confirmLogout = async () => {
    closeModal();
    setTimeout(async () => {
      await logoutUser();
      setUser(null);
      router.replace('/login');
    }, 300);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background
    },
    profileSection: {
      alignItems: 'center',
    },
    profileInfo: {
      marginHorizontal: 22,
      marginVertical: 14,
      alignItems: "center"
    },
    avatar: { 
      width: 120, 
      height:120, 
      borderRadius:120, 
      borderWidth: 5, 
      borderColor: COLORS.border,
      marginTop: -75
    },
    userName: {
      fontSize: 24,
      fontWeight: '600',
      color: COLORS.textDark,
      marginBottom: 2,
    },
    userEmail: {
      fontSize: 16,
      fontWeight: '400',
      marginBottom: 2,
      color: COLORS.textDark,
    },
    userBio: {
      textAlign: "center",
      color: COLORS.textSecondary
    },
    section: {
      marginHorizontal: 20,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.textDark,
      letterSpacing: 0.5,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    optionsCard: {
      borderRadius: 12,
      borderWidth: 1,
      overflow: 'hidden',
      backgroundColor: COLORS.cardBackground,
      borderColor: COLORS.lightGrey
    },
    separator: {
      height: 1,
      marginLeft: 48,
      backgroundColor: COLORS.lightGrey
    },
    appInfo: {
      alignItems: 'center',
      paddingVertical: 10,
      marginBottom: 10,
    },
    logoutSection: {
      marginHorizontal: 20,
      marginBottom: 20,
      alignItems: 'center',
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 68, 68, 0.1)',
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 68, 68, 0.2)',
      width: '100%',
      maxWidth: 200,
    },
    logoutText: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.error || '#FF4444',
      marginLeft: 8,
    },
    // Custom Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    modalContent: {
      backgroundColor: COLORS.background,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 320,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 10,
    },
    modalIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: 'rgba(255, 68, 68, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: COLORS.textDark || '#1A1A1A',
      marginBottom: 8,
      textAlign: 'center',
    },
    modalMessage: {
      fontSize: 16,
      fontWeight: '400',
      color: COLORS.textSecondary || '#666666',
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    modalButtons: {
      flexDirection: 'row',
      width: '100%',
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: COLORS.background || '#F5F5F5',
      borderWidth: 1,
      borderColor: COLORS.border || '#E5E5E5',
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.textDark || '#1A1A1A',
    },
    confirmButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: COLORS.error || '#FF4444',
      alignItems: 'center',
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.profileSection}>
        <Image style={{ 
          width: '100%', 
          aspectRatio: 19/7
        }} 
        source={{ uri: user?.profile_image || undefined }}
        blurRadius={8}
        />
        <Image 
          style={styles.avatar} 
          source={{uri: user?.profile_image || undefined}} 
        />
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{user?.first_name} {user?.last_name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.userBio}>{user?.bio}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GENERAL</Text>
        <View style={styles.optionsCard}>
          <ProfileOption
            title="Profile Settings"
            description="Update your profile"
            icon="person-outline"
            onPress={() => handleOptionPress('profile')}
          />
          <View style={styles.separator} />
          <ProfileOption
            title="Privacy & Security"
            description="Change password & privacy"
            icon="lock-closed-outline"
            onPress={() => handleOptionPress('privacy')}
          />
          <View style={styles.separator} />
          <ProfileOption
            title="Preferences"
            description="App settings & preferences"
            icon="settings-outline"
            onPress={() => handleOptionPress('settings')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PROFESSIONAL SERVICES</Text>
        <View style={styles.optionsCard}>
          <ProfileOption
            title="Reviews & Ratings"
            description={`${user?.average_rating} stars • ${user?.total_reviews} reviews`}
            icon="star-outline"
            onPress={() => handleOptionPress('reviews')}
          />
          <View style={styles.separator} />
          <ProfileOption
            title="Consultation History"
            description="View past consultations"
            icon="document-text-outline"
            onPress={() => handleOptionPress('history')}
          />
          <View style={styles.separator} />
          <ProfileOption
            title="Professional Portfolio"
            description="Showcase your expertise"
            icon="briefcase-outline"
            onPress={() => handleOptionPress('portfolio')}
          />
          <ProfileOption
            title="Resources"
            description="Share healing content & tools"
            icon="library-outline"
            onPress={() => handleOptionPress('resources')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SUPPORT</Text>
        <View style={styles.optionsCard}>
          <ProfileOption
            title="Help Center"
            description="Get help and support"
            icon="help-circle-outline"
            onPress={() => handleOptionPress('help')}
          />
          <View style={styles.separator} />
          <ProfileOption
            title="Terms & Privacy"
            description="View our policies"
            icon="document-text-outline"
            onPress={() => handleOptionPress('terms')}
          />
        </View>
      </View>

      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutCustom}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error || '#FF4444'} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.appInfo}>
        <Text style={styles.sectionTitle}>Version 1.0.0</Text>
      </View>

      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeModal}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <Animated.View 
            style={[
              styles.modalContent,
              {
                transform: [{
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  })
                }]
              }
            ]}
          >
            {/* Modal Icon */}
            <View style={styles.modalIconContainer}>
              <Ionicons name="log-out-outline" size={32} color={COLORS.error || '#FF4444'} />
            </View>

            {/* Modal Title */}
            <Text style={styles.modalTitle}>Logout Confirmation</Text>
            
            {/* Modal Message */}
            <Text style={styles.modalMessage}>
              Are you sure you want to logout? You'll need to sign in again to access your account.
            </Text>

            {/* Modal Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.confirmButton} onPress={confirmLogout}>
                <Text style={styles.confirmButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
      <StatusBar style="light" />      
    </ScrollView>
  );
}