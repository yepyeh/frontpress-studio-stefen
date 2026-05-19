// Multi-value, fixed choices, rendered as a native multi-select.
export default function MultiSelectControl({ value, choices, onChange }) {
  const arr = Array.isArray(value) ? value : value ? [String(value)] : [];
  return (
    <select
      multiple
      value={arr}
      onChange={(e) => onChange(Array.from(e.target.selectedOptions, (o) => o.value))}
      className="h-auto min-h-[6rem] w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-[13px] focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
    >
      {choices.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  );
}
