import { Link } from 'react-router-dom';

export default function EmptyState({ title, description, actionLabel, actionTo, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-hairline px-6 py-12 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-secondary">{description}</p>}

      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn-primary mt-3">
          {actionLabel}
        </Link>
      )}

      {actionLabel && onAction && !actionTo && (
        <button type="button" onClick={onAction} className="btn-primary mt-3">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
