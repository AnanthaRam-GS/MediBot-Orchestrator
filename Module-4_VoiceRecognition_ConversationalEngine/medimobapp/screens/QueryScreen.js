// ============================================================================
// QUERY SCREEN (Voice Assistant)
// General health queries using existing voice assistant functionality
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
} from 'react-native';
import { commonStyles, COLORS, SPACING, FONT_SIZES } from '../styles/theme';
import EmergencyButton from '../components/EmergencyButton';
import {
  createRecording,
  playAudioFromBase64,
  stopAudio,
  requestAudioPermissions,
  setupAudioMode,
} from '../utils/audioUtils';
import { speechToTextTranslate, textToSpeech, translateText } from '../services/sarvamApi';
import { processUserQuery } from '../services/geminiApi';

const QueryScreen = ({ route, navigation }) => {
  const { patient } = route.params || {};
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSound, setCurrentSound] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    // Request permissions on mount
    requestAudioPermissions()
      .then(() => {
        setHasPermission(true);
        return setupAudioMode();
      })
      .catch((error) => {
        Alert.alert(
          'Permission Required',
          'Microphone permission is required for voice queries. Please enable it in settings.'
        );
      });

    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (currentSound) {
        stopAudio(currentSound);
      }
    };
  }, []);

  const handleStartRecording = async () => {
    try {
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Please grant microphone permission to use voice queries.');
        return;
      }

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
      const rec = await createRecording();
      
      // Actually start the recording
      await rec.startAsync();
      
      setRecording(rec);
    } catch (error) {
      console.error('Recording start error:', error);
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

      // Stop recording and get URI
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        throw new Error('Failed to get recording URI');
      }

      console.log('Recording URI:', uri);

      // Try speech to text
      let userText = '';
      let userLang = 'en-IN';
      
      try {
        const speechResult = await speechToTextTranslate(uri);
        if (speechResult.success) {
          userText = speechResult.text;
          userLang = speechResult.language || 'en-IN';
        } else {
          throw new Error(speechResult.error);
        }
      } catch (speechError) {
        console.error('Speech-to-text error:', speechError);
        // Fallback: Ask user to type their question
        Alert.alert(
          'Voice Recognition Failed',
          'Speech-to-text is not available. Would you like to type your question instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Type Question',
              onPress: () => {
                Alert.prompt(
                  'Type Your Question',
                  'Enter your health query:',
                  async (text) => {
                    if (text && text.trim()) {
                      await processTextQuery(text.trim(), 'en-IN');
                    }
                  }
                );
              },
            },
          ]
        );
        return;
      }

      await processTextQuery(userText, userLang);
      
    } catch (error) {
      console.error('Stop recording error:', error);
      Alert.alert('Error', `Failed to process query: ${error.message}`);
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

  // Separate function to process text query
  const processTextQuery = async (userText, userLang) => {
    console.log('[QUERY] Processing text query', { userText, userLang });
    
    try {
      // Add user message to conversation
      setConversation((prev) => [
        ...prev,
        { role: 'user', text: userText, language: userLang },
      ]);

      console.log('[QUERY] Getting AI response from Gemini...');
      
      // Get AI response (returns object with intent, response, etc.)
      const aiResponse = await processUserQuery(userText);
      
      console.log('[QUERY] AI response received:', aiResponse);

      // Extract the actual text response from the AI response object
      let responseText = aiResponse.response || aiResponse.text || String(aiResponse);
      console.log('[QUERY] Response text extracted:', responseText);

      // If user spoke in non-English but AI responded in English, translate the response back
      if (userLang !== 'en-IN' && aiResponse.language_detected === 'en') {
        console.log('[QUERY] Translating English response back to user language:', userLang);
        try {
          const translationResult = await translateText(responseText, 'en-IN', userLang);
          if (translationResult && translationResult.translatedText) {
            responseText = translationResult.translatedText;
            console.log('[QUERY] Translated response:', responseText);
            // Update AI response language to match translated text
            aiResponse.language_detected = userLang.split('-')[0]; // Convert 'ta-IN' to 'ta'
          }
        } catch (translationError) {
          console.error('[QUERY] Translation failed:', translationError);
          // Continue with English response if translation fails
        }
      }

      // Use the language detected by AI, fallback to user's input language
      const aiLanguage = aiResponse.language_detected || userLang || 'en-IN';
      
      // Map language codes to Sarvam TTS format (must end with -IN)
      const languageMapping = {
        'en': 'en-IN',
        'ta': 'ta-IN', 
        'hi': 'hi-IN',
        'te': 'te-IN',
        'kn': 'kn-IN',
        'ml': 'ml-IN',
        'mr': 'mr-IN',
        'bn': 'bn-IN',
        'gu': 'gu-IN',
        'pa': 'pa-IN',
        'or': 'od-IN'
      };
      
      const responseLanguage = languageMapping[aiLanguage] || aiLanguage;
      console.log('[QUERY] Using language for TTS:', responseLanguage, 'from AI language:', aiLanguage);

      // Try to convert AI response to speech
      try {
        console.log('[QUERY] Converting response to speech...', { language: responseLanguage });
        const ttsResult = await textToSpeech(responseText, responseLanguage); // Use AI's detected language
        
        if (ttsResult.success && ttsResult.audioBase64) {
          console.log('[QUERY] TTS successful, playing audio...');
          const sound = await playAudioFromBase64(ttsResult.audioBase64);
          setCurrentSound(sound);
          console.log('[QUERY] Audio playback started');
        } else {
          console.warn('[QUERY] TTS failed:', ttsResult.error);
        }
      } catch (ttsError) {
        console.error('[QUERY] Text-to-speech error:', ttsError.message);
        // Continue without audio - just show text response
      }

      // Add AI response to conversation (use the text string, not the object)
      setConversation((prev) => [
        ...prev,
        { role: 'assistant', text: responseText, language: userLang },
      ]);
      
      console.log('[QUERY] ✅ Query processed successfully');
    } catch (error) {
      console.error('[QUERY] ❌ Process query error:', error);
      throw error;
    }
  };

  return (
    <View style={commonStyles.container}>
      <View style={{ flex: 1, padding: SPACING.xl }}>
        <Text style={styles.title}>💬 Ask a Question</Text>
        <Text style={styles.subtitle}>
          Voice assistant for health queries and information
        </Text>

        {/* Conversation History */}
        <ScrollView style={styles.conversationContainer}>
          {conversation.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎤</Text>
              <Text style={styles.emptyText}>
                Tap the microphone to ask a question
              </Text>
              <Text style={styles.exampleText}>
                Examples:{'\n'}
                • "Which doctors are available today?"{'\n'}
                • "What are the visiting hours?"{'\n'}
                • "Tell me about diabetes management"{'\n'}
                • "How do I book an appointment?"
              </Text>
            </View>
          ) : (
            conversation.map((msg, index) => (
              <View
                key={index}
                style={[
                  styles.messageCard,
                  msg.role === 'user' ? styles.userMessage : styles.assistantMessage,
                ]}
              >
                <Text style={styles.messageLabel}>
                  {msg.role === 'user' ? '👤 You' : '🤖 Assistant'}
                </Text>
                <Text style={styles.messageText}>{msg.text}</Text>
              </View>
            ))
          )}
        </ScrollView>

        {/* Recording/Processing Status */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.pulsingDot} />
            <Text style={styles.recordingText}>🎤 Listening...</Text>
          </View>
        )}

        {isProcessing && (
          <View style={styles.processingIndicator}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controlsContainer}>
          {!hasPermission && (
            <View style={styles.permissionWarning}>
              <Text style={styles.warningText}>
                ⚠️ Microphone permission required
              </Text>
            </View>
          )}

          {!isRecording && !isProcessing && hasPermission && (
            <TouchableOpacity
              style={[commonStyles.buttonLarge, { backgroundColor: COLORS.secondary }]}
              onPress={handleStartRecording}
            >
              <Text style={commonStyles.buttonTextLarge}>🎤 Ask Question</Text>
            </TouchableOpacity>
          )}

          {isRecording && (
            <TouchableOpacity
              style={[commonStyles.buttonLarge, { backgroundColor: COLORS.emergency }]}
              onPress={handleStopRecording}
              activeOpacity={0.8}
            >
              <Text style={commonStyles.buttonTextLarge}>⏹️ Stop</Text>
            </TouchableOpacity>
          )}

          {!isRecording && !isProcessing && (
            <TouchableOpacity
              style={[commonStyles.button, { backgroundColor: COLORS.disabled, marginTop: SPACING.md }]}
              onPress={() => navigation.goBack()}
              disabled={isRecording || isProcessing}
            >
              <Text style={commonStyles.buttonText}>← Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

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
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  conversationContainer: {
    flex: 1,
    marginBottom: SPACING.xl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxxl,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: SPACING.lg,
  },
  emptyText: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  exampleText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'left',
    lineHeight: 28,
  },
  messageCard: {
    borderRadius: 16,
    padding: SPACING.lg,
    marginVertical: SPACING.sm,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: COLORS.primary + '20',
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    backgroundColor: COLORS.cardBackground,
    alignSelf: 'flex-start',
  },
  messageLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  messageText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: SPACING.lg,
    marginVertical: SPACING.md,
  },
  pulsingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFF',
    marginRight: SPACING.md,
  },
  recordingText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: '#FFF',
  },
  processingIndicator: {
    alignItems: 'center',
    padding: SPACING.lg,
  },
  processingText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.primary,
    marginTop: SPACING.sm,
  },
  controlsContainer: {
    paddingTop: SPACING.lg,
  },
  permissionWarning: {
    backgroundColor: COLORS.warning + '20',
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.warning,
  },
  warningText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.warning,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default QueryScreen;
