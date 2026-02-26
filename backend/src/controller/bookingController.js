import Booking from "../model/Booking.js";
import Room from "../model/Room.js";
import { branchTenantFilter } from "../utils/tenantFilter.js";

export const createBooking = async (req, res) => {
  try {
    console.log("DEBUG: Booking creation request body:", req.body);
    console.log("DEBUG: User info:", req.user);
    
    // Remove guestEmail from request body as it's not in model
    const { guestEmail, ...bookingData } = req.body;
    
    console.log("DEBUG: Processed booking data:", bookingData);
    
    // Convert date strings to Date objects for proper comparison
    const checkInDate = new Date(bookingData.checkIn);
    const checkOutDate = new Date(bookingData.checkOut);
    
    console.log("DEBUG: Checking room availability for:", {
      roomId: bookingData.roomId,
      checkIn: checkInDate,
      checkOut: checkOutDate
    });
    
    // Temporarily disable tenant filter to see all bookings for this room
    const existingBooking = await Booking.findOne({
      roomId: bookingData.roomId,
      status: { $in: ["BOOKED", "CHECKED_IN"] },
      $or: [
        { checkIn: { $lte: checkInDate }, checkOut: { $gte: checkInDate } },
        { checkIn: { $lte: checkOutDate }, checkOut: { $gte: checkOutDate } },
        { checkIn: { $gte: checkInDate }, checkOut: { $lte: checkOutDate } }
      ]
    });

    console.log("DEBUG: Existing booking found:", existingBooking);

    if (existingBooking) {
      console.log("DEBUG: Room conflict detected:", {
        existingBookingId: existingBooking._id,
        existingDates: {
          checkIn: existingBooking.checkIn,
          checkOut: existingBooking.checkOut
        },
        requestedDates: {
          checkIn: checkInDate,
          checkOut: checkOutDate
        }
      });
      return res.status(400).json({
        success: false,
        message: "Room is already booked for these dates"
      });
    }
    
    const booking = await Booking.create({
      ...bookingData
      // Don't override hotelId and branchId - use what's sent from frontend
    });

    console.log("DEBUG: Booking created successfully:", booking);
    console.log("DEBUG: Booking hotelId:", booking.hotelId);
    console.log("DEBUG: Booking branchId:", booking.branchId);

    // If booking has a guest ID, add to guest's visit history
    if (booking.guestId) {
      try {
        const Guest = mongoose.model('Guest');
        const guest = await Guest.findById(booking.guestId);
        
        if (guest) {
          await guest.addVisit({
            bookingId: booking._id,
            branchId: booking.branchId,
            checkInDate: booking.checkIn,
            checkOutDate: booking.checkOut,
            roomNumber: booking.roomId?.roomNumber || 'N/A',
            totalAmount: booking.totalAmount,
            status: 'completed'
          });
          console.log("DEBUG: Visit added to guest history");
        }
      } catch (guestError) {
        console.error("Error adding visit to guest history:", guestError);
        // Don't fail the booking creation if guest history update fails
      }
    }

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getAllBookingsForDebug = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    console.log("DEBUG: getAllBookingsForDebug - fetching ALL bookings without filtering");
    console.log("DEBUG: Pagination - page:", page, "limit:", limit);
    
    // Get ALL bookings without any tenant filtering
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const bookings = await Booking.find({})
      .populate('roomId', 'roomNumber category type basePrice')
      .populate('hotelId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Booking.countDocuments({});
    
    console.log("DEBUG: Total bookings found in database:", total);
    console.log("DEBUG: Returned bookings:", bookings.length);
      
    res.json({
      success: true,
      data: bookings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Error in getAllBookingsForDebug:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getBookings = async (req, res) => {
  try {
    const { hotelId, branchId, status, page = 1, limit = 10 } = req.query;
    
    // TEMPORARY: Bypass tenant filtering to show all bookings for debugging
    console.log("DEBUG: getBookings - TEMPORARILY BYPASSING TENANT FILTERING");
    console.log("DEBUG: getBookings query params:", { hotelId, branchId, status, page, limit });
    console.log("DEBUG: User info:", {
      id: req.user.id,
      role: req.user.role,
      hotelId: req.user.hotelId,
      branchId: req.user.branchId
    });
    
    // Get ALL bookings without tenant filtering
    let filter = {};
    
    // Only apply query filters, not tenant filters
    if (hotelId) filter.hotelId = hotelId;
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    
    console.log("DEBUG: Final filter (no tenant filtering):", filter);
    
    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const bookings = await Booking.find(filter)
      .populate('roomId', 'roomNumber category type basePrice')
      .populate('hotelId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Booking.countDocuments(filter);
    
    console.log("DEBUG: Found bookings:", bookings.length);
    console.log("DEBUG: Bookings data:", bookings);
      
    res.json({
      success: true,
      data: bookings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error("Error in getBookings:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('roomId', 'roomNumber category type basePrice')
      .populate('hotelId', 'name')
      .populate('branchId', 'name');
      
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }
    
    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('roomId', 'roomNumber category type basePrice');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }
    
    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const checkIn = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }
    
    if (booking.status !== "BOOKED") {
      return res.status(400).json({
        success: false,
        message: "Can only check in booked reservations"
      });
    }
    
    // Update booking status
    booking.status = "CHECKED_IN";
    await booking.save();
    
    // Update room status
    await Room.findByIdAndUpdate(booking.roomId, { status: "occupied" });
    
    res.json({
      success: true,
      data: booking,
      message: "Check-in successful"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const checkOut = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }
    
    if (booking.status !== "CHECKED_IN") {
      return res.status(400).json({
        success: false,
        message: "Can only check out guests who are checked in"
      });
    }
    
    // Update booking status
    booking.status = "CHECKED_OUT";
    await booking.save();
    
    // Update room status to available (or cleaning if needed)
    await Room.findByIdAndUpdate(booking.roomId, { status: "cleaning" });
    
    res.json({
      success: true,
      data: booking,
      message: "Check-out successful"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }
    
    if (booking.status === "CHECKED_IN") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a booking that is already checked in"
      });
    }
    
    if (booking.status === "CHECKED_OUT") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a booking that is already checked out"
      });
    }
    
    // Update booking status
    booking.status = "CANCELLED";
    await booking.save();
    
    res.json({
      success: true,
      data: booking,
      message: "Booking cancelled successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }
    
    // Only allow deletion of cancelled bookings
    if (booking.status !== "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Can only delete cancelled bookings"
      });
    }
    
    await Booking.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: "Booking deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getBookingHistory = async (req, res) => {
  try {
    const { hotelId, branchId, roomId, startDate, endDate, page = 1, limit = 10 } = req.query;
    let filter = branchTenantFilter(req);
    
    if (hotelId) filter.hotelId = hotelId;
    if (branchId) filter.branchId = branchId;
    if (roomId) filter.roomId = roomId;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const bookings = await Booking.find(filter)
      .populate('roomId', 'roomNumber category type')
      .populate('hotelId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Booking.countDocuments(filter);
      
    res.json({
      success: true,
      data: bookings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
