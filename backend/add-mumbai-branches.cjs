const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect('mongodb+srv://hotel_saas:Seja!00@hotelsaas.oz75dbe.mongodb.net/?appName=hotelsaas');
    console.log('✅ Connected to MongoDB');
    
    const { default: Branch } = await import('./src/model/branch.js');
    const { default: Hotel } = await import('./src/model/hotel.js');
    
    // Get all hotels
    const hotels = await Hotel.find({});
    console.log(`Found ${hotels.length} hotels`);
    
    // Add Mumbai branch for each hotel that doesn't have one
    for (const hotel of hotels) {
      const existingMumbaiBranch = await Branch.findOne({ 
        hotel_id: hotel._id, 
        city: 'Mumbai' 
      });
      
      if (!existingMumbaiBranch) {
        const mumbaiBranch = await Branch.create({
          name: 'Mumbai Branch',
          hotel_id: hotel._id,
          manager_id: '699810892daf7854a6542fba', // Using existing manager ID
          address: '123 Mumbai Street',
          city: 'Mumbai',
          state: 'MH',
          country: 'India',
          pincode: '400001',
          phone: '+91-9876543210',
          email: 'mumbai@example.com',
          status: 'active',
          basePrice: 1200,
          weekendPrice: 1500,
          holidayPrice: 1800
        });
        
        console.log(`✅ Created Mumbai branch for hotel: ${hotel.name}`);
      } else {
        console.log(`ℹ️ Mumbai branch already exists for hotel: ${hotel.name}`);
      }
    }
    
    console.log('\nAll branches after update:');
    const allBranches = await Branch.find({});
    allBranches.forEach(branch => {
      console.log(`- ${branch.name} (${branch.city}) - Hotel: ${branch.hotel_id}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
