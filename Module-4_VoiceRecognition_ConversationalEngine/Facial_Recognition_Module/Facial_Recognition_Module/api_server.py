"""
Flask API Wrapper for Facial Recognition Module
Provides REST API endpoints for the React Native mobile app
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import cv2
import base64
from io import BytesIO
from PIL import Image
import sys
import os

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.mtcnn_detector import FaceDetectorAligner
from models.facenet_model import FaceNetEmbedder
from database.db_operations import FaceDB

app = Flask(__name__)
CORS(app)  # Enable CORS for React Native requests

# Initialize models (load once at startup)
print("[API] Initializing face detection and recognition models...")
detector = FaceDetectorAligner()
embedder = FaceNetEmbedder()
face_db = FaceDB()
print("[API] Models loaded successfully!")

# Threshold for face matching
MATCH_THRESHOLD = 0.7


def base64_to_image(base64_string):
    """Convert base64 string to OpenCV image"""
    try:
        # Remove data URL prefix if present
        if 'base64,' in base64_string:
            base64_string = base64_string.split('base64,')[1]
        
        # Decode base64
        image_data = base64.b64decode(base64_string)
        image = Image.open(BytesIO(image_data))
        
        # Convert to OpenCV format (BGR)
        image_np = np.array(image)
        if len(image_np.shape) == 2:  # Grayscale
            image_cv = cv2.cvtColor(image_np, cv2.COLOR_GRAY2BGR)
        elif image_np.shape[2] == 4:  # RGBA
            image_cv = cv2.cvtColor(image_np, cv2.COLOR_RGBA2BGR)
        else:  # RGB
            image_cv = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
        
        return image_cv
    except Exception as e:
        print(f"[ERROR] Failed to decode base64 image: {e}")
        return None


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'Facial Recognition API is running',
        'models_loaded': True
    }), 200


@app.route('/api/recognize-face', methods=['POST'])
def recognize_face():
    """
    Recognize a face from base64 image
    Request: { "image": "base64_string" }
    Response: { "success": true, "recognized": true, "patient": {...}, "confidence": 0.85 }
    """
    print("\n" + "="*80)
    print("[API] === FACE RECOGNITION REQUEST RECEIVED ===")
    print("="*80)
    
    try:
        # Parse request
        data = request.get_json()
        if not data or 'image' not in data:
            print("[ERROR] No image provided in request")
            return jsonify({'success': False, 'error': 'No image provided'}), 400
        
        print(f"[API] Image data received (length: {len(data['image'])} chars)")
        
        # Convert base64 to image
        print("[API] Converting base64 to OpenCV image...")
        image = base64_to_image(data['image'])
        if image is None:
            print("[ERROR] Failed to decode image data")
            return jsonify({'success': False, 'error': 'Invalid image data'}), 400
        
        print(f"[API] Image decoded successfully (shape: {image.shape})")
        
        # Detect face
        print("[API] Detecting faces with MTCNN...")
        detections = detector.detect_faces(image)
        print(f"[API] Detected {len(detections)} face(s)")
        
        if len(detections) == 0:
            print("[WARNING] No face detected in image")
            return jsonify({
                'success': True,
                'recognized': False,
                'error': 'No face detected',
                'message': 'Please ensure your face is clearly visible'
            }), 200
        
        if len(detections) > 1:
            print(f"[WARNING] Multiple faces detected ({len(detections)})")
            return jsonify({
                'success': True,
                'recognized': False,
                'error': 'Multiple faces detected',
                'message': 'Please ensure only one person is in frame'
            }), 200
        
        # Get aligned face
        detection = detections[0]
        print(f"[API] Face detection confidence: {detection['confidence']:.4f}")
        print("[API] Aligning face...")
        aligned_face = detector.align_face(image, detection)
        
        if aligned_face is None:
            print("[ERROR] Face alignment failed")
            return jsonify({
                'success': True,
                'recognized': False,
                'error': 'Face alignment failed'
            }), 200
        
        print(f"[API] Face aligned (shape: {aligned_face.shape})")
        
        # Extract embedding
        print("[API] Extracting face embedding with FaceNet...")
        embedding = embedder.get_embedding(aligned_face)
        print(f"[API] Embedding extracted (dimension: {len(embedding)})")
        
        # Match against database
        print("[API] Matching against database...")
        print(f"[API] Match threshold: {MATCH_THRESHOLD}")
        match_result = face_db.match_face(embedding, threshold=MATCH_THRESHOLD)
        
        if match_result is None:
            # Check if database is empty
            users = face_db.fetch_all_embeddings()
            print(f"[API] Database contains {len(users)} registered users")
            
            if len(users) == 0:
                print("[WARNING] Database is empty - no registered patients")
                return jsonify({
                    'success': True,
                    'recognized': False,
                    'error': 'No registered patients',
                    'message': 'Please register first'
                }), 200
            else:
                # No match found
                print("[INFO] No match found above threshold")
                return jsonify({
                    'success': True,
                    'recognized': False,
                    'error': 'Face not recognized',
                    'message': 'No matching patient found. Please register.'
                }), 200
        
        # Match found
        print("="*80)
        print(f"[SUCCESS] ✅ FACE RECOGNIZED!")
        print(f"[SUCCESS] Patient ID: {match_result['patient_id']}")
        print(f"[SUCCESS] Name: {match_result['name']}")
        print(f"[SUCCESS] Confidence: {match_result['score']:.4f}")
        print("="*80 + "\n")
        
        return jsonify({
            'success': True,
            'recognized': True,
            'patient': {
                'id': match_result['patient_id'],
                'name': match_result['name']
            },
            'confidence': float(match_result['score'])
        }), 200
    
    except Exception as e:
        print(f"[ERROR] Recognition failed: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Server error',
            'message': str(e)
        }), 500


@app.route('/api/register-patient', methods=['POST'])
def register_patient():
    """
    Register a new patient with face
    Request: { "name": "John Doe", "image": "base64_string" }
    Response: { "success": true, "patient": {...} }
    """
    print("\n" + "="*80)
    print("[API] === PATIENT REGISTRATION REQUEST RECEIVED ===")
    print("="*80)
    
    try:
        data = request.get_json()
        if not data or 'name' not in data or 'image' not in data:
            print("[ERROR] Missing name or image in request")
            return jsonify({'success': False, 'error': 'Name and image required'}), 400
        
        name = data['name'].strip()
        if not name:
            print("[ERROR] Empty name provided")
            return jsonify({'success': False, 'error': 'Name cannot be empty'}), 400
        
        print(f"[API] Registration for: {name}")
        print(f"[API] Image data received (length: {len(data['image'])} chars)")
        
        # Convert base64 to image
        print("[API] Converting base64 to OpenCV image...")
        image = base64_to_image(data['image'])
        if image is None:
            print("[ERROR] Failed to decode image data")
            return jsonify({'success': False, 'error': 'Invalid image data'}), 400
        
        print(f"[API] Image decoded successfully (shape: {image.shape})")
        
        # Detect face
        print("[API] Detecting faces with MTCNN...")
        detections = detector.detect_faces(image)
        print(f"[API] Detected {len(detections)} face(s)")
        
        if len(detections) == 0:
            print("[WARNING] No face detected in image")
            return jsonify({
                'success': False,
                'error': 'No face detected',
                'message': 'Please ensure your face is clearly visible'
            }), 200
        
        if len(detections) > 1:
            print(f"[WARNING] Multiple faces detected ({len(detections)})")
            return jsonify({
                'success': False,
                'error': 'Multiple faces detected',
                'message': 'Please ensure only one person is in frame'
            }), 200
        
        # Get aligned face
        detection = detections[0]
        print(f"[API] Face detection confidence: {detection['confidence']:.4f}")
        print("[API] Aligning face...")
        aligned_face = detector.align_face(image, detection)
        
        if aligned_face is None:
            print("[ERROR] Face alignment failed")
            return jsonify({
                'success': False,
                'error': 'Face alignment failed'
            }), 200
        
        print(f"[API] Face aligned (shape: {aligned_face.shape})")
        
        # Extract embedding
        print("[API] Extracting face embedding with FaceNet...")
        embedding = embedder.get_embedding(aligned_face)
        print(f"[API] Embedding extracted (dimension: {len(embedding)})")
        
        # Save to database
        print("[API] Saving to database...")
        print(f"[API] Database: robot_db.facial_recognition_users")
        patient_id = face_db.insert_user(name, embedding)
        
        if patient_id:
            print("="*80)
            print(f"[SUCCESS] ✅ PATIENT REGISTERED!")
            print(f"[SUCCESS] Patient ID: {patient_id}")
            print(f"[SUCCESS] Name: {name}")
            print("="*80 + "\n")
            
            return jsonify({
                'success': True,
                'patient': {
                    'id': patient_id,
                    'name': name
                },
                'message': 'Patient registered successfully'
            }), 200
        else:
            print("[ERROR] Failed to insert patient into database")
            return jsonify({
                'success': False,
                'error': 'Database insertion failed'
            }), 500
    
    except Exception as e:
        print(f"[ERROR] Registration failed: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Server error',
            'message': str(e)
        }), 500


if __name__ == '__main__':
    print("\n" + "="*80)
    print("🚀 FACIAL RECOGNITION API SERVER STARTING...")
    print("="*80)
    print(f"[INFO] Database: robot_db @ 10.147.145.165:3306")
    print(f"[INFO] Table: facial_recognition_users")
    print(f"[INFO] Match Threshold: {MATCH_THRESHOLD}")
    print(f"[INFO] MTCNN + FaceNet models loaded")
    print("="*80)
    print("[INFO] Server running on http://localhost:5000")
    print("[INFO] Endpoints:")
    print("[INFO]   GET  /health")
    print("[INFO]   POST /api/recognize-face")
    print("[INFO]   POST /api/register-patient")
    print("="*80 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5000)


@app.route('/api/patient/<int:patient_id>', methods=['GET'])
def get_patient(patient_id):
    """
    Get patient information by ID
    Response: { "success": true, "patient_id": 123, "name": "John Doe", "created_at": "..." }
    """
    try:
        # Fetch all users and find the one with matching ID
        users = face_db.fetch_all_embeddings()
        for user in users:
            if user['patient_id'] == patient_id:
                return jsonify({
                    'success': True,
                    'patient_id': user['patient_id'],
                    'name': user['name']
                }), 200
        
        return jsonify({
            'success': False,
            'error': 'Patient not found'
        }), 404
    
    except Exception as e:
        print(f"[ERROR] Failed to fetch patient: {e}")
        return jsonify({
            'success': False,
            'error': 'Server error',
            'message': str(e)
        }), 500


if __name__ == '__main__':
    print("="*60)
    print("Facial Recognition API Server")
    print("="*60)
    print("Endpoints:")
    print("  POST /api/recognize-face    - Recognize a face")
    print("  POST /api/register-patient  - Register new patient")
    print("  GET  /api/patient/<id>      - Get patient info")
    print("  GET  /health                - Health check")
    print("="*60)
    
    # Run on port 5000 (different from Node.js backend on 3000)
    # Debug mode disabled to prevent socket reuse errors
    app.run(host='0.0.0.0', port=5000, debug=False)
