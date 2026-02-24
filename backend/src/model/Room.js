
import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
    hotel_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Hotel", 
        required: true 
    },
    branch_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Branch", 
        required: true 
    },
    roomNumber: { type: String, required: true },
    category: { 
        type: String, 
        required: true,
        enum: ["standard", "deluxe", "suite", "executive", "presidential"]
    },
    type: {
        type: String,
        required: true,
        enum: ["single", "double", "twin", "family", "dormitory"]
    },
    floor: { type: Number, required: true },
    basePrice: { type: Number, required: true },
    weekendPrice: { type: Number },
    holidayPrice: { type: Number },
    capacity: { type: Number, required: true, default: 2 },
    bedCount: { type: Number, required: true },
    amenities: [{
        name: String,
        included: { type: Boolean, default: true }
    }],
    inventory: {
        towels: { type: Number, default: 0 },
        bedsheets: { type: Number, default: 0 },
        pillows: { type: Number, default: 0 },
        blankets: { type: Number, default: 0 },
        soap: { type: Number, default: 0 },
        shampoo: { type: Number, default: 0 },
        waterBottles: { type: Number, default: 0 },
        coffee: { type: Number, default: 0 },
        tea: { type: Number, default: 0 },
        slippers: { type: Number, default: 0 },
        robes: { type: Number, default: 0 },
        toiletries: { type: Number, default: 0 }
    },
    images: [String],
    description: { type: String },
    status: {
        type: String,
        enum: ["available", "occupied", "maintenance", "cleaning", "out_of_order"],
        default: "available"
    },
    lastCleaned: { type: Date },
    nextCleaning: { type: Date },
    cleaningNotes: { type: String },
    maintenanceIssue: {
        issue: { type: String },
        priority: { 
            type: String, 
            enum: ["low", "medium", "high", "critical"],
            default: "medium" 
        },
        reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reportedAt: { type: Date },
        status: { 
            type: String, 
            enum: ["open", "in_progress", "resolved"], 
            default: "open" 
        },
        resolution: { type: String },
        resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        resolvedAt: { type: Date },
        cost: { type: Number }
    }
}, { 
    timestamps: true,
    indexes: [
        { hotel_id: 1, branch_id: 1 },
        { hotel_id: 1, status: 1 },
        { roomNumber: 1, hotel_id: 1 }
    ]
});

export default mongoose.model("Room", roomSchema);

