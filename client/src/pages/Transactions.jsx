import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  fetchTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  setFilters,
  resetFilters,
  clearTransactionError
} from '../slices/transactionsSlice';

import PageHeader from '../components/PageHeader';
import TransactionForm from '../components/TransactionForm';
import TransactionTable from '../components/TransactionTable';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';
import EmptyState from '../components/EmptyState';
import { sortOptions, expenseCategories, incomeCategories } from '../utils/format';

const allCategories = Array.from(new Set([...expenseCategories, ...incomeCategories])).sort();

export default function Transactions() {
  const dispatch = useDispatch();
  const { items, pagination, filters, loading, saving, error } = useSelector(
    (state) => state.transactions
  );

  const [editing, setEditing] = useState(null);
  const [searchInput, setSearchInput] = useState(filters.search);

  // Debounced search: typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) dispatch(setFilters({ search: searchInput }));
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Any filter change refetches.
  useEffect(() => {
    dispatch(fetchTransactions());
  }, [dispatch, filters]);

  const handleSubmit = async (form) => {
    const action = editing
      ? updateTransaction({ id: editing._id, updates: form })
      : createTransaction(form);

    const result = await dispatch(action);
    if (result.meta.requestStatus === 'fulfilled') setEditing(null);
  };

  const handleEdit = (transaction) => {
    setEditing(transaction);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changePage = (page) => {
    if (page >= 1 && page <= pagination.pages) dispatch(setFilters({ page }));
  };

  const hasActiveFilters = filters.type || filters.category || filters.search || filters.sort !== 'latest';

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle={`${pagination.total} entr${pagination.total === 1 ? 'y' : 'ies'} matching your filters`}
      >
        {hasActiveFilters && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setSearchInput('');
              dispatch(resetFilters());
            }}
          >
            Clear filters
          </button>
        )}
      </PageHeader>

      {error && (
        <Alert tone="error" className="mb-4" onDismiss={() => dispatch(clearTransactionError())}>
          {error}
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TransactionForm
            onSubmit={handleSubmit}
            editing={editing}
            onCancelEdit={() => setEditing(null)}
            saving={saving}
          />
        </div>

        <div className="card lg:col-span-2">
          {/* Filters in one row above the table. */}
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="sm:col-span-2 xl:col-span-1">
              <label className="label" htmlFor="search">Search</label>
              <input
                id="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="input"
                placeholder="Title, category, notes"
              />
            </div>

            <div>
              <label className="label" htmlFor="filter-type">Type</label>
              <select
                id="filter-type"
                value={filters.type}
                onChange={(event) => dispatch(setFilters({ type: event.target.value }))}
                className="input"
              >
                <option value="">All</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="filter-category">Category</label>
              <select
                id="filter-category"
                value={filters.category}
                onChange={(event) => dispatch(setFilters({ category: event.target.value }))}
                className="input"
              >
                <option value="">All</option>
                {allCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="filter-sort">Sort</label>
              <select
                id="filter-sort"
                value={filters.sort}
                onChange={(event) => dispatch(setFilters({ sort: event.target.value }))}
                className="input"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading && items.length === 0 ? (
            <Spinner label="Loading transactions" />
          ) : items.length === 0 ? (
            <EmptyState
              title={hasActiveFilters ? 'No transactions match those filters' : 'No transactions yet'}
              description={
                hasActiveFilters
                  ? 'Try widening the search or clearing a filter.'
                  : 'Use the form to record your first income or expense.'
              }
            />
          ) : (
            <>
              <TransactionTable
                transactions={items}
                onEdit={handleEdit}
                onDelete={(id) => dispatch(deleteTransaction(id))}
                busy={saving}
              />

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3">
                <p className="text-xs text-ink-muted">
                  Page {pagination.page} of {pagination.pages} · {pagination.total} total
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={pagination.page <= 1}
                    onClick={() => changePage(pagination.page - 1)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => changePage(pagination.page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
