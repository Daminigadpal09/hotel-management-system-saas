// routes/bookingRoutes.js
import express from "express";
import {
  createBooking,
  getBookings
} from "../controller/bookingController.js";

import { verifyToken, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/",
  verifyToken,
  authorizeRoles("OWNER", "BRANCH_MANAGER", "RECEPTIONIST"),
  createBooking
);

router.get(
  "/",
  verifyToken,
  authorizeRoles("OWNER", "BRANCH_MANAGER", "RECEPTIONIST"),
  getBookings
);

export default router;
