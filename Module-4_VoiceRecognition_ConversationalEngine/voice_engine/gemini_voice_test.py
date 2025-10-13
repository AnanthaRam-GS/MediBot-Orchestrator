"""
Advanced Multilingual Voice Recognition with Gemini AI
Uses Gemini for intent classification and Sarvam for translation/TTS
"""

import os
import sys
import time

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from speech_input import SpeechInput
from gemini_handler import GeminiHandler
from translator import Translator
from sarvam_tts import SarvamTTS
from conversation_memory import ConversationMemory

def main():
    print("=" * 60)
    print("  ADVANCED MULTILINGUAL VOICE RECOGNITION")
    print("  Powered by Gemini AI + Sarvam APIs")
    print("=" * 60)
    print()
    
    # Check for API keys
    missing_keys = []
    if not os.getenv('SARVAM_API_KEY'):
        missing_keys.append('SARVAM_API_KEY')
    if not os.getenv('GEMINI_API_KEY'):
        missing_keys.append('GEMINI_API_KEY')
    
    if missing_keys:
        print(f"❌ ERROR: Missing environment variables: {', '.join(missing_keys)}")
        print("\nPlease set your API keys:")
        print("$env:SARVAM_API_KEY=\"your_sarvam_key\"")
        print("$env:GEMINI_API_KEY=\"your_gemini_key\"")
        sys.exit(1)
    
    try:
        # Initialize components
        print("🤖 Initializing AI-powered voice recognition...")
        speech_input = SpeechInput()
        gemini_handler = GeminiHandler()
        translator = Translator()
        tts = SarvamTTS()
        memory = ConversationMemory()
        
        print("✅ All AI components ready!")
        print("💾 Conversation memory initialized!")
        print()
        print("🧠 Available Intent Classifications:")
        intents = gemini_handler.get_available_intents()
        for i, intent in enumerate(intents, 1):
            print(f"   {i:2d}. {intent}")
        
        print()
        print("📋 Instructions:")
        print("1. Press ENTER to start listening")
        print("2. Speak in ANY language for 5 seconds")
        print("3. Gemini AI will classify intent and respond")
        print("4. Response will be translated and spoken in your language")
        print("5. Type 'quit' to exit")
        print("6. Type 'reset' to clear patient memory")
        print("7. Type 'memory' to view conversation history")
        print("8. Type 'patient' to view patient information")
        print()
        
        interaction_count = 0
        
        while True:
            try:
                user_input = input("Press ENTER to listen (or type command): ").strip()
                
                if user_input.lower() in ['quit', 'exit', 'q']:
                    break
                elif user_input.lower() == 'reset':
                    print("🔄 Resetting patient memory...")
                    memory.reset_patient_memory()
                    print("✅ Patient memory cleared! Ready for new patient.")
                    continue
                elif user_input.lower() == 'memory':
                    print("📝 Conversation History:")
                    history = memory.get_conversation_history()
                    if history:
                        for i, entry in enumerate(history[-5:], 1):  # Show last 5
                            print(f"   {i}. User: {entry['transcript']}")
                            print(f"      Bot: {entry['response'][:80]}...")
                    else:
                        print("   No conversation history yet.")
                    continue
                elif user_input.lower() == 'patient':
                    print("👤 Patient Information:")
                    patient_info = memory.get_patient_info()
                    if patient_info.get('name'):
                        print(f"   Name: {patient_info['name']}")
                        if patient_info.get('preferred_language'):
                            print(f"   Preferred Language: {patient_info['preferred_language']}")
                        if patient_info.get('patient_id'):
                            print(f"   Patient ID: {patient_info['patient_id']}")
                        if patient_info.get('last_interaction'):
                            import datetime
                            last_time = datetime.datetime.fromtimestamp(patient_info['last_interaction'])
                            print(f"   Last Activity: {last_time.strftime('%Y-%m-%d %H:%M:%S')}")
                        
                        # Show conversation stats
                        history = memory.get_conversation_history()
                        print(f"   Total Interactions: {len(history)}")
                        
                        if patient_info.get('medical_needs'):
                            print(f"   Medical Needs: {', '.join(patient_info['medical_needs'])}")
                    else:
                        print("   No patient information stored yet.")
                    continue
                
                interaction_count += 1
                print(f"\n🎤 [INTERACTION #{interaction_count}] Speak now for 5 seconds...")
                print("🟡 LISTENING...")
                
                # Step 1: Get speech input
                transcript, language_code = speech_input.get_speech_input()
                
                if transcript:
                    print(f"🔵 PROCESSING WITH GEMINI AI...")
                    print(f"📝 TRANSCRIPT: '{transcript}'")
                    print(f"🌍 DETECTED LANGUAGE: {language_code}")
                    
                    # Step 2: Get conversation context from memory
                    conversation_context = memory.get_conversation_context()
                    
                    # Step 3: AI classification and response with context
                    ai_result = gemini_handler.classify_and_respond(
                        transcript, 
                        language_code,
                        conversation_context
                    )
                    
                    print(f"🧠 GEMINI CLASSIFICATION:")
                    print(f"   Intent: {ai_result['intent']}")
                    print(f"   Confidence: {ai_result['confidence']}")
                    print(f"   Priority: {ai_result.get('priority', 'normal')}")
                    if ai_result.get('entities'):
                        print(f"   Entities: {ai_result['entities']}")
                    
                    english_response = ai_result['response']
                    print(f"🗣️ ENGLISH RESPONSE: {english_response}")
                    
                    # Step 3: Translate if needed
                    if language_code != 'en-IN':
                        print(f"🔄 TRANSLATING TO {language_code}...")
                        translated_response = translator.translate_text(
                            english_response, 
                            target_language=language_code,
                            source_language='en-IN'
                        )
                        
                        if translated_response:
                            final_response = translated_response
                            print(f"🌐 TRANSLATED RESPONSE: {final_response}")
                        else:
                            final_response = english_response
                            print("⚠️ Translation failed, using English response")
                    else:
                        final_response = english_response
                    
                    # Step 4: Generate and play speech
                    print("🟢 GENERATING SPEECH...")
                    
                    # Handle emergency priority
                    if ai_result.get('priority') == 'urgent':
                        print("🚨 EMERGENCY DETECTED - PRIORITY RESPONSE")
                    
                    success = tts.speak(final_response, language_code)
                    
                    if success:
                        print("✅ Speech completed successfully!")
                    else:
                        print("❌ TTS failed, showing text response:")
                        print(f"RESPONSE: {final_response}")
                    
                    # Show summary
                    print(f"\n📊 INTERACTION SUMMARY:")
                    print(f"   Input Language: {language_code}")
                    print(f"   Intent: {ai_result['intent']}")
                    print(f"   AI Confidence: {ai_result['confidence']}")
                    print(f"   Response Language: {language_code}")
                    print(f"   Processing: Speech→Gemini→Translation→TTS")
                    
                    # Step 5: Save interaction to memory
                    memory.add_conversation_turn(
                        user_input=transcript,
                        bot_response=final_response,
                        intent=ai_result['intent'],
                        language=language_code,
                        metadata={
                            'confidence': ai_result['confidence'],
                            'priority': ai_result.get('priority', 'normal'),
                            'entities': ai_result.get('entities', {})
                        }
                    )
                    
                    # Check if patient name was mentioned for the first time
                    entities = ai_result.get('entities', {})
                    current_patient = memory.get_patient_info()
                    
                    # Simple name extraction from transcript if no name stored yet
                    if not current_patient.get('name'):
                        # Look for common patterns: "I am [name]", "My name is [name]", "I'm [name]"
                        import re
                        name_patterns = [
                            r'(?:i am|my name is|i\'m|call me)\s+([a-zA-Z\s]{2,30})',
                            r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:here|speaking)',
                        ]
                        
                        for pattern in name_patterns:
                            match = re.search(pattern, transcript, re.IGNORECASE)
                            if match:
                                potential_name = match.group(1).strip().title()
                                # Basic validation - avoid common false positives
                                if (len(potential_name.split()) <= 3 and 
                                    potential_name.lower() not in ['help', 'please', 'thank you', 'pain', 'doctor', 'nurse']):
                                    memory.update_patient_info(name=potential_name)
                                    print(f"👤 Patient name detected and saved: {potential_name}")
                                    break
                        
                        # Also check entities from AI response
                        if 'name' in entities:
                            memory.update_patient_info(name=entities['name'])
                            print(f"👤 Patient name saved from AI: {entities['name']}")
                    
                    print("💾 Interaction saved to memory")
                    
                else:
                    print("❌ No speech detected or API error")
                
                print("\n" + "="*60 + "\n")
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"❌ Error in interaction: {str(e)}")
                print("Continuing with next interaction...\n")
    
    except Exception as e:
        print(f"❌ Failed to initialize: {str(e)}")
    
    print(f"\n👋 Voice recognition stopped after {interaction_count} interactions.")

if __name__ == "__main__":
    main()