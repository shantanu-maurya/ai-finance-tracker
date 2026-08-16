import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getMonthlyReport } from '../controllers/reportController.js';

const router = express.Router();

// One endpoint, two representations - `?format=pdf` streams a PDFKit
// document, anything else returns JSON.
router.get('/monthly', protect, getMonthlyReport);

export default router;
