"""
Intent Parser Module for Healthcare Voice Recognition Engine
Lightweight keyword-based intent detection for hospital patient interactions
"""



import re
import json
from typing import Dict, List, Optional, Any
from utils.logger import Logger

class IntentParser:
    """
    Lightweight rule-based intent parser for healthcare scenarios
    Designed to run efficiently on Raspberry Pi without heavy ML models
    """
    
    def __init__(self):
        """Initialize the intent parser with healthcare-specific patterns"""
        self.logger = Logger()
        
        # Define intent patterns with keywords and phrases
        self.intent_patterns = {
            'registration': {
                'keywords': [
                    'register', 'registration', 'sign up', 'enroll', 'new patient',
                    'first time', 'join', 'admit', 'admission', 'check in'
                ],
                'phrases': [
                    'i want to register', 'i need to register', 'register me',
                    'i am new here', 'first visit', 'new patient registration'
                ]
            },
            'queue_status': {
                'keywords': [
                    'queue', 'wait', 'turn', 'number', 'position', 'how long',
                    'status', 'waiting', 'line', 'when', 'my turn'
                ],
                'phrases': [
                    'what is my position', 'how long to wait', 'when is my turn',
                    'queue status', 'waiting time', 'am i next', 'my number'
                ]
            },
            'directions': {
                'keywords': [
                    'where', 'direction', 'room', 'find', 'location', 'go to',
                    'bathroom', 'toilet', 'doctor', 'clinic', 'department',
                    'pharmacy', 'lab', 'laboratory', 'ward', 'floor'
                ],
                'phrases': [
                    'where is', 'how to go', 'show me the way', 'find room',
                    'which floor', 'where can i find', 'direct me to'
                ]
            },
            'appointment': {
                'keywords': [
                    'appointment', 'book', 'schedule', 'meet', 'doctor',
                    'consultation', 'visit', 'see doctor', 'meeting'
                ],
                'phrases': [
                    'book appointment', 'schedule meeting', 'see a doctor',
                    'make appointment', 'consultation booking'
                ]
            },
            'emergency': {
                'keywords': [
                    'emergency', 'urgent', 'help', 'pain', 'hurt', 'accident',
                    'critical', 'serious', 'ambulance', 'immediate', 'emergency room'
                ],
                'phrases': [
                    'this is emergency', 'i need help', 'urgent care',
                    'call doctor', 'medical emergency'
                ]
            },
            'information': {
                'keywords': [
                    'information', 'details', 'hours', 'time', 'open', 'close',
                    'contact', 'phone', 'services', 'facilities', 'visiting hours'
                ],
                'phrases': [
                    'what time', 'hospital hours', 'visiting hours',
                    'contact information', 'available services'
                ]
            },
            'billing': {
                'keywords': [
                    'bill', 'payment', 'cost', 'price', 'insurance', 'money',
                    'pay', 'charge', 'fee', 'cashier', 'billing'
                ],
                'phrases': [
                    'how much', 'payment counter', 'billing information',
                    'insurance claim', 'pay bill'
                ]
            },
            'greeting': {
                'keywords': [
                    'hello', 'hi', 'good morning', 'good afternoon', 'good evening',
                    'namaste', 'hey', 'greetings'
                ],
                'phrases': [
                    'good morning', 'good afternoon', 'good evening',
                    'hello there', 'hi there'
                ]
            }
        }
        
        # Common name patterns for extraction
        self.name_patterns = [
            r'my name is (\w+)',
            r'i am (\w+)',
            r'(\w+) is my name',
            r'call me (\w+)',
            r'i\'m (\w+)'
        ]
        
        # Room/location patterns
        self.room_patterns = [
            r'room (\d+)',
            r'ward (\w+)',
            r'floor (\d+)',
            r'department (\w+)',
            r'(\w+) department'
        ]
        
        # Number patterns (for queue, room numbers, etc.)
        self.number_patterns = [
            r'number (\d+)',
            r'(\d+)',
            r'position (\d+)'
        ]
    
    def preprocess_text(self, text: str) -> str:
        """
        Preprocess input text for better matching
        
        Args:
            text: Raw input text
            
        Returns:
            Preprocessed text
        """
        if not text:
            return ""
        
        # Convert to lowercase
        text = text.lower().strip()
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove punctuation but keep spaces
        text = re.sub(r'[^\w\s]', ' ', text)
        
        return text
    
    def extract_entities(self, text: str, intent: str) -> Dict[str, Any]:
        """
        Extract relevant entities from text based on intent
        
        Args:
            text: Preprocessed input text
            intent: Detected intent
            
        Returns:
            Dictionary of extracted entities
        """
        entities = {}
        
        # Extract names
        for pattern in self.name_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                entities['name'] = match.group(1).capitalize()
                break
        
        # Extract room/location information
        if intent in ['directions', 'appointment']:
            for pattern in self.room_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    entities['location'] = match.group(1)
                    break
        
        # Extract numbers
        for pattern in self.number_patterns:
            match = re.search(pattern, text)
            if match:
                entities['number'] = match.group(1)
                break
        
        # Extract doctor specialization
        doctor_specializations = [
            'cardiologist', 'neurologist', 'orthopedic', 'pediatrician',
            'gynecologist', 'dermatologist', 'psychiatrist', 'surgeon',
            'general', 'physician', 'dentist', 'eye doctor', 'heart doctor'
        ]
        
        for spec in doctor_specializations:
            if spec in text:
                entities['specialization'] = spec
                break
        
        return entities
    
    def calculate_intent_score(self, text: str, intent_data: Dict) -> float:
        """
        Calculate confidence score for an intent
        
        Args:
            text: Preprocessed input text
            intent_data: Intent pattern data
            
        Returns:
            Confidence score (0-1)
        """
        score = 0.0
        total_weight = 0.0
        
        # Check keywords (weight: 1.0)
        keyword_matches = 0
        for keyword in intent_data.get('keywords', []):
            if keyword.lower() in text:
                keyword_matches += 1
        
        if intent_data.get('keywords'):
            keyword_score = keyword_matches / len(intent_data['keywords'])
            score += keyword_score * 1.0
            total_weight += 1.0
        
        # Check phrases (weight: 2.0 - more specific)
        phrase_matches = 0
        for phrase in intent_data.get('phrases', []):
            if phrase.lower() in text:
                phrase_matches += 1
        
        if intent_data.get('phrases'):
            phrase_score = phrase_matches / len(intent_data['phrases'])
            score += phrase_score * 2.0
            total_weight += 2.0
        
        # Return normalized score
        return score / total_weight if total_weight > 0 else 0.0
    
    def parse_intent(self, text: str) -> Dict[str, Any]:
        """
        Parse user input and determine intent with entities
        
        Args:
            text: Raw user input text
            
        Returns:
            Dictionary containing intent, confidence, and extracted entities
        """
        if not text or not text.strip():
            return {
                'intent': 'unknown',
                'confidence': 0.0,
                'entities': {},
                'original_text': text
            }
        
        preprocessed_text = self.preprocess_text(text)
        self.logger.log("INFO", f"Parsing intent for: '{preprocessed_text}'")
        
        # Calculate scores for all intents
        intent_scores = {}
        for intent_name, intent_data in self.intent_patterns.items():
            score = self.calculate_intent_score(preprocessed_text, intent_data)
            intent_scores[intent_name] = score
        
        # Find best matching intent
        best_intent = max(intent_scores, key=intent_scores.get)
        best_score = intent_scores[best_intent]
        
        # Minimum confidence threshold
        min_confidence = 0.1
        if best_score < min_confidence:
            best_intent = 'unknown'
            best_score = 0.0
        
        # Extract entities based on detected intent
        entities = self.extract_entities(preprocessed_text, best_intent)
        
        result = {
            'intent': best_intent,
            'confidence': round(best_score, 3),
            'entities': entities,
            'original_text': text,
            'all_scores': intent_scores
        }
        
        self.logger.log("INFO", f"Intent detected: {best_intent} (confidence: {best_score:.3f})")
        
        return result
    
    def get_intent_examples(self) -> Dict[str, List[str]]:
        """
        Get example phrases for each intent (useful for testing)
        
        Returns:
            Dictionary mapping intents to example phrases
        """
        examples = {}
        for intent, data in self.intent_patterns.items():
            examples[intent] = data.get('phrases', [])[:3]  # First 3 examples
        return examples
    
    def add_custom_pattern(self, intent: str, keywords: List[str] = None, phrases: List[str] = None):
        """
        Add custom patterns for new intents
        
        Args:
            intent: Intent name
            keywords: List of keywords for this intent
            phrases: List of phrases for this intent
        """
        if intent not in self.intent_patterns:
            self.intent_patterns[intent] = {'keywords': [], 'phrases': []}
        
        if keywords:
            self.intent_patterns[intent]['keywords'].extend(keywords)
        
        if phrases:
            self.intent_patterns[intent]['phrases'].extend(phrases)
        
        self.logger.log("INFO", f"Added custom patterns for intent: {intent}")