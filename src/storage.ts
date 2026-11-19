import { useCallback, useEffect, useState } from 'react'
import { listDays } from './dates.ts'
import type { Flight, Stay, Trip } from './types.ts'

const KEY = 'travel-planner:trips:v1'

export const uid = () => crypto.randomUUID()

export const newFlight = (label: string, date: string, currency: string): Flight => ({
  id: uid(),
  label,
  airline: '',
  flightNumber: '',
  bookingRef: '',
  departDate: date,
  departTime: '',
  departAirport: '',
  departTerminal: '',
  arriveDate: date,
  arriveTime: '',
  arriveAirport: '',
  arriveTerminal: '',
  notes: '',
  cost: 0,
  currency,
})

// Every trip starts with an outbound flight on the start date and a return flight on the end date
export const defaultFlights = (start: string, end: string, currency: string): Flight[] => [
  newFlight('Outbound', start, currency),
  newFlight('Return', end, currency),
]

type LegacyHotels = Record<string, { name: string; address: string; notes: string }>

// Earlier versions stored one hotel per day; merge consecutive identical days into a single stay
function staysFromLegacy(hotels: LegacyHotels, currency: string): Stay[] {
  const stays: Stay[] = []
  for (const date of Object.keys(hotels).sort()) {
    const h = hotels[date]
    const last = stays[stays.length - 1]
    if (last && last.name === h.name && last.address === h.address && last.notes === h.notes && listDays(last.endDate, date).length === 2) {
      last.endDate = date
    } else {
      stays.push({ id: uid(), ...h, startDate: date, endDate: date, checkInTime: '', checkOutTime: '', cost: 0, currency })
    }
  }
  return stays
}

// Older data has no per-cost currency, so those costs take the trip's currency
const normalize = (t: Partial<Trip> & { hotels?: LegacyHotels }): Trip => {
  const startDate = t.startDate ?? ''
  const endDate = t.endDate ?? ''
  const currency = t.currency ?? 'SGD'
  return {
    id: t.id ?? uid(),
    name: t.name ?? 'Untitled trip',
    destination: t.destination ?? '',
    startDate,
    endDate,
    currency,
    itinerary: (t.itinerary ?? []).map((i) => ({ ...i, cost: Number(i.cost) || 0, currency: i.currency ?? currency })),
    stays: (t.stays ?? (t.hotels ? staysFromLegacy(t.hotels, currency) : [])).map((s) => ({ ...s, currency: s.currency ?? currency })),
    // The terminal "T" is now a fixed prefix in the UI, so older values like "T3" are stored as "3"
    flights: (t.flights ?? defaultFlights(startDate, endDate, currency)).map((f) => ({
      ...f,
      currency: f.currency ?? currency,
      departTerminal: f.departTerminal.replace(/^t\s*(?=\d)/i, ''),
      arriveTerminal: f.arriveTerminal.replace(/^t\s*(?=\d)/i, ''),
    })),
    expenses: (t.expenses ?? []).map((e) => ({ ...e, currency: e.currency ?? currency })),
    members: t.members ?? [],
    splits: t.splits ?? {},
    settlements: (t.settlements ?? []).map((s) => ({ ...s, currency: s.currency ?? currency })),
  }
}

function load(): Trip[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Partial<Trip>[]).map(normalize) : []
  } catch {
    return []
  }
}

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(trips))
  }, [trips])

  const addTrip = useCallback((trip: Trip) => setTrips((t) => [trip, ...t]), [])
  const updateTrip = useCallback(
    (id: string, patch: (trip: Trip) => Trip) => setTrips((t) => t.map((x) => (x.id === id ? patch(x) : x))),
    [],
  )
  const deleteTrip = useCallback((id: string) => setTrips((t) => t.filter((x) => x.id !== id)), [])
  const replaceAll = useCallback((next: Trip[]) => setTrips(next), [])

  return { trips, addTrip, updateTrip, deleteTrip, replaceAll }
}

export function exportTrips(trips: Trip[]) {
  const blob = new Blob([JSON.stringify(trips, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `travel-planner-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importTrips(file: File): Promise<Trip[]> {
  const data: unknown = JSON.parse(await file.text())
  if (!Array.isArray(data)) throw new Error('Not a valid backup file')
  return data.map((t: Partial<Trip>) => normalize(t))
}
