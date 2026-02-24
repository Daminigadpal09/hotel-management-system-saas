import Room from "../model/Room.js";
import BranchModel from "../model/BranchModel.js";
import Hotel from "../model/hotel.js";

// 🧹 Get Cleaning Schedule
export const getCleaningSchedule = async (req, res) => {
  try {
    const { hotelId, branchId } = req.params;
    
    // Check access
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found"
      });
    }

    if (req.user.role !== "super_admin" && hotel.owner_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Get rooms that need cleaning or are scheduled for cleaning
    const rooms = await Room.find({
      hotel_id: hotelId,
      branch_id: branchId,
      $or: [
        { status: "cleaning" },
        { status: "occupied" },
        { nextCleaning: { $lte: new Date() } }
      ]
    }).sort({ nextCleaning: 1, floor: 1, roomNumber: 1 });

    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 🧹 Update Cleaning Schedule
export const updateCleaningSchedule = async (req, res) => {
  try {
    const { hotelId, branchId, roomId } = req.params;
    const { nextCleaning, cleaningNotes } = req.body;
    
    const room = await Room.findOne({ 
      _id: roomId, 
      hotel_id: hotelId, 
      branch_id: branchId 
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // Check access
    const hotel = await Hotel.findById(hotelId);
    if (req.user.role !== "super_admin" && hotel.owner_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Only housekeeping and management can update cleaning
    if (!["owner", "branch_manager", "housekeeping"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only housekeeping staff can update cleaning schedule"
      });
    }

    room.nextCleaning = nextCleaning ? new Date(nextCleaning) : undefined;
    if (cleaningNotes) {
      room.cleaningNotes = cleaningNotes;
    }
    
    await room.save();

    res.json({
      success: true,
      message: "Cleaning schedule updated successfully",
      data: room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 🔧 Mark Room as Cleaned
export const markRoomCleaned = async (req, res) => {
  try {
    const { hotelId, branchId, roomId } = req.params;
    const { cleaningNotes, amenitiesChecked } = req.body;
    
    const room = await Room.findOne({ 
      _id: roomId, 
      hotel_id: hotelId, 
      branch_id: branchId 
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // Check access
    const hotel = await Hotel.findById(hotelId);
    if (req.user.role !== "super_admin" && hotel.owner_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Only housekeeping can mark rooms as cleaned
    if (!["owner", "branch_manager", "housekeeping"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only housekeeping staff can mark rooms as cleaned"
      });
    }

    room.status = "available";
    room.lastCleaned = new Date();
    room.nextCleaning = undefined;
    
    if (cleaningNotes) {
      room.cleaningNotes = cleaningNotes;
    }
    
    if (amenitiesChecked) {
      room.amenities = amenitiesChecked;
    }
    
    await room.save();

    res.json({
      success: true,
      message: "Room marked as cleaned successfully",
      data: room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 🔧 Get Maintenance Issues
export const getMaintenanceIssues = async (req, res) => {
  try {
    const { hotelId, branchId } = req.params;
    
    // Check access
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found"
      });
    }

    if (req.user.role !== "super_admin" && hotel.owner_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Get rooms with maintenance issues
    const rooms = await Room.find({
      hotel_id: hotelId,
      branch_id: branchId,
      status: "maintenance"
    }).sort({ floor: 1, roomNumber: 1 });

    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 🔧 Report Maintenance Issue
export const reportMaintenanceIssue = async (req, res) => {
  try {
    const { hotelId, branchId, roomId } = req.params;
    const { issue, priority, reportedBy } = req.body;
    
    const room = await Room.findOne({ 
      _id: roomId, 
      hotel_id: hotelId, 
      branch_id: branchId 
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // Check access
    const hotel = await Hotel.findById(hotelId);
    if (req.user.role !== "super_admin" && hotel.owner_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    room.status = "maintenance";
    room.maintenanceIssue = {
      issue,
      priority: priority || "medium",
      reportedBy: reportedBy || req.user.id,
      reportedAt: new Date(),
      status: "open"
    };
    
    await room.save();

    res.json({
      success: true,
      message: "Maintenance issue reported successfully",
      data: room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 🔧 Resolve Maintenance Issue
export const resolveMaintenanceIssue = async (req, res) => {
  try {
    const { hotelId, branchId, roomId } = req.params;
    const { resolution, resolvedBy, cost } = req.body;
    
    const room = await Room.findOne({ 
      _id: roomId, 
      hotel_id: hotelId, 
      branch_id: branchId 
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // Check access
    const hotel = await Hotel.findById(hotelId);
    if (req.user.role !== "super_admin" && hotel.owner_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    if (!room.maintenanceIssue) {
      return res.status(400).json({
        success: false,
        message: "No maintenance issue found"
      });
    }

    room.maintenanceIssue.status = "resolved";
    room.maintenanceIssue.resolution = resolution;
    room.maintenanceIssue.resolvedBy = resolvedBy || req.user.id;
    room.maintenanceIssue.resolvedAt = new Date();
    if (cost) room.maintenanceIssue.cost = cost;
    
    room.status = "available";
    await room.save();

    res.json({
      success: true,
      message: "Maintenance issue resolved successfully",
      data: room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
