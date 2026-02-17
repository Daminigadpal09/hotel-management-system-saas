import Booking from "../models/Booking.js";

export const createBooking = async (req, res) => {
  const booking = await Booking.create({
    ...req.body,
    hotelId: req.user.hotelId
  });

  res.status(201).json(booking);
};

export const getBookings = async (req, res) => {
  const query = { hotelId: req.user.hotelId };

  if (req.user.role === "BRANCH_MANAGER") {
    query.branchId = req.user.branchId;
  }

  const bookings = await Booking.find(query)
    .populate("roomId");

  res.json(bookings);
};
