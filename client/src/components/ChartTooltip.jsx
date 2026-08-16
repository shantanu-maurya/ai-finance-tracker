import { formatCurrency } from '../utils/format';

/**
 * Shared Recharts tooltip.
 *
 * Series identity comes from a colored swatch beside the name; the text
 * itself stays in the standard ink tokens rather than wearing the series
 * color, which would be unreadable for the lighter slots.
 */
export default function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter }) {
  if (!active || !payload?.length) return null;

  const format = valueFormatter || formatCurrency;
  const heading = labelFormatter ? labelFormatter(label) : label;

  return (
    <div className="rounded-lg border border-hairline bg-surface px-3 py-2 shadow-card">
      {heading && <p className="mb-1.5 text-xs font-semibold text-ink">{heading}</p>}

      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={entry.dataKey || entry.name} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden="true"
              className="h-2 w-2 flex-none rounded-full"
              style={{ backgroundColor: entry.color || entry.payload?.fill }}
            />
            <span className="text-ink-secondary">{entry.name}</span>
            <span className="tabular ml-auto pl-3 font-semibold text-ink">
              {format(entry.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
