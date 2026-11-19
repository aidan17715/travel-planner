import { useState } from 'react'
import { fmtDate, listDays } from '../dates.ts'
import { uid } from '../storage.ts'
import type { Hotel, ItineraryItem, Trip } from '../types.ts'

type OnChange = (patch: (t: Trip) => Trip) => void

interface Props {
  trip: Trip
  onChange: OnChange
}

export function Itinerary({ trip, onChange }: Props) {
  const days = listDays(trip.startDate, trip.endDate)
  const inRange = new Set(days)

  // Activities saved on dates that are no longer inside the trip range stay visible
  const strayDates = [...new Set(trip.itinerary.map((i) => i.date).filter((d) => !inRange.has(d)))].sort()

  if (days.length === 0 && strayDates.length === 0) {
    return <p className="muted">Set the trip's start and end dates above to see each day of your trip.</p>
  }

  return (
    <div className="days">
      {days.map((date, i) => (
        <DayCard key={date} trip={trip} date={date} label={`Day ${i + 1}`} allDays={days} onChange={onChange} />
      ))}
      {strayDates.map((date) => (
        <DayCard key={date || 'none'} trip={trip} date={date} label="Outside trip dates" allDays={days} onChange={onChange} />
      ))}
    </div>
  )
}

interface DayProps {
  trip: Trip
  date: string
  label: string
  allDays: string[]
  onChange: OnChange
}

function DayCard({ trip, date, label, allDays, onChange }: DayProps) {
  const [addingActivity, setAddingActivity] = useState(false)
  const [editingHotel, setEditingHotel] = useState(false)

  const hotel = trip.hotels[date]
  const activities = trip.itinerary
    .filter((i) => i.date === date)
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))

  const removeActivity = (id: string) => onChange((t) => ({ ...t, itinerary: t.itinerary.filter((i) => i.id !== id) }))

  const removeHotel = () =>
    onChange((t) => {
      const { [date]: _removed, ...rest } = t.hotels
      return { ...t, hotels: rest }
    })

  return (
    <article className="day-card">
      <h3>
        <span>{label}</span>
        <span className="day-date">{fmtDate(date)}</span>
      </h3>

      {date && (
        <section className="hotel">
          <h4>🏨 Hotel</h4>
          {editingHotel ? (
            <HotelForm
              initial={hotel}
              canApplyAll={allDays.length > 1 && allDays.includes(date)}
              onCancel={() => setEditingHotel(false)}
              onSave={(h, applyAll) => {
                onChange((t) => {
                  const hotels = { ...t.hotels, [date]: h }
                  if (applyAll) for (const d of allDays) if (!hotels[d]) hotels[d] = h
                  return { ...t, hotels }
                })
                setEditingHotel(false)
              }}
            />
          ) : hotel ? (
            <div className="item">
              <div>
                <strong>{hotel.name}</strong>
                {hotel.address && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.address)}`} target="_blank" rel="noreferrer">
                    📍 {hotel.address}
                  </a>
                )}
                {hotel.notes && <small>{hotel.notes}</small>}
              </div>
              <div className="item-actions">
                <button className="link" onClick={() => setEditingHotel(true)}>Edit</button>
                <button className="icon" aria-label="Remove hotel" onClick={removeHotel}>✕</button>
              </div>
            </div>
          ) : (
            <div className="blank">
              <span className="muted">No hotel yet</span>
              <button onClick={() => setEditingHotel(true)}>+ Add hotel</button>
            </div>
          )}
        </section>
      )}

      <section>
        <h4>📅 Activities</h4>
        {activities.length === 0 && !addingActivity && <p className="muted blank-text">No activities yet</p>}
        <ul className="list">
          {activities.map((a) => (
            <li key={a.id}>
              <div>
                <strong>{a.time && <span className="time">{a.time}</span>} {a.title}</strong>
                {a.location && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.location + ' ' + trip.destination)}`} target="_blank" rel="noreferrer">
                    📍 {a.location}
                  </a>
                )}
                {a.notes && <small>{a.notes}</small>}
              </div>
              <button className="icon" aria-label={`Delete ${a.title}`} onClick={() => removeActivity(a.id)}>✕</button>
            </li>
          ))}
        </ul>

        {addingActivity ? (
          <ActivityForm
            onCancel={() => setAddingActivity(false)}
            onSave={(item) => {
              onChange((t) => ({ ...t, itinerary: [...t.itinerary, { ...item, date }] }))
              setAddingActivity(false)
            }}
          />
        ) : (
          <button className="add-btn" onClick={() => setAddingActivity(true)}>+ Add activity</button>
        )}
      </section>
    </article>
  )
}

function ActivityForm({ onSave, onCancel }: { onSave: (i: Omit<ItineraryItem, 'date'>) => void; onCancel: () => void }) {
  const [time, setTime] = useState('')
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({ id: uid(), time, title: title.trim(), location: location.trim(), notes: notes.trim() })
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <label>
        Activity
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Visit Senso-ji Temple" required autoFocus />
      </label>
      <div className="row">
        <label>
          Time
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label>
          Location
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Asakusa" />
        </label>
      </div>
      <label>
        Notes
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Booking ref, tips..." />
      </label>
      <div className="row">
        <button type="submit" className="primary">Save activity</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

interface HotelFormProps {
  initial?: Hotel
  canApplyAll: boolean
  onSave: (h: Hotel, applyAll: boolean) => void
  onCancel: () => void
}

function HotelForm({ initial, canApplyAll, onSave, onCancel }: HotelFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [applyAll, setApplyAll] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), address: address.trim(), notes: notes.trim() }, applyAll)
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <label>
        Hotel name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hotel Gracery Shinjuku" required autoFocus />
      </label>
      <label>
        Address
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="1-19-1 Kabukicho, Shinjuku" />
      </label>
      <label>
        Notes
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Booking ref, check-in time..." />
      </label>
      {canApplyAll && !initial && (
        <label className="check">
          <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} />
          <span>Use for all other days without a hotel</span>
        </label>
      )}
      <div className="row">
        <button type="submit" className="primary">Save hotel</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
