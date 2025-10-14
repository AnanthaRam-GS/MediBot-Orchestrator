# 🏥 MEDI ASSIST BOT - DATABASE & BACKEND SETUP

## 📋 Overview

This document explains how to set up the complete database and backend system for the Medi Assist Bot with:
- ✅ Face recognition
- ✅ Patient management
- ✅ Appointment booking
- ✅ Queue management
- ✅ Emergency appointments

---

## 🗄️ DATABASE SETUP

### Connection Details:
```
Host: 10.147.145.165
Port: 3306
User: robot_user
Password: robot_pass
Database: robot_db
```

### Step 1: Create Database Schema

1. **Connect to MariaDB:**
   ```bash
   mysql -h 10.147.145.165 -P 3306 -u robot_user -p
   # Enter password: robot_pass
   ```

2. **Create database:**
   ```sql
   CREATE DATABASE IF NOT EXISTS robot_db;
   USE robot_db;
   ```

3. **Run the schema file:**
   ```bash
   mysql -h 10.147.145.165 -P 3306 -u robot_user -p robot_db < database/schema.sql
   ```

   Or copy-paste the SQL from `database/schema.sql` into your MySQL client.

### Step 2: Verify Tables Created

```sql
USE robot_db;
SHOW TABLES;
```

You should see:
- `patients`
- `doctors`
- `appointments`
- `doctor_queues`

### Step 3: Verify Sample Data

```sql
SELECT * FROM doctors;
```

Should show 5 doctors pre-loaded.

---

## 🖥️ BACKEND API SETUP

### Prerequisites:
- Node.js 14+ installed
- npm installed

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Start Backend Server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

### Step 3: Test Backend

Open browser or use curl:
```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "status": "ok",
  "message": "Medi Assist Backend API is running"
}
```

---

## 📱 MOBILE APP CONFIGURATION

### Update API URL

1. Open `config/database.js`
2. Update `API_BASE_URL`:

```javascript
// If backend is on same device as database
export const API_BASE_URL = 'http://10.147.145.165:3000/api';

// If backend is on your local machine
export const API_BASE_URL = 'http://192.168.x.x:3000/api'; // Your local IP

// If deployed to cloud
export const API_BASE_URL = 'https://your-domain.com/api';
```

---

## 🗂️ DATABASE SCHEMA DETAILS

### Table: `patients`
Stores patient information including face embeddings.

**Key Fields:**
- `id` - Auto-increment primary key
- `name` - Patient name
- `phone`, `email` - Contact info
- `face_embeddings` - JSON string of face embedding array
- `last_visit` - Last visit timestamp

### Table: `doctors`
Stores doctor information.

**Key Fields:**
- `id` - Auto-increment primary key
- `name` - Doctor name
- `specialty` - Medical specialty
- `capacity` - Max patients in queue
- `consultation_duration` - Average time per patient (minutes)
- `is_available` - Current availability status

**Sample Doctors:**
1. Dr. Priya Sharma - Cardiologist
2. Dr. Arjun Kumar - General Physician
3. Dr. Sneha Verma - Pediatrician
4. Dr. Rajesh Patel - Orthopedic
5. Dr. Anita Desai - Dermatologist

### Table: `appointments`
Stores all appointment records.

**Key Fields:**
- `id` - Auto-increment primary key
- `patient_id` - Foreign key to patients
- `doctor_id` - Foreign key to doctors
- `appointment_time` - Scheduled start time
- `duration_minutes` - Estimated duration
- `reason` - Reason for visit
- `symptoms` - Symptoms description
- `status` - requested, confirmed, in_progress, completed, cancelled, no_show
- `priority` - normal, high, urgent, emergency
- `source` - voice, kiosk, web, staff, emergency

### Table: `doctor_queues`
Manages active queues for each doctor.

**Key Fields:**
- `id` - Auto-increment primary key
- `doctor_id` - Foreign key to doctors
- `patient_id` - Foreign key to patients
- `appointment_id` - Optional link to appointment
- `queue_position` - Current position in queue
- `status` - Waiting, Called, In_Session, Completed, Cancelled
- `arrival_time` - When patient arrived
- `estimated_wait_minutes` - Estimated wait time

---

## 🔌 API ENDPOINTS

### Patients

**Recognize Face:**
```
POST /api/patients/recognize-face
Body: { "faceEmbedding": [array of numbers] }
Response: { "recognized": true/false, "patient": {...} }
```

**Register Patient:**
```
POST /api/patients/register
Body: { 
  "name": "John Doe",
  "phone": "1234567890",
  "email": "john@example.com",
  "faceEmbedding": [array]
}
Response: { "success": true, "patientId": 1 }
```

**Get Patient:**
```
GET /api/patients/:id
Response: { "patient": {...} }
```

### Doctors

**Get All Doctors:**
```
GET /api/doctors
Response: { "doctors": [...] }
```

**Get Doctor by ID:**
```
GET /api/doctors/:id
Response: { "doctor": {...} }
```

**Get Doctors by Specialty:**
```
GET /api/doctors/specialty/:specialty
Response: { "doctors": [...] }
```

### Appointments

**Create Appointment:**
```
POST /api/appointments
Body: {
  "patientId": 1,
  "doctorId": 2,
  "appointmentTime": "2025-10-14T10:30:00",
  "durationMinutes": 15,
  "reason": "Regular checkup",
  "symptoms": "Feeling unwell",
  "priority": "normal",
  "source": "voice",
  "languageUsed": "en-IN"
}
Response: { "success": true, "appointmentId": 10 }
```

**Create Emergency Appointment:**
```
POST /api/appointments/emergency
Body: {
  "patientId": 1,
  "reason": "Emergency",
  "symptoms": "Chest pain"
}
Response: {
  "success": true,
  "appointmentId": 11,
  "doctor": {...},
  "queuePosition": 1
}
```

**Get Next Available Slot:**
```
GET /api/appointments/next-slot/:doctorId
Response: {
  "nextAvailableSlot": "2025-10-14T11:00:00",
  "doctorName": "Dr. Arjun Kumar",
  "estimatedDuration": 15
}
```

**Get Today's Appointments:**
```
GET /api/dashboard/today
Response: { "appointments": [...] }
```

### Queue

**Get Queue Status:**
```
GET /api/queue/status
Response: { "queues": [...] }
```

**Get Doctor's Queue:**
```
GET /api/queue/doctor/:doctorId
Response: { "queue": [...] }
```

---

## 🚀 DEPLOYMENT OPTIONS

### Option 1: Local Network (Easiest for Testing)
1. Run backend on same machine as database
2. Access from mobile devices on same WiFi
3. Use local IP address in mobile app

### Option 2: Cloud Deployment (Production)
1. Deploy backend to Heroku, AWS, DigitalOcean, etc.
2. Update database host to cloud database
3. Use HTTPS URL in mobile app
4. Add authentication (JWT)

### Option 3: Docker (Recommended)
1. Create Docker container for backend
2. Deploy to any container platform
3. Easy scaling and management

---

## 🔒 SECURITY CONSIDERATIONS

### Current Setup (Development):
- ✅ CORS enabled for all origins
- ⚠️ No authentication
- ⚠️ Database credentials in code

### For Production:
1. **Add Authentication:**
   - Implement JWT tokens
   - Add user roles (patient, doctor, staff, admin)
   - Secure all endpoints

2. **Use Environment Variables:**
   - Move credentials to `.env` file
   - Never commit credentials to git

3. **Enable HTTPS:**
   - Use SSL/TLS certificates
   - Encrypt data in transit

4. **Input Validation:**
   - Validate all inputs
   - Sanitize user data
   - Prevent SQL injection (using prepared statements)

5. **Rate Limiting:**
   - Prevent abuse
   - Add request throttling

---

## 🧪 TESTING

### Test Database Connection:
```sql
mysql -h 10.147.145.165 -P 3306 -u robot_user -p -e "SHOW DATABASES;"
```

### Test Backend API:
```bash
# Health check
curl http://localhost:3000/api/health

# Get doctors
curl http://localhost:3000/api/doctors

# Get queue status
curl http://localhost:3000/api/queue/status
```

### Test Appointment Booking:
```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 1,
    "doctorId": 2,
    "appointmentTime": "2025-10-14T14:00:00",
    "reason": "Test appointment",
    "priority": "normal"
  }'
```

---

## 📊 MONITORING

### Check Active Connections:
```sql
SHOW PROCESSLIST;
```

### Check Table Statistics:
```sql
SELECT table_name, table_rows 
FROM information_schema.tables 
WHERE table_schema = 'robot_db';
```

### View Today's Appointments:
```sql
SELECT * FROM v_todays_appointments;
```

### Check Queue Status:
```sql
SELECT * FROM v_current_queue_status;
```

---

## 🐛 TROUBLESHOOTING

### Backend won't start:
- Check Node.js is installed: `node --version`
- Check port 3000 is not in use
- Verify database connection details

### Database connection fails:
- Ping database server: `ping 10.147.145.165`
- Check credentials
- Verify firewall allows port 3306
- Check MariaDB is running

### Mobile app can't connect:
- Verify backend is running
- Check API_BASE_URL is correct
- Ensure devices are on same network
- Check firewall settings

---

## 📝 NEXT STEPS

1. ✅ Run `database/schema.sql` to create tables
2. ✅ Install backend dependencies: `cd backend && npm install`
3. ✅ Start backend: `npm start`
4. ✅ Test API endpoints
5. ✅ Update mobile app configuration
6. ✅ Integrate face recognition
7. ✅ Test complete workflow

---

## 🎯 WHAT'S INCLUDED

- ✅ Complete database schema with 4 tables
- ✅ Sample data (5 doctors)
- ✅ RESTful API with 15+ endpoints
- ✅ Face recognition support (cosine similarity)
- ✅ Queue management system
- ✅ Emergency appointment handling
- ✅ Priority-based scheduling
- ✅ Automatic queue position shifting

---

**Your database and backend are now ready!** 

Next: I'll create the updated mobile app UI with face recognition and appointment booking.
