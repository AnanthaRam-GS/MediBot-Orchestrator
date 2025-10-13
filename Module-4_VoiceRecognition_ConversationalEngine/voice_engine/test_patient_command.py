#!/usr/bin/env python3
"""
Test the fixed patient command
"""

from conversation_memory import ConversationMemory
import datetime

def test_patient_command():
    print('🧪 Testing Fixed Patient Command...')
    memory = ConversationMemory()

    # Simulate patient interaction
    print('\n👤 Adding patient interaction...')
    memory.add_conversation_turn(
        user_input='Hello, I am Arun and I need help with my medication',
        bot_response='Hello Arun! I can help you with your medication. What specific help do you need?',
        intent='greeting',
        language='en-IN',
        metadata={'confidence': 0.95}
    )

    # Test patient command display
    print('\n📋 Testing Patient Information Display:')
    patient_info = memory.get_patient_info()
    
    if patient_info.get('name'):
        print(f"   Name: {patient_info['name']}")
        if patient_info.get('preferred_language'):
            print(f"   Preferred Language: {patient_info['preferred_language']}")
        if patient_info.get('patient_id'):
            print(f"   Patient ID: {patient_info['patient_id']}")
        if patient_info.get('last_interaction'):
            last_time = datetime.datetime.fromtimestamp(patient_info['last_interaction'])
            print(f"   Last Activity: {last_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Show conversation stats
        history = memory.get_conversation_history()
        print(f"   Total Interactions: {len(history)}")
        
        if patient_info.get('medical_needs'):
            print(f"   Medical Needs: {', '.join(patient_info['medical_needs'])}")
    else:
        print("   No patient information stored yet.")

    print('\n✅ Patient command test completed!')

if __name__ == "__main__":
    test_patient_command()