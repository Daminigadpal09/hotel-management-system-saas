import express from "express";
import {
  createRoom,
  getRooms,
  getAllRooms,
  getRoomById,
  updateRoom,
  updateRoomStatus,
  deleteRoom
} from "../controller/roomController.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// 🛏️ Room Routes (nested under hotels and branches)
router.post("/hotels/:hotelId/branches/:branchId/rooms", authorize("owner", "branch_manager", "receptionist"), createRoom);
router.get("/hotels/:hotelId/branches/:branchId/rooms", authorize("owner", "branch_manager", "receptionist"), getRooms);
router.get("/hotels/:hotelId/branches/:branchId/rooms/:roomId", getRoomById);
router.put("/hotels/:hotelId/branches/:branchId/rooms/:roomId", authorize("owner", "branch_manager", "receptionist"), updateRoom);
router.patch("/hotels/:hotelId/branches/:branchId/rooms/:roomId/status", authorize("owner", "branch_manager", "receptionist"), updateRoomStatus);
router.delete("/hotels/:hotelId/branches/:branchId/rooms/:roomId", authorize("owner", "branch_manager"), deleteRoom);

// 🛏️ Get All Rooms (for branch managers to see all available rooms)
router.get("/all-rooms", authorize("super_admin", "owner", "branch_manager", "receptionist"), getAllRooms);

// 🛏️ Get Rooms by Branch ID (for branch dashboard)
router.get("/branches/:branchId/rooms", authorize("super_admin", "owner", "branch_manager", "receptionist"), getRooms);

export default router;
