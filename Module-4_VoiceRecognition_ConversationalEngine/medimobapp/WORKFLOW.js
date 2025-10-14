/* 
 * MEDI ASSIST BOT - COMPLETE WORKFLOW DOCUMENTATION
 * =================================================
 * 
 * This document explains how the app works from start to finish
 */

// ============================================================================
// 1. USER SPEAKS IN ANY LANGUAGE
// ============================================================================
/*
 * User taps the microphone button and speaks in their native language.
 * Examples:
 * - English: "I want to register"
 * - Hindi: "मुझे डॉक्टर से मिलना है"
 * - Tamil: "எனக்கு நியமனம் வேண்டும்"
 */

// ============================================================================
// 2. AUDIO RECORDING (utils/audioUtils.js)
// ============================================================================
/*
 * The app uses Expo AV to record audio:
 * - High quality WAV format
 * - Stored temporarily on device
 * - Sent to Sarvam AI for processing
 */

// ============================================================================
// 3. SPEECH TO TEXT + AUTO-TRANSLATE (services/sarvamApi.js)
// ============================================================================
/*
 * Step 1: speechToTextTranslate()
 * 
 * POST https://api.sarvam.ai/speech-to-text-translate
 * 
 * INPUT: Audio file (WAV)
 * OUTPUT: 
 * {
 *   "transcript": "I want to register",
 *   "language_code": "hi-IN",  // Detected language
 *   "request_id": "..."
 * }
 * 
 * This API automatically:
 * - Converts speech to text
 * - Detects the language spoken
 * - Translates to English if needed
 */

// ============================================================================
// 4. ENSURE ENGLISH TEXT (services/sarvamApi.js)
// ============================================================================
/*
 * Step 2: translateText() [if needed]
 * 
 * If the detected language is NOT English, we translate again to ensure
 * we have pure English text for Gemini AI.
 * 
 * POST https://api.sarvam.ai/translate
 * 
 * INPUT:
 * {
 *   "input": "User's text in their language",
 *   "source_language_code": "hi-IN",
 *   "target_language_code": "en-IN"
 * }
 * 
 * OUTPUT:
 * {
 *   "translated_text": "I want to register",
 *   "source_language_code": "hi-IN"
 * }
 */

// ============================================================================
// 5. AI UNDERSTANDING (services/geminiApi.js)
// ============================================================================
/*
 * Step 3: processUserQuery()
 * 
 * POST https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
 * 
 * INPUT: English text + System prompt
 * 
 * The system prompt instructs Gemini to:
 * - Act as "Medi Assist Bot"
 * - Classify user intent (registration, appointment, emergency, etc.)
 * - Provide helpful, calm, professional responses
 * - Return structured JSON
 * 
 * OUTPUT:
 * {
 *   "intent": "registration",
 *   "confidence": 0.95,
 *   "response": "I'd be happy to help you register! Please proceed to...",
 *   "priority": "normal",
 *   "entities": {}
 * }
 * 
 * SUPPORTED INTENTS:
 * 1. registration - Patient wants to register
 * 2. queue_status - Asking about wait time
 * 3. directions - Needs directions to rooms/facilities
 * 4. appointment - Book or inquire about appointments
 * 5. emergency - Medical emergency (HIGH PRIORITY)
 * 6. information - General hospital information
 * 7. billing - Payment and billing questions
 * 8. greeting - Casual greetings
 * 9. complaint - Service complaints
 * 10. discharge - Discharge process questions
 * 11. medication - Medicine and prescription questions
 * 12. doctor_inquiry - Questions about doctors
 * 13. test_results - Lab results inquiries
 * 14. visitor_info - Visitor policies
 * 15. unknown - Unclear requests
 */

// ============================================================================
// 6. TRANSLATE RESPONSE BACK (services/sarvamApi.js)
// ============================================================================
/*
 * Step 4: translateText() [back to user's language]
 * 
 * If user spoke in Hindi, we translate the English response back to Hindi.
 * 
 * POST https://api.sarvam.ai/translate
 * 
 * INPUT:
 * {
 *   "input": "I'd be happy to help you register!",
 *   "source_language_code": "en-IN",
 *   "target_language_code": "hi-IN"
 * }
 * 
 * OUTPUT:
 * {
 *   "translated_text": "मैं आपको रजिस्टर करने में मदद करने में खुश हूं!"
 * }
 */

// ============================================================================
// 7. TEXT TO SPEECH (services/sarvamApi.js)
// ============================================================================
/*
 * Step 5: textToSpeech()
 * 
 * POST https://api.sarvam.ai/text-to-speech
 * 
 * INPUT:
 * {
 *   "text": "मैं आपको रजिस्टर करने में मदद करने में खुश हूं!",
 *   "target_language_code": "hi-IN"
 * }
 * 
 * OUTPUT:
 * {
 *   "audios": ["<base64_encoded_audio>"],
 *   "request_id": "..."
 * }
 */

// ============================================================================
// 8. PLAY AUDIO RESPONSE (utils/audioUtils.js)
// ============================================================================
/*
 * Step 6: playAudioFromBase64()
 * 
 * - Decode base64 audio
 * - Save to temporary file
 * - Play using Expo AV Sound
 * - User hears the response in their language!
 */

// ============================================================================
// 9. DISPLAY IN UI (App.js)
// ============================================================================
/*
 * Throughout the process, the UI shows:
 * - Recording status
 * - Processing steps
 * - Conversation history
 * - Intent classification
 * - Priority badges (urgent/high/normal)
 * 
 * The app maintains a conversation array with all messages.
 */

// ============================================================================
// COMPLETE FLOW EXAMPLE
// ============================================================================
/*
 * User speaks: "मुझे दर्द हो रहा है" (Hindi: "I am in pain")
 * 
 * 1. Record audio → audio.wav
 * 
 * 2. Speech-to-text-translate →
 *    transcript: "I am in pain"
 *    language: "hi-IN"
 * 
 * 3. Gemini AI processes →
 *    intent: "emergency"
 *    response: "I understand you're in pain. This is urgent..."
 *    priority: "urgent"
 * 
 * 4. Translate to Hindi →
 *    "मुझे समझ में आ गया कि आपको दर्द हो रहा है..."
 * 
 * 5. Text-to-speech →
 *    base64 audio in Hindi
 * 
 * 6. Play audio →
 *    User hears response in Hindi!
 * 
 * 7. Display in UI →
 *    Shows conversation with URGENT priority badge
 */

// ============================================================================
// API KEYS (Already Configured)
// ============================================================================
/*
 * SARVAM_API_KEY: sk_z9mtsj79_kcDWNTFA7IE45JnPz4mqCWUF
 * - Used for: Speech-to-text, Translation, Text-to-speech
 * 
 * GEMINI_API_KEY: AIzaSyDGWgNllDWauoZftR6ru_XHJKovyRrxh-I
 * - Used for: Natural language understanding and response generation
 * 
 * These are hardcoded in:
 * - services/sarvamApi.js
 * - services/geminiApi.js
 */

// ============================================================================
// ERROR HANDLING
// ============================================================================
/*
 * The app includes comprehensive error handling:
 * - Permission errors (microphone access)
 * - Network errors (API calls)
 * - Audio recording errors
 * - JSON parsing errors
 * - Graceful fallbacks with user-friendly messages
 */

// ============================================================================
// SUPPORTED LANGUAGES (via Sarvam AI)
// ============================================================================
/*
 * The app supports ALL Indian languages and more:
 * - Hindi (hi-IN)
 * - Tamil (ta-IN)
 * - Telugu (te-IN)
 * - Bengali (bn-IN)
 * - Marathi (mr-IN)
 * - Gujarati (gu-IN)
 * - Kannada (kn-IN)
 * - Malayalam (ml-IN)
 * - Punjabi (pa-IN)
 * - English (en-IN)
 * - And many more...
 */

// ============================================================================
// BUILDING APK
// ============================================================================
/*
 * Three methods to build APK:
 * 
 * Method 1: EAS Build (Easiest, Recommended)
 * - eas build -p android --profile preview
 * - Cloud-based, no Android Studio needed
 * - Provides downloadable APK
 * 
 * Method 2: Expo Classic Build
 * - expo build:android
 * - Choose APK option
 * - Download from build.expo.dev
 * 
 * Method 3: Local Build
 * - npx expo prebuild
 * - Open in Android Studio
 * - Build APK manually
 */

// ============================================================================
// CUSTOMIZATION IDEAS
// ============================================================================
/*
 * Easy customizations:
 * 
 * 1. Change colors in App.js styles
 * 2. Modify system prompt in geminiApi.js
 * 3. Add hospital-specific information
 * 4. Add more intent types
 * 5. Customize UI components
 * 6. Add patient registration form
 * 7. Integrate with hospital database
 * 8. Add appointment booking system
 * 9. Include maps for directions
 * 10. Add multi-device sync
 */

// ============================================================================
// PERFORMANCE OPTIMIZATION
// ============================================================================
/*
 * The app is optimized for:
 * - Fast API calls with axios
 * - Efficient audio handling
 * - Minimal re-renders
 * - Smooth animations
 * - Low memory usage
 * - Battery efficiency
 */

export default null; // This is just documentation
