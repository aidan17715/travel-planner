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
          <summary>Start a trip</summary>
          <ul>
            <li>Tap <strong>+ New trip</strong>, enter a destination and the start and end dates, and choose your default currency.</li>
            <li>Tap a trip card to open it. You can change the dates any time from the top of the trip.</li>
            <li>Your trips are saved on your device and work offline.</li>
          </ul>
        </details>

        <details>
          <summary>📱 Add it to your phone's home screen</summary>
          <p>
            Adding the planner to your home screen gives it an app icon. It opens full screen, like a normal app, and keeps working
            offline. There's nothing to download from an app store.
          </p>
          <p className="muted">
            Do this from your phone's browser. If you opened the link inside another app (WhatsApp, Instagram, Telegram...), tap its
            menu and choose <em>Open in browser</em> (or <em>Open in Safari / Chrome</em>) first.
          </p>

          <h4>iPhone and iPad (Safari)</h4>
          <ol>
            <li>Open the Travel Planner link in <strong>Safari</strong>.</li>
            <li>Tap the <strong>Share</strong> button, the square with an arrow pointing up (at the bottom of the screen on iPhone, at the top on iPad).</li>
            <li>Scroll down the menu and tap <strong>Add to Home Screen</strong>. If you can't see it, scroll further or tap <em>More</em>.</li>
            <li>Keep the name <em>Travel Planner</em> (or rename it) and tap <strong>Add</strong> in the top right corner.</li>
            <li>Open the app from the new icon on your home screen.</li>
          </ol>

          <h4>Android (Chrome)</h4>
          <ol>
            <li>Open the Travel Planner link in <strong>Chrome</strong>.</li>
            <li>Tap the <strong>⋮</strong> menu in the top right corner.</li>
            <li>Tap <strong>Install app</strong>. On some phones it says <strong>Add to Home screen</strong> instead.</li>
            <li>Tap <strong>Install</strong> (or <strong>Add</strong>) to confirm. The icon appears on your home screen and in your app list.</li>
          </ol>
          <p className="muted">
            Using <strong>Samsung Internet</strong>? Tap the ≡ menu, then <em>Add page to</em>, then <em>Home screen</em>.
          </p>

          <h4>Good to know</h4>
          <ul>
            <li>
              <strong>On iPhone the home-screen app keeps its own separate copy of your trips</strong>, apart from Safari. Install it
              first and create your trips there. To bring trips you already made in Safari, use <strong>Export</strong> in Safari and
              <strong> Import</strong> in the app, or share the trip and sign in.
            </li>
            <li>The app updates itself. If something looks out of date, close it completely and open it again.</li>
            <li>To remove it, press and hold the icon and choose <em>Remove App</em> (iPhone) or <em>Uninstall</em> (Android). Your trips on that device go with it, so export a backup first.</li>
            <li>On a computer, open the link in Chrome or Edge and click the install icon in the address bar.</li>
          </ul>
        </details>

        <details>
          <summary>Itinerary: days, hotels and activities</summary>
          <ul>
            <li>Each day gets a card. Tap <strong>+ Add activity</strong> to add a time, place, notes and an optional cost. The emoji is picked from the activity name.</li>
            <li>Tap <strong>Edit</strong> on an activity to change it, or ✕ to delete it.</li>
            <li><strong>🏨 Hotel tonight</strong> shows where you sleep. Tap <strong>+ Add hotel</strong> and choose a check-in day and check-out day, with optional times and a cost. Use <em>Use for all days</em> for a single hotel.</li>
            <li>On the check-out day a <strong>🚪 Check out</strong> entry appears in the schedule, with the time if you gave one.</li>
            <li>Flights show up on the right day, in time order with your activities.</li>
          </ul>
        </details>

        <details>
          <summary>Flights</summary>
          <ul>
            <li>Every trip starts with an outbound and a return flight. Pick one from the side menu to fill it in, or tap <strong>+ Add flight</strong>.</li>
            <li>Enter flight number, airline, booking reference, times, airports and terminals. For terminals just type the number, the T is added for you.</li>
            <li>Choosing a departure date fills in the arrival date, which you can change for overnight flights.</li>
          </ul>
        </details>

        <details>
          <summary>Expenses</summary>
          <ul>
            <li>The <strong>Expenses</strong> tab totals everything you spent, per currency. Nothing is converted between currencies.</li>
            <li>Costs you enter on hotels, flights and activities are included automatically. Add anything else with <strong>Add expense</strong>.</li>
            <li>Every cost has its own currency. The ones you used recently appear at the top of the list.</li>
            <li>The ring chart shows where your money goes, by category.</li>
          </ul>
        </details>

        <details>
          <summary>Split costs with friends</summary>
          <ul>
            <li>In the Expenses tab, switch to <strong>Split mode</strong> and add the people on the trip.</li>
            <li>For each cost, choose who paid and who to split with: equally, or with custom amounts. Use <strong>Add an expense</strong> to add and split a cost in one go.</li>
            <li><strong>Balances</strong> show who is owed money and who owes. <strong>Who owes who</strong> lists the payments, one line per currency.</li>
            <li>Press <strong>Settle up</strong> to record a payment. Turn on <strong>Simplify debts</strong> to reduce the number of payments.</li>
          </ul>
        </details>

        <details>
          <summary>Overview</summary>
          <ul>
            <li>Tap <strong>🗺️ Overview</strong> inside a trip to see all days side by side, each with its hotel, flights and activities.</li>
          </ul>
        </details>

        {sharingAvailable && (
          <details>
            <summary>Plan together</summary>
            <ul>
              <li>Tap <strong>Sign in with Google</strong> on the main screen, then open a trip and tap <strong>👥 Share → Turn on sharing</strong>.</li>
              <li>Create an <strong>invite link</strong> and send it to friends. Anyone who opens it and signs in can edit the trip.</li>
              <li>Edits sync across devices within a second or two. Only people with a valid link can see the trip, and you can revoke links or remove people any time.</li>
            </ul>
          </details>
        )}

        <details>
          <summary>Back up and move between devices</summary>
          <ul>
            <li><strong>Back up:</strong> on the main screen, <strong>Export</strong> saves all your trips to a file and <strong>Import</strong> restores them (it replaces the trips on that device).</li>
            {sharingAvailable && <li>For live sync between devices, share the trip and sign in on each device instead.</li>}
          </ul>
        </details>
      </div>
    </div>
  )
}
