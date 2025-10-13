"""
Conversation Memory Module for Healthcare Voice Recognition Engine
Maintains patient context and conversation history across interactions
"""

import json
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from utils.logger import Logger

class ConversationMemory:
    """
    Manages conversation memory for ongoing patient interactions
    Stores patient information, conversation history, and context
    """
    
    def __init__(self):
        """Initialize conversation memory system"""
        self.logger = Logger()
        self.current_patient = {}
        self.conversation_history = []
        self.session_start_time = time.time()
        self.interaction_count = 0
        
        # Initialize empty patient context
        self.reset_conversation()
        
        self.logger.log("INFO", "Conversation memory initialized")
    
    def reset_conversation(self):
        """Reset conversation for new patient"""
        # Archive previous conversation if exists
        if self.current_patient or self.conversation_history:
            self._archive_previous_conversation()
        
        # Reset current conversation
        self.current_patient = {
            'name': None,
            'patient_id': None,
            'date_of_birth': None,
            'contact': None,
            'preferred_language': None,
            'medical_needs': [],
            'appointments': [],
            'registration_status': 'not_registered',
            'queue_number': None,
            'last_interaction': time.time()
        }
        
        self.conversation_history = []
        self.session_start_time = time.time()
        self.interaction_count = 0
        
        self.logger.log("INFO", "Conversation memory reset for new patient")
    
    def add_interaction(self, transcript: str, intent: str, response: str, 
                       language_code: str, entities: Dict[str, Any] = None):
        """
        Add new interaction to conversation history
        
        Args:
            transcript: What the patient said
            intent: Detected intent
            response: System response
            language_code: Language used
            entities: Extracted entities from conversation
        """
        self.interaction_count += 1
        
        interaction = {
            'interaction_id': self.interaction_count,
            'timestamp': time.time(),
            'transcript': transcript,
            'intent': intent,
            'response': response,
            'language_code': language_code,
            'entities': entities or {}
        }
        
        self.conversation_history.append(interaction)
        
        # Update patient information from entities
        self._update_patient_info(entities or {}, language_code)
        
        # Try to extract patient name from transcript if none exists
        if not self.current_patient['name']:
            self._extract_name_from_transcript(transcript)
        
        # Update last interaction time
        self.current_patient['last_interaction'] = time.time()
        
        self.logger.log("INFO", f"Added interaction #{self.interaction_count} to memory")
    
    def _update_patient_info(self, entities: Dict[str, Any], language_code: str):
        """Update patient information from extracted entities"""
        
        # Update name
        if 'name' in entities and entities['name']:
            if not self.current_patient['name']:
                self.current_patient['name'] = entities['name']
                self.logger.log("INFO", f"Patient name remembered: {entities['name']}")
        
        # Update date of birth
        if 'date_of_birth' in entities:
            if not self.current_patient['date_of_birth']:
                self.current_patient['date_of_birth'] = entities['date_of_birth']
                self.logger.log("INFO", f"Patient DOB remembered: {entities['date_of_birth']}")
        
        # Update contact information
        if 'phone' in entities or 'contact' in entities:
            contact = entities.get('phone') or entities.get('contact')
            if contact and not self.current_patient['contact']:
                self.current_patient['contact'] = contact
                self.logger.log("INFO", f"Patient contact remembered: {contact}")
        
        # Update preferred language
        if not self.current_patient['preferred_language']:
            self.current_patient['preferred_language'] = language_code
            self.logger.log("INFO", f"Patient preferred language: {language_code}")
        
        # Update patient ID
        if 'patient_id' in entities:
            self.current_patient['patient_id'] = entities['patient_id']
        
        # Update queue number
        if 'queue_number' in entities:
            self.current_patient['queue_number'] = entities['queue_number']
        
        # Add medical needs/specializations
        if 'specialization' in entities:
            spec = entities['specialization']
            if spec not in self.current_patient['medical_needs']:
                self.current_patient['medical_needs'].append(spec)
        
        # Track appointment information
        if 'appointment_id' in entities:
            appointment = {
                'appointment_id': entities['appointment_id'],
                'timestamp': time.time(),
                'specialization': entities.get('specialization', 'general')
            }
            self.current_patient['appointments'].append(appointment)
    
    def _extract_name_from_transcript(self, transcript: str):
        """Extract patient name from transcript using common patterns"""
        import re
        
        # More precise name introduction patterns - match 1-3 capitalized words followed by common words
        name_patterns = [
            r'(?:i am|my name is|i\'m|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?:\s+(?:and|here|speaking|from)|$|\.|\,)',
            r'(?:this is|speaking is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?:\s+(?:and|here|speaking|from)|$|\.|\,)',
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, transcript, re.IGNORECASE)
            if match:
                potential_name = match.group(1).strip().title()
                # Basic validation - avoid common false positives
                exclude_words = ['help', 'please', 'thank you', 'pain', 'doctor', 'nurse', 
                               'emergency', 'appointment', 'medicine', 'water', 'food', 'having']
                
                if (len(potential_name.split()) <= 3 and 
                    potential_name.lower() not in exclude_words and
                    not any(word.lower() in exclude_words for word in potential_name.split())):
                    self.current_patient['name'] = potential_name
                    self.logger.log("INFO", f"Patient name auto-detected: {potential_name}")
                    break
    
    def add_conversation_turn(self, user_input: str, bot_response: str, intent: str, 
                             language: str, metadata: Dict[str, Any] = None):
        """
        Add a conversation turn (alternative interface for add_interaction)
        
        Args:
            user_input: User's input text
            bot_response: Bot's response text
            intent: Classified intent
            language: Language code
            metadata: Additional metadata including confidence, priority, entities
        """
        entities = metadata.get('entities', {}) if metadata else {}
        # Call add_interaction with correct parameter order: (transcript, intent, response, language_code, entities)
        self.add_interaction(user_input, intent, bot_response, language, entities)
    
    def update_patient_info(self, **kwargs):
        """
        Update patient information directly
        
        Args:
            **kwargs: Patient information fields to update (name, age, room, etc.)
        """
        for key, value in kwargs.items():
            if value is not None:
                self.current_patient[key] = value
        
        self.current_patient['last_interaction'] = time.time()
        self.logger.log("INFO", f"Updated patient info: {kwargs}")
    
    def reset_patient_memory(self):
        """
        Reset patient memory for a new patient
        """
        self.reset_conversation()
    
    def get_patient_info(self) -> Dict[str, Any]:
        """
        Get current patient information
        
        Returns:
            Dictionary with patient information
        """
        return self.current_patient.copy()
    
    def get_conversation_history(self) -> List[Dict[str, Any]]:
        """
        Get conversation history
        
        Returns:
            List of conversation turns
        """
        return self.conversation_history.copy()
    
    def get_conversation_context(self) -> str:
        """
        Generate conversation context for AI prompt
        
        Returns:
            Formatted conversation context string
        """
        context_parts = []
        
        # Patient information
        if self.current_patient['name']:
            context_parts.append(f"Patient Name: {self.current_patient['name']}")
        
        if self.current_patient['preferred_language']:
            context_parts.append(f"Preferred Language: {self.current_patient['preferred_language']}")
        
        if self.current_patient['registration_status'] != 'not_registered':
            context_parts.append(f"Registration Status: {self.current_patient['registration_status']}")
        
        if self.current_patient['patient_id']:
            context_parts.append(f"Patient ID: {self.current_patient['patient_id']}")
        
        if self.current_patient['queue_number']:
            context_parts.append(f"Queue Number: {self.current_patient['queue_number']}")
        
        if self.current_patient['medical_needs']:
            context_parts.append(f"Medical Needs: {', '.join(self.current_patient['medical_needs'])}")
        
        # Recent conversation history (last 3 interactions)
        recent_history = self.conversation_history[-3:] if len(self.conversation_history) > 1 else []
        
        if recent_history:
            context_parts.append("\nRecent Conversation:")
            for interaction in recent_history:
                context_parts.append(f"- Patient: \"{interaction['transcript']}\"")
                context_parts.append(f"- System: \"{interaction['response'][:100]}...\"")
        
        # Session information
        session_duration = (time.time() - self.session_start_time) / 60  # minutes
        context_parts.append(f"\nSession Duration: {session_duration:.1f} minutes")
        context_parts.append(f"Total Interactions: {self.interaction_count}")
        
        return "\n".join(context_parts) if context_parts else "New patient - no previous context"
    
    def get_patient_summary(self) -> Dict[str, Any]:
        """Get current patient information summary"""
        return {
            'patient_info': self.current_patient.copy(),
            'total_interactions': self.interaction_count,
            'session_duration_minutes': (time.time() - self.session_start_time) / 60,
            'last_intent': self.conversation_history[-1]['intent'] if self.conversation_history else None,
            'conversation_started': datetime.fromtimestamp(self.session_start_time).isoformat()
        }
    
    def has_patient_info(self) -> bool:
        """Check if we have any patient information"""
        return (self.current_patient['name'] is not None or 
                self.current_patient['patient_id'] is not None or
                len(self.conversation_history) > 0)
    
    def get_patient_name(self) -> Optional[str]:
        """Get patient name if available"""
        return self.current_patient['name']
    
    def get_preferred_language(self) -> str:
        """Get patient's preferred language, default to en-IN"""
        return self.current_patient['preferred_language'] or 'en-IN'
    
    def is_emergency_context(self) -> bool:
        """Check if recent conversation had emergency context"""
        if not self.conversation_history:
            return False
        
        # Check last 3 interactions for emergency
        recent_intents = [
            interaction['intent'] 
            for interaction in self.conversation_history[-3:]
        ]
        
        return 'emergency' in recent_intents
    
    def get_unresolved_needs(self) -> List[str]:
        """Get list of unresolved patient needs from conversation"""
        unresolved = []
        
        # Check for incomplete registration
        if self.current_patient['registration_status'] == 'not_registered':
            if any(interaction['intent'] == 'registration' for interaction in self.conversation_history):
                unresolved.append('registration_incomplete')
        
        # Check for appointment requests without confirmation
        appointment_requested = any(
            interaction['intent'] == 'appointment' 
            for interaction in self.conversation_history
        )
        appointment_confirmed = len(self.current_patient['appointments']) > 0
        
        if appointment_requested and not appointment_confirmed:
            unresolved.append('appointment_pending')
        
        # Check for direction requests
        if any(interaction['intent'] == 'directions' for interaction in self.conversation_history[-2:]):
            unresolved.append('may_need_guidance')
        
        return unresolved
    
    def _archive_previous_conversation(self):
        """Archive previous conversation before reset"""
        if not self.conversation_history:
            return
        
        archive_data = {
            'patient_info': self.current_patient.copy(),
            'conversation_history': self.conversation_history.copy(),
            'session_duration_minutes': (time.time() - self.session_start_time) / 60,
            'total_interactions': self.interaction_count,
            'archived_at': datetime.now().isoformat()
        }
        
        # Log the archived conversation
        self.logger.log("INFO", "Conversation archived", archive_data)
        
        # You could also save to file for persistence if needed
        # self._save_archived_conversation(archive_data)
    
    def get_conversation_insights(self) -> Dict[str, Any]:
        """Get insights about the current conversation"""
        if not self.conversation_history:
            return {'status': 'no_conversation'}
        
        # Analyze conversation patterns
        intents_used = [interaction['intent'] for interaction in self.conversation_history]
        unique_intents = list(set(intents_used))
        
        # Check conversation flow
        conversation_flow = []
        for interaction in self.conversation_history:
            conversation_flow.append({
                'intent': interaction['intent'],
                'timestamp': interaction['timestamp'],
                'resolved': interaction['intent'] != 'unknown'
            })
        
        return {
            'unique_intents': unique_intents,
            'conversation_flow': conversation_flow,
            'patient_engagement': len(self.conversation_history),
            'avg_response_time': self._calculate_avg_response_time(),
            'unresolved_needs': self.get_unresolved_needs(),
            'conversation_quality': self._assess_conversation_quality()
        }
    
    def _calculate_avg_response_time(self) -> float:
        """Calculate average time between interactions"""
        if len(self.conversation_history) < 2:
            return 0.0
        
        time_gaps = []
        for i in range(1, len(self.conversation_history)):
            time_gap = (self.conversation_history[i]['timestamp'] - 
                       self.conversation_history[i-1]['timestamp'])
            time_gaps.append(time_gap)
        
        return sum(time_gaps) / len(time_gaps) if time_gaps else 0.0
    
    def _assess_conversation_quality(self) -> str:
        """Assess the quality of the conversation"""
        if not self.conversation_history:
            return 'no_data'
        
        unknown_count = sum(1 for interaction in self.conversation_history 
                           if interaction['intent'] == 'unknown')
        total_interactions = len(self.conversation_history)
        
        unknown_ratio = unknown_count / total_interactions
        
        if unknown_ratio < 0.1:
            return 'excellent'
        elif unknown_ratio < 0.3:
            return 'good'
        elif unknown_ratio < 0.5:
            return 'fair'
        else:
            return 'needs_improvement'
    
    def format_memory_status(self) -> str:
        """Format memory status for display"""
        if not self.has_patient_info():
            return "👤 No active patient session"
        
        status_lines = []
        
        # Patient info
        name = self.current_patient['name'] or "Unknown Patient"
        status_lines.append(f"👤 Current Patient: {name}")
        
        if self.current_patient['preferred_language']:
            lang_name = {
                'hi-IN': 'Hindi', 'bn-IN': 'Bengali', 'ta-IN': 'Tamil',
                'te-IN': 'Telugu', 'ml-IN': 'Malayalam', 'mr-IN': 'Marathi',
                'gu-IN': 'Gujarati', 'kn-IN': 'Kannada', 'pa-IN': 'Punjabi',
                'or-IN': 'Odia', 'as-IN': 'Assamese', 'en-IN': 'English'
            }.get(self.current_patient['preferred_language'], self.current_patient['preferred_language'])
            status_lines.append(f"🌍 Language: {lang_name}")
        
        # Session info
        duration = (time.time() - self.session_start_time) / 60
        status_lines.append(f"⏱️ Session: {duration:.1f} min, {self.interaction_count} interactions")
        
        # Patient status
        if self.current_patient['patient_id']:
            status_lines.append(f"🆔 Patient ID: {self.current_patient['patient_id']}")
        
        if self.current_patient['queue_number']:
            status_lines.append(f"🔢 Queue #: {self.current_patient['queue_number']}")
        
        # Unresolved needs
        unresolved = self.get_unresolved_needs()
        if unresolved:
            status_lines.append(f"⚠️ Pending: {', '.join(unresolved)}")
        
        return "\n".join(status_lines)
    
    def should_mention_previous_context(self, current_intent: str) -> bool:
        """Determine if previous context should be mentioned to patient"""
        
        # Don't mention context for greetings or first interaction
        if current_intent == 'greeting' or self.interaction_count <= 1:
            return False
        
        # Mention context for related follow-up intents
        if not self.conversation_history:
            return False
        
        last_intent = self.conversation_history[-1]['intent']
        
        # Related intent pairs where context is helpful
        related_intents = {
            'registration': ['queue_status', 'appointment', 'information'],
            'appointment': ['queue_status', 'directions', 'billing'],
            'queue_status': ['appointment', 'directions'],
            'directions': ['information', 'queue_status'],
            'billing': ['appointment', 'registration']
        }
        
        return current_intent in related_intents.get(last_intent, [])
    
    def get_contextual_prompt_addition(self) -> str:
        """Get additional context to add to AI prompt"""
        if not self.has_patient_info():
            return ""
        
        context_parts = []
        
        # Patient context
        if self.current_patient['name']:
            context_parts.append(f"PATIENT NAME: {self.current_patient['name']}")
        
        if self.current_patient['patient_id']:
            context_parts.append(f"PATIENT ID: {self.current_patient['patient_id']}")
        
        # Conversation context
        if len(self.conversation_history) > 1:
            context_parts.append(f"ONGOING CONVERSATION: This is interaction #{self.interaction_count}")
            
            # Last interaction context
            last_interaction = self.conversation_history[-1]
            context_parts.append(f"PREVIOUS: Patient said \"{last_interaction['transcript']}\" and you responded about {last_interaction['intent']}")
        
        # Unresolved needs
        unresolved = self.get_unresolved_needs()
        if unresolved:
            context_parts.append(f"UNRESOLVED NEEDS: {', '.join(unresolved)}")
        
        # Emergency context
        if self.is_emergency_context():
            context_parts.append("EMERGENCY CONTEXT: Previous emergency situation - prioritize patient safety")
        
        if context_parts:
            return "\n\nCONVERSATION CONTEXT:\n" + "\n".join(context_parts) + "\n\nUSE THIS CONTEXT to provide personalized, continuous care. Address the patient by name when known and reference previous conversation naturally."
        
        return ""
    
    def get_conversation_summary(self) -> Dict[str, Any]:
        """Get comprehensive conversation summary"""
        return {
            'patient_info': self.current_patient,
            'conversation_stats': {
                'total_interactions': self.interaction_count,
                'session_duration_minutes': (time.time() - self.session_start_time) / 60,
                'intents_covered': list(set(i['intent'] for i in self.conversation_history)),
                'languages_used': list(set(i['language_code'] for i in self.conversation_history)),
                'avg_response_time': self._calculate_avg_response_time()
            },
            'conversation_quality': self._assess_conversation_quality(),
            'recent_history': self.conversation_history[-5:],  # Last 5 interactions
            'insights': self.get_conversation_insights()
        }
    
    def export_conversation(self) -> str:
        """Export conversation for handover to human staff"""
        summary = self.get_conversation_summary()
        
        export_text = f"""
PATIENT HANDOVER SUMMARY
========================
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

PATIENT INFORMATION:
- Name: {self.current_patient['name'] or 'Not provided'}
- ID: {self.current_patient['patient_id'] or 'Not assigned'}
- Language: {self.current_patient['preferred_language'] or 'Unknown'}
- Contact: {self.current_patient['contact'] or 'Not provided'}

SESSION SUMMARY:
- Duration: {summary['conversation_stats']['session_duration_minutes']:.1f} minutes
- Interactions: {summary['conversation_stats']['total_interactions']}
- Quality: {summary['conversation_quality']}

CONVERSATION HISTORY:
"""
        
        for i, interaction in enumerate(self.conversation_history, 1):
            timestamp = datetime.fromtimestamp(interaction['timestamp']).strftime('%H:%M:%S')
            export_text += f"\n{i}. [{timestamp}] Patient: \"{interaction['transcript']}\""
            export_text += f"\n   Intent: {interaction['intent']} | Response: \"{interaction['response'][:100]}...\""
        
        if self.get_unresolved_needs():
            export_text += f"\n\nUNRESOLVED NEEDS: {', '.join(self.get_unresolved_needs())}"
        
        return export_text
    
    def cleanup(self):
        """Clean up memory and archive final conversation"""
        if self.has_patient_info():
            self.logger.log("INFO", "Final conversation cleanup", self.get_conversation_summary())
            self._archive_previous_conversation()
        
        self.logger.log("INFO", "Conversation memory cleanup completed")