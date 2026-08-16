/**
 * Status messaging. Every tone pairs its color with an icon and text, so the
 * meaning never rides on color alone.
 */
const tones = {
  error: { wrap: 'border-critical/25 bg-critical/5 text-critical', icon: '!' },
  success: { wrap: 'border-good/25 bg-good/5 text-good', icon: '✓' },
  warning: { wrap: 'border-warning/40 bg-warning/10 text-[#8a5d00]', icon: '▲' },
  info: { wrap: 'border-primary-200 bg-primary-50 text-primary-700', icon: 'i' }
};

export default function Alert({ tone = 'info', title, children, onDismiss, className = '' }) {
  const style = tones[tone] || tones.info;

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${style.wrap} ${className}`}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border border-current text-xs font-bold"
      >
        {style.icon}
      </span>

      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex-none rounded px-1 text-lg leading-none opacity-60 hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}
