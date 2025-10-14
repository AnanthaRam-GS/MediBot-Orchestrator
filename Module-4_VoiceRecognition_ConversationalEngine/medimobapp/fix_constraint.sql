-- Fix ALL foreign key constraints pointing to wrong 'patients' table
-- Should point to 'facial_recognition_users' table instead

USE robot_db;

-- Fix appointments table constraint
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS fk_appointments_patient;
ALTER TABLE appointments 
ADD CONSTRAINT fk_appointments_patient 
FOREIGN KEY (patient_id) REFERENCES facial_recognition_users(patient_id) 
ON DELETE CASCADE;

-- Fix doctor_queues table constraint  
ALTER TABLE doctor_queues DROP CONSTRAINT IF EXISTS fk_queue_patient;
ALTER TABLE doctor_queues 
ADD CONSTRAINT fk_queue_patient 
FOREIGN KEY (patient_id) REFERENCES facial_recognition_users(patient_id) 
ON DELETE CASCADE;

-- Check if patients table exists and drop it if it does (since we don't need it)
DROP TABLE IF EXISTS patients;

-- Verify all tables and constraints
SHOW TABLES;
SHOW CREATE TABLE appointments\G
SHOW CREATE TABLE doctor_queues\G