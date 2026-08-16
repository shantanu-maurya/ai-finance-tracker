/**
 * Stat tile. The value is the hero - it gets proportional figures and the
 * most weight; the label and footnote stay in recessive text tokens.
 *
 * `accent` only ever paints the small marker dot, never the text, so the
 * number stays readable at any contrast.
 */
export default function SummaryCard({ label, value, footnote, accent, tone }) {
  const toneClass =
    tone === 'positive' ? 'text-good' : tone === 'negative' ? 'text-critical' : 'text-ink';

  return (
    <div className="card">
      <div className="flex items-center gap-2">
        {accent && (
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 flex-none rounded-full"
            style={{ backgroundColor: accent }}
          />
        )}
        <p className="text-sm font-medium text-ink-secondary">{label}</p>
      </div>

      <p className={`mt-2 text-2xl font-semibold tracking-tight sm:text-3xl ${toneClass}`}>{value}</p>

      {footnote && <p className="mt-1 text-xs text-ink-muted">{footnote}</p>}
    </div>
  );
}
