"""
Sarvam Text-to-Speech Module for Voice Recognition Engine
Handles multilingual speech synthesis using Sarvam API
"""

import os
import requests
import base64
import io
import time
import tempfile
from typing import Optional
import pygame
from utils.logger import Logger

class SarvamTTS:
    """
    Handles text-to-speech using Sarvam API for multilingual support
    Falls back to local pyttsx3 for unsupported languages
    """
    
    def __init__(self):
        """Initialize Sarvam TTS with API credentials"""
        self.logger = Logger()
        self.api_key = os.getenv('SARVAM_API_KEY')
        self.tts_url = "https://api.sarvam.ai/text-to-speech"
        
        if not self.api_key:
            raise ValueError("SARVAM_API_KEY environment variable not set")
        
        # Initialize pygame mixer for audio playback
        try:
            pygame.mixer.init()
            self.pygame_available = True
            self.logger.log("INFO", "Pygame mixer initialized for audio playback")
        except Exception as e:
            self.logger.log("WARNING", f"Pygame mixer initialization failed: {str(e)}")
            self.pygame_available = False
        
        # Fallback to pyttsx3 for unsupported languages
        try:
            import pyttsx3
            self.fallback_engine = pyttsx3.init()
            self._configure_fallback_voice()
            self.fallback_available = True
            self.logger.log("INFO", "Fallback TTS engine (pyttsx3) initialized")
        except Exception as e:
            self.logger.log("WARNING", f"Fallback TTS engine initialization failed: {str(e)}")
            self.fallback_available = False
        
        self.logger.log("INFO", "Sarvam TTS initialized")
    
    def _configure_fallback_voice(self):
        """Configure fallback voice properties"""
        try:
            if self.fallback_engine:
                # Set slower rate for better comprehension
                self.fallback_engine.setProperty('rate', 150)
                # Set volume
                self.fallback_engine.setProperty('volume', 0.9)
        except Exception as e:
            self.logger.log("WARNING", f"Could not configure fallback voice: {str(e)}")
    
    def speak_with_sarvam(self, text: str, language_code: str, max_retries: int = 2) -> bool:
        """
        Convert text to speech using Sarvam API
        
        Args:
            text: Text to convert to speech
            language_code: Target language code
            max_retries: Maximum number of retry attempts
            
        Returns:
            True if speech was successful, False otherwise
        """
        if not self.pygame_available:
            self.logger.log("WARNING", "Pygame not available - falling back to local TTS")
            return self._speak_with_fallback(text, language_code)
        
        headers = {
            'api-subscription-key': self.api_key,
            'Content-Type': 'application/json'
        }
        
        payload = {
            'text': text,
            'target_language_code': language_code
        }
        
        for attempt in range(max_retries + 1):
            try:
                self.logger.log("INFO", f"Converting text to speech via Sarvam API (attempt {attempt + 1})")
                
                response = requests.post(
                    self.tts_url,
                    headers=headers,
                    json=payload,
                    timeout=15
                )
                
                if response.status_code == 200:
                    result = response.json()
                    audios = result.get('audios', [])
                    
                    if audios and len(audios) > 0:
                        # Decode base64 audio data
                        audio_base64 = audios[0]
                        audio_bytes = base64.b64decode(audio_base64)
                        
                        # Play audio
                        success = self._play_audio_bytes(audio_bytes)
                        
                        if success:
                            self.logger.log("INFO", f"Sarvam TTS successful for language: {language_code}")
                            return True
                        else:
                            self.logger.log("ERROR", "Failed to play audio from Sarvam TTS")
                    else:
                        self.logger.log("WARNING", "No audio data received from Sarvam TTS")
                else:
                    self.logger.log("ERROR", f"Sarvam TTS API error: {response.status_code} - {response.text}")
                    
            except requests.exceptions.Timeout:
                self.logger.log("WARNING", f"Sarvam TTS API timeout on attempt {attempt + 1}")
            except requests.exceptions.RequestException as e:
                self.logger.log("ERROR", f"Sarvam TTS request error: {str(e)}")
            except Exception as e:
                self.logger.log("ERROR", f"Unexpected Sarvam TTS error: {str(e)}")
            
            if attempt < max_retries:
                time.sleep(1)  # Wait before retry
        
        self.logger.log("WARNING", "Sarvam TTS failed - falling back to local TTS")
        return self._speak_with_fallback(text, language_code)
    
    def _play_audio_bytes(self, audio_bytes: bytes) -> bool:
        """
        Play audio from bytes using pygame
        
        Args:
            audio_bytes: Audio data as bytes
            
        Returns:
            True if playback successful, False otherwise
        """
        try:
            # Create temporary file for audio
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                temp_file.write(audio_bytes)
                temp_filename = temp_file.name
            
            # Load and play audio
            pygame.mixer.music.load(temp_filename)
            pygame.mixer.music.play()
            
            # Wait for playback to complete
            while pygame.mixer.music.get_busy():
                time.sleep(0.1)
            
            # Clean up temporary file
            try:
                os.unlink(temp_filename)
            except Exception:
                pass  # Ignore cleanup errors
            
            return True
            
        except Exception as e:
            self.logger.log("ERROR", f"Error playing audio: {str(e)}")
            return False
    
    def _speak_with_fallback(self, text: str, language_code: str) -> bool:
        """
        Speak using fallback pyttsx3 engine
        
        Args:
            text: Text to speak
            language_code: Language code (for logging)
            
        Returns:
            True if speech successful, False otherwise
        """
        if not self.fallback_available:
            self.logger.log("ERROR", "No TTS engines available")
            return False
        
        try:
            # Add language prefix for non-English
            if language_code != 'en-IN':
                language_names = {
                    'hi-IN': 'Hindi',
                    'bn-IN': 'Bengali',
                    'ta-IN': 'Tamil',
                    'te-IN': 'Telugu',
                    'mr-IN': 'Marathi',
                    'gu-IN': 'Gujarati',
                    'kn-IN': 'Kannada',
                    'ml-IN': 'Malayalam',
                    'pa-IN': 'Punjabi',
                    'or-IN': 'Odia',
                    'as-IN': 'Assamese'
                }
                
                language_name = language_names.get(language_code, language_code)
                text = f"In {language_name}: {text}"
            
            self.fallback_engine.say(text)
            self.fallback_engine.runAndWait()
            
            self.logger.log("INFO", "Fallback TTS completed successfully")
            return True
            
        except Exception as e:
            self.logger.log("ERROR", f"Fallback TTS error: {str(e)}")
            return False
    
    def speak(self, text: str, language_code: str = 'en-IN') -> bool:
        """
        Main speak function - tries Sarvam TTS first, falls back if needed
        
        Args:
            text: Text to speak
            language_code: Target language code
            
        Returns:
            True if speech successful, False otherwise
        """
        if not text or not text.strip():
            self.logger.log("WARNING", "Empty text provided for TTS")
            return False
        
        # Clean and prepare text
        clean_text = text.strip()
        
        # Try Sarvam TTS first for supported languages
        supported_languages = [
            'hi-IN', 'bn-IN', 'ta-IN', 'te-IN', 'mr-IN', 
            'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'or-IN', 'as-IN', 'en-IN'
        ]
        
        if language_code in supported_languages:
            success = self.speak_with_sarvam(clean_text, language_code)
            if success:
                return True
        
        # Fallback to local TTS
        return self._speak_with_fallback(clean_text, language_code)
    
    def test_tts(self) -> bool:
        """
        Test TTS functionality
        
        Returns:
            True if TTS is working, False otherwise
        """
        test_message = "TTS system test. Hello, welcome to our hospital."
        return self.speak(test_message, 'en-IN')
    
    def cleanup(self):
        """Clean up TTS resources"""
        try:
            if self.pygame_available:
                pygame.mixer.quit()
                
            if self.fallback_available and self.fallback_engine:
                self.fallback_engine.stop()
                
            self.logger.log("INFO", "Sarvam TTS cleanup completed")
            
        except Exception as e:
            self.logger.log("WARNING", f"Error during TTS cleanup: {str(e)}")
    
    def get_supported_languages(self) -> list:
        """
        Get list of supported languages
        
        Returns:
            List of supported language codes
        """
        return [
            'hi-IN', 'bn-IN', 'ta-IN', 'te-IN', 'mr-IN', 
            'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'or-IN', 'as-IN', 'en-IN'
        ]