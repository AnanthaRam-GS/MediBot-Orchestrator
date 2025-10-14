from flask import Flask, render_template, jsonify, request
import queue_system  # your backend file

app = Flask(__name__)

# Home route to display dashboard
@app.route('/')
def home():
    # Looks for 'dashboard.html' in the 'templates' folder
    return render_template('dashboard.html')

# API to get current queue, history, and stats
@app.route('/api/queue')
def get_queue_data():
    # Calls the main aggregator function in the backend
    return jsonify(queue_system.get_queue())

# API to add a patient (manual or from Flutter) - MODIFIED to receive severity
@app.route('/api/add', methods=['POST'])
def add_patient_api():
    data = request.get_json()
    name = data.get('name')
    p_type = data.get('type', 'walk-in')
    severity = data.get('severity', 5) # NEW: Get the severity score, default to 5
    
    queue_system.add_patient(name, p_type, severity) # MODIFIED: Pass severity
    return jsonify({"status": "success", "message": f"Added patient: {name}"})

# API to mark a patient as done
@app.route('/api/done/<int:pid>', methods=['POST'])
def mark_done_api(pid):
    queue_system.mark_done(pid)
    return jsonify({"status": "done", "message": f"Marked patient ID {pid} as done"})

if __name__ == '__main__':
    queue_system.init_system()  # start fresh
    
    # Add initial data so the dashboard isn't empty on startup
    queue_system.add_patient("Initial Appointment Test", "appointment", severity=3)
    queue_system.add_patient("Initial Walk-in Test", "walk-in", severity=5)
    
    # Use 127.0.0.1 for local testing, which is safer
    app.run(host='127.0.0.1', port=5000, debug=True)