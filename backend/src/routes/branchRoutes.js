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
  authorize("OWNER"),
  createBranch
);

router.get(
  "/all",
  authorize("OWNER", "RECEPTIONIST", "SUPER_ADMIN"),
  getAllBranches
);

router.get(
  "/",
  authorize("OWNER", "BRANCH_MANAGER"),
  getBranches
);

export default router;
