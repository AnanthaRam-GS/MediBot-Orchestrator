"""
Main Voice Recognition Engine for Healthcare Robot
Orchestrates the complete voice interaction workflow
"""

import os
import sys
import time
import signal
import threading
from typing import Optional, Dict, Any

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from speech_input import SpeechInput
from intent_parser import IntentParser
from router import Router
from tts_output import TTSOutput
from conversation_memory import ConversationMemory
from utils.gpio_manager import GPIOManager
from utils.logger import Logger

class VoiceEngine:
    """
    Main Voice Recognition Engine for Healthcare Robot
    Coordinates speech input, intent parsing, routing, and TTS output
    """
    
    def __init__(self):
        """Initialize the voice recognition engine"""
        self.logger = Logger()
        self.running = False
        self.processing = False
        
        # Initialize components
        self.speech_input = None
        self.intent_parser = None
        self.router = None
        self.tts_output = None
        self.gpio_manager = None
        self.memory = None
        
        # Statistics
        self.stats = {
            'total_interactions': 0,
            'successful_interactions': 0,
            'failed_interactions': 0,
            'start_time': time.time()
        }
        
        # Initialize all components
        self._initialize_components()
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _initialize_components(self):
        """Initialize all voice engine components"""
        try:
            self.logger.log("INFO", "Initializing Voice Recognition Engine components...")
            
            # Initialize speech input
            self.speech_input = SpeechInput()
            self.logger.log("INFO", "Speech input module initialized")
            
            # Initialize intent parser
            self.intent_parser = IntentParser()
            self.logger.log("INFO", "Intent parser module initialized")
            
            # Initialize router
            self.router = Router()
            self.logger.log("INFO", "Router module initialized")
            
            # Initialize TTS output
            self.tts_output = TTSOutput()
            self.logger.log("INFO", "TTS output module initialized")
            
            # Initialize conversation memory
            self.memory = ConversationMemory()
            self.logger.log("INFO", "Conversation memory module initialized")
            
            # Initialize GPIO manager
            self.gpio_manager = GPIOManager()
            self.gpio_manager.set_button_callback(self._button_pressed_callback)
            self.logger.log("INFO", "GPIO manager initialized")
            
            # Test components
            self._run_component_tests()
            
            self.logger.log("INFO", "All components initialized successfully")
            
        except Exception as e:
            self.logger.log_error_with_context(e, "Component initialization")
            raise
    
    def _run_component_tests(self):
        """Run basic tests on all components"""
        self.logger.log("INFO", "Running component tests...")
        
        # Test microphone
        if not self.speech_input.test_microphone():
            self.logger.log("WARNING", "Microphone test failed")
        
        # Test TTS
        if not self.tts_output.test_tts():
            self.logger.log("WARNING", "TTS test failed")
        
        # Test LEDs
        self.gpio_manager.test_leds()
        
        self.logger.log("INFO", "Component tests completed")
    
    def _button_pressed_callback(self):
        """Callback function for button press events"""
        if not self.processing:
            self.logger.log("INFO", "Button pressed - starting voice interaction")
            self._process_voice_interaction()
        else:
            self.logger.log("INFO", "Button pressed while processing - ignoring")
    
    def _process_voice_interaction(self):
        """Process a complete voice interaction"""
        if self.processing:
            return
        
        self.processing = True
        self.stats['total_interactions'] += 1
        
        interaction_start_time = time.time()
        transcript = None
        language_code = None
        intent_data = None
        response = None
        
        try:
            # Step 1: Listening - Yellow LED
            self.gpio_manager.set_led_state('listening')
            self.logger.log("INFO", "🎤 Listening for speech...")
            
            # Get speech input
            transcript, language_code = self.speech_input.get_speech_input()
            
            if not transcript:
                self._handle_no_speech_detected()
                return
            
            # Step 2: Processing - Blue LED
            self.gpio_manager.set_led_state('processing')
            self.logger.log("INFO", f"🧠 Processing speech: '{transcript}' (Language: {language_code})")
            
            # Get conversation context from memory
            conversation_context = self.memory.get_conversation_context()
            
            # Parse intent with context if using Gemini handler
            if hasattr(self.intent_parser, 'classify_and_respond'):
                # Using Gemini AI handler
                intent_data = self.intent_parser.classify_and_respond(
                    transcript, 
                    language_code,
                    conversation_context
                )
            else:
                # Using traditional intent parser
                intent_data = self.intent_parser.parse_intent(transcript)
            
            self.logger.log("INFO", f"📝 Intent detected: {intent_data['intent']} (Confidence: {intent_data['confidence']:.3f})")
            
            # Route to appropriate handler
            response = self.router.route_intent(intent_data)
            
            # Step 3: Speaking - Green LED
            self.gpio_manager.set_led_state('speaking')
            self.logger.log("INFO", f"🗣️ Speaking response...")
            
            # Special handling for emergency
            if intent_data['intent'] == 'emergency':
                self.gpio_manager.emergency_signal()
                success = self.tts_output.speak_emergency(response)
            else:
                success = self.tts_output.speak_with_confirmation(response, language_code)
            
            if success:
                self.stats['successful_interactions'] += 1
                self.logger.log_speech_interaction(
                    transcript, intent_data['intent'], response,
                    intent_data['confidence'], language_code
                )
                
                # Save interaction to memory
                self.memory.add_conversation_turn(
                    user_input=transcript,
                    bot_response=response,
                    intent=intent_data['intent'],
                    language=language_code,
                    metadata={
                        'confidence': intent_data['confidence'],
                        'priority': intent_data.get('priority', 'normal'),
                        'entities': intent_data.get('entities', {}),
                        'interaction_time': time.time() - interaction_start_time
                    }
                )
                self.logger.log("INFO", "💾 Interaction saved to memory")
                
            else:
                self._handle_tts_failure(response)
            
        except Exception as e:
            self.logger.log_error_with_context(e, "Voice interaction processing")
            self._handle_processing_error()
        
        finally:
            # Clear LED state
            self.gpio_manager.set_led_state('off')
            self.processing = False
            
            # Log interaction timing
            interaction_time = time.time() - interaction_start_time
            self.logger.log("INFO", f"⏱️ Interaction completed in {interaction_time:.2f} seconds")
    
    def _handle_no_speech_detected(self):
        """Handle case when no speech is detected"""
        self.logger.log("WARNING", "No speech detected")
        self.gpio_manager.led_blink('listening', times=2)
        
        response = "I didn't hear anything. Please press the button and speak clearly."
        self.tts_output.speak(response)
        
        self.stats['failed_interactions'] += 1
        self.processing = False
    
    def _handle_tts_failure(self, response: str):
        """Handle TTS failure"""
        self.logger.log("ERROR", "TTS failed - displaying text response")
        print(f"\n[ROBOT RESPONSE]: {response}\n")
        
        # Blink LED to indicate issue
        self.gpio_manager.led_blink('speaking', times=3, interval=0.2)
        
        self.stats['failed_interactions'] += 1
    
    def _handle_processing_error(self):
        """Handle general processing errors"""
        self.logger.log("ERROR", "Processing error occurred")
        
        error_response = "I apologize, but I encountered an error. Please try again or speak to our staff."
        self.tts_output.speak(error_response)
        
        # Blink all LEDs to indicate error
        self.gpio_manager.led_blink('processing', times=5, interval=0.1)
        
        self.stats['failed_interactions'] += 1
        self.processing = False
    
    def start(self):
        """Start the voice recognition engine"""
        self.logger.log("INFO", "🚀 Starting Voice Recognition Engine...")
        self.running = True
        
        # Welcome announcement
        welcome_message = "Voice Recognition Engine started. Press the button to begin speaking."
        self.tts_output.speak(welcome_message)
        
        # Main loop
        try:
            self._main_loop()
        except KeyboardInterrupt:
            self.logger.log("INFO", "Keyboard interrupt received")
        except Exception as e:
            self.logger.log_error_with_context(e, "Main loop")
        finally:
            self.stop()
    
    def _main_loop(self):
        """Main event loop"""
        self.logger.log("INFO", "Voice engine is ready. Press the button to start speaking...")
        
        # Show system status periodically
        last_status_time = time.time()
        status_interval = 300  # 5 minutes
        
        while self.running:
            try:
                # Check for periodic status updates
                current_time = time.time()
                if current_time - last_status_time > status_interval:
                    self._log_system_status()
                    last_status_time = current_time
                
                # Clean up old queue entries
                self.router.clear_old_queue_entries()
                
                # Sleep to prevent busy waiting
                time.sleep(1)
                
            except Exception as e:
                self.logger.log_error_with_context(e, "Main loop iteration")
                time.sleep(5)  # Wait before retrying
    
    def _log_system_status(self):
        """Log current system status"""
        uptime = time.time() - self.stats['start_time']
        
        system_status = {
            'uptime_minutes': round(uptime / 60, 2),
            'total_interactions': self.stats['total_interactions'],
            'successful_interactions': self.stats['successful_interactions'],
            'failed_interactions': self.stats['failed_interactions'],
            'success_rate': (self.stats['successful_interactions'] / 
                           max(1, self.stats['total_interactions']) * 100),
            'router_status': self.router.get_system_status(),
            'currently_processing': self.processing
        }
        
        self.logger.log_system_stats(system_status)
    
    def stop(self):
        """Stop the voice recognition engine"""
        self.logger.log("INFO", "🛑 Stopping Voice Recognition Engine...")
        self.running = False
        
        # Final status log
        self._log_system_status()
        
        # Cleanup components
        try:
            if self.gpio_manager:
                self.gpio_manager.cleanup()
            
            if self.tts_output:
                self.tts_output.cleanup()
            
            self.logger.log("INFO", "Voice Recognition Engine stopped successfully")
            
        except Exception as e:
            self.logger.log_error_with_context(e, "Engine shutdown")
        
        finally:
            # Close logging session
            self.logger.close_session()
    
    def _signal_handler(self, signum, frame):
        """Handle system signals for graceful shutdown"""
        self.logger.log("INFO", f"Signal {signum} received - initiating shutdown")
        self.running = False
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get current engine statistics"""
        uptime = time.time() - self.stats['start_time']
        
        return {
            'uptime_seconds': round(uptime, 2),
            'total_interactions': self.stats['total_interactions'],
            'successful_interactions': self.stats['successful_interactions'],
            'failed_interactions': self.stats['failed_interactions'],
            'success_rate_percent': round(
                (self.stats['successful_interactions'] / 
                 max(1, self.stats['total_interactions']) * 100), 2
            ),
            'interactions_per_minute': round(
                self.stats['total_interactions'] / max(1, uptime / 60), 2
            ),
            'currently_processing': self.processing,
            'engine_running': self.running
        }
    
    def simulate_interaction(self, test_text: str) -> Dict[str, Any]:
        """
        Simulate voice interaction for testing (without audio input)
        
        Args:
            test_text: Text to process as if it came from speech input
            
        Returns:
            Interaction result data
        """
        self.logger.log("INFO", f"Simulating interaction with text: '{test_text}'")
        
        try:
            # Parse intent
            intent_data = self.intent_parser.parse_intent(test_text)
            
            # Route to handler
            response = self.router.route_intent(intent_data)
            
            # Log the interaction
            self.logger.log_speech_interaction(
                test_text, intent_data['intent'], response,
                intent_data['confidence'], 'en-IN'
            )
            
            result = {
                'transcript': test_text,
                'intent_data': intent_data,
                'response': response,
                'success': True
            }
            
            print(f"\n[SIMULATION RESULT]")
            print(f"Input: {test_text}")
            print(f"Intent: {intent_data['intent']} (Confidence: {intent_data['confidence']:.3f})")
            print(f"Response: {response}\n")
            
            return result
            
        except Exception as e:
            self.logger.log_error_with_context(e, "Simulation")
            return {
                'transcript': test_text,
                'error': str(e),
                'success': False
            }
    
    def reset_patient_memory(self):
        """
        Reset patient memory for a new patient
        """
        self.logger.log("INFO", "Resetting patient memory for new patient")
        self.memory.reset_patient_memory()
        self.logger.log("INFO", "Patient memory reset completed")
    
    def get_patient_info(self) -> Dict[str, Any]:
        """
        Get current patient information
        
        Returns:
            Dictionary with patient information
        """
        return self.memory.get_patient_info()
    
    def get_conversation_history(self, limit: int = 10) -> list:
        """
        Get recent conversation history
        
        Args:
            limit: Number of recent interactions to return
            
        Returns:
            List of recent conversation turns
        """
        history = self.memory.get_conversation_history()
        return history[-limit:] if history else []
    
    def get_memory_insights(self) -> Dict[str, Any]:
        """
        Get conversation memory insights and statistics
        
        Returns:
            Dictionary with memory insights
        """
        return self.memory.get_conversation_insights()

def main():
    """Main entry point"""
    print("=" * 60)
    print("  HEALTHCARE VOICE RECOGNITION ENGINE")
    print("=" * 60)
    print()
    
    # Check for required environment variables
    if not os.getenv('SARVAM_API_KEY'):
        print("❌ ERROR: SARVAM_API_KEY environment variable not set")
        print("Please set your Sarvam API key:")
        print("export SARVAM_API_KEY=your_api_key_here")
        sys.exit(1)
    
    try:
        # Create and start voice engine
        engine = VoiceEngine()
        
        # Interactive mode for testing
        if len(sys.argv) > 1 and sys.argv[1] == '--test':
            print("🧪 Running in test mode...")
            print("Enter text to simulate voice interactions (type 'quit' to exit):")
            print()
            
            while True:
                try:
                    test_input = input("Test Input: ").strip()
                    if test_input.lower() in ['quit', 'exit', 'q']:
                        break
                    if test_input:
                        engine.simulate_interaction(test_input)
                except KeyboardInterrupt:
                    break
        else:
            # Normal operation
            engine.start()
    
    except Exception as e:
        print(f"❌ Failed to start voice engine: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()