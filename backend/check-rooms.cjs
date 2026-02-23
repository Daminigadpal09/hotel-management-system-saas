const mongoose = require('mongoose');
const Room = require('./src/model/Room.js');
const Branch = require('./src/model/Branch.js');

mongoose.connect('mongodb://localhost:27017/hotel-management')
.then(async () => {
  console.log('✅ Connected to MongoDB');
  
  try {
    // Use mongoose.model directly if import has issues
    const BranchModel = mongoose.model('Branch') || Branch;
    const RoomModel = mongoose.model('Room') || Room;
    
    // First, show all branches to see their exact names
    console.log('\n=== All Branches ===');
    const allBranches = await BranchModel.find({});
    console.log(`Total branches: ${allBranches.length}`);
    
    for (const branch of allBranches) {
      const roomCount = await RoomModel.countDocuments({ branch_id: branch._id });
      console.log(`${branch.name} (${branch.city}) - ID: ${branch._id} - Rooms: ${roomCount}`);
      
      // Show rooms for this branch
      if (roomCount > 0) {
        const rooms = await RoomModel.find({ branch_id: branch._id });
        rooms.forEach(room => {
          console.log(`  ✅ Room ${room.roomNumber} (${room.category}) - Status: ${room.status} - Price: $${room.basePrice}`);
        });
      } else {
        console.log(`  ❌ No rooms found - need to add rooms!`);
      }
    }
    
    // Now specifically look for Mumbai and Pune
    console.log('\n=== Mumbai and Pune Branches ===');
    const mumbaiPuneBranches = allBranches.filter(branch => 
      branch.name.toLowerCase().includes('mumbai') || 
      branch.name.toLowerCase().includes('pune') ||
      branch.city?.toLowerCase().includes('mumbai') || 
      branch.city?.toLowerCase().includes('pune')
    );
    
    console.log(`Found ${mumbaiPuneBranches.length} Mumbai/Pune branches:`);
    for (const branch of mumbaiPuneBranches) {
      const rooms = await RoomModel.find({ branch_id: branch._id });
      console.log(`${branch.name} (${branch.city}): ${rooms.length} rooms`);
      
      if (rooms.length === 0) {
        console.log('  ❌ No rooms found - need to add rooms!');
      } else {
        rooms.forEach(room => {
          console.log(`  ✅ Room ${room.roomNumber} (${room.category}) - Status: ${room.status}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
})
.catch(err => {
  console.error('Database connection error:', err);
  process.exit(1);
});
