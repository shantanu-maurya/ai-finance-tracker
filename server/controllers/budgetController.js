import Budget from '../models/Budget.js';

/** Normalises the categoryBudgets array coming off an HTML form. */
const normaliseCategoryBudgets = (input) => {
  if (!Array.isArray(input)) return [];

  return input
    .filter((entry) => entry?.category?.toString().trim())
    .map((entry) => ({
      category: entry.category.toString().trim(),
      limit: Math.max(0, Number(entry.limit) || 0)
    }));
};

// POST /api/budget - create or update in a single call.
export const setBudget = async (req, res) => {
  try {
    const { monthlyBudget, categoryBudgets } = req.body;

    // '' is rejected alongside undefined/null because HTML number inputs
    // submit an empty string when cleared.
    if (
      monthlyBudget === undefined ||
      monthlyBudget === null ||
      monthlyBudget === '' ||
      Number.isNaN(Number(monthlyBudget)) ||
      Number(monthlyBudget) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid monthly budget'
      });
    }

    // upsert + setDefaultsOnInsert means the frontend needs only one save
    // flow - no separate "first time" vs "editing" branch.
    const budget = await Budget.findOneAndUpdate(
      { userId: req.userId },
      {
        userId: req.userId,
        monthlyBudget: Number(monthlyBudget),
        categoryBudgets: normaliseCategoryBudgets(categoryBudgets)
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true
      }
    );

    return res.status(200).json({ success: true, message: 'Budget saved', budget });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors)[0]?.message || 'Invalid budget'
      });
    }
    console.error('setBudget error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not save budget' });
  }
};

// GET /api/budget
export const getBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({ userId: req.userId });

    // A default shape rather than a 404 - the Budget page can render its form
    // immediately without a separate "no budget yet" UI state.
    return res.status(200).json({
      success: true,
      budget: budget || { monthlyBudget: 0, categoryBudgets: [] }
    });
  } catch (err) {
    console.error('getBudget error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not load budget' });
  }
};

// PUT /api/budget - strict update semantics: no upsert, 404 when absent.
export const updateBudget = async (req, res) => {
  try {
    const { monthlyBudget, categoryBudgets } = req.body;
    const updates = {};

    if (monthlyBudget !== undefined && monthlyBudget !== null && monthlyBudget !== '') {
      if (Number.isNaN(Number(monthlyBudget)) || Number(monthlyBudget) < 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid monthly budget'
        });
      }
      updates.monthlyBudget = Number(monthlyBudget);
    }

    if (categoryBudgets !== undefined) {
      updates.categoryBudgets = normaliseCategoryBudgets(categoryBudgets);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }

    const budget = await Budget.findOneAndUpdate({ userId: req.userId }, updates, {
      new: true,
      runValidators: true
    });

    // Creation is setBudget's job, so PUT on a missing document is a 404.
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'No budget found. Create one first.'
      });
    }

    return res.status(200).json({ success: true, message: 'Budget updated', budget });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors)[0]?.message || 'Invalid budget'
      });
    }
    console.error('updateBudget error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not update budget' });
  }
};
