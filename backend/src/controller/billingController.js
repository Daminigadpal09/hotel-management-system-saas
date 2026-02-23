import mongoose from 'mongoose';
import { Invoice, Payment, BranchRevenue } from '../model/Billing.js';
import { tenantFilter, branchTenantFilter } from '../utils/tenantFilter.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Generate invoice number
const generateInvoiceNumber = async (hotelId, branchId) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  
  const count = await Invoice.countDocuments({
    hotelId,
    branchId,
    createdAt: {
      $gte: new Date(today.getFullYear(), today.getMonth(), 1)
    }
  });
  
  return `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
};

// Create invoice
export const createInvoice = async (req, res) => {
  try {
    console.log('DEBUG: Invoice request body:', req.body);
    const { bookingId, items, dueDate, notes } = req.body;
    const { ObjectId } = mongoose.Types;
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = subtotal + taxAmount;
    
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(req.user.hotelId, req.body.branchId);
    
    // Helper function to safely convert to ObjectId
    const toObjectId = (id) => {
      if (!id) return undefined;
      try {
        return new ObjectId(id);
      } catch (error) {
        console.warn(`Invalid ObjectId: ${id}`);
        return undefined;
      }
    };

    const invoice = await Invoice.create({
      invoiceNumber,
      bookingId: toObjectId(bookingId),
      guestId: toObjectId(req.body.guestId),
      hotelId: req.user.hotelId,
      branchId: toObjectId(req.body.branchId),
      items,
      subtotal,
      taxAmount,
      totalAmount,
      dueDate: new Date(dueDate),
      notes,
      createdBy: req.user.id,
      taxCalculations: req.body.taxCalculations
    });

    res.status(201).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error("Create invoice error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all invoices
export const getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, branchId, search } = req.query;
    const filter = tenantFilter(req);
    
    // Add filters
    if (status) filter.status = status;
    if (branchId) filter.branchId = branchId;
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'guestId.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const invoices = await Invoice.find(filter)
      .populate('bookingId', 'guestName checkIn checkOut')
      .populate('guestId', 'name email phone')
      .populate('branchId', 'name city')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Invoice.countDocuments(filter);
    
    res.json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get invoices error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update invoice
export const updateInvoice = async (req, res) => {
  try {
    const filter = tenantFilter(req);
    filter._id = req.params.id;
    
    const invoice = await Invoice.findOneAndUpdate(filter, req.body, { new: true });
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }
    
    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error("Update invoice error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete invoice
export const deleteInvoice = async (req, res) => {
  try {
    const filter = tenantFilter(req);
    filter._id = req.params.id;
    
    const invoice = await Invoice.findOneAndDelete(filter);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }
    
    res.json({
      success: true,
      message: "Invoice deleted successfully"
    });
  } catch (error) {
    console.error("Delete invoice error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create payment
export const createPayment = async (req, res) => {
  try {
    const { invoiceId, amount, paymentMethod, paymentType, notes } = req.body;
    const { ObjectId } = mongoose.Types;
    
    // Generate payment number
    const paymentNumber = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Helper function to safely convert to ObjectId
    const toObjectId = (id) => {
      if (!id) return undefined;
      try {
        return new ObjectId(id);
      } catch (error) {
        console.warn(`Invalid ObjectId: ${id}`);
        return undefined;
      }
    };

    const payment = await Payment.create({
      paymentNumber,
      invoiceId: toObjectId(invoiceId),
      hotelId: req.user.hotelId,
      branchId: toObjectId(req.body.branchId),
      amount,
      paymentMethod,
      paymentType,
      notes,
      processedBy: req.user.id
    });
    
    // Update invoice payment status
    const invoice = await Invoice.findById(invoiceId);
    if (invoice) {
      invoice.payments.push(payment._id);
      
      const totalPaid = invoice.payments.reduce((sum, paymentId) => {
        // This is simplified - in real implementation, you'd fetch actual payment amounts
        return sum + amount;
      }, 0);
      
      if (totalPaid >= invoice.totalAmount) {
        invoice.status = 'paid';
        invoice.paidDate = new Date();
      } else if (totalPaid > 0) {
        invoice.status = 'partially_paid';
      }
      
      await invoice.save();
    }
    
    res.status(201).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error("Create payment error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get payments
export const getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, branchId, startDate, endDate } = req.query;
    const filter = tenantFilter(req);
    
    // Add filters
    if (status) filter.status = status;
    if (branchId) filter.branchId = branchId;
    if (startDate && endDate) {
      filter.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const skip = (page - 1) * limit;
    
    const payments = await Payment.find(filter)
      .populate('invoiceId', 'invoiceNumber totalAmount')
      .populate('branchId', 'name city')
      .populate('processedBy', 'name email')
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Payment.countDocuments(filter);
    
    res.json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get payments error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Generate PDF invoice
export const generateInvoicePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('bookingId guestId branchId createdBy');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }
    
    // Create PDF document
    const doc = new PDFDocument();
    doc.fontSize(20).text('Invoice', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12).text(`Invoice Number: ${invoice.invoiceNumber}`);
    doc.text(`Date: ${invoice.issueDate.toLocaleDateString()}`);
    doc.text(`Due Date: ${invoice.dueDate.toLocaleDateString()}`);
    doc.moveDown();
    
    // Add items table
    doc.fontSize(10).text('Items:', { underline: true });
    invoice.items.forEach((item, index) => {
      doc.text(`${index + 1}. ${item.description} - Qty: ${item.quantity} x $${item.unitPrice} = $${item.total}`);
    });
    
    doc.moveDown();
    doc.text(`Subtotal: $${invoice.subtotal}`);
    doc.text(`Tax: $${invoice.taxAmount}`);
    doc.fontSize(14).text(`Total: $${invoice.totalAmount}`, { bold: true });
    
    // Generate PDF
    const pdfPath = path.join('uploads', 'invoices', `invoice-${invoice._id}.pdf`);
    doc.pipe(fs.createWriteStream(pdfPath));
    doc.end();
    
    res.json({
      success: true,
      message: "PDF generated successfully",
      pdfPath: `/uploads/invoices/invoice-${invoice._id}.pdf`
    });
  } catch (error) {
    console.error("Generate PDF error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get billing reports
export const getBillingReports = async (req, res) => {
  try {
    const { type, period, startDate, endDate, branchId } = req.query;
    const filter = tenantFilter(req);
    
    if (branchId) filter.branchId = branchId;
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    let data;
    
    switch (type) {
      case 'revenue':
        data = await Invoice.aggregate([
          { $match: filter },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              totalRevenue: { $sum: "$totalAmount" },
              taxRevenue: { $sum: "$taxAmount" },
              invoiceCount: { $sum: 1 }
            }
          },
          { $sort: { "_id": 1 } }
        ]);
        break;
        
      case 'payments':
        data = await Payment.aggregate([
          { $match: filter },
          {
            $group: {
              _id: "$paymentMethod",
              totalAmount: { $sum: "$amount" },
              count: { $sum: 1 }
            }
          }
        ]);
        break;
        
      default:
        data = await Invoice.find(filter).sort({ createdAt: -1 });
    }
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Get billing reports error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get branch-wise revenue
export const getBranchRevenue = async (req, res) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;
    const filter = branchTenantFilter(req);
    filter.branchId = req.params.branchId;
    
    if (startDate && endDate) {
      filter.startDate = new Date(startDate);
      filter.endDate = new Date(endDate);
    } else {
      // Default to current period
      const now = new Date();
      let start, end;
      
      switch (period) {
        case 'daily':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          break;
        case 'weekly':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'monthly':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case 'yearly':
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear() + 1, 0, 1);
          break;
      }
      
      filter.startDate = start;
      filter.endDate = end;
      filter.period = period;
    }
    
    const revenue = await BranchRevenue.findOne(filter);
    
    res.json({
      success: true,
      data: revenue || {
        totalRevenue: 0,
        roomRevenue: 0,
        serviceRevenue: 0,
        taxRevenue: 0,
        totalBookings: 0,
        paidBookings: 0,
        cancelledBookings: 0
      }
    });
  } catch (error) {
    console.error("Get branch revenue error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update payment
export const updatePayment = async (req, res) => {
  try {
    const filter = tenantFilter(req);
    filter._id = req.params.id;
    
    const payment = await Payment.findOneAndUpdate(filter, req.body, { new: true });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }
    
    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error("Update payment error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Calculate taxes (branch-wise)
export const calculateTaxes = async (req, res) => {
  try {
    const { period = 'monthly', branchId } = req.query;
    const filter = tenantFilter(req);
    
    if (branchId) filter.branchId = branchId;
    
    // Get date range for the period
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'weekly':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
        break;
    }
    
    filter.createdAt = { $gte: startDate, $lt: endDate };
    
    const taxData = await Invoice.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$branchId",
          cgst: { $sum: "$taxCalculations.cgst" },
          sgst: { $sum: "$taxCalculations.sgst" },
          igst: { $sum: "$taxCalculations.igst" },
          totalTax: { $sum: "$taxAmount" },
          totalRevenue: { $sum: "$totalAmount" },
          invoiceCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "branches",
          localField: "_id",
          foreignField: "_id",
          as: "branch"
        }
      },
      {
        $unwind: "$branch"
      }
    ]);
    
    res.json({
      success: true,
      data: taxData
    });
  } catch (error) {
    console.error("Calculate taxes error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
