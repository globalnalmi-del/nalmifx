require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const fixAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/NalmiFx_trading');
    
    const admin = await User.findOne({ email: 'admin@nalmifx.com' });
    
    if (!admin) {
      console.log('Admin user not found');
      process.exit(1);
    }

    // Hash and set password
    const hashedPassword = await bcrypt.hash('Admin@123', 12);
    admin.password = hashedPassword;
    admin.emailVerified = true;
    admin.isActive = true;
    
    await admin.save();
    
    console.log('✅ Admin password fixed successfully!');
    console.log('Email: admin@nalmifx.com');
    console.log('Password: Admin@123');
    console.log('Email Verified:', admin.emailVerified);
    console.log('Is Active:', admin.isActive);
    
    process.exit(0);
  } catch (error) {
    console.error('Error fixing admin password:', error);
    process.exit(1);
  }
};

fixAdminPassword();
