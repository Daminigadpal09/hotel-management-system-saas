import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/model/User.js";

dotenv.config();

// Default super admin credentials
const SUPER_ADMIN = {
  name: "Super Admin",
  email: "superadmin@hotel-saas.com",
  password: "superadmin123",
  role: "super_admin",
  status: "active"
};

async function seedSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: "super_admin" });
    
    if (existingSuperAdmin) {
      console.log("⚠️  Super Admin already exists!");
      console.log(`   Email: ${existingSuperAdmin.email}`);
      console.log(`   Role: ${existingSuperAdmin.role}`);
    } else {
      // Create super admin
      const superAdmin = await User.create(SUPER_ADMIN);
      console.log("✅ Super Admin created successfully!");
      console.log(`   Email: ${superAdmin.email}`);
      console.log(`   Password: ${SUPER_ADMIN.password}`);
      console.log(`   Role: ${superAdmin.role}`);
    }

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

seedSuperAdmin();
