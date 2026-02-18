import mongoose from "mongoose";

const hotelSchema = new mongoose.Schema({
    name: { type: String, required: true },
    owner_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    description: { type: String },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    logo: { type: String },
    gstNumber: { type: String },
    brandColor: { type: String, default: "#3B82F6" },
    status: {
        type: String,
        enum: ["active", "suspended"],
        default: "active"
    }
}, { timestamps: true });

export default mongoose.model("Hotel", hotelSchema);
