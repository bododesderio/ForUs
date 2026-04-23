// AudioProgressBar.tsx - Custom audio progress bar with scrubbing
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTheme } from '../../context/ThemeContext';

interface AudioProgressBarProps {
  progress: number; // 0-100
  duration: number; // in seconds
  currentTime: number; // in seconds
  onSeek?: (value: number) => void;
  onSlidingStart?: () => void;
  onSlidingComplete?: (value: number) => void;
  disabled?: boolean;
  height?: number;
  style?: any;
}

const AudioProgressBar: React.FC<AudioProgressBarProps> = ({
  progress,
  duration,
  currentTime,
  onSeek,
  onSlidingStart,
  onSlidingComplete,
  disabled = false,
  height = 4,
  style,
}) => {
  const theme = useTheme() as any;
  const COLORS = theme?.COLORS || {};

  const handleValueChange = (value: number) => {
    if (onSeek && !disabled) {
      onSeek(value);
    }
  };

  const handleSlidingStart = () => {
    if (onSlidingStart && !disabled) {
      onSlidingStart();
    }
  };

  const handleSlidingComplete = (value: number) => {
    if (onSlidingComplete && !disabled) {
      onSlidingComplete(value);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Slider
        style={[styles.slider, { height: height + 20 }]}
        minimumValue={0}
        maximumValue={duration}
        value={currentTime}
        onValueChange={handleValueChange}
        onSlidingStart={handleSlidingStart}
        onSlidingComplete={handleSlidingComplete}
        disabled={disabled}
        minimumTrackTintColor={COLORS.primary || '#007AFF'}
        maximumTrackTintColor={COLORS.textSecondary || '#C7C7CC'}
        thumbTintColor={COLORS.primary || '#007AFF'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  slider: {
    width: '100%',
  },
  thumb: {
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  track: {
    backgroundColor: '#C7C7CC',
  },
});

export default AudioProgressBar;
