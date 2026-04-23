// audioUtils.js - Utility functions for audio processing
import { Audio } from 'expo-av';

/**
 * Format audio duration from seconds to MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "1:23")
 */
export const formatAudioDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Get audio duration from URI
 * @param {string} audioUri - Audio file URI
 * @returns {Promise<number>} Duration in seconds
 */
export const getAudioDuration = async (audioUri) => {
  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUri },
      { shouldPlay: false }
    );
    
    const status = await sound.getStatusAsync();
    await sound.unloadAsync();
    
    return status.durationMillis ? status.durationMillis / 1000 : 0;
  } catch (error) {
    console.error('Error getting audio duration:', error);
    return 0;
  }
};

/**
 * Generate mock waveform data for visualization
 * @param {number} duration - Audio duration in seconds
 * @param {number} points - Number of waveform points
 * @returns {Array<number>} Array of amplitude values (0-1)
 */
export const generateWaveformData = (duration = 30, points = 50) => {
  const data = [];
  for (let i = 0; i < points; i++) {
    // Generate realistic waveform pattern
    const baseAmplitude = Math.random() * 0.8 + 0.1;
    const variation = Math.sin(i * 0.3) * 0.2;
    data.push(Math.max(0.1, Math.min(1, baseAmplitude + variation)));
  }
  return data;
};

/**
 * Generate real-time waveform data during recording
 * @param {number} amplitude - Current audio amplitude (0-1)
 * @param {Array<number>} existingData - Existing waveform data
 * @param {number} maxPoints - Maximum number of points to keep
 * @returns {Array<number>} Updated waveform data
 */
export const updateWaveformData = (amplitude, existingData = [], maxPoints = 50) => {
  const newData = [...existingData, amplitude];
  
  // Keep only the last maxPoints
  if (newData.length > maxPoints) {
    return newData.slice(-maxPoints);
  }
  
  return newData;
};

/**
 * Convert milliseconds to seconds
 * @param {number} milliseconds
 * @returns {number} seconds
 */
export const msToSeconds = (milliseconds) => {
  return milliseconds / 1000;
};

/**
 * Convert seconds to milliseconds
 * @param {number} seconds
 * @returns {number} milliseconds
 */
export const secondsToMs = (seconds) => {
  return seconds * 1000;
};

/**
 * Calculate progress percentage
 * @param {number} current - Current position in seconds
 * @param {number} total - Total duration in seconds
 * @returns {number} Progress percentage (0-100)
 */
export const calculateProgress = (current, total) => {
  if (!total || total === 0) return 0;
  return Math.min(100, Math.max(0, (current / total) * 100));
};

/**
 * Validate audio URI
 * @param {string} uri - Audio URI to validate
 * @returns {boolean} Whether URI is valid
 */
export const isValidAudioUri = (uri) => {
  if (!uri || typeof uri !== 'string') return false;
  
  // Check for common audio file extensions
  const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg'];
  const hasValidExtension = audioExtensions.some(ext => 
    uri.toLowerCase().includes(ext)
  );
  
  // Check for valid URI format
  const isValidUri = uri.startsWith('file://') || 
                    uri.startsWith('http://') || 
                    uri.startsWith('https://') ||
                    uri.startsWith('content://');
  
  return hasValidExtension || isValidUri;
};

/**
 * Generate recording session ID
 * @returns {string} Unique session ID
 */
export const generateRecordingId = () => {
  return `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Audio quality presets
 */
export const AUDIO_QUALITY = {
  LOW: {
    android: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
      audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
      sampleRate: 22050,
      numberOfChannels: 1,
      bitRate: 64000,
    },
    ios: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
      audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MIN,
      sampleRate: 22050,
      numberOfChannels: 1,
      bitRate: 64000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  },
  MEDIUM: {
    android: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
      audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
    },
    ios: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
      audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MEDIUM,
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  },
  HIGH: {
    android: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
      audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 256000,
    },
    ios: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
      audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 256000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  },
};
