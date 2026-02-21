const mongoose = require('mongoose');

(async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb+srv://hotel_saas:Seja!00@hotelsaas.oz75dbe.mongodb.net/?appName=hotelsaas');
    console.log('✅ Connected to MongoDB');
    
    const { default: Hotel } = await import('./src/model/hotel.js');
    
    console.log('Fetching hotels...');
    const hotels = await Hotel.find({}).sort({ createdAt: -1 });
    console.log(`Found ${hotels.length} hotels`);
    
    if (hotels.length > 0) {
      console.log('Hotels data:');
      hotels.forEach(hotel => {
        console.log(`- ${hotel.name} (${hotel._id})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
