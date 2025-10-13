"""
PC Voice Recognition Test - Multilingual version with Sarvam Translation and TTS
Automatically listens for speech when you press Enter and responds in the same language
"""

import os
import sys
import time

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from speech_input import SpeechInput
from intent_parser import IntentParser
from router import Router
from translator import Translator
from sarvam_tts import SarvamTTS

def main():
    print("=" * 60)
    print("  MULTILINGUAL VOICE RECOGNITION - PC TEST")
    print("=" * 60)
    print()
    
    # Check for API key
    if not os.getenv('SARVAM_API_KEY'):
        print("❌ ERROR: SARVAM_API_KEY environment variable not set")
        sys.exit(1)
    
    try:
        # Initialize components
        print("🎤 Initializing multilingual voice recognition components...")
        speech_input = SpeechInput()
        intent_parser = IntentParser()
        router = Router()
        translator = Translator()
        tts_output = SarvamTTS()
        
        print("✅ All components ready!")
        print()
        print("📋 Instructions:")
        print("1. Press ENTER to start listening")
        print("2. Speak clearly in ANY LANGUAGE for 5 seconds")
        print("3. View the transcript, translation, and hear response in your language")
        print("4. Type 'quit' to exit")
        print()
        print("🌍 Supported Languages:")
        supported_langs = translator.get_supported_languages()
        for code, name in supported_langs.items():
            print(f"   {name} ({code})")
        print()
        
        while True:
            try:
                user_input = input("Press ENTER to listen (or 'quit' to exit): ").strip()
                
                if user_input.lower() in ['quit', 'exit', 'q']:
                    break
                
                print("\n🎤 [LISTENING] Speak now for 5 seconds in ANY language...")
                print("🟡 LISTENING...")
                
                # Get speech input
                transcript, detected_language = speech_input.get_speech_input()
                
                if transcript:
                    print(f"🔵 PROCESSING...")
                    print(f"📝 TRANSCRIPT: '{transcript}'")
                    print(f"🌍 DETECTED LANGUAGE: {detected_language}")
                    
                    # Parse intent (works on the original transcript)
                    intent_data = intent_parser.parse_intent(transcript)
                    print(f"🧠 INTENT: {intent_data['intent']} (Confidence: {intent_data['confidence']:.3f})")
                    
                    # Get response in English
                    english_response = router.route_intent(intent_data)
                    print(f"🗣️ ENGLISH RESPONSE: {english_response}")
                    
                    # Translate response to user's language (if not English)
                    if detected_language != 'en-IN':
                        print(f"🔄 TRANSLATING to {detected_language}...")
                        translated_response = translator.translate_text(
                            english_response, 
                            target_language=detected_language,
                            source_language='en-IN'
                        )
                        print(f"🌍 TRANSLATED RESPONSE: {translated_response}")
                        final_response = translated_response
                    else:
                        final_response = english_response
                    
                    # Speak response in user's language
                    print(f"🟢 SPEAKING in {detected_language}...")
                    success = tts_output.speak(final_response, detected_language)
                    
                    if not success:
                        print("❌ TTS failed - check audio configuration")
                    else:
                        print("✅ Response spoken successfully!")
                    
                else:
                    print("❌ No speech detected or API error")
                
                print("\n" + "="*50 + "\n")
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"❌ Error: {str(e)}")
                import traceback
                traceback.print_exc()
    
    except Exception as e:
        print(f"❌ Failed to initialize: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup
        try:
            if 'tts_output' in locals():
                tts_output.cleanup()
        except:
            pass
    
    print("\n👋 Multilingual voice recognition stopped.")

if __name__ == "__main__":
    main()