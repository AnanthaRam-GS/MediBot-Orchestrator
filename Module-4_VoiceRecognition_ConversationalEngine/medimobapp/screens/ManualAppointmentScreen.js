// ============================================================================
// MANUAL APPOINTMENT SCREEN
// Form-based appointment booking (fallback for voice)
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { commonStyles, COLORS, SPACING, FONT_SIZES } from '../styles/theme';
import EmergencyButton from '../components/EmergencyButton';
import { getDoctors, bookAppointment } from '../services/appointmentService';

const ManualAppointmentScreen = ({ route, navigation }) => {
  const { patient } = route.params || {};
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('normal');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    setIsLoading(true);
    const result = await getDoctors();
    if (result.success) {
      setDoctors(result.doctors);
      if (result.doctors.length > 0) {
        setSelectedDoctor(result.doctors[0].id);
      }
    } else {
      Alert.alert('Error', 'Failed to load doctors list');
    }
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!patient) {
      Alert.alert('Error', 'Patient information required');
      return;
    }

    if (!selectedDoctor) {
      Alert.alert('Error', 'Please select a doctor');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Error', 'Please enter reason for visit');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await bookAppointment({
        patient_id: patient.id,
        patient_name: patient.name,
        doctor_id: selectedDoctor,
        reason: reason.trim(),
        priority,
      });

      if (result.success) {
        const doctor = doctors.find((d) => d.id === selectedDoctor);
        Alert.alert(
          '✅ Appointment Booked!',
          `Doctor: ${doctor?.name}\nQueue Position: ${result.queuePosition}\n\nPlease wait in the seating area.`,
          [
            {
              text: 'View Queue',
              onPress: () => {
                navigation.navigate('QueueStatus', {
                  patient,
                  appointment: result.appointment,
                  doctor,
                });
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', `Failed to book appointment: ${result.error}`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to book appointment: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading doctors...</Text>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <ScrollView contentContainerStyle={{ padding: SPACING.xl }}>
        <Text style={styles.title}>📝 Manual Appointment Form</Text>
        <Text style={styles.subtitle}>Fill in the details to book your appointment</Text>

        {/* Patient Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Patient Information</Text>
          <Text style={styles.infoText}>
            Name: {patient?.name || 'Guest'}
          </Text>
          {patient?.phone && (
            <Text style={styles.infoText}>Phone: {patient.phone}</Text>
          )}
        </View>

        {/* Doctor Selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Doctor *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedDoctor}
              onValueChange={(value) => setSelectedDoctor(value)}
              style={styles.picker}
            >
              {doctors.map((doctor) => (
                <Picker.Item
                  key={doctor.id}
                  label={`${doctor.name} - ${doctor.specialty}`}
                  value={doctor.id}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Reason for Visit */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reason for Visit *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your symptoms or reason for consultation"
            placeholderTextColor={COLORS.textSecondary}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Priority */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Priority Level</Text>
          <View style={styles.priorityContainer}>
            <TouchableOpacity
              style={[
                styles.priorityButton,
                priority === 'normal' && styles.priorityButtonActive,
              ]}
              onPress={() => setPriority('normal')}
            >
              <Text
                style={[
                  styles.priorityText,
                  priority === 'normal' && styles.priorityTextActive,
                ]}
              >
                Normal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.priorityButton,
                priority === 'high' && styles.priorityButtonActive,
              ]}
              onPress={() => setPriority('high')}
            >
              <Text
                style={[
                  styles.priorityText,
                  priority === 'high' && styles.priorityTextActive,
                ]}
              >
                High
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[commonStyles.buttonLarge, { backgroundColor: COLORS.primary, marginTop: SPACING.xl }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={commonStyles.buttonTextLarge}>✓ Book Appointment</Text>
          )}
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
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
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.info,
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: SPACING.xl,
    marginVertical: SPACING.md,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  infoText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    marginVertical: SPACING.xs,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  picker: {
    height: 50,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  priorityButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  priorityButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  priorityText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  priorityTextActive: {
    color: '#FFF',
  },
  loadingText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
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

export default ManualAppointmentScreen;
