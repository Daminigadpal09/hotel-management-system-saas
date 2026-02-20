import Booking from "../model/Booking.js";
import { branchTenantFilter } from "../utils/tenantFilter.js";

export const createBooking = async (req, res) => {
  try {
    console.log("DEBUG: Booking creation request body:", req.body);
    console.log("DEBUG: User info:", req.user);
    
    // Remove guestEmail from request body as it's not in model
    const { guestEmail, ...bookingData } = req.body;
    
    console.log("DEBUG: Processed booking data:", bookingData);
    
    const booking = await Booking.create({
      ...bookingData,
      hotelId: req.user.hotel_id || req.user.id // Use user hotel_id or fallback to user id
    });

    console.log("DEBUG: Booking created successfully:", booking);

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
    const bookings = await Booking.find(branchTenantFilter(req));
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
