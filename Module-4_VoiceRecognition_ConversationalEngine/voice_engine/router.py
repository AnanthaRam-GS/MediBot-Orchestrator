"""
Router Module for Healthcare Voice Recognition Engine
Routes parsed intents to appropriate hospital API endpoints (mock implementations)
"""

import time
import random
from typing import Dict, Any, Optional
from utils.logger import Logger

class Router:
    """
    Routes user intents to appropriate hospital systems
    Currently implements mock APIs that can be replaced with real hospital integrations
    """
    
    def __init__(self):
        """Initialize the router with mock hospital systems"""
        self.logger = Logger()
        
        # Mock database for demonstration
        self.patient_database = {}
        self.queue_system = {
            'general': [],
            'emergency': [],
            'specialist': []
        }
        self.hospital_info = {
            'hours': '24/7 Emergency, 8 AM - 8 PM General Services',
            'phone': '+91-98765-43210',
            'emergency_contact': '+91-98765-43211'
        }
        
        # Room directory
        self.room_directory = {
            'emergency': 'Ground Floor, Room 101-110',
            'general': 'First Floor, Room 201-250',
            'cardiology': 'Second Floor, Room 301-310',
            'neurology': 'Second Floor, Room 311-320',
            'orthopedic': 'Third Floor, Room 401-410',
            'pediatrics': 'Third Floor, Room 411-420',
            'gynecology': 'Fourth Floor, Room 501-510',
            'pharmacy': 'Ground Floor, Room 150',
            'laboratory': 'Ground Floor, Room 160-165',
            'billing': 'Ground Floor, Room 120',
            'reception': 'Ground Floor, Main Entrance',
            'cafeteria': 'Ground Floor, Room 180',
            'bathroom': 'Available on every floor near the lifts'
        }
    
    def route_intent(self, intent_data: Dict[str, Any]) -> str:
        """
        Route intent to appropriate handler and return response
        
        Args:
            intent_data: Parsed intent data from IntentParser
            
        Returns:
            Response text for TTS output
        """
        intent = intent_data.get('intent', 'unknown')
        entities = intent_data.get('entities', {})
        
        self.logger.log("INFO", f"Routing intent: {intent}")
        
        # Route to appropriate handler
        try:
            if intent == 'registration':
                return self.handle_registration(entities)
            elif intent == 'queue_status':
                return self.handle_queue_status(entities)
            elif intent == 'directions':
                return self.handle_directions(entities)
            elif intent == 'appointment':
                return self.handle_appointment(entities)
            elif intent == 'emergency':
                return self.handle_emergency(entities)
            elif intent == 'information':
                return self.handle_information(entities)
            elif intent == 'billing':
                return self.handle_billing(entities)
            elif intent == 'greeting':
                return self.handle_greeting(entities)
            else:
                return self.handle_unknown(entities)
        
        except Exception as e:
            self.logger.log("ERROR", f"Error in routing: {str(e)}")
            return "I apologize, but I encountered an error. Please speak to our staff for assistance."
    
    def handle_registration(self, entities: Dict[str, Any]) -> str:
        """Handle patient registration requests"""
        self.logger.log("INFO", "Processing registration request")
        
        name = entities.get('name', 'Patient')
        
        # Mock registration process
        patient_id = f"PAT{random.randint(1000, 9999)}"
        self.patient_database[patient_id] = {
            'name': name,
            'registration_time': time.time(),
            'status': 'registered'
        }
        
        # Add to general queue
        queue_number = len(self.queue_system['general']) + 1
        self.queue_system['general'].append({
            'patient_id': patient_id,
            'name': name,
            'queue_number': queue_number
        })
        
        response = f"Hello {name}! You are successfully registered with patient ID {patient_id}. "
        response += f"Your queue number is {queue_number}. Please wait for your turn."
        
        return response
    
    def handle_queue_status(self, entities: Dict[str, Any]) -> str:
        """Handle queue status inquiries"""
        self.logger.log("INFO", "Processing queue status request")
        
        # Mock queue status
        total_in_queue = len(self.queue_system['general'])
        estimated_wait = total_in_queue * 10  # 10 minutes per patient
        
        if total_in_queue == 0:
            return "There is no queue currently. You can proceed directly to the reception."
        elif total_in_queue <= 3:
            return f"There are {total_in_queue} patients ahead of you. Estimated wait time is {estimated_wait} minutes."
        else:
            return f"There are {total_in_queue} patients in the queue. Estimated wait time is {estimated_wait} minutes. Please be patient."
    
    def handle_directions(self, entities: Dict[str, Any]) -> str:
        """Handle direction and location requests"""
        self.logger.log("INFO", "Processing direction request")
        
        location = entities.get('location', '').lower()
        specialization = entities.get('specialization', '').lower()
        
        # Search in room directory
        target = location or specialization
        
        if target in self.room_directory:
            direction = self.room_directory[target]
            return f"The {target} is located at {direction}. Please follow the hospital signs for guidance."
        
        # Partial matches
        for key, value in self.room_directory.items():
            if target in key or key in target:
                return f"The {key} is located at {value}. Please follow the hospital signs for guidance."
        
        # Default directions
        return "Please visit the reception desk on the ground floor for detailed directions. They will guide you to your destination."
    
    def handle_appointment(self, entities: Dict[str, Any]) -> str:
        """Handle appointment booking requests"""
        self.logger.log("INFO", "Processing appointment request")
        
        specialization = entities.get('specialization', 'general physician')
        name = entities.get('name', 'Patient')
        
        # Mock appointment booking
        appointment_id = f"APT{random.randint(1000, 9999)}"
        next_slot = "tomorrow at 10:30 AM"  # Mock next available slot
        
        response = f"Hello {name}! I have booked an appointment for you with the {specialization}. "
        response += f"Your appointment ID is {appointment_id} scheduled for {next_slot}. "
        response += "Please arrive 15 minutes early and bring all necessary documents."
        
        return response
    
    def handle_emergency(self, entities: Dict[str, Any]) -> str:
        """Handle emergency situations"""
        self.logger.log("WARNING", "Emergency situation detected")
        
        # Priority response for emergencies
        response = "This is an emergency situation. Please proceed immediately to the Emergency Room on the Ground Floor, Room 101. "
        response += "If you need immediate assistance, press the red emergency button or call our emergency number. "
        response += "Medical staff has been notified."
        
        # Add to emergency queue with highest priority
        self.queue_system['emergency'].append({
            'patient_id': f"EMG{random.randint(100, 999)}",
            'timestamp': time.time(),
            'status': 'urgent'
        })
        
        return response
    
    def handle_information(self, entities: Dict[str, Any]) -> str:
        """Handle general information requests"""
        self.logger.log("INFO", "Processing information request")
        
        response = f"Our hospital is open {self.hospital_info['hours']}. "
        response += f"For general inquiries, call {self.hospital_info['phone']}. "
        response += f"For emergencies, call {self.hospital_info['emergency_contact']}. "
        response += "Visit our reception desk for more detailed information about our services and facilities."
        
        return response
    
    def handle_billing(self, entities: Dict[str, Any]) -> str:
        """Handle billing and payment inquiries"""
        self.logger.log("INFO", "Processing billing request")
        
        response = "For billing and payment information, please visit the Billing Counter on the Ground Floor, Room 120. "
        response += "Our billing staff can help you with payment options, insurance claims, and cost estimates. "
        response += "We accept cash, cards, and most insurance plans."
        
        return response
    
    def handle_greeting(self, entities: Dict[str, Any]) -> str:
        """Handle greetings and welcome messages"""
        self.logger.log("INFO", "Processing greeting")
        
        responses = [
            "Hello! Welcome to our hospital. How can I assist you today?",
            "Good day! I'm here to help you with your hospital needs. What can I do for you?",
            "Welcome! I'm your healthcare assistant. Please tell me how I can help you.",
            "Hello there! I'm ready to assist you with registration, directions, or any other hospital services."
        ]
        
        return random.choice(responses)
    
    def handle_unknown(self, entities: Dict[str, Any]) -> str:
        """Handle unknown or unclear intents"""
        self.logger.log("WARNING", "Unknown intent - initiating handover")
        
        response = "I'm sorry, I didn't quite understand your request. "
        response += "Let me connect you with our hospital staff who can better assist you. "
        response += "Please wait a moment while I call someone to help you, or you can visit the reception desk directly."
        
        return response
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get current system status for monitoring"""
        return {
            'total_patients_registered': len(self.patient_database),
            'queue_lengths': {
                'general': len(self.queue_system['general']),
                'emergency': len(self.queue_system['emergency']),
                'specialist': len(self.queue_system['specialist'])
            },
            'timestamp': time.time()
        }
    
    def clear_old_queue_entries(self, max_age_hours: int = 24):
        """Clear old queue entries to prevent memory buildup"""
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        for queue_type in self.queue_system:
            self.queue_system[queue_type] = [
                entry for entry in self.queue_system[queue_type]
                if current_time - entry.get('timestamp', current_time) < max_age_seconds
            ]
        
        self.logger.log("INFO", f"Cleared queue entries older than {max_age_hours} hours")