"""
Text-to-Speech Output Module for Healthcare Voice Recognition Engine
Handles speech synthesis using lightweight offline TTS engines
"""

import pyttsx3
import time
from typing import Optional
from utils.logger import Logger

class TTSOutput:
    """
    Handles text-to-speech output with healthcare-appropriate voice settings
    Designed for clear, slow, and polite speech suitable for hospital patients
    """
    
    def __init__(self):
        """Initialize TTS engine with healthcare-optimized settings"""
        self.logger = Logger()
        self.engine = None
        self._initialize_engine()
        
        # Language code mapping for prefixes
        self.language_names = {
            'hi-IN': 'Hindi',
            'en-IN': 'English',
            'ta-IN': 'Tamil',
            'te-IN': 'Telugu',
            'bn-IN': 'Bengali',
            'mr-IN': 'Marathi',
            'gu-IN': 'Gujarati',
            'kn-IN': 'Kannada',
            'ml-IN': 'Malayalam',
            'pa-IN': 'Punjabi',
            'or-IN': 'Odia',
            'as-IN': 'Assamese'
        }
    
    def _initialize_engine(self) -> bool:
        """
        Initialize the pyttsx3 TTS engine with optimal settings
        
        Returns:
            True if initialization successful, False otherwise
        """
        try:
            self.engine = pyttsx3.init()
            
            # Set voice properties for healthcare scenarios
            self._configure_voice_properties()
            
            self.logger.log("INFO", "TTS engine initialized successfully")
            return True
            
        except Exception as e:
            self.logger.log("ERROR", f"Failed to initialize TTS engine: {str(e)}")
            return False
    
    def _configure_voice_properties(self):
        """Configure voice properties for clear, polite healthcare communication"""
        try:
            # Get available voices
            voices = self.engine.getProperty('voices')
            
            # Prefer female voice if available (often perceived as more comforting)
            selected_voice = None
            for voice in voices:
                if 'female' in voice.name.lower() or 'woman' in voice.name.lower():
                    selected_voice = voice.id
                    break
            
            # If no female voice, use the first available voice
            if not selected_voice and voices:
                selected_voice = voices[0].id
            
            if selected_voice:
                self.engine.setProperty('voice', selected_voice)
                self.logger.log("INFO", f"Selected voice: {selected_voice}")
            
            # Set speech rate (slower for better comprehension)
            # Default is usually around 200, we'll use 150 for clarity
            self.engine.setProperty('rate', 150)
            
            # Set volume (0.0 to 1.0)
            self.engine.setProperty('volume', 0.9)
            
            self.logger.log("INFO", "Voice properties configured for healthcare use")
            
        except Exception as e:
            self.logger.log("WARNING", f"Could not configure all voice properties: {str(e)}")
    
    def speak(self, text: str, language_code: str = 'en-IN') -> bool:
        """
        Convert text to speech and play it
        
        Args:
            text: Text to be spoken
            language_code: Language code from STT (for prefixing if not English)
            
        Returns:
            True if speech was successful, False otherwise
        """
        if not text or not text.strip():
            self.logger.log("WARNING", "Empty text provided for TTS")
            return False
        
        if not self.engine:
            self.logger.log("ERROR", "TTS engine not initialized")
            return False
        
        try:
            # Prepare text for speaking
            speech_text = self._prepare_speech_text(text, language_code)
            
            self.logger.log("INFO", f"Speaking: {speech_text[:50]}...")
            
            # Speak the text
            self.engine.say(speech_text)
            self.engine.runAndWait()
            
            self.logger.log("INFO", "Speech completed successfully")
            return True
            
        except Exception as e:
            self.logger.log("ERROR", f"Error during speech synthesis: {str(e)}")
            return False
    
    def _prepare_speech_text(self, text: str, language_code: str) -> str:
        """
        Prepare text for speech synthesis
        
        Args:
            text: Original text
            language_code: Language code from STT
            
        Returns:
            Formatted text ready for TTS
        """
        # Clean the text
        clean_text = text.strip()
        
        # Add language prefix for non-English text
        if language_code != 'en-IN' and language_code in self.language_names:
            language_name = self.language_names[language_code]
            clean_text = f"In {language_name}: {clean_text}"
        
        # Add polite healthcare touches
        clean_text = self._add_healthcare_politeness(clean_text)
        
        return clean_text
    
    def _add_healthcare_politeness(self, text: str) -> str:
        """
        Add healthcare-appropriate politeness to responses
        
        Args:
            text: Original response text
            
        Returns:
            Politely formatted text
        """
        # Don't modify if already starts with polite words
        polite_starters = ['please', 'thank you', 'hello', 'welcome', 'i apologize', 'excuse me']
        
        if any(text.lower().startswith(starter) for starter in polite_starters):
            return text
        
        # Add appropriate politeness based on content
        if 'emergency' in text.lower():
            return text  # Keep emergency messages direct
        elif 'error' in text.lower() or 'sorry' in text.lower():
            return text  # Already has appropriate tone
        else:
            # Add gentle prefix for regular responses
            return f"Please note: {text}"
    
    def speak_with_confirmation(self, text: str, language_code: str = 'en-IN') -> bool:
        """
        Speak text and add a brief pause for patient comprehension
        
        Args:
            text: Text to be spoken
            language_code: Language code from STT
            
        Returns:
            True if speech was successful, False otherwise
        """
        success = self.speak(text, language_code)
        
        if success:
            # Brief pause for comprehension
            time.sleep(0.5)
        
        return success
    
    def speak_emergency(self, text: str) -> bool:
        """
        Speak emergency messages with higher priority and urgency
        
        Args:
            text: Emergency message text
            
        Returns:
            True if speech was successful, False otherwise
        """
        if not self.engine:
            return False
        
        try:
            # Temporarily increase speech rate for urgency
            original_rate = self.engine.getProperty('rate')
            self.engine.setProperty('rate', 180)  # Slightly faster for urgency
            
            # Speak the emergency message
            success = self.speak(text, 'en-IN')
            
            # Restore original rate
            self.engine.setProperty('rate', original_rate)
            
            return success
            
        except Exception as e:
            self.logger.log("ERROR", f"Error during emergency speech: {str(e)}")
            return False
    
    def test_tts(self) -> bool:
        """
        Test TTS functionality
        
        Returns:
            True if TTS is working, False otherwise
        """
        test_message = "TTS system test. Hello, welcome to our hospital."
        return self.speak(test_message)
    
    def get_available_voices(self) -> list:
        """
        Get list of available voices on the system
        
        Returns:
            List of available voice information
        """
        if not self.engine:
            return []
        
        try:
            voices = self.engine.getProperty('voices')
            voice_info = []
            
            for voice in voices:
                voice_info.append({
                    'id': voice.id,
                    'name': voice.name,
                    'age': getattr(voice, 'age', 'Unknown'),
                    'gender': getattr(voice, 'gender', 'Unknown')
                })
            
            return voice_info
            
        except Exception as e:
            self.logger.log("ERROR", f"Error getting voice information: {str(e)}")
            return []
    
    def set_voice_by_name(self, voice_name: str) -> bool:
        """
        Set TTS voice by name
        
        Args:
            voice_name: Name of the voice to use
            
        Returns:
            True if voice was set successfully, False otherwise
        """
        if not self.engine:
            return False
        
        try:
            voices = self.engine.getProperty('voices')
            
            for voice in voices:
                if voice_name.lower() in voice.name.lower():
                    self.engine.setProperty('voice', voice.id)
                    self.logger.log("INFO", f"Voice changed to: {voice.name}")
                    return True
            
            self.logger.log("WARNING", f"Voice '{voice_name}' not found")
            return False
            
        except Exception as e:
            self.logger.log("ERROR", f"Error setting voice: {str(e)}")
            return False
    
    def adjust_speech_rate(self, rate: int) -> bool:
        """
        Adjust speech rate
        
        Args:
            rate: Speech rate (typical range: 100-300)
            
        Returns:
            True if rate was set successfully, False otherwise
        """
        if not self.engine:
            return False
        
        try:
            # Validate rate range
            rate = max(50, min(400, rate))  # Clamp between 50-400
            
            self.engine.setProperty('rate', rate)
            self.logger.log("INFO", f"Speech rate set to: {rate}")
            return True
            
        except Exception as e:
            self.logger.log("ERROR", f"Error setting speech rate: {str(e)}")
            return False
    
    def cleanup(self):
        """Clean up TTS engine resources"""
        if self.engine:
            try:
                self.engine.stop()
                self.logger.log("INFO", "TTS engine stopped")
            except Exception as e:
                self.logger.log("WARNING", f"Error stopping TTS engine: {str(e)}")
        
        self.engine = None