// AudioMessage.tsx - Enhanced audio message component
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { StaticWaveformVisualizer } from './WaveformVisualizer';
import { formatAudioDuration, generateWaveformData } from './audioUtils';

interface AudioMessageProps {
  audioUrl: string;
  duration?: number;
  isMe?: boolean;
  style?: any;
}

const AudioMessage: React.FC<AudioMessageProps> = ({
  audioUrl,
  duration: propDuration,
  isMe = false,
  style,
}) => {
  const theme = useTheme() as any;
  const COLORS = theme?.COLORS || {};
  
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const duration = propDuration || 30; // Default to 30 seconds if no duration provided

  useEffect(() => {
    const waveform = generateWaveformData(duration, 40);
    setWaveformData(waveform);
    
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [duration, sound]);

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        if (sound) {
          await sound.pauseAsync();
          setIsPlaying(false);
        }
      } else {
        setIsLoading(true);
        
        // Always create a fresh sound object for reliable playback
        if (sound) {
          try {
            await sound.unloadAsync();
          } catch (e) {
            // Ignore unload errors
          }
          setSound(null);
        }
        
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true }
        );
        setSound(newSound);
        
        newSound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isLoaded) {
            setCurrentTime(status.positionMillis ? status.positionMillis / 1000 : 0);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setCurrentTime(0);
              // Unload the sound after it finishes to free memory
              newSound.unloadAsync().catch(() => {});
              setSound(null);
            }
          }
        });
        
        setIsPlaying(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsLoading(false);
      setIsPlaying(false);
      // Clean up on error
      if (sound) {
        try {
          await sound.unloadAsync();
        } catch (e) {
          // Ignore unload errors
        }
        setSound(null);
      }
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: isMe 
          ? COLORS.primary || '#007AFF'
          : COLORS.cardBackground || '#F2F2F7',
      },
      style,
    ]}>
      <TouchableOpacity
        style={[
          styles.playButton,
          {
            backgroundColor: isMe 
              ? 'rgba(255,255,255,0.2)'
              : COLORS.primary || '#007AFF',
          },
        ]}
        onPress={handlePlayPause}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={COLORS.white || '#FFF'}
          />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={20}
            color={COLORS.white || '#FFF'}
          />
        )}
      </TouchableOpacity>

      <View style={styles.audioContent}>
        <StaticWaveformVisualizer
          data={waveformData}
          width={180}
          height={30}
          progress={progress}
          color={isMe ? 'rgba(255,255,255,0.5)' : COLORS.textSecondary || '#666'}
          activeColor={isMe ? COLORS.white || '#FFF' : COLORS.primary || '#007AFF'}
        />
        
        <Text style={[
          styles.timeText,
          { color: isMe ? COLORS.white || '#FFF' : COLORS.textDark || '#000' }
        ]}>
          {formatAudioDuration(currentTime)} / {formatAudioDuration(duration)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    maxWidth: 280,
    minWidth: 200,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  audioContent: {
    flex: 1,
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default AudioMessage;
