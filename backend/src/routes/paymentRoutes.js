import express from 'express';
import { protect, authorize } from '../middleware/auth.middleware.js';
import {
  getPayments,
  getPaymentById,
  getPaymentsByBranch,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentsByDateRange,
  getPaymentMethods,
  getPaymentStats
} from '../controller/paymentController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Basic payment routes
router.get('/', authorize("super_admin", "owner", "branch_manager", "receptionist", "accountant"), getPayments);
router.get('/:paymentId', authorize("super_admin", "owner", "branch_manager", "receptionist", "accountant"), getPaymentById);
router.post('/', authorize("super_admin", "owner", "branch_manager", "receptionist", "accountant"), createPayment);
router.put('/:paymentId', authorize("super_admin", "owner", "branch_manager", "receptionist", "accountant"), updatePayment);
router.delete('/:paymentId', authorize("super_admin", "owner", "branch_manager"), deletePayment);

// Branch-specific payment routes
router.get('/branch/:branchId', authorize("super_admin", "owner", "branch_manager", "receptionist", "accountant"), getPaymentsByBranch);

// Payment analytics and reporting
router.get('/date-range', authorize("super_admin", "owner", "branch_manager", "accountant"), getPaymentsByDateRange);
router.get('/methods', authorize("super_admin", "owner", "branch_manager", "receptionist", "accountant"), getPaymentMethods);
router.get('/stats', authorize("super_admin", "owner", "branch_manager", "accountant"), getPaymentStats);

export default router;
