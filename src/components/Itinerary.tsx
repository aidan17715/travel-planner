import { useState } from 'react'
import { uid } from '../storage.ts'
import type { ItineraryItem, Trip } from '../types.ts'

interface Props {
  trip: Trip
  onChange: (patch: (t: Trip) => Trip) => void
}

const fmtDay = (d: string) =>
  d ? new Date(d + 'T00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }) : 'Unscheduled'

export function Itinerary({ trip, onChange }: Props) {
  const [date, setDate] = useState(trip.startDate)
  const [time, setTime] = useState('')
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const item: ItineraryItem = { id: uid(), date, time, title: title.trim(), location: location.trim(), notes: notes.trim() }
    onChange((t) => ({ ...t, itinerary: [...t.itinerary, item] }))
    setTitle('')
    setLocation('')
    setNotes('')
    setTime('')
  }

  const remove = (id: string) => onChange((t) => ({ ...t, itinerary: t.itinerary.filter((i) => i.id !== id) }))

  const sorted = [...trip.itinerary].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const days = sorted.reduce<Record<string, ItineraryItem[]>>((acc, i) => {
    ;(acc[i.date] ??= []).push(i)
    return acc
  }, {})

  return (
    <div>
      <form className="panel" onSubmit={add}>
        <div className="row">
          <label>
            Date
            <input type="date" value={date} min={trip.startDate} max={trip.endDate || undefined} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Time
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
        <label>
          Activity
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Visit Senso-ji Temple" required />
        </label>
        <label>
          Location
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Asakusa" />
        </label>
        <label>
          Notes
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Booking ref, tips..." />
        </label>
        <button type="submit" className="primary">Add to itinerary</button>
      </form>

      {Object.keys(days).length === 0 && <p className="muted">Nothing planned yet.</p>}
      {Object.entries(days).map(([day, items]) => (
        <div key={day} className="day">
          <h3>{fmtDay(day)}</h3>
          <ul className="list">
            {items.map((i) => (
              <li key={i.id}>
                <div>
                  <strong>{i.time && <span className="time">{i.time}</span>} {i.title}</strong>
                  {i.location && (
                    <div>
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(i.location + ' ' + trip.destination)}`} target="_blank" rel="noreferrer">
                        📍 {i.location}
                      </a>
                    </div>
                  )}
                  {i.notes && <small>{i.notes}</small>}
                </div>
                <button className="icon" aria-label={`Delete ${i.title}`} onClick={() => remove(i.id)}>✕</button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
