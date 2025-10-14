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
app.use(bodyParser.json({ limit: '10mb' })); // Increased limit for face images
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  log('INFO', `${req.method} ${req.path}`, { 
    body: req.method === 'POST' ? '(body omitted)' : undefined,
    query: req.query 
  });
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
    log('SUCCESS', '✅ Database connected successfully', {
      host: dbConfig.host,
      database: dbConfig.database,
    });
    
    // Test query to verify tables
    const [tables] = await connection.query('SHOW TABLES');
    log('INFO', `Found ${tables.length} tables in database`);
    
    connection.release();
  } catch (err) {
    log('ERROR', '❌ Database connection failed', { error: err.message });
    process.exit(1);
  }
})();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Calculate cosine similarity between two face embeddings
function cosineSimilarity(embedding1, embedding2) {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }
  
  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);
  
  if (norm1 === 0 || norm2 === 0) return 0;
  
  return dotProduct / (norm1 * norm2);
}

// ============================================================================
// API ROUTES
// ============================================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Medi Assist Backend API is running' });
});

// ============================================================================
// PATIENTS / FACIAL RECOGNITION ROUTES
// These routes proxy to the Python Flask API for face recognition
// ============================================================================

// Recognize patient by face image (proxy to Flask API)
app.post('/api/patients/recognize-face', async (req, res) => {
  log('INFO', '=== FACE RECOGNITION REQUEST ===');
  
  try {
    const { image } = req.body;
    
    if (!image) {
      log('ERROR', 'No image provided in request');
      return res.status(400).json({ error: 'Image is required' });
    }
    
    log('INFO', `Image received (${image.length} bytes)`);
    log('INFO', `Forwarding to Flask API: ${FACE_API_URL}/recognize-face`);
    
    const startTime = Date.now();
    
    // Forward request to Flask API
    const response = await axios.post(`${FACE_API_URL}/recognize-face`, 
      { image },
      { timeout: 30000 }
    );
    
    const elapsed = Date.now() - startTime;
    log('INFO', `Flask API responded in ${elapsed}ms`, response.data);
    
    if (response.data.success && response.data.recognized) {
      log('SUCCESS', '✅ Face recognized!', {
        patient_id: response.data.patient?.id,
        name: response.data.patient?.name,
        confidence: response.data.confidence
      });
      
      res.json({
        success: true,
        recognized: true,
        patient: response.data.patient,
        confidence: response.data.confidence,
      });
    } else {
      log('INFO', 'Face not recognized', response.data);
      res.json({
        success: true,
        recognized: false,
        message: response.data.message || 'No matching patient found',
        error: response.data.error,
      });
    }
  } catch (error) {
    log('ERROR', '❌ Face recognition error', {
      message: error.message,
      response: error.response?.data,
      flaskApiUrl: FACE_API_URL,
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Face recognition service unavailable', 
      details: error.message,
      hint: 'Make sure the Python Flask API is running on port 5000'
    });
  }
});

// Register new patient (proxy to Flask API)
app.post('/api/patients/register', async (req, res) => {
  log('INFO', '=== PATIENT REGISTRATION REQUEST ===');
  
  try {
    const { name, image } = req.body;
    
    if (!name || !image) {
      log('ERROR', 'Missing name or image');
      return res.status(400).json({ error: 'Name and image are required' });
    }
    
    log('INFO', `Registering patient: ${name}`);
    log('INFO', `Image received (${image.length} bytes)`);
    log('INFO', `Forwarding to Flask API: ${FACE_API_URL}/register-patient`);
    
    const startTime = Date.now();
    
    // Forward request to Flask API
    const response = await axios.post(`${FACE_API_URL}/register-patient`, 
      { name, image },
      { timeout: 30000 }
    );
    
    const elapsed = Date.now() - startTime;
    log('INFO', `Flask API responded in ${elapsed}ms`, response.data);
    
    if (response.data.success) {
      log('SUCCESS', '✅ Patient registered!', response.data.patient);
      
      res.json({
        success: true,
        patient: response.data.patient,
        message: response.data.message || 'Patient registered successfully',
      });
    } else {
      log('ERROR', 'Registration failed', response.data);
      res.status(400).json({
        success: false,
        error: response.data.error,
        message: response.data.message,
      });
    }
  } catch (error) {
    log('ERROR', '❌ Patient registration error', {
      message: error.message,
      response: error.response?.data,
      flaskApiUrl: FACE_API_URL,
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Registration service unavailable', 
      details: error.message,
      hint: 'Make sure the Python Flask API is running on port 5000'
    });
  }
});

// Get patient by ID (query database directly)
app.get('/api/patients/:id', async (req, res) => {
  log('INFO', `Getting patient by ID: ${req.params.id}`);
  
  try {
    const [patients] = await pool.query(
      'SELECT patient_id as id, name, created_at FROM facial_recognition_users WHERE patient_id = ?',
      [req.params.id]
    );
    
    if (patients.length === 0) {
      log('WARN', `Patient not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    log('SUCCESS', 'Patient found', patients[0]);
    res.json({ success: true, patient: patients[0] });
  } catch (error) {
    log('ERROR', 'Get patient error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch patient', details: error.message });
  }
});

// ============================================================================
// DOCTORS ROUTES
// ============================================================================

// Get all doctors
app.get('/api/doctors', async (req, res) => {
  log('INFO', 'Getting all available doctors');
  
  try {
    const [doctors] = await pool.query(`
      SELECT d.*, 
             (SELECT COUNT(*) FROM doctor_queues dq 
              WHERE dq.doctor_id = d.id AND dq.status IN ('Waiting', 'In_Session')) as current_queue_count
      FROM doctors d
      WHERE is_available = TRUE
      ORDER BY specialty, name
    `);
    
    log('SUCCESS', `Found ${doctors.length} available doctors`);
    res.json({ success: true, doctors });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ error: 'Failed to fetch doctors', details: error.message });
  }
});

// Get doctor by ID
app.get('/api/doctors/:id', async (req, res) => {
  try {
    const [doctors] = await pool.query('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    
    if (doctors.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    
    res.json({ doctor: doctors[0] });
  } catch (error) {
    console.error('Get doctor error:', error);
    res.status(500).json({ error: 'Failed to fetch doctor', details: error.message });
  }
});

// Get doctors by specialty
app.get('/api/doctors/specialty/:specialty', async (req, res) => {
  try {
    const [doctors] = await pool.query(
      'SELECT * FROM doctors WHERE specialty LIKE ? AND is_available = TRUE ORDER BY name',
      [`%${req.params.specialty}%`]
    );
    
    res.json({ doctors });
  } catch (error) {
    console.error('Get doctors by specialty error:', error);
    res.status(500).json({ error: 'Failed to fetch doctors', details: error.message });
  }
});

// ============================================================================
// APPOINTMENTS ROUTES
// ============================================================================

// Create appointment
app.post('/api/appointments', async (req, res) => {
  log('INFO', '=== CREATE APPOINTMENT REQUEST ===');
  
  try {
    const {
      patient_id,
      doctor_id,
      reason,
      priority,
      symptoms,
      language_used,
    } = req.body;
    
    if (!patient_id || !doctor_id) {
      log('ERROR', 'Missing required fields', { patient_id, doctor_id });
      return res.status(400).json({ success: false, error: 'Patient ID and Doctor ID are required' });
    }
    
    log('INFO', 'Creating appointment', { patient_id, doctor_id, priority, reason });
    
    // Get current time for appointment
    const appointmentTime = new Date();
    const durationMinutes = 15;
    
    // Insert appointment
    const [result] = await pool.query(
      `INSERT INTO appointments 
       (patient_id, doctor_id, appointment_time, duration_minutes, reason, symptoms, priority, source, language_used, status, checked_in_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', NOW())`,
      [
        patient_id, 
        doctor_id, 
        appointmentTime, 
        durationMinutes, 
        reason || 'General consultation', 
        symptoms || null, 
        priority || 'normal', 
        'voice', 
        language_used || 'en-IN'
      ]
    );
    
    const appointmentId = result.insertId;
    log('SUCCESS', `Appointment created with ID: ${appointmentId}`);
    
    // Calculate queue position
    const [queueCount] = await pool.query(
      `SELECT COUNT(*) as count FROM doctor_queues 
       WHERE doctor_id = ? AND status IN ('Waiting', 'In_Session')`,
      [doctor_id]
    );
    
    let queuePosition = queueCount[0].count + 1;
    
    // Priority handling: emergency and urgent go to front
    if (priority === 'emergency') {
      queuePosition = 1;
      // Shift other patients back
      await pool.query(
        `UPDATE doctor_queues SET queue_position = queue_position + 1 
         WHERE doctor_id = ? AND status = 'Waiting'`,
        [doctor_id]
      );
    } else if (priority === 'urgent') {
      // Urgent goes after emergency but before normal
      const [emergencyCount] = await pool.query(
        `SELECT COUNT(*) as count FROM doctor_queues 
         WHERE doctor_id = ? AND status = 'Waiting' AND queue_position = 1`,
        [doctor_id]
      );
      queuePosition = emergencyCount[0].count + 1;
    }
    
    log('INFO', `Queue position calculated: ${queuePosition}`);
    
    // Add to queue
    await pool.query(
      `INSERT INTO doctor_queues 
       (doctor_id, patient_id, appointment_id, queue_position, status, arrival_time)
       VALUES (?, ?, ?, ?, 'Waiting', NOW())`,
      [doctor_id, patient_id, appointmentId, queuePosition]
    );
    
    log('SUCCESS', '✅ Appointment and queue entry created');
    
    // Get full appointment details
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
    log('ERROR', '❌ Create appointment error', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create appointment', 
      details: error.message 
    });
  }
});

// Create emergency appointment
app.post('/api/appointments/emergency', async (req, res) => {
  log('INFO', '=== EMERGENCY APPOINTMENT REQUEST ===');
  
  try {
    const { patientId, patientName, reason } = req.body;
    
    if (!patientId) {
      log('ERROR', 'Missing patient ID');
      return res.status(400).json({ success: false, error: 'Patient ID is required' });
    }
    
    log('WARN', `🚨 EMERGENCY for patient ${patientId}`);
    
    // Find first available doctor (General Physician preferred for emergencies)
    const [doctors] = await pool.query(`
      SELECT d.id, d.name, d.specialty, 
             (SELECT COUNT(*) FROM doctor_queues dq 
              WHERE dq.doctor_id = d.id AND dq.status IN ('Waiting', 'In_Session')) as queue_count
      FROM doctors d
      WHERE d.is_available = TRUE
      ORDER BY 
        CASE WHEN d.specialty LIKE '%General%' THEN 0 ELSE 1 END,
        queue_count ASC
      LIMIT 1
    `);
    
    if (doctors.length === 0) {
      log('ERROR', 'No available doctors for emergency');
      return res.status(503).json({ success: false, error: 'No doctors currently available' });
    }
    
    const doctor = doctors[0];
    log('INFO', `Assigned to Dr. ${doctor.name} (${doctor.specialty})`);
    
    // Create emergency appointment
    const appointmentTime = new Date();
    const [result] = await pool.query(
      `INSERT INTO appointments 
       (patient_id, doctor_id, appointment_time, duration_minutes, reason, priority, source, status, checked_in_at)
       VALUES (?, ?, ?, ?, ?, 'emergency', 'emergency', 'confirmed', NOW())`,
      [patientId, doctor.id, appointmentTime, 15, reason || 'Emergency - Immediate attention required']
    );
    
    const appointmentId = result.insertId;
    log('SUCCESS', `Emergency appointment created: ${appointmentId}`);
    
    // Add to front of queue (position 1)
    await pool.query(
      `UPDATE doctor_queues SET queue_position = queue_position + 1 
       WHERE doctor_id = ? AND status = 'Waiting'`,
      [doctor.id]
    );
    
    await pool.query(
      `INSERT INTO doctor_queues 
       (doctor_id, patient_id, appointment_id, queue_position, status, arrival_time)
       VALUES (?, ?, ?, 1, 'Waiting', NOW())`,
      [doctor.id, patientId, appointmentId]
    );
    
    log('SUCCESS', '✅ Emergency appointment created at position 1');
    
    res.json({
      success: true,
      appointment: {
        id: appointmentId,
        patient_id: patientId,
        doctor_id: doctor.id,
        priority: 'emergency',
        status: 'confirmed'
      },
      doctor,
      queuePosition: 1,
      message: 'Emergency appointment created successfully'
    });
    
  } catch (error) {
    log('ERROR', '❌ Emergency appointment error', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create emergency appointment', 
      details: error.message 
    });
  }
});
      ORDER BY 
        CASE WHEN d.specialty = 'General Physician' THEN 0 ELSE 1 END,
        queue_count
      LIMIT 1
    `);
    
    if (doctors.length === 0) {
      return res.status(404).json({ error: 'No doctors available' });
    }
    
    const doctor = doctors[0];
    const appointmentTime = new Date();
    
    // Create emergency appointment
    const [result] = await pool.query(
      `INSERT INTO appointments 
       (patient_id, doctor_id, appointment_time, duration_minutes, reason, symptoms, priority, source, status)
       VALUES (?, ?, ?, 20, ?, ?, 'emergency', 'emergency', 'confirmed')`,
      [patientId, doctor.id, appointmentTime, reason || 'Emergency', symptoms || 'Emergency consultation required']
    );
    
    // Shift all waiting patients down
    await pool.query(
      'UPDATE doctor_queues SET queue_position = queue_position + 1 WHERE doctor_id = ? AND status = "Waiting"',
      [doctor.id]
    );
    
    // Add to front of queue
    await pool.query(
      `INSERT INTO doctor_queues (doctor_id, patient_id, appointment_id, queue_position, status)
       VALUES (?, ?, ?, 1, 'Waiting')`,
      [doctor.id, patientId, result.insertId]
    );
    
    res.json({
      success: true,
      appointmentId: result.insertId,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        specialty: doctor.specialty,
      },
      queuePosition: 1,
      message: 'Emergency appointment created - You are first in queue!',
    });
  } catch (error) {
    console.error('Create emergency appointment error:', error);
    res.status(500).json({ error: 'Failed to create emergency appointment', details: error.message });
  }
});

// Get next available slot
app.get('/api/appointments/next-slot/:doctorId', async (req, res) => {
  try {
    const doctorId = req.params.doctorId;
    
    // Get doctor info
    const [doctors] = await pool.query(
      'SELECT consultation_duration, available_from, available_to FROM doctors WHERE id = ?',
      [doctorId]
    );
    
    if (doctors.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    
    const doctor = doctors[0];
    
    // Get last appointment for today
    const [appointments] = await pool.query(
      `SELECT MAX(appointment_time) as last_slot
       FROM appointments
       WHERE doctor_id = ? 
       AND DATE(appointment_time) = CURDATE()
       AND status NOT IN ('cancelled', 'no_show')`,
      [doctorId]
    );
    
    let nextSlot;
    const now = new Date();
    const today = new Date().toISOString().split('T')[0];
    
    if (appointments[0].last_slot) {
      // Add duration to last slot
      nextSlot = new Date(appointments[0].last_slot);
      nextSlot.setMinutes(nextSlot.getMinutes() + doctor.consultation_duration);
    } else {
      // No appointments today, use doctor's start time or current time
      nextSlot = new Date(`${today}T${doctor.available_from}`);
      if (nextSlot < now) {
        nextSlot = new Date(now.getTime() + 30 * 60000); // 30 minutes from now
      }
    }
    
    // Round to nearest 15 minutes
    const minutes = nextSlot.getMinutes();
    nextSlot.setMinutes(Math.ceil(minutes / 15) * 15, 0, 0);
    
    res.json({
      nextAvailableSlot: nextSlot.toISOString(),
      doctorName: doctor.name,
      estimatedDuration: doctor.consultation_duration,
    });
  } catch (error) {
    console.error('Get next slot error:', error);
    res.status(500).json({ error: 'Failed to get next slot', details: error.message });
  }
});

// Get today's appointments
app.get('/api/dashboard/today', async (req, res) => {
  try {
    const [appointments] = await pool.query(`
      SELECT 
        a.id,
        a.appointment_time,
        a.status,
        a.priority,
        p.name as patient_name,
        d.name as doctor_name,
        d.specialty,
        a.reason
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      WHERE DATE(a.appointment_time) = CURDATE()
      ORDER BY 
        CASE a.priority
          WHEN 'emergency' THEN 1
          WHEN 'urgent' THEN 2
          WHEN 'high' THEN 3
          ELSE 4
        END,
        a.appointment_time
    `);
    
    res.json({ appointments });
  } catch (error) {
    console.error('Get today\'s appointments error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments', details: error.message });
  }
});

// ============================================================================
// QUEUE ROUTES
// ============================================================================

// Get queue status for all doctors
app.get('/api/queue/status', async (req, res) => {
  try {
    const [queues] = await pool.query(`
      SELECT 
        d.id as doctor_id,
        d.name as doctor_name,
        d.specialty,
        d.capacity,
        COUNT(CASE WHEN dq.status = 'Waiting' THEN 1 END) as waiting_count,
        COUNT(CASE WHEN dq.status = 'In_Session' THEN 1 END) as in_session_count,
        d.capacity - COUNT(CASE WHEN dq.status IN ('Waiting', 'In_Session') THEN 1 END) as available_slots
      FROM doctors d
      LEFT JOIN doctor_queues dq ON d.id = dq.doctor_id AND dq.status IN ('Waiting', 'In_Session')
      WHERE d.is_available = TRUE
      GROUP BY d.id, d.name, d.specialty, d.capacity
      ORDER BY d.specialty, d.name
    `);
    
    res.json({ queues });
  } catch (error) {
    console.error('Get queue status error:', error);
    res.status(500).json({ error: 'Failed to fetch queue status', details: error.message });
  }
});

// Get specific doctor's queue
app.get('/api/queue/doctor/:doctorId', async (req, res) => {
  try {
    const [queue] = await pool.query(`
      SELECT 
        dq.id,
        dq.queue_position,
        dq.status,
        dq.arrival_time,
        dq.estimated_wait_minutes,
        p.name as patient_name,
        a.reason,
        a.priority
      FROM doctor_queues dq
      JOIN patients p ON dq.patient_id = p.id
      LEFT JOIN appointments a ON dq.appointment_id = a.id
      WHERE dq.doctor_id = ? AND dq.status IN ('Waiting', 'In_Session')
      ORDER BY dq.queue_position
    `, [req.params.doctorId]);
    
    res.json({ queue });
  } catch (error) {
    console.error('Get doctor queue error:', error);
    res.status(500).json({ error: 'Failed to fetch doctor queue', details: error.message });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Medi Assist Backend API running on port ${PORT}`);
  console.log(`📡 API URL: http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});
