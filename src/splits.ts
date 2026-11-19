import type { Line } from './budget.ts'
import type { Member, Settlement, Split, Trip } from './types.ts'

// All maths is done in whole cents to avoid floating point drift
export const toCents = (n: number) => Math.round(n * 100)
export const fromCents = (c: number) => c / 100

// Splits `total` cents proportionally to `weights`, handing leftover cents to the largest remainders
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum <= 0) return weights.map(() => 0)
  const raw = weights.map((w) => (total * w) / sum)
  const result = raw.map(Math.floor)
  let leftover = total - result.reduce((a, b) => a + b, 0)
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (const { i } of order) {
    if (leftover <= 0) break
    result[i] += 1
    leftover -= 1
  }
  return result
}

// Cents owed by each member for one cost. Custom amounts that no longer add up
// (e.g. the cost was edited later) are scaled proportionally.
export function sharesFor(amount: number, split: Split, memberIds: Set<string>): Record<string, number> {
  const ids = (split.mode === 'equal' ? split.among : Object.keys(split.amounts)).filter((id) => memberIds.has(id))
  const weights = split.mode === 'equal' ? ids.map(() => 1) : ids.map((id) => toCents(split.amounts[id]))
  const cents = allocate(toCents(amount), weights)
  return Object.fromEntries(ids.map((id, i) => [id, cents[i]]))
}

export interface Balances {
  paid: Record<string, number>
  owed: Record<string, number>
  net: Record<string, number>
  unsplit: Line[]
}

export function computeBalances(trip: Trip, lines: Line[]): Balances {
  const ids = new Set(trip.members.map((m) => m.id))
  const paid: Record<string, number> = {}
  const owed: Record<string, number> = {}
  const unsplit: Line[] = []

  for (const m of trip.members) {
    paid[m.id] = 0
    owed[m.id] = 0
  }

  for (const line of lines) {
    const split = trip.splits[line.id]
    const shares = split && ids.has(split.paidBy) ? sharesFor(line.amount, split, ids) : {}
    if (Object.keys(shares).length === 0) {
      unsplit.push(line)
      continue
    }
    paid[split.paidBy] += toCents(line.amount)
    for (const [id, c] of Object.entries(shares)) owed[id] += c
  }

  const net: Record<string, number> = {}
  for (const m of trip.members) net[m.id] = paid[m.id] - owed[m.id]
  // A settlement moves money from the debtor to the creditor, so it reduces both balances
  for (const s of trip.settlements) {
    if (s.from in net && s.to in net) {
      net[s.from] += toCents(s.amount)
      net[s.to] -= toCents(s.amount)
    }
  }

  return { paid, owed, net, unsplit }
}

export interface Transfer {
  from: string
  to: string
  amount: number
}

// Fewest-payments settlement: repeatedly match the biggest debtor with the biggest creditor
export function simplifyDebts(net: Record<string, number>): Transfer[] {
  const creditors = Object.entries(net).filter(([, v]) => v > 0).map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v)
  const debtors = Object.entries(net).filter(([, v]) => v < 0).map(([id, v]) => ({ id, v: -v })).sort((a, b) => b.v - a.v)
  const transfers: Transfer[] = []

  let i = 0
  let j = 0
  while (i < creditors.length && j < debtors.length) {
    const amount = Math.min(creditors[i].v, debtors[j].v)
    if (amount > 0) transfers.push({ from: debtors[j].id, to: creditors[i].id, amount })
    creditors[i].v -= amount
    debtors[j].v -= amount
    if (creditors[i].v === 0) i++
    if (debtors[j].v === 0) j++
  }
  return transfers
}

// True if the member appears in any split or settlement, so removing them would corrupt balances
export function memberInUse(trip: Trip, id: string): boolean {
  const inSplit = Object.values(trip.splits).some(
    (s) => s.paidBy === id || s.among.includes(id) || id in s.amounts,
  )
  return inSplit || trip.settlements.some((s: Settlement) => s.from === id || s.to === id)
}

export const memberName = (members: Member[], id: string) => members.find((m) => m.id === id)?.name ?? 'Unknown'
