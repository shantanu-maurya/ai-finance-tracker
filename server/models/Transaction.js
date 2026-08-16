import mongoose from 'mongoose';

// Mirrors the paymentMethods array in client/src/utils/format.js.
// Adding a method requires updating BOTH files.
export const PAYMENT_METHODS = [
  'cash',
  'card',
  'upi',
  'net_banking',
  'wallet',
  'other'
];

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // financeAnalyzer.js depends on these exact spellings.
    type: {
      type: String,
      enum: {
        values: ['income', 'expense'],
        message: 'Type must be either income or expense'
      },
      required: [true, 'Please specify income or expense']
    },
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    amount: {
      type: Number,
      required: [true, 'Please provide an amount'],
      min: [0.01, 'Amount must be greater than zero']
    },
    category: {
      type: String,
      required: [true, 'Please provide a category'],
      trim: true,
      maxlength: [60, 'Category cannot exceed 60 characters']
    },
    paymentMethod: {
      type: String,
      enum: {
        values: PAYMENT_METHODS,
        message: 'Unsupported payment method'
      },
      default: 'cash'
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: ''
    },
    transactionDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Every index is prefixed with userId because every query in the app is
// scoped to the logged-in user.
transactionSchema.index({ userId: 1, transactionDate: -1 });
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ userId: 1, category: 1 });

export default mongoose.model('Transaction', transactionSchema);
