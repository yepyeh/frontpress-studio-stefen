import { Checkbox } from '../ui/index.js';

// Multi-value, fixed choices, rendered as a vertical stack of checkboxes.
// The accessible group label comes from the surrounding `TaxonomyField`
// `FieldShell`, which wraps the control in role="group" + aria-labelledby.
export default function MultiCheckboxControl({ value, choices, onChange }) {
  const arr = Array.isArray(value) ? value : value ? [String(value)] : [];
  return (
    <div className="flex flex-col gap-2">
      {choices.map((c) => (
        <Checkbox
          key={c}
          label={c}
          checked={arr.includes(c)}
          onChange={(e) => {
            const next = e.target.checked ? [...arr, c] : arr.filter((x) => x !== c);
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}
