import { CURRENCIES } from '../currencies.ts'
import { getRecentCurrencies, rememberCurrency } from '../recentCurrencies.ts'

interface Props {
  value: string
  onChange: (code: string) => void
  label?: string
  className?: string
}

const nameOf = (code: string) => CURRENCIES.find(([c]) => c === code)?.[1]
const optionLabel = (code: string) => (nameOf(code) ? `${code} · ${nameOf(code)}` : code)

export function CurrencySelect({ value, onChange, label = 'Currency', className }: Props) {
  const recent = getRecentCurrencies()
  const known = CURRENCIES.some(([code]) => code === value)

  const handle = (code: string) => {
    rememberCurrency(code)
    onChange(code)
  }

  return (
    <label className={className}>
      {label}
      <select value={value} onChange={(e) => handle(e.target.value)}>
        {!known && !recent.includes(value) && <option value={value}>{value}</option>}
        {recent.length > 0 && (
          <optgroup label="Recently used">
            {recent.map((code) => (
              <option key={`recent-${code}`} value={code}>{optionLabel(code)}</option>
            ))}
          </optgroup>
        )}
        <optgroup label={recent.length > 0 ? 'All currencies' : 'Currencies'}>
          {CURRENCIES.map(([code]) => (
            <option key={code} value={code}>{optionLabel(code)}</option>
          ))}
        </optgroup>
      </select>
    </label>
  )
}
