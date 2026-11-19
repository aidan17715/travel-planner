import { useState } from 'react'
import { currenciesIn, type Line } from '../budget.ts'
import { formatMoney } from '../money.ts'
import { computeBalances, fromCents, isLineSplit, memberInUse, memberName, pairwiseDebts, sharesFor, simplifyDebts, toCents } from '../splits.ts'
import { uid } from '../storage.ts'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory, type Member, type Split as SplitInfo, type Trip } from '../types.ts'
import { CurrencySelect } from './CurrencySelect.tsx'

type OnChange = (patch: (t: Trip) => Trip) => void

interface Props {
  trip: Trip
  lines: Line[]
  onChange: OnChange
}

export function Split({ trip, lines, onChange }: Props) {
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [quickPayer, setQuickPayer] = useState('')

  const { members } = trip
  const ids = new Set(members.map((m) => m.id))
  const name = (id: string) => memberName(members, id)
  const unsplit = lines.filter((l) => !isLineSplit(trip, l))
  const payer = ids.has(quickPayer) ? quickPayer : members[0]?.id

  const addMember = (e: React.FormEvent) => {
    e.preventDefault()
    const n = newName.trim()
    if (!n) return
    if (members.some((m) => m.name.toLowerCase() === n.toLowerCase())) {
      alert(`${n} is already in the group.`)
      return
    }
    onChange((t) => ({ ...t, members: [...t.members, { id: uid(), name: n }] }))
    setNewName('')
  }

  const removeMember = (m: Member) => {
    if (memberInUse(trip, m.id)) {
      alert(`${m.name} is part of some splits or payments. Remove or change those first.`)
      return
    }
    onChange((t) => ({ ...t, members: t.members.filter((x) => x.id !== m.id) }))
  }

  const saveSplit = (lineId: string, split: SplitInfo | null) => {
    onChange((t) => {
      const { [lineId]: _old, ...rest } = t.splits
      return { ...t, splits: split ? { ...rest, [lineId]: split } : rest }
    })
    setEditing(null)
  }

  const splitAllEqually = () =>
    onChange((t) => ({
      ...t,
      splits: {
        ...t.splits,
        ...Object.fromEntries(
          unsplit.map((l) => [l.id, { paidBy: payer, mode: 'equal', among: t.members.map((m) => m.id), amounts: {} } satisfies SplitInfo]),
        ),
      },
    }))

  return (
    <div>
      <div className="panel">
        <h3 className="panel-title">Who's on this trip?</h3>
        {members.length > 0 && (
          <ul className="chips members">
            {members.map((m) => (
              <li key={m.id}>
                {m.name}
                <button className="icon" aria-label={`Remove ${m.name}`} onClick={() => removeMember(m)}>✕</button>
              </li>
            ))}
          </ul>
        )}
        <form className="row" onSubmit={addMember}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Add a name, e.g. Aidan" aria-label="Member name" />
          <button type="submit" className="primary add-member">Add</button>
        </form>
        {members.length < 2 && <p className="muted">Add at least two people to start splitting costs.</p>}
      </div>

      {members.length >= 2 && (
        <>
          <Settlements trip={trip} lines={lines} onChange={onChange} />

          {/* Remounts when the group changes so new people are included by default */}
          <AddExpense key={members.map((m) => m.id).join()} trip={trip} onChange={onChange} />

          <div className="panel">
            <h3 className="panel-title">Split your costs</h3>
            {lines.length === 0 && <p className="muted">No costs yet. Add an expense above, or add costs to hotels, flights and activities.</p>}

            {unsplit.length > 0 && (
              <div className="quick">
                <p className="muted">{unsplit.length} cost{unsplit.length > 1 ? 's' : ''} not split yet.</p>
                <div className="row">
                  <label>
                    Paid by
                    <select value={payer} onChange={(e) => setQuickPayer(e.target.value)}>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <button onClick={splitAllEqually}>Split all equally between everyone</button>
              </div>
            )}

            <ul className="list split-lines">
              {lines.map((line) => {
                const split = trip.splits[line.id]
                const isSplit = isLineSplit(trip, line)
                const shares = isSplit ? sharesFor(line.amount, split, ids) : {}
                return (
                  <li key={line.id} className="stack">
                    <div className="line-head">
                      <div>
                        <strong>{line.description}</strong>
                        <small>{line.source ? `${line.category} · from ${line.source}` : line.category}</small>
                      </div>
                      <span>{formatMoney(line.amount, line.currency)}</span>
                    </div>
                    {editing === line.id ? (
                      <SplitEditor
                        line={line}
                        members={members}
                        initial={isSplit ? split : undefined}
                        onSave={(s) => saveSplit(line.id, s)}
                        onClear={isSplit ? () => saveSplit(line.id, null) : undefined}
                        onCancel={() => setEditing(null)}
                      />
                    ) : (
                      <div className="line-split">
                        {isSplit ? (
                          <small>
                            Paid by <strong>{name(split.paidBy)}</strong> · {split.mode === 'equal' ? 'split equally' : 'custom split'}:{' '}
                            {Object.entries(shares).map(([id, c]) => `${name(id)} ${formatMoney(fromCents(c), line.currency)}`).join(', ')}
                          </small>
                        ) : (
                          <small className="warn">Not split yet</small>
                        )}
                        <button className="link" onClick={() => setEditing(line.id)}>{isSplit ? 'Edit split' : 'Split'}</button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

// Balances, debts and payments across every currency. Currencies are never converted, so
// each person/pair lists one amount per currency.
function Settlements({ trip, lines, onChange }: Props) {
  const { members } = trip
  const name = (id: string) => memberName(members, id)
  const currencies = currenciesIn(trip, [...lines.map((l) => l.currency), ...trip.settlements.map((s) => s.currency)])
  const multi = currencies.length > 1
  const anySplit = lines.some((l) => isLineSplit(trip, l))

  const perCurrency = currencies.map((currency) => {
    const cl = lines.filter((l) => l.currency === currency)
    const balances = computeBalances(trip, cl, currency)
    const simplified = simplifyDebts(balances.net)
    const direct = pairwiseDebts(trip, cl, currency)
    return {
      currency,
      ...balances,
      transfers: trip.simplify ? simplified : direct,
      simplifiedCount: simplified.length,
      directCount: direct.length,
      money: (c: number) => formatMoney(fromCents(c), currency),
    }
  })
  const directTotal = perCurrency.reduce((n, pc) => n + pc.directCount, 0)
  const simplifiedTotal = perCurrency.reduce((n, pc) => n + pc.simplifiedCount, 0)
  const saved = directTotal - simplifiedTotal

  // Group debts by pair of people so "A owes B" appears once with an amount per currency
  const pairs = new Map<string, { from: string; to: string; items: { currency: string; amount: number; money: string }[] }>()
  for (const pc of perCurrency) {
    for (const t of pc.transfers) {
      const key = `${t.from}>${t.to}`
      const pair = pairs.get(key) ?? { from: t.from, to: t.to, items: [] }
      pair.items.push({ currency: pc.currency, amount: t.amount, money: pc.money(t.amount) })
      pairs.set(key, pair)
    }
  }

  const settle = (from: string, to: string, cents: number, currency: string) =>
    onChange((t) => ({ ...t, settlements: [...t.settlements, { id: uid(), from, to, amount: fromCents(cents), currency }] }))

  const removeSettlement = (id: string) => onChange((t) => ({ ...t, settlements: t.settlements.filter((s) => s.id !== id) }))

  if (currencies.length === 0) return null

  return (
    <>
      <div className="panel">
        <h3 className="panel-title">Balances</h3>
        {!anySplit && <p className="muted">Split some costs below to see who owes what.</p>}
        <ul className="list balances">
          {members.map((m) => {
            const rows = perCurrency.filter((pc) => pc.paid[m.id] || pc.owed[m.id] || pc.net[m.id])
            return (
              <li key={m.id}>
                <div>
                  <strong>{m.name}</strong>
                  {rows.map((pc) => (
                    <small key={pc.currency}>Paid {pc.money(pc.paid[m.id])} · Share {pc.money(pc.owed[m.id])}</small>
                  ))}
                </div>
                <div className="nets">
                  {rows.length === 0 && <span className="muted">settled up</span>}
                  {rows.map((pc) => {
                    const n = pc.net[m.id]
                    return (
                      <span key={pc.currency} className={n > 0 ? 'pos' : n < 0 ? 'neg' : 'muted'}>
                        {n > 0 ? `gets back ${pc.money(n)}` : n < 0 ? `owes ${pc.money(-n)}` : multi ? `${pc.currency} settled` : 'settled up'}
                      </span>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3 className="panel-title">Who owes who</h3>
          <label className="switch">
            <input
              type="checkbox"
              role="switch"
              checked={trip.simplify}
              onChange={(e) => onChange((t) => ({ ...t, simplify: e.target.checked }))}
            />
            <span className="slider" aria-hidden="true" />
            <span>Simplify debts</span>
          </label>
        </div>
        {!(trip.simplify && simplifiedTotal === 0) && (
          <small className="muted">
            {trip.simplify
              ? saved > 0
                ? `Simplified: ${simplifiedTotal} payment${simplifiedTotal === 1 ? '' : 's'} instead of ${directTotal}.`
                : 'Simplified: these are already the fewest payments.'
              : saved > 0
                ? `Turn on to reduce from ${directTotal} to ${simplifiedTotal} payment${simplifiedTotal === 1 ? '' : 's'} by rerouting debts through the group.`
                : 'Showing who owes whom directly. Turn on to reroute debts for fewer payments.'}
          </small>
        )}
        {pairs.size === 0 ? (
          <p className="muted">{anySplit ? 'Everyone is settled up 🎉' : 'Nothing to settle yet.'}</p>
        ) : (
          <ul className="list">
            {[...pairs.values()].map((p) => (
              <li key={`${p.from}>${p.to}`} className="stack">
                <strong>{name(p.from)} owes {name(p.to)}</strong>
                {p.items.map((item) => (
                  <div className="owe-row" key={item.currency}>
                    <span>{item.money}</span>
                    <button onClick={() => settle(p.from, p.to, item.amount, item.currency)}>Settle up</button>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}
        {trip.settlements.length > 0 && (
          <>
            <h4 className="sub">Payments made</h4>
            <ul className="list">
              {trip.settlements.map((s) => (
                <li key={s.id}>
                  <div>
                    <strong>{name(s.from)} paid {name(s.to)}</strong>
                    <small>{formatMoney(s.amount, s.currency)}</small>
                  </div>
                  <button className="icon" aria-label="Undo payment" onClick={() => removeSettlement(s.id)}>✕</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  )
}

// What the person editing a split has chosen so far. Custom amounts stay as text while typing.
interface Draft {
  paidBy: string
  mode: 'equal' | 'custom'
  among: string[]
  amounts: Record<string, string>
}

const draftFrom = (members: Member[], initial?: SplitInfo): Draft => ({
  paidBy: initial?.paidBy ?? members[0].id,
  mode: initial?.mode ?? 'equal',
  among: initial?.among.length ? initial.among : members.map((m) => m.id),
  amounts: Object.fromEntries(members.map((m) => [m.id, initial?.amounts[m.id] ? String(initial.amounts[m.id]) : ''])),
})

const customTotalCents = (draft: Draft, members: Member[]) =>
  members.reduce((sum, m) => sum + toCents(Number(draft.amounts[m.id]) || 0), 0)

// Returns null while the draft is incomplete or custom amounts don't add up to the cost
function draftToSplit(draft: Draft, members: Member[], amount: number): SplitInfo | null {
  const paidBy = members.some((m) => m.id === draft.paidBy) ? draft.paidBy : members[0].id
  if (draft.mode === 'equal') {
    const among = members.filter((m) => draft.among.includes(m.id)).map((m) => m.id)
    return among.length > 0 ? { paidBy, mode: 'equal', among, amounts: {} } : null
  }
  const total = customTotalCents(draft, members)
  if (total <= 0 || total !== toCents(amount)) return null
  const amounts = Object.fromEntries(members.filter((m) => Number(draft.amounts[m.id]) > 0).map((m) => [m.id, Number(draft.amounts[m.id])]))
  return { paidBy, mode: 'custom', among: [], amounts }
}

interface FieldsProps {
  members: Member[]
  draft: Draft
  onDraft: (d: Draft) => void
  amount: number
  currency: string
}

function SplitFields({ members, draft, onDraft, amount, currency }: FieldsProps) {
  const set = (patch: Partial<Draft>) => onDraft({ ...draft, ...patch })
  const remaining = toCents(amount) - customTotalCents(draft, members)
  const money = (cents: number) => formatMoney(fromCents(cents), currency)
  const toggle = (id: string) => set({ among: draft.among.includes(id) ? draft.among.filter((x) => x !== id) : [...draft.among, id] })

  return (
    <>
      <label>
        Paid by
        <select value={draft.paidBy} onChange={(e) => set({ paidBy: e.target.value })}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </label>

      <div className="tabs seg" role="tablist" aria-label="Split type">
        <button type="button" role="tab" aria-selected={draft.mode === 'equal'} className={draft.mode === 'equal' ? 'active' : ''} onClick={() => set({ mode: 'equal' })}>
          Split equally
        </button>
        <button type="button" role="tab" aria-selected={draft.mode === 'custom'} className={draft.mode === 'custom' ? 'active' : ''} onClick={() => set({ mode: 'custom' })}>
          Custom amounts
        </button>
      </div>

      {draft.mode === 'equal' ? (
        <div className="member-checks">
          <small className="muted">Split with</small>
          {members.map((m) => (
            <label key={m.id} className="check">
              <input type="checkbox" checked={draft.among.includes(m.id)} onChange={() => toggle(m.id)} />
              <span>{m.name}</span>
            </label>
          ))}
          {draft.among.length === 0 && <small className="warn">Pick at least one person.</small>}
        </div>
      ) : (
        <div className="custom-amounts">
          {members.map((m) => (
            <label key={m.id}>
              {m.name}
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={draft.amounts[m.id]}
                placeholder="0"
                onChange={(e) => set({ amounts: { ...draft.amounts, [m.id]: e.target.value } })}
              />
            </label>
          ))}
          <small className={remaining === 0 ? 'pos' : 'warn'}>
            {remaining === 0 ? 'Adds up to the full amount ✓' : remaining > 0 ? `${money(remaining)} left to assign` : `${money(-remaining)} over the total`}
          </small>
        </div>
      )}
    </>
  )
}

interface AddProps {
  trip: Trip
  onChange: OnChange
}

function AddExpense({ trip, onChange }: AddProps) {
  const { members } = trip
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('Food')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(() => draftFrom(members))

  const value = Number(amount)
  const split = value > 0 ? draftToSplit(draft, members, value) : null
  const canAdd = !!description.trim() && value > 0 && !!split

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canAdd || !split) return
    const expense: Expense = { id: uid(), description: description.trim(), category, amount: value, currency: currency ?? trip.currency }
    onChange((t) => ({ ...t, expenses: [...t.expenses, expense], splits: { ...t.splits, [expense.id]: split } }))
    setDescription('')
    setAmount('')
    setDraft((d) => ({ ...d, amounts: Object.fromEntries(Object.keys(d.amounts).map((id) => [id, ''])) }))
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h3 className="panel-title">Add an expense</h3>
      <label>
        Expense
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ramen dinner" required />
      </label>
      <label>
        Category
        <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <div className="row">
        <label>
          Amount
          <input type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <CurrencySelect value={currency ?? trip.currency} onChange={setCurrency} />
      </div>
      <SplitFields members={members} draft={draft} onDraft={setDraft} amount={value || 0} currency={currency ?? trip.currency} />
      <button type="submit" className="primary" disabled={!canAdd}>Add expense</button>
    </form>
  )
}

interface EditorProps {
  line: Line
  members: Member[]
  initial?: SplitInfo
  onSave: (s: SplitInfo) => void
  onClear?: () => void
  onCancel: () => void
}

function SplitEditor({ line, members, initial, onSave, onClear, onCancel }: EditorProps) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(members, initial))
  const split = draftToSplit(draft, members, line.amount)

  return (
    <div className="inline-form">
      <SplitFields members={members} draft={draft} onDraft={setDraft} amount={line.amount} currency={line.currency} />
      <div className="row">
        <button type="button" className="primary" disabled={!split} onClick={() => split && onSave(split)}>Save split</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
      {onClear && <button type="button" className="danger" onClick={onClear}>Remove split</button>}
    </div>
  )
}
