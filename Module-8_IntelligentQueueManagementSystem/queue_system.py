# queue_system.py - Modified to include Severity Score for dynamic prioritization
# -----------------------------------------------

from datetime import datetime

# Global data
patients = []      
next_id = 1        

# 1️⃣ Initialize or Reset System
def init_system():
    """Clears all patients and resets ID counter."""
    global patients, next_id
    patients = []
    next_id = 1

# 2️⃣ Add a New Patient - MODIFIED to accept severity
def add_patient(name, p_type, severity=5): 
    """Adds a new patient and updates the queue."""
    global next_id
    if not name:
        return # Do not add patient if name is empty

    # Priority levels: lower number = higher priority
    priority_map = {"emergency": 1, "appointment": 2, "walk-in": 3}
    priority = priority_map.get(p_type.lower(), 3)
    
    # Ensure severity is an integer, defaulting to 5
    try:
        severity = int(severity)
        if not (1 <= severity <= 10): # Keep score in valid range
             severity = 5
    except (ValueError, TypeError):
        severity = 5

    patient = {
        "id": next_id,
        "name": name,
        "type": p_type.capitalize(),
        "priority": priority,
        "severity_score": severity, # NEW FIELD
        "arrival_time": datetime.now().strftime("%I:%M %p"),
        "estimated_wait_min": 0,
        "status": "waiting"
    }

    patients.append(patient)
    next_id += 1

    sort_queue()
    calculate_wait_times()

# 3️⃣ Sort the Queue - MODIFIED to sort by Severity Score first
def sort_queue():
    """Sort patients by severity (highest first), then by priority, then by arrival order (id)."""
    # Key: (-Severity Score, Priority, ID). Negative score sorts highest severity (10) first.
    patients.sort(key=lambda p: (-p["severity_score"], p["priority"], p["id"]))

# 4️⃣ Calculate Estimated Waiting Time
def calculate_wait_times():
    """Assigns estimated waiting time based on position in queue."""
    avg_time_per_patient = 5  # in minutes
    total_wait = 0

    for p in patients:
        if p["status"] == "waiting":
            p["estimated_wait_min"] = total_wait
            total_wait += avg_time_per_patient
        else:
            p["estimated_wait_min"] = 0 # Clear wait time for completed patients

# 5️⃣ Get Active and Completed Patients
def get_active_queue():
    """Returns a list of all waiting patients."""
    return [p for p in patients if p["status"] == "waiting"]

def get_history_list():
    """Returns a list of all completed patients (most recent first)."""
    return [p for p in patients if p["status"] == "done"][::-1]

def get_stats():
    """Calculates dashboard statistics."""
    waiting = get_active_queue()
    completed = get_history_list()
    
    total_wait = sum(p["estimated_wait_min"] for p in waiting)
    avg_wait = round(total_wait / len(waiting)) if waiting else 0
    
    return {
        "totalPatients": len(waiting),
        "avgWaitTime": avg_wait,
        "completedToday": len(patients) - len(waiting)
    }
    
# 6️⃣ API Response Aggregator
def get_queue():
    """Returns the full data structure required by the HTML dashboard."""
    sort_queue()
    calculate_wait_times()
    
    return {
        "queue": get_active_queue(),
        "history": get_history_list(),
        "stats": get_stats()
    }

# 7️⃣ Mark a Patient as Done
def mark_done(pid):
    """Marks a patient as done using their ID."""
    try:
        pid = int(pid) # Ensure ID is integer
    except ValueError:
        return

    for p in patients:
        if p["id"] == pid:
            p["status"] = "done"
            p["completion_time"] = datetime.now().strftime("%I:%M %p")
            break
    sort_queue()
    calculate_wait_times()