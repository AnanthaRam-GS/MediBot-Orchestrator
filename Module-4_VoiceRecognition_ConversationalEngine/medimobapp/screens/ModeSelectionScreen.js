// ============================================================================
// MODE SELECTION SCREEN - MODERN UI
// Patient chooses: Appointment Booking or General Query with enhanced design
// ============================================================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
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

const { width, height } = Dimensions.get('window');

const ModeSelectionScreen = ({ route, navigation }) => {
  const { patient } = route.params || {};
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
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

  const handleAppointmentMode = () => {
    navigation.navigate('AppointmentBooking', { patient });
  };

  const handleQueryMode = () => {
    navigation.navigate('Query', { patient });
  };

  const handleManualAppointment = () => {
    navigation.navigate('ManualAppointment', { patient });
  };

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
                <Text style={styles.headerEmoji}>🏥</Text>
              </ExpoLinearGradient>
            </View>
            <Text style={styles.title}>How can we help you today?</Text>
            <Text style={styles.subtitle}>
              {patient ? `Welcome ${patient.name}, please select an option` : 'Please select an option'}
            </Text>
            {patient && (
              <View style={styles.patientChip}>
                <Text style={styles.chipText}>✓ Recognized Patient</Text>
              </View>
            )}
          </View>

          {/* Enhanced Mode Cards */}
          <View style={styles.modesContainer}>
            {/* Appointment Mode */}
            <TouchableOpacity
              style={styles.modeCardContainer}
              onPress={handleAppointmentMode}
              activeOpacity={0.9}
            >
              <ExpoLinearGradient
                colors={COLORS.primaryGradient}
                style={styles.modeCard}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.modeIconContainer}>
                    <Text style={styles.modeIcon}>📅</Text>
                  </View>
                  <View style={styles.cardBadge}>
                    <Text style={styles.badgeText}>Voice AI</Text>
                  </View>
                </View>
                <Text style={styles.modeTitle}>Book Appointment</Text>
                <Text style={styles.modeDescription}>
                  Schedule a doctor consultation with intelligent voice assistance
                </Text>
                <View style={styles.cardFeatures}>
                  <Text style={styles.featureText}>• Smart doctor matching</Text>
                  <Text style={styles.featureText}>• Multi-language support</Text>
                  <Text style={styles.featureText}>• Instant confirmation</Text>
                </View>
              </ExpoLinearGradient>
            </TouchableOpacity>

            {/* Query Mode */}
            <TouchableOpacity
              style={styles.modeCardContainer}
              onPress={handleQueryMode}
              activeOpacity={0.9}
            >
              <ExpoLinearGradient
                colors={COLORS.secondaryGradient}
                style={styles.modeCard}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.modeIconContainer}>
                    <Text style={styles.modeIcon}>💬</Text>
                  </View>
                  <View style={styles.cardBadge}>
                    <Text style={styles.badgeText}>AI Chat</Text>
                  </View>
                </View>
                <Text style={styles.modeTitle}>Ask a Question</Text>
                <Text style={styles.modeDescription}>
                  Get information about doctors, services, or health queries
                </Text>
                <View style={styles.cardFeatures}>
                  <Text style={styles.featureText}>• Doctor information</Text>
                  <Text style={styles.featureText}>• Service details</Text>
                  <Text style={styles.featureText}>• Health guidance</Text>
                </View>
              </ExpoLinearGradient>
            </TouchableOpacity>
          </View>

          {/* Alternative Options */}
          <View style={styles.alternativeSection}>
            <Text style={styles.alternativeTitle}>Other Options</Text>
            
            {/* Manual Appointment */}
            <TouchableOpacity
              style={styles.alternativeButton}
              onPress={handleManualAppointment}
              activeOpacity={0.8}
            >
              <View style={styles.alternativeIconContainer}>
                <Text style={styles.alternativeIcon}>📝</Text>
              </View>
              <View style={styles.alternativeContent}>
                <Text style={styles.alternativeButtonTitle}>Manual Form</Text>
                <Text style={styles.alternativeButtonDescription}>
                  Fill appointment details manually
                </Text>
              </View>
              <Text style={styles.alternativeArrow}>→</Text>
            </TouchableOpacity>

            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>← Back to Face Recognition</Text>
            </TouchableOpacity>
          </View>
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
    justifyContent: 'center',
    minHeight: height,
  },

  contentContainer: {
    flex: 1,
    padding: LAYOUT.container.padding,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: height - 100, // Account for emergency button
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
  },

  patientChip: {
    backgroundColor: COLORS.successLight,
    borderColor: COLORS.success,
    borderWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    marginTop: SPACING.md,
  },

  chipText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    fontWeight: '600',
  },

  // Mode Cards - Always horizontal, shorter height
  modesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
    width: '100%',
    paddingHorizontal: SPACING.md,
  },

  modeCardContainer: {
    flex: 1,
    borderRadius: LAYOUT.card.borderRadius + 8,
    overflow: 'hidden',
    ...SHADOWS.large,
    maxWidth: width * 0.45, // Ensure cards don't get too wide
  },

  modeCard: {
    flex: 1,
    minHeight: 280, // Reduced from 420 to make cards shorter
    padding: SPACING.lg, // Reduced padding
    justifyContent: 'space-between',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },

  modeIconContainer: {
    width: 60, // Reduced from 80
    height: 60, // Reduced from 80
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 30, // Reduced from 40
    justifyContent: 'center',
    alignItems: 'center',
  },

  modeIcon: {
    fontSize: 28, // Reduced from 40
  },

  cardBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 15,
  },

  badgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    fontWeight: '600',
  },

  modeTitle: {
    ...TYPOGRAPHY.heading3, // Smaller title
    color: COLORS.textLight,
    marginBottom: SPACING.sm, // Reduced margin
    textAlign: 'center',
  },

  modeDescription: {
    ...TYPOGRAPHY.body2, // Smaller description
    color: COLORS.textLight,
    opacity: 0.9,
    marginBottom: SPACING.md, // Reduced margin
    lineHeight: 20, // Reduced line height
    textAlign: 'center',
  },

  cardFeatures: {
    gap: SPACING.xs,
    alignItems: 'center', // Center the feature list
  },

  featureText: {
    ...TYPOGRAPHY.caption, // Smaller feature text
    color: COLORS.textLight,
    opacity: 0.8,
    textAlign: 'center',
  },

  // Alternative Options
  alternativeSection: {
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
  },

  alternativeTitle: {
    ...TYPOGRAPHY.heading4,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },

  alternativeButton: {
    ...COMPONENT_STYLES.card.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    width: '100%',
  },

  alternativeIconContainer: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.infoLight,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },

  alternativeIcon: {
    fontSize: 24,
  },

  alternativeContent: {
    flex: 1,
  },

  alternativeButtonTitle: {
    ...TYPOGRAPHY.body1,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },

  alternativeButtonDescription: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
  },

  alternativeArrow: {
    ...TYPOGRAPHY.body1,
    color: COLORS.primary,
    fontWeight: '600',
  },

  backButton: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
  },

  backButtonText: {
    ...TYPOGRAPHY.body1,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default ModeSelectionScreen;
