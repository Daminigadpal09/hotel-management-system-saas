import mongoose from "mongoose";

const branchSchema = new mongoose.Schema({
    hotel_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hotel",
        required: true
    },
    name: { type: String, required: true },
    description: { type: String },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: "India" },
    phone: { type: String, required: true },
    email: { type: String },
    manager_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    gstNumber: { type: String },
    taxRates: {
        cgst: { type: Number, default: 0 },
        sgst: { type: Number, default: 0 },
        igst: { type: Number, default: 0 }
    },
    checkInTime: { type: String, default: "12:00" },
    checkOutTime: { type: String, default: "11:00" },
    amenities: [{
        name: String,
        available: { type: Boolean, default: true }
    }],
    images: [String],
    status: {
        type: String,
        enum: ["active", "inactive", "maintenance"],
        default: "active"
    }
}, { 
    timestamps: true,
    indexes: [
        { hotel_id: 1, status: 1 },
        { hotel_id: 1, city: 1 }
    ]
});

export default mongoose.model("Branch", branchSchema);
