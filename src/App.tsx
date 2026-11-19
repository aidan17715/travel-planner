import { useRef, useState } from 'react'
import { TripList } from './components/TripList.tsx'
import { TripView } from './components/TripView.tsx'
import { exportTrips, importTrips, useTrips } from './storage.ts'
import './App.css'

export default function App() {
  const { trips, addTrip, updateTrip, deleteTrip, replaceAll } = useTrips()
  const [openId, setOpenId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const trip = trips.find((t) => t.id === openId)

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const imported = await importTrips(file)
      if (confirm(`Replace your current trips with ${imported.length} trip(s) from this file?`)) {
        replaceAll(imported)
        setOpenId(null)
      }
    } catch {
      alert('Could not read that file. Please choose a Travel Planner backup (.json).')
    }
  }

  return (
    <div className="app">
      <header>
        <h1>✈️ Travel Planner</h1>
        {!trip && (
          <div className="header-actions">
            <button onClick={() => exportTrips(trips)} disabled={trips.length === 0}>Export</button>
            <button onClick={() => fileRef.current?.click()}>Import</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
          </div>
        )}
      </header>
      <main>
        {trip ? (
          <TripView
            trip={trip}
            onChange={(patch) => updateTrip(trip.id, patch)}
            onDelete={() => {
              deleteTrip(trip.id)
              setOpenId(null)
            }}
            onBack={() => setOpenId(null)}
          />
        ) : (
          <TripList trips={trips} onOpen={setOpenId} onAdd={addTrip} />
        )}
      </main>
    </div>
  )
}
