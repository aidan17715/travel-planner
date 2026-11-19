export interface ItineraryItem {
  id: string
  date: string
  time: string
  title: string
  location: string
  notes: string
  cost: number
}

export const EXPENSE_CATEGORIES = ['Flights', 'Stay', 'Food', 'Transport', 'Activities', 'Shopping', 'Other'] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export interface Expense {
  id: string
  description: string
  category: ExpenseCategory
  amount: number
}

// A hotel booking covering every day from startDate to endDate (inclusive). cost 0 means "not set".
export interface Stay {
  id: string
  name: string
  address: string
  notes: string
  startDate: string
  endDate: string
  checkInTime: string
  checkOutTime: string
  cost: number
}

export interface Flight {
  id: string
  label: string
  airline: string
  flightNumber: string
  bookingRef: string
  departDate: string
  departTime: string
  departAirport: string
  departTerminal: string
  arriveDate: string
  arriveTime: string
  arriveAirport: string
  arriveTerminal: string
  notes: string
  cost: number
}

export interface Trip {
  id: string
  name: string
  destination: string
  startDate: string
  endDate: string
  currency: string
  budget: number
  itinerary: ItineraryItem[]
  stays: Stay[]
  flights: Flight[]
  expenses: Expense[]
}
