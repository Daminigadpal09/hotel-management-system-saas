const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect('mongodb+srv://hotel_saas:Seja!00@hotelsaas.oz75dbe.mongodb.net/?appName=hotelsaas');
    console.log('✅ Connected to MongoDB');
    
    const { default: Branch } = await import('./src/model/branch.js');
    const { default: Hotel } = await import('./src/model/hotel.js');
    const { default: Room } = await import('./src/model/Room.js');
    
    // Get all branches
    const branches = await Branch.find({});
    console.log(`Found ${branches.length} branches`);
    
    if (branches.length === 0) {
      console.log('❌ No branches found. Please run the branch creation scripts first.');
      process.exit(1);
    }
    
    // Add rooms to each branch
    for (const branch of branches) {
      console.log(`\n=== Adding rooms to: ${branch.name} (${branch.city}) ===`);
      console.log('Branch fields:', Object.keys(branch));
      console.log('Branch hotel_id:', branch.hotel_id);
      console.log('Branch hotelId:', branch.hotelId);
      
      // Check if rooms already exist
      const existingRooms = await Room.find({ branch_id: branch._id });
      console.log(`Existing rooms: ${existingRooms.length}`);
      
      if (existingRooms.length > 0) {
        console.log('Rooms already exist for this branch. Skipping...');
        continue;
      }
      
      // Create sample rooms
      const sampleRooms = [
        {
          hotel_id: branch.hotel_id || branch.hotelId, // Use the correct field name
          branch_id: branch._id,
          roomNumber: '101',
          category: 'standard',
          type: 'single',
          floor: 1,
          basePrice: 1000,
          weekendPrice: 1200,
          holidayPrice: 1500,
          capacity: 1,
          bedCount: 1,
          amenities: [
            { name: 'WiFi', included: true },
            { name: 'AC', included: true },
            { name: 'TV', included: true }
          ],
          status: 'available'
        },
        {
          hotel_id: branch.hotel_id || branch.hotelId, // Use the correct field name
          branch_id: branch._id,
          roomNumber: '102',
          category: 'deluxe',
          type: 'double',
          floor: 1,
          basePrice: 2000,
          weekendPrice: 2400,
          holidayPrice: 3000,
          capacity: 2,
          bedCount: 1,
          amenities: [
            { name: 'WiFi', included: true },
            { name: 'AC', included: true },
            { name: 'TV', included: true },
            { name: 'Mini Fridge', included: true }
          ],
          status: 'available'
        },
        {
          hotel_id: branch.hotel_id || branch.hotelId, // Use the correct field name
          branch_id: branch._id,
          roomNumber: '201',
          category: 'suite',
          type: 'family',
          floor: 2,
          basePrice: 3500,
          weekendPrice: 4200,
          holidayPrice: 5000,
          capacity: 4,
          bedCount: 2,
          amenities: [
            { name: 'WiFi', included: true },
            { name: 'AC', included: true },
            { name: 'TV', included: true },
            { name: 'Mini Fridge', included: true },
            { name: 'Living Area', included: true }
          ],
          status: 'available'
        },
        {
          hotel_id: branch.hotel_id || branch.hotelId, // Use the correct field name
          branch_id: branch._id,
          roomNumber: '202',
          category: 'executive',
          type: 'double',
          floor: 2,
          basePrice: 2500,
          weekendPrice: 3000,
          holidayPrice: 3500,
          capacity: 2,
          bedCount: 1,
          amenities: [
            { name: 'WiFi', included: true },
            { name: 'AC', included: true },
            { name: 'TV', included: true },
            { name: 'Work Desk', included: true },
            { name: 'Mini Bar', included: true }
          ],
          status: 'available'
        }
      ];
      
      // Insert rooms
      const createdRooms = await Room.insertMany(sampleRooms);
      console.log(`✅ Created ${createdRooms.length} rooms for ${branch.name}`);
      
      createdRooms.forEach(room => {
        console.log(`  - Room ${room.roomNumber} (${room.category}) - $${room.basePrice}/night`);
      });
    }
    
    console.log('\n=== Final Room Count ===');
    const finalBranches = await Branch.find({});
    for (const branch of finalBranches) {
      const roomCount = await Room.countDocuments({ branch_id: branch._id });
      console.log(`${branch.name} (${branch.city}): ${roomCount} rooms`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
