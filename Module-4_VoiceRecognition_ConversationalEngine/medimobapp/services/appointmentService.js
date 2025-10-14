// ============================================================================
// APPOINTMENT SERVICE
// Handles appointment booking, voice-based input, emergency appointments
// ============================================================================

import axios from 'axios';
import { API_ENDPOINTS } from '../config/database';
import { processUserQuery } from './geminiApi';
import { speechToTextTranslate } from './sarvamApi';

// Set to FALSE for production - using real backend
const MOCK_MODE = false;

// Detailed logging helper
const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [APPOINTMENT-SERVICE] [${level}] ${message}`);
  if (data) {
    console.log(`[${timestamp}] [APPOINTMENT-SERVICE] [DATA]`, JSON.stringify(data, null, 2));
  }
};

// Mock doctor data
const MOCK_DOCTORS = [
  { id: 1, name: 'Dr. Sharma', specialty: 'Cardiologist', available: true },
  { id: 2, name: 'Dr. Patel', specialty: 'General Physician', available: true },
  { id: 3, name: 'Dr. Kumar', specialty: 'Orthopedic', available: true },
  { id: 4, name: 'Dr. Reddy', specialty: 'Pediatrician', available: true },
  { id: 5, name: 'Dr. Singh', specialty: 'Dermatologist', available: true },
];

/**
 * Get list of available doctors
 */
export const getDoctors = async () => {
  log('INFO', '=== GETTING DOCTORS LIST ===');
  
  // Mock mode: return test data
  if (MOCK_MODE) {
    log('WARN', '⚠️  MOCK MODE ENABLED - Using fake data!');
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    return {
      success: true,
      doctors: MOCK_DOCTORS,
    };
  }

  try {
    log('INFO', `Sending GET request to: ${API_ENDPOINTS.GET_DOCTORS}`);
    const startTime = Date.now();
    
    const response = await axios.get(API_ENDPOINTS.GET_DOCTORS, {
      timeout: 5000,
    });
    
    const elapsed = Date.now() - startTime;
    log('INFO', `Response received in ${elapsed}ms`, response.data);
    log('SUCCESS', `✅ Found ${response.data.doctors?.length || 0} doctors`);

    return {
      success: true,
      doctors: response.data.doctors,
    };
  } catch (error) {
    log('ERROR', '❌ Get doctors error', {
      message: error.message,
      endpoint: API_ENDPOINTS.GET_DOCTORS,
      response: error.response?.data,
      status: error.response?.status,
    });
    return {
      success: false,
      error: error.message,
      doctors: [],
    };
  }
};

/**
 * Extract appointment details from voice/text using AI
 */
export const extractAppointmentDetails = async (userText) => {
  log('INFO', 'Extracting appointment details from text', { userText });
  
  try {
    // Use Gemini AI to extract structured appointment data
    const prompt = `Extract appointment details from this text: "${userText}"
    
    Return ONLY a JSON object with these exact fields:
    - specialty: doctor specialty (e.g., "Cardiologist", "Dermatologist", "General Physician")
    - symptoms: array of symptoms mentioned
    - reason: brief reason for visit
    - urgency: "normal" or "high" based on symptoms
    
    Example response:
    {
      "specialty": "Dermatologist",
      "symptoms": ["skin disease"],
      "reason": "skin condition consultation",
      "urgency": "normal"
    }`;

    const aiResponse = await processUserQuery(prompt);
    log('INFO', 'AI Response received', aiResponse);
    
    // Check if aiResponse is already a parsed object
    if (typeof aiResponse === 'object' && aiResponse !== null) {
      // If it's an object, extract the response text and try to parse
      const responseText = aiResponse.response || JSON.stringify(aiResponse);
      
      try {
        // Try to parse if it's a string
        if (typeof responseText === 'string') {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const details = JSON.parse(jsonMatch[0]);
            log('SUCCESS', 'Extracted appointment details', details);
            return {
              success: true,
              details,
            };
          }
        }
        
        // If no JSON found in response, check if aiResponse itself has the fields
        if (aiResponse.specialty || aiResponse.entities) {
          const details = {
            specialty: aiResponse.specialty || aiResponse.entities?.specialty || 'General Physician',
            symptoms: aiResponse.symptoms || aiResponse.entities?.symptoms || [userText],
            reason: aiResponse.reason || aiResponse.entities?.reason || userText,
            urgency: aiResponse.urgency || aiResponse.priority || 'normal'
          };
          log('SUCCESS', 'Extracted details from AI response object', details);
          return {
            success: true,
            details,
          };
        }
      } catch (parseError) {
        log('ERROR', 'JSON parse error', parseError);
      }
    }

    // Fallback: return raw text
    return {
      success: true,
      details: {
        specialty: 'General Physician',
        symptoms: [userText],
        reason: userText,
        urgency: 'normal',
      },
    };
  } catch (error) {
    console.error('Extract appointment details error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Find suitable doctor based on specialty and/or doctor name
 */
export const findDoctorBySpecialty = async (specialty, userText = '') => {
  log('INFO', 'Finding doctor by specialty', { specialty, userText });
  
  try {
    const doctorsResult = await getDoctors();
    
    if (!doctorsResult.success) {
      throw new Error('Failed to get doctors list');
    }

    log('INFO', `Searching among ${doctorsResult.doctors.length} doctors`);

    // First try to match by doctor name if mentioned in original text
    if (userText) {
      const doctorByName = doctorsResult.doctors.find(doc => {
        const docName = doc.name.toLowerCase();
        const textLower = userText.toLowerCase();
        
        // Check if doctor's name parts are mentioned
        const nameParts = docName.split(' ');
        return nameParts.some(part => 
          part.length > 2 && textLower.includes(part.toLowerCase())
        );
      });
      
      if (doctorByName) {
        log('SUCCESS', `Found doctor by name match: ${doctorByName.name}`, doctorByName);
        return {
          success: true,
          doctor: doctorByName,
          matchType: 'name',
        };
      }
    }

    // Then try to match by specialty
    const doctor = doctorsResult.doctors.find(
      (doc) => doc.specialty.toLowerCase().includes(specialty.toLowerCase())
    );

    if (doctor) {
      log('SUCCESS', `Found doctor by specialty match: ${doctor.name} (${doctor.specialty})`);
      return {
        success: true,
        doctor,
        matchType: 'specialty',
      };
    } else {
      log('WARNING', `No doctor found for specialty: ${specialty}, falling back to general physician`);
      // Default to general physician
      const generalDoc = doctorsResult.doctors.find(
        (doc) => doc.specialty.toLowerCase().includes('general')
      );
      
      return {
        success: true,
        doctor: generalDoc || doctorsResult.doctors[0],
        fallback: true,
        matchType: 'fallback',
      };
    }
  } catch (error) {
    log('ERROR', 'Find doctor error', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Book normal appointment
 */
export const bookAppointment = async (appointmentData) => {
  // Mock mode: return test appointment
  if (MOCK_MODE) {
    console.log('🎭 Mock Mode: Booking test appointment');
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
    
    const appointmentId = Math.floor(Math.random() * 1000) + 1;
    const queuePosition = Math.floor(Math.random() * 10) + 1;
    
    return {
      success: true,
      appointment: {
        id: appointmentId,
        patient_id: appointmentData.patient_id,
        patient_name: appointmentData.patient_name,
        doctor_id: appointmentData.doctor_id,
        reason: appointmentData.reason,
        priority: appointmentData.priority || 'normal',
        status: 'waiting',
        created_at: new Date().toISOString(),
      },
      queuePosition,
    };
  }

  try {
    const response = await axios.post(
      API_ENDPOINTS.BOOK_APPOINTMENT,
      appointmentData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    );

    return {
      success: true,
      appointment: response.data.appointment,
      queuePosition: response.data.queue_position,
    };
  } catch (error) {
    console.error('Book appointment error:', error);
    
    // Handle duplicate appointment error
    if (error.response && error.response.status === 400) {
      const errorData = error.response.data;
      if (errorData.error && errorData.error.includes('already have a pending appointment')) {
        return {
          success: false,
          isDuplicate: true,
          error: errorData.error,
          existingAppointment: errorData.existingAppointment
        };
      }
    }
    
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Book emergency appointment (high priority)
 */
export const bookEmergencyAppointment = async (emergencyData) => {
  // Mock mode: return test emergency appointment
  if (MOCK_MODE) {
    console.log('🎭 Mock Mode: Booking emergency appointment');
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate network delay
    
    const appointmentId = Math.floor(Math.random() * 1000) + 1;
    
    return {
      success: true,
      appointment: {
        id: appointmentId,
        patient_id: emergencyData.patientId,
        patient_name: emergencyData.patientName,
        doctor_id: 2, // General Physician for emergencies
        reason: emergencyData.reason || 'Emergency - Immediate attention required',
        priority: 'emergency',
        status: 'waiting',
        created_at: new Date().toISOString(),
      },
      queuePosition: 1, // Emergency gets first position
    };
  }

  try {
    const requestData = {
      patient_id: emergencyData.patientId,
      patient_name: emergencyData.patientName,
      reason: emergencyData.reason || 'Emergency - Immediate attention required',
    };
    
    log('INFO', 'Sending emergency appointment request', {
      url: API_ENDPOINTS.BOOK_EMERGENCY,
      data: requestData
    });

    const response = await axios.post(
      API_ENDPOINTS.BOOK_EMERGENCY,
      requestData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    );
    
    log('SUCCESS', 'Emergency appointment response', response.data);

    return {
      success: true,
      appointment: response.data.appointment,
      queuePosition: response.data.queue_position,
    };
  } catch (error) {
    console.error('Book emergency appointment error:', error);
    
    // Handle duplicate appointment error
    if (error.response && error.response.status === 400) {
      const errorData = error.response.data;
      if (errorData.error && errorData.error.includes('already have a pending appointment')) {
        return {
          success: false,
          isDuplicate: true,
          error: errorData.error,
          existingAppointment: errorData.existingAppointment
        };
      }
    }
    
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get queue status for a doctor
 */
export const getQueueStatus = async (doctorId) => {
  // Mock mode: return test queue
  if (MOCK_MODE) {
    console.log('🎭 Mock Mode: Returning test queue status');
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate network delay
    
    const mockQueue = [
      {
        id: 1,
        patient_name: 'Test Patient 1',
        priority: 'normal',
        status: 'waiting',
        queue_position: 1,
        estimated_wait: '10 minutes',
      },
      {
        id: 2,
        patient_name: 'Test Patient 2',
        priority: 'normal',
        status: 'waiting',
        queue_position: 2,
        estimated_wait: '20 minutes',
      },
      {
        id: 3,
        patient_name: 'Test Patient 3',
        priority: 'normal',
        status: 'waiting',
        queue_position: 3,
        estimated_wait: '30 minutes',
      },
    ];
    
    return {
      success: true,
      queue: mockQueue,
      totalWaiting: mockQueue.length,
    };
  }

  try {
    const response = await axios.get(
      `${API_ENDPOINTS.QUEUE_STATUS}/${doctorId}`,
      { timeout: 5000 }
    );

    return {
      success: true,
      queue: response.data.queue,
      totalWaiting: response.data.totalWaiting || response.data.total_waiting || response.data.queue?.length || 0,
    };
  } catch (error) {
    console.error('Get queue status error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get patient's queue position
 */
export const getMyQueuePosition = async (patientId, doctorId) => {
  // Mock mode: return test position
  if (MOCK_MODE) {
    console.log('🎭 Mock Mode: Returning test queue position');
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
    
    const position = Math.floor(Math.random() * 5) + 1;
    const estimatedWait = `${position * 10} minutes`;
    
    return {
      success: true,
      position,
      estimatedWait,
    };
  }

  try {
    const response = await axios.get(
      `${API_ENDPOINTS.MY_QUEUE_POSITION}/${patientId}/${doctorId}`,
      { timeout: 5000 }
    );

    return {
      success: true,
      position: response.data.position,
      estimatedWait: response.data.estimated_wait,
    };
  } catch (error) {
    console.error('Get queue position error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Voice-based appointment booking flow
 * 1. Record voice
 * 2. Convert to text
 * 3. Extract details using AI
 * 4. Find suitable doctor
 * 5. Book appointment
 */
export const voiceBasedBooking = async (audioUri, patientData) => {
  try {
    // Step 1: Convert speech to text
    const speechResult = await speechToTextTranslate(audioUri);
    
    if (!speechResult.success) {
      throw new Error('Failed to process voice input');
    }

    const userText = speechResult.text;

    // Step 2: Extract appointment details
    const detailsResult = await extractAppointmentDetails(userText);
    
    if (!detailsResult.success) {
      throw new Error('Failed to understand appointment request');
    }

    const { specialty, symptoms, reason, urgency } = detailsResult.details;

    // Step 3: Find suitable doctor (pass original text for name matching)
    const doctorResult = await findDoctorBySpecialty(specialty, userText);
    
    if (!doctorResult.success) {
      throw new Error('Failed to find suitable doctor');
    }
    
    log('INFO', `Doctor selection: ${doctorResult.doctor.name} via ${doctorResult.matchType || 'specialty'} match`);

    // Step 4: Book appointment
    const appointmentResult = await bookAppointment({
      patient_id: patientData.id,
      patient_name: patientData.name,
      doctor_id: doctorResult.doctor.id,
      reason,
      priority: urgency === 'high' ? 'high' : 'normal',
    });

    if (!appointmentResult.success) {
      // Check if it's a duplicate appointment error
      if (appointmentResult.isDuplicate) {
        return {
          success: false,
          isDuplicate: true,
          error: appointmentResult.error,
          existingAppointment: appointmentResult.existingAppointment,
          transcription: userText,
          details: detailsResult.details,
          doctor: doctorResult.doctor,
        };
      }
      throw new Error('Failed to book appointment');
    }

    return {
      success: true,
      transcription: userText,
      details: detailsResult.details,
      doctor: doctorResult.doctor,
      appointment: appointmentResult.appointment,
      queuePosition: appointmentResult.queuePosition,
    };
  } catch (error) {
    console.error('Voice-based booking error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get patient appointment history
const getPatientHistory = async (patientId) => {
  try {
    log('INFO', `Fetching patient history for ID: ${patientId}`);
    const response = await axios.get(`${API_BASE_URL}/api/patients/${patientId}/history`);
    
    if (response.data && response.data.success) {
      return response.data;
    } else {
      return { success: false, history: [], totalAppointments: 0 };
    }
  } catch (error) {
    log('ERROR', 'Failed to fetch patient history', error);
    return { success: false, history: [], totalAppointments: 0 };
  }
};

export default {
  getDoctors,
  extractAppointmentDetails,
  findDoctorBySpecialty,
  bookAppointment,
  bookEmergencyAppointment,
  getQueueStatus,
  getMyQueuePosition,
  voiceBasedBooking,
  getPatientHistory,
};
