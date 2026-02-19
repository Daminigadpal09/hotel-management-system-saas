// routes/bookingRoutes.js
import express from "express";
import {
  createBooking,
  getBookings
} from "../controller/bookingController.js";

import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

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

export default router;
