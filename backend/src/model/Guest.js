import mongoose from 'mongoose';

const guestSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  nationality: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  
  // ID Documents
  idDocuments: [{
    documentType: {
      type: String,
      enum: ['passport', 'national_id', 'driving_license', 'aadhaar', 'other'],
      required: true
    },
    documentNumber: {
      type: String,
      required: true
    },
    documentImage: {
      type: String, // URL to uploaded document
      required: true
    },
    issuedDate: Date,
    expiryDate: Date,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Hotel specific data
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  
  // Visit History
  visitHistory: [{
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    checkInDate: Date,
    checkOutDate: Date,
    roomNumber: String,
    totalAmount: Number,
    status: {
      type: String,
      enum: ['completed', 'cancelled', 'no_show'],
      default: 'completed'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Blacklist Management
  isBlacklisted: {
    type: Boolean,
    default: false
  },
  blacklistReason: {
    type: String,
    trim: true
  },
  blacklistedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  blacklistedAt: Date,
  
  // Additional Information
  preferences: {
    roomType: String,
    floorPreference: String,
    smokingPreference: {
      type: String,
      enum: ['smoking', 'non-smoking', 'any']
    },
    specialRequests: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better performance
guestSchema.index({ hotelId: 1, email: 1 });
guestSchema.index({ hotelId: 1, phone: 1 });
guestSchema.index({ isBlacklisted: 1 });
guestSchema.index({ 'visitHistory.checkInDate': -1 });

// Virtual for total visits
guestSchema.virtual('totalVisits').get(function() {
  return this.visitHistory.length;
});

// Virtual for last visit
guestSchema.virtual('lastVisit').get(function() {
  if (this.visitHistory.length === 0) return null;
  return this.visitHistory.sort((a, b) => new Date(b.checkInDate) - new Date(a.checkInDate))[0];
});

// Method to add visit to history
guestSchema.methods.addVisit = function(bookingData) {
  this.visitHistory.push({
    bookingId: bookingData.bookingId,
    branchId: bookingData.branchId,
    checkInDate: bookingData.checkInDate,
    checkOutDate: bookingData.checkOutDate,
    roomNumber: bookingData.roomNumber,
    totalAmount: bookingData.totalAmount,
    status: bookingData.status || 'completed'
  });
  return this.save();
};

// Method to blacklist guest
guestSchema.methods.blacklist = function(reason, blacklistedBy) {
  this.isBlacklisted = true;
  this.blacklistReason = reason;
  this.blacklistedBy = blacklistedBy;
  this.blacklistedAt = new Date();
  return this.save();
};

// Method to remove from blacklist
guestSchema.methods.removeFromBlacklist = function() {
  this.isBlacklisted = false;
  this.blacklistReason = undefined;
  this.blacklistedBy = undefined;
  this.blacklistedAt = undefined;
  return this.save();
};


const Guest = mongoose.model('Guest', guestSchema);

export default Guest;
