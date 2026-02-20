import Hotel from "../model/hotel.js";
import Branch from "../model/Branch.js";
import User from "../model/User.js";
import bcrypt from "bcryptjs";

// 🏨 Create Hotel (for hotel owners)
export const createHotel = async (req, res) => {
  try {
    const hotelData = {
      ...req.body,
      owner_id: req.user.id,
      status: "active" // Hotels are active by default
    };

    const hotel = await Hotel.create(hotelData);
    
    res.status(201).json({
      success: true,
      message: "Hotel created successfully",
      data: hotel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 🏨 Get Hotels (for hotel owners - only their hotels)
export const getHotels = async (req, res) => {
  try {
    // First, let's see all hotels in the database for debugging
    const allHotels = await Hotel.find({});
    console.log("DEBUG: All hotels in database:", {
      totalHotels: allHotels.length,
      hotels: allHotels.map(h => ({ 
        id: h._id, 
        name: h.name, 
        owner_id: h.owner_id,
        status: h.status 
      }))
    });

    const hotels = await Hotel.find({ owner_id: req.user.id })
      .sort({ createdAt: -1 });

    // Debug logging
    console.log("DEBUG: User hotels:", {
      userId: req.user.id,
      userType: typeof req.user.id,
      hotelsFound: hotels.length,
      hotelIds: hotels.map(h => ({ id: h._id, name: h.name, owner_id: h.owner_id }))
    });

    res.json({
      success: true,
      data: hotels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 🏨 Get Hotel by ID
export const getHotelById = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id)
      .populate("owner_id", "name email phone");

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found"
      });
    }

    // Check if user owns this hotel or is super admin
    if (req.user.role !== "super_admin" && hotel.owner_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    res.json({
      success: true,
      data: hotel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 🏨 Update Hotel
export const updateHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found"
      });
    }

    // Check if user owns this hotel or is super admin
    if (req.user.role !== "super_admin" && hotel.owner_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const updatedHotel = await Hotel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Hotel updated successfully",
      data: updatedHotel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 🏢 Create Branch
export const createBranch = async (req, res) => {
  try {
    const { hotelId } = req.params;
    
    // Check if hotel exists and user owns it
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found"
      });
    }

    console.log("DEBUG: CreateBranch - Hotel ownership check:", {
      hotelId: hotelId,
      hotelOwnerId: hotel.owner_id,
      userId: req.user.id,
      userRole: req.user.role,
      comparison: String(hotel.owner_id) === String(req.user.id)
    });

    // Enable ownership check - use String() for proper comparison
    if (req.user.role !== "super_admin" && String(hotel.owner_id) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const branchData = {
      ...req.body,
      hotel_id: hotelId,
      manager_id: req.user.id // Assign the creator as branch manager
    };

    const branch = await Branch.create(branchData);
    
    // Update the user to include the branch_id
    if (req.user.role === "branch_manager") {
      const User = await import("../model/User.js");
      await User.findByIdAndUpdate(req.user.id, { 
        branch_id: branch._id 
      });
    }

    res.status(201).json({
      success: true,
      message: "Branch created successfully",
      data: branch
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 🏢 Get Branches
export const getBranches = async (req, res) => {
  try {
    const { hotelId } = req.params;
    
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found"
      });
    }

    const branches = await Branch.find({ hotel_id: hotelId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: branches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 👥 Create User (for hotel owner to add staff)
export const createUser = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { name, email, password, role, branch_id } = req.body;
    
    // Check if hotel exists and user owns it
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found"
      });
    }

    // Check ownership
    if (req.user.role !== "super_admin" && String(hotel.owner_id) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered"
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      hotel_id: hotelId,
      branch_id: branch_id || null,
      status: "active"
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hotel_id: user.hotel_id,
        branch_id: user.branch_id,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 👥 Get Users by Hotel
export const getUsers = async (req, res) => {
  try {
    const { hotelId } = req.params;
    
    // Check if hotel exists
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found"
      });
    }

    // Check ownership
    if (req.user.role !== "super_admin" && String(hotel.owner_id) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const users = await User.find({ hotel_id: hotelId })
      .select("-password")
      .populate("branch_id", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 👥 Update User
export const updateUser = async (req, res) => {
  try {
    const { hotelId, userId } = req.params;
    const { name, email, role, branch_id, status } = req.body;
    
    // Check if hotel exists and user owns it
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found"
      });
    }

    // Check ownership
    if (req.user.role !== "super_admin" && String(hotel.owner_id) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if user belongs to this hotel
    if (String(user.hotel_id) !== String(hotelId)) {
      return res.status(403).json({
        success: false,
        message: "User does not belong to this hotel"
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, email, role, branch_id, status },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({
      success: true,
      message: "User updated successfully",
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 👥 Delete User
export const deleteUser = async (req, res) => {
  try {
    const { hotelId, userId } = req.params;
    
    // Check if hotel exists and user owns it
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found"
      });
    }

    // Check ownership
    if (req.user.role !== "super_admin" && String(hotel.owner_id) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if user belongs to this hotel
    if (String(user.hotel_id) !== String(hotelId)) {
      return res.status(403).json({
        success: false,
        message: "User does not belong to this hotel"
      });
    }

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 👥 Get All Users for Owner (all users in database)
export const getAllUsersForOwner = async (req, res) => {
  try {
    console.log("getAllUsersForOwner called by:", req.user);
    
    // Get all users from the database (excluding passwords)
    const users = await User.find()
      .select("-password")
      .populate("hotel_id", "name")
      .populate("branch_id", "name")
      .sort({ createdAt: -1 });

    console.log("Found users:", users.length);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error("Error in getAllUsersForOwner:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
