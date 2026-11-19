import { useRef, useState } from 'react'
import { useCloud } from './cloud/useCloud.ts'
import { AccountBar, InviteBanner } from './components/Account.tsx'
import { Guide } from './components/Guide.tsx'
import { TripList } from './components/TripList.tsx'
import { TripView } from './components/TripView.tsx'
import { Tutorial } from './components/Tutorial.tsx'
import { buildExampleTrip } from './example.ts'
import { exportTrips, importTrips, useTrips } from './storage.ts'
import { TUTORIAL_STEPS } from './tutorial.ts'
import type { Trip } from './types.ts'
import './App.css'

export default function App() {
  const { trips, addTrip, updateTrip, deleteTrip, replaceAll, store } = useTrips()
  const cloud = useCloud(store, trips)
  const [openId, setOpenId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [tutorialStep, setTutorialStep] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const trip = trips.find((t) => t.id === openId)
  const tutorialOn = tutorialStep !== null && !!trip?.example

  const closeTrip = () => {
    setOpenId(null)
    setTutorialStep(null)
  }

  // Opens the example trip (adding it if it isn't there) and starts the guided tour
  const startTutorial = () => {
    let example = trips.find((t) => t.example)
    if (!example) {
      example = buildExampleTrip()
      addTrip(example)
    }
    setShowGuide(false)
    setOpenId(example.id)
    setTutorialStep(0)
  }

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const imported = await importTrips(file)
      // Shared trips live in the cloud, so an old backup must never overwrite them
      const shared = trips.filter((t) => t.cloud)
      const incoming = imported.filter((t) => !shared.some((s) => s.id === t.id))
      const note = shared.length > 0 ? ` Your ${shared.length} shared trip(s) stay as they are.` : ''
      if (confirm(`Replace your current trips with ${incoming.length} trip(s) from this file?${note}`)) {
        replaceAll([...shared, ...incoming])
        closeTrip()
      }
    } catch {
      alert('Could not read that file. Please choose a Travel Planner backup (.json).')
    }
  }

  // Deleting a shared trip also leaves it (or, for the owner, stops sharing it) in the cloud
  const removeTrip = async (t: Trip) => {
    if (t.cloud) {
      if (!cloud.engine) {
        alert('Go online and sign in to delete a shared trip.')
        return
      }
      try {
        if (t.cloud.ownerId === cloud.user?.id) await cloud.engine.stopSharing(t.id)
        else await cloud.engine.leave(t.id)
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Could not remove the shared trip. Try again.')
        return
      }
    }
    deleteTrip(t.id)
    closeTrip()
  }

  const joinedName = cloud.invite?.state === 'joined' ? trips.find((t) => t.id === (cloud.invite as { tripId: string }).tripId)?.name : undefined

  return (
    <div className={tutorialOn ? 'app has-tutorial' : 'app'}>
      <header>
        <h1>✈️ Travel Planner</h1>
        {!trip && (
          <div className="header-actions">
            <button onClick={() => setShowGuide(true)}>📖 Guide</button>
            <button onClick={() => exportTrips(trips)} disabled={trips.length === 0}>Export</button>
            <button onClick={() => fileRef.current?.click()}>Import</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
          </div>
        )}
      </header>
      {showGuide && <Guide sharingAvailable={cloud.configured} onStartTutorial={startTutorial} onClose={() => setShowGuide(false)} />}
      <InviteBanner cloud={cloud} tripName={joinedName} onOpen={setOpenId} />
      {!trip && cloud.invite?.state !== 'needsSignIn' && <AccountBar cloud={cloud} />}
      <main>
        {trip ? (
          <TripView
            // Remounting on each tutorial step switches to that step's tab or view
            key={tutorialOn ? `${trip.id}:${tutorialStep}` : trip.id}
            trip={trip}
            cloud={cloud}
            initialView={tutorialOn ? TUTORIAL_STEPS[tutorialStep].view : undefined}
            onChange={(patch) => updateTrip(trip.id, patch)}
            onDelete={() => void removeTrip(trip)}
            onBack={closeTrip}
          />
        ) : (
          <TripList trips={trips} onOpen={setOpenId} onAdd={addTrip} onGuide={() => setShowGuide(true)} />
        )}
      </main>
      {tutorialOn && <Tutorial step={tutorialStep} onStep={setTutorialStep} onClose={() => setTutorialStep(null)} />}
    </div>
  )
}
