import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { fetchBudget, saveBudget, clearBudgetFeedback } from '../slices/budgetSlice';
import { fetchDashboard } from '../slices/insightsSlice';

import PageHeader from '../components/PageHeader';
import ProgressBar from '../components/ProgressBar';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';
import { formatCurrency, expenseCategories } from '../utils/format';

export default function Budget() {
  const dispatch = useDispatch();
  const { budget, loading, saving, error, message } = useSelector((state) => state.budget);
  const summary = useSelector((state) => state.insights.summary);

  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [rows, setRows] = useState([]);

  useEffect(() => {
    dispatch(fetchBudget());
    dispatch(fetchDashboard());
  }, [dispatch]);

  // Hydrate the form once the saved budget arrives.
  useEffect(() => {
    setMonthlyBudget(budget?.monthlyBudget ? String(budget.monthlyBudget) : '');
    setRows(
      (budget?.categoryBudgets || []).map((entry) => ({
        category: entry.category,
        limit: String(entry.limit)
      }))
    );
  }, [budget]);

  // Live spend for the current month, keyed by category. The monthly budget
  // is a monthly limit, so it is measured against this month only - not
  // against all-time totals.
  const spentByCategory = useMemo(() => {
    const map = new Map();
    (summary?.currentMonth?.categoryBreakdown || []).forEach((entry) => {
      map.set(entry.category, entry.amount);
    });
    return map;
  }, [summary]);

  const spentThisMonth = summary?.currentMonth?.expense || 0;
  const limit = Number(budget?.monthlyBudget) || 0;
  const remaining = limit - spentThisMonth;
  const usedPercent = limit > 0 ? (spentThisMonth / limit) * 100 : 0;

  const addRow = () => setRows((prev) => [...prev, { category: '', limit: '' }]);

  const updateRow = (index, field, value) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));

  const removeRow = (index) => setRows((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (event) => {
    event.preventDefault();
    dispatch(clearBudgetFeedback());

    await dispatch(
      saveBudget({
        monthlyBudget: Number(monthlyBudget) || 0,
        categoryBudgets: rows
          .filter((row) => row.category.trim())
          .map((row) => ({ category: row.category.trim(), limit: Number(row.limit) || 0 }))
      })
    );

    // Refresh the live figures so the progress bars reflect the new limits.
    dispatch(fetchDashboard());
  };

  if (loading && !budget) return <Spinner label="Loading your budget" />;

  return (
    <>
      <PageHeader
        title="Budget"
        subtitle="Set a monthly ceiling and per-category limits, then watch them fill up in real time."
      />

      {error && <Alert tone="error" className="mb-4" onDismiss={() => dispatch(clearBudgetFeedback())}>{error}</Alert>}
      {message && <Alert tone="success" className="mb-4" onDismiss={() => dispatch(clearBudgetFeedback())}>{message}</Alert>}

      {limit > 0 && remaining < 0 && (
        <Alert tone="error" className="mb-4" title="You are over budget">
          You have spent {formatCurrency(spentThisMonth)} this month against a {formatCurrency(limit)} budget —
          that is {formatCurrency(Math.abs(remaining))} over.
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---- Editor ---------------------------------------------------- */}
        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-ink">Monthly budget</h2>
            <p className="mb-3 text-xs text-ink-muted">Your total spending ceiling for a month.</p>

            <label className="label" htmlFor="monthlyBudget">Amount (₹)</label>
            <input
              id="monthlyBudget"
              type="number"
              min="0"
              step="1"
              value={monthlyBudget}
              onChange={(event) => setMonthlyBudget(event.target.value)}
              className="input"
              placeholder="e.g. 40000"
            />
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-ink">Category limits</h2>
                <p className="text-xs text-ink-muted">Optional per-category ceilings.</p>
              </div>
              <button type="button" onClick={addRow} className="btn-ghost">
                Add category
              </button>
            </div>

            {rows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-hairline px-4 py-6 text-center text-xs text-ink-muted">
                No category limits yet. Add one to get a progress bar for it.
              </p>
            ) : (
              <div className="space-y-2">
                {rows.map((row, index) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={index} className="flex gap-2">
                    <input
                      list="budget-category-options"
                      value={row.category}
                      onChange={(event) => updateRow(index, 'category', event.target.value)}
                      className="input flex-1"
                      placeholder="Category"
                      aria-label={`Category ${index + 1}`}
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={row.limit}
                      onChange={(event) => updateRow(index, 'limit', event.target.value)}
                      className="input w-32"
                      placeholder="Limit"
                      aria-label={`Limit for category ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      aria-label={`Remove category ${index + 1}`}
                      className="btn-ghost px-3"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <datalist id="budget-category-options">
              {expenseCategories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving…' : 'Save budget'}
          </button>
        </form>

        {/* ---- Live progress --------------------------------------------- */}
        <div className="card space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-ink">This month</h2>
            <p className="text-xs text-ink-muted">Spending against your limits, updated live.</p>
          </div>

          {limit === 0 ? (
            <p className="rounded-lg border border-dashed border-hairline px-4 py-8 text-center text-sm text-ink-muted">
              Set a monthly budget to switch on progress tracking and overspend alerts.
            </p>
          ) : (
            <div>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-ink">Overall</span>
                <span className="tabular text-sm text-ink-secondary">
                  {formatCurrency(spentThisMonth)} / {formatCurrency(limit)}
                </span>
              </div>

              <ProgressBar percent={usedPercent} over={remaining < 0} />

              <p className={`mt-1.5 text-xs ${remaining < 0 ? 'font-medium text-critical' : 'text-ink-muted'}`}>
                {remaining < 0
                  ? `Over by ${formatCurrency(Math.abs(remaining))} (${Math.round(usedPercent)}% used)`
                  : `${formatCurrency(remaining)} left · ${Math.round(usedPercent)}% used`}
              </p>
            </div>
          )}

          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink">By category</h3>

            {(budget?.categoryBudgets || []).length === 0 ? (
              <p className="rounded-lg border border-dashed border-hairline px-4 py-6 text-center text-xs text-ink-muted">
                Add category limits on the left to track them individually.
              </p>
            ) : (
              <ul className="space-y-4">
                {budget.categoryBudgets.map((entry) => {
                  const spent = spentByCategory.get(entry.category) || 0;
                  const categoryLimit = Number(entry.limit) || 0;
                  const percent = categoryLimit > 0 ? (spent / categoryLimit) * 100 : 0;
                  const over = categoryLimit > 0 && spent > categoryLimit;

                  return (
                    <li key={entry.category}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <span className="truncate text-sm text-ink">{entry.category}</span>
                        <span className="tabular flex-none text-xs text-ink-secondary">
                          {formatCurrency(spent)} / {formatCurrency(categoryLimit)}
                        </span>
                      </div>

                      <ProgressBar percent={percent} over={over} />

                      <p className={`mt-1 text-xs ${over ? 'font-medium text-critical' : 'text-ink-muted'}`}>
                        {over
                          ? `Over by ${formatCurrency(spent - categoryLimit)}`
                          : `${formatCurrency(categoryLimit - spent)} left · ${Math.round(percent)}% used`}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
