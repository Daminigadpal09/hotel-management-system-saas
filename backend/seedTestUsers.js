import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/model/User.js";
import Hotel from "./src/model/hotel.js";
import BranchModel from "./src/model/BranchModel.js";

dotenv.config();

// Test users data
const TEST_USERS = [
  {
    name: "John Smith",
    email: "john.smith@hotel.com",
    password: "password123",
    role: "owner",
    status: "active"
  },
  {
    name: "Jane Doe",
    email: "jane.doe@hotel.com",
    password: "password123",
    role: "branch_manager",
    status: "active"
  },
  {
    name: "Mike Johnson",
    email: "mike.johnson@hotel.com",
    password: "password123",
    role: "receptionist",
    status: "active"
  },
  {
    name: "Sarah Wilson",
    email: "sarah.wilson@hotel.com",
    password: "password123",
    role: "housekeeping",
    status: "active"
  },
  {
    name: "Tom Brown",
    email: "tom.brown@hotel.com",
    password: "password123",
    role: "accountant",
    status: "active"
  },
  {
    name: "Emily Davis",
    email: "emily.davis@hotel.com",
    password: "password123",
    role: "branch_manager",
    status: "active"
  },
  {
    name: "Chris Martin",
    email: "chris.martin@hotel.com",
    password: "password123",
    role: "receptionist",
    status: "active"
  },
  {
    name: "Lisa Anderson",
    email: "lisa.anderson@hotel.com",
    password: "password123",
    role: "housekeeping",
    status: "active"
  }
];

async function seedTestUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // First, create a test owner user
    let ownerUser = await User.findOne({ email: "john.smith@hotel.com" });
    if (!ownerUser) {
      ownerUser = await User.create({
        name: "John Smith",
        email: "john.smith@hotel.com",
        password: "password123",
        role: "owner",
        status: "active"
      });
      console.log("✅ Owner user created:", ownerUser.email);
    }

    // Create or get a test hotel
    let testHotel = await Hotel.findOne({ name: "Grand Hotel" });
    if (!testHotel) {
      testHotel = await Hotel.create({
        name: "Grand Hotel",
        email: "info@grandhotel.com",
        phone: "+1-234-567-8900",
        address: "123 Main Street, Mumbai",
        status: "active",
        subscription_plan: "premium",
        subscription_status: "active",
        owner_id: ownerUser._id
      });
      console.log("✅ Test hotel created:", testHotel.name);
    }

    // Create test branches
    let mainBranch = await BranchModel.findOne({ name: "Main Branch" });
    if (!mainBranch) {
      mainBranch = await BranchModel.create({
        name: "Main Branch",
        hotel_id: testHotel._id,
        address: "123 Main Street, Mumbai",
        phone: "+1-234-567-8901",
        city: "Mumbai"
      });
      console.log("✅ Main branch created");
    }

    let puneBranch = await BranchModel.findOne({ name: "Pune Branch" });
    if (!puneBranch) {
      puneBranch = await BranchModel.create({
        name: "Pune Branch",
        hotel_id: testHotel._id,
        address: "456 Pune Road, Pune",
        phone: "+1-234-567-8902",
        city: "Pune"
      });
      console.log("✅ Pune branch created");
    }

    // Check existing users
    const existingUsers = await User.find({ role: { $ne: "super_admin" } });
    console.log(`📊 Found ${existingUsers.length} existing users`);

    if (existingUsers.length > 0) {
      console.log("⚠️  Test users already exist!");
      existingUsers.forEach(user => {
        console.log(`   ${user.name} (${user.email}) - ${user.role}`);
      });
    } else {
      // Create test users
      const createdUsers = [];
      
      for (let i = 0; i < TEST_USERS.length; i++) {
        const userData = { ...TEST_USERS[i] };
        
        // Assign hotel and branch to users
        if (userData.role === "owner") {
          userData.hotel_id = testHotel._id;
        } else if (userData.role === "branch_manager") {
          userData.hotel_id = testHotel._id;
          userData.branch_id = i % 2 === 0 ? mainBranch._id : puneBranch._id;
        } else {
          userData.hotel_id = testHotel._id;
          userData.branch_id = i % 2 === 0 ? mainBranch._id : puneBranch._id;
        }

        const user = await User.create(userData);
        createdUsers.push(user);
        console.log(`✅ Created user: ${user.name} (${user.email}) - ${user.role}`);
      }

      console.log(`\n🎉 Successfully created ${createdUsers.length} test users!`);
      console.log("\n📋 User Login Credentials:");
      console.log("Email: john.smith@hotel.com (Owner)");
      console.log("Email: jane.doe@hotel.com (Branch Manager)");
      console.log("Email: mike.johnson@hotel.com (Receptionist)");
      console.log("Email: sarah.wilson@hotel.com (Housekeeping)");
      console.log("Email: tom.brown@hotel.com (Accountant)");
      console.log("Password for all: password123");
    }

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

seedTestUsers();
