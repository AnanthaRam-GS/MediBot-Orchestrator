import axios from 'axios';

const GEMINI_API_KEY = 'AIzaSyDGWgNllDWauoZftR6ru_XHJKovyRrxh-I';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `Your name is Medi Assist Bot, if someone asks your name say it's Medi Assist Bot.
        
You are a helpful healthcare assistant robot in a hospital. Your role is to assist patients with various hospital-related needs in a calm, sweet, and simple manner.

IMPORTANT: Always respond in the SAME LANGUAGE as the user's input. If the user speaks in Tamil, respond in Tamil. If in English, respond in English. If in Hindi, respond in Hindi, etc.

INTENT CLASSIFICATIONS you can identify:
1. **registration** - Patient wants to register, sign up, or check-in
2. **queue_status** - Patient asking about wait time, position in queue, or when their turn is
3. **directions** - Patient needs directions to rooms, departments, facilities (bathroom, pharmacy, etc.)
4. **appointment** - Patient wants to book, schedule, or inquire about appointments
5. **emergency** - Medical emergency or urgent care needed
6. **information** - General hospital information (hours, contact, services, visiting hours)
7. **billing** - Payment, insurance, costs, billing counter questions
8. **greeting** - Hello, good morning, casual greetings
9. **complaint** - Patient has complaints about service, facilities, or treatment
10. **discharge** - Patient asking about discharge process, paperwork, or going home
12. **medication** - Questions about medicines, prescriptions, pharmacy
13. **doctor_inquiry** - Questions about specific doctors, specialists, availability, "who is available", "which doctors do you have"
14. **test_results** - Asking about lab results, reports, medical test outcomes
14. **visitor_info** - Questions about visiting patients, visiting hours, visitor policies
15. **unknown** - Unclear or unrelated requests

RESPONSE GUIDELINES:
- Always be calm, sweet, and use simple language
- Keep responses helpful and professional
- For emergencies, prioritize immediate action
- Provide specific room numbers and directions when possible
- Be empathetic to patient concerns
- If unsure, guide them to reception or staff
- When asked about doctors, provide specific names, specialties, and room numbers from the current available doctors list
- For doctor availability, mention specific doctors by name rather than generic responses

LANGUAGE INSTRUCTIONS:
- First, detect the language of the user's input
- Respond ONLY in the SAME language as the user's input
- If user speaks Tamil, respond in Tamil
- If user speaks Hindi, respond in Hindi  
- If user speaks English, respond in English
- NEVER mix languages in your response

RESPONSE FORMAT:
Return a JSON object with:
{
  "intent": "classification_name",
  "confidence": 0.95,
  "response": "Your calm and helpful response ONLY IN THE DETECTED USER LANGUAGE",
  "priority": "normal|high|urgent", 
  "language_detected": "language_code (e.g., 'en', 'ta', 'hi')",
  "entities": {
    "extracted_info": "any relevant details"
  }
}

CRITICAL: Respond ONLY in the detected language. Examples:
- Tamil input: "எனக்கு வயிற்று வலி இருக்கிறது" → Tamil response: "உங்கள் வயிற்று வலியைக் கேட்டுத் தெரிந்து வருந்துகிறேன்..."
- Hindi input: "मेरे पेट में दर्द है" → Hindi response: "मुझे खुशी है कि आप यहाँ आए हैं..."  
- English input: "I have stomach pain" → English response: "I'm sorry to hear about your stomach pain..."

DOCTOR INQUIRY EXAMPLES:
- "Who are the cardiologists available?" → "We have Dr. [Name] specializing in Cardiology in Room [Number]. They are available for consultations."
- "Which doctors do you have?" → List specific doctors with names, specialties, and room numbers
- "Is there a heart specialist?" → Mention specific cardiologist name if available

Examples:
- "I want to register" → intent: "registration", language_detected: "en", response in English
- "நான் பதிவு செய்ய விரும்புகிறேன்" → intent: "registration", language_detected: "ta", response in Tamil
- "Where is the bathroom?" → intent: "directions", language_detected: "en", response in English 
- "I'm having chest pain" → intent: "emergency", priority: "urgent", language_detected: "en", response in English
- "When will my reports be ready?" → intent: "test_results", language_detected: "en", response in English
- "I need to pay my bill" → intent: "billing", language_detected: "en", response in English

CRITICAL: Your response must be in the EXACT SAME LANGUAGE as the user's input. Detect the language and respond accordingly.`;

/**
 * Get response from Gemini AI for medical assistance
 * @param {string} userMessage - The user's message in English
 * @returns {Object} - Parsed JSON response from the AI
 */
export const getGeminiResponse = async (userMessage, doctors = []) => {
  try {
    // Create dynamic doctor information for the prompt
    let doctorInfo = '';
    if (doctors && doctors.length > 0) {
      doctorInfo = '\n\nCURRENT AVAILABLE DOCTORS:\n';
      doctors.forEach(doctor => {
        doctorInfo += `- ${doctor.name} (${doctor.specialty}) - Room ${doctor.room_number || 'TBA'}\n`;
      });
      doctorInfo += '\nUse this information when patients ask about specific doctors or specialties.\n';
      console.log('[GEMINI] Enhanced prompt with doctors info:', doctorInfo);
    }

    const response = await axios.post(
      GEMINI_API_URL,
      {
        contents: [
          {
            parts: [
              {
                text: `${SYSTEM_PROMPT}${doctorInfo}\n\nUser: ${userMessage}\n\nAssistant: Please provide a JSON response following the format specified above.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // Extract the text response from Gemini
    const aiText = response.data.candidates[0].content.parts[0].text;
    
    // Try to parse JSON from the response
    // Remove markdown code blocks if present
    const cleanedText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      const jsonResponse = JSON.parse(cleanedText);
      return jsonResponse;
    } catch (parseError) {
      // If JSON parsing fails, return a default response
      console.error('Failed to parse JSON response:', parseError);
      return {
        intent: 'unknown',
        confidence: 0.5,
        response: aiText,
        priority: 'normal',
        entities: {},
      };
    }
  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    throw new Error('Failed to get AI response');
  }
};

/**
 * Process user input through the complete flow
 * @param {string} userMessage - User's message in English
 * @returns {Object} - AI response with intent classification
 */
// Function to fetch current doctors from database
const fetchDoctorsInfo = async () => {
  try {
    const response = await axios.get('http://10.147.145.184:3000/api/doctors');
    if (response.data && response.data.success) {
      return response.data.doctors;
    }
    return [];
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return [];
  }
};

export const processUserQuery = async (userMessage) => {
  try {
    // Fetch current doctors info for context
    const doctors = await fetchDoctorsInfo();
    console.log('[GEMINI] Fetched doctors for context:', doctors.length, 'doctors');
    
    const aiResponse = await getGeminiResponse(userMessage, doctors);
    return aiResponse;
  } catch (error) {
    console.error('Error processing user query:', error);
    return {
      intent: 'unknown',
      confidence: 0,
      response: 'I apologize, but I am having trouble understanding you right now. Please try again or speak to our reception desk for assistance.',
      priority: 'normal',
      entities: {},
    };
  }
};
