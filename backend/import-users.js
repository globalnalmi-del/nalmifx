require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// Add your users here
const users = [
  {
    email: 'admin@nalmifx.com',
    password: 'Admin@123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isActive: true,
    emailVerified: true
  },
  // Add more users as needed
  // {
  //   email: 'user@example.com',
  //   password: 'User@123',
  //   firstName: 'John',
  //   lastName: 'Doe',
  //   role: 'user',
  //   isActive: true,
  //   emailVerified: true
  // }
];

const importUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nalmifx');
    
    console.log('Connected to database');
    
    for (const userData of users) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Create user
      const user = new User({
        ...userData,
        password: hashedPassword
      });

      await user.save();
      console.log(`✅ Created user: ${userData.email}`);
    }
    
    console.log('\n🎉 User import completed!');
    console.log('\nLogin credentials:');
    users.forEach(user => {
      console.log(`Email: ${user.email}, Password: ${user.password}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error importing users:', error);
    process.exit(1);
  }
};

importUsers();
