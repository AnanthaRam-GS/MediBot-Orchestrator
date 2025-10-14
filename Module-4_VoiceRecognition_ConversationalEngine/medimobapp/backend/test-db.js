// Quick database connectivity test
const mysql = require('mysql2/promise');

const dbConfig = {
  host: '10.147.145.165',
  port: 3306,
  user: 'robot_user',
  password: 'robot_pass',
  database: 'robot_db',
  timezone: '+05:30',
};

async function testDatabase() {
  console.log('Testing database connection...');
  console.log(`Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`Database: ${dbConfig.database}`);
  console.log('');

  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully!');
    
    // Test 1: Check facial_recognition_users table
    console.log('\n--- Test 1: Checking facial_recognition_users table ---');
    const [users] = await connection.query('SELECT patient_id, name, created_at FROM facial_recognition_users LIMIT 5');
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ID: ${user.patient_id}, Name: ${user.name}, Created: ${user.created_at}`);
    });

    // Test 2: Check doctors table
    console.log('\n--- Test 2: Checking doctors table ---');
    const [doctors] = await connection.query('SELECT id, name, specialty FROM doctors LIMIT 5');
    console.log(`Found ${doctors.length} doctors:`);
    doctors.forEach(doc => {
      console.log(`  - ID: ${doc.id}, Name: ${doc.name}, Specialty: ${doc.specialty}`);
    });

    // Test 3: Add a test doctor
    console.log('\n--- Test 3: Adding test doctor ---');
    const [result] = await connection.query(`
      INSERT INTO doctors (name, specialty, qualifications, capacity, consultation_duration, phone, email, room_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'Dr. Test Backend',
      'Testing Specialty',
      'MBBS, Test Degree',
      10,
      15,
      '1234567890',
      'testbackend@test.com',
      'Room T-999'
    ]);
    console.log(`✅ Doctor added with ID: ${result.insertId}`);

    // Verify the insert
    const [newDoc] = await connection.query('SELECT * FROM doctors WHERE id = ?', [result.insertId]);
    console.log('Verified doctor data:', newDoc[0]);

    await connection.end();
    console.log('\n✅ All tests passed! Database is working correctly.');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testDatabase();
