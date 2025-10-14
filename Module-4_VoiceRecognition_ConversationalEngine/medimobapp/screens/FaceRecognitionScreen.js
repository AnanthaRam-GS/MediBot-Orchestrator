// ============================================================================
// FACE RECOGNITION SCREEN - MODERN UI
// First screen - Captures face and recognizes patient with enhanced design
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
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
import { performFaceRecognition } from '../services/faceRecognitionService';

const { width, height } = Dimensions.get('window');

const FaceRecognitionScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const cameraRef = useRef(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
    
    // Start entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: ANIMATIONS.timing.normal,
      useNativeDriver: true,
    }).start();
    
    // Start pulsing animation for face guide
    Animated.loop(
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
    ).start();
  }, []);

  const handleCaptureFace = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }

    try {
      setIsProcessing(true);

      // Capture photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      setCapturedImage(photo.uri);

      // Perform face recognition
      const result = await performFaceRecognition(photo.uri);

      if (result.success && result.recognized) {
        // Patient recognized - navigate to welcome screen
        navigation.navigate('Welcome', {
          patient: result.patient,
        });
      } else {
        // Patient not recognized - ask to register or continue as guest
        Alert.alert(
          'Face Not Recognized',
          'Would you like to register as a new patient or continue as guest?',
          [
            {
              text: 'Try Again',
              onPress: () => {
                setCapturedImage(null);
                setIsProcessing(false);
              },
              style: 'cancel',
            },
            {
              text: 'Register',
              onPress: () => {
                navigation.navigate('Registration', {
                  capturedImage: photo.uri,
                });
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', `Failed to capture face: ${error.message}`);
      setCapturedImage(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Face Recognition',
      'Would you like to register or continue as guest?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Register',
          onPress: () => navigation.navigate('Registration'),
        },
        {
          text: 'Continue as Guest',
          onPress: () => navigation.navigate('ModeSelection', { patient: null }),
        },
      ]
    );
  };

  if (!permission) {
    return (
      <View style={commonStyles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Requesting camera permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={commonStyles.centerContainer}>
        <ExpoLinearGradient
          colors={COLORS.backgroundGradient}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need access to your camera for face recognition check-in
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <ExpoLinearGradient
              colors={COLORS.primaryGradient}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Grant Access</Text>
            </ExpoLinearGradient>
          </TouchableOpacity>
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
          style={[styles.contentContainer, { opacity: fadeAnim }]}
        >
          {/* Modern Header */}
          <View style={styles.headerSection}>
            <View style={styles.headerIcon}>
              <ExpoLinearGradient
                colors={COLORS.primaryGradient}
                style={styles.iconGradient}
              >
                <Text style={styles.headerEmoji}>🏥</Text>
              </ExpoLinearGradient>
            </View>
            <Text style={styles.title}>Medi Assist</Text>
            <Text style={styles.subtitle}>Face Recognition Check-in</Text>
          </View>

          {/* Camera Section with Modern Frame */}
          <View style={styles.cameraSection}>
            {capturedImage ? (
              <View style={styles.capturedContainer}>
                <Image source={{ uri: capturedImage }} style={styles.capturedImage} />
                <View style={styles.capturedOverlay}>
                  <ExpoLinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.3)']}
                    style={styles.overlayGradient}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.cameraContainer}>
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  facing="front"
                />
                {/* Modern Face Guide */}
                <Animated.View 
                  style={[
                    styles.faceGuideContainer,
                    { transform: [{ scale: pulseAnim }] }
                  ]}
                >
                  <View style={styles.faceGuide}>
                    <View style={styles.cornerTL} />
                    <View style={styles.cornerTR} />
                    <View style={styles.cornerBL} />
                    <View style={styles.cornerBR} />
                  </View>
                </Animated.View>
                <Text style={styles.guideText}>Position your face here</Text>
              </View>
            )}
          </View>

          {/* Modern Instructions Card */}
          <View style={styles.instructionsCard}>
            <View style={styles.instructionHeader}>
              <View style={styles.instructionIcon}>
                <Text style={styles.instructionEmoji}>📸</Text>
              </View>
              <Text style={styles.instructionTitle}>Quick Instructions</Text>
            </View>
            <View style={styles.instructionsList}>
              {[
                'Position your face in the frame',
                'Look directly at the camera',
                'Ensure good lighting',
                'Tap "Scan Face" when ready'
              ].map((instruction, index) => (
                <View key={index} style={styles.instructionItem}>
                  <View style={styles.instructionNumber}>
                    <Text style={styles.numberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.instructionText}>{instruction}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Processing or Action Buttons */}
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <View style={styles.processingCard}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.processingText}>Recognizing your face...</Text>
                <Text style={styles.processingSubtext}>Please wait a moment</Text>
              </View>
            </View>
          ) : (
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleCaptureFace}
                activeOpacity={0.8}
              >
                <ExpoLinearGradient
                  colors={COLORS.primaryGradient}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.primaryButtonText}>Scan Face</Text>
                  <Text style={styles.buttonIcon}>📷</Text>
                </ExpoLinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleSkip}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryButtonText}>Skip & Continue</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: height,
  },

  contentContainer: {
    flex: 1,
    padding: LAYOUT.container.padding,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: SPACING.sm,
  },

  subtitle: {
    ...TYPOGRAPHY.body1,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Camera Section
  cameraSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },

  cameraContainer: {
    position: 'relative',
    borderRadius: LAYOUT.card.borderRadius + 8,
    overflow: 'hidden',
    ...SHADOWS.large,
  },

  camera: {
    width: Math.min(width - SPACING.huge, 400),
    height: Math.min(width - SPACING.huge, 400),
  },

  faceGuideContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
  },

  faceGuide: {
    width: Math.min(width * 0.6, height * 0.4, 250), // Responsive size
    height: Math.min(width * 0.6, height * 0.4, 250), // Keep it square
    borderRadius: Math.min(width * 0.3, height * 0.2, 125), // Half the size for circle
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    position: 'relative',
  },

  cornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: COLORS.primary,
    borderTopLeftRadius: 125,
  },

  cornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: COLORS.primary,
    borderTopRightRadius: 125,
  },

  cornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: COLORS.primary,
    borderBottomLeftRadius: 125,
  },

  cornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: COLORS.primary,
    borderBottomRightRadius: 125,
  },

  guideText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    textAlign: 'center',
    position: 'absolute',
    bottom: -30,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },

  capturedContainer: {
    position: 'relative',
    borderRadius: LAYOUT.card.borderRadius + 8,
    overflow: 'hidden',
    ...SHADOWS.large,
  },

  capturedImage: {
    width: Math.min(width - SPACING.huge, 400),
    height: Math.min(width - SPACING.huge, 400),
  },

  capturedOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  overlayGradient: {
    flex: 1,
  },

  // Instructions Card
  instructionsCard: {
    ...COMPONENT_STYLES.card.primary,
    width: '100%',
    maxWidth: 500,
    marginBottom: SPACING.xl,
  },

  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },

  instructionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },

  instructionEmoji: {
    fontSize: 20,
  },

  instructionTitle: {
    ...TYPOGRAPHY.heading4,
    color: COLORS.textPrimary,
  },

  instructionsList: {
    gap: SPACING.md,
  },

  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },

  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  numberText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    fontWeight: '600',
  },

  instructionText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
    flex: 1,
  },

  // Buttons
  buttonsContainer: {
    gap: SPACING.lg,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },

  primaryButton: {
    borderRadius: LAYOUT.button.borderRadiusLarge,
    overflow: 'hidden',
    width: '100%',
    ...SHADOWS.primary,
  },

  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    gap: SPACING.md,
  },

  primaryButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.textLight,
  },

  buttonIcon: {
    fontSize: 20,
  },

  secondaryButton: {
    ...COMPONENT_STYLES.button.secondary,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.primary,
  },

  // Processing
  processingContainer: {
    width: '100%',
    alignItems: 'center',
  },

  processingCard: {
    ...COMPONENT_STYLES.card.primary,
    alignItems: 'center',
    gap: SPACING.lg,
    width: '100%',
    maxWidth: 400,
  },

  processingText: {
    ...TYPOGRAPHY.body1,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  processingSubtext: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Permission Screen
  permissionCard: {
    ...COMPONENT_STYLES.card.elevated,
    alignItems: 'center',
    maxWidth: 400,
    width: '90%',
    padding: SPACING.huge,
  },

  permissionTitle: {
    ...TYPOGRAPHY.heading3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },

  permissionText: {
    ...TYPOGRAPHY.body1,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },

  permissionButton: {
    borderRadius: LAYOUT.button.borderRadiusLarge,
    overflow: 'hidden',
    minWidth: 200,
  },

  loadingText: {
    ...TYPOGRAPHY.body1,
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
  },
});

export default FaceRecognitionScreen;