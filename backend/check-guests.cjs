const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    
    // Get Guest collection
    const db = mongoose.connection.db;
    const guests = db.collection('guests');
    
    // Find all guests
    guests.find({}).toArray()
      .then(result => {
        console.log("Total guests found:", result.length);
        console.log("Guests:", JSON.stringify(result, null, 2));
        mongoose.connection.close();
      })
      .catch(err => {
        console.error("Error finding guests:", err);
        mongoose.connection.close();
      });
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
  });
