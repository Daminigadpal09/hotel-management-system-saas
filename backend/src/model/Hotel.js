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
        enum: ["active", "pending", "suspended"],
        default: "active"
    },
    subscription_plan: {
        type: String,
        enum: ["free", "basic", "premium", "enterprise"],
        default: "free"
    },
    subscription_status: {
        type: String,
        enum: ["active", "inactive", "expired"],
        default: "inactive"
    },
    subscription_expiry: {
        type: Date,
        default: null
    },
    max_branches: {
        type: Number,
        default: 1
    },
    max_users: {
        type: Number,
        default: 5
    },
    approved_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    approved_at: {
        type: Date,
        default: null
    },
    suspension_reason: {
        type: String,
        default: null
    }
}, { timestamps: true });

export default mongoose.model("Hotel", hotelSchema);
