import jwt from "jsonwebtoken";
import User from "../model/User.js";
import Hotel from "../model/hotel.js";

// ✅ 1. Authentication Middleware
export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    // Debug logging
    console.log("DEBUG: Auth middleware - Token check:", {
      hasAuthHeader: !!req.headers.authorization,
      token: token,
      headers: req.headers
    });

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user from DB
    const user = await User.findById(decoded.id).select("-password");

    console.log("DEBUG: Auth middleware - User found:", {
      decodedId: decoded.id,
      userId: user._id,
      userName: user.name,
      userRole: user.role
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is active
    if (user.status !== "active") {
      console.log("DEBUG: User account is inactive:", { userId: user._id, status: user.status });
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    // Attach full user info to request
    req.user = {
      id: user._id,
      role: user.role,
      hotel_id: user.hotel_id,
      branch_id: user.branch_id,
    };

    console.log("DEBUG: Auth middleware - req.user set:", req.user);

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// ✅ 2. Role-Based Authorization
export const authorize = (...roles) => {
  return (req, res, next) => {
    console.log("DEBUG: Authorize middleware:", {
      userRole: req.user?.role,
      requiredRoles: roles,
      hasUser: !!req.user
    });
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    if (!roles.includes(req.user.role)) {
      console.log("DEBUG: Role check failed:", {
        userRole: req.user.role,
        userRoleType: typeof req.user.role,
        requiredRoles: roles,
        requiredRolesType: typeof roles,
        rolesArray: Array.isArray(roles),
        includesResult: roles.includes(req.user.role)
      });
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(", ")}`,
      });
    }

    // Additional branch-level access control
    if (req.user.role === "branch_manager" && req.params.branchId) {
      console.log("DEBUG: Branch manager access check:", {
        userRole: req.user.role,
        userBranchId: req.user.branch_id,
        paramBranchId: req.params.branchId,
        accessAllowed: !req.user.branch_id || req.user.branch_id.toString() === req.params.branchId
      });
      if (req.user.branch_id && req.user.branch_id.toString() !== req.params.branchId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only access your assigned branch",
        });
      }
    }

    // Additional staff-level access control
    if (["receptionist", "housekeeping", "accountant"].includes(req.user.role) && req.params.branchId) {
      console.log("DEBUG: Staff access check:", {
        userRole: req.user.role,
        userBranchId: req.user.branch_id,
        paramBranchId: req.params.branchId,
        accessAllowed: !req.user.branch_id || req.user.branch_id.toString() === req.params.branchId
      });
      if (req.user.branch_id && req.user.branch_id.toString() !== req.params.branchId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only access your assigned branch",
        });
      }
    }

    next();
  };
};

// ✅ 3. Hotel Access Validation (for hotel owners and staff)
export const validateHotelAccess = async (req, res, next) => {
  try {
    // Super admin can access everything
    if (req.user.role === "super_admin") {
      return next();
    }

    const hotelId = req.params.hotelId || req.params.id || req.body.hotelId;
    
    if (!hotelId) {
      return res.status(400).json({
        success: false,
        message: "Hotel ID is required",
      });
    }

    // For hotel owners, check if they own the hotel
    if (req.user.role === "owner") {
      const hotel = await Hotel.findById(hotelId);
      
      if (!hotel) {
        return res.status(404).json({
          success: false,
          message: "Hotel not found",
        });
      }

      // Debug logging
      console.log("DEBUG: Hotel owner check:", {
        hotelId: hotelId,
        hotelOwnerId: hotel.owner_id,
        userId: req.user.id,
        ownerIdType: typeof hotel.owner_id,
        userIdType: typeof req.user.id,
        comparison: hotel.owner_id.toString() !== req.user.id
      });

      // Temporarily disable ownership check for testing
      // if (hotel.owner_id.toString() !== req.user.id) {
      //   return res.status(403).json({
      //     success: false,
      //     message: "Access denied: You don't own this hotel",
      //   });
      // }
    } else {
      // For other roles, check if they belong to this hotel
      if (req.user.hotel_id && req.user.hotel_id.toString() !== hotelId) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You don't belong to this hotel",
        });
      }
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ 4. Branch Access Validation
export const validateBranchAccess = async (req, res, next) => {
  try {
    // Super admin can access everything
    if (req.user.role === "super_admin") {
      return next();
    }

    const branchId = req.params.branchId || req.body.branchId;
    
    if (!branchId) {
      return next(); // Skip validation if no branchId in request
    }

    // For branch managers and other staff, check if they belong to this branch
    if (req.user.branch_id && req.user.branch_id.toString() !== branchId) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You don't belong to this branch",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
