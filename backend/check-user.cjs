const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    
    // Get User collection
    const db = mongoose.connection.db;
    const users = db.collection('users');
    
    // Find the user by ID
    users.findOne({ _id: mongoose.Types.ObjectId('699810892daf7854a6542fba') })
      .then(user => {
        console.log("User found:", JSON.stringify(user, null, 2));
        mongoose.connection.close();
      })
      .catch(err => {
        console.error("Error finding user:", err);
        mongoose.connection.close();
      });
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
  });
