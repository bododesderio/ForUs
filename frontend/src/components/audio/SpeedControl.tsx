// SpeedControl.tsx - Playback speed control component
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Ionicons from '@expo/vector-icons/Ionicons';

interface SpeedControlProps {
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
  speeds?: number[];
  style?: any;
}

const SpeedControl: React.FC<SpeedControlProps> = ({
  currentSpeed,
  onSpeedChange,
  speeds = [0.5, 0.75, 1, 1.25, 1.5, 2],
  style,
}) => {
  const theme = useTheme() as any;
  const COLORS = theme?.COLORS || {};
  const [showModal, setShowModal] = useState(false);

  const handleSpeedSelect = (speed: number) => {
    onSpeedChange(speed);
    setShowModal(false);
  };

  const formatSpeed = (speed: number) => {
    return speed === 1 ? '1x' : `${speed}x`;
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[
          styles.speedButton,
          { backgroundColor: COLORS.cardBackground || '#F2F2F7' },
        ]}
        onPress={() => setShowModal(true)}
      >
        <Text
          style={[
            styles.speedText,
            { color: COLORS.textDark || '#000' },
          ]}
        >
          {formatSpeed(currentSpeed)}
        </Text>
        <Ionicons
          name="chevron-down"
          size={12}
          color={COLORS.textSecondary || '#666'}
        />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View
            style={[
              styles.speedModal,
              { backgroundColor: COLORS.cardBackground || '#FFF' },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: COLORS.textDark || '#000' },
              ]}
            >
              Playback Speed
            </Text>
            
            {speeds.map((speed) => (
              <TouchableOpacity
                key={speed}
                style={[
                  styles.speedOption,
                  currentSpeed === speed && {
                    backgroundColor: COLORS.primary || '#007AFF',
                  },
                ]}
                onPress={() => handleSpeedSelect(speed)}
              >
                <Text
                  style={[
                    styles.speedOptionText,
                    {
                      color:
                        currentSpeed === speed
                          ? COLORS.white || '#FFF'
                          : COLORS.textDark || '#000',
                    },
                  ]}
                >
                  {formatSpeed(speed)}
                </Text>
                {currentSpeed === speed && (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={COLORS.white || '#FFF'}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  speedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 40,
    justifyContent: 'center',
  },
  speedText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedModal: {
    borderRadius: 12,
    padding: 16,
    minWidth: 150,
    maxWidth: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  speedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 2,
  },
  speedOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SpeedControl;
