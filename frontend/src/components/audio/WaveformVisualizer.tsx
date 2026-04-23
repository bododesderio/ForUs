// WaveformVisualizer.tsx - Animated waveform visualization component
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';

interface WaveformVisualizerProps {
  data: number[];
  isAnimated?: boolean;
  height?: number;
  width?: number;
  barWidth?: number;
  barSpacing?: number;
  color?: string;
  activeColor?: string;
  progress?: number; // 0-100 for playback progress
  style?: any;
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  data = [],
  isAnimated = false,
  height = 40,
  width = 200,
  barWidth = 3,
  barSpacing = 1,
  color,
  activeColor,
  progress = 0,
  style,
}) => {
  const theme = useTheme() as any;
  const COLORS = theme?.COLORS || {};
  const animatedValues = useRef<Animated.Value[]>([]);

  // Default colors
  const defaultColor = color || COLORS.textSecondary || '#666';
  const defaultActiveColor = activeColor || COLORS.primary || '#007AFF';

  // Initialize animated values
  useEffect(() => {
    animatedValues.current = data.map(() => new Animated.Value(0));
  }, [data.length]);

  // Animate bars when data changes
  useEffect(() => {
    if (isAnimated && animatedValues.current.length > 0) {
      const animations = data.map((amplitude, index) => {
        return Animated.timing(animatedValues.current[index], {
          toValue: amplitude,
          duration: 150,
          useNativeDriver: false,
        });
      });

      Animated.stagger(50, animations).start();
    } else {
      // Set values immediately without animation
      data.forEach((amplitude, index) => {
        if (animatedValues.current[index]) {
          animatedValues.current[index].setValue(amplitude);
        }
      });
    }
  }, [data, isAnimated]);

  const totalBarWidth = barWidth + barSpacing;
  const maxBars = Math.floor(width / totalBarWidth);
  const displayData = data.slice(0, maxBars);

  // Calculate which bars should be active based on progress
  const activeBarCount = Math.floor((progress / 100) * displayData.length);

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Svg width={width} height={height}>
        {displayData.map((amplitude, index) => {
          const isActive = index < activeBarCount;
          const barHeight = Math.max(2, amplitude * height);
          const x = index * totalBarWidth;
          const y = (height - barHeight) / 2;

          return (
            <Rect
              key={index}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={isActive ? defaultActiveColor : defaultColor}
              rx={barWidth / 2}
              ry={barWidth / 2}
            />
          );
        })}
      </Svg>
    </View>
  );
};

// Animated version for recording
export const AnimatedWaveformVisualizer: React.FC<WaveformVisualizerProps> = (props) => {
  return <WaveformVisualizer {...props} isAnimated={true} />;
};

// Static version for messages
export const StaticWaveformVisualizer: React.FC<WaveformVisualizerProps> = (props) => {
  return <WaveformVisualizer {...props} isAnimated={false} />;
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WaveformVisualizer;
