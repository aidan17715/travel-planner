import { useState } from 'react'
import { fmtDate } from '../dates.ts'
import { newFlight } from '../storage.ts'
import type { Flight, Trip } from '../types.ts'

interface Props {
  trip: Trip
  onChange: (patch: (t: Trip) => Trip) => void
}

function CostField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(value ? String(value) : '')
  return (
    <label>
      {label}
      <input
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={text}
        placeholder="Added to your budget"
        onChange={(e) => {
          setText(e.target.value)
          onChange(Number(e.target.value) > 0 ? Number(e.target.value) : 0)
        }}
      />
    </label>
  )
}

// The "T" is shown as a fixed prefix so only the number needs typing
function TerminalField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="narrow">
      Terminal
      <div className="prefixed">
        <span>T</span>
        <input value={value} onChange={(e) => onChange(e.target.value.replace(/^t\s*(?=\d)/i, ''))} placeholder="3" />
      </div>
    </label>
  )
}

export function Flights({ trip, onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | undefined>(trip.flights[0]?.id)
  const flight = trip.flights.find((f) => f.id === selectedId) ?? trip.flights[0]

  const add = () => {
    const f = newFlight(`Flight ${trip.flights.length + 1}`, trip.startDate)
    onChange((t) => ({ ...t, flights: [...t.flights, f] }))
    setSelectedId(f.id)
  }

  const update = (patch: Partial<Flight>) =>
    onChange((t) => ({ ...t, flights: t.flights.map((f) => (f.id === flight.id ? { ...f, ...patch } : f)) }))

  // Arrival follows the departure date unless it was deliberately set to a later day (e.g. overnight flights)
  const setDepartDate = (d: string) =>
    update({
      departDate: d,
      ...(!flight.arriveDate || flight.arriveDate === flight.departDate || flight.arriveDate < d ? { arriveDate: d } : {}),
    })

  const remove = () => {
    if (!confirm(`Delete "${flight.label || 'this flight'}"?`)) return
    onChange((t) => ({ ...t, flights: t.flights.filter((f) => f.id !== flight.id) }))
    setSelectedId(undefined)
  }

  return (
    <div className="flights">
      <nav className="side-menu" aria-label="Flights">
        {trip.flights.map((f) => (
          <button key={f.id} className={f.id === flight?.id ? 'active' : ''} onClick={() => setSelectedId(f.id)}>
            <span>✈️ {f.label || 'Flight'}</span>
            <small>{f.flightNumber || (f.departDate ? fmtDate(f.departDate) : '')}</small>
          </button>
        ))}
        <button className="add-btn" onClick={add}>+ Add flight</button>
      </nav>

      {flight ? (
        <div className="panel flight-form" key={flight.id}>
          <div className="row">
            <label>
              Flight name
              <input value={flight.label} onChange={(e) => update({ label: e.target.value })} placeholder="Outbound" />
            </label>
            <label>
              Flight number
              <input value={flight.flightNumber} onChange={(e) => update({ flightNumber: e.target.value })} placeholder="SQ 12" />
            </label>
          </div>
          <div className="row">
            <label>
              Airline
              <input value={flight.airline} onChange={(e) => update({ airline: e.target.value })} placeholder="Singapore Airlines" />
            </label>
            <label>
              Booking reference
              <input value={flight.bookingRef} onChange={(e) => update({ bookingRef: e.target.value })} />
            </label>
          </div>

          <h4>Departure</h4>
          <div className="row">
            <label>
              Date
              <input type="date" value={flight.departDate} onChange={(e) => setDepartDate(e.target.value)} />
            </label>
            <label>
              Time
              <input type="time" value={flight.departTime} onChange={(e) => update({ departTime: e.target.value })} />
            </label>
          </div>
          <div className="row">
            <label className="grow">
              Airport
              <input value={flight.departAirport} onChange={(e) => update({ departAirport: e.target.value })} placeholder="SIN – Changi" />
            </label>
            <TerminalField value={flight.departTerminal} onChange={(v) => update({ departTerminal: v })} />
          </div>

          <h4>Arrival</h4>
          <div className="row">
            <label>
              Date
              <input type="date" value={flight.arriveDate} min={flight.departDate || undefined} onChange={(e) => update({ arriveDate: e.target.value })} />
            </label>
            <label>
              Time
              <input type="time" value={flight.arriveTime} onChange={(e) => update({ arriveTime: e.target.value })} />
            </label>
          </div>
          <div className="row">
            <label className="grow">
              Airport
              <input value={flight.arriveAirport} onChange={(e) => update({ arriveAirport: e.target.value })} placeholder="NRT – Narita" />
            </label>
            <TerminalField value={flight.arriveTerminal} onChange={(v) => update({ arriveTerminal: v })} />
          </div>

          <label>
            Notes
            <input value={flight.notes} onChange={(e) => update({ notes: e.target.value })} placeholder="Seat, baggage, gate..." />
          </label>
          <CostField key={flight.id} label={`Cost, ${trip.currency} (optional)`} value={flight.cost} onChange={(cost) => update({ cost })} />

          <button className="danger" onClick={remove}>Delete this flight</button>
        </div>
      ) : (
        <p className="muted">No flights. Use “+ Add flight” to add one.</p>
      )}
    </div>
  )
}
