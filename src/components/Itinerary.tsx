import { useState } from 'react'
import { fmtDate, listDays } from '../dates.ts'
import { activityEmoji } from '../emoji.ts'
import { formatMoney } from '../money.ts'
import { uid } from '../storage.ts'
import type { Flight, ItineraryItem, Stay, Trip } from '../types.ts'

type OnChange = (patch: (t: Trip) => Trip) => void

interface Props {
  trip: Trip
  onChange: OnChange
}

export function Itinerary({ trip, onChange }: Props) {
  const days = listDays(trip.startDate, trip.endDate)
  const inRange = new Set(days)

  // Anything dated outside the trip range stays visible so nothing is lost
  const strayDates = [
    ...new Set([
      ...trip.itinerary.map((i) => i.date),
      ...trip.stays.flatMap((s) => [s.startDate, s.endDate]).filter(Boolean),
      ...trip.flights.flatMap((f) => [f.departDate, f.arriveDate]).filter(Boolean),
    ]),
  ]
    .filter((d) => !inRange.has(d))
    .sort()

  if (days.length === 0 && strayDates.length === 0) {
    return <p className="muted">Set the trip's start and end dates above to see each day of your trip.</p>
  }

  return (
    <div className="days">
      {days.map((date, i) => (
        <DayCard key={date} trip={trip} date={date} label={`Day ${i + 1}`} days={days} onChange={onChange} />
      ))}
      {strayDates.map((date) => (
        <DayCard key={date || 'none'} trip={trip} date={date} label="Outside trip dates" days={days} onChange={onChange} />
      ))}
    </div>
  )
}

interface DayProps {
  trip: Trip
  date: string
  label: string
  days: string[]
  onChange: OnChange
}

function DayCard({ trip, date, label, days, onChange }: DayProps) {
  const [addingActivity, setAddingActivity] = useState(false)
  const [editingActivity, setEditingActivity] = useState<string | null>(null)
  const [addingStay, setAddingStay] = useState(false)
  const [editingStay, setEditingStay] = useState<string | null>(null)

  const stays = date ? trip.stays.filter((s) => s.startDate <= date && date <= s.endDate) : []
  const flights = date
    ? trip.flights
        .filter((f) => f.departDate === date || f.arriveDate === date)
        .sort((a, b) => flightTime(a, date).localeCompare(flightTime(b, date)))
    : []
  const activities = trip.itinerary
    .filter((i) => i.date === date)
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))

  const removeActivity = (id: string) => onChange((t) => ({ ...t, itinerary: t.itinerary.filter((i) => i.id !== id) }))

  const removeStay = (s: Stay) => {
    const multi = s.startDate !== s.endDate
    if (multi && !confirm(`Remove "${s.name}" from all ${listDays(s.startDate, s.endDate).length} days of this stay?`)) return
    onChange((t) => ({ ...t, stays: t.stays.filter((x) => x.id !== s.id) }))
  }

  return (
    <article className="day-card">
      <h3>
        <span>{label}</span>
        <span className="day-date">{fmtDate(date)}</span>
      </h3>

      {flights.length > 0 && (
        <section>
          <h4>✈️ Flights</h4>
          {flights.map((f) => (
            <FlightRow key={f.id} flight={f} date={date} />
          ))}
        </section>
      )}

      {date && (
        <section>
          <h4>🏨 Hotel</h4>
          {stays.map((s) =>
            editingStay === s.id ? (
              <StayForm
                key={s.id}
                initial={s}
                days={days}
                defaultDate={date}
                currency={trip.currency}
                onCancel={() => setEditingStay(null)}
                onSave={(values) => {
                  onChange((t) => ({ ...t, stays: t.stays.map((x) => (x.id === s.id ? { ...x, ...values } : x)) }))
                  setEditingStay(null)
                }}
              />
            ) : (
              <div className="item" key={s.id}>
                <div>
                  <strong>{s.name}</strong>
                  {s.startDate !== s.endDate && (
                    <small>{fmtDate(s.startDate)} – {fmtDate(s.endDate)}</small>
                  )}
                  {date === s.startDate && s.checkInTime && <small>🔑 Check-in: {s.checkInTime}</small>}
                  {date === s.endDate && s.checkOutTime && <small>🚪 Check-out: {s.checkOutTime}</small>}
                  {s.address && (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`} target="_blank" rel="noreferrer">
                      📍 {s.address}
                    </a>
                  )}
                  {s.notes && <small>{s.notes}</small>}
                  {date === s.startDate && s.cost > 0 && <small>💰 {formatMoney(s.cost, trip.currency)}</small>}
                </div>
                <div className="item-actions">
                  <button className="link" onClick={() => setEditingStay(s.id)}>Edit</button>
                  <button className="icon" aria-label={`Remove ${s.name}`} onClick={() => removeStay(s)}>✕</button>
                </div>
              </div>
            ),
          )}

          {addingStay && (
            <StayForm
              days={days}
              defaultDate={date}
              currency={trip.currency}
              onCancel={() => setAddingStay(false)}
              onSave={(values) => {
                onChange((t) => ({ ...t, stays: [...t.stays, { id: uid(), ...values }] }))
                setAddingStay(false)
              }}
            />
          )}

          {stays.length === 0 && !addingStay && (
            <div className="blank">
              <span className="muted">No hotel yet</span>
              <button onClick={() => setAddingStay(true)}>+ Add hotel</button>
            </div>
          )}
        </section>
      )}

      <section>
        <h4>📅 Activities</h4>
        {activities.length === 0 && !addingActivity && <p className="muted blank-text">No activities yet</p>}
        <ul className="list">
          {activities.map((a) =>
            editingActivity === a.id ? (
              <li key={a.id} className="editing">
                <ActivityForm
                  initial={a}
                  currency={trip.currency}
                  onCancel={() => setEditingActivity(null)}
                  onSave={(values) => {
                    onChange((t) => ({ ...t, itinerary: t.itinerary.map((x) => (x.id === a.id ? { ...x, ...values } : x)) }))
                    setEditingActivity(null)
                  }}
                />
              </li>
            ) : (
              <li key={a.id}>
                <div>
                  <strong>
                    <span className="emoji">{activityEmoji(a.title, a.location)}</span>
                    {a.time && <span className="time">{a.time}</span>} {a.title}
                  </strong>
                  {a.location && (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.location + ' ' + trip.destination)}`} target="_blank" rel="noreferrer">
                      📍 {a.location}
                    </a>
                  )}
                  {a.notes && <small>{a.notes}</small>}
                  {a.cost > 0 && <small>💰 {formatMoney(a.cost, trip.currency)}</small>}
                </div>
                <div className="item-actions">
                  <button className="link" onClick={() => setEditingActivity(a.id)}>Edit</button>
                  <button className="icon" aria-label={`Delete ${a.title}`} onClick={() => removeActivity(a.id)}>✕</button>
                </div>
              </li>
            ),
          )}
        </ul>

        {addingActivity ? (
          <ActivityForm
            currency={trip.currency}
            onCancel={() => setAddingActivity(false)}
            onSave={(values) => {
              onChange((t) => ({ ...t, itinerary: [...t.itinerary, { id: uid(), date, ...values }] }))
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

type ActivityValues = Pick<ItineraryItem, 'time' | 'title' | 'location' | 'notes' | 'cost'>

const sortTime = (t: string) => t || '99:99'

const flightTime = (f: Flight, date: string) => sortTime(f.departDate === date ? f.departTime : f.arriveTime)

const place = (airport: string, terminal: string) => [airport, terminal && `(${terminal})`].filter(Boolean).join(' ')

function FlightRow({ flight: f, date }: { flight: Flight; date: string }) {
  const departs = f.departDate === date
  const arrives = f.arriveDate === date
  const lines = [
    departs && ['Departs', f.departTime, place(f.departAirport, f.departTerminal)],
    arrives && ['Arrives', f.arriveTime, place(f.arriveAirport, f.arriveTerminal)],
  ]
    .filter((l): l is string[] => !!l)
    .map(([verb, time, where]) => [verb, [time, where].filter(Boolean).join(' · ')].filter(Boolean).join(' '))
  const extra = [f.airline, f.bookingRef && `Ref ${f.bookingRef}`].filter(Boolean).join(' · ')

  return (
    <div className="item">
      <div>
        <strong>{[f.label, f.flightNumber].filter(Boolean).join(' · ') || 'Flight'}</strong>
        {lines.map((l) => (
          <small key={l}>{l}</small>
        ))}
        {extra && <small>{extra}</small>}
      </div>
    </div>
  )
}

interface ActivityFormProps {
  initial?: ItineraryItem
  currency: string
  onSave: (v: ActivityValues) => void
  onCancel: () => void
}

function ActivityForm({ initial, currency, onSave, onCancel }: ActivityFormProps) {
  const [time, setTime] = useState(initial?.time ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [cost, setCost] = useState(initial?.cost ? String(initial.cost) : '')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({ time, title: title.trim(), location: location.trim(), notes: notes.trim(), cost: Number(cost) > 0 ? Number(cost) : 0 })
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
      <label>
        Cost, {currency}
        <input type="number" min="0" step="0.01" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Added to your budget" />
      </label>
      <div className="row">
        <button type="submit" className="primary">Save activity</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

type StayValues = Omit<Stay, 'id'>

interface StayFormProps {
  initial?: Stay
  days: string[]
  defaultDate: string
  currency: string
  onSave: (v: StayValues) => void
  onCancel: () => void
}

function StayForm({ initial, days, defaultDate, currency, onSave, onCancel }: StayFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [from, setFrom] = useState(initial?.startDate ?? defaultDate)
  const [to, setTo] = useState(initial?.endDate ?? defaultDate)
  const [checkInTime, setCheckInTime] = useState(initial?.checkInTime ?? '')
  const [checkOutTime, setCheckOutTime] = useState(initial?.checkOutTime ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [cost, setCost] = useState(initial?.cost ? String(initial.cost) : '')
  const [allDays, setAllDays] = useState(
    !!initial && days.length > 1 && initial.startDate === days[0] && initial.endDate === days[days.length - 1],
  )

  // Include the stay's own dates so editing still works if the trip dates changed
  const options = [...new Set([...days, from, to].filter(Boolean))].sort()
  const dayLabel = (d: string) => {
    const i = days.indexOf(d)
    return i >= 0 ? `Day ${i + 1} · ${fmtDate(d)}` : fmtDate(d)
  }

  const effFrom = allDays ? days[0] : from
  const effTo = allDays ? days[days.length - 1] : to

  const changeFrom = (d: string) => {
    setFrom(d)
    if (to < d) setTo(d)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !effFrom || !effTo) return
    onSave({
      name: name.trim(),
      address: address.trim(),
      notes: notes.trim(),
      startDate: effFrom,
      endDate: effTo,
      checkInTime,
      checkOutTime,
      cost: Number(cost) > 0 ? Number(cost) : 0,
    })
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

      <div className="row">
        <label>
          First day
          <select value={effFrom} disabled={allDays} onChange={(e) => changeFrom(e.target.value)}>
            {options.map((d) => (
              <option key={d} value={d}>{dayLabel(d)}</option>
            ))}
          </select>
        </label>
        <label>
          Last day
          <select value={effTo} disabled={allDays} onChange={(e) => setTo(e.target.value)}>
            {options.filter((d) => d >= effFrom).map((d) => (
              <option key={d} value={d}>{dayLabel(d)}</option>
            ))}
          </select>
        </label>
      </div>
      {days.length > 1 && (
        <label className="check">
          <input type="checkbox" checked={allDays} onChange={(e) => setAllDays(e.target.checked)} />
          <span>Use for all days</span>
        </label>
      )}

      <div className="row">
        <label>
          Check-in time
          <input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} />
        </label>
        <label>
          Check-out time
          <input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} />
        </label>
      </div>
      <label>
        Notes
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Booking ref..." />
      </label>
      <label>
        Total cost for the stay, {currency}
        <input type="number" min="0" step="0.01" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Added to your budget" />
      </label>

      <div className="row">
        <button type="submit" className="primary">Save hotel</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
