"""
Voice Recognition & Conversational Response Engine
A lightweight conversational module for humanoid healthcare robots
"""

__version__ = "1.0.0"
__author__ = "Healthcare Robotics Team"
__description__ = "Voice Recognition Engine for Healthcare Robots"

from .main import VoiceEngine
from .speech_input import SpeechInput
from .intent_parser import IntentParser
from .router import Router
from .tts_output import TTSOutput

__all__ = [
    'VoiceEngine',
    'SpeechInput', 
    'IntentParser',
    'Router',
    'TTSOutput'
]