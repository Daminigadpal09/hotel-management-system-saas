const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    
    // Drop invoices collection to force schema update
    const db = mongoose.connection.db;
    
    db.dropCollection('invoices')
      .then(() => {
        console.log("✅ Dropped invoices collection - schema updated");
        mongoose.connection.close();
      })
      .catch(err => {
        if (err.message.includes('ns not found')) {
          console.log("✅ Invoices collection doesn't exist - schema is fresh");
        } else {
          console.error("❌ Error dropping collection:", err.message);
        }
        mongoose.connection.close();
      });
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
  });
