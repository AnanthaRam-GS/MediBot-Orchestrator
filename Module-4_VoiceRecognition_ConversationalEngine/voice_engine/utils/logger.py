"""
Logger Module for Voice Recognition Engine
Provides centralized logging functionality with file and console output
"""

import os
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

class Logger:
    """
    Centralized logging system for the voice recognition engine
    Logs to both console and JSON file for monitoring and debugging
    """
    
    def __init__(self, log_dir: str = "logs", max_log_size: int = 10485760):  # 10MB default
        """
        Initialize logger
        
        Args:
            log_dir: Directory to store log files
            max_log_size: Maximum size of log file before rotation (bytes)
        """
        self.log_dir = log_dir
        self.max_log_size = max_log_size
        self.session_id = int(time.time())
        
        # Ensure log directory exists
        if not os.path.exists(self.log_dir):
            os.makedirs(self.log_dir)
        
        # Log file paths
        self.session_log_file = os.path.join(self.log_dir, f"session_{self.session_id}.json")
        self.system_log_file = os.path.join(self.log_dir, "system.log")
        
        # Initialize session log
        self.session_data = {
            'session_id': self.session_id,
            'start_time': datetime.now().isoformat(),
            'events': []
        }
        
        self.log("INFO", "Logger initialized")
    
    def log(self, level: str, message: str, extra_data: Optional[Dict[str, Any]] = None):
        """
        Log a message with specified level
        
        Args:
            level: Log level (INFO, WARNING, ERROR, DEBUG)
            message: Log message
            extra_data: Additional data to include in log entry
        """
        timestamp = datetime.now().isoformat()
        
        # Create log entry
        log_entry = {
            'timestamp': timestamp,
            'level': level,
            'message': message,
            'session_id': self.session_id
        }
        
        if extra_data:
            log_entry['extra_data'] = extra_data
        
        # Add to session log
        self.session_data['events'].append(log_entry)
        
        # Console output with color coding
        self._print_console_log(level, timestamp, message)
        
        # Write to files
        self._write_session_log()
        self._write_system_log(log_entry)
    
    def _print_console_log(self, level: str, timestamp: str, message: str):
        """Print colored console output"""
        # Color codes for different log levels
        colors = {
            'INFO': '\033[94m',      # Blue
            'WARNING': '\033[93m',   # Yellow
            'ERROR': '\033[91m',     # Red
            'DEBUG': '\033[92m',     # Green
            'RESET': '\033[0m'       # Reset
        }
        
        color = colors.get(level, colors['RESET'])
        reset = colors['RESET']
        
        # Format timestamp
        time_str = timestamp.split('T')[1][:8]  # Extract HH:MM:SS
        
        print(f"{color}[{time_str}] {level}: {message}{reset}")
    
    def _write_session_log(self):
        """Write session data to JSON file"""
        try:
            with open(self.session_log_file, 'w') as f:
                json.dump(self.session_data, f, indent=2)
        except Exception as e:
            print(f"Error writing session log: {str(e)}")
    
    def _write_system_log(self, log_entry: Dict[str, Any]):
        """Write log entry to system log file"""
        try:
            # Check log file size and rotate if needed
            if os.path.exists(self.system_log_file):
                if os.path.getsize(self.system_log_file) > self.max_log_size:
                    self._rotate_log_file()
            
            # Append to system log
            with open(self.system_log_file, 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
                
        except Exception as e:
            print(f"Error writing system log: {str(e)}")
    
    def _rotate_log_file(self):
        """Rotate log file when it gets too large"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = os.path.join(self.log_dir, f"system_{timestamp}.log")
            
            if os.path.exists(self.system_log_file):
                os.rename(self.system_log_file, backup_file)
            
            self.log("INFO", f"Log file rotated to {backup_file}")
            
        except Exception as e:
            print(f"Error rotating log file: {str(e)}")
    
    def log_speech_interaction(self, transcript: str, intent: str, response: str, 
                             confidence: float, language_code: str):
        """
        Log a complete speech interaction
        
        Args:
            transcript: User's speech transcript
            intent: Detected intent
            response: System response
            confidence: Intent detection confidence
            language_code: Detected language
        """
        interaction_data = {
            'transcript': transcript,
            'intent': intent,
            'confidence': confidence,
            'language_code': language_code,
            'response': response
        }
        
        self.log("INFO", "Speech interaction completed", interaction_data)
    
    def log_error_with_context(self, error: Exception, context: str, extra_data: Optional[Dict] = None):
        """
        Log error with additional context
        
        Args:
            error: Exception object
            context: Context where error occurred
            extra_data: Additional context data
        """
        error_data = {
            'error_type': type(error).__name__,
            'error_message': str(error),
            'context': context
        }
        
        if extra_data:
            error_data.update(extra_data)
        
        self.log("ERROR", f"Error in {context}: {str(error)}", error_data)
    
    def log_system_stats(self, stats: Dict[str, Any]):
        """Log system statistics"""
        self.log("INFO", "System statistics", stats)
    
    def get_session_summary(self) -> Dict[str, Any]:
        """
        Get summary of current session
        
        Returns:
            Session summary with statistics
        """
        total_events = len(self.session_data['events'])
        
        # Count events by level
        level_counts = {}
        for event in self.session_data['events']:
            level = event['level']
            level_counts[level] = level_counts.get(level, 0) + 1
        
        # Count speech interactions
        speech_interactions = sum(1 for event in self.session_data['events'] 
                                if 'Speech interaction completed' in event['message'])
        
        return {
            'session_id': self.session_id,
            'start_time': self.session_data['start_time'],
            'total_events': total_events,
            'level_counts': level_counts,
            'speech_interactions': speech_interactions,
            'session_duration_minutes': (time.time() - self.session_id) / 60
        }
    
    def close_session(self):
        """Close current logging session"""
        summary = self.get_session_summary()
        self.log("INFO", "Session ending", summary)
        
        # Final write to session log
        self.session_data['end_time'] = datetime.now().isoformat()
        self.session_data['summary'] = summary
        self._write_session_log()
    
    def get_recent_logs(self, count: int = 10) -> list:
        """
        Get recent log entries
        
        Args:
            count: Number of recent entries to return
            
        Returns:
            List of recent log entries
        """
        return self.session_data['events'][-count:] if self.session_data['events'] else []
    
    def search_logs(self, search_term: str, level: Optional[str] = None) -> list:
        """
        Search log entries
        
        Args:
            search_term: Term to search for in messages
            level: Optional log level filter
            
        Returns:
            List of matching log entries
        """
        matching_entries = []
        
        for entry in self.session_data['events']:
            # Check level filter
            if level and entry['level'] != level:
                continue
            
            # Check search term
            if search_term.lower() in entry['message'].lower():
                matching_entries.append(entry)
        
        return matching_entries