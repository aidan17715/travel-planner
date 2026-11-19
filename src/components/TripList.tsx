import { useState } from 'react'
import { uid } from '../storage.ts'
import type { Trip } from '../types.ts'

interface Props {
  trips: Trip[]
  onOpen: (id: string) => void
  onAdd: (trip: Trip) => void
}

const fmt = (d: string) => (d ? new Date(d + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '')

export function TripList({ trips, onOpen, onAdd }: Props) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [budget, setBudget] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const trip: Trip = {
      id: uid(),
      name: name.trim() || destination.trim() || 'My trip',
      destination: destination.trim(),
      startDate,
      endDate,
      currency: currency.trim().toUpperCase() || 'USD',
      budget: Number(budget) || 0,
      itinerary: [],
      expenses: [],
      packing: [],
    }
    onAdd(trip)
    setAdding(false)
    setName('')
    setDestination('')
    setStartDate('')
    setEndDate('')
    setBudget('')
    onOpen(trip.id)
  }

  return (
    <section>
      {trips.length === 0 && !adding && (
        <div className="empty">
          <p>No trips yet.</p>
          <p>Create your first trip to start planning.</p>
        </div>
      )}

      <ul className="cards">
        {trips.map((t) => (
          <li key={t.id}>
            <button className="card" onClick={() => onOpen(t.id)}>
              <strong>{t.name}</strong>
              <span>{t.destination}</span>
              <small>{t.startDate ? `${fmt(t.startDate)}${t.endDate ? ' – ' + fmt(t.endDate) : ''}` : 'No dates set'}</small>
            </button>
          </li>
        ))}
      </ul>

      {adding ? (
        <form className="panel" onSubmit={submit}>
          <h2>New trip</h2>
          <label>
            Trip name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Summer in Japan" autoFocus />
          </label>
          <label>
            Destination
            <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Tokyo" required />
          </label>
          <div className="row">
            <label>
              Start
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label>
              End
              <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </div>
          <div className="row">
            <label>
              Budget
              <input type="number" min="0" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0" />
            </label>
            <label>
              Currency
              <input value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value)} />
            </label>
          </div>
          <div className="row">
            <button type="submit" className="primary">Create trip</button>
            <button type="button" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="primary fab" onClick={() => setAdding(true)}>+ New trip</button>
      )}
    </section>
  )
}
