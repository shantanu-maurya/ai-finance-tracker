import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { setBudget, getBudget, updateBudget } from '../controllers/budgetController.js';

const router = express.Router();

router.use(protect);

router.route('/').post(setBudget).get(getBudget).put(updateBudget);

export default router;
