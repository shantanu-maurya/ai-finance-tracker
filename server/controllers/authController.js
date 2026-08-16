import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import { summarizeTransactions } from '../services/financeAnalyzer.js';

/**
 * Signs only the user id. Email and name are deliberately left out - any
 * authenticated flow can read the latest values from the database, and a
 * token that carries stale profile data is a bug waiting to happen.
 */
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

/** Strips the password and Mongoose internals before anything reaches the client. */
const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

// POST /api/auth/signup
export const signup = async (req, res) => {
  try {
    const { name, password } = req.body;
    // Normalised before BOTH the duplicate check and the insert - otherwise
    // "User@x.com" and "user@x.com" could both slip past the unique index.
    const email = (req.body.email || '').trim().toLowerCase();

    if (!name?.trim() || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    const user = await User.create({ name: name.trim(), email, password });

    return res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: sanitizeUser(user)
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors)[0]?.message || 'Invalid signup details'
      });
    }
    console.error('signup error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not create account' });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password'
      });
    }

    // The schema hides `password` with select:false, so it must be opted
    // back in explicitly or matchPassword() would compare against undefined.
    const user = await User.findOne({ email }).select('+password');

    // Same message for "no such user" and "wrong password" - no account
    // enumeration.
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    return res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: sanitizeUser(user)
    });
  } catch (err) {
    console.error('login error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not sign in' });
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, user: sanitizeUser(user) });
  } catch (err) {
    console.error('getMe error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not load profile' });
  }
};

// PUT /api/auth/profile
export const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const email = req.body.email ? req.body.email.trim().toLowerCase() : undefined;

    if (!name?.trim() && !email) {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }

    if (email) {
      // Excluding the current user prevents a false "email taken" error when
      // someone saves the form without changing their address.
      const conflict = await User.findOne({ email, _id: { $ne: req.userId } });
      if (conflict) {
        return res.status(409).json({
          success: false,
          message: 'That email is already in use by another account'
        });
      }
    }

    const updates = {};
    if (name?.trim()) updates.name = name.trim();
    if (email) updates.email = email;

    const user = await User.findByIdAndUpdate(req.userId, updates, {
      new: true,
      runValidators: true
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated',
      user: sanitizeUser(user)
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors)[0]?.message || 'Invalid profile details'
      });
    }
    console.error('updateProfile error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not update profile' });
  }
};

// PUT /api/auth/password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your current and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    const user = await User.findById(req.userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    // Assign + save so the schema's pre('save') hook hashes the new value.
    // A findByIdAndUpdate here would store the password in plain text.
    user.password = newPassword;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password updated' });
  } catch (err) {
    console.error('changePassword error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not update password' });
  }
};

// GET /api/auth/stats
export const getAccountStats = async (req, res) => {
  try {
    const [user, transactions, budget] = await Promise.all([
      User.findById(req.userId),
      Transaction.find({ userId: req.userId }).sort({ transactionDate: -1 }),
      Budget.findOne({ userId: req.userId })
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Same analyzer as the Dashboard, so the numbers on Profile can never drift.
    const summary = summarizeTransactions(transactions, budget);

    return res.status(200).json({
      success: true,
      stats: {
        memberSince: user.createdAt,
        transactionCount: summary.transactionCount,
        incomeCount: summary.incomeCount,
        expenseCount: summary.expenseCount,
        totalIncome: summary.totalIncome,
        totalExpense: summary.totalExpense,
        savings: summary.savings,
        savingsRate: summary.savingsRate,
        averageExpense: summary.averageExpense,
        topCategory: summary.topCategory,
        monthlyBudget: summary.monthlyBudget,
        categoriesUsed: summary.categoryBreakdown.length
      }
    });
  } catch (err) {
    console.error('getAccountStats error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not load account statistics' });
  }
};
