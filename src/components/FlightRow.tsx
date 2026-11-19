import type { Flight } from '../types.ts'

const place = (airport: string, terminal: string) => [airport, terminal && `(T${terminal})`].filter(Boolean).join(' ')

export function FlightRow({ flight: f, date }: { flight: Flight; date: string }) {
  const legs = [
    f.departDate === date && { verb: 'Departs', time: f.departTime, where: place(f.departAirport, f.departTerminal) },
    f.arriveDate === date && { verb: 'Arrives', time: f.arriveTime, where: place(f.arriveAirport, f.arriveTerminal) },
  ].filter((l) => !!l)
  const extra = [f.airline, f.bookingRef && `Ref ${f.bookingRef}`].filter(Boolean).join(' · ')

  return (
    <li className="flight">
      <div>
        <strong>
          <span className="emoji">✈️</span>
          {[f.label, f.flightNumber].filter(Boolean).join(' · ') || 'Flight'}
        </strong>
        {legs.map((l) => (
          <div className="leg" key={l.verb}>
            <span className="leg-verb">{l.verb}</span>
            {l.time && <span className="big-time">{l.time}</span>}
            {l.where && <span>{l.where}</span>}
          </div>
        ))}
        {extra && <small>{extra}</small>}
      </div>
    </li>
  )
}
