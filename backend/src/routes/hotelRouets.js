// routes/hotelRoutes.js
import express from "express";
import {
  createHotel,
  getHotels
} from "../controller/hotelController.js";

import { verifyToken, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/",
  verifyToken,
  authorizeRoles("super_admin"),
  createHotel
);

router.get(
  "/",
  verifyToken,
  authorizeRoles("super_admin", "owner"),
  getHotels
);

export default router;