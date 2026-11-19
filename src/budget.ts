import type { ExpenseCategory, Trip } from './types.ts'

export interface Line {
  id: string
  description: string
  category: ExpenseCategory
  amount: number
  currency: string
  // Set for costs that come from the Itinerary or Flights tabs; those are edited there
  source?: string
}

// Every cost in the trip: hotel, flight and activity costs plus manual expenses
export function budgetLines(trip: Trip): Line[] {
  return [
    ...trip.stays
      .filter((s) => s.cost > 0)
      .map((s) => ({ id: `stay-${s.id}`, description: s.name, category: 'Stay' as const, amount: s.cost, currency: s.currency, source: 'Hotel' })),
    ...trip.flights
      .filter((f) => f.cost > 0)
      .map((f) => ({
        id: `flight-${f.id}`,
        description: [f.label, f.flightNumber].filter(Boolean).join(' · ') || 'Flight',
        category: 'Flights' as const,
        amount: f.cost,
        currency: f.currency,
        source: 'Flights tab',
      })),
    ...trip.itinerary
      .filter((a) => a.cost > 0)
      .map((a) => ({
        id: `activity-${a.id}`,
        description: a.title,
        category: 'Activities' as const,
        amount: a.cost,
        currency: a.currency,
        source: 'Itinerary',
      })),
    ...trip.expenses,
  ]
}

// Currencies in use, with the trip's default currency first and the rest alphabetical
export function currenciesIn(trip: Trip, codes: string[]): string[] {
  return [...new Set(codes)].sort((a, b) => (a === trip.currency ? -1 : b === trip.currency ? 1 : a.localeCompare(b)))
}

export const sumLines = (lines: Line[]) => lines.reduce((s, l) => s + l.amount, 0)
