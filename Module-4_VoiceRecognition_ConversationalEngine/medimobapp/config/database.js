/**
 * Database Configuration for Medi Assist Bot
 * MariaDB Connection Settings
 */

export const DB_CONFIG = {
  host: '10.147.145.165',
  port: 3306,
  user: 'robot_user',
  password: 'robot_pass',
  database: 'robot_db',
  
  // Connection pool settings
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  
  // Timezone
  timezone: '+05:30', // IST (Indian Standard Time)
  
  // Character set
  charset: 'utf8mb4',
};

/**
 * API Base URL for database operations
 * Since React Native cannot connect directly to MySQL, we need a backend API
 * 
 * IMPLEMENTATION OPTIONS:
 * 
 * Option 1: Node.js Backend (Recommended)
 * - Create a simple Express.js API server
 * - Use mysql2 package for database connection
 * - Deploy on same network or cloud
 * 
 * Option 2: PHP Backend
 * - Create REST API endpoints
 * - Use mysqli or PDO for database
 * 
 * Option 3: Use Supabase/Firebase (Alternative)
 * - Migrate to cloud database with built-in REST API
 */

// Backend API URL - UPDATE THIS based on your setup
export const API_BASE_URL = 'http://10.147.145.184:3000/api'; // Updated to match current PC IP

// API Endpoints - Full URLs
export const API_ENDPOINTS = {
  // Patients
  RECOGNIZE_FACE: `${API_BASE_URL}/patients/recognize-face`,
  REGISTER_PATIENT: `${API_BASE_URL}/patients/register`,
  GET_PATIENT: `${API_BASE_URL}/patients`,
  UPDATE_PATIENT: `${API_BASE_URL}/patients`,
  
  // Doctors
  GET_DOCTORS: `${API_BASE_URL}/doctors`,
  GET_DOCTOR: `${API_BASE_URL}/doctors`,
  GET_DOCTORS_BY_SPECIALTY: `${API_BASE_URL}/doctors/specialty`,
  GET_DOCTOR_AVAILABILITY: `${API_BASE_URL}/doctors`,
  
  // Appointments
  BOOK_APPOINTMENT: `${API_BASE_URL}/appointments`,
  GET_APPOINTMENT: `${API_BASE_URL}/appointments`,
  UPDATE_APPOINTMENT: `${API_BASE_URL}/appointments`,
  CANCEL_APPOINTMENT: `${API_BASE_URL}/appointments`,
  GET_PATIENT_APPOINTMENTS: `${API_BASE_URL}/appointments/patient`,
  GET_DOCTOR_APPOINTMENTS: `${API_BASE_URL}/appointments/doctor`,
  GET_NEXT_SLOT: `${API_BASE_URL}/appointments/next-slot`,
  
  // Emergency
  BOOK_EMERGENCY: `${API_BASE_URL}/appointments/emergency`,
  
  // Queue
  QUEUE_STATUS: `${API_BASE_URL}/queue`, // Fixed: backend uses /api/queue/{doctorId}
  DOCTOR_QUEUE: `${API_BASE_URL}/queue/doctor`,
  ADD_TO_QUEUE: `${API_BASE_URL}/queue/add`,
  UPDATE_QUEUE_POSITION: `${API_BASE_URL}/queue/update`,
  MY_QUEUE_POSITION: `${API_BASE_URL}/queue/my-position`,
  
  // Dashboard
  GET_STATS: `${API_BASE_URL}/dashboard/stats`,
  GET_TODAYS_APPOINTMENTS: `${API_BASE_URL}/dashboard/today`,
};

/**
 * Database Connection Instructions
 * 
 * REQUIRED: Backend API Server
 * 
 * Since React Native cannot directly connect to MySQL/MariaDB, you need to create
 * a backend API server. Here's what you need:
 * 
 * 1. BACKEND API SERVER OPTIONS:
 * 
 * A. Node.js + Express (RECOMMENDED)
 *    - Fast, easy to set up
 *    - Use mysql2 or mariadb npm packages
 *    - Can run on the same machine as database
 *    - Example: See backend/ folder (to be created)
 * 
 * B. Python + Flask/FastAPI
 *    - Good for face recognition integration
 *    - Use mysql-connector-python or PyMySQL
 * 
 * C. PHP
 *    - Traditional, works well
 *    - Use mysqli or PDO
 * 
 * 2. WHAT THE BACKEND NEEDS TO DO:
 *    - Accept HTTP requests from React Native app
 *    - Connect to MariaDB database
 *    - Execute SQL queries
 *    - Return JSON responses
 *    - Handle face recognition (compare embeddings)
 * 
 * 3. SECURITY CONSIDERATIONS:
 *    - Use HTTPS in production
 *    - Implement authentication (JWT tokens)
 *    - Validate all inputs
 *    - Use prepared statements to prevent SQL injection
 *    - Rate limiting
 * 
 * 4. DEPLOYMENT:
 *    - Local: Run on same machine as database
 *    - Cloud: Deploy to Heroku, AWS, DigitalOcean, etc.
 *    - Docker: Containerize for easy deployment
 * 
 * NEXT STEPS:
 * 1. I'll create a simple Node.js backend API
 * 2. You can run it locally or deploy it
 * 3. Update API_BASE_URL above with your backend URL
 */

// Export for use in app
export default {
  DB_CONFIG,
  API_BASE_URL,
  API_ENDPOINTS,
};
