// Mirrors dsystem alert tones — soft bg + border, neutral typography.
const tones = {
  error:   'border-red-200 bg-red-50 text-red-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info:    'border-zinc-200 bg-zinc-50 text-zinc-700',
};

// Errors and warnings are announced assertively (role=alert); success/info
// are polite (role=status). Override via `role` if you need to silence an
// alert that's only ever visible because the user just acted on it.
const tonePoliteness = {
  error:   { role: 'alert',  'aria-live': 'assertive' },
  warning: { role: 'alert',  'aria-live': 'assertive' },
  success: { role: 'status', 'aria-live': 'polite' },
  info:    { role: 'status', 'aria-live': 'polite' },
};

export default function Alert({ tone = 'info', children, className = '', role, ...rest }) {
  const a11y = tonePoliteness[tone] || tonePoliteness.info;
  return (
    <div
      role={role || a11y.role}
      aria-live={a11y['aria-live']}
      className={`rounded-md border px-3 py-2.5 text-[13px] ${tones[tone] || tones.info} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
