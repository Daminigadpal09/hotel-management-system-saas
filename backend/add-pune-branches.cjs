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
    
    // Hotels that need Pune branches
    const hotelsNeedingPune = hotels.filter(hotel => {
      return !['699563da2311bac3d54e6854', '6995668b2311bac3d54e6860', '6996aff49997309333ab8646'].includes(hotel._id.toString());
    });
    
    console.log(`Hotels needing Pune branches: ${hotelsNeedingPune.length}`);
    
    // Add Pune branch for hotels that don't have one
    for (const hotel of hotelsNeedingPune) {
      const existingPuneBranch = await Branch.findOne({ 
        hotel_id: hotel._id, 
        city: 'Pune' 
      });
      
      if (!existingPuneBranch) {
        const puneBranch = await Branch.create({
          name: 'Pune Branch',
          hotel_id: hotel._id,
          manager_id: '699810892daf7854a6542fba', // Using existing manager ID
          address: '123 Pune Street',
          city: 'Pune',
          state: 'MH',
          country: 'India',
          pincode: '411001',
          phone: '+91-9876543210',
          email: 'pune@example.com',
          status: 'active',
          basePrice: 1000,
          weekendPrice: 1200,
          holidayPrice: 1500
        });
        
        console.log(`✅ Created Pune branch for hotel: ${hotel.name}`);
      } else {
        console.log(`ℹ️ Pune branch already exists for hotel: ${hotel.name}`);
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
