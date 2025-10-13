"""
Gemini AI Handler for Healthcare Voice Recognition Engine
Uses Google Gemini API for intent classification and response generation
"""

import os
import json
import requests
from typing import Dict, Any, Optional
from utils.logger import Logger

class GeminiHandler:
    """
    Handles AI-powered intent classification and response generation using Google Gemini API
    """
    
    def __init__(self):
        """Initialize Gemini handler"""
        self.logger = Logger()
        self.api_key = os.getenv('GEMINI_API_KEY')
        self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={self.api_key}"
        
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        # System instructions for healthcare context
        self.system_instructions = """You are a helpful healthcare assistant robot in a hospital. Your role is to assist patients with various hospital-related needs in a calm, sweet, and simple manner.

INTENT CLASSIFICATIONS you can identify:
1. **registration** - Patient wants to register, sign up, or check-in
2. **queue_status** - Patient asking about wait time, position in queue, or when their turn is
3. **directions** - Patient needs directions to rooms, departments, facilities (bathroom, pharmacy, etc.)
4. **appointment** - Patient wants to book, schedule, or inquire about appointments
5. **emergency** - Medical emergency or urgent care needed
6. **information** - General hospital information (hours, contact, services, visiting hours)
7. **billing** - Payment, insurance, costs, billing counter questions
8. **greeting** - Hello, good morning, casual greetings
9. **complaint** - Patient has complaints about service, facilities, or treatment
10. **discharge** - Patient asking about discharge process, paperwork, or going home
11. **medication** - Questions about medicines, prescriptions, pharmacy
12. **doctor_inquiry** - Questions about specific doctors, specialists, availability
13. **test_results** - Asking about lab results, reports, medical test outcomes
14. **visitor_info** - Questions about visiting patients, visiting hours, visitor policies
15. **unknown** - Unclear or unrelated requests

RESPONSE GUIDELINES:
- Always be calm, sweet, and use simple language
- Keep responses helpful and professional
- For emergencies, prioritize immediate action
- Provide specific room numbers and directions when possible
- Be empathetic to patient concerns
- If unsure, guide them to reception or staff

RESPONSE FORMAT:
Return a JSON object with:
{
  "intent": "classification_name",
  "confidence": 0.95,
  "response": "Your calm and helpful response here",
  "priority": "normal|high|urgent",
  "entities": {
    "extracted_info": "any relevant details"
  }
}

Examples:
- "I want to register" → intent: "registration"
- "Where is the bathroom?" → intent: "directions" 
- "I'm having chest pain" → intent: "emergency", priority: "urgent"
- "When will my reports be ready?" → intent: "test_results"
- "I need to pay my bill" → intent: "billing"

Always respond in English first - the system will translate to the user's language later."""

    def classify_and_respond(self, transcript: str, user_language: str = "en-IN", 
                           conversation_context: str = "") -> Dict[str, Any]:
        """
        Use Gemini AI to classify intent and generate response
        
        Args:
            transcript: User's speech transcript
            user_language: Detected language from speech
            
        Returns:
            Dictionary with intent, confidence, response, and metadata
        """
        try:
            self.logger.log("INFO", f"Processing with Gemini AI: '{transcript}'")
            
            # Prepare the prompt
            prompt = f"""
{self.system_instructions}

PATIENT CONTEXT AND CONVERSATION HISTORY:
{conversation_context if conversation_context else "No previous conversation history available."}

USER INPUT: "{transcript}"
USER LANGUAGE: {user_language}

Please classify this input and provide an appropriate response. Consider the patient's previous interactions and context when crafting your response. Remember to be calm, sweet, and use simple language suitable for hospital patients.
"""
            
            # Prepare API request
            payload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": prompt
                            }
                        ]
                    }
                ]
            }
            
            headers = {
                "Content-Type": "application/json"
            }
            
            # Make API call
            response = requests.post(
                self.api_url,
                headers=headers,
                data=json.dumps(payload),
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Extract the generated text
                generated_text = result['candidates'][0]['content']['parts'][0]['text']
                
                # Try to parse as JSON
                try:
                    # Clean the response (remove markdown formatting if present)
                    cleaned_text = generated_text.strip()
                    if cleaned_text.startswith('```json'):
                        cleaned_text = cleaned_text.replace('```json', '').replace('```', '').strip()
                    elif cleaned_text.startswith('```'):
                        cleaned_text = cleaned_text.replace('```', '').strip()
                    
                    ai_response = json.loads(cleaned_text)
                    
                    # Validate required fields
                    if not all(key in ai_response for key in ['intent', 'confidence', 'response']):
                        raise ValueError("Missing required fields in AI response")
                    
                    # Add metadata
                    ai_response['original_transcript'] = transcript
                    ai_response['user_language'] = user_language
                    ai_response['ai_model'] = 'gemini-2.0-flash-exp'
                    
                    self.logger.log("INFO", f"Gemini classification: {ai_response['intent']} (confidence: {ai_response['confidence']})")
                    
                    return ai_response
                    
                except json.JSONDecodeError:
                    # If JSON parsing fails, create a structured response
                    self.logger.log("WARNING", "Could not parse Gemini response as JSON, using fallback")
                    return self._create_fallback_response(transcript, generated_text, user_language)
            
            else:
                self.logger.log("ERROR", f"Gemini API error: {response.status_code} - {response.text}")
                return self._create_error_response(transcript, user_language)
                
        except requests.exceptions.Timeout:
            self.logger.log("ERROR", "Gemini API timeout")
            return self._create_error_response(transcript, user_language, "API timeout")
            
        except Exception as e:
            self.logger.log("ERROR", f"Error calling Gemini API: {str(e)}")
            return self._create_error_response(transcript, user_language, str(e))
    
    def _create_fallback_response(self, transcript: str, ai_text: str, user_language: str) -> Dict[str, Any]:
        """Create fallback response when JSON parsing fails"""
        return {
            "intent": "unknown",
            "confidence": 0.5,
            "response": ai_text[:500] if ai_text else "I understand you need help. Please let me connect you with our hospital staff who can assist you better.",
            "priority": "normal",
            "entities": {},
            "original_transcript": transcript,
            "user_language": user_language,
            "ai_model": "gemini-2.0-flash-exp",
            "fallback": True
        }
    
    def _create_error_response(self, transcript: str, user_language: str, error_msg: str = "") -> Dict[str, Any]:
        """Create error response when API fails"""
        return {
            "intent": "unknown",
            "confidence": 0.0,
            "response": "I apologize, but I'm having trouble understanding right now. Please speak with our reception staff who will be happy to help you.",
            "priority": "normal",
            "entities": {},
            "original_transcript": transcript,
            "user_language": user_language,
            "ai_model": "gemini-2.0-flash-exp",
            "error": error_msg
        }
    
    def get_available_intents(self) -> list:
        """Return list of available intent classifications"""
        return [
            "registration", "queue_status", "directions", "appointment", 
            "emergency", "information", "billing", "greeting", "complaint",
            "discharge", "medication", "doctor_inquiry", "test_results", 
            "visitor_info", "unknown"
        ]
    
    def test_connection(self) -> bool:
        """Test if Gemini API is accessible"""
        try:
            test_response = self.classify_and_respond("Hello, test message")
            return test_response.get('intent') is not None
        except Exception as e:
            self.logger.log("ERROR", f"Gemini API test failed: {str(e)}")
            return False