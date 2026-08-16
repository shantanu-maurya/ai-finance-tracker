import Transaction from '../models/Transaction.js';

// Whitelisted sort modes. Anything unrecognised falls back to `latest`, so raw
// user input never reaches the MongoDB sort clause.
const sortMap = {
  latest: { transactionDate: -1 },
  oldest: { transactionDate: 1 },
  amount_desc: { amount: -1 },
  amount_asc: { amount: 1 }
};

// POST /api/transactions
export const createTransaction = async (req, res) => {
  try {
    const { type, title, amount, category, paymentMethod, description, transactionDate } = req.body;

    if (
      !type ||
      !title?.trim() ||
      amount === undefined ||
      Number(amount) <= 0 ||
      !category?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide type, title, amount greater than zero and category'
      });
    }

    const transaction = await Transaction.create({
      userId: req.userId,
      type,
      title: title.trim(),
      amount: Number(amount),
      category: category.trim(),
      paymentMethod: paymentMethod || 'cash',
      description: description?.trim() || '',
      transactionDate: transactionDate ? new Date(transactionDate) : new Date()
    });

    return res.status(201).json({ success: true, transaction });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors)[0]?.message || 'Invalid transaction'
      });
    }
    console.error('createTransaction error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not create transaction' });
  }
};

// GET /api/transactions?page=&limit=&category=&type=&search=&sort=&from=&to=
export const getTransactions = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    // Built key-by-key so an absent filter never becomes `{ category: undefined }`,
    // which would silently match nothing.
    const query = { userId: req.userId };

    if (req.query.type === 'income' || req.query.type === 'expense') {
      query.type = req.query.type;
    }

    if (req.query.category?.trim()) {
      query.category = req.query.category.trim();
    }

    if (req.query.from || req.query.to) {
      query.transactionDate = {};
      if (req.query.from) query.transactionDate.$gte = new Date(req.query.from);
      if (req.query.to) query.transactionDate.$lte = new Date(req.query.to);
    }

    if (req.query.search?.trim()) {
      // Escaped so characters like `(` or `*` are treated literally rather
      // than compiling into a different (or catastrophically slow) pattern.
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [{ title: regex }, { category: regex }, { description: regex }];
    }

    const sort = sortMap[req.query.sort] || sortMap.latest;

    const [transactions, total] = await Promise.all([
      Transaction.find(query).sort(sort).skip(skip).limit(limit),
      Transaction.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (err) {
    console.error('getTransactions error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not load transactions' });
  }
};

// PUT /api/transactions/:id
export const updateTransaction = async (req, res) => {
  try {
    const { type, title, amount, category, paymentMethod, description, transactionDate } = req.body;

    if (amount !== undefined && Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than zero'
      });
    }

    const updates = {};
    if (type) updates.type = type;
    if (title?.trim()) updates.title = title.trim();
    if (amount !== undefined) updates.amount = Number(amount);
    if (category?.trim()) updates.category = category.trim();
    if (paymentMethod) updates.paymentMethod = paymentMethod;
    if (description !== undefined) updates.description = description?.trim() || '';
    if (transactionDate) updates.transactionDate = new Date(transactionDate);

    // Ownership is enforced *inside the query*. Knowing another user's
    // document id is not enough to edit it.
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updates,
      { new: true, runValidators: true } // findOneAndUpdate skips validators unless asked
    );

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    return res.status(200).json({ success: true, transaction });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors)[0]?.message || 'Invalid transaction'
      });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid transaction id' });
    }
    console.error('updateTransaction error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not update transaction' });
  }
};

// DELETE /api/transactions/:id
export const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Transaction deleted',
      transactionId: transaction._id
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid transaction id' });
    }
    console.error('deleteTransaction error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not delete transaction' });
  }
};
