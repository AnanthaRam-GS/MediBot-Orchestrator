"""
Translation Module for Voice Recognition Engine
Handles text translation using Sarvam API for multilingual responses
"""

import os
import requests
import time
from typing import Optional, Dict, Any
from utils.logger import Logger

class Translator:
    """
    Handles text translation using Sarvam API
    Translates English responses to user's detected language
    """
    
    def __init__(self):
        """Initialize the translator with Sarvam API credentials"""
        self.logger = Logger()
        self.api_key = os.getenv('SARVAM_API_KEY')
        self.translate_url = "https://api.sarvam.ai/translate"
        
        if not self.api_key:
            raise ValueError("SARVAM_API_KEY environment variable not set")
        
        self.logger.log("INFO", "Translator initialized")
    
    def translate_text(self, text: str, target_language: str, 
                      source_language: str = "en-IN", max_retries: int = 2) -> Optional[str]:
        """
        Translate text from source language to target language
        
        Args:
            text: Text to translate
            target_language: Target language code (e.g., 'hi-IN', 'bn-IN')
            source_language: Source language code (default: 'en-IN')
            max_retries: Maximum number of retry attempts
            
        Returns:
            Translated text or None if translation failed
        """
        # Don't translate if target is same as source
        if target_language == source_language:
            return text
        
        # Don't translate English to English
        if target_language == 'en-IN' and source_language == 'en-IN':
            return text
        
        headers = {
            'api-subscription-key': self.api_key,
            'Content-Type': 'application/json'
        }
        
        payload = {
            'input': text,
            'source_language_code': source_language,
            'target_language_code': target_language
        }
        
        for attempt in range(max_retries + 1):
            try:
                self.logger.log("INFO", f"Translating text to {target_language} (attempt {attempt + 1})")
                
                response = requests.post(
                    self.translate_url,
                    headers=headers,
                    json=payload,
                    timeout=10
                )
                
                if response.status_code == 200:
                    result = response.json()
                    translated_text = result.get('translated_text', '').strip()
                    
                    if translated_text:
                        self.logger.log("INFO", f"Translation successful: '{text[:50]}...' -> '{translated_text[:50]}...'")
                        return translated_text
                    else:
                        self.logger.log("WARNING", "Empty translation received")
                        return text  # Return original text as fallback
                else:
                    self.logger.log("ERROR", f"Translation API error: {response.status_code} - {response.text}")
                    
            except requests.exceptions.Timeout:
                self.logger.log("WARNING", f"Translation API timeout on attempt {attempt + 1}")
            except requests.exceptions.RequestException as e:
                self.logger.log("ERROR", f"Translation request error: {str(e)}")
            except Exception as e:
                self.logger.log("ERROR", f"Unexpected translation error: {str(e)}")
            
            if attempt < max_retries:
                time.sleep(1)  # Wait before retry
        
        self.logger.log("ERROR", "All translation attempts failed - returning original text")
        return text  # Return original text as fallback
    
    def get_supported_languages(self) -> Dict[str, str]:
        """
        Get supported language codes and their names
        
        Returns:
            Dictionary mapping language codes to language names
        """
        return {
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
            'as-IN': 'Assamese',
            'en-IN': 'English'
        }
    
    def is_supported_language(self, language_code: str) -> bool:
        """
        Check if language code is supported
        
        Args:
            language_code: Language code to check
            
        Returns:
            True if supported, False otherwise
        """
        return language_code in self.get_supported_languages()
    
    def test_translation(self) -> bool:
        """
        Test translation functionality
        
        Returns:
            True if translation is working, False otherwise
        """
        test_text = "Hello, how are you?"
        test_target = "hi-IN"
        
        result = self.translate_text(test_text, test_target)
        
        if result and result != test_text:
            self.logger.log("INFO", f"Translation test successful: '{test_text}' -> '{result}'")
            return True
        else:
            self.logger.log("ERROR", "Translation test failed")
            return False