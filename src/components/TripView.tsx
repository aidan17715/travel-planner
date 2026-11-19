import { useState } from 'react'
import type { Cloud } from '../cloud/useCloud.ts'
import type { Trip } from '../types.ts'
import { SyncBadge } from './Account.tsx'
import { Budget } from './Budget.tsx'
import { Flights } from './Flights.tsx'
import { Itinerary } from './Itinerary.tsx'
import { Overview } from './Overview.tsx'
import { ShareDialog } from './ShareDialog.tsx'
import type { TutorialView } from '../tutorial.ts'

interface Props {
  trip: Trip
  cloud: Cloud
  // Which screen to start on; the tutorial uses this to walk through the app
  initialView?: TutorialView
  onChange: (patch: (t: Trip) => Trip) => void
  onDelete: () => void
  onBack: () => void
}

const TABS = ['Itinerary', 'Flights', 'Expenses'] as const
type Tab = (typeof TABS)[number]

export function TripView({ trip, cloud, initialView, onChange, onDelete, onBack }: Props) {
  const [tab, setTab] = useState<Tab>(initialView?.tab ?? 'Itinerary')
  const [showOverview, setShowOverview] = useState(initialView?.overview ?? false)
  const [showShare, setShowShare] = useState(false)

  const isOwner = !!trip.cloud && trip.cloud.ownerId === cloud.user?.id

  const confirmDelete = () => {
    const message = !trip.cloud
      ? `Delete "${trip.name}"? This cannot be undone.`
      : isOwner
        ? `Delete "${trip.name}"? It's shared, so this also deletes it for everyone who joined. This cannot be undone.`
        : `Remove "${trip.name}" from your trips? You'll leave the shared trip. Others keep it.`
    if (confirm(message)) onDelete()
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
        <button className="primary" onClick={() => setShowOverview(true)}>🗺️ Overview</button>
        {cloud.configured && <button onClick={() => setShowShare(true)}>{trip.cloud ? '👥 Shared' : '👥 Share'}</button>}
        <button className="danger" onClick={confirmDelete}>Delete</button>
      </div>
      {showOverview && <Overview trip={trip} onClose={() => setShowOverview(false)} />}
      {showShare && <ShareDialog trip={trip} cloud={cloud} onClose={() => setShowShare(false)} />}
      <h2>{trip.name}</h2>
      <p className="muted">
        {trip.destination}
        {trip.cloud && <> · <SyncBadge cloud={cloud} /></>}
      </p>

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
      {tab === 'Expenses' && <Budget trip={trip} onChange={onChange} startInSplit={initialView?.split} />}
    </section>
  )
}
