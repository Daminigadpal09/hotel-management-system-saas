
const mongoose= require("mongoose");
const connectDB=async()=>{
try{
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
}
catch(error){
    console.log("MongoDB connection error - continuing without database",error.message);
    // Don't exit the process, just continue without database
}
};
module.exports=connectDB;
