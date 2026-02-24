import Room from "../model/Room.js";
import BranchModel from "../model/BranchModel.js";
import Hotel from "../model/hotel.js";

// 🛏️ Create Room
export const createRoom = async (req, res) => {
  try {
    const { hotelId, branchId } = req.params;
    
    // Check if branch exists and user has access
    const branch = await BranchModel.findById(branchId);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found"
      });
    }

    // Check hotel ownership
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found"
      });
    }

    // Temporarily disable ownership check for testing
    // if (req.user.role !== "super_admin" && hotel.owner_id.toString() !== req.user.id) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied"
    //   });
    // }

    // Check if room number already exists in this branch
    const existingRoom = await Room.findOne({ 
      hotel_id: hotelId, 
      branch_id: branchId, 
      roomNumber: req.body.roomNumber 
    });
    
    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: "Room number already exists in this branch"
      });
    }

    const roomData = {
      ...req.body,
      hotel_id: hotelId,
      branch_id: branchId,
      // Ensure amenities has proper default structure
      amenities: req.body.amenities || [
        { name: "WiFi", included: true },
        { name: "Air Conditioning", included: true },
        { name: "TV", included: true }
      ]
    };

    const room = await Room.create(roomData);

    res.status(201).json({
      success: true,
      message: "Room created successfully",
      data: room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 🛏️ Get Rooms (for a specific branch)
export const getRooms = async (req, res) => {
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

    // Temporarily disable ownership check for testing
    // if (req.user.role !== "super_admin" && hotel.owner_id.toString() !== req.user.id) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied"
    //   });
    // }

    const { category, status, floor } = req.query;
    const filter = { hotel_id: hotelId, branch_id: branchId };
    
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (floor) filter.floor = parseInt(floor);

    const rooms = await Room.find(filter)
      .sort({ floor: 1, roomNumber: 1 });

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

// 🛏️ Get Room by ID
export const getRoomById = async (req, res) => {
  try {
    const { hotelId, branchId, roomId } = req.params;
    
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
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found"
      });
    }

    // Temporarily disable ownership check for testing
    // if (req.user.role !== "super_admin" && hotel.owner_id.toString() !== req.user.id) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied"
    //   });
    // }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 🛏️ Update Room
export const updateRoom = async (req, res) => {
  try {
    const { hotelId, branchId, roomId } = req.params;
    
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
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found"
      });
    }

    // Temporarily disable ownership check for testing
    // if (req.user.role !== "super_admin" && hotel.owner_id.toString() !== req.user.id) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied"
    //   });
    // }

    const updatedRoom = await Room.findByIdAndUpdate(
      roomId,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Room updated successfully",
      data: updatedRoom
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 🛏️ Update Room Status
export const updateRoomStatus = async (req, res) => {
  console.log("DEBUG: updateRoomStatus function called:", {
    params: req.params,
    body: req.body,
    user: req.user
  });
  
  try {
    const { hotelId, branchId, roomId } = req.params;
    const { status } = req.body;
    
    if (!["available", "occupied", "maintenance", "cleaning", "out_of_order"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid room status"
      });
    }

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
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found"
      });
    }

    // Temporarily disable ownership check for testing
    // if (req.user.role !== "super_admin" && hotel.owner_id.toString() !== req.user.id) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied"
    //   });
    // }

    room.status = status;
    if (status === "cleaning") {
      room.lastCleaned = new Date();
    }
    
    await room.save();

    res.json({
      success: true,
      message: "Room status updated successfully",
      data: room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 🛏️ Delete Room
export const deleteRoom = async (req, res) => {
  try {
    const { hotelId, branchId, roomId } = req.params;
    
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
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found"
      });
    }

    // Temporarily disable ownership check for testing
    // if (req.user.role !== "super_admin" && hotel.owner_id.toString() !== req.user.id) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied"
    //   });
    // }

    await Room.findByIdAndDelete(roomId);

    res.json({
      success: true,
      message: "Room deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
