const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect('mongodb+srv://hotel_saas:Seja!00@hotelsaas.oz75dbe.mongodb.net/?appName=hotelsaas');
    console.log('✅ Connected to MongoDB');
    
    const { default: Branch } = await import('./src/model/branch.js');
    
    const branches = await Branch.find({});
    console.log(`Found ${branches.length} branches:`);
    branches.forEach(branch => {
      console.log(`- ${branch.name} (${branch._id}) - Hotel: ${branch.hotel_id}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
