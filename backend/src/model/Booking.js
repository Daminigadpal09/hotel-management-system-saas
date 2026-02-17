// models/Booking.js

import mongoose from "mongoose";
const bookingSchema=new mongoose.Schema({
    hotelId:{type:mongoose.Schema.Types.ObjectId,ref:"Hotel"},
    branchId:{type:mongoose.Schema.Types.ObjectId,ref:"Branch"},
    roomId:{type:mongoose.Schema.Types.ObjectId,ref:"Room"},
    guestName:String,
    checkIn:Date,
    checkOut:Date,
    status:{type:String,
        enum:["BOOKED","CHECKED_IN","CHECKED_OUT","CANCELLED"],
        default:"BOOKED"},
    totalAmount:Number
},{timestamps:true})
export default mongoose.model("Booking",bookingSchema)
