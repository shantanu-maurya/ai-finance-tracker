import mongoose from 'mongoose';

const categoryBudgetSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true
    },
    limit: {
      type: Number,
      required: [true, 'Category limit is required'],
      min: [0, 'Limit cannot be negative'],
      default: 0
    }
  },
  { _id: false }
);

const budgetSchema = new mongoose.Schema(
  {
    // unique => exactly one budget document per user, which is what lets
    // setBudget use a single findOneAndUpdate with upsert instead of
    // separate create/update handlers.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    monthlyBudget: {
      type: Number,
      required: [true, 'Monthly budget is required'],
      min: [0, 'Monthly budget cannot be negative'],
      default: 0
    },
    categoryBudgets: {
      type: [categoryBudgetSchema],
      default: []
    }
  },
  { timestamps: true }
);

export default mongoose.model('Budget', budgetSchema);
