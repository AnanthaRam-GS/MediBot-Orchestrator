-- ============================================================================
-- MEDI ASSIST BOT - COMPLETE DATABASE SCHEMA
-- Database: robot_db
-- MariaDB/MySQL
-- ============================================================================

USE robot_db;

-- ============================================================================
-- TABLE 1: FACIAL_RECOGNITION_USERS (PATIENTS)
-- NOTE: This table already exists and is managed by the Python Facial Recognition Module
-- Schema: patient_id (INT AUTO_INCREMENT), name (VARCHAR), embedding (BLOB), created_at (DATETIME)
-- DO NOT DROP OR RECREATE THIS TABLE - It's shared across all robot systems
-- ============================================================================
-- CREATE TABLE IF NOT EXISTS facial_recognition_users (
--     patient_id INT AUTO_INCREMENT PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     embedding BLOB NOT NULL,  -- Pickled numpy array from FaceNet (128D)
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--     INDEX idx_name (name)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- This table is managed by the Facial_Recognition_Module Python application
-- Face embeddings are stored as pickled numpy arrays using MTCNN + FaceNet
-- Patient registration and recognition handled via Flask API (port 5000)

-- ============================================================================
-- TABLE 2: DOCTORS
-- Stores information about each doctor
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255) NOT NULL,
    qualifications TEXT DEFAULT NULL,
    capacity INT NOT NULL DEFAULT 10, -- Max patients in queue at one time
    consultation_duration INT DEFAULT 15, -- Average time per patient in minutes
    
    -- Availability
    is_available BOOLEAN DEFAULT TRUE,
    available_from TIME DEFAULT '09:00:00',
    available_to TIME DEFAULT '17:00:00',
    
    -- Contact
    phone VARCHAR(20) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    room_number VARCHAR(50) DEFAULT NULL,
    
    -- Metadata
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    -- Indexes
    INDEX idx_specialty (specialty),
    INDEX idx_available (is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TABLE 3: APPOINTMENTS
-- Stores all appointment records
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Foreign Keys
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    
    -- Appointment Details
    appointment_time DATETIME(6) NOT NULL,
    duration_minutes INT DEFAULT 15,
    reason VARCHAR(512) DEFAULT NULL,
    
    -- Status Management
    status ENUM('requested', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'requested',
    priority ENUM('normal', 'high', 'urgent', 'emergency') NOT NULL DEFAULT 'normal',
    source ENUM('voice', 'kiosk', 'web', 'staff', 'emergency') NOT NULL DEFAULT 'voice',
    
    -- Additional Info
    symptoms TEXT DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    language_used VARCHAR(10) DEFAULT 'en-IN',
    
    -- Metadata
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    checked_in_at DATETIME DEFAULT NULL,
    consultation_started_at DATETIME DEFAULT NULL,
    consultation_ended_at DATETIME DEFAULT NULL,
    
    -- Foreign Key Constraints
    CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES facial_recognition_users(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_patient_id (patient_id),
    INDEX idx_doctor_id (doctor_id),
    INDEX idx_appointment_time (appointment_time),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_source (source),
    
    -- Prevent double booking same doctor at exact same time
    UNIQUE KEY ux_doctor_time (doctor_id, appointment_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TABLE 4: DOCTOR QUEUES
-- Manages the active queue for each doctor
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctor_queues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Foreign Keys
    doctor_id INT NOT NULL,
    patient_id INT NOT NULL,
    appointment_id INT DEFAULT NULL, -- Optional link to appointment
    
    -- Queue Management
    queue_position INT NOT NULL,
    status ENUM('Waiting', 'Called', 'In_Session', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Waiting',
    
    -- Timing
    arrival_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    called_time DATETIME DEFAULT NULL,
    session_start_time DATETIME DEFAULT NULL,
    session_end_time DATETIME DEFAULT NULL,
    
    -- Estimated wait time in minutes
    estimated_wait_minutes INT DEFAULT NULL,
    
    -- Foreign Key Constraints
    CONSTRAINT fk_queue_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    CONSTRAINT fk_queue_patient FOREIGN KEY (patient_id) REFERENCES facial_recognition_users(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_queue_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_doctor_queue (doctor_id, status, queue_position),
    INDEX idx_patient_queue (patient_id, status),
    
    -- Ensure patient not in same doctor's queue twice with same status
    UNIQUE KEY ux_doctor_patient_status (doctor_id, patient_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- SAMPLE DATA: DOCTORS
-- ============================================================================
INSERT INTO doctors (name, specialty, qualifications, capacity, consultation_duration, room_number) VALUES
('Dr. Priya Sharma', 'Cardiologist', 'MBBS, MD (Cardiology)', 5, 20, 'Room 101'),
('Dr. Arjun Kumar', 'General Physician', 'MBBS, MD (General Medicine)', 10, 15, 'Room 102'),
('Dr. Sneha Verma', 'Pediatrician', 'MBBS, DCH, DNB (Pediatrics)', 8, 15, 'Room 103'),
('Dr. Rajesh Patel', 'Orthopedic', 'MBBS, MS (Orthopedics)', 6, 20, 'Room 104'),
('Dr. Anita Desai', 'Dermatologist', 'MBBS, MD (Dermatology)', 7, 15, 'Room 105');

-- ============================================================================
-- USEFUL VIEWS
-- ============================================================================

-- View: Current Queue Status for all doctors
CREATE OR REPLACE VIEW v_current_queue_status AS
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
GROUP BY d.id, d.name, d.specialty, d.capacity;

-- View: Today's Appointments
CREATE OR REPLACE VIEW v_todays_appointments AS
SELECT 
    a.id,
    a.appointment_time,
    p.name as patient_name,
    d.name as doctor_name,
    d.specialty,
    a.reason,
    a.status,
    a.priority,
    a.source
FROM appointments a
JOIN facial_recognition_users p ON a.patient_id = p.patient_id
JOIN doctors d ON a.doctor_id = d.id
WHERE DATE(a.appointment_time) = CURDATE()
ORDER BY a.priority DESC, a.appointment_time ASC;

-- ============================================================================
-- STORED PROCEDURES
-- ============================================================================

-- Procedure: Get next available appointment slot for a doctor
DELIMITER //
CREATE PROCEDURE sp_get_next_available_slot(
    IN p_doctor_id INT,
    IN p_duration_minutes INT,
    OUT p_next_slot DATETIME
)
BEGIN
    DECLARE v_last_slot DATETIME;
    DECLARE v_doctor_available_from TIME;
    DECLARE v_doctor_available_to TIME;
    
    -- Get doctor's working hours
    SELECT available_from, available_to 
    INTO v_doctor_available_from, v_doctor_available_to
    FROM doctors WHERE id = p_doctor_id;
    
    -- Get last booked slot for today or tomorrow
    SELECT MAX(appointment_time) INTO v_last_slot
    FROM appointments
    WHERE doctor_id = p_doctor_id 
    AND appointment_time >= CURDATE()
    AND status NOT IN ('cancelled', 'no_show');
    
    -- Calculate next slot
    IF v_last_slot IS NULL THEN
        -- No bookings, start from current time or doctor's start time
        SET p_next_slot = TIMESTAMP(CURDATE(), v_doctor_available_from);
        IF p_next_slot < NOW() THEN
            SET p_next_slot = DATE_ADD(NOW(), INTERVAL 30 MINUTE);
        END IF;
    ELSE
        -- Add duration to last slot
        SET p_next_slot = DATE_ADD(v_last_slot, INTERVAL p_duration_minutes MINUTE);
    END IF;
    
    -- Round to nearest 15 minutes
    SET p_next_slot = FROM_UNIXTIME(
        FLOOR(UNIX_TIMESTAMP(p_next_slot) / 900) * 900
    );
END//
DELIMITER ;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Additional composite indexes for common queries
CREATE INDEX idx_appointments_doctor_status_time ON appointments(doctor_id, status, appointment_time);
CREATE INDEX idx_appointments_patient_status ON appointments(patient_id, status);
CREATE INDEX idx_queues_doctor_status_position ON doctor_queues(doctor_id, status, queue_position);

-- ============================================================================
-- GRANTS (if needed)
-- ============================================================================
-- GRANT ALL PRIVILEGES ON robot_db.* TO 'robot_user'@'%';
-- FLUSH PRIVILEGES;
