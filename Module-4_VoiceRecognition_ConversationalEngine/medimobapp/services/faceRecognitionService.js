// ============================================================================
// FACE RECOGNITION SERVICE
// Handles camera access, face detection, and patient recognition via API
// Now integrated with Python Flask API (MTCNN + FaceNet)
// ============================================================================

import axios from 'axios';
import { API_ENDPOINTS } from '../config/database';
import * as FileSystem from 'expo-file-system/legacy';

// MOCK MODE - Set to FALSE to use real backend
const MOCK_MODE = false;

// Detailed logging helper
const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [FACE-SERVICE] [${level}] ${message}`);
  if (data) {
    console.log(`[${timestamp}] [FACE-SERVICE] [DATA]`, JSON.stringify(data, null, 2));
  }
};

/**
 * Convert image URI to base64 string
 */
const imageUriToBase64 = async (uri) => {
  try {
    log('INFO', 'Converting image URI to base64', { uri });
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64', // Use string instead of EncodingType enum
    });
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    log('INFO', `Image converted to base64 (length: ${dataUrl.length} chars)`);
    return dataUrl;
  } catch (error) {
    log('ERROR', 'Failed to convert image to base64', { error: error.message });
    throw error;
  }
};

/**
 * Recognize patient by face image
 * Sends image to Python Flask API for MTCNN + FaceNet processing
 */
export const recognizePatient = async (imageUri) => {
  log('INFO', '=== STARTING FACE RECOGNITION ===');
  log('INFO', 'Image URI received', { imageUri });
  
  // MOCK MODE - Return test patient
  if (MOCK_MODE) {
    log('WARN', '⚠️  MOCK MODE ENABLED - Using fake data!');
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing
    
    // 50% chance of recognizing a mock patient
    const recognized = Math.random() > 0.5;
    
    if (recognized) {
      log('INFO', 'Mock: Face recognized', { patient_id: 1001 });
      return {
        success: true,
        recognized: true,
        patient: {
          id: 1001,
          name: 'Test Patient',
        },
        confidence: 0.85,
      };
    } else {
      log('INFO', 'Mock: Face not recognized');
      return {
        success: true,
        recognized: false,
        message: 'Face not recognized. Please register.',
      };
    }
  }

  try {
    log('INFO', 'Converting image to base64...');
    const base64Image = await imageUriToBase64(imageUri);
    log('INFO', `Base64 image prepared (${base64Image.length} bytes)`);
    
    log('INFO', `Sending POST request to: ${API_ENDPOINTS.RECOGNIZE_FACE}`);
    log('INFO', 'Request payload ready (image data omitted for brevity)');
    
    const startTime = Date.now();
    const response = await axios.post(
      API_ENDPOINTS.RECOGNIZE_FACE,
      { image: base64Image },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000, // Increased timeout for face processing
      }
    );
    const elapsed = Date.now() - startTime;
    
    log('INFO', `Response received in ${elapsed}ms`, response.data);

    if (response.data.recognized) {
      log('SUCCESS', '✅ Face recognized successfully!', {
        patient_id: response.data.patient?.id,
        name: response.data.patient?.name,
        confidence: response.data.confidence
      });
      return {
        success: true,
        recognized: true,
        patient: response.data.patient,
        confidence: response.data.confidence,
      };
    } else {
      log('INFO', '❌ Face not recognized in database', response.data);
      return {
        success: true,
        recognized: false,
        message: response.data.message || 'Face not recognized. Please register.',
        error: response.data.error,
      };
    }
  } catch (error) {
    log('ERROR', '❌ Face recognition API error', {
      message: error.message,
      endpoint: API_ENDPOINTS.RECOGNIZE_FACE,
      response: error.response?.data,
      status: error.response?.status,
    });
    return {
      success: false,
      recognized: false,
      error: error.message,
      hint: 'Make sure both Node.js backend and Python Flask API are running',
    };
  }
};

/**
 * Register new patient with face image
 * Sends to Python Flask API for face processing and database storage
 */
export const registerNewPatient = async (name, imageUri) => {
  log('INFO', '=== STARTING PATIENT REGISTRATION ===');
  log('INFO', 'Registration details', { name, imageUri });
  
  // MOCK MODE - Return success
  if (MOCK_MODE) {
    log('WARN', '⚠️  MOCK MODE ENABLED - Using fake data!');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
    
    const mockPatient = {
      id: 1000 + Math.floor(Math.random() * 1000),
      name: name,
    };
    log('INFO', 'Mock registration successful', mockPatient);
    
    return {
      success: true,
      patient: mockPatient,
      message: 'Patient registered successfully',
    };
  }

  try {
    log('INFO', 'Converting image to base64...');
    const base64Image = await imageUriToBase64(imageUri);
    log('INFO', `Base64 image prepared (${base64Image.length} bytes)`);
    
    log('INFO', `Sending POST request to: ${API_ENDPOINTS.REGISTER_PATIENT}`);
    log('INFO', 'Request payload', { name, imageLength: base64Image.length });
    
    const startTime = Date.now();
    const response = await axios.post(
      API_ENDPOINTS.REGISTER_PATIENT,
      { name, image: base64Image },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000, // Increased timeout for face processing
      }
    );
    const elapsed = Date.now() - startTime;
    
    log('INFO', `Response received in ${elapsed}ms`, response.data);

    if (response.data.success) {
      log('SUCCESS', '✅ Patient registered successfully!', response.data.patient);
      return {
        success: true,
        patient: response.data.patient || {
          id: response.data.patientId,
          name: name,
        },
        message: response.data.message || 'Patient registered successfully',
      };
    } else {
      log('ERROR', '❌ Registration failed', response.data);
      return {
        success: false,
        error: response.data.error,
        message: response.data.message,
      };
    }
  } catch (error) {
    log('ERROR', '❌ Patient registration error', {
      message: error.message,
      endpoint: API_ENDPOINTS.REGISTER_PATIENT,
      response: error.response?.data,
      status: error.response?.status,
    });
    return {
      success: false,
      error: error.message,
      hint: 'Make sure both Node.js backend and Python Flask API are running',
    };
  }
};

/**
 * Get patient details by ID
 */
export const getPatientById = async (patientId) => {
  log('INFO', `Getting patient by ID: ${patientId}`);
  try {
    const response = await axios.get(
      `${API_ENDPOINTS.GET_PATIENT}/${patientId}`,
      { timeout: 5000 }
    );

    log('INFO', 'Patient details retrieved', response.data.patient);
    return {
      success: true,
      patient: response.data.patient,
    };
  } catch (error) {
    log('ERROR', 'Get patient error', { patientId, error: error.message });
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Complete face recognition flow
 * Sends image directly to API for MTCNN + FaceNet processing
 */
export const performFaceRecognition = async (imageUri) => {
  try {
    // Send image to recognition API
    const recognitionResult = await recognizePatient(imageUri);
    return recognitionResult;
  } catch (error) {
    log('ERROR', 'Face recognition flow error', { error: error.message });
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  recognizePatient,
  registerNewPatient,
  getPatientById,
  performFaceRecognition,
};
