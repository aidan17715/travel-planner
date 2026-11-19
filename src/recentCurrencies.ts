const KEY = 'travel-planner:recent-currencies'
const MAX_RECENT = 4

export function getRecentCurrencies(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string').slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

// Shared across all trips so the picker always surfaces what you used last
export function rememberCurrency(code: string) {
  const next = [code, ...getRecentCurrencies().filter((c) => c !== code)].slice(0, MAX_RECENT)
  localStorage.setItem(KEY, JSON.stringify(next))
}
