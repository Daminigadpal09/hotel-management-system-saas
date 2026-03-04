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
  calculateTaxes,
  getBillingByBranch,
  createSimpleBilling
} from '../controller/billingController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Invoice routes
router.get('/invoices', authorize("super_admin", "owner", "branch_manager", "receptionist", "accountant"), getInvoices);
router.post('/invoices', authorize("super_admin", "owner", "branch_manager", "receptionist", "accountant"), createInvoice);
router.post('/invoices/simple', authorize("super_admin", "owner", "branch_manager", "receptionist", "accountant"), createSimpleBilling);
router.put('/invoices/:id', authorize("super_admin", "owner", "branch_manager", "receptionist", "accountant"), updateInvoice);
router.delete('/invoices/:id', authorize("super_admin", "owner", "branch_manager"), deleteInvoice);

// Payment routes
router.get('/payments', authorize("super_admin", "owner", "branch_manager", "receptionist", "accountant"), getPayments);
router.post('/payments', authorize("super_admin", "owner", "branch_manager", "receptionist", "accountant"), createPayment);
router.put('/payments/:id', authorize("super_admin", "owner", "branch_manager", "receptionist", "accountant"), updatePayment);

// Reports and analytics
router.get('/reports', authorize("super_admin", "owner", "branch_manager", "accountant"), getBillingReports);
router.get('/revenue/branch/:branchId', authorize("super_admin", "owner", "branch_manager", "accountant"), getBranchRevenue);
router.get('/taxes', authorize("super_admin", "owner", "branch_manager", "accountant"), calculateTaxes);

// Branch-specific billing
router.get('/branch/:branchId', authorize("super_admin", "owner", "branch_manager", "receptionist", "accountant"), getBillingByBranch);

export default router;
