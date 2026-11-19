import { useState } from 'react'
import type { Trip } from '../types.ts'
import { Budget } from './Budget.tsx'
import { Flights } from './Flights.tsx'
import { Itinerary } from './Itinerary.tsx'

interface Props {
  trip: Trip
  onChange: (patch: (t: Trip) => Trip) => void
  onDelete: () => void
  onBack: () => void
}

const TABS = ['Itinerary', 'Flights', 'Budget'] as const
type Tab = (typeof TABS)[number]

export function TripView({ trip, onChange, onDelete, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('Itinerary')

  const confirmDelete = () => {
    if (confirm(`Delete "${trip.name}"? This cannot be undone.`)) onDelete()
  }

  // Flights sitting on the old start/end date move along with the trip dates
  const changeDates = (start: string, end: string) =>
    onChange((t) => {
      const shift = (d: string) => (!d ? d : d === t.startDate ? start : d === t.endDate ? end : d)
      return {
        ...t,
        startDate: start,
        endDate: end,
        flights: t.flights.map((f) => ({ ...f, departDate: shift(f.departDate), arriveDate: shift(f.arriveDate) })),
      }
    })

  return (
    <section>
      <div className="trip-head">
        <button onClick={onBack}>← Trips</button>
        <button className="danger" onClick={confirmDelete}>Delete</button>
      </div>
      <h2>{trip.name}</h2>
      <p className="muted">{trip.destination}</p>

      <div className="row dates">
        <label>
          Start
          <input
            type="date"
            value={trip.startDate}
            max={trip.endDate || undefined}
            onChange={(e) => changeDates(e.target.value, trip.endDate)}
          />
        </label>
        <label>
          End
          <input
            type="date"
            value={trip.endDate}
            min={trip.startDate || undefined}
            onChange={(e) => changeDates(trip.startDate, e.target.value)}
          />
        </label>
      </div>

      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>

      {tab === 'Itinerary' && <Itinerary trip={trip} onChange={onChange} />}
      {tab === 'Flights' && <Flights trip={trip} onChange={onChange} />}
      {tab === 'Budget' && <Budget trip={trip} onChange={onChange} />}
    </section>
  )
}
