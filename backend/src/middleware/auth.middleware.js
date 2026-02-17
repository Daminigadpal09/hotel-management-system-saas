import jwt from "jsonwebtoken";
import User from "../model/User.js";

// ✅ 1. Verify JWT Token
export const verifyToken = async (req, res, next) => {
  try {
    let token;

    // Check if Authorization header exists
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Optional: Fetch fresh user from DB (recommended for security)
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Attach full user info to request
    req.user = {
      id: user._id,
      role: user.role,
      hotelId: user.hotelId,
      branchId: user.branchId,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};



// ✅ 2. Role-Based Authorization
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: insufficient permissions",
      });
    }

    next();
  };
};



// ✅ 3. Optional: Tenant Validation Middleware (Extra Security)
export const validateTenantAccess = (req, res, next) => {
  // Super admin can access everything
  if (req.user.role === "SUPER_ADMIN") {
    return next();
  }

  // Check if route has hotelId param
  const requestedHotelId = req.params.hotelId || req.body.hotelId;

  if (requestedHotelId && requestedHotelId.toString() !== req.user.hotelId.toString()) {
    return res.status(403).json({
      success: false,
      message: "Access denied: invalid tenant access",
    });
  }

  next();
};
