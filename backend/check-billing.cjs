const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    
    // Check if billing collections exist
    const db = mongoose.connection.db;
    
    // Test Invoice collection
    db.listCollections({ name: 'invoices' })
      .then(collections => {
        console.log("Collections found:", collections.map(c => c.name));
        
        if (collections.length > 0) {
          console.log("✅ Billing collections are ready!");
          console.log("📋 Available collections:");
          collections.forEach(col => {
            console.log(`  - ${col.name}`);
          });
        } else {
          console.log("⚠️  No collections found yet. Create your first invoice to initialize.");
        }
        
        mongoose.connection.close();
      })
      .catch(err => {
        console.error("Error listing collections:", err);
        mongoose.connection.close();
      });
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
  });
