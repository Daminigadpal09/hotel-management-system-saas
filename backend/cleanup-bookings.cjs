const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect('mongodb+srv://hotel_saas:Seja!00@hotelsaas.oz75dbe.mongodb.net/?appName=hotelsaas');
    console.log('✅ Connected to MongoDB');
    
    // Import models
    await import('./src/model/Booking.js');
    const Booking = mongoose.model('Booking');
    
    // First, let's see what bookings exist
    const allBookings = await Booking.find({});
    console.log(`Found ${allBookings.length} total bookings`);
    
    // Delete all existing bookings to start fresh
    const result = await Booking.deleteMany({});
    console.log(`🧹 Deleted ${result.deletedCount} bookings to start fresh`);
    
    console.log('✅ Cleanup complete. Ready for fresh bookings!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
