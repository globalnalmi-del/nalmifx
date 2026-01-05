require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const fixAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/NalmiFx_trading');
    
    const admin = await User.findOne({ email: 'admin@nalmifx.com' });
    
    if (!admin) {
      console.log('Admin user not found');
      process.exit(1);
    }

    // Set plain password (model will auto-hash it)
    admin.password = 'Admin@123';
    admin.emailVerified = true;
    admin.isActive = true;
    
    await admin.save();
    
    console.log('✅ Admin password fixed successfully!');
    console.log('Email: admin@nalmifx.com');
    console.log('Password: Admin@123');
    
    // Test the password
    const testAdmin = await User.findOne({ email: 'admin@nalmifx.com' }).select('+password');
    const isMatch = await testAdmin.comparePassword('Admin@123');
    console.log('Password test result:', isMatch ? '✅ PASS' : '❌ FAIL');
    
    process.exit(0);
  } catch (error) {
    console.error('Error fixing admin password:', error);
    process.exit(1);
  }
};

fixAdminPassword();
