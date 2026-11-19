import { useState } from 'react'
import { uid } from '../storage.ts'
import type { Trip } from '../types.ts'

interface Props {
  trip: Trip
  onChange: (patch: (t: Trip) => Trip) => void
}

const SUGGESTIONS = ['Passport', 'Phone charger', 'Travel adapter', 'Toiletries', 'Medication', 'Underwear & socks', 'Sunscreen', 'Power bank']

export function Packing({ trip, onChange }: Props) {
  const [label, setLabel] = useState('')

  const addItems = (labels: string[]) =>
    onChange((t) => {
      const existing = new Set(t.packing.map((p) => p.label.toLowerCase()))
      const fresh = labels
        .map((l) => l.trim())
        .filter((l) => l && !existing.has(l.toLowerCase()))
        .map((l) => ({ id: uid(), label: l, packed: false }))
      return { ...t, packing: [...t.packing, ...fresh] }
    })

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    addItems([label])
    setLabel('')
  }

  const toggle = (id: string) =>
    onChange((t) => ({ ...t, packing: t.packing.map((p) => (p.id === id ? { ...p, packed: !p.packed } : p)) }))
  const remove = (id: string) => onChange((t) => ({ ...t, packing: t.packing.filter((p) => p.id !== id) }))

  const done = trip.packing.filter((p) => p.packed).length

  return (
    <div>
      <form className="panel" onSubmit={add}>
        <label>
          Add item
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Camera" />
        </label>
        <div className="row">
          <button type="submit" className="primary">Add</button>
          <button type="button" onClick={() => addItems(SUGGESTIONS)}>Add essentials</button>
        </div>
      </form>

      {trip.packing.length > 0 && <p className="muted">{done} of {trip.packing.length} packed</p>}
      <ul className="list">
        {trip.packing.map((p) => (
          <li key={p.id}>
            <label className="check">
              <input type="checkbox" checked={p.packed} onChange={() => toggle(p.id)} />
              <span className={p.packed ? 'done' : ''}>{p.label}</span>
            </label>
            <button className="icon" aria-label={`Delete ${p.label}`} onClick={() => remove(p.id)}>✕</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
