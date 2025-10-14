const mysql = require('mysql2/promise');

const dbConfig = {
  host: '10.147.145.165',
  port: 3306,
  user: 'robot_user',
  password: 'robot_pass',
  database: 'robot_db',
  connectionLimit: 10
};

async function fixConstraints() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('🔧 Fixing foreign key constraints...');
    
    // Fix appointments table
    console.log('1. Dropping old appointments constraint...');
    try {
      await connection.execute('ALTER TABLE appointments DROP CONSTRAINT fk_appointments_patient');
      console.log('   ✅ Dropped appointments constraint');
    } catch (e) {
      console.log('   ℹ️  Appointments constraint already dropped or doesn\'t exist');
    }
    
    console.log('2. Adding correct appointments constraint...');
    await connection.execute(`
      ALTER TABLE appointments 
      ADD CONSTRAINT fk_appointments_patient 
      FOREIGN KEY (patient_id) REFERENCES facial_recognition_users(patient_id) 
      ON DELETE CASCADE
    `);
    console.log('   ✅ Added correct appointments constraint');
    
    // Fix doctor_queues table
    console.log('3. Dropping old doctor_queues constraint...');
    try {
      await connection.execute('ALTER TABLE doctor_queues DROP CONSTRAINT fk_queue_patient');
      console.log('   ✅ Dropped doctor_queues constraint');
    } catch (e) {
      console.log('   ℹ️  Doctor_queues constraint already dropped or doesn\'t exist');
    }
    
    console.log('4. Adding correct doctor_queues constraint...');
    await connection.execute(`
      ALTER TABLE doctor_queues 
      ADD CONSTRAINT fk_queue_patient 
      FOREIGN KEY (patient_id) REFERENCES facial_recognition_users(patient_id) 
      ON DELETE CASCADE
    `);
    console.log('   ✅ Added correct doctor_queues constraint');
    
    // Check if patients table exists and show info
    console.log('5. Checking for patients table...');
    try {
      const [rows] = await connection.execute('SHOW TABLES LIKE "patients"');
      if (rows.length > 0) {
        console.log('   ⚠️  Found patients table - dropping it...');
        await connection.execute('DROP TABLE patients');
        console.log('   ✅ Dropped patients table');
      } else {
        console.log('   ✅ No patients table found');
      }
    } catch (e) {
      console.log('   ℹ️  Patients table check:', e.message);
    }
    
    console.log('\n🎉 All constraints fixed successfully!');
    console.log('✅ appointments.patient_id -> facial_recognition_users.patient_id');
    console.log('✅ doctor_queues.patient_id -> facial_recognition_users.patient_id');
    
  } catch (error) {
    console.error('❌ Error fixing constraints:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

fixConstraints();