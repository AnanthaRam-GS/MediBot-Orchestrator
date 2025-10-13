"""
GPIO Manager Module for Raspberry Pi Hardware Control
Handles button inputs and LED indicators for the voice recognition system
"""

import time
import threading
from typing import Callable, Optional
from utils.logger import Logger

try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
except ImportError:
    GPIO_AVAILABLE = False
    print("RPi.GPIO not available - running in simulation mode")

class GPIOManager:
    """
    Manages GPIO operations for the voice recognition engine
    Handles button inputs, LED indicators, and hardware interactions
    Falls back to simulation mode when not running on Raspberry Pi
    """
    
    def __init__(self, button_pin: int = 17, led_pins: dict = None):
        """
        Initialize GPIO manager
        
        Args:
            button_pin: GPIO pin for the start listening button
            led_pins: Dictionary mapping LED states to GPIO pins
                     Default: {'listening': 18, 'processing': 19, 'speaking': 20}
        """
        self.logger = Logger()
        self.button_pin = button_pin
        self.led_pins = led_pins or {
            'listening': 18,    # Yellow LED
            'processing': 19,   # Blue LED  
            'speaking': 20      # Green LED
        }
        
        self.gpio_available = GPIO_AVAILABLE
        self.button_callback = None
        self.current_led_state = None
        self.simulation_mode = not GPIO_AVAILABLE
        
        if self.gpio_available:
            self._setup_gpio()
        else:
            self.logger.log("WARNING", "GPIO not available - running in simulation mode")
    
    def _setup_gpio(self):
        """Setup GPIO pins for buttons and LEDs"""
        try:
            # Set GPIO mode
            GPIO.setmode(GPIO.BCM)
            GPIO.setwarnings(False)
            
            # Setup button pin (input with pull-up resistor)
            GPIO.setup(self.button_pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
            
            # Setup LED pins (outputs)
            for led_name, pin in self.led_pins.items():
                GPIO.setup(pin, GPIO.OUT)
                GPIO.output(pin, GPIO.LOW)  # Start with all LEDs off
            
            self.logger.log("INFO", f"GPIO setup completed - Button: {self.button_pin}, LEDs: {self.led_pins}")
            
        except Exception as e:
            self.logger.log("ERROR", f"GPIO setup failed: {str(e)}")
            self.gpio_available = False
            self.simulation_mode = True
    
    def set_button_callback(self, callback: Callable):
        """
        Set callback function for button press events
        
        Args:
            callback: Function to call when button is pressed
        """
        self.button_callback = callback
        
        if self.gpio_available:
            try:
                # Setup interrupt for button press (falling edge with debounce)
                GPIO.add_event_detect(
                    self.button_pin, 
                    GPIO.FALLING, 
                    callback=self._button_interrupt_handler,
                    bouncetime=300  # 300ms debounce
                )
                self.logger.log("INFO", "Button callback registered")
                
            except Exception as e:
                self.logger.log("ERROR", f"Failed to setup button interrupt: {str(e)}")
        else:
            self.logger.log("INFO", "Button callback registered (simulation mode)")
    
    def _button_interrupt_handler(self, channel):
        """Internal interrupt handler for button press"""
        if self.button_callback:
            self.logger.log("INFO", "Button pressed - triggering callback")
            # Run callback in separate thread to avoid blocking
            threading.Thread(target=self.button_callback, daemon=True).start()
    
    def simulate_button_press(self):
        """Simulate button press for testing (when GPIO not available)"""
        if self.simulation_mode and self.button_callback:
            self.logger.log("INFO", "Simulating button press")
            threading.Thread(target=self.button_callback, daemon=True).start()
    
    def set_led_state(self, state: str):
        """
        Set LED state to indicate system status
        
        Args:
            state: LED state ('listening', 'processing', 'speaking', 'off')
        """
        if self.gpio_available:
            try:
                # Turn off all LEDs first
                for pin in self.led_pins.values():
                    GPIO.output(pin, GPIO.LOW)
                
                # Turn on specific LED if requested
                if state in self.led_pins:
                    GPIO.output(self.led_pins[state], GPIO.HIGH)
                    self.current_led_state = state
                elif state == 'off':
                    self.current_led_state = 'off'
                
                self.logger.log("INFO", f"LED state set to: {state}")
                
            except Exception as e:
                self.logger.log("ERROR", f"Failed to set LED state: {str(e)}")
        else:
            # Simulation mode - just log the state
            self.current_led_state = state
            led_colors = {
                'listening': '🟡 YELLOW',
                'processing': '🔵 BLUE', 
                'speaking': '🟢 GREEN',
                'off': '⚫ OFF'
            }
            color_indicator = led_colors.get(state, '❓ UNKNOWN')
            print(f"[LED] {color_indicator} - {state.upper()}")
    
    def led_blink(self, state: str, times: int = 3, interval: float = 0.5):
        """
        Blink LED for attention/notification
        
        Args:
            state: LED state to blink
            times: Number of blinks
            interval: Time between blinks in seconds
        """
        if state not in self.led_pins and state != 'off':
            self.logger.log("WARNING", f"Invalid LED state for blinking: {state}")
            return
        
        def blink_thread():
            original_state = self.current_led_state
            
            for _ in range(times):
                self.set_led_state(state)
                time.sleep(interval)
                self.set_led_state('off')
                time.sleep(interval)
            
            # Restore original state
            if original_state:
                self.set_led_state(original_state)
        
        threading.Thread(target=blink_thread, daemon=True).start()
        self.logger.log("INFO", f"LED blink started: {state} x{times}")
    
    def led_pulse(self, state: str, duration: float = 2.0):
        """
        Create pulsing effect for LED (simulation only)
        
        Args:
            state: LED state to pulse
            duration: Duration of pulse effect
        """
        if self.simulation_mode:
            def pulse_thread():
                steps = 20
                for i in range(steps):
                    intensity = (i % 10) / 10.0
                    print(f"[LED PULSE] {state.upper()} - Intensity: {'█' * int(intensity * 10)}")
                    time.sleep(duration / steps)
                self.set_led_state(state)
            
            threading.Thread(target=pulse_thread, daemon=True).start()
        else:
            # For real GPIO, just set the LED state
            self.set_led_state(state)
    
    def get_button_state(self) -> bool:
        """
        Get current button state
        
        Returns:
            True if button is pressed, False otherwise
        """
        if self.gpio_available:
            try:
                # Button is pressed when pin reads LOW (due to pull-up resistor)
                return GPIO.input(self.button_pin) == GPIO.LOW
            except Exception as e:
                self.logger.log("ERROR", f"Failed to read button state: {str(e)}")
                return False
        else:
            # Simulation mode - always return False unless explicitly pressed
            return False
    
    def test_leds(self):
        """Test all LEDs in sequence"""
        self.logger.log("INFO", "Testing LED sequence")
        
        test_sequence = ['listening', 'processing', 'speaking', 'off']
        
        for state in test_sequence:
            self.set_led_state(state)
            time.sleep(1)
        
        self.logger.log("INFO", "LED test completed")
    
    def test_button(self, timeout: float = 10.0) -> bool:
        """
        Test button functionality
        
        Args:
            timeout: Maximum time to wait for button press
            
        Returns:
            True if button press detected within timeout
        """
        self.logger.log("INFO", f"Testing button - waiting {timeout} seconds for press")
        
        if self.simulation_mode:
            print("Press Enter to simulate button press...")
            
        start_time = time.time()
        button_pressed = False
        
        def button_test_callback():
            nonlocal button_pressed
            button_pressed = True
        
        # Temporarily set test callback
        original_callback = self.button_callback
        self.set_button_callback(button_test_callback)
        
        # Wait for button press or timeout
        while time.time() - start_time < timeout and not button_pressed:
            if self.simulation_mode:
                # Check for Enter key press in simulation
                import select
                import sys
                if sys.stdin in select.select([sys.stdin], [], [], 0)[0]:
                    input()  # Consume the input
                    button_pressed = True
            
            time.sleep(0.1)
        
        # Restore original callback
        self.button_callback = original_callback
        if self.gpio_available and original_callback:
            GPIO.add_event_detect(
                self.button_pin, 
                GPIO.FALLING, 
                callback=self._button_interrupt_handler,
                bouncetime=300
            )
        
        result = button_pressed
        self.logger.log("INFO", f"Button test result: {'PASSED' if result else 'FAILED'}")
        return result
    
    def emergency_signal(self):
        """Emergency LED signal - rapid red blinking"""
        if 'emergency' in self.led_pins:
            self.led_blink('emergency', times=10, interval=0.1)
        else:
            # Use available LEDs for emergency signal
            self.led_blink('speaking', times=5, interval=0.1)  # Fast green blink
        
        self.logger.log("WARNING", "Emergency signal activated")
    
    def cleanup(self):
        """Clean up GPIO resources"""
        if self.gpio_available:
            try:
                # Turn off all LEDs
                for pin in self.led_pins.values():
                    GPIO.output(pin, GPIO.LOW)
                
                # Clean up GPIO
                GPIO.cleanup()
                self.logger.log("INFO", "GPIO cleanup completed")
                
            except Exception as e:
                self.logger.log("ERROR", f"GPIO cleanup failed: {str(e)}")
        
        self.current_led_state = None
    
    def __del__(self):
        """Destructor - ensure GPIO cleanup"""
        self.cleanup()