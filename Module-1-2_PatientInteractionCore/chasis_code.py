import RPi.GPIO as GPIO
import time

IN1, IN2 = 5, 6         # Motor A
IN3, IN4 = 23, 24       # Motor B
TRIG, ECHO = 20, 21     # Ultrasonic Sensor

GPIO.setwarnings(False)
GPIO.setmode(GPIO.BCM)
GPIO.setup([IN1, IN2, IN3, IN4, TRIG], GPIO.OUT)
GPIO.setup(ECHO, GPIO.IN)
GPIO.output(TRIG, False)   # ensure trigger low

def pwm_drive(pin_pairs, speed, duration):
    speed = max(0, min(100, speed))
    if speed == 0:
        for a, b in pin_pairs:
            GPIO.output(a, 0)
            GPIO.output(b, 0)
        time.sleep(duration)
        return

    period = 0.02  # 20ms = 50Hz
    on_time = period * (speed / 100.0)
    off_time = period - on_time
    cycles = int(duration / period)
    if cycles <= 0:
        cycles = 1

    for _ in range(cycles):
        for INx1, INx2 in pin_pairs:
            GPIO.output(INx1, 1)
            GPIO.output(INx2, 0)
        if on_time > 0:
            time.sleep(on_time)
        for INx1, INx2 in pin_pairs:
            GPIO.output(INx1, 0)
            GPIO.output(INx2, 0)
        if off_time > 0:
            time.sleep(off_time)

def stop():
    GPIO.output(IN1, 0)
    GPIO.output(IN2, 0)
    GPIO.output(IN3, 0)
    GPIO.output(IN4, 0)

def forward(speed=50, duration=0.1):
    pwm_drive([(IN1, IN2), (IN3, IN4)], speed, duration)

def backward(speed=50, duration=0.1):
    pwm_drive([(IN2, IN1), (IN4, IN3)], speed, duration)

def left(speed=30, duration=0.1):
    pwm_drive([(IN2, IN1), (IN3, IN4)], speed, duration)

def right(speed=30, duration=0.1):
    pwm_drive([(IN1, IN2), (IN4, IN3)], speed, duration)

def get_distance(samples=3, timeout=0.03):
    readings = []
    for _ in range(samples):
        GPIO.output(TRIG, False)
        time.sleep(0.00005)

        GPIO.output(TRIG, True)
        time.sleep(0.00001)
        GPIO.output(TRIG, False)

        # Wait for echo start
        start_time = time.time()
        while GPIO.input(ECHO) == 0:
            pulse_start = time.time()
            if pulse_start - start_time > timeout:
                pulse_start = None
                break
        if pulse_start is None:
            continue

        while GPIO.input(ECHO) == 1:
            pulse_end = time.time()
            if pulse_end - pulse_start > timeout:
                pulse_end = None
                break
        if pulse_end is None:
            continue

        duration = pulse_end - pulse_start
        distance = (duration * 34300) / 2  # in cm

        if 2 < distance < 400:
            readings.append(distance)

        time.sleep(0.02)

    if not readings:
        return 400.0
    return round(sum(readings) / len(readings), 2)

try:
    SAFE_DISTANCE = 40
    STOP_DISTANCE = 25
    RETRY_LIMIT = 3
    last_turn = "right"
    retry_count = 0

    print("Robot Started (Speed Controlled Mode)! Press Ctrl+C to stop.")

    while True:
        dist = get_distance()
        print(f" Distance: {dist} cm")

        if dist < STOP_DISTANCE:
            print(" Too Close! Stopping & Backing up...")
            stop()
            time.sleep(0.3)
            backward(speed=50, duration=1.0)
            stop()
            retry_count += 1

            if retry_count >= RETRY_LIMIT:
                print(" Seems stuck! Performing hard turn...")
                backward(speed=50, duration=1.2)
                stop()
                right(speed=30, duration=1.2)
                stop()
                retry_count = 0
                continue

            turns = 3   # change this number if you want more or fewer turns
            for i in range(turns):
                if last_turn == "right":
                    print(f" Turning Left to Avoid Obstacle (Turn {i+1})")
                    left(speed=30, duration=0.6)
                    last_turn = "left"
                else:
                    print(f" Turning Right to Avoid Obstacle (Turn {i+1})")
                    right(speed=30, duration=0.6)
                    last_turn = "right"
                stop()
                time.sleep(0.2)  # small pause between turns

        elif dist < SAFE_DISTANCE:
            print(" Object Ahead. Slowing Down.")
            forward(speed=40, duration=0.1)

        else:
            print(" Path Clear: Moving Forward.")
            forward(speed=50, duration=0.1)
            retry_count = 0

except KeyboardInterrupt:
    print("\n Program stopped by user.")

finally:
    stop()
    GPIO.cleanup()
    print(" GPIO cleaned and motors stopped safely.")
