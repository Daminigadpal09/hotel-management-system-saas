const mongoose = require('mongoose');
const Hotel = require('./src/model/Hotel');

mongoose.connect('mongodb://localhost:27017/hotel-management')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const count = await Hotel.countDocuments();
    console.log('Hotels in DB:', count);
    
    if (count === 0) {
      console.log('Creating sample hotel...');
      await Hotel.create({
        name: 'Sample Hotel',
        owner: '679765d5f3b5f9b4c8a5b3c1',
        address: '123 Main St',
        city: 'Mumbai',
        state: 'MH',
        country: 'India',
        pincode: '400001',
        phone: '+91-9876543210',
        email: 'hotel@example.com'
      });
      console.log('Sample hotel created');
    }
    
    process.exit(0);
  })
  .catch(console.error);
