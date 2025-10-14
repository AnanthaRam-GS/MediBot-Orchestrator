import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, Card, Title, Paragraph } from 'react-native-paper';
import {
  requestAudioPermissions,
  setupAudioMode,
  createRecording,
  playAudioFromBase64,
  stopAudio,
} from './utils/audioUtils';
import { speechToTextTranslate, translateText, textToSpeech } from './services/sarvamApi';
import { processUserQuery } from './services/geminiApi';

export default function App() {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSound, setCurrentSound] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [statusMessage, setStatusMessage] = useState('Tap the microphone to start');

  useEffect(() => {
    // Initialize audio permissions and mode on app start
    initializeAudio();
    
    // Cleanup on unmount
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (currentSound) {
        stopAudio(currentSound);
      }
    };
  }, []);

  const initializeAudio = async () => {
    try {
      await requestAudioPermissions();
      await setupAudioMode();
    } catch (error) {
      Alert.alert('Permission Error', 'Please grant microphone permission to use this app.');
    }
  };

  const startRecording = async () => {
    try {
      setStatusMessage('Recording...');
      setIsRecording(true);
      
      const newRecording = await createRecording();
      await newRecording.startAsync();
      setRecording(newRecording);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
      setIsRecording(false);
      setStatusMessage('Tap the microphone to start');
    }
  };

  const stopRecording = async () => {
    try {
      setStatusMessage('Processing your request...');
      setIsRecording(false);
      setIsProcessing(true);

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      // Process the audio
      await processAudioInput(uri);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to process recording. Please try again.');
      setIsProcessing(false);
      setStatusMessage('Tap the microphone to start');
    }
  };

  const processAudioInput = async (audioUri) => {
    try {
      // Step 1: Convert speech to text (auto-translates to English)
      setStatusMessage('Converting speech to text...');
      const { transcript, languageCode } = await speechToTextTranslate(audioUri);
      
      console.log('Transcript:', transcript);
      console.log('Detected Language:', languageCode);

      // Add user message to conversation
      setConversation((prev) => [
        ...prev,
        { type: 'user', text: transcript, language: languageCode },
      ]);

      // Step 2: Translate to English if not already in English
      let englishText = transcript;
      if (languageCode !== 'en-IN') {
        setStatusMessage('Translating to English...');
        const translationResult = await translateText(transcript, languageCode, 'en-IN');
        englishText = translationResult.translatedText;
        console.log('English Translation:', englishText);
      }

      // Step 3: Get AI response from Gemini
      setStatusMessage('Getting AI response...');
      const aiResponse = await processUserQuery(englishText);
      console.log('AI Response:', aiResponse);

      let responseText = aiResponse.response;

      // Step 4: Translate response back to user's language if needed
      if (languageCode !== 'en-IN') {
        setStatusMessage('Translating response...');
        const responseTranslation = await translateText(responseText, 'en-IN', languageCode);
        responseText = responseTranslation.translatedText;
        console.log('Translated Response:', responseText);
      }

      // Add AI response to conversation
      setConversation((prev) => [
        ...prev,
        {
          type: 'assistant',
          text: responseText,
          intent: aiResponse.intent,
          priority: aiResponse.priority,
        },
      ]);

      // Step 5: Convert response to speech
      setStatusMessage('Converting to speech...');
      const { audioBase64 } = await textToSpeech(responseText, languageCode);

      // Step 6: Play audio response
      setStatusMessage('Playing response...');
      const sound = await playAudioFromBase64(audioBase64);
      setCurrentSound(sound);

      // Reset status after a delay
      setTimeout(() => {
        setStatusMessage('Tap the microphone to start');
        setIsProcessing(false);
      }, 1000);
    } catch (error) {
      console.error('Processing error:', error);
      Alert.alert('Error', 'Failed to process your request. Please try again.');
      setStatusMessage('Tap the microphone to start');
      setIsProcessing(false);
    }
  };

  const handleMicPress = () => {
    if (isProcessing) {
      return; // Don't allow recording while processing
    }

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return '#ff4444';
      case 'high':
        return '#ff8800';
      default:
        return '#4CAF50';
    }
  };

  return (
    <PaperProvider>
      <View style={styles.container}>
        <StatusBar style="auto" />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🏥 Medi Assist Bot</Text>
          <Text style={styles.headerSubtitle}>Your Healthcare Assistant</Text>
        </View>

        {/* Conversation Area */}
        <ScrollView
          style={styles.conversationContainer}
          contentContainerStyle={styles.conversationContent}
          ref={(ref) => ref?.scrollToEnd({ animated: true })}
        >
          {conversation.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                👋 Hello! I'm Medi Assist Bot.
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Speak in any language, and I'll help you with your hospital needs.
              </Text>
            </View>
          ) : (
            conversation.map((message, index) => (
              <Card
                key={index}
                style={[
                  styles.messageCard,
                  message.type === 'user' ? styles.userCard : styles.assistantCard,
                ]}
              >
                <Card.Content>
                  {message.type === 'assistant' && message.priority && (
                    <View
                      style={[
                        styles.priorityBadge,
                        { backgroundColor: getPriorityColor(message.priority) },
                      ]}
                    >
                      <Text style={styles.priorityText}>
                        {message.priority.toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Title style={styles.messageTitle}>
                    {message.type === 'user' ? '🗣️ You' : '🤖 Medi Assist'}
                  </Title>
                  <Paragraph style={styles.messageText}>{message.text}</Paragraph>
                  {message.intent && (
                    <Text style={styles.intentText}>Intent: {message.intent}</Text>
                  )}
                </Card.Content>
              </Card>
            ))
          )}
        </ScrollView>

        {/* Status Message */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{statusMessage}</Text>
          {isProcessing && <ActivityIndicator size="small" color="#2196F3" />}
        </View>

        {/* Microphone Button */}
        <View style={styles.micContainer}>
          <TouchableOpacity
            style={[
              styles.micButton,
              isRecording && styles.micButtonRecording,
              isProcessing && styles.micButtonDisabled,
            ]}
            onPress={handleMicPress}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            <Text style={styles.micIcon}>{isRecording ? '⏹️' : '🎤'}</Text>
          </TouchableOpacity>
          <Text style={styles.micLabel}>
            {isRecording ? 'Tap to Stop' : 'Tap to Speak'}
          </Text>
        </View>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  conversationContainer: {
    flex: 1,
  },
  conversationContent: {
    padding: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  messageCard: {
    marginBottom: 15,
    borderRadius: 12,
    elevation: 2,
  },
  userCard: {
    backgroundColor: '#E3F2FD',
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  assistantCard: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  intentText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  priorityBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  micContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  micButtonRecording: {
    backgroundColor: '#f44336',
  },
  micButtonDisabled: {
    backgroundColor: '#ccc',
  },
  micIcon: {
    fontSize: 40,
  },
  micLabel: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});
