import Booking from "../model/Booking.js";
import { branchTenantFilter } from "../utils/tenantFilter.js";

export const createBooking = async (req, res) => {
  const booking = await Booking.create({
    ...req.body,
    hotelId: req.user.hotelId
  });

  res.status(201).json(booking);
};

export const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find(branchTenantFilter(req));
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
