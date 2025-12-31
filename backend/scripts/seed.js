/**
 * Database Seed Script
 * Run: node scripts/seed.js
 * 
 * Creates an admin user for initial setup
 */

require('dotenv').config();
const { connectDB } = require('../config/db');
const Admin = require('../models/Admin');

const seedAdmin = async () => {
  try {
    await connectDB();
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@nalmifx.com' });
    
    if (existingAdmin) {
      console.log('Admin already exists:');
      console.log(`Email: ${existingAdmin.email}`);
      process.exit(0);
    }
    
    // Create admin in Admin collection
    const admin = await Admin.create({
      email: 'admin@nalmifx.com',
      password: 'Admin@123',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'NalmiFX',
      role: 'superadmin',
      isActive: true
    });
    
    console.log('Admin user created successfully!');
    console.log('Email: admin@nalmifx.com');
    console.log('Password: Admin@123');
    console.log('\nPlease change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seedAdmin();
