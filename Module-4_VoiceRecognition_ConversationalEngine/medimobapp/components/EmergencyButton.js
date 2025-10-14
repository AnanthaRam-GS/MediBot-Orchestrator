// ============================================================================
// EMERGENCY BUTTON COMPONENT
// Always visible on all screens, triggers emergency appointment with priority
// ============================================================================

import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { COLORS, SHADOWS, SPACING } from '../styles/theme';
import { bookEmergencyAppointment } from '../services/appointmentService';

const EmergencyButton = ({ patientId, patientName, onEmergencyBooked }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  // Pulse animation for emergency button
  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    
    return () => pulse.stop();
  }, []);

  const handleEmergency = async () => {
    Alert.alert(
      '🚨 Emergency Appointment',
      'Are you experiencing a medical emergency? This will prioritize you in the queue.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, Emergency',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              const result = await bookEmergencyAppointment({
                patientId,
                patientName,
                reason: 'Emergency - Immediate attention required',
              });

              if (result.success) {
                Alert.alert(
                  '✅ Emergency Registered',
                  `You have been prioritized in the queue.\nQueue Position: ${result.queuePosition}\nPlease wait at the emergency area.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        if (onEmergencyBooked) {
                          onEmergencyBooked(result);
                        }
                      },
                    },
                  ]
                );
              } else {
                throw new Error(result.message || 'Failed to register emergency');
              }
            } catch (error) {
              Alert.alert(
                '❌ Error',
                `Failed to register emergency: ${error.message}\nPlease inform staff immediately.`
              );
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      <TouchableOpacity
        style={styles.button}
        onPress={handleEmergency}
        disabled={isProcessing || !patientId}
        activeOpacity={0.8}
      >
        {isProcessing ? (
          <ActivityIndicator size="large" color="#FFF" />
        ) : (
          <>
            <Text style={styles.icon}>🚨</Text>
            <Text style={styles.text}>EMERGENCY</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.xl,
    zIndex: 1000,
  },
  button: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.emergency,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
  },
  icon: {
    fontSize: 36,
    marginBottom: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
});

export default EmergencyButton;
