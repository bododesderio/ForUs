import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Add this import
import { getStoredToken, getStoredUserData, getUserProfile, updateUserProfile, fetchConsultants, fetchConsultantById } from '../services/api';

const UserContext = createContext({});

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within an UserProvider');
    }
    return context;
};

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [consultants, setConsultants] = useState([])
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check if user is already logged in on app start
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const token = await getStoredToken();
            const userData = await getStoredUserData();

            if (token && userData) {
                setUser(userData);
                setIsAuthenticated(true);
                
                // Optionally fetch fresh profile data
                try {
                    const profileResponse = await getUserProfile();
                    if (profileResponse.success) {
                        setUser(profileResponse.user);
                        await AsyncStorage.setItem('userData', JSON.stringify(profileResponse.user));
                    }
                } catch (error) {
                    console.log('Profile fetch failed:', error);
                    // Continue with stored data if API fails
                }
            }
        } catch (error) {
            console.log('Auth check failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const profile = async() => {
        try {
            setLoading(true);
            const response = await getUserProfile();

            if (response.success) {
                setUser(response.user);
                setIsAuthenticated(true);
                await AsyncStorage.setItem('userData', JSON.stringify(response.user));
                return { success: true };
            } else {
                return { success: false, message: response.message };
            }
        } catch (error) {
            console.log('Profile fetch error:', error);
            return { success: false, message: error.message };
        } finally {
            setLoading(false);
        }
    }

    const updateProfile = async (profileData) => {
        try {
            setLoading(true);

            const response = await updateUserProfile(profileData);

            if (response.success) {
                setUser(response.user);
                setIsAuthenticated(true);
                
                await AsyncStorage.setItem('userData', JSON.stringify(response.user));
                
                return { success: true, user: response.user };
            } else {
                return { success: false, message: response.message };
            }
        } catch (error) {
            console.log('Profile update error:', error);
            return { success: false, message: error.message || 'Failed to update profile' };
        } finally {
            setLoading(false);
        }
    };

    const getConsultants = async (params = {}) => {
        try {
            setLoading(true);

            const response = await fetchConsultants(params);
            console.log('Fetched consultants:', response);

            if (response.success) {
                console.log(response.consultants)
                setConsultants(response.consultants)
                await AsyncStorage.setItem('consultantsData', JSON.stringify(response.consultants));
                
                return { 
                    success: true, 
                    consultants: response.consultants,
                    pagination: response.pagination || null,
                    total: response.total || response.consultants?.length || 0
                };
            } else {
                return { success: false, message: response.message };
            }
        } catch (error) {
            console.log('Consultants fetch error:', error);
            return { success: false, message: error.message || 'Failed to fetch consultants' };
        } finally {
            setLoading(false);
        } 
        };

        const getConsultant = async (consultantId) => { 
            try {
                setLoading(true);

                const response = await fetchConsultantById(consultantId);

                if (response.success) {
                return { success: true, consultant: response.consultant };
                } else {
                return { success: false, message: response.message };
                }
            } catch (error) {
                console.log('Consultant fetch error:', error);
                return { success: false, message: error.message || 'Failed to fetch consultant' };
            } finally {
                setLoading(false);
            }
            };

    const value = {
        user,
        isAuthenticated,
        loading,
        setLoading,
        profile,
        updateProfile, 
        getConsultants,
        getConsultant,
        consultants
    };
    
    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}