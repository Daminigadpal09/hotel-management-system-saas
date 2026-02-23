// routes/bookingRoutes.js
import express from "express";
import {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  checkIn,
  checkOut,
  cancelBooking,
  deleteBooking,
  getBookingHistory
} from "../controller/bookingController.js";

import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Basic CRUD routes
router.post(
  "/",
  protect,
  authorize("owner", "branch_manager", "receptionist"),
  createBooking
);

router.get(
  "/",
  protect,
  authorize("owner", "branch_manager", "receptionist"),
  getBookings
);

router.get(
  "/history",
  protect,
  authorize("owner", "branch_manager", "receptionist"),
  getBookingHistory
);

router.get(
  "/:id",
  protect,
  authorize("owner", "branch_manager", "receptionist"),
  getBookingById
);

router.put(
  "/:id",
  protect,
  authorize("owner", "branch_manager"),
  updateBooking
);

// Booking management actions
router.patch(
  "/:id/checkin",
  protect,
  authorize("owner", "branch_manager", "receptionist"),
  checkIn
);

router.patch(
  "/:id/checkout",
  protect,
  authorize("owner", "branch_manager", "receptionist"),
  checkOut
);

router.patch(
  "/:id/cancel",
  protect,
  authorize("owner", "branch_manager"),
  cancelBooking
);

router.delete(
  "/:id",
  protect,
  authorize("owner"),
  deleteBooking
);

export default router;
