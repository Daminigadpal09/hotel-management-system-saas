import mongoose from "mongoose";

const branchSchema = new mongoose.Schema({
    hotelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hotel",
        required: true
    },
    name: { type: String, required: true },
    address: { type: String, required: true },
    gstNumber: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model("Branch", branchSchema);
