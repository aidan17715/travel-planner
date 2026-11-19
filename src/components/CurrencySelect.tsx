import { CURRENCIES } from '../currencies.ts'

interface Props {
  value: string
  onChange: (code: string) => void
  label?: string
  className?: string
}

export function CurrencySelect({ value, onChange, label = 'Currency', className }: Props) {
  const known = CURRENCIES.some(([code]) => code === value)
  return (
    <label className={className}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {!known && <option value={value}>{value}</option>}
        {CURRENCIES.map(([code, name]) => (
          <option key={code} value={code}>{code} · {name}</option>
        ))}
      </select>
    </label>
  )
}
