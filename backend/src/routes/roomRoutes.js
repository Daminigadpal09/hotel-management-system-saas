// routes/roomRoutes.js
import express from "express";
import {
  createRoom,
  getRooms
} from "../controller/roomController.js";

import { verifyToken, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/",
  verifyToken,
  authorizeRoles("OWNER", "BRANCH_MANAGER"),
  createRoom
);

router.get(
  "/",
  verifyToken,
  authorizeRoles("OWNER", "BRANCH_MANAGER", "RECEPTIONIST"),
  getRooms
);

export default router;
