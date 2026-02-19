import express from "express";
import {
  createRoom,
  getRooms,
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
router.post("/hotels/:hotelId/branches/:branchId/rooms", authorize("owner", "branch_manager"), createRoom);
router.get("/hotels/:hotelId/branches/:branchId/rooms", getRooms);
router.get("/hotels/:hotelId/branches/:branchId/rooms/:roomId", getRoomById);
router.put("/hotels/:hotelId/branches/:branchId/rooms/:roomId", authorize("owner", "branch_manager"), updateRoom);
router.patch("/hotels/:hotelId/branches/:branchId/rooms/:roomId/status", authorize("owner", "branch_manager"), updateRoomStatus);
router.delete("/hotels/:hotelId/branches/:branchId/rooms/:roomId", authorize("owner", "branch_manager"), deleteRoom);

export default router;
