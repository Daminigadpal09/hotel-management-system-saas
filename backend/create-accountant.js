import mongoose from 'mongoose';
import User from '../model/User.js';
import dotenv from 'dotenv';

dotenv.config();

const createAccountantUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if accountant user already exists
    const existingUser = await User.findOne({ email: 'accountant@test.com' });
    if (existingUser) {
      console.log('Accountant user already exists!');
      console.log('Email: accountant@test.com');
      console.log('Password: accountant123');
      return;
    }

    // Create accountant user
    const accountantUser = new User({
      name: 'Test Accountant',
      email: 'accountant@test.com',
      password: 'accountant123',
      role: 'accountant'
    });

    await accountantUser.save();
    console.log('✅ Accountant user created successfully!');
    console.log('📧 Email: accountant@test.com');
    console.log('🔑 Password: accountant123');
    console.log('🎯 Role: accountant');

  } catch (error) {
    console.error('❌ Error creating accountant user:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createAccountantUser();
