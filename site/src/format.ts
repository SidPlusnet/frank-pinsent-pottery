/** 2800 -> "£28", 2850 -> "£28.50" */
export function price(pence: number): string {
  const pounds = pence / 100
  return '£' + (pence % 100 === 0 ? pounds.toFixed(0) : pounds.toFixed(2))
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2026-12-05" -> { day: "5", month: "Dec", year: "2026" } */
export function dateParts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return { day: String(d), month: MONTHS[m - 1] ?? '', year: String(y) }
}

export function dateRange(start: string, end: string | null): string {
  const a = dateParts(start)
  if (!end || end === start) return `${a.day} ${a.month} ${a.year}`
  const b = dateParts(end)
  if (a.month === b.month && a.year === b.year) return `${a.day}–${b.day} ${a.month} ${a.year}`
  return `${a.day} ${a.month} – ${b.day} ${b.month} ${b.year}`
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Split a plain-text description into paragraphs on blank lines. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}
