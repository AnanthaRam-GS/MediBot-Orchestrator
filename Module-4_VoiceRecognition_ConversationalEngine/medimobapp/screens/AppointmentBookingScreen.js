// ============================================================================
// APPOINTMENT BOOKING SCREEN (Voice-Based) - MODERN UI
// Records voice, extracts appointment details, books with doctor with enhanced design
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { 
  commonStyles, 
  COLORS, 
  SPACING, 
  TYPOGRAPHY,
  LAYOUT,
  SHADOWS,
  COMPONENT_STYLES,
  ANIMATIONS
} from '../styles/theme';
import EmergencyButton from '../components/EmergencyButton';
import { createRecording } from '../utils/audioUtils';
import { voiceBasedBooking } from '../services/appointmentService';

const { width, height } = Dimensions.get('window');

const AppointmentBookingScreen = ({ route, navigation }) => {
  const { patient } = route.params || {};
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recording, setRecording] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [bookingDetails, setBookingDetails] = useState(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATIONS.timing.normal,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: ANIMATIONS.timing.normal,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    // Pulsing animation for recording indicator
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const handleStartRecording = async () => {
    try {
      // Clean up any existing recording first
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (e) {
          console.log('Error cleaning up previous recording:', e);
        }
        setRecording(null);
      }

      setIsRecording(true);
      setTranscription('');
      setBookingDetails(null);

      const rec = await createRecording();
      await rec.startAsync(); // Start recording immediately
      setRecording(rec);
    } catch (error) {
      Alert.alert('Error', `Failed to start recording: ${error.message}`);
      setIsRecording(false);
      setRecording(null);
    }
  };

  const handleStopRecording = async () => {
    if (!recording) {
      Alert.alert('Error', 'No active recording found');
      return;
    }

    try {
      setIsRecording(false);
      setIsProcessing(true);

      // Stop recording and get audio URI
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        throw new Error('Failed to get recording URI');
      }

      console.log('Appointment Recording URI:', uri);

      // Process voice input and book appointment
      const result = await voiceBasedBooking(uri, patient);

      if (result.success) {
        setTranscription(result.transcription);
        setBookingDetails(result);

        // Show success and navigate to queue status
        Alert.alert(
          '✅ Appointment Booked!',
          `Doctor: ${result.doctor.name}\nSpecialty: ${result.doctor.specialty}\nQueue Position: ${result.queuePosition}\n\nPlease wait in the seating area.`,
          [
            {
              text: 'View Queue',
              onPress: () => {
                navigation.navigate('QueueStatus', {
                  patient,
                  appointment: result.appointment,
                  doctor: result.doctor,
                });
              },
            },
          ]
        );
      } else {
        // Handle duplicate appointment error specially
        if (result.isDuplicate) {
          Alert.alert(
            '⚠️ Existing Appointment Found', 
            result.error + '\n\nWould you like to view your current queue position?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'View Queue',
                onPress: () => {
                  // Navigate to queue status with existing appointment info
                  navigation.navigate('QueueStatus', { 
                    patient,
                    appointment: result.existingAppointment,
                    doctor: { id: result.existingAppointment?.doctor_id }
                  });
                }
              }
            ]
          );
        } else {
          Alert.alert('Error', `Failed to book appointment: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Appointment booking error:', error);
      Alert.alert('Error', `Failed to process booking: ${error.message}`);
    } finally {
      // Clean up recording object
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (e) {
          console.log('Error unloading recording:', e);
        }
      }
      setIsProcessing(false);
      setRecording(null);
    }
  };

  if (!patient) {
    return (
      <View style={commonStyles.container}>
        <ExpoLinearGradient
          colors={COLORS.backgroundGradient}
          style={StyleSheet.absoluteFill}
        />
        <View style={commonStyles.centerContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>❌</Text>
            <Text style={styles.errorTitle}>Patient Required</Text>
            <Text style={styles.errorText}>Please complete face recognition first</Text>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => navigation.navigate('FaceRecognition')}
            >
              <ExpoLinearGradient
                colors={COLORS.primaryGradient}
                style={styles.buttonGradient}
              >
                <Text style={styles.errorButtonText}>Go to Check-in</Text>
              </ExpoLinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      {/* Background Gradient */}
      <ExpoLinearGradient
        colors={COLORS.backgroundGradient}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.contentContainer,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Modern Header */}
          <View style={styles.headerSection}>
            <View style={styles.headerIcon}>
              <ExpoLinearGradient
                colors={COLORS.primaryGradient}
                style={styles.iconGradient}
              >
                <Text style={styles.headerEmoji}>📅</Text>
              </ExpoLinearGradient>
            </View>
            <Text style={styles.title}>Voice Appointment Booking</Text>
            <Text style={styles.subtitle}>
              Tell us your health concern and we'll match you with the right doctor
            </Text>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{patient.name}</Text>
              <View style={styles.patientBadge}>
                <Text style={styles.badgeText}>✓ Verified Patient</Text>
              </View>
            </View>
          </View>

          {/* Enhanced Instructions */}
          <View style={styles.instructionsCard}>
            <View style={styles.instructionHeader}>
              <View style={styles.instructionIconContainer}>
                <Text style={styles.instructionEmoji}>🎤</Text>
              </View>
              <Text style={styles.instructionTitle}>How it works</Text>
            </View>
            
            <View style={styles.instructionsList}>
              {[
                { 
                  step: 1, 
                  title: 'Start Recording', 
                  desc: 'Tap the microphone and speak clearly' 
                },
                { 
                  step: 2, 
                  title: 'Describe Your Needs', 
                  desc: 'Tell us your symptoms, preferred specialty, or doctor' 
                },
                { 
                  step: 3, 
                  title: 'Stop & Process', 
                  desc: 'We\'ll find the best available doctor for you' 
                },
                { 
                  step: 4, 
                  title: 'Get Confirmation', 
                  desc: 'Receive your appointment details and queue position' 
                }
              ].map((item, index) => (
                <View key={index} style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepText}>{item.step}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{item.title}</Text>
                    <Text style={styles.stepDescription}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Recording Status */}
          {isRecording && (
            <Animated.View 
              style={[
                styles.recordingIndicator,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <ExpoLinearGradient
                colors={['#FF6B6B', '#FF8E53']}
                style={styles.recordingGradient}
              >
                <View style={styles.recordingContent}>
                  <View style={styles.pulsingDot} />
                  <Text style={styles.recordingText}>Recording... Speak now</Text>
                </View>
                <View style={styles.waveforms}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <View key={i} style={styles.waveBar} />
                  ))}
                </View>
              </ExpoLinearGradient>
            </Animated.View>
          )}

          {isProcessing && (
            <View style={styles.processingCard}>
              <View style={styles.processingHeader}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.processingTitle}>Processing Your Request</Text>
              </View>
              <Text style={styles.processingText}>
                Analyzing speech and finding the best doctor match...
              </Text>
              <View style={styles.processingSteps}>
                <Text style={styles.processingStep}>• Converting speech to text</Text>
                <Text style={styles.processingStep}>• Extracting medical keywords</Text>
                <Text style={styles.processingStep}>• Matching with available doctors</Text>
                <Text style={styles.processingStep}>• Booking appointment slot</Text>
              </View>
            </View>
          )}

          {/* Transcription */}
          {transcription && (
            <View style={styles.transcriptionCard}>
              <View style={styles.cardHeaderWithIcon}>
                <View style={styles.cardIconContainer}>
                  <Text style={styles.cardIcon}>📝</Text>
                </View>
                <Text style={styles.cardTitle}>What you said</Text>
              </View>
              <View style={styles.transcriptionContent}>
                <Text style={styles.transcriptionText}>"{transcription}"</Text>
              </View>
            </View>
          )}

          {/* Booking Details */}
          {bookingDetails && (
            <View style={styles.successCard}>
              <View style={styles.successHeader}>
                <View style={styles.successIconContainer}>
                  <Text style={styles.successIcon}>✅</Text>
                </View>
                <Text style={styles.successTitle}>Appointment Confirmed!</Text>
              </View>
              
              <View style={styles.bookingDetailsContent}>
                <View style={styles.doctorCard}>
                  <Text style={styles.doctorName}>{bookingDetails.doctor.name}</Text>
                  <Text style={styles.doctorSpecialty}>{bookingDetails.doctor.specialty}</Text>
                </View>
                
                <View style={styles.queueInfo}>
                  <View style={styles.queuePosition}>
                    <Text style={styles.queueNumber}>#{bookingDetails.queuePosition}</Text>
                    <Text style={styles.queueLabel}>Queue Position</Text>
                  </View>
                  <View style={styles.estimatedTime}>
                    <Text style={styles.timeNumber}>~{(bookingDetails.queuePosition - 1) * 15} min</Text>
                    <Text style={styles.timeLabel}>Estimated Wait</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Recording Controls */}
          <View style={styles.controlsContainer}>
            {!isRecording && !isProcessing && (
              <TouchableOpacity
                style={styles.recordButton}
                onPress={handleStartRecording}
                activeOpacity={0.9}
              >
                <ExpoLinearGradient
                  colors={COLORS.primaryGradient}
                  style={styles.recordButtonGradient}
                >
                  <View style={styles.microphoneIcon}>
                    <Text style={styles.micIcon}>🎤</Text>
                  </View>
                  <Text style={styles.recordButtonText}>Start Recording</Text>
                  <Text style={styles.recordButtonSubtext}>Tap to begin</Text>
                </ExpoLinearGradient>
              </TouchableOpacity>
            )}

            {isRecording && (
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStopRecording}
                activeOpacity={0.9}
              >
                <ExpoLinearGradient
                  colors={['#FF6B6B', '#FF8E53']}
                  style={styles.stopButtonGradient}
                >
                  <View style={styles.stopIcon}>
                    <View style={styles.stopSquare} />
                  </View>
                  <Text style={styles.stopButtonText}>Stop Recording</Text>
                  <Text style={styles.stopButtonSubtext}>Tap when finished</Text>
                </ExpoLinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Navigation */}
          {!isRecording && !isProcessing && (
            <View style={styles.navigationContainer}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Text style={styles.backButtonText}>← Back to Mode Selection</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Emergency Button */}
      <EmergencyButton
        patientId={patient?.id}
        patientName={patient?.name}
        onEmergencyBooked={(result) => {
          navigation.navigate('QueueStatus', {
            patient,
            appointment: result.appointment,
          });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120, // Account for emergency button
  },

  contentContainer: {
    flex: 1,
    padding: LAYOUT.container.padding,
    minHeight: height - 100,
  },

  // Header Section
  headerSection: {
    alignItems: 'center',
    marginBottom: SPACING.huge,
  },

  headerIcon: {
    marginBottom: SPACING.lg,
  },

  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },

  headerEmoji: {
    fontSize: 40,
  },

  title: {
    ...TYPOGRAPHY.heroTitle,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },

  subtitle: {
    ...TYPOGRAPHY.body1,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
    maxWidth: 400,
  },

  patientInfo: {
    alignItems: 'center',
    gap: SPACING.sm,
  },

  patientName: {
    ...TYPOGRAPHY.heading3,
    color: COLORS.primary,
  },

  patientBadge: {
    backgroundColor: COLORS.successLight,
    borderColor: COLORS.success,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 15,
  },

  badgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    fontWeight: '600',
  },
  // Instructions Card
  instructionsCard: {
    ...COMPONENT_STYLES.card.elevated,
    marginBottom: SPACING.xl,
  },

  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },

  instructionIconContainer: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },

  instructionEmoji: {
    fontSize: 24,
  },

  instructionTitle: {
    ...TYPOGRAPHY.heading3,
    color: COLORS.textPrimary,
  },

  instructionsList: {
    gap: SPACING.lg,
  },

  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },

  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  stepText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    fontWeight: '700',
  },

  stepContent: {
    flex: 1,
  },

  stepTitle: {
    ...TYPOGRAPHY.body1,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },

  stepDescription: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  // Recording Status
  recordingIndicator: {
    marginVertical: SPACING.xl,
    borderRadius: LAYOUT.card.borderRadius + 8,
    overflow: 'hidden',
    ...SHADOWS.large,
  },

  recordingGradient: {
    padding: SPACING.xl,
  },

  recordingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },

  pulsingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.textLight,
    marginRight: SPACING.md,
  },

  recordingText: {
    ...TYPOGRAPHY.heading3,
    color: COLORS.textLight,
  },

  waveforms: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
  },

  waveBar: {
    width: 4,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 2,
  },
  // Processing Card
  processingCard: {
    ...COMPONENT_STYLES.card.primary,
    marginVertical: SPACING.xl,
    alignItems: 'center',
  },

  processingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },

  processingTitle: {
    ...TYPOGRAPHY.heading3,
    color: COLORS.textPrimary,
  },

  processingText: {
    ...TYPOGRAPHY.body1,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },

  processingSteps: {
    alignSelf: 'stretch',
    gap: SPACING.sm,
  },

  processingStep: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
  },
  // Cards
  transcriptionCard: {
    ...COMPONENT_STYLES.card.primary,
    marginVertical: SPACING.lg,
  },

  cardHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },

  cardIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },

  cardIcon: {
    fontSize: 20,
  },

  cardTitle: {
    ...TYPOGRAPHY.heading4,
    color: COLORS.textPrimary,
  },

  transcriptionContent: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: LAYOUT.card.borderRadius,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },

  transcriptionText: {
    ...TYPOGRAPHY.body1,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
    lineHeight: 24,
  },

  // Success Card
  successCard: {
    ...COMPONENT_STYLES.card.elevated,
    marginVertical: SPACING.lg,
    borderColor: COLORS.success,
    borderWidth: 2,
  },

  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },

  successIconContainer: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.successLight,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },

  successIcon: {
    fontSize: 24,
  },

  successTitle: {
    ...TYPOGRAPHY.heading3,
    color: COLORS.success,
  },

  bookingDetailsContent: {
    gap: SPACING.lg,
  },

  doctorCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: LAYOUT.card.borderRadius,
    padding: SPACING.lg,
    alignItems: 'center',
  },

  doctorName: {
    ...TYPOGRAPHY.heading4,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },

  doctorSpecialty: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
  },

  queueInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  queuePosition: {
    alignItems: 'center',
  },

  queueNumber: {
    ...TYPOGRAPHY.display,
    color: COLORS.primary,
    fontSize: 36,
  },

  queueLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  estimatedTime: {
    alignItems: 'center',
  },

  timeNumber: {
    ...TYPOGRAPHY.heading2,
    color: COLORS.secondary,
  },

  timeLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  // Controls
  controlsContainer: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },

  recordButton: {
    borderRadius: LAYOUT.button.borderRadiusLarge,
    overflow: 'hidden',
    width: Math.min(width * 0.8, 400),
    ...SHADOWS.large,
  },

  recordButtonGradient: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },

  microphoneIcon: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },

  micIcon: {
    fontSize: 40,
  },

  recordButtonText: {
    ...TYPOGRAPHY.heading2,
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },

  recordButtonSubtext: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textLight,
    opacity: 0.8,
  },

  stopButton: {
    borderRadius: LAYOUT.button.borderRadiusLarge,
    overflow: 'hidden',
    width: Math.min(width * 0.8, 400),
    ...SHADOWS.large,
  },

  stopButtonGradient: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },

  stopIcon: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },

  stopSquare: {
    width: 24,
    height: 24,
    backgroundColor: COLORS.textLight,
    borderRadius: 4,
  },

  stopButtonText: {
    ...TYPOGRAPHY.heading2,
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },

  stopButtonSubtext: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textLight,
    opacity: 0.8,
  },

  // Navigation
  navigationContainer: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },

  backButton: {
    padding: SPACING.md,
  },

  backButtonText: {
    ...TYPOGRAPHY.body1,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Error State
  errorCard: {
    ...COMPONENT_STYLES.card.elevated,
    alignItems: 'center',
    maxWidth: 400,
    width: '90%',
    padding: SPACING.huge,
  },

  errorIcon: {
    fontSize: 60,
    marginBottom: SPACING.lg,
  },

  errorTitle: {
    ...TYPOGRAPHY.heading2,
    color: COLORS.error,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },

  errorText: {
    ...TYPOGRAPHY.body1,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },

  errorButton: {
    borderRadius: LAYOUT.button.borderRadiusLarge,
    overflow: 'hidden',
    minWidth: 200,
  },

  buttonGradient: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    alignItems: 'center',
  },

  errorButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.textLight,
  },
});

export default AppointmentBookingScreen;
