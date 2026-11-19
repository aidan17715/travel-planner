import { useCallback, useEffect, useState } from 'react'
import type { Trip } from './types.ts'

const KEY = 'travel-planner:trips:v1'

export const uid = () => crypto.randomUUID()

const normalize = (t: Partial<Trip>): Trip => ({
  id: t.id ?? uid(),
  name: t.name ?? 'Untitled trip',
  destination: t.destination ?? '',
  startDate: t.startDate ?? '',
  endDate: t.endDate ?? '',
  currency: t.currency ?? 'USD',
  budget: Number(t.budget) || 0,
  itinerary: t.itinerary ?? [],
  hotels: t.hotels ?? {},
  expenses: t.expenses ?? [],
  packing: t.packing ?? [],
})

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
