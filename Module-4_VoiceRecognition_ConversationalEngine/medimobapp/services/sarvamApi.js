import axios from 'axios';

const SARVAM_API_KEY = 'sk_z9mtsj79_kcDWNTFA7IE45JnPz4mqCWUF';
const SARVAM_BASE_URL = 'https://api.sarvam.ai';

// Detailed logging helper
const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [SARVAM-API] [${level}] ${message}`);
  if (data) {
    console.log(`[${timestamp}] [SARVAM-API] [DATA]`, JSON.stringify(data, null, 2));
  }
};

// Supported Indian languages (ALL languages supported by Sarvam AI)
export const SUPPORTED_LANGUAGES = {
  'en-IN': { name: 'English', native: 'English' },
  'hi-IN': { name: 'Hindi', native: 'हिन्दी' },
  'ta-IN': { name: 'Tamil', native: 'தமிழ்' },
  'te-IN': { name: 'Telugu', native: 'తెలుగు' },
  'kn-IN': { name: 'Kannada', native: 'ಕನ್ನಡ' },
  'ml-IN': { name: 'Malayalam', native: 'മലയാളം' },
  'mr-IN': { name: 'Marathi', native: 'मराठी' },
  'bn-IN': { name: 'Bengali', native: 'বাংলা' },
  'gu-IN': { name: 'Gujarati', native: 'ગુજરાતી' },
  'pa-IN': { name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  'or-IN': { name: 'Odia', native: 'ଓଡ଼ିଆ' },
};

/**
 * Convert speech to text and translate to English
 * @param {string} audioUri - Local file URI of the audio recording
 * @returns {Object} - { success: boolean, text: string, language: string, error?: string }
 */
export const speechToTextTranslate = async (audioUri) => {
  log('INFO', '=== STARTING SPEECH-TO-TEXT ===');
  log('INFO', 'Audio URI', { audioUri });
  
  try {
    const formData = new FormData();
    
    // Create file object for upload
    const file = {
      uri: audioUri,
      type: 'audio/x-m4a', // Sarvam API requires audio/x-m4a format
      name: 'audio.m4a',
    };
    
    formData.append('file', file);
    log('INFO', 'FormData prepared', { fileName: file.name, fileType: file.type });

    log('INFO', `Sending POST request to: ${SARVAM_BASE_URL}/speech-to-text-translate`);
    const startTime = Date.now();
    
    const response = await axios.post(
      `${SARVAM_BASE_URL}/speech-to-text-translate`,
      formData,
      {
        headers: {
          'api-subscription-key': SARVAM_API_KEY,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout
      }
    );
    
    const elapsed = Date.now() - startTime;
    log('INFO', `Response received in ${elapsed}ms`);
    log('SUCCESS', '✅ Speech-to-text successful', {
      transcript: response.data.transcript,
      language: response.data.language_code,
      requestId: response.data.request_id,
    });

    return {
      success: true,
      text: response.data.transcript,
      language: response.data.language_code || 'en-IN',
      requestId: response.data.request_id,
    };
  } catch (error) {
    log('ERROR', '❌ Speech-to-text error', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message || 'Failed to convert speech to text',
      details: error.response?.data,
    };
  }
};

/**
 * Translate text from one language to another
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language code (use 'auto' for auto-detect)
 * @param {string} targetLanguage - Target language code
 * @returns {Object} - { translatedText, sourceLanguageCode }
 */
export const translateText = async (text, sourceLanguage = 'auto', targetLanguage = 'en-IN') => {
  log('INFO', '=== STARTING TEXT TRANSLATION ===');
  log('INFO', 'Translation request', { text, sourceLanguage, targetLanguage });
  
  try {
    log('INFO', `Sending POST request to: ${SARVAM_BASE_URL}/translate`);
    const startTime = Date.now();
    
    const response = await axios.post(
      `${SARVAM_BASE_URL}/translate`,
      {
        input: text,
        source_language_code: sourceLanguage,
        target_language_code: targetLanguage,
      },
      {
        headers: {
          'api-subscription-key': SARVAM_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const elapsed = Date.now() - startTime;
    log('INFO', `Response received in ${elapsed}ms`);
    log('SUCCESS', '✅ Translation successful', {
      translatedText: response.data.translated_text,
      detectedLanguage: response.data.source_language_code,
    });

    return {
      translatedText: response.data.translated_text,
      sourceLanguageCode: response.data.source_language_code,
      requestId: response.data.request_id,
    };
  } catch (error) {
    log('ERROR', '❌ Translation error', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw new Error(error.response?.data?.error?.message || 'Failed to translate text');
  }
};

/**
 * Convert text to speech
 * @param {string} text - Text to convert to speech
 * @param {string} targetLanguage - Target language code
 * @returns {Object} - { success: boolean, audioBase64: string, requestId: string, error?: string }
 */
export const textToSpeech = async (text, targetLanguage = 'en-IN') => {
  log('INFO', '=== STARTING TEXT-TO-SPEECH ===');
  
  // Validate that text is actually a string
  if (typeof text !== 'string') {
    log('ERROR', '❌ Text is not a string!', { 
      receivedType: typeof text,
      receivedValue: text 
    });
    return {
      success: false,
      error: `Invalid input: expected string, received ${typeof text}`,
    };
  }
  
  log('INFO', 'TTS request', { 
    textLength: text.length, 
    textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    targetLanguage 
  });
  
  try {
    log('INFO', `Sending POST request to: ${SARVAM_BASE_URL}/text-to-speech`);
    const startTime = Date.now();
    
    const response = await axios.post(
      `${SARVAM_BASE_URL}/text-to-speech`,
      {
        text: text,
        target_language_code: targetLanguage,
      },
      {
        headers: {
          'api-subscription-key': SARVAM_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );

    const elapsed = Date.now() - startTime;
    log('INFO', `Response received in ${elapsed}ms`);
    log('SUCCESS', '✅ Text-to-speech successful', {
      audioLength: response.data.audios?.[0]?.length || 0,
      requestId: response.data.request_id,
    });

    return {
      success: true,
      audioBase64: response.data.audios[0],
      requestId: response.data.request_id,
    };
  } catch (error) {
    log('ERROR', '❌ Text-to-speech error', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message || 'Failed to convert text to speech',
      details: error.response?.data,
    };
  }
};
