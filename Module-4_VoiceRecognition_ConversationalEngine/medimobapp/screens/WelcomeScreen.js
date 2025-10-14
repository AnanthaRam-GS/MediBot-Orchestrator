// ============================================================================
// WELCOME SCREEN
// Greets recognized patient and shows navigation options
// ============================================================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  LinearGradient,
} from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ route, navigation }) => {
  const { patient } = route.params || {};
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATIONS.timing.slow,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: ANIMATIONS.timing.normal,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-advance to mode selection after 5 seconds
    const timer = setTimeout(() => {
      navigation.navigate('ModeSelection', { patient });
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    // Exit animation before navigation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: ANIMATIONS.timing.fast,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: ANIMATIONS.timing.fast,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.navigate('ModeSelection', { patient });
    });
  };

  return (
    <View style={commonStyles.container}>
      {/* Background Gradient */}
      <ExpoLinearGradient
        colors={COLORS.backgroundGradient}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Main Content */}
      <View style={styles.mainContainer}>
        <Animated.View 
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim }
              ]
            }
          ]}
        >
          {/* Welcome Card with Glass Morphism */}
          <View style={styles.welcomeCard}>
            {/* Patient Avatar */}
            <View style={styles.avatarContainer}>
              <ExpoLinearGradient
                colors={COLORS.primaryGradient}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarText}>
                  {patient?.name ? patient.name.charAt(0).toUpperCase() : '👤'}
                </Text>
              </ExpoLinearGradient>
            </View>

            {/* Welcome Message */}
            <Text style={styles.welcomeTitle}>Welcome Back!</Text>
            <Text style={styles.patientName}>{patient?.name || 'Guest Patient'}</Text>
            
            {/* Patient Info */}
            <View style={styles.patientInfoContainer}>
              {patient?.id && (
                <View style={styles.infoChip}>
                  <Text style={styles.infoLabel}>ID: {patient.id}</Text>
                </View>
              )}
              
              {patient?.phone && (
                <View style={styles.infoChip}>
                  <Text style={styles.infoLabel}>📱 {patient.phone}</Text>
                </View>
              )}
            </View>
            
            
            {patient?.last_visit && (
              <View style={styles.infoChip}>
                <Text style={styles.infoLabel}>
                  Last Visit: {new Date(patient.last_visit).toLocaleDateString()}
                </Text>
              </View>
            )}

            {/* Continue Button */}
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <ExpoLinearGradient
                colors={COLORS.primaryGradient}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Continue</Text>
                <Text style={styles.buttonIcon}>➡️</Text>
              </ExpoLinearGradient>
            </TouchableOpacity>

            <Text style={styles.autoAdvanceText}>
              Auto-advancing in 5 seconds...
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Emergency Button - Fixed Position */}
      <View style={styles.emergencyContainer}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.container.padding,
  },
  
  contentContainer: {
    alignItems: 'center',
    maxWidth: LAYOUT.container.maxWidth,
    width: '100%',
  },

  welcomeCard: {
    ...COMPONENT_STYLES.card.elevated,
    backgroundColor: COLORS.cardBackground,
    borderRadius: LAYOUT.card.borderRadius + 8,
    padding: SPACING.huge,
    alignItems: 'center',
    minWidth: width > 768 ? 600 : '90%',
    maxWidth: 800,
    ...SHADOWS.large,
  },

  avatarContainer: {
    marginBottom: SPACING.xl,
  },

  avatarGradient: {
    width: width > 768 ? 140 : 120,
    height: width > 768 ? 140 : 120,
    borderRadius: width > 768 ? 70 : 60,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },

  avatarText: {
    fontSize: width > 768 ? 70 : 60,
    color: COLORS.textLight,
    fontWeight: '600',
  },

  welcomeTitle: {
    ...TYPOGRAPHY.heroTitle,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },

  patientName: {
    ...TYPOGRAPHY.heading2,
    color: COLORS.primary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
    fontWeight: '700',
  },

  patientInfoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },

  infoChip: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: LAYOUT.button.borderRadius,
    ...SHADOWS.subtle,
  },

  infoLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    fontWeight: '600',
  },

  continueButton: {
    borderRadius: LAYOUT.button.borderRadiusLarge,
    overflow: 'hidden',
    marginTop: SPACING.xl,
    minWidth: width > 768 ? 280 : 240,
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

  buttonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.textLight,
    fontSize: width > 768 ? 20 : 18,
  },

  buttonIcon: {
    fontSize: width > 768 ? 24 : 20,
  },

  autoAdvanceText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: SPACING.lg,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  emergencyContainer: {
    position: 'absolute',
    top: SPACING.xl,
    right: SPACING.xl,
    zIndex: 10,
  },
});

export default WelcomeScreen;
