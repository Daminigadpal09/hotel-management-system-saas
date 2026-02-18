import express from "express";
import {
  getPlatformAnalytics,
  getAllHotels,
  approveHotel,
  suspendHotel,
  getHotelUsers,
  updateSubscription
} from "../controller/superAdminController.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require super admin role
router.use(protect);
router.use(authorize("super_admin"));

// 📊 Platform Analytics
router.get("/analytics", getPlatformAnalytics);

// 🏨 Hotel Management
router.get("/hotels", getAllHotels);
router.put("/hotels/:hotelId/approve", approveHotel);
router.put("/hotels/:hotelId/suspend", suspendHotel);
router.put("/hotels/:hotelId/subscription", updateSubscription);

// 👥 User Management
router.get("/hotels/:hotelId/users", getHotelUsers);

export default router;
