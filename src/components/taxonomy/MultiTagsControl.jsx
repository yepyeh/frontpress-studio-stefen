import { useId } from 'react';
import { Input } from '../ui/index.js';

// Multi-value, free-form tags. The user types comma-separated values; we
// store an array. The visible string is rebuilt by joining with ", ".
// A visible hint sits below the input and is wired up via aria-describedby
// so screen readers announce the comma convention alongside the field name.
export default function MultiTagsControl({ value, onChange }) {
  const arr = Array.isArray(value) ? value : value ? [String(value)] : [];
  const hintId = useId();
  return (
    <div className="space-y-1">
      <Input
        value={arr.join(', ')}
        onChange={(e) => onChange(
          e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
        )}
        aria-describedby={hintId}
      />
      <p id={hintId} className="text-xs text-zinc-500">Separate values with commas.</p>
    </div>
  );
}
