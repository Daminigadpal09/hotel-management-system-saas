
const mongoose= require("mongoose");
const connectDB=async()=>{
try{
    await mongoose.connect(Process.env.MONGO_URI);
    console.log("MongoDB connected");


}
catch(error){
    console.log("monogosDB connection error",error);
    process.exit(1);

}
};
module.exports=connectDB;
