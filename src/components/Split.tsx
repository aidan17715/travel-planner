import { useState } from 'react'
import { currenciesIn, type Line } from '../budget.ts'
import { formatMoney } from '../money.ts'
import { computeBalances, fromCents, isLineSplit, memberInUse, memberName, sharesFor, simplifyDebts, toCents } from '../splits.ts'
import { uid } from '../storage.ts'
import type { Member, Split as SplitInfo, Trip } from '../types.ts'

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
  // Currencies are never mixed: each one gets its own balances and debts
  const currencies = currenciesIn(trip, [...lines.map((l) => l.currency), ...trip.settlements.map((s) => s.currency)])
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
          {currencies.map((c) => (
            <CurrencyBalances
              key={c}
              trip={trip}
              lines={lines.filter((l) => l.currency === c)}
              currency={c}
              showCurrency={currencies.length > 1}
              onChange={onChange}
            />
          ))}

          <div className="panel">
            <h3 className="panel-title">Split your costs</h3>
            {lines.length === 0 && <p className="muted">No costs yet. Add expenses in Summary, or costs to hotels, flights and activities.</p>}

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

interface BalancesProps {
  trip: Trip
  lines: Line[]
  currency: string
  showCurrency: boolean
  onChange: OnChange
}

function CurrencyBalances({ trip, lines, currency, showCurrency, onChange }: BalancesProps) {
  const { members } = trip
  const money = (cents: number) => formatMoney(fromCents(cents), currency)
  const name = (id: string) => memberName(members, id)
  const { paid, owed, net } = computeBalances(trip, lines, currency)
  const transfers = simplifyDebts(net)
  const settlements = trip.settlements.filter((s) => s.currency === currency)
  const anySplit = lines.some((l) => isLineSplit(trip, l))
  const suffix = showCurrency ? ` · ${currency}` : ''

  const settle = (from: string, to: string, cents: number) =>
    onChange((t) => ({ ...t, settlements: [...t.settlements, { id: uid(), from, to, amount: fromCents(cents), currency }] }))

  const removeSettlement = (id: string) => onChange((t) => ({ ...t, settlements: t.settlements.filter((s) => s.id !== id) }))

  return (
    <>
      <div className="panel">
        <h3 className="panel-title">Balances{suffix}</h3>
        {!anySplit && <p className="muted">Split some costs below to see who owes what.</p>}
        <ul className="list balances">
          {members.map((m) => (
            <li key={m.id}>
              <div>
                <strong>{m.name}</strong>
                <small>Paid {money(paid[m.id])} · Share {money(owed[m.id])}</small>
              </div>
              <span className={net[m.id] > 0 ? 'pos' : net[m.id] < 0 ? 'neg' : 'muted'}>
                {net[m.id] > 0 ? `gets back ${money(net[m.id])}` : net[m.id] < 0 ? `owes ${money(-net[m.id])}` : 'settled up'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h3 className="panel-title">Who owes who{suffix}</h3>
        {transfers.length === 0 ? (
          <p className="muted">{anySplit ? 'Everyone is settled up 🎉' : 'Nothing to settle yet.'}</p>
        ) : (
          <ul className="list">
            {transfers.map((t) => (
              <li key={`${t.from}-${t.to}`}>
                <div>
                  <strong>{name(t.from)} owes {name(t.to)}</strong>
                  <small>{money(t.amount)}</small>
                </div>
                <button onClick={() => settle(t.from, t.to, t.amount)}>Settle up</button>
              </li>
            ))}
          </ul>
        )}
        {settlements.length > 0 && (
          <>
            <h4 className="sub">Payments made</h4>
            <ul className="list">
              {settlements.map((s) => (
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

interface EditorProps {
  line: Line
  members: Member[]
  initial?: SplitInfo
  onSave: (s: SplitInfo) => void
  onClear?: () => void
  onCancel: () => void
}

function SplitEditor({ line, members, initial, onSave, onClear, onCancel }: EditorProps) {
  const [paidBy, setPaidBy] = useState(initial?.paidBy ?? members[0].id)
  const [mode, setMode] = useState<'equal' | 'custom'>(initial?.mode ?? 'equal')
  const [among, setAmong] = useState<string[]>(initial?.among.length ? initial.among : members.map((m) => m.id))
  const [amounts, setAmounts] = useState<Record<string, string>>(
    Object.fromEntries(members.map((m) => [m.id, initial?.amounts[m.id] ? String(initial.amounts[m.id]) : ''])),
  )

  const customTotal = members.reduce((sum, m) => sum + toCents(Number(amounts[m.id]) || 0), 0)
  const remaining = toCents(line.amount) - customTotal
  const valid = mode === 'equal' ? among.length > 0 : customTotal > 0 && remaining === 0

  const toggle = (id: string) => setAmong((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]))

  const save = () => {
    if (!valid) return
    onSave({
      paidBy,
      mode,
      among: mode === 'equal' ? members.filter((m) => among.includes(m.id)).map((m) => m.id) : [],
      amounts:
        mode === 'custom'
          ? Object.fromEntries(members.filter((m) => Number(amounts[m.id]) > 0).map((m) => [m.id, Number(amounts[m.id])]))
          : {},
    })
  }

  const money = (cents: number) => formatMoney(fromCents(cents), line.currency)

  return (
    <div className="inline-form">
      <label>
        Paid by
        <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </label>

      <div className="tabs seg" role="tablist" aria-label="Split type">
        <button type="button" role="tab" aria-selected={mode === 'equal'} className={mode === 'equal' ? 'active' : ''} onClick={() => setMode('equal')}>
          Equally
        </button>
        <button type="button" role="tab" aria-selected={mode === 'custom'} className={mode === 'custom' ? 'active' : ''} onClick={() => setMode('custom')}>
          Custom amounts
        </button>
      </div>

      {mode === 'equal' ? (
        <div className="member-checks">
          {members.map((m) => (
            <label key={m.id} className="check">
              <input type="checkbox" checked={among.includes(m.id)} onChange={() => toggle(m.id)} />
              <span>{m.name}</span>
            </label>
          ))}
          {among.length === 0 && <small className="warn">Pick at least one person.</small>}
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
                value={amounts[m.id]}
                placeholder="0"
                onChange={(e) => setAmounts((a) => ({ ...a, [m.id]: e.target.value }))}
              />
            </label>
          ))}
          <small className={remaining === 0 ? 'pos' : 'warn'}>
            {remaining === 0 ? 'Adds up to the full amount ✓' : remaining > 0 ? `${money(remaining)} left to assign` : `${money(-remaining)} over the total`}
          </small>
        </div>
      )}

      <div className="row">
        <button type="button" className="primary" disabled={!valid} onClick={save}>Save split</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
      {onClear && <button type="button" className="danger" onClick={onClear}>Remove split</button>}
    </div>
  )
}
