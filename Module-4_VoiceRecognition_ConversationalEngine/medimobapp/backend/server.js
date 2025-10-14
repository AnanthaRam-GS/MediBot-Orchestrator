const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Flask API configuration (Python Facial Recognition Module)
const FACE_API_URL = 'http://localhost:5000/api';

// Detailed logging helper
const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [BACKEND] [${level}] ${message}`);
  if (data) {
    console.log(`[${timestamp}] [BACKEND] [DATA]`, JSON.stringify(data, null, 2));
  }
};

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  log('INFO', `${req.method} ${req.path}`);
  next();
});

// Database Configuration
const dbConfig = {
  host: '10.147.145.165',
  port: 3306,
  user: 'robot_user',
  password: 'robot_pass',
  database: 'robot_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+05:30',
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
(async () => {
  try {
    const connection = await pool.getConnection();
    log('SUCCESS', '✅ Database connected successfully');
    connection.release();
  } catch (err) {
    log('ERROR', '❌ Database connection failed', { error: err.message });
  }
})();

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Medi Assist Backend API is running' });
});

// ============================================================================
// FACIAL RECOGNITION ROUTES (Proxy to Flask API)
// ============================================================================

// Recognize patient by face
app.post('/api/patients/recognize-face', async (req, res) => {
  log('INFO', '=== FACE RECOGNITION REQUEST ===');
  
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ success: false, error: 'Image is required' });
    }
    
    log('INFO', `Forwarding to Flask API: ${FACE_API_URL}/recognize-face`);
    
    const response = await axios.post(`${FACE_API_URL}/recognize-face`, 
      { image },
      { timeout: 30000 }
    );
    
    log('SUCCESS', 'Flask API responded', response.data);
    
    res.json(response.data);
  } catch (error) {
    log('ERROR', '❌ Face recognition error', { message: error.message });
    res.status(500).json({ 
      success: false,
      error: 'Face recognition service unavailable', 
      details: error.message
    });
  }
});

// Register new patient
app.post('/api/patients/register', async (req, res) => {
  log('INFO', '=== PATIENT REGISTRATION REQUEST ===');
  
  try {
    const { name, image } = req.body;
    
    if (!name || !image) {
      return res.status(400).json({ success: false, error: 'Name and image are required' });
    }
    
    log('INFO', `Registering: ${name}`);
    log('INFO', `Forwarding to Flask API: ${FACE_API_URL}/register-patient`);
    
    const response = await axios.post(`${FACE_API_URL}/register-patient`, 
      { name, image },
      { timeout: 30000 }
    );
    
    log('SUCCESS', 'Flask API responded', response.data);
    
    res.json(response.data);
  } catch (error) {
    log('ERROR', '❌ Patient registration error', { message: error.message });
    res.status(500).json({ 
      success: false,
      error: 'Registration service unavailable', 
      details: error.message
    });
  }
});

// Get patient by ID
app.get('/api/patients/:id', async (req, res) => {
  log('INFO', `Getting patient: ${req.params.id}`);
  
  try {
    const [patients] = await pool.query(
      'SELECT patient_id as id, name, created_at FROM facial_recognition_users WHERE patient_id = ?',
      [req.params.id]
    );
    
    if (patients.length === 0) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }
    
    res.json({ success: true, patient: patients[0] });
  } catch (error) {
    log('ERROR', 'Get patient error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch patient' });
  }
});

// ============================================================================
// DOCTORS ROUTES
// ============================================================================

// Get all available doctors
app.get('/api/doctors', async (req, res) => {
  log('INFO', 'Getting all doctors');
  
  try {
    const [doctors] = await pool.query(`
      SELECT d.*, 
             (SELECT COUNT(*) FROM doctor_queues dq 
              WHERE dq.doctor_id = d.id AND dq.status IN ('Waiting', 'In_Session')) as current_queue_count
      FROM doctors d
      WHERE is_available = TRUE
      ORDER BY specialty, name
    `);
    
    log('SUCCESS', `Found ${doctors.length} doctors`);
    res.json({ success: true, doctors });
  } catch (error) {
    log('ERROR', 'Get doctors error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch doctors' });
  }
});

// Get doctor by ID
app.get('/api/doctors/:id', async (req, res) => {
  try {
    const [doctors] = await pool.query('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    
    if (doctors.length === 0) {
      return res.status(404).json({ success: false, error: 'Doctor not found' });
    }
    
    res.json({ success: true, doctor: doctors[0] });
  } catch (error) {
    log('ERROR', 'Get doctor error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch doctor' });
  }
});

// ============================================================================
// APPOINTMENTS ROUTES
// ============================================================================

// Create appointment
app.post('/api/appointments', async (req, res) => {
  log('INFO', '=== CREATE APPOINTMENT ===');
  
  try {
    const { patient_id, doctor_id, reason, priority, symptoms, language_used } = req.body;
    
    if (!patient_id || !doctor_id) {
      return res.status(400).json({ success: false, error: 'Patient ID and Doctor ID required' });
    }
    
    log('INFO', 'Creating appointment', { patient_id, doctor_id, priority });
    
    const appointmentTime = new Date();
    
    // Insert appointment
    const [result] = await pool.query(
      `INSERT INTO appointments 
       (patient_id, doctor_id, appointment_time, duration_minutes, reason, symptoms, priority, source, language_used, status, checked_in_at)
       VALUES (?, ?, ?, 15, ?, ?, ?, 'voice', ?, 'confirmed', NOW())`,
      [patient_id, doctor_id, appointmentTime, reason || 'General consultation', symptoms, priority || 'normal', language_used || 'en-IN']
    );
    
    const appointmentId = result.insertId;
    log('SUCCESS', `Appointment created: ${appointmentId}`);
    
    // Calculate queue position
    const [queueCount] = await pool.query(
      `SELECT COUNT(*) as count FROM doctor_queues 
       WHERE doctor_id = ? AND status IN ('Waiting', 'In_Session')`,
      [doctor_id]
    );
    
    let queuePosition = queueCount[0].count + 1;
    
    // Handle priority
    if (priority === 'emergency') {
      queuePosition = 1;
      await pool.query(
        `UPDATE doctor_queues SET queue_position = queue_position + 1 
         WHERE doctor_id = ? AND status = 'Waiting'`,
        [doctor_id]
      );
    }
    
    // Add to queue
    await pool.query(
      `INSERT INTO doctor_queues 
       (doctor_id, patient_id, appointment_id, queue_position, status, arrival_time)
       VALUES (?, ?, ?, ?, 'Waiting', NOW())`,
      [doctor_id, patient_id, appointmentId, queuePosition]
    );
    
    log('SUCCESS', `✅ Queue position: ${queuePosition}`);
    
    // Get full details
    const [appointments] = await pool.query(
      `SELECT a.*, d.name as doctor_name, d.specialty, d.room_number,
              p.name as patient_name
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id
       JOIN facial_recognition_users p ON a.patient_id = p.patient_id
       WHERE a.id = ?`,
      [appointmentId]
    );
    
    res.json({
      success: true,
      appointment: appointments[0],
      queuePosition,
      message: 'Appointment booked successfully'
    });
    
  } catch (error) {
    log('ERROR', '❌ Create appointment error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create appointment' });
  }
});

// Create emergency appointment
app.post('/api/appointments/emergency', async (req, res) => {
  log('WARN', '🚨 EMERGENCY APPOINTMENT REQUEST');
  
  try {
    const { patientId, patientName, reason } = req.body;
    
    if (!patientId) {
      return res.status(400).json({ success: false, error: 'Patient ID required' });
    }
    
    // Find available doctor
    const [doctors] = await pool.query(`
      SELECT id, name, specialty 
      FROM doctors 
      WHERE is_available = TRUE 
      ORDER BY CASE WHEN specialty LIKE '%General%' THEN 0 ELSE 1 END
      LIMIT 1
    `);
    
    if (doctors.length === 0) {
      return res.status(503).json({ success: false, error: 'No doctors available' });
    }
    
    const doctor = doctors[0];
    log('INFO', `Assigned to Dr. ${doctor.name}`);
    
    // Create appointment
    const [result] = await pool.query(
      `INSERT INTO appointments 
       (patient_id, doctor_id, appointment_time, duration_minutes, reason, priority, source, status, checked_in_at)
       VALUES (?, ?, NOW(), 15, ?, 'emergency', 'emergency', 'confirmed', NOW())`,
      [patientId, doctor.id, reason || 'Emergency']
    );
    
    // Add to front of queue
    await pool.query(
      `UPDATE doctor_queues SET queue_position = queue_position + 1 
       WHERE doctor_id = ? AND status = 'Waiting'`,
      [doctor.id]
    );
    
    await pool.query(
      `INSERT INTO doctor_queues 
       (doctor_id, patient_id, appointment_id, queue_position, status, arrival_time)
       VALUES (?, ?, ?, 1, 'Waiting', NOW())`,
      [doctor.id, patientId, result.insertId]
    );
    
    log('SUCCESS', '✅ Emergency appointment created');
    
    res.json({
      success: true,
      appointment: { id: result.insertId, patient_id: patientId, doctor_id: doctor.id },
      doctor,
      queuePosition: 1
    });
    
  } catch (error) {
    log('ERROR', '❌ Emergency appointment error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create emergency appointment' });
  }
});

// Get queue status for doctor
app.get('/api/queue/:doctorId', async (req, res) => {
  log('INFO', `Getting queue for doctor: ${req.params.doctorId}`);
  
  try {
    const [queue] = await pool.query(`
      SELECT dq.*, p.name as patient_name, a.reason
      FROM doctor_queues dq
      JOIN facial_recognition_users p ON dq.patient_id = p.patient_id
      LEFT JOIN appointments a ON dq.appointment_id = a.id
      WHERE dq.doctor_id = ? AND dq.status IN ('Waiting', 'In_Session')
      ORDER BY dq.queue_position
    `, [req.params.doctorId]);
    
    res.json({ success: true, queue, totalWaiting: queue.length });
  } catch (error) {
    log('ERROR', 'Get queue error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch queue' });
  }
});

// Get patient's queue position
app.get('/api/queue/my-position/:patientId/:doctorId', async (req, res) => {
  try {
    const [result] = await pool.query(
      `SELECT queue_position, status, estimated_wait_minutes
       FROM doctor_queues
       WHERE patient_id = ? AND doctor_id = ? AND status IN ('Waiting', 'In_Session')`,
      [req.params.patientId, req.params.doctorId]
    );
    
    if (result.length === 0) {
      return res.status(404).json({ success: false, error: 'Not in queue' });
    }
    
    res.json({
      success: true,
      position: result[0].queue_position,
      status: result[0].status,
      estimatedWait: result[0].estimated_wait_minutes || (result[0].queue_position * 15)
    });
  } catch (error) {
    log('ERROR', 'Get position error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch position' });
  }
});

// ============================================================================
// SERVER START
// ============================================================================

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 MEDI ASSIST BACKEND SERVER STARTED');
  console.log('='.repeat(80));
  console.log(`[INFO] Server running on http://localhost:${PORT}`);
  console.log(`[INFO] Database: ${dbConfig.database} @ ${dbConfig.host}`);
  console.log(`[INFO] Flask API: ${FACE_API_URL}`);
  console.log('='.repeat(80) + '\n');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  log('INFO', 'Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});
