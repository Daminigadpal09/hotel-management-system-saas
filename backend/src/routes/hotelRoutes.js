import express from "express";
import {
  createHotel,
  getHotels,
  getHotelById,
  updateHotel,
  createBranch,
  getBranches
} from "../controller/hotelController.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// 🏨 Hotel Routes (for hotel owners)
router.post("/", authorize("owner"), createHotel);
router.get("/", authorize("owner"), getHotels);
router.get("/:id", getHotelById); // Accessible by owner and super admin
router.put("/:id", updateHotel); // Accessible by owner and super admin

// 🏢 Branch Routes
router.post("/:hotelId/branches", authorize("owner", "branch_manager"), createBranch);
router.get("/:hotelId/branches", authorize("owner", "branch_manager", "super_admin"), getBranches);

export default router;
