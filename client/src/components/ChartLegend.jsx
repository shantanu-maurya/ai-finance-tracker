/**
 * Legend for any chart with two or more series.
 *
 * Always rendered when there are ≥ 2 series, so identity is never carried by
 * color alone. The label text uses ink tokens; only the swatch wears the
 * series color.
 */
export default function ChartLegend({ items, className = '' }) {
  if (!items?.length) return null;

  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-xs text-ink-secondary">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 flex-none rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
          {item.value && <span className="tabular font-medium text-ink">{item.value}</span>}
        </li>
      ))}
    </ul>
  );
}
