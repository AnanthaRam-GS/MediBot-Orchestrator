import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Request audio recording permissions
 */
export const requestAudioPermissions = async () => {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Audio recording permission not granted');
    }
    return true;
  } catch (error) {
    console.error('Permission error:', error);
    throw error;
  }
};

/**
 * Set up audio mode for recording
 */
export const setupAudioMode = async () => {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch (error) {
    console.error('Audio mode setup error:', error);
    throw error;
  }
};

/**
 * Create a new audio recording instance
 */
export const createRecording = async () => {
  try {
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    return recording;
  } catch (error) {
    console.error('Recording creation error:', error);
    throw error;
  }
};

/**
 * Play audio from base64 string
 * @param {string} base64Audio - Base64 encoded audio
 */
export const playAudioFromBase64 = async (base64Audio) => {
  try {
    // Create a temporary file to store the audio
    const fileUri = FileSystem.cacheDirectory + 'response_audio.wav';
    
    // Write base64 audio to file (using 'base64' string instead of enum)
    await FileSystem.writeAsStringAsync(fileUri, base64Audio, {
      encoding: 'base64',
    });

    // Create and play sound
    const { sound } = await Audio.Sound.createAsync(
      { uri: fileUri },
      { shouldPlay: true }
    );

    // Wait for audio to finish playing
    await sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync();
      }
    });

    return sound;
  } catch (error) {
    console.error('Audio playback error:', error);
    throw error;
  }
};

/**
 * Stop and unload sound
 * @param {Audio.Sound} sound - Sound instance to stop
 */
export const stopAudio = async (sound) => {
  try {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
  } catch (error) {
    console.error('Stop audio error:', error);
  }
};
