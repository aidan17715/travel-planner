import { listDays } from './dates.ts'
import type { Flight, ItineraryItem, Trip } from './types.ts'

export type Entry =
  | { kind: 'flight'; time: string; flight: Flight }
  | { kind: 'activity'; time: string; activity: ItineraryItem }

// Untimed entries sort last
export const sortTime = (t: string) => t || '99:99'

export const flightTime = (f: Flight, date: string) => sortTime(f.departDate === date ? f.departTime : f.arriveTime)

// Flights and activities share one timeline per day (flights win ties)
export function dayEntries(trip: Trip, date: string): Entry[] {
  const flights = date ? trip.flights.filter((f) => f.departDate === date || f.arriveDate === date) : []
  return [
    ...flights.map((flight): Entry => ({ kind: 'flight', time: flightTime(flight, date), flight })),
    ...trip.itinerary
      .filter((i) => i.date === date)
      .map((activity): Entry => ({ kind: 'activity', time: sortTime(activity.time), activity })),
  ].sort((a, b) => a.time.localeCompare(b.time))
}

export const staysOn = (trip: Trip, date: string) =>
  date ? trip.stays.filter((s) => s.startDate <= date && date <= s.endDate) : []

// Trip days plus any dates outside the range that still hold items, so nothing is lost
export function tripDays(trip: Trip) {
  const days = listDays(trip.startDate, trip.endDate)
  const inRange = new Set(days)
  const strayDates = [
    ...new Set([
      ...trip.itinerary.map((i) => i.date),
      ...trip.stays.flatMap((s) => [s.startDate, s.endDate]).filter(Boolean),
      ...trip.flights.flatMap((f) => [f.departDate, f.arriveDate]).filter(Boolean),
    ]),
  ]
    .filter((d) => !inRange.has(d))
    .sort()
  return { days, strayDates }
}
