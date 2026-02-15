
const mongoose=require("mongoose");
const userSchema= new mongoose.Schema({
    name:{type:String,require:true},
    email:{type:String,unique:true,require:true},
    password:{typr:String,require:true},
    role:{type:String,enum:["super_admin","owner","branch_manger","receptionist","housekeeping","accountant"],require:true},
    hotel_id:{type:mongoose.Schema.Types.ObjectId,ref:"Hotel",default:null},
    branch_id:{type:mongoose.Schema.Types.ObjectId,ref:"Branch",default:null},
    status:{type:String,enum:["active","inactive"],default:"active"},
},{timestamps:true});
module.exports=mongoose.model("User",userSchema);