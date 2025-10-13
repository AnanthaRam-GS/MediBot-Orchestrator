"""
Speech Input Module for Voice Recognition Engine
Handles audio recording and speech-to-text conversion using Sarvam API
"""

import os
import time
import io
import wave
import requests
import sounddevice as sd
import numpy as np
from typing import Tuple, Optional, Dict
from utils.logger import Logger

class SpeechInput:
    """
    Handles speech input capture and conversion to text using Sarvam API
    """
    
    def __init__(self, sample_rate: int = 16000, duration: int = 5):
        """
        Initialize SpeechInput module
        
        Args:
            sample_rate: Audio sample rate in Hz
            duration: Maximum recording duration in seconds
        """
        self.sample_rate = sample_rate
        self.duration = duration
        self.api_key = os.getenv('SARVAM_API_KEY')
        self.api_url = "https://api.sarvam.ai/speech-to-text-translate"
        self.logger = Logger()
        
        if not self.api_key:
            raise ValueError("SARVAM_API_KEY environment variable not set")
    
    def record_audio(self) -> Optional[np.ndarray]:
        """
        Record audio from microphone
        
        Returns:
            numpy array containing audio data or None if recording failed
        """
        try:
            self.logger.log("INFO", "Starting audio recording...")
            
            # Record audio
            audio_data = sd.rec(
                int(self.duration * self.sample_rate),
                samplerate=self.sample_rate,
                channels=1,
                dtype='int16'
            )
            sd.wait()  # Wait until recording is finished
            
            # Check if any sound was detected (not just silence)
            if np.max(np.abs(audio_data)) < 500:  # Threshold for silence detection
                self.logger.log("WARNING", "No significant audio detected")
                return None
            
            self.logger.log("INFO", "Audio recording completed")
            return audio_data
            
        except Exception as e:
            self.logger.log("ERROR", f"Error recording audio: {str(e)}")
            return None
    
    def save_audio_to_wav(self, audio_data: np.ndarray) -> bytes:
        """
        Convert numpy audio data to WAV format bytes
        
        Args:
            audio_data: Audio data as numpy array
            
        Returns:
            WAV file content as bytes
        """
        buffer = io.BytesIO()
        
        with wave.open(buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(self.sample_rate)
            wav_file.writeframes(audio_data.tobytes())
        
        buffer.seek(0)
        return buffer.read()
    
    def send_to_sarvam_api(self, audio_bytes: bytes, max_retries: int = 2) -> Optional[Dict]:
        """
        Send audio to Sarvam API for speech-to-text conversion
        
        Args:
            audio_bytes: WAV audio file content as bytes
            max_retries: Maximum number of retry attempts
            
        Returns:
            Dictionary containing transcript and language_code or None if failed
        """
        headers = {
            'api-subscription-key': self.api_key
        }
        
        files = {
            'file': ('audio.wav', audio_bytes, 'audio/wav')
        }
        
        for attempt in range(max_retries + 1):
            try:
                self.logger.log("INFO", f"Sending audio to Sarvam API (attempt {attempt + 1})")
                
                response = requests.post(
                    self.api_url,
                    headers=headers,
                    files=files,
                    timeout=10
                )
                
                if response.status_code == 200:
                    result = response.json()
                    self.logger.log("INFO", f"STT successful: {result.get('transcript', 'N/A')}")
                    return result
                else:
                    self.logger.log("ERROR", f"API error: {response.status_code} - {response.text}")
                    
            except requests.exceptions.Timeout:
                self.logger.log("WARNING", f"API timeout on attempt {attempt + 1}")
            except requests.exceptions.RequestException as e:
                self.logger.log("ERROR", f"Request error: {str(e)}")
            except Exception as e:
                self.logger.log("ERROR", f"Unexpected error: {str(e)}")
            
            if attempt < max_retries:
                time.sleep(1)  # Wait before retry
        
        self.logger.log("ERROR", "All API attempts failed")
        return None
    
    def get_speech_input(self) -> Tuple[Optional[str], Optional[str]]:
        """
        Complete speech input pipeline: record -> convert -> return
        
        Returns:
            Tuple of (transcript, language_code) or (None, None) if failed
        """
        try:
            # Record audio
            audio_data = self.record_audio()
            if audio_data is None:
                return None, None
            
            # Convert to WAV bytes
            audio_bytes = self.save_audio_to_wav(audio_data)
            
            # Send to API
            result = self.send_to_sarvam_api(audio_bytes)
            if result:
                transcript = result.get('transcript', '').strip()
                language_code = result.get('language_code', 'en-IN')
                
                if transcript:
                    return transcript, language_code
                else:
                    self.logger.log("WARNING", "Empty transcript received")
                    return None, None
            
            return None, None
            
        except Exception as e:
            self.logger.log("ERROR", f"Error in speech input pipeline: {str(e)}")
            return None, None
    
    def test_microphone(self) -> bool:
        """
        Test if microphone is working
        
        Returns:
            True if microphone is accessible, False otherwise
        """
        try:
            # Test recording for 1 second
            test_audio = sd.rec(
                int(1 * self.sample_rate),
                samplerate=self.sample_rate,
                channels=1,
                dtype='int16'
            )
            sd.wait()
            return True
        except Exception as e:
            self.logger.log("ERROR", f"Microphone test failed: {str(e)}")
            return False