import { useEffect } from 'react'

interface Props {
  sharingAvailable: boolean
  onStartTutorial: () => void
  onClose: () => void
}

export function Guide({ sharingAvailable, onStartTutorial, onClose }: Props) {
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
    <div className="overlay" role="dialog" aria-modal="true" aria-label="How to use Travel Planner">
      <div className="dialog guide">
        <div className="overlay-head">
          <div>
            <h2>📖 How to use Travel Planner</h2>
            <p className="muted">Plan trips, track costs and split bills with friends.</p>
          </div>
          <button className="primary" onClick={onClose}>Close</button>
        </div>

        <div className="panel">
          <strong>Learn by doing</strong>
          <p className="muted">
            Open an example trip that has everything filled in, with a short guided tour that walks through each part of the app.
          </p>
          <button className="primary" onClick={onStartTutorial}>▶ Start the example trip and tutorial</button>
        </div>

        <details open>
          <summary>1. Start a trip</summary>
          <ul>
            <li>Tap <strong>+ New trip</strong>, enter a destination and the start and end dates, and choose your default currency.</li>
            <li>Tap a trip card to open it. You can change the dates any time from the top of the trip.</li>
            <li>Your trips are saved on your device and work offline.</li>
          </ul>
        </details>

        <details>
          <summary>2. Itinerary: days, hotels and activities</summary>
          <ul>
            <li>Each day gets a card. Tap <strong>+ Add activity</strong> to add a time, place, notes and an optional cost. The emoji is picked from the activity name.</li>
            <li>Tap <strong>Edit</strong> on an activity to change it, or ✕ to delete it.</li>
            <li><strong>🏨 Hotel tonight</strong> shows where you sleep. Tap <strong>+ Add hotel</strong> and choose a check-in day and check-out day, with optional times and a cost. Use <em>Use for all days</em> for a single hotel.</li>
            <li>On the check-out day a <strong>🚪 Check out</strong> entry appears in the schedule, with the time if you gave one.</li>
            <li>Flights show up on the right day, in time order with your activities.</li>
          </ul>
        </details>

        <details>
          <summary>3. Flights</summary>
          <ul>
            <li>Every trip starts with an outbound and a return flight. Pick one from the side menu to fill it in, or tap <strong>+ Add flight</strong>.</li>
            <li>Enter flight number, airline, booking reference, times, airports and terminals. For terminals just type the number, the T is added for you.</li>
            <li>Choosing a departure date fills in the arrival date, which you can change for overnight flights.</li>
          </ul>
        </details>

        <details>
          <summary>4. Expenses</summary>
          <ul>
            <li>The <strong>Expenses</strong> tab totals everything you spent, per currency. Nothing is converted between currencies.</li>
            <li>Costs you enter on hotels, flights and activities are included automatically. Add anything else with <strong>Add expense</strong>.</li>
            <li>Every cost has its own currency. The ones you used recently appear at the top of the list.</li>
            <li>The ring chart shows where your money goes, by category.</li>
          </ul>
        </details>

        <details>
          <summary>5. Split costs with friends</summary>
          <ul>
            <li>In the Expenses tab, switch to <strong>Split mode</strong> and add the people on the trip.</li>
            <li>For each cost, choose who paid and who to split with: equally, or with custom amounts. Use <strong>Add an expense</strong> to add and split a cost in one go.</li>
            <li><strong>Balances</strong> show who is owed money and who owes. <strong>Who owes who</strong> lists the payments, one line per currency.</li>
            <li>Press <strong>Settle up</strong> to record a payment. Turn on <strong>Simplify debts</strong> to reduce the number of payments.</li>
          </ul>
        </details>

        <details>
          <summary>6. Overview</summary>
          <ul>
            <li>Tap <strong>🗺️ Overview</strong> inside a trip to see all days side by side, each with its hotel, flights and activities.</li>
          </ul>
        </details>

        {sharingAvailable && (
          <details>
            <summary>7. Plan together</summary>
            <ul>
              <li>Tap <strong>Sign in with Google</strong> on the main screen, then open a trip and tap <strong>👥 Share → Turn on sharing</strong>.</li>
              <li>Create an <strong>invite link</strong> and send it to friends. Anyone who opens it and signs in can edit the trip.</li>
              <li>Edits sync across devices within a second or two. Only people with a valid link can see the trip, and you can revoke links or remove people any time.</li>
            </ul>
          </details>
        )}

        <details>
          <summary>{sharingAvailable ? '8' : '7'}. Install, back up and move between devices</summary>
          <ul>
            <li><strong>Install:</strong> in your browser's menu choose <em>Install app</em> or <em>Add to Home screen</em>. It then opens like a normal app and works offline.</li>
            <li><strong>Back up:</strong> on the main screen, <strong>Export</strong> saves all your trips to a file and <strong>Import</strong> restores them (it replaces the trips on that device).</li>
            {sharingAvailable && <li>For live sync between devices, share the trip and sign in on each device instead.</li>}
          </ul>
        </details>
      </div>
    </div>
  )
}
