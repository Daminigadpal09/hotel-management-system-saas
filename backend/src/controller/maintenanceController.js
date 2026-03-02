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

// Get All Maintenance (for housekeeping dashboard)
export const getAllMaintenance = async (req, res) => {
  try {
    const { branchId, status } = req.query;
    
    // Build query
    let query = {};
    if (branchId) {
      query.branch_id = branchId;
    }
    if (status) {
      query.status = status;
    }
    
    // Get rooms with maintenance issues or cleaning status
    const rooms = await Room.find({
      ...query,
      $or: [
        { status: "maintenance" },
        { status: "out_of_order" },
        { status: "cleaning" }
      ]
    }).populate("hotel_id branch_id").sort({ updatedAt: -1 });

    // Transform to maintenance tasks format
    const tasks = rooms.map(room => ({
      _id: room._id,
      roomId: room,
      taskType: room.status === "cleaning" ? "cleaning" : "maintenance",
      status: room.status === "cleaning" ? "in_progress" : (room.maintenanceIssue?.status || "open"),
      priority: room.maintenanceIssue?.priority || "normal",
      notes: room.maintenanceIssue?.issue || room.cleaningNotes || "",
      createdAt: room.maintenanceIssue?.reportedAt || room.updatedAt,
      branchId: room.branch_id,
      hotelId: room.hotel_id
    }));

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create Maintenance Task
export const createMaintenance = async (req, res) => {
  try {
    const { roomId, taskType, priority, notes, branchId, hotelId } = req.body;
    
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    if (taskType === "cleaning") {
      room.status = "cleaning";
      room.cleaningNotes = notes;
      await room.save();
      
      return res.json({
        success: true,
        message: "Cleaning task created successfully",
        data: room
      });
    } else {
      room.status = "maintenance";
      room.maintenanceIssue = {
        issue: notes,
        priority: priority || "medium",
        reportedBy: req.user.id,
        reportedAt: new Date(),
        status: "open"
      };
      await room.save();
      
      return res.json({
        success: true,
        message: "Maintenance issue reported successfully",
        data: room
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update Maintenance Task
export const updateMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, priority } = req.body;
    
    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    if (room.status === "cleaning") {
      if (status === "completed") {
        room.status = "available";
        room.lastCleaned = new Date();
        room.cleaningNotes = notes || room.cleaningNotes;
      } else if (notes) {
        room.cleaningNotes = notes;
      }
      await room.save();
      
      return res.json({
        success: true,
        message: "Cleaning task updated successfully",
        data: room
      });
    } else {
      if (status === "completed") {
        room.maintenanceIssue.status = "resolved";
        room.maintenanceIssue.resolvedBy = req.user.id;
        room.maintenanceIssue.resolvedAt = new Date();
        room.status = "available";
      } else if (status === "in_progress") {
        room.maintenanceIssue.status = "in_progress";
      } else if (notes) {
        room.maintenanceIssue.issue = notes;
      }
      if (priority) {
        room.maintenanceIssue.priority = priority;
      }
      await room.save();
      
      return res.json({
        success: true,
        message: "Maintenance task updated successfully",
        data: room
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
