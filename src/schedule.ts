import { listDays } from './dates.ts'
import type { Flight, ItineraryItem, Stay, Trip } from './types.ts'

export type Entry =
  | { kind: 'flight'; time: string; flight: Flight }
  | { kind: 'activity'; time: string; activity: ItineraryItem }
  | { kind: 'checkout'; time: string; stay: Stay }

// Untimed entries sort last
export const sortTime = (t: string) => t || '99:99'

export const flightTime = (f: Flight, date: string) => sortTime(f.departDate === date ? f.departTime : f.arriveTime)

// Flights, activities and hotel check-outs share one timeline per day (flights win ties).
// A check-out without a time is a morning task, so it goes first.
export function dayEntries(trip: Trip, date: string): Entry[] {
  const flights = date ? trip.flights.filter((f) => f.departDate === date || f.arriveDate === date) : []
  const checkouts = date ? trip.stays.filter((s) => s.endDate === date) : []
  return [
    ...flights.map((flight): Entry => ({ kind: 'flight', time: flightTime(flight, date), flight })),
    ...checkouts.map((stay): Entry => ({ kind: 'checkout', time: stay.checkOutTime || '00:00', stay })),
    ...trip.itinerary
      .filter((i) => i.date === date)
      .map((activity): Entry => ({ kind: 'activity', time: sortTime(activity.time), activity })),
  ].sort((a, b) => a.time.localeCompare(b.time))
}

// The hotel you sleep in on the night of `date`: from the check-in day up to, but not including,
// the check-out day. (A stay whose check-in and check-out are the same day still shows on that day.)
export const staysOn = (trip: Trip, date: string) =>
  date ? trip.stays.filter((s) => s.startDate <= date && (date < s.endDate || s.startDate === s.endDate)) : []

export const nightsOf = (s: Stay) => Math.max(listDays(s.startDate, s.endDate).length - 1, 0)

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
