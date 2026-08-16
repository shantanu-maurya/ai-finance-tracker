import { status } from '../utils/chartTheme';

/**
 * Budget progress. The fill is capped at 100% width so an overspent category
 * cannot overflow its track - the "over by" label carries the real number,
 * and the color plus that label together signal the state (never color alone).
 */
export default function ProgressBar({ percent, over = false }) {
  const clamped = Math.min(100, Math.max(0, Number(percent) || 0));

  const color = over
    ? status.critical
    : clamped >= 80
      ? status.warning
      : status.good;

  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-plane ring-1 ring-inset ring-hairline"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}
