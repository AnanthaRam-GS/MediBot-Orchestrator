// ============================================================================
// QUEUE STATUS SCREEN
// Shows patient's position in queue and estimated wait time
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
  RefreshControl,
} from 'react-native';
import { commonStyles, COLORS, SPACING, FONT_SIZES } from '../styles/theme';
import appointmentService from '../services/appointmentService';

const QueueStatusScreen = ({ route, navigation }) => {
  const { patient, appointment, doctor } = route.params || {};
  const [queueData, setQueueData] = useState(null);
  const [myPosition, setMyPosition] = useState(null);
  const [patientHistory, setPatientHistory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadQueueStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadQueueStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadQueueStatus = async () => {
    try {
      if (!doctor?.id && !appointment?.doctor_id) {
        return;
      }

      const doctorId = doctor?.id || appointment?.doctor_id;

      // Get queue status
      const queueResult = await appointmentService.getQueueStatus(doctorId);
      if (queueResult.success) {
        setQueueData(queueResult);
      }

      // Get my position
      if (patient?.id) {
        const positionResult = await appointmentService.getMyQueuePosition(patient.id, doctorId);
        if (positionResult.success) {
          setMyPosition(positionResult);
        }

        // Get patient history
        const historyResult = await appointmentService.getPatientHistory(patient.id);
        if (historyResult.success) {
          setPatientHistory(historyResult);
        }
      }
    } catch (error) {
      console.error('Load queue status error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadQueueStatus();
  };

  if (isLoading) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading queue status...</Text>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <ScrollView
        contentContainerStyle={{ padding: SPACING.xl }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.title}>📋 Queue Status</Text>

        {/* Patient Info */}
        <View style={[styles.card, { backgroundColor: COLORS.primary + '20' }]}>
          <Text style={styles.cardTitle}>Your Information</Text>
          <Text style={styles.infoText}>
            Name: {patient?.name || 'Guest'}
          </Text>
          <Text style={styles.infoText}>
            Doctor: {doctor?.name || 'Not specified'}
          </Text>
          <Text style={styles.infoText}>
            Specialty: {doctor?.specialty || 'Not specified'}
          </Text>
        </View>

        {/* Patient History */}
        {patientHistory && patientHistory.history && patientHistory.history.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 Your Medical History</Text>
            <Text style={styles.historySubtitle}>
              Previous consultations ({patientHistory.totalAppointments} total)
            </Text>
            {patientHistory.history.slice(0, 5).map((visit, index) => (
              <View key={visit.appointment_id} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyDate}>
                    📅 {new Date(visit.appointment_date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.historyStatus}>
                    {visit.status === 'completed' ? '✅' : '🔄'} {visit.status}
                  </Text>
                </View>
                <Text style={styles.historyDoctor}>
                  👨‍⚕️ Dr. {visit.doctor_name}
                </Text>
                <Text style={styles.historySpecialty}>
                  🏥 {visit.doctor_specialty}
                </Text>
                {visit.reason && (
                  <Text style={styles.historyReason}>
                    💬 {visit.reason}
                  </Text>
                )}
              </View>
            ))}
            {patientHistory.history.length > 5 && (
              <Text style={styles.historyNote}>
                ... and {patientHistory.history.length - 5} more visits
              </Text>
            )}
          </View>
        )}

        {/* My Queue Position */}
        {myPosition && (
          <View style={[styles.card, styles.positionCard]}>
            <Text style={styles.positionTitle}>Your Queue Position</Text>
            <Text style={styles.positionNumber}>#{myPosition.position}</Text>
            <Text style={styles.estimatedWait}>
              Estimated Wait: {myPosition.estimatedWait || '15-20 minutes'}
            </Text>
          </View>
        )}

        {/* Queue Overview */}
        {queueData && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Queue Overview</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{queueData.totalWaiting}</Text>
                <Text style={styles.statLabel}>Total Waiting</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  {queueData.queue?.filter(q => q.status === 'Waiting').length || 0}
                </Text>
                <Text style={styles.statLabel}>In Queue</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  {queueData.queue?.filter(q => q.status === 'In_Session').length || 0}
                </Text>
                <Text style={styles.statLabel}>In Consultation</Text>
              </View>
            </View>
          </View>
        )}

        {/* Queue List */}
        {queueData && queueData.queue && queueData.queue.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Current Queue</Text>
            {queueData.queue.slice(0, 10).map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.queueItem,
                  item.patient_id === patient?.id && styles.queueItemHighlight,
                ]}
              >
                <Text style={styles.queuePosition}>#{item.queue_position}</Text>
                <View style={styles.queueInfo}>
                  <Text style={styles.queueName}>
                    {item.patient_id === patient?.id ? 'YOU' : (item.patient_name || `Patient ID: ${item.patient_id}`)}
                  </Text>
                  <Text style={styles.queueStatus}>
                    {item.status === 'Waiting' ? '⏳ Waiting' : item.status === 'In_Session' ? '👨‍⚕️ In Consultation' : item.status}
                  </Text>
                </View>
                {item.priority === 'emergency' && (
                  <Text style={styles.emergencyBadge}>🚨 EMERGENCY</Text>
                )}
                {item.priority === 'high' && (
                  <Text style={styles.highPriorityBadge}>⚠️ HIGH</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionTitle}>📢 Instructions:</Text>
          <Text style={styles.instruction}>
            • Please wait in the seating area
          </Text>
          <Text style={styles.instruction}>
            • Your token number will be called when it's your turn
          </Text>
          <Text style={styles.instruction}>
            • This screen updates automatically every 30 seconds
          </Text>
          <Text style={styles.instruction}>
            • Pull down to refresh manually
          </Text>
        </View>

        {/* Buttons */}
        <TouchableOpacity
          style={[commonStyles.button, { backgroundColor: COLORS.primary, marginTop: SPACING.xl }]}
          onPress={handleRefresh}
        >
          <Text style={commonStyles.buttonText}>🔄 Refresh</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[commonStyles.button, { backgroundColor: COLORS.secondary, marginTop: SPACING.md }]}
          onPress={() => navigation.navigate('FaceRecognition')}
        >
          <Text style={commonStyles.buttonText}>✓ Done</Text>
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
  positionCard: {
    backgroundColor: COLORS.success + '20',
    alignItems: 'center',
  },
  positionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  positionNumber: {
    fontSize: 80,
    fontWeight: 'bold',
    color: COLORS.success,
    marginVertical: SPACING.md,
  },
  estimatedWait: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    marginVertical: SPACING.xs,
  },
  queueItemHighlight: {
    backgroundColor: COLORS.primary + '30',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  queuePosition: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginRight: SPACING.md,
    minWidth: 50,
  },
  queueInfo: {
    flex: 1,
  },
  queueName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  queueStatus: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emergencyBadge: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
    color: COLORS.emergency,
    backgroundColor: COLORS.emergency + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  highPriorityBadge: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
    color: COLORS.warning,
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  instructionsCard: {
    backgroundColor: COLORS.info + '10',
    borderRadius: 16,
    padding: SPACING.xl,
    marginTop: SPACING.xl,
  },
  instructionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.info,
    marginBottom: SPACING.md,
  },
  instruction: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    marginVertical: SPACING.xs,
  },
  loadingText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  historySubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  historyItem: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 8,
    marginVertical: SPACING.xs,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  historyDate: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  historyStatus: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    textTransform: 'capitalize',
  },
  historyDoctor: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  historySpecialty: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  historyReason: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  historyNote: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    fontStyle: 'italic',
  },
});

export default QueueStatusScreen;
