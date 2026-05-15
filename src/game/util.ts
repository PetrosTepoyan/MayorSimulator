import type { CityStats, StatKey } from './types'

export const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n))

export const clamp01 = (n: number) => clamp(n, 0, 100)

export const formatMoney = (m: number): string => {
  const abs = Math.abs(m)
  const sign = m < 0 ? '-' : ''
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}B`
  if (abs >= 1) return `${sign}$${abs.toFixed(0)}M`
  return `${sign}$${(abs * 1000).toFixed(0)}K`
}

export const formatPct = (n: number, digits = 1) => `${n.toFixed(digits)}%`

export const formatPop = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return `${n}`
}

export const quarterToDate = (turn: number, startYear = 2025): string => {
  const year = startYear + Math.floor(turn / 4)
  const q = (turn % 4) + 1
  return `Q${q} ${year}`
}

// Apply partial deltas to a stats object, clamping where appropriate.
const CLAMPED_0_100: StatKey[] = [
  'unemployment',
  'creditRating',
  'education',
  'health',
  'happiness',
  'approval',
  'crime',
  'pollution',
  'innovation',
  'inequality',
]

export function applyDelta(
  base: CityStats,
  delta: Partial<CityStats>,
): CityStats {
  const next = { ...base }
  for (const key of Object.keys(delta) as StatKey[]) {
    const d = delta[key]
    if (d === undefined) continue
    const raw = (next[key] as number) + d
    if (CLAMPED_0_100.includes(key)) {
      next[key] = clamp01(raw) as never
    } else if (key === 'inflation') {
      next[key] = clamp(raw, -5, 30)
    } else if (key === 'population') {
      next[key] = Math.max(0, Math.round(raw)) as never
    } else {
      next[key] = raw as never
    }
  }
  return next
}

// Weighted random pick. Items must have a numeric `weight`.
export function weightedPick<T extends { weight: number }>(
  items: T[],
  rng: () => number = Math.random,
): T | null {
  if (items.length === 0) return null
  const total = items.reduce((s, i) => s + i.weight, 0)
  if (total <= 0) return null
  let r = rng() * total
  for (const item of items) {
    r -= item.weight
    if (r <= 0) return item
  }
  return items[items.length - 1]
}

export const uid = (() => {
  let n = 0
  return (prefix = 'id') => `${prefix}_${++n}_${Date.now().toString(36)}`
})()
