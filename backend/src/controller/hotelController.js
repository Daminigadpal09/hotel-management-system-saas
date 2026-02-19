import Hotel from "../model/hotel.js";
import Branch from "../model/Branch.js";

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

    // Check access
    // Temporarily disable ownership check for testing
    // if (req.user.role !== "super_admin" && hotel.owner_id.toString() !== req.user.id) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied"
    //   });
    // }

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
