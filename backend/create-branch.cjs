const mongoose = require('mongoose');

(async () => {
  const { default: Branch } = await import('./src/model/branch.js');

  mongoose.connect('mongodb+srv://hotel_saas:Seja!00@hotelsaas.oz75dbe.mongodb.net/?appName=hotelsaas')
    .then(async () => {
    const branch = await Branch.create({
      name: 'Main Branch',
      hotel_id: '679765d5f3b5f9b4c8a5b3c1',
      manager_id: '699810892daf7854a6542fba',
      address: '123 Main Street',
      city: 'Mumbai',
      state: 'MH',
      country: 'India',
      pincode: '400001',
      phone: '+91-9876543210',
      email: 'branch@example.com',
      status: 'active',
      basePrice: 1000,
      weekendPrice: 1200,
      holidayPrice: 1500
    });
    console.log('✅ Branch created');
    process.exit(0);
  })
  .catch(console.error);
})();
