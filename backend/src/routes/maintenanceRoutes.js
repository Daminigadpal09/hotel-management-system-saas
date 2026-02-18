import express from "express";
import {
  getCleaningSchedule,
  updateCleaningSchedule,
  markRoomCleaned,
  getMaintenanceIssues,
  reportMaintenanceIssue,
  resolveMaintenanceIssue
} from "../controller/maintenanceController.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// 🧹 Cleaning Routes
router.get("/hotels/:hotelId/branches/:branchId/cleaning", getCleaningSchedule);
router.put("/hotels/:hotelId/branches/:branchId/cleaning/schedule", authorize("owner", "branch_manager", "housekeeping"), updateCleaningSchedule);
router.put("/hotels/:hotelId/branches/:branchId/rooms/:roomId/cleaned", authorize("owner", "branch_manager", "housekeeping"), markRoomCleaned);

// 🔧 Maintenance Routes
router.get("/hotels/:hotelId/branches/:branchId/maintenance", getMaintenanceIssues);
router.post("/hotels/:hotelId/branches/:branchId/rooms/:roomId/maintenance", authorize("owner", "branch_manager", "receptionist", "housekeeping"), reportMaintenanceIssue);
router.put("/hotels/:hotelId/branches/:branchId/rooms/:roomId/maintenance/resolve", authorize("owner", "branch_manager"), resolveMaintenanceIssue);

export default router;
