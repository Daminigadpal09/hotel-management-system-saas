import mongoose from "mongoose";
import dotenv from "dotenv";
import Hotel from "./src/model/hotel.js";

dotenv.config();

async function migrateHotels() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Update all hotels that don't have subscription fields
    const result = await Hotel.updateMany(
      {
        $or: [
          { subscription_plan: { $exists: false } },
          { subscription_plan: { $eq: null } }
        ]
      },
      {
        $set: {
          subscription_plan: "free",
          subscription_status: "inactive",
          subscription_expiry: null,
          max_branches: 1,
          max_users: 5,
          approved_by: null,
          approved_at: null,
          suspension_reason: null
        }
      }
    );

    console.log(`✅ Migration complete! Updated ${result.modifiedCount} hotels`);

    // Also update hotels that have old "active" status to include pending
    const pendingHotels = await Hotel.countDocuments({ status: "pending" });
    console.log(`📊 Hotels with pending status: ${pendingHotels}`);

    const activeHotels = await Hotel.countDocuments({ status: "active" });
    console.log(`📊 Hotels with active status: ${activeHotels}`);

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

migrateHotels();
