import { Input, Select } from '../ui/index.js';

// One value, optionally constrained to a fixed list of choices.
export default function SingleValueControl({ value, choices = [], onChange }) {
  const scalar = Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
  if (choices.length) {
    return (
      <Select value={scalar} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {choices.map((c) => <option key={c} value={c}>{c}</option>)}
      </Select>
    );
  }
  return <Input value={scalar} onChange={(e) => onChange(e.target.value)} />;
}
