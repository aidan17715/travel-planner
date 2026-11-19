export interface ItineraryItem {
  id: string
  date: string
  time: string
  title: string
  location: string
  notes: string
}

export const EXPENSE_CATEGORIES = ['Flights', 'Stay', 'Food', 'Transport', 'Activities', 'Shopping', 'Other'] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export interface Expense {
  id: string
  description: string
  category: ExpenseCategory
  amount: number
}

export interface PackItem {
  id: string
  label: string
  packed: boolean
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
  expenses: Expense[]
  packing: PackItem[]
}
