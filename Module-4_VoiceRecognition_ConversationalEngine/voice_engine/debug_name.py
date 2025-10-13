#!/usr/bin/env python3
"""
Debug name extraction
"""

import re

def test_name_extraction():
    transcript = "Hello, I am John Smith and I need help"
    
    print(f"Testing transcript: '{transcript}'")
    
    # More precise name introduction patterns
    name_patterns = [
        r'(?:i am|my name is|i\'m|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?:\s+(?:and|here|speaking|from)|$|\.|\,)',
        r'(?:this is|speaking is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?:\s+(?:and|here|speaking|from)|$|\.|\,)',
    ]
    
    for i, pattern in enumerate(name_patterns):
        print(f"\nTrying pattern {i+1}: {pattern}")
        match = re.search(pattern, transcript, re.IGNORECASE)
        if match:
            potential_name = match.group(1).strip().title()
            print(f"  Found match: '{potential_name}'")
            
            # Basic validation
            exclude_words = ['help', 'please', 'thank you', 'pain', 'doctor', 'nurse', 
                           'emergency', 'appointment', 'medicine', 'water', 'food', 'having']
            
            if (len(potential_name.split()) <= 3 and 
                potential_name.lower() not in exclude_words and
                not any(word.lower() in exclude_words for word in potential_name.split())):
                print(f"  ✅ Valid name: {potential_name}")
                break
            else:
                print(f"  ❌ Invalid name (excluded)")
        else:
            print("  No match")

if __name__ == "__main__":
    test_name_extraction()