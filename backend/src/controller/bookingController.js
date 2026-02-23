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
    
    // Check if room is available for the dates
    const existingBooking = await Booking.findOne({
      roomId: bookingData.roomId,
      status: { $in: ["BOOKED", "CHECKED_IN"] },
      $or: [
        { checkIn: { $lte: bookingData.checkIn }, checkOut: { $gte: bookingData.checkIn } },
        { checkIn: { $lte: bookingData.checkOut }, checkOut: { $gte: bookingData.checkOut } },
        { checkIn: { $gte: bookingData.checkIn }, checkOut: { $lte: bookingData.checkOut } }
      ]
    });

    if (existingBooking) {
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

export const getBookings = async (req, res) => {
  try {
    const { hotelId, branchId, status } = req.query;
    let filter = branchTenantFilter(req);
    
    console.log("DEBUG: getBookings query params:", { hotelId, branchId, status });
    console.log("DEBUG: branchTenantFilter result:", filter);
    console.log("DEBUG: User info:", req.user);
    
    if (hotelId) filter.hotelId = hotelId;
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    
    console.log("DEBUG: Final filter:", filter);
    
    const bookings = await Booking.find(filter)
      .populate('roomId', 'roomNumber category type basePrice')
      .populate('hotelId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 });
    
    console.log("DEBUG: Found bookings:", bookings.length);
      
    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
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
    const { hotelId, branchId, roomId, startDate, endDate } = req.query;
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
    
    const bookings = await Booking.find(filter)
      .populate('roomId', 'roomNumber category type')
      .populate('hotelId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 });
      
    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
