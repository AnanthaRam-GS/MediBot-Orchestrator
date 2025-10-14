// ============================================================================
// REGISTRATION SCREEN
// New patient registration with face recognition (Simplified)
// Uses Python Flask API with MTCNN + FaceNet
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { commonStyles, COLORS, SPACING, FONT_SIZES } from '../styles/theme';
import { registerNewPatient } from '../services/faceRecognitionService';

const RegistrationScreen = ({ route, navigation }) => {
  const { capturedImage } = route.params || {};
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!capturedImage) {
      Alert.alert('Error', 'Face image is required. Please go back and capture your face.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Register patient with name and face image
      const result = await registerNewPatient(name.trim(), capturedImage);

      if (result.success) {
        Alert.alert(
          '✅ Registration Successful',
          `Welcome ${name}! You are now registered in our system.\nPatient ID: ${result.patient.id}`,
          [
            {
              text: 'Continue',
              onPress: () => {
                navigation.navigate('Welcome', {
                  patient: result.patient,
                });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Registration Failed',
          result.message || result.error || 'Unable to register. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', `Registration failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={commonStyles.container}>
      <ScrollView contentContainerStyle={{ padding: SPACING.xl }}>
        <Text style={styles.title}>📝 New Patient Registration</Text>
        <Text style={styles.subtitle}>
          {capturedImage 
            ? 'Please enter your name to complete registration' 
            : 'Face image required. Please go back and capture your face.'}
        </Text>

        {/* Face Image Preview */}
        {capturedImage ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: capturedImage }} style={styles.faceImage} />
            <Text style={styles.imageCaption}>✓ Face captured successfully</Text>
          </View>
        ) : (
          <View style={styles.imageContainer}>
            <View style={styles.noImagePlaceholder}>
              <Text style={styles.noImageText}>📷</Text>
              <Text style={styles.noImageCaption}>No face image</Text>
            </View>
          </View>
        )}

        {/* Registration Form - Simplified */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Patient Information</Text>

          {/* Name - Only Required Field */}
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your full name"
            placeholderTextColor={COLORS.textSecondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoFocus
          />

          <Text style={styles.infoText}>
            ℹ️ Your face will be used for future recognition at the kiosk
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            commonStyles.buttonLarge,
            { 
              backgroundColor: (!capturedImage || !name.trim()) ? COLORS.border : COLORS.primary, 
              marginTop: SPACING.xl 
            },
          ]}
          onPress={handleRegister}
          disabled={isSubmitting || !capturedImage || !name.trim()}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={commonStyles.buttonTextLarge}>✓ Complete Registration</Text>
          )}
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={isSubmitting}
        >
          <Text style={styles.backButtonText}>← Back to Face Capture</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  faceImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: COLORS.primary,
  },
  imageCaption: {
    fontSize: FONT_SIZES.md,
    color: COLORS.success,
    marginTop: SPACING.md,
    fontWeight: '600',
  },
  noImagePlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBackground,
  },
  noImageText: {
    fontSize: 60,
  },
  noImageCaption: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: SPACING.xl,
    marginVertical: SPACING.md,
  },
  cardTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    height: 55,
    fontWeight: '500',
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.info,
    marginTop: SPACING.lg,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  backButton: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default RegistrationScreen;
