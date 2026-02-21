const mongoose = require('mongoose');
const Hotel = require('./src/model/hotel.js');

mongoose.connect('mongodb+srv://hotel_saas:Seja!00@hotelsaas.oz75dbe.mongodb.net/?appName=hotelsaas')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Clear existing hotels
    await Hotel.deleteMany({});
    console.log('Cleared existing hotels');
    
    // Create sample hotel
    const hotel = await Hotel.create({
      name: 'Sample Hotel',
      owner_id: '679765d5f3b5f9b4c8a5b3c1',
      address: '123 Main Street',
      city: 'Mumbai',
      state: 'MH',
      country: 'India',
      pincode: '400001',
      phone: '+91-9876543210',
      email: 'hotel@example.com',
      status: 'active'
    });
    
    console.log('Sample hotel created:', hotel);
    process.exit(0);
  })
  .catch(console.error);
