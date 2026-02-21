const mongoose = require('mongoose');

(async () => {
  try {
    const { default: Hotel } = await import('./src/model/hotel.js');
    
    await mongoose.connect('mongodb+srv://hotel_saas:Seja!00@hotelsaas.oz75dbe.mongodb.net/?appName=hotelsaas');
    
    const hotels = await Hotel.find({});
    console.log('Total hotels in database:', hotels.length);
    if (hotels.length > 0) {
      console.log('Hotels:');
      hotels.forEach(hotel => {
        console.log(`- ID: ${hotel._id}`);
        console.log(`  Name: ${hotel.name}`);
        console.log(`  Owner: ${hotel.owner_id}`);
        console.log(`  Status: ${hotel.status}`);
        console.log('---');
      });
    } else {
      console.log('No hotels found in database');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
