import { formatCurrency, formatDate, paymentMethodLabel } from '../utils/format';

const typeChip = (type) =>
  type === 'income'
    ? 'chip bg-good/10 text-good'
    : 'chip bg-secondary-50 text-secondary-600';

/**
 * `readOnly` drops the actions column. Reports renders a historical snapshot,
 * where Edit/Delete buttons would either do nothing or silently change data
 * the user is only trying to review.
 */
export default function TransactionTable({ transactions, onEdit, onDelete, busy, readOnly = false }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse text-sm ${readOnly ? 'min-w-[640px]' : 'min-w-[720px]'}`}>
        <thead>
          <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-ink-muted">
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Title</th>
            <th className="px-3 py-2 font-medium">Category</th>
            <th className="px-3 py-2 font-medium">Method</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 text-right font-medium">Amount</th>
            {!readOnly && <th className="px-3 py-2 text-right font-medium">Actions</th>}
          </tr>
        </thead>

        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction._id} className="border-b border-hairline/60 last:border-0 hover:bg-plane">
              <td className="tabular whitespace-nowrap px-3 py-3 text-ink-secondary">
                {formatDate(transaction.transactionDate)}
              </td>

              <td className="px-3 py-3">
                <p className="font-medium text-ink">{transaction.title}</p>
                {transaction.description && (
                  <p className="mt-0.5 max-w-xs truncate text-xs text-ink-muted">
                    {transaction.description}
                  </p>
                )}
              </td>

              <td className="px-3 py-3 text-ink-secondary">{transaction.category}</td>
              <td className="px-3 py-3 text-ink-secondary">
                {paymentMethodLabel(transaction.paymentMethod)}
              </td>

              <td className="px-3 py-3">
                <span className={typeChip(transaction.type)}>{transaction.type}</span>
              </td>

              <td
                className={`tabular whitespace-nowrap px-3 py-3 text-right font-semibold ${
                  transaction.type === 'income' ? 'text-good' : 'text-ink'
                }`}
              >
                {transaction.type === 'income' ? '+' : '−'}
                {formatCurrency(transaction.amount)}
              </td>

              {!readOnly && (
              <td className="whitespace-nowrap px-3 py-3 text-right">
                <div className="inline-flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(transaction)}
                    className="rounded px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Delete "${transaction.title}"? This cannot be undone.`)) {
                        onDelete(transaction._id);
                      }
                    }}
                    className="rounded px-2 py-1 text-xs font-medium text-critical hover:bg-critical/5 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
