import express from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';
import {
  getInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getPayments,
  createPayment,
  updatePayment,
  getBillingReports,
  getBranchRevenue,
  calculateTaxes
} from '../controller/billingController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Invoice routes
router.get('/invoices', getInvoices);
router.post('/invoices', createInvoice);
router.put('/invoices/:id', updateInvoice);
router.delete('/invoices/:id', deleteInvoice);

// Payment routes
router.get('/payments', getPayments);
router.post('/payments', createPayment);
router.put('/payments/:id', updatePayment);

// Reports and analytics
router.get('/reports', getBillingReports);
router.get('/revenue/branch/:branchId', getBranchRevenue);
router.get('/taxes', calculateTaxes);

export default router;
