// routes/branchRoutes.js
import express from "express";
import {
  createBranch,
  getBranches,
  getAllBranches
} from "../controller/branchController.js";

import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

router.post(
  "/",
  authorize("owner"),
  createBranch
);

router.get(
  "/all",
  authorize("owner", "receptionist", "super_admin"),
  getAllBranches
);

router.get(
  "/",
  authorize("owner", "branch_manager"),
  getBranches
);

export default router;
