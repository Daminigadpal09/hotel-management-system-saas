import express from "express";
import {
  createHotel,
  getHotels,
  getHotelById,
  updateHotel,
  createBranch,
  getBranches,
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  getAllUsersForOwner
} from "../controller/hotelController.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Debug middleware to log all requests
router.use((req, res, next) => {
  console.log("Route hit:", req.method, req.originalUrl);
  next();
});

// 👥 Get All Users for Owner (must be before /:id route)
router.get("/users/all", authorize("owner", "super_admin"), getAllUsersForOwner);

// 🏨 Hotel Routes (for hotel owners)
router.post("/", authorize("owner"), createHotel);
router.get("/", authorize("owner", "branch_manager", "receptionist", "super_admin"), getHotels);
router.get("/:id", getHotelById); // Accessible by owner and super admin
router.put("/:id", updateHotel); // Accessible by owner and super admin

// 🏢 Branch Routes
router.post("/:hotelId/branches", authorize("owner", "branch_manager"), createBranch);
router.get("/:hotelId/branches", authorize("owner", "branch_manager", "receptionist", "super_admin"), getBranches);

// 👥 User Management Routes
router.post("/:hotelId/users", authorize("owner", "super_admin"), createUser);
router.get("/:hotelId/users", authorize("owner", "super_admin"), getUsers);
router.put("/:hotelId/users/:userId", authorize("owner", "super_admin"), updateUser);
router.delete("/:hotelId/users/:userId", authorize("owner", "super_admin"), deleteUser);

export default router;
