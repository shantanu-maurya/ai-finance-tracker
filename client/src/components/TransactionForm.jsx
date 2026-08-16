import { useEffect, useState } from 'react';
import {
  paymentMethods,
  expenseCategories,
  incomeCategories,
  toDateInputValue
} from '../utils/format';

const blankForm = () => ({
  type: 'expense',
  title: '',
  amount: '',
  category: '',
  paymentMethod: 'cash',
  description: '',
  transactionDate: toDateInputValue()
});

/**
 * One form for both create and edit. When `editing` is set the fields are
 * hydrated from that transaction and the submit button switches to "Update".
 */
export default function TransactionForm({ onSubmit, editing, onCancelEdit, saving }) {
  const [form, setForm] = useState(blankForm);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editing) {
      setForm({
        type: editing.type,
        title: editing.title,
        amount: String(editing.amount),
        category: editing.category,
        paymentMethod: editing.paymentMethod || 'cash',
        description: editing.description || '',
        transactionDate: toDateInputValue(editing.transactionDate)
      });
    } else {
      setForm(blankForm());
    }
    setError(null);
  }, [editing]);

  const categories = form.type === 'income' ? incomeCategories : expenseCategories;

  const handleChange = (event) => {
    const { name, value } = event.target;
    // Switching type invalidates the chosen category, so clear it.
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'type' ? { category: '' } : {})
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) return setError('Please give the transaction a title.');
    if (!form.category.trim()) return setError('Please choose a category.');
    if (!form.amount || Number(form.amount) <= 0) {
      return setError('Amount must be greater than zero.');
    }

    setError(null);
    await onSubmit({ ...form, amount: Number(form.amount) });

    if (!editing) setForm(blankForm());
    return undefined;
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">
          {editing ? 'Edit transaction' : 'Add transaction'}
        </h2>
        {editing && (
          <button type="button" onClick={onCancelEdit} className="text-xs text-primary-600 hover:underline">
            Cancel edit
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-critical/5 px-3 py-2 text-xs text-critical">
          {error}
        </p>
      )}

      {/* Income / expense toggle */}
      <div className="grid grid-cols-2 gap-2">
        {['expense', 'income'].map((value) => (
          <label
            key={value}
            className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium capitalize transition-colors ${
              form.type === value
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-hairline text-ink-secondary hover:bg-plane'
            }`}
          >
            <input
              type="radio"
              name="type"
              value={value}
              checked={form.type === value}
              onChange={handleChange}
              className="sr-only"
            />
            {value}
          </label>
        ))}
      </div>

      <div>
        <label className="label" htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          value={form.title}
          onChange={handleChange}
          className="input"
          placeholder="e.g. Monthly groceries"
          maxLength={120}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="amount">Amount (₹)</label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={handleChange}
            className="input"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="label" htmlFor="transactionDate">Date</label>
          <input
            id="transactionDate"
            name="transactionDate"
            type="date"
            value={form.transactionDate}
            onChange={handleChange}
            className="input"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">Category</label>
          {/* A datalist keeps the presets one click away without locking the
              user into them - the backend accepts any string. */}
          <input
            id="category"
            name="category"
            list="category-options"
            value={form.category}
            onChange={handleChange}
            className="input"
            placeholder="Choose or type your own"
            maxLength={60}
          />
          <datalist id="category-options">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="label" htmlFor="paymentMethod">Payment method</label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            value={form.paymentMethod}
            onChange={handleChange}
            className="input"
          >
            {paymentMethods.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="description">Description (optional)</label>
        <textarea
          id="description"
          name="description"
          value={form.description}
          onChange={handleChange}
          className="input min-h-[72px] resize-y"
          placeholder="Anything worth remembering about this entry"
          maxLength={500}
        />
      </div>

      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? 'Saving…' : editing ? 'Update transaction' : 'Add transaction'}
      </button>
    </form>
  );
}
