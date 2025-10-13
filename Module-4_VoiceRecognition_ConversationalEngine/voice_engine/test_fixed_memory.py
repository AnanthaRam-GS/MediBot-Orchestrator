#!/usr/bin/env python3
"""
Test the fixed memory commands
"""

from conversation_memory import ConversationMemory

def test_memory_commands():
    print('🧪 Testing Fixed Memory Commands...')
    memory = ConversationMemory()

    # Simulate a patient introducing themselves
    print('\n👤 Simulating patient introduction...')
    memory.add_conversation_turn(
        user_input='Hello, I am John Smith and I need help',
        bot_response='Hello John Smith! I am here to help you. What can I assist you with?',
        intent='greeting',
        language='en-IN',
        metadata={'confidence': 0.95}
    )

    # Test patient info
    print('\n📋 Patient Information:')
    patient_info = memory.get_patient_info()
    if patient_info.get('name'):
        print(f'   Name: {patient_info["name"]}')
        print(f'   Last activity: {patient_info.get("last_interaction", "N/A")}')
    else:
        print('   No patient information stored yet.')

    # Test memory command
    print('\n📝 Conversation History:')
    history = memory.get_conversation_history()
    if history:
        for i, entry in enumerate(history[-5:], 1):
            print(f'   {i}. User: {entry["transcript"]}')
            print(f'      Bot: {entry["response"][:80]}...')
    else:
        print('   No conversation history yet.')

    print('\n✅ Memory commands test completed!')

if __name__ == "__main__":
    test_memory_commands()