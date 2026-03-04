import { Invoice } from '../model/Billing.js';
import Payment from '../model/Payment.js';

// Get all payments
export const getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, paymentMethod } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    const payments = await Payment.find(filter)
      .populate('billingId', 'guestName roomNumber')
      .populate('hotelId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(filter);

    res.status(200).json({
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get payment by ID
export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId)
      .populate('billingId', 'guestName roomNumber amount')
      .populate('hotelId', 'name')
      .populate('branchId', 'name')
      .populate('createdBy', 'name email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get payments by branch
export const getPaymentsByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { page = 1, limit = 10, status, paymentMethod } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { branchId };
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    const payments = await Payment.find(filter)
      .populate('billingId', 'guestName roomNumber')
      .populate('hotelId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(filter);

    res.status(200).json({
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create new payment
export const createPayment = async (req, res) => {
  try {
    const paymentData = {
      ...req.body,
      createdBy: req.user._id
    };

    const payment = new Payment(paymentData);
    await payment.save();

    // Update billing status if fully paid
    if (payment.billingId) {
      const invoice = await Invoice.findById(payment.billingId);
      if (invoice) {
        const totalPaid = await Payment.sum('amount', { billingId: invoice._id, status: 'completed' });
        if (totalPaid >= invoice.totalAmount) {
          invoice.status = 'paid';
          await invoice.save();
        } else if (totalPaid > 0) {
          invoice.status = 'partial';
          await invoice.save();
        }
      }
    }

    const populatedPayment = await Payment.findById(payment._id)
      .populate('billingId', 'guestName roomNumber')
      .populate('hotelId', 'name')
      .populate('branchId', 'name')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: populatedPayment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update payment
export const updatePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const updatedPayment = await Payment.findByIdAndUpdate(
      req.params.paymentId,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('billingId', 'guestName roomNumber')
      .populate('hotelId', 'name')
      .populate('branchId', 'name')
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      data: updatedPayment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete payment
export const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    await Payment.findByIdAndDelete(req.params.paymentId);

    res.status(200).json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get payments by date range
export const getPaymentsByDateRange = async (req, res) => {
  try {
    const { start, end, branchId, hotelId } = req.query;
    
    // Build date filter
    const dateFilter = {
      createdAt: {
        $gte: new Date(start),
        $lte: new Date(end)
      }
    };

    // Add branch/hotel filter if provided
    if (branchId) dateFilter.branchId = branchId;
    if (hotelId) dateFilter.hotelId = hotelId;

    const payments = await Payment.find(dateFilter)
      .populate('billingId', 'guestName roomNumber')
      .populate('hotelId', 'name')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get payment methods
export const getPaymentMethods = async (req, res) => {
  try {
    const methods = await Payment.distinct('paymentMethod');
    
    res.status(200).json({
      success: true,
      data: methods
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get payment statistics
export const getPaymentStats = async (req, res) => {
  try {
    const { branchId, hotelId, startDate, endDate } = req.query;
    
    // Build filter
    const filter = { status: 'completed' };
    if (branchId) filter.branchId = branchId;
    if (hotelId) filter.hotelId = hotelId;
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Total revenue
    const totalRevenue = await Payment.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Revenue by payment method
    const revenueByMethod = await Payment.aggregate([
      { $match: filter },
      { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    // Revenue by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const revenueByDate = await Payment.aggregate([
      { $match: { ...filter, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalRevenue[0]?.total || 0,
        revenueByMethod,
        revenueByDate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
