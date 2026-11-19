import { useEffect } from 'react'
import { fmtDate } from '../dates.ts'
import { activityEmoji } from '../emoji.ts'
import { formatMoney } from '../money.ts'
import { dayEntries, staysOn, tripDays } from '../schedule.ts'
import type { Trip } from '../types.ts'
import { FlightRow } from './FlightRow.tsx'

interface Props {
  trip: Trip
  onClose: () => void
}

export function Overview({ trip, onClose }: Props) {
  const { days, strayDates } = tripDays(trip)
  const columns = [
    ...days.map((date, i) => ({ date, label: `Day ${i + 1}` })),
    ...strayDates.map((date) => ({ date, label: 'Outside trip dates' })),
  ]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Trip overview">
      <div className="overlay-head">
        <div>
          <h2>{trip.name}</h2>
          <p className="muted">{[trip.destination, days.length > 0 && `${days.length} days`].filter(Boolean).join(' · ')}</p>
        </div>
        <button className="primary" onClick={onClose}>Close</button>
      </div>

      {columns.length === 0 ? (
        <p className="muted">Set the trip's start and end dates to see the overview.</p>
      ) : (
        <div className="overview-scroll">
          <div className="overview-grid">
            {columns.map(({ date, label }) => {
              const stays = staysOn(trip, date)
              const entries = dayEntries(trip, date)
              return (
                <section className="ov-day" key={date || 'none'}>
                  <h3>
                    <span>{label}</span>
                    <small>{fmtDate(date)}</small>
                  </h3>

                  {stays.map((s) => (
                    <div className="ov-hotel" key={s.id}>
                      <strong>🏨 {s.name}</strong>
                      {date === s.startDate && s.checkInTime && <small>🔑 Check-in {s.checkInTime}</small>}
                      {date === s.endDate && s.checkOutTime && <small>🚪 Check-out {s.checkOutTime}</small>}
                    </div>
                  ))}

                  {entries.length === 0 && stays.length === 0 && <p className="muted">Nothing planned yet</p>}

                  <ul className="list">
                    {entries.map((entry) =>
                      entry.kind === 'flight' ? (
                        <FlightRow key={`f-${entry.flight.id}`} flight={entry.flight} date={date} />
                      ) : (
                        <li key={entry.activity.id}>
                          <div>
                            <strong>
                              <span className="emoji">{activityEmoji(entry.activity.title, entry.activity.location)}</span>
                              {entry.activity.time && <span className="time">{entry.activity.time}</span>} {entry.activity.title}
                            </strong>
                            {entry.activity.location && <small>📍 {entry.activity.location}</small>}
                            {entry.activity.cost > 0 && <small>💰 {formatMoney(entry.activity.cost, entry.activity.currency)}</small>}
                          </div>
                        </li>
                      ),
                    )}
                  </ul>
                </section>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
