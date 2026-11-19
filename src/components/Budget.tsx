import { useState } from 'react'
import { budgetLines } from '../budget.ts'
import { formatMoney } from '../money.ts'
import { uid } from '../storage.ts'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory, type Trip } from '../types.ts'
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

function SpendingRing({ slices, total, money }: { slices: Slice[]; total: number; money: (n: number) => string }) {
  const r = 60
  const circumference = 2 * Math.PI * r
  const arcs = slices.map((s, i) => ({
    ...s,
    length: (s.sum / total) * circumference,
    start: slices.slice(0, i).reduce((acc, x) => acc + (x.sum / total) * circumference, 0),
  }))

  return (
    <div className="panel">
      <h3 className="panel-title">Where your money goes</h3>
      <div className="ring-wrap">
        <svg viewBox="0 0 160 160" className="ring" role="img" aria-label="Spending breakdown ring chart">
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
  const [splitMode, setSplitMode] = useState(false)

  const money = (n: number) => formatMoney(n, trip.currency)

  const lines = budgetLines(trip)

  const total = lines.reduce((s, e) => s + e.amount, 0)
  const remaining = trip.budget - total
  const pct = trip.budget > 0 ? Math.min(100, (total / trip.budget) * 100) : 0
  const byCategory = EXPENSE_CATEGORIES.map((c) => ({
    c,
    sum: lines.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0),
  })).filter((x) => x.sum > 0)

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(amount)
    if (!description.trim() || !(value > 0)) return
    const expense: Expense = { id: uid(), description: description.trim(), category, amount: value }
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
    <div className="tabs seg" role="tablist" aria-label="Budget mode">
      <button role="tab" aria-selected={!splitMode} className={!splitMode ? 'active' : ''} onClick={() => setSplitMode(false)}>
        Budget
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
        <div className="row">
          <label>
            Total budget
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={trip.budget || ''}
              placeholder="0"
              onChange={(e) => onChange((t) => ({ ...t, budget: Number(e.target.value) || 0 }))}
            />
          </label>
          <label className="narrow">
            Currency
            <input
              value={trip.currency}
              maxLength={3}
              onChange={(e) => onChange((t) => ({ ...t, currency: e.target.value.toUpperCase() }))}
            />
          </label>
        </div>
        <div className="bar"><div className={remaining < 0 ? 'over' : ''} style={{ width: `${pct}%` }} /></div>
        <p>
          Spent <strong>{money(total)}</strong>
          {trip.budget > 0 && (
            <>
              {' · '}
              <span className={remaining < 0 ? 'neg' : 'pos'}>
                {remaining < 0 ? `${money(-remaining)} over` : `${money(remaining)} left`}
              </span>
            </>
          )}
        </p>
        {byCategory.length > 0 && (
          <ul className="chips">
            {byCategory.map(({ c, sum }) => (
              <li key={c}>{c}: {money(sum)}</li>
            ))}
          </ul>
        )}
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
          <label>
            Amount
            <input type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
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
            <span>{money(x.amount)}</span>
            {x.source ? (
              <span className="icon-spacer" />
            ) : (
              <button className="icon" aria-label={`Delete ${x.description}`} onClick={() => remove(x.id)}>✕</button>
            )}
          </li>
        ))}
      </ul>

      {total > 0 && <SpendingRing slices={byCategory} total={total} money={money} />}
    </div>
  )
}
