import Guest from '../model/Guest.js';
import { tenantFilter } from '../utils/tenantFilter.js';

// Create a new guest
export const createGuest = async (req, res) => {
  try {
    console.log("DEBUG: Guest creation request body:", req.body);
    console.log("DEBUG: User object:", req.user);
    
    const guestData = {
      ...req.body,
      hotelId: req.user.hotelId || req.user.id,
      createdBy: req.user.id
    };

    console.log("DEBUG: Final guest data:", guestData);

    const guest = await Guest.create(guestData);
    console.log("DEBUG: Guest created successfully:", guest);

    res.status(201).json({
      success: true,
      data: guest
    });
  } catch (error) {
    console.error("Guest creation error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all guests for the hotel
export const getGuests = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isBlacklisted } = req.query;
    const filter = tenantFilter(req);
    
    // Add search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add blacklist filter
    if (isBlacklisted !== undefined) {
      filter.isBlacklisted = isBlacklisted === 'true';
    }
    
    const skip = (page - 1) * limit;
    
    const guests = await Guest.find(filter)
      .populate('hotelId', 'name')
      .populate('createdBy', 'name email')
      .populate('blacklistedBy', 'name email')
      .populate('visitHistory.bookingId', 'guestName checkIn checkOut totalAmount')
      .populate('visitHistory.branchId', 'name city')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Guest.countDocuments(filter);
    
    res.json({
      success: true,
      data: guests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get guests error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get guest by ID
export const getGuestById = async (req, res) => {
  try {
    const filter = tenantFilter(req);
    filter._id = req.params.id;
    
    const guest = await Guest.findOne(filter)
      .populate('hotelId', 'name')
      .populate('createdBy', 'name email')
      .populate('blacklistedBy', 'name email')
      .populate('visitHistory.bookingId', 'guestName checkIn checkOut totalAmount status')
      .populate('visitHistory.branchId', 'name city address');
    
    if (!guest) {
      return res.status(404).json({
        success: false,
        message: "Guest not found"
      });
    }
    
    res.json({
      success: true,
      data: guest
    });
  } catch (error) {
    console.error("Get guest by ID error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update guest information
export const updateGuest = async (req, res) => {
  try {
    const filter = tenantFilter(req);
    filter._id = req.params.id;
    
    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };
    
    const guest = await Guest.findOneAndUpdate(filter, updateData, { new: true, runValidators: true })
      .populate('hotelId', 'name')
      .populate('updatedBy', 'name email');
    
    if (!guest) {
      return res.status(404).json({
        success: false,
        message: "Guest not found"
      });
    }
    
    console.log("DEBUG: Guest updated successfully:", guest);
    
    res.json({
      success: true,
      data: guest
    });
  } catch (error) {
    console.error("Update guest error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete guest
export const deleteGuest = async (req, res) => {
  try {
    const filter = tenantFilter(req);
    filter._id = req.params.id;
    
    const guest = await Guest.findOneAndDelete(filter);
    
    if (!guest) {
      return res.status(404).json({
        success: false,
        message: "Guest not found"
      });
    }
    
    console.log("DEBUG: Guest deleted successfully:", guest);
    
    res.json({
      success: true,
      message: "Guest deleted successfully"
    });
  } catch (error) {
    console.error("Delete guest error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add visit to guest history
export const addVisit = async (req, res) => {
  try {
    const filter = tenantFilter(req);
    filter._id = req.params.id;
    
    const guest = await Guest.findOne(filter);
    
    if (!guest) {
      return res.status(404).json({
        success: false,
        message: "Guest not found"
      });
    }
    
    const visitData = {
      bookingId: req.body.bookingId,
      branchId: req.body.branchId,
      checkInDate: req.body.checkInDate,
      checkOutDate: req.body.checkOutDate,
      roomNumber: req.body.roomNumber,
      totalAmount: req.body.totalAmount,
      status: req.body.status || 'completed'
    };
    
    await guest.addVisit(visitData);
    
    res.json({
      success: true,
      message: "Visit added to guest history",
      data: guest
    });
  } catch (error) {
    console.error("Add visit error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Blacklist a guest
export const blacklistGuest = async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Blacklist reason is required"
      });
    }
    
    const filter = tenantFilter(req);
    filter._id = req.params.id;
    
    const guest = await Guest.findOne(filter);
    
    if (!guest) {
      return res.status(404).json({
        success: false,
        message: "Guest not found"
      });
    }
    
    await guest.blacklist(reason, req.user.id);
    
    console.log("DEBUG: Guest blacklisted:", guest);
    
    res.json({
      success: true,
      message: "Guest blacklisted successfully",
      data: guest
    });
  } catch (error) {
    console.error("Blacklist guest error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Remove guest from blacklist
export const removeFromBlacklist = async (req, res) => {
  try {
    const filter = tenantFilter(req);
    filter._id = req.params.id;
    
    const guest = await Guest.findOne(filter);
    
    if (!guest) {
      return res.status(404).json({
        success: false,
        message: "Guest not found"
      });
    }
    
    await guest.removeFromBlacklist();
    
    console.log("DEBUG: Guest removed from blacklist:", guest);
    
    res.json({
      success: true,
      message: "Guest removed from blacklist successfully",
      data: guest
    });
  } catch (error) {
    console.error("Remove from blacklist error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Upload ID document
export const uploadIdDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }
    
    const { documentType, documentNumber, issuedDate, expiryDate } = req.body;
    
    if (!documentType || !documentNumber) {
      return res.status(400).json({
        success: false,
        message: "Document type and number are required"
      });
    }
    
    const filter = tenantFilter(req);
    filter._id = req.params.id;
    
    const guest = await Guest.findOne(filter);
    
    if (!guest) {
      return res.status(404).json({
        success: false,
        message: "Guest not found"
      });
    }
    
    const documentUrl = `/uploads/${req.file.filename}`;
    
    guest.idDocuments.push({
      documentType,
      documentNumber,
      documentImage: documentUrl,
      issuedDate: issuedDate ? new Date(issuedDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined
    });
    
    await guest.save();
    
    res.json({
      success: true,
      message: "ID document uploaded successfully",
      data: guest
    });
  } catch (error) {
    console.error("Upload ID document error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get guest statistics
export const getGuestStatistics = async (req, res) => {
  try {
    const filter = tenantFilter(req);
    
    const totalGuests = await Guest.countDocuments(filter);
    const blacklistedGuests = await Guest.countDocuments({ ...filter, isBlacklisted: true });
    const activeGuests = await Guest.countDocuments({ 
      ...filter, 
      'visitHistory.checkInDate': { 
        $gte: new Date(new Date().setHours(0, 0, 0, 0)) 
      } 
    });
    
    // Get guests with most visits
    const topGuests = await Guest.find(filter)
      .sort({ 'visitHistory.0.checkInDate': -1 })
      .limit(10)
      .select('name email totalVisits lastVisit');
    
    res.json({
      success: true,
      data: {
        totalGuests,
        blacklistedGuests,
        activeGuests,
        topGuests
      }
    });
  } catch (error) {
    console.error("Get guest statistics error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
