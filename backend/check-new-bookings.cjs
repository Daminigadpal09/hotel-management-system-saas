const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect('mongodb+srv://hotel_saas:Seja!00@hotelsaas.oz75dbe.mongodb.net/?appName=hotelsaas');
    console.log('✅ Connected to MongoDB');
    
    // Import models
    await import('./src/model/Booking.js');
    const Booking = mongoose.model('Booking');
    
    // Check if any bookings exist now
    const allBookings = await Booking.find({})
      .populate('roomId', 'roomNumber category type')
      .populate('hotelId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 });
    
    console.log(`📊 Current bookings in database: ${allBookings.length}`);
    
    if (allBookings.length === 0) {
      console.log('❌ No bookings found. You need to create some bookings first.');
      console.log('💡 Try creating a booking in the Booking Management page.');
    } else {
      console.log('✅ Bookings found:');
      allBookings.forEach((booking, index) => {
        console.log(`\n--- Booking ${index + 1} ---`);
        console.log(`Guest: ${booking.guestName}`);
        console.log(`Hotel: ${booking.hotelId?.name || booking.hotelId}`);
        console.log(`Branch: ${booking.branchId?.name}`);
        console.log(`Room: ${booking.roomId?.roomNumber}`);
        console.log(`Status: ${booking.status}`);
        console.log(`Created: ${booking.createdAt}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
