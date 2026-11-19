const MAX_DAYS = 120

// Returns each date (YYYY-MM-DD) from start to end inclusive; empty if the range is invalid.
export function listDays(start: string, end: string): string[] {
  if (!start || !end || end < start) return []
  const [y, m, d] = start.split('-').map(Number)
  const days: string[] = []
  for (let i = 0; i < MAX_DAYS; i++) {
    const iso = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10)
    days.push(iso)
    if (iso >= end) break
  }
  return days
}

export const fmtDate = (d: string) =>
  d ? new Date(d + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : 'Unscheduled'
