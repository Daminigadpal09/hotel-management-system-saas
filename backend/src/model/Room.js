
import mongoose, { mongo } from "mongoose";

const roomSchema = new mongoose.Schema({
    hotelId: {
        type: mongoose.Schema.Types.ObjectId, ref: "Hotel"
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch"
    },
    category: String,
    roomNumber: String,
    price: Number,
    status: {
        type: String,
        enum: ["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE"],
        default: "AVAILABLE"
    }
});

export default mongoose.model("Room", roomSchema);

