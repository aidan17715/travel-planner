import { useState } from 'react'
import { budgetLines, currenciesIn, sumLines } from '../budget.ts'
import { formatMoney } from '../money.ts'
import { uid } from '../storage.ts'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory, type Trip } from '../types.ts'
import { CurrencySelect } from './CurrencySelect.tsx'
import { Split } from './Split.tsx'

interface Props {
  trip: Trip
  onChange: (patch: (t: Trip) => Trip) => void
}

const COLORS: Record<ExpenseCategory, string> = {
  Flights: '#0ea5e9',
  Stay: '#8b5cf6',
  Food: '#f59e0b',
  Transport: '#10b981',
  Activities: '#ef4444',
  Shopping: '#ec4899',
  Other: '#64748b',
}

interface Slice {
  c: ExpenseCategory
  sum: number
}

interface RingProps {
  slices: Slice[]
  total: number
  currency: string
  showCurrency: boolean
}

function SpendingRing({ slices, total, currency, showCurrency }: RingProps) {
  const money = (n: number) => formatMoney(n, currency)
  const r = 60
  const circumference = 2 * Math.PI * r
  const arcs = slices.map((s, i) => ({
    ...s,
    length: (s.sum / total) * circumference,
    start: slices.slice(0, i).reduce((acc, x) => acc + (x.sum / total) * circumference, 0),
  }))

  return (
    <div className="panel">
      <h3 className="panel-title">Where your money goes{showCurrency ? ` · ${currency}` : ''}</h3>
      <div className="ring-wrap">
        <svg viewBox="0 0 160 160" className="ring" role="img" aria-label={`Spending breakdown ring chart in ${currency}`}>
          <circle cx="80" cy="80" r={r} fill="none" stroke="var(--border)" strokeWidth="22" />
          {arcs.map((a) => (
            <circle
              key={a.c}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={COLORS[a.c]}
              strokeWidth="22"
              strokeDasharray={`${a.length} ${circumference - a.length}`}
              strokeDashoffset={-a.start}
              transform="rotate(-90 80 80)"
            />
          ))}
          <text x="80" y="78" textAnchor="middle" className="ring-total">{money(total)}</text>
          <text x="80" y="95" textAnchor="middle" className="ring-label">spent</text>
        </svg>
        <ul className="legend">
          {slices.map((s) => (
            <li key={s.c}>
              <span className="dot" style={{ background: COLORS[s.c] }} />
              <span className="legend-name">{s.c}</span>
              <span className="legend-amount">{money(s.sum)}</span>
              <small>{Math.round((s.sum / total) * 100)}%</small>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function Budget({ trip, onChange }: Props) {
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('Food')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<string | null>(null)
  const [splitMode, setSplitMode] = useState(false)

  const lines = budgetLines(trip)
  const currencies = currenciesIn(trip, lines.map((l) => l.currency))
  const multi = currencies.length > 1

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(amount)
    if (!description.trim() || !(value > 0)) return
    const expense: Expense = { id: uid(), description: description.trim(), category, amount: value, currency: currency ?? trip.currency }
    onChange((t) => ({ ...t, expenses: [...t.expenses, expense] }))
    setDescription('')
    setAmount('')
  }

  const remove = (id: string) =>
    onChange((t) => {
      const { [id]: _split, ...splits } = t.splits
      return { ...t, expenses: t.expenses.filter((x) => x.id !== id), splits }
    })

  const modeToggle = (
    <div className="tabs seg" role="tablist" aria-label="View mode">
      <button role="tab" aria-selected={!splitMode} className={!splitMode ? 'active' : ''} onClick={() => setSplitMode(false)}>
        Summary
      </button>
      <button role="tab" aria-selected={splitMode} className={splitMode ? 'active' : ''} onClick={() => setSplitMode(true)}>
        Split mode
      </button>
    </div>
  )

  if (splitMode) {
    return (
      <div>
        {modeToggle}
        <Split trip={trip} lines={lines} onChange={onChange} />
      </div>
    )
  }

  return (
    <div>
      {modeToggle}
      <div className="panel summary">
        <h3 className="panel-title">Total spent</h3>
        {currencies.length === 0 ? (
          <p className="total-line">{formatMoney(0, trip.currency)}</p>
        ) : (
          currencies.map((c) => (
            <p className="total-line" key={c}>
              {formatMoney(sumLines(lines.filter((l) => l.currency === c)), c)}
            </p>
          ))
        )}
        {currencies.map((c) => {
          const chips = EXPENSE_CATEGORIES.map((cat) => ({
            cat,
            sum: sumLines(lines.filter((l) => l.currency === c && l.category === cat)),
          })).filter((x) => x.sum > 0)
          return (
            <ul className="chips" key={c}>
              {chips.map(({ cat, sum }) => (
                <li key={cat}>{cat}: {formatMoney(sum, c)}</li>
              ))}
            </ul>
          )
        })}
        <CurrencySelect
          label="Default currency for new costs"
          value={trip.currency}
          onChange={(code) => onChange((t) => ({ ...t, currency: code }))}
        />
      </div>

      <form className="panel" onSubmit={add}>
        <label>
          Expense
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ramen dinner" required />
        </label>
        <div className="row">
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="row">
          <label>
            Amount
            <input type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
          <CurrencySelect value={currency ?? trip.currency} onChange={setCurrency} />
        </div>
        <button type="submit" className="primary">Add expense</button>
      </form>

      <ul className="list">
        {lines.map((x) => (
          <li key={x.id}>
            <div>
              <strong>{x.description}</strong>
              <small>{x.source ? `${x.category} · from ${x.source}` : x.category}</small>
            </div>
            <span>{formatMoney(x.amount, x.currency)}</span>
            {x.source ? (
              <span className="icon-spacer" />
            ) : (
              <button className="icon" aria-label={`Delete ${x.description}`} onClick={() => remove(x.id)}>✕</button>
            )}
          </li>
        ))}
      </ul>

      {currencies.map((c) => {
        const inCurrency = lines.filter((l) => l.currency === c)
        const slices = EXPENSE_CATEGORIES.map((cat) => ({ c: cat, sum: sumLines(inCurrency.filter((l) => l.category === cat)) })).filter((s) => s.sum > 0)
        return <SpendingRing key={c} slices={slices} total={sumLines(inCurrency)} currency={c} showCurrency={multi} />
      })}
    </div>
  )
}
