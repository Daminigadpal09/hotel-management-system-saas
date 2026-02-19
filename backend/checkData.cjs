const mongoose = require('mongoose');
require('dotenv').config();

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const Hotel = mongoose.model('Hotel', new mongoose.Schema({ name: String, email: String }, { timestamps: true }));
    const User = mongoose.model('User', new mongoose.Schema({ name: String, email: String, role: String }, { timestamps: true }));
    const Branch = mongoose.model('Branch', new mongoose.Schema({ name: String }, { timestamps: true }));
    
    const hotels = await Hotel.find();
    const users = await User.find();
    const branches = await Branch.find();
    
    console.log('=== HOTELS (' + hotels.length + ') ===');
    hotels.forEach(h => console.log('- ' + h.name + ' (' + h.email + ')'));
    
    console.log('\n=== USERS (' + users.length + ') ===');
    users.forEach(u => console.log('- ' + u.name + ' - ' + u.role + ' (' + u.email + ')'));
    
    console.log('\n=== BRANCHES (' + branches.length + ') ===');
    branches.forEach(b => console.log('- ' + b.name));
    
    await mongoose.disconnect();
    console.log('\nDone!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkData();
