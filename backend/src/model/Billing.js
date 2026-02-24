import mongoose from 'mongoose';

// Invoice Schema
const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: false
  },
  guestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guest',
    required: true
  },
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  
  // Billing details
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    total: Number,
    taxRate: Number,
    taxAmount: Number
  }],
  
  // Amounts
  subtotal: {
    type: Number,
    required: true
  },
  taxAmount: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  
  // Payment tracking
  payments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  }],
  
  // Dates
  issueDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: Date,
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: String,
  
  // Tax calculation
  taxCalculations: {
    cgst: Number,
    sgst: Number,
    igst: Number,
    totalTax: Number
  }
}, {
  timestamps: true
});

// Payment Schema
const paymentSchema = new mongoose.Schema({
  paymentNumber: {
    type: String,
    required: true,
    unique: true
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  
  // Payment details
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'online'],
    required: true
  },
  paymentType: {
    type: String,
    enum: ['full', 'partial'],
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  
  // Transaction details
  transactionId: String,
  referenceNumber: String,
  
  // Dates
  paymentDate: {
    type: Date,
    default: Date.now
  },
  
  // Metadata
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String
}, {
  timestamps: true
});

// Branch Revenue Schema
const branchRevenueSchema = new mongoose.Schema({
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  
  // Revenue tracking
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  
  // Financial metrics
  totalRevenue: {
    type: Number,
    default: 0
  },
  roomRevenue: {
    type: Number,
    default: 0
  },
  serviceRevenue: {
    type: Number,
    default: 0
  },
  taxRevenue: {
    type: Number,
    default: 0
  },
  
  // Booking metrics
  totalBookings: {
    type: Number,
    default: 0
  },
  paidBookings: {
    type: Number,
    default: 0
  },
  cancelledBookings: {
    type: Number,
    default: 0
  },
  
  // Payment metrics
  cashPayments: {
    type: Number,
    default: 0
  },
  cardPayments: {
    type: Number,
    default: 0
  },
  onlinePayments: {
    type: Number,
    default: 0
  },
  
  // Metadata
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
invoiceSchema.index({ hotelId: 1, branchId: 1, status: 1 });
paymentSchema.index({ hotelId: 1, branchId: 1, status: 1 });
paymentSchema.index({ invoiceId: 1 });
branchRevenueSchema.index({ branchId: 1, period: 1, startDate: -1 });

export const Invoice = mongoose.model('Invoice', invoiceSchema);
export const Payment = mongoose.model('Payment', paymentSchema);
export const HotelBranchRevenue = mongoose.model('HotelBranchRevenue', branchRevenueSchema);
