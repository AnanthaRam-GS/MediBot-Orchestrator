#!/usr/bin/env python3
"""
Test script for Conversation Memory System
"""

from conversation_memory import ConversationMemory
import json

def test_memory_system():
    print('🧪 Testing Conversation Memory System...')
    print('=' * 50)

    # Initialize memory
    memory = ConversationMemory()
    print('✅ Memory initialized successfully')

    # Test 1: Add patient info
    print('\n📝 Test 1: Adding patient information')
    memory.update_patient_info(name='John Doe', age=45, room='205')
    patient_info = memory.get_patient_info()
    print(f'Patient: {patient_info["name"]}, Age: {patient_info["age"]}, Room: {patient_info["room"]}')

    # Test 2: Add conversation turns
    print('\n💬 Test 2: Adding conversation turns')
    memory.add_conversation_turn(
        user_input='Hello, I am having chest pain',
        bot_response='I understand you are experiencing chest pain. I will call a nurse immediately.',
        intent='emergency',
        language='en-IN',
        metadata={'confidence': 0.95, 'priority': 'urgent'}
    )

    memory.add_conversation_turn(
        user_input='When will the doctor come?',
        bot_response='The doctor has been notified and will be with you shortly. Please try to stay calm.',
        intent='doctor_inquiry',
        language='en-IN',
        metadata={'confidence': 0.88, 'priority': 'high'}
    )

    print('✅ Added 2 conversation turns')

    # Test 3: Get conversation context
    print('\n🧠 Test 3: Generating conversation context')
    context = memory.get_conversation_context()
    print('Context preview:', context[:200] + '...' if len(context) > 200 else context)

    # Test 4: Get conversation history
    print('\n📚 Test 4: Retrieving conversation history')
    history = memory.get_conversation_history()
    print(f'History entries: {len(history)}')
    for i, entry in enumerate(history, 1):
        print(f'  {i}. User: {entry["transcript"][:50]}...')
        print(f'      Bot: {entry["response"][:50]}...')

    # Test 5: Get insights
    print('\n📊 Test 5: Memory insights')
    insights = memory.get_conversation_insights()
    print(f'Patient engagement: {insights["patient_engagement"]} interactions')
    print(f'Unique intents used: {insights["unique_intents"]}')
    print(f'Unresolved needs: {insights["unresolved_needs"]}')
    print(f'Conversation quality: {insights["conversation_quality"]}')

    # Test 6: Reset memory
    print('\n🔄 Test 6: Testing memory reset')
    memory.reset_patient_memory()
    patient_info_after_reset = memory.get_patient_info()
    history_after_reset = memory.get_conversation_history()
    print(f'Patient name after reset: {patient_info_after_reset.get("name", "None")}')
    print(f'History entries after reset: {len(history_after_reset)}')

    print('\n🎉 All memory tests completed successfully!')

if __name__ == "__main__":
    test_memory_system()