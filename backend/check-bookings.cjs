const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect('mongodb+srv://hotel_saas:Seja!00@hotelsaas.oz75dbe.mongodb.net/?appName=hotelsaas');
    console.log('✅ Connected to MongoDB');
    
    // Import all models to ensure they're registered
    await import('./src/model/Booking.js');
    await import('./src/model/Room.js');
    await import('./src/model/hotel.js');
    await import('./src/model/branch.js');
    
    const Booking = mongoose.model('Booking');
    
    // Get all bookings to see what's actually saved
    console.log('\n=== All Bookings in Database ===');
    const allBookings = await Booking.find({})
      .populate('roomId', 'roomNumber category type')
      .populate('hotelId', 'name')
      .populate('branchId', 'name');
    
    console.log(`Total bookings found: ${allBookings.length}`);
    
    allBookings.forEach((booking, index) => {
      console.log(`\n--- Booking ${index + 1} ---`);
      console.log(`ID: ${booking._id}`);
      console.log(`Guest: ${booking.guestName}`);
      console.log(`Hotel ID: ${booking.hotelId}`);
      console.log(`Hotel Name: ${booking.hotelId?.name || 'N/A'}`);
      console.log(`Branch ID: ${booking.branchId}`);
      console.log(`Branch Name: ${booking.branchId?.name || 'N/A'}`);
      console.log(`Room ID: ${booking.roomId}`);
      console.log(`Room: ${booking.roomId?.roomNumber || 'N/A'}`);
      console.log(`Status: ${booking.status}`);
      console.log(`Check-in: ${booking.checkIn}`);
      console.log(`Check-out: ${booking.checkOut}`);
      console.log(`Amount: ${booking.totalAmount}`);
    });
    
    // Now test the specific query that's failing
    console.log('\n=== Testing Specific Query ===');
    const hotelId = '69980cb7a1f372fb1cf1fe5f';
    const branchId = '6999abfed4e6cf81ef321bc1';
    
    console.log(`Searching for bookings with hotelId: ${hotelId}, branchId: ${branchId}`);
    
    const specificBookings = await Booking.find({
      hotelId: hotelId,
      branchId: branchId
    })
    .populate('roomId', 'roomNumber category type')
    .populate('hotelId', 'name')
    .populate('branchId', 'name');
    
    console.log(`Found ${specificBookings.length} bookings for specific hotel/branch`);
    
    specificBookings.forEach((booking, index) => {
      console.log(`\n--- Specific Booking ${index + 1} ---`);
      console.log(`Guest: ${booking.guestName}`);
      console.log(`Hotel: ${booking.hotelId?.name}`);
      console.log(`Branch: ${booking.branchId?.name}`);
      console.log(`Room: ${booking.roomId?.roomNumber}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
