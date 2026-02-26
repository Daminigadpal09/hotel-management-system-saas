import Hotel from "../model/hotel.js";
import User from "../model/User.js";
import BranchModel from "../model/BranchModel.js";

// 📊 Get Platform Analytics
export const getPlatformAnalytics = async (req, res) => {
  try {
    const totalHotels = await Hotel.countDocuments();
    const activeHotels = await Hotel.countDocuments({ status: "active" });
    const pendingHotels = await Hotel.countDocuments({ status: "pending" });
    const suspendedHotels = await Hotel.countDocuments({ status: "suspended" });
    
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });
    const inactiveUsers = await User.countDocuments({ status: "inactive" });
    
    // Get users by role
    const usersByRole = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);
    
    const totalBranches = await Branch.countDocuments();
    
    // Revenue calculation (includes all active subscriptions)
    const freeHotels = await Hotel.countDocuments({ subscription_plan: "free", subscription_status: "active" });
    const basicHotels = await Hotel.countDocuments({ subscription_plan: "basic", subscription_status: "active" });
    const premiumHotels = await Hotel.countDocuments({ subscription_plan: "premium", subscription_status: "active" });
    const enterpriseHotels = await Hotel.countDocuments({ subscription_plan: "enterprise", subscription_status: "active" });
    
    const monthlyRevenue = (freeHotels * 0) + (basicHotels * 29) + (premiumHotels * 99) + (enterpriseHotels * 299);

    // Get all hotels for detailed list
    const allHotels = await Hotel.find()
      .populate("owner_id", "name email phone")
      .sort({ createdAt: -1 });

    // Get all users for detailed list
    const allUsers = await User.find()
      .populate("hotel_id", "name")
      .populate("branch_id", "name")
      .select("-password")
      .sort({ createdAt: -1 });

    // Get all branches
    const allBranches = await BranchModel.find()
      .populate("hotel_id", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        hotels: {
          total: totalHotels,
          active: activeHotels,
          pending: pendingHotels,
          suspended: suspendedHotels,
          list: allHotels
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          byRole: usersByRole,
          list: allUsers
        },
        branches: {
          total: totalBranches,
          list: allBranches
        },
        revenue: {
          monthly: monthlyRevenue,
          subscriptions: {
            free: freeHotels,
            basic: basicHotels,
            premium: premiumHotels,
            enterprise: enterpriseHotels
          }
        }
      }
    });
  } catch (error) {
    console.error("Error in getPlatformAnalytics:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 🏨 Get All Hotels (Super Admin)
export const getAllHotels = async (req, res) => {
  try {
    const hotels = await Hotel.find()
      .populate("owner_id", "name email phone")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: hotels
    });
  } catch (error) {
    console.error("Error in getAllHotels:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ✅ Approve Hotel
export const approveHotel = async (req, res) => {
  try {
    const { hotelId } = req.params;
    
    const hotel = await Hotel.findByIdAndUpdate(
      hotelId,
      {
        status: "active",
        approved_by: req.user.id,
        approved_at: new Date()
      },
      { new: true }
    ).populate("owner_id", "name email");

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found"
      });
    }

    res.json({
      success: true,
      message: "Hotel approved successfully",
      data: hotel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 🚫 Suspend Hotel
export const suspendHotel = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { reason } = req.body;
    
    const hotel = await Hotel.findByIdAndUpdate(
      hotelId,
      {
        status: "suspended",
        suspension_reason: reason || "Violation of terms"
      },
      { new: true }
    ).populate("owner_id", "name email");

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found"
      });
    }

    res.json({
      success: true,
      message: "Hotel suspended successfully",
      data: hotel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// � Get All Users (Super Admin)
export const getAllUsers = async (req, res) => {
  try {
    const allUsers = await User.find()
      .populate("hotel_id", "name")
      .populate("branch_id", "name")
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: allUsers
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// �📋 Get Hotel Users
export const getHotelUsers = async (req, res) => {
  try {
    const { hotelId } = req.params;
    
    const users = await User.find({ hotel_id: hotelId })
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 💰 Update Subscription Plan
export const updateSubscription = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { plan, maxBranches, maxUsers, expiryDays } = req.body;
    
    const updateData = {
      subscription_plan: plan,
      ...(maxBranches && { max_branches: maxBranches }),
      ...(maxUsers && { max_users: maxUsers }),
      ...(expiryDays && { 
        subscription_expiry: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) 
      }),
      subscription_status: "active"
    };

    const hotel = await Hotel.findByIdAndUpdate(
      hotelId,
      updateData,
      { new: true }
    );

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found"
      });
    }

    res.json({
      success: true,
      message: "Subscription updated successfully",
      data: hotel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
