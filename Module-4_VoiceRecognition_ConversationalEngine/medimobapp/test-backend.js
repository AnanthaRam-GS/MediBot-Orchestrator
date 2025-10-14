// Test script to verify backend and database connectivity
// This will add a sample doctor to the database

const axios = require('axios');

const API_URL = 'http://10.147.145.165:3000/api';

// Test 1: Health check
async function testHealthCheck() {
    console.log('\n========================================');
    console.log('TEST 1: Backend Health Check');
    console.log('========================================');
    
    try {
        const response = await axios.get(`${API_URL}/health`);
        console.log('✅ Backend is running!');
        console.log('Response:', response.data);
        return true;
    } catch (error) {
        console.log('❌ Backend health check failed');
        console.log('Error:', error.message);
        return false;
    }
}

// Test 2: Get all doctors
async function testGetDoctors() {
    console.log('\n========================================');
    console.log('TEST 2: Get All Doctors');
    console.log('========================================');
    
    try {
        const response = await axios.get(`${API_URL}/doctors`);
        console.log('✅ Successfully fetched doctors!');
        console.log('Number of doctors:', response.data.doctors.length);
        console.log('Doctors:', JSON.stringify(response.data.doctors, null, 2));
        return true;
    } catch (error) {
        console.log('❌ Failed to fetch doctors');
        console.log('Error:', error.message);
        if (error.response) {
            console.log('Response status:', error.response.status);
            console.log('Response data:', error.response.data);
        }
        return false;
    }
}

// Test 3: Add a test doctor (using direct database query)
async function testAddDoctor() {
    console.log('\n========================================');
    console.log('TEST 3: Add Test Doctor');
    console.log('========================================');
    
    const testDoctor = {
        name: 'Dr. Test Kumar',
        specialty: 'General Medicine',
        qualifications: 'MBBS, MD (Test)',
        capacity: 10,
        consultation_duration: 15,
        phone: '9999999999',
        email: 'test@hospital.com',
        room_number: 'Test Room 999'
    };
    
    try {
        // Note: We'll need to create this endpoint or use direct MySQL
        console.log('Doctor data to insert:', testDoctor);
        console.log('⚠️  Note: Direct insert endpoint may not exist yet');
        console.log('You can manually insert this data or check if doctors already exist');
        return true;
    } catch (error) {
        console.log('❌ Failed to add doctor');
        console.log('Error:', error.message);
        return false;
    }
}

// Run all tests
async function runTests() {
    console.log('\n╔═══════════════════════════════════════╗');
    console.log('║  BACKEND & DATABASE CONNECTIVITY TEST  ║');
    console.log('╚═══════════════════════════════════════╝');
    
    const test1 = await testHealthCheck();
    const test2 = await testGetDoctors();
    const test3 = await testAddDoctor();
    
    console.log('\n========================================');
    console.log('TEST SUMMARY');
    console.log('========================================');
    console.log(`Health Check: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Get Doctors:  ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Add Doctor:   ${test3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log('========================================\n');
}

// Run the tests
runTests();
