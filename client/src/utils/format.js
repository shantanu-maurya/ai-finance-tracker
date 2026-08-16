/**
 * Shared formatting helpers and the option lists used across forms.
 *
 * `paymentMethods` mirrors the PAYMENT_METHODS enum in
 * server/models/Transaction.js. Adding a method requires updating BOTH files
 * or the backend will reject the value with a validation error.
 */

export const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'net_banking', label: 'Net Banking' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'other', label: 'Other' }
];

export const paymentMethodLabel = (value) =>
  paymentMethods.find((method) => method.value === value)?.label || 'Other';

/** Starter categories. The backend accepts any string, so users can type their own. */
export const expenseCategories = [
  'Food & Dining',
  'Groceries',
  'Rent',
  'Utilities',
  'Transport',
  'Shopping',
  'Entertainment',
  'Health',
  'Education',
  'Travel',
  'Subscriptions',
  'Other'
];

export const incomeCategories = [
  'Salary',
  'Freelance',
  'Business',
  'Investments',
  'Interest',
  'Refund',
  'Gift',
  'Other'
];

export const sortOptions = [
  { value: 'latest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'amount_desc', label: 'Amount: high to low' },
  { value: 'amount_asc', label: 'Amount: low to high' }
];

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

export const formatCurrency = (value) => inrFormatter.format(Number(value) || 0);

/** Compact form for axis ticks, where full amounts would collide. */
export const formatCompactCurrency = (value) => {
  const amount = Number(value) || 0;
  const abs = Math.abs(amount);

  if (abs >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
};

export const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

/** `2026-08` -> `Aug 2026`, for chart axes and report headings. */
export const formatMonthKey = (key) => {
  if (!key) return '';
  const [year, month] = key.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

/** `<input type="date">` needs `YYYY-MM-DD` in local time, not an ISO UTC string. */
export const toDateInputValue = (value) => {
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

export const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const formatPercent = (value) => `${Math.round(Number(value) || 0)}%`;
