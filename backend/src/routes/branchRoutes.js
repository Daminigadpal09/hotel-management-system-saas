// routes/branchRoutes.js
import express from "express";
import {
  createBranch,
  getBranches
} from "../controller/branchController.js";

import { verifyToken, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/",
  verifyToken,
  authorizeRoles("OWNER"),
  createBranch
);

router.get(
  "/",
  verifyToken,
  authorizeRoles("OWNER", "BRANCH_MANAGER"),
  getBranches
);

export default router;
