import { useState } from 'react'
import { uid } from '../storage.ts'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory, type Trip } from '../types.ts'

interface Props {
  trip: Trip
  onChange: (patch: (t: Trip) => Trip) => void
}

export function Budget({ trip, onChange }: Props) {
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('Food')
  const [amount, setAmount] = useState('')

  // Falls back to a plain format if the currency code isn't a valid ISO code
  const money = (n: number) => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: trip.currency }).format(n)
    } catch {
      return `${trip.currency} ${n.toFixed(2)}`
    }
  }

  const total = trip.expenses.reduce((s, e) => s + e.amount, 0)
  const remaining = trip.budget - total
  const pct = trip.budget > 0 ? Math.min(100, (total / trip.budget) * 100) : 0
  const byCategory = EXPENSE_CATEGORIES.map((c) => ({
    c,
    sum: trip.expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0),
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

  const remove = (id: string) => onChange((t) => ({ ...t, expenses: t.expenses.filter((x) => x.id !== id) }))

  return (
    <div>
      <div className="panel summary">
        <label>
          Total budget ({trip.currency})
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={trip.budget || ''}
            placeholder="0"
            onChange={(e) => onChange((t) => ({ ...t, budget: Number(e.target.value) || 0 }))}
          />
        </label>
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
        {trip.expenses.map((x) => (
          <li key={x.id}>
            <div>
              <strong>{x.description}</strong>
              <small>{x.category}</small>
            </div>
            <span>{money(x.amount)}</span>
            <button className="icon" aria-label={`Delete ${x.description}`} onClick={() => remove(x.id)}>✕</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
