/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL as api_url} from '@env';
// Configure base URL (update with your backend URL)
export const API_BASE_URL = api_url; // Use your local IP
// For development on physical device, use your computer's IP address
// For iOS simulator: http://localhost:3000/api
// For Android emulator: http://10.0.2.2:3000/api

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',  
  },
});

// --- Token Storage Helpers ---
export const setAccessToken = async (token) => {
  await AsyncStorage.setItem('accessToken', token);
};
export const setRefreshToken = async (token) => {
  await AsyncStorage.setItem('refreshToken', token);
};
export const getAccessToken = async () => {
  return await AsyncStorage.getItem('accessToken');
};
export const getRefreshToken = async () => {
  return await AsyncStorage.getItem('refreshToken');
};
export const clearTokens = async () => {
  await AsyncStorage.removeItem('accessToken');
  await AsyncStorage.removeItem('refreshToken');
  await AsyncStorage.removeItem('authToken');
  await AsyncStorage.removeItem('userData');
};

// Add token to requests automatically
apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration and refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({resolve, reject});
        })
        .then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return apiClient(originalRequest);
        })
        .catch(err => {
          return Promise.reject(err);
        });
      }
      isRefreshing = true;
      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
          await clearTokens();
          return Promise.reject(error);
        }
        const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken });
        if (res.data && res.data.accessToken) {
          await setAccessToken(res.data.accessToken);
          // Rotating refresh tokens (SEC-3): persist the new one so the next refresh
          // uses it — the old token is now blacklisted. Absent on backends that don't rotate.
          if (res.data.refreshToken) {
            await setRefreshToken(res.data.refreshToken);
          }
          apiClient.defaults.headers['Authorization'] = 'Bearer ' + res.data.accessToken;
          processQueue(null, res.data.accessToken);
          originalRequest.headers['Authorization'] = 'Bearer ' + res.data.accessToken;
          return apiClient(originalRequest);
        } else {
          await clearTokens();
          processQueue(new Error('Refresh failed'), null);
          return Promise.reject(error);
        }
      } catch (err) {
        await clearTokens();
        processQueue(err, null);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// Utility functions
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    return {
      message: error.response.data.message || 'Server erro',
      status: error.response.status
    };
  } else if (error.request) {
    // Network error
    return {
      message: 'Network error. Please check your connection.',
      status: 0
    };
  } else {
    // Other error
    return {
      message: error.message || 'An unexpected error occurred',
      status: -1
    };
  }
};

// Storage functions
export const storeAuthData = async (accessToken, refreshToken, userData) => {
  await setAccessToken(accessToken);
  await setRefreshToken(refreshToken);
  await AsyncStorage.setItem('userData', JSON.stringify(userData));
};

export const clearAuthData = async () => {
  await clearTokens();
};

export const getAuthData = async () => {
  try {
    const accessToken = await getAccessToken();
    const refreshToken = await getRefreshToken();
    const user = await AsyncStorage.getItem('userData');
    return {
      accessToken,
      refreshToken,
      user: user ? JSON.parse(user) : null
    };
  } catch (error) {
    console.error('Error getting auth data:', error);
    return { accessToken: null, refreshToken: null, user: null };
  }
};

export const getStoredToken = getAccessToken;
export const getStoredUserData = async () => {
  const userData = await AsyncStorage.getItem('userData');
  return userData ? JSON.parse(userData) : null;
};

// API functions
export const loginUser = async (email, password) => {
  try {
    const response = await apiClient.post('/auth/login-user', { email, password });
    
    if (response.data.success && response.data.accessToken && response.data.refreshToken) {
      await storeAuthData(response.data.accessToken, response.data.refreshToken, response.data.user);
    }
    console.log(response.data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const registerUser = async (username, email, password) => {
  try {
    // Generate random avatar URL using DiceBear API
    const avatarStyle = ['adventurer', 'avataaars', 'bottts', 'pixel-art'][Math.floor(Math.random() * 4)];
    const seed = Math.random().toString(36).substring(7);
    const size = 256; // Set image size
    const backgroundColor = ['b6e3f4','c0aede','d1d4f9'][Math.floor(Math.random() * 3)]; // Random light background
    const profileImage = `https://api.dicebear.com/7.x/${avatarStyle}/png?seed=${seed}&size=${size}&backgroundColor=${backgroundColor}`;

    const response = await apiClient.post('/auth/register-user', { 
      username, 
      email, 
      password,
      profile_image: profileImage 
    });
    
    if (response.data.success && response.data.accessToken && response.data.refreshToken) {
      await storeAuthData(response.data.accessToken, response.data.refreshToken, response.data.user);
    }
    
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const formatDateForAPI = (date) => {
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
};

// Helper function to get date range for next N days
export const getDateRange = (days = 7) => {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + days);
    
    return {
        from: formatDateForAPI(today),
        to: formatDateForAPI(endDate)
    };
};

export const getUserProfile = async () => {
  try {
    const response = await apiClient.get('/users/profile');
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const logoutUser = async () => {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch (e) {
      console.log(e);
    }
  }
  await clearAuthData();
};

export const updateUserProfile = async (profileData) => {
  try {
    const updateData = {};
    
    if (profileData.firstName?.trim()) updateData.first_name = profileData.firstName.trim();
    if (profileData.lastName?.trim()) updateData.last_name = profileData.lastName.trim();
    if (profileData.username?.trim()) updateData.username = profileData.username.trim();
    if (profileData.email?.trim()) updateData.email = profileData.email.trim();
    if (profileData.phone?.trim()) updateData.phone = profileData.phone.trim();
    if (profileData.dob?.trim()) updateData.dob = profileData.dob.trim();
    if (profileData.gender) updateData.gender = profileData.gender;
    if (profileData.profileImage) updateData.profile_image = profileData.profileImage;
    
    const response = await apiClient.patch('/users/update-profile', updateData);
    
    if (response.data.success) {
      const currentAuthData = await getAuthData();
      const updatedUser = { ...currentAuthData.user, ...response.data.user };
      // Preserve existing tokens while updating user data
      await storeAuthData(currentAuthData.accessToken, currentAuthData.refreshToken, updatedUser);
    }
    
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const fetchConsultants = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Add optional query parameters
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.profession) queryParams.append('profession', params.profession);
    // if (params.role) queryParams.append('role', params.role);
    if (params.search) queryParams.append('search', params.search);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/users/consultants?${queryString}` : '/users/consultants';
    console.log('Query: ', queryString)
    console.log('E: nd', endpoint)
    const response = await apiClient.get(endpoint);
    console.log('Data: ', response.data)

    
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Updated getUsers to support pagination, filtering, and sorting
export const getUsers = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Add optional query parameters
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.role) queryParams.append('role', params.role);
    if (params.search) queryParams.append('search', params.search);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/users/users?${queryString}` : '/users/users';
    
    const response = await apiClient.get(endpoint);
    
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const deleteUser = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    const response = await apiClient.delete(`/users/delete/user/${userId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
export const deleteConsultant = async (consultantId) => {
  try {
    if (!consultantId) {
      throw new Error('Consultant ID is required');
    }
    const response = await apiClient.delete(`/users/delete/consultant/${consultantId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const fetchConsultantById = async (consultantId) => {
  try {
    if (!consultantId) {
      throw new Error('Consultant ID is required');
    }
    
    const response = await apiClient.get(`/users/consultants/${consultantId}`);
    
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getConsultantAppointments = async (consultantId, filters = {}) => {
  try {
    if (!consultantId) {
      throw new Error('Consultant ID is required');
    }
    
    // Use GET method and include filters as query parameters if needed
    const queryParams = new URLSearchParams(filters).toString();
    const url = `/appointments/consultant/${consultantId}${queryParams ? `?${queryParams}` : ''}`;
    
    const response = await apiClient.get(url);
    
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getUserAppointments = async (userId, filters = {}) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Use GET method and include filters as query parameters if needed
    const queryParams = new URLSearchParams(filters).toString();
    const url = `/appointments/user/${userId}${queryParams ? `?${queryParams}` : ''}`;
    
    const response = await apiClient.get(url);
    
    return response.data;
  } catch (error) {
    throw handleApiError(error); 
  }
};

export const createAppointment = async (appointmentData) => {
    try {
        if (!appointmentData) {
            throw new Error('Appointment data is required');
        }
        // Validate required fields
        if (!appointmentData.consultant_id) {
            throw new Error('Consultant ID is required');
        }
        if (!appointmentData.appointment_datetime) {
            throw new Error('Appointment datetime (UTC ISO string) is required');
        }
        // Only send appointment_datetime, not appointment_date or appointment_time
        const response = await apiClient.post('/appointments/create', appointmentData);
        return response.data;
    } catch (error) {
        throw handleApiError(error);
    }
};

export const getRecentActivities = async () => {
  try {
    const response = await apiClient.get('/activities');
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Add these to your services/api.js file
export const getConsultantReviewsPaginated = async (
  consultantId, 
  page = 1, 
  limit = 10, 
  sortBy = 'created_at', 
  sortOrder = 'DESC'
) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder
    });
    
    const response = await apiClient.get(`/appointments/consultants/${consultantId}/reviews?${params}`);
    return response.data;
    
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getConsultantReviews = async (consultantId) => {
  try {
    if (!consultantId) {
      throw new Error('Consultant ID is required');
    }
    
    const response = await apiClient.get(`/users/consultants/${consultantId}`);
    
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const submitReview = async (consultantId, reviewData) => {
  try {
        if (!reviewData) {
            throw new Error('Review data is required');
        }
        
        // Validate required fields
        if (!consultantId) {
            throw new Error('Consultant ID is required');
        }
        
        const response = await apiClient.post(`/appointments/${consultantId}/review`, reviewData);
        
        return response.data;
    } catch (error) {
        throw handleApiError(error);
    }
};

export const cancelAppointment = async (appointment, cancelData) => {
    try {
        if (!cancelData) throw new Error('Cancellation data is required');
        if (!appointment) throw new Error('Appointment data is required');
        // Use the cancel endpoint
        const response = await apiClient.post(`/appointments/${appointment.id}/cancel`, cancelData);
        return response.data;
    } catch (error) {
        throw handleApiError(error);
    }
};

export const blockConsultantSlot = async ({ appointment_datetime, duration_minutes = 90 }) => {
  try {
    const response = await apiClient.post('/appointments/block', {
      appointment_datetime,
      duration_minutes
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Confirm a pending appointment (consultant only)
export const confirmAppointment = async (appointmentId) => {
  try {
    const response = await apiClient.post(`/appointments/${appointmentId}/confirm`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Reject a pending appointment (consultant only)
export const rejectAppointment = async (appointmentId) => {
  try {
    const response = await apiClient.post(`/appointments/${appointmentId}/reject`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const rescheduleAppointment = async (appointmentId, new_datetime) => {
    try {
        const response = await apiClient.post(`/appointments/${appointmentId}/reschedule`, { new_datetime });
        return response.data;
    } catch (error) {
        throw handleApiError(error);
    }
};

// Start an appointment session
export const startSession = async (appointmentId) => {
  try {
    if (!appointmentId) {
      throw new Error('Appointment ID is required');
    }
    const response = await apiClient.post(`/appointments/${appointmentId}/start-session`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// --- Mood Tracking API ---
export const getUserMood = async (date) => {
  try {
    const response = await apiClient.get(`/mood?date=${date}`);
    // Expected response: { mood: number }
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null; // No mood set for this date
    }
    throw handleApiError(error);
  }
};

// Set the user's mood for a specific date (YYYY-MM-DD)
export const setUserMood = async (date, mood) => {
  try {
    await apiClient.post('/mood', { date, mood });
  } catch (error) {
    throw handleApiError(error);
  }
};

export const uploadResource = async (resourceData) => {
  try {
    const response = await apiClient.post('/resources/upload', resourceData);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const fetchResources = async () => {
  try {
    const response = await apiClient.get('/resources');
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const changePassword = async ({ currentPassword, newPassword }) => {
  try {
    const response = await apiClient.post('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// --- Push Notification API ---
export const saveUserPushToken = async (userId, pushToken) => {
  try {
    const response = await apiClient.post('/users/push-token', { userId, pushToken });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const saveConsultantPushToken = async (consultantId, pushToken) => {
  try {
    const response = await apiClient.post('/users/consultant/push-token', { consultantId, pushToken });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const sendPushNotificationToUser = async (userId, title, body, data = {}) => {
  try {
    const response = await apiClient.post('/users/send-notification', { userId, title, body, data });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const sendPushNotificationToConsultant = async (consultantId, title, body, data = {}) => {
  try {
    const response = await apiClient.post('/users/consultant/send-notification', { consultantId, title, body, data });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// --- Notification API ---
export const fetchConsultantNotifications = async () => {
  try {
    const response = await apiClient.get('/users/consultant/notifications');
    return response.data.notifications;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const fetchUserNotifications = async () => {
  try {
    const response = await apiClient.get('/users/notifications');
    return response.data.notifications;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    await apiClient.post('/users/notification/read', { notificationId });
  } catch (error) {
    throw handleApiError(error);
  }
};

export const updateNotificationPreference = async (enabled) => {
  try {
    const res = await apiClient.patch('/users/notification-preference', { enabled });
    return res.data;
  } catch (error) {
    throw error;
  }
};

// --- Chat API ---
export const generateChatToken = async () => {
  try {
    const response = await apiClient.get('/chat/token');
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Create a chat room (direct, group, or appointment)
export const createChatRoom = async (roomData) => {
  try {
    const response = await apiClient.post('/chat/rooms', roomData);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get all chat rooms for the current user
export const getUserChatRooms = async () => {
  try {
    const response = await apiClient.get('/chat/rooms');
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get messages for a specific chat room
export const getRoomMessages = async (roomId, limit = 50, before = null) => {
  try {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (before) params.append('before', before);
    const response = await apiClient.get(`/chat/rooms/${roomId}/messages?${params}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Join a chat room (if needed)
export const joinChatRoom = async (roomId) => {
  try {
    const response = await apiClient.post(`/chat/rooms/${roomId}/join`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Create an appointment-based chat room
export const createAppointmentChatRoom = async (appointmentId, consultantId, userId) => {
  try {
    const roomId = `appointment_${appointmentId}`;
    const roomData = {
      roomId,
      name: `Appointment ${appointmentId}`,
      type: 'messaging',
      members: [
        { user_id: consultantId, user_type: 'consultant', role: 'member' },
        { user_id: userId, user_type: 'user', role: 'member' }
      ]
    };
    const response = await apiClient.post('/chat/rooms', roomData);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getAllAppointments = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters).toString();
    const url = queryParams ? `/appointments/all?${queryParams}` : '/appointments/all';
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Default export with all functions for backward compatibility
const apiService = {
  login: loginUser,
  register: registerUser,
  getProfile: getUserProfile,
  logout: logoutUser,
  getStoredToken,
  getStoredUserData,
  handleError: handleApiError,
};

export default apiService;
