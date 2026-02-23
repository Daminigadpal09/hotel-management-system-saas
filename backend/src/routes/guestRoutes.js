import express from 'express';
import multer from 'multer';
import path from 'path';
import { 
  createGuest, 
  getGuests, 
  getGuestById, 
  updateGuest, 
  deleteGuest, 
  addVisit, 
  blacklistGuest, 
  removeFromBlacklist, 
  uploadIdDocument,
  getGuestStatistics 
} from '../controller/guestController.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'id-doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (jpeg, jpg, png) and PDF files are allowed'));
    }
  }
});

// Apply authentication to all routes
router.use(protect);

// Guest CRUD routes
router.post('/', createGuest);
router.get('/', getGuests);
router.get('/statistics', getGuestStatistics);
router.get('/:id', getGuestById);
router.put('/:id', updateGuest);
router.delete('/:id', deleteGuest);

// Visit history routes
router.post('/:id/visits', addVisit);

// Blacklist management routes
router.post('/:id/blacklist', blacklistGuest);
router.delete('/:id/blacklist', removeFromBlacklist);

// Document upload routes
router.post('/:id/documents', upload.single('document'), uploadIdDocument);

export default router;
