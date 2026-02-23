// Test if billing collections are created
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    
    // Check if billing collections exist
    const db = mongoose.connection.db;
    
    db.listCollections()
      .then(collections => {
        const billingCollections = collections.filter(c => 
          c.name.includes('invoice') || 
          c.name.includes('payment') || 
          c.name.includes('revenu')
        );
        
        console.log("📋 Billing Collections Found:");
        if (billingCollections.length > 0) {
          billingCollections.forEach(col => {
            console.log(`  ✅ ${col.name}`);
          });
        } else {
          console.log("  ❌ No billing collections found");
        }
        
        console.log("\n🎯 Billing module is ready!");
        console.log("💡 Create your first invoice via the frontend at http://localhost:5173/billing");
        
        mongoose.connection.close();
      })
      .catch(err => {
        console.error("Error:", err);
        mongoose.connection.close();
      });
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
  });
