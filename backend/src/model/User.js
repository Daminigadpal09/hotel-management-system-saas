
const mongoose=require("mongoose");
const userSchema= new mongoose.Schema({
    name:{type:String,required:true},
    email:{type:String,unique:true,required:true},
    password:{type:String,required:true},
    role:{type:String,enum:["super_admin","owner","branch_manager","receptionist","housekeeping","accountant"],required:true},
    hotel_id:{type:mongoose.Schema.Types.ObjectId,ref:"Hotel",default:null},
    branch_id:{type:mongoose.Schema.Types.ObjectId,ref:"Branch",default:null},
    status:{type:String,enum:["active","inactive"],default:"active"},
},{timestamps:true});
module.exports=mongoose.model("User",userSchema);