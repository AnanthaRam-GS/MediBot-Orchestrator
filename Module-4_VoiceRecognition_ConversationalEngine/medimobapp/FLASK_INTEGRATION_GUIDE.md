# Flask API Integration Setup Guide

## Overview
The React Native mobile app now integrates with the Python Facial Recognition Module via a Flask API wrapper. This provides professional MTCNN + FaceNet face recognition.

## Architecture
```
React Native App (Expo)
    ↓ (HTTP - Port 3000)
Node.js Backend (Express)
    ↓ (HTTP - Port 5000)
Python Flask API
    ↓ (MTCNN + FaceNet)
Face Recognition Module
    ↓ (MySQL)
MariaDB Database (robot_db)
```

## Setup Steps

### 1. Install Python Dependencies

Navigate to the Facial Recognition Module directory:
```powershell
cd C:\Users\arunn\Desktop\Facial_Recognition_Module\Facial_Recognition_Module
```

Install required packages:
```powershell
pip install -r requirements.txt
```

### 2. Install Node.js Dependencies

Navigate to the mobile app backend:
```powershell
cd C:\Users\arunn\Desktop\medimobapp\backend
```

Install axios for API proxying:
```powershell
npm install axios
```

### 3. Start the Python Flask API

In the Facial Recognition Module directory:
```powershell
cd C:\Users\arunn\Desktop\Facial_Recognition_Module\Facial_Recognition_Module
python api_server.py
```

**Expected output:**
```
[API] Initializing face detection and recognition models...
[MySQL] Connected to 'robot_db' at 10.147.145.165 successfully.
[API] Models loaded successfully!
============================================================
Facial Recognition API Server
============================================================
Endpoints:
  POST /api/recognize-face    - Recognize a face
  POST /api/register-patient  - Register new patient
  GET  /api/patient/<id>      - Get patient info
  GET  /health                - Health check
============================================================
 * Running on http://0.0.0.0:5000
```

### 4. Start the Node.js Backend

In a **new terminal**, navigate to backend:
```powershell
cd C:\Users\arunn\Desktop\medimobapp\backend
node server.js
```

**Expected output:**
```
✅ Database connected successfully
🚀 Backend API running on port 3000
```

### 5. Start the Expo App

In a **new terminal**, navigate to the app root:
```powershell
cd C:\Users\arunn\Desktop\medimobapp
npm start
```

Scan QR code with Expo Go app on your mobile device.

### 6. Disable Mock Mode (For Production)

Once all servers are running, disable mock mode in:
`services/faceRecognitionService.js`

Change:
```javascript
const MOCK_MODE = true;  // Change to false
```

## API Endpoints

### Python Flask API (Port 5000)

**POST /api/recognize-face**
- Request: `{ "image": "base64_string" }`
- Response: `{ "success": true, "patient_id": 123, "name": "John", "confidence": 0.85 }`

**POST /api/register-patient**
- Request: `{ "name": "John Doe", "image": "base64_string" }`
- Response: `{ "success": true, "patient_id": 1001, "name": "John Doe" }`

**GET /api/patient/<id>**
- Response: `{ "success": true, "patient_id": 123, "name": "John Doe" }`

**GET /health**
- Response: `{ "status": "ok", "models_loaded": true }`

### Node.js Backend (Port 3000)

**POST /api/patients/recognize-face**
- Proxies to Flask API
- Same request/response format as Flask

**POST /api/patients/register**
- Proxies to Flask API
- Same request/response format as Flask

**GET /api/patients/<id>**
- Queries database directly
- Response: `{ "patient": { "id": 123, "name": "John", "created_at": "..." } }`

## Database Schema

The app uses the existing `facial_recognition_users` table:

```sql
CREATE TABLE facial_recognition_users (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    embedding BLOB NOT NULL,  -- Pickled numpy array (128D from FaceNet)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Troubleshooting

### Flask API Not Starting
- Check if Python 3.7+ is installed: `python --version`
- Verify all packages installed: `pip list`
- Check if port 5000 is available
- Review error messages in terminal

### Backend Connection Error
- Verify Flask API is running on port 5000
- Check Node.js backend logs for connection errors
- Test Flask API directly: `curl http://localhost:5000/health`

### Face Recognition Not Working
- Ensure good lighting when capturing face
- Face should be clearly visible and centered
- Only one person should be in frame
- Check Flask API logs for processing errors

### Database Connection Issues
- Verify MariaDB is running on 10.147.145.165
- Check credentials: robot_user / robot_pass
- Confirm database 'robot_db' exists
- Test connection: Check backend startup logs

## Testing Flow

1. **Start All Services** (3 terminals)
2. **Health Check**: Visit `http://localhost:5000/health`
3. **Open App**: Scan QR code in Expo Go
4. **Test Recognition**: 
   - Capture face → Should show "Not recognized" (first time)
   - Register → Enter name, submit
   - Capture face again → Should recognize you!

## Configuration Files Modified

✅ `database/schema.sql` - Updated foreign keys to use facial_recognition_users
✅ `backend/server.js` - Added Flask API proxy endpoints
✅ `services/faceRecognitionService.js` - Simplified to send images directly
✅ `screens/RegistrationScreen.js` - Simplified form (name + face only)
✅ `Facial_Recognition_Module/api_server.py` - New Flask API wrapper
✅ `Facial_Recognition_Module/requirements.txt` - Python dependencies

## Next Steps

1. Test complete registration + recognition flow
2. Integrate with appointment booking
3. Build APK for deployment
4. Add voice assistance features
5. Implement multilingual support

## Support

If you encounter issues:
1. Check all 3 services are running (Flask, Node.js, Expo)
2. Review terminal logs for error messages
3. Test each API endpoint individually
4. Verify database connectivity
