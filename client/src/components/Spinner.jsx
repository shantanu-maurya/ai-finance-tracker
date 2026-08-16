export default function Spinner({ label = 'Loading', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-3 py-8 text-sm text-ink-secondary ${className}`}>
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-hairline border-t-primary-500"
        aria-hidden="true"
      />
      <span role="status">{label}…</span>
    </div>
  );
}
