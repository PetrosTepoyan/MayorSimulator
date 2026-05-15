// ============================================================================
// MayorSim — Macro System
// Forces beyond the mayor's direct control: national economy, federal funding,
// geopolitics, tech waves, climate. They modify city stats and event
// probabilities. They evolve via business cycles, occasional shocks, trends.
// ============================================================================

import type {
  MacroState,
  Country,
  CityStats,
  GeopoliticalState,
} from './types'
import { clamp, clamp01 } from './util'

// ----------------------------------------------------------------------------
// Internal types — kept private to this module. Mirrors the shape of an
// entry in MacroState.activeTrends; declared as a derived alias so we don't
// introduce any new exported types.
// ----------------------------------------------------------------------------

type MacroTrend = MacroState['activeTrends'][number]

// ----------------------------------------------------------------------------
// Deterministic-ish noise helpers. A tiny hash-based PRNG so that, given a
// seed, the noise is reproducible. When no seed is provided we fall back to
// Math.random — that's fine for runtime gameplay.
// ----------------------------------------------------------------------------

function mulberry32(seedInt: number): () => number {
  let a = seedInt >>> 0
  return function rng(): number {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeRng(seed?: number, turn = 0): () => number {
  if (seed === undefined) return Math.random
  // Mix turn into the seed so different turns get different streams.
  return mulberry32((seed * 2654435761) ^ (turn * 1597334677))
}

// Symmetric noise in [-amp, +amp].
function noise(rng: () => number, amp: number): number {
  return (rng() * 2 - 1) * amp
}

// Build a stable slug for a trend id from a name.
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function makeTrend(
  name: string,
  intensity: number,
  turnsRemaining: number,
  description: string,
): MacroTrend {
  return {
    id: slugify(name),
    name,
    intensity: clamp01(intensity),
    turnsRemaining: Math.max(0, Math.round(turnsRemaining)),
    description,
  }
}

// ----------------------------------------------------------------------------
// Defaults + per-country seed trends
// ----------------------------------------------------------------------------

const DEFAULT_MACRO: MacroState = {
  nationalGdpGrowth: 2.0,
  nationalInflation: 2.5,
  federalFunding: 5,
  geopolitical: 'calm',
  techWave: 50,
  climateRisk: 40,
  consumerConfidence: 60,
  activeTrends: [],
}

function seedTrendsForCountry(countryId: string): MacroTrend[] {
  switch (countryId) {
    case 'atlantica':
      return [
        makeTrend(
          'Polarization Era',
          60,
          20,
          'Sharp partisan divides amplify every controversy and dampen consensus.',
        ),
      ]
    case 'nordfjord':
      return [
        makeTrend(
          'Green Transition',
          70,
          30,
          'National push toward renewables; subsidies for clean industry, pressure on polluters.',
        ),
      ]
    case 'eastoria':
      return [
        makeTrend(
          'EU Convergence',
          50,
          20,
          'Grants and standards from the bloc reshape institutions; modernization rewarded.',
        ),
      ]
    case 'costaverde':
      return [
        makeTrend(
          'Currency Volatility',
          65,
          15,
          'The national currency swings on global flows; import prices and debt fluctuate.',
        ),
      ]
    case 'pacifica':
      return [
        makeTrend(
          'Aging Society',
          60,
          40,
          'A graying population strains pensions and healthcare; labor markets tighten.',
        ),
        makeTrend(
          'AI Surge',
          75,
          20,
          'Industrial AI rollout reshapes white-collar work and lifts tech output.',
        ),
      ]
    case 'sahel':
      return [
        makeTrend(
          'Resource Boom Risk',
          55,
          25,
          'Mineral prices are high — investment flows in, but Dutch-disease risks lurk.',
        ),
      ]
    default:
      return []
  }
}

// ----------------------------------------------------------------------------
// Public API — initialize macro state
// ----------------------------------------------------------------------------

export function generateMacroState(country: Country): MacroState {
  const overrides = country.startingMacro ?? {}
  // Apply defaults, then overrides. Trends are merged but de-duped by id.
  const baseTrends: MacroTrend[] = [...(overrides.activeTrends ?? [])]
  const seeded = seedTrendsForCountry(country.id)
  const trendIds = new Set(baseTrends.map((t) => t.id))
  for (const t of seeded) {
    if (!trendIds.has(t.id)) {
      baseTrends.push(t)
      trendIds.add(t.id)
    }
  }

  const macro: MacroState = {
    nationalGdpGrowth:
      overrides.nationalGdpGrowth ?? DEFAULT_MACRO.nationalGdpGrowth,
    nationalInflation:
      overrides.nationalInflation ?? DEFAULT_MACRO.nationalInflation,
    federalFunding: overrides.federalFunding ?? DEFAULT_MACRO.federalFunding,
    geopolitical: overrides.geopolitical ?? DEFAULT_MACRO.geopolitical,
    techWave: overrides.techWave ?? DEFAULT_MACRO.techWave,
    climateRisk: overrides.climateRisk ?? DEFAULT_MACRO.climateRisk,
    consumerConfidence:
      overrides.consumerConfidence ?? DEFAULT_MACRO.consumerConfidence,
    activeTrends: baseTrends,
  }

  return macro
}

// ----------------------------------------------------------------------------
// Per-turn business cycle, drifts, geopolitical transitions, trend evolution
// ----------------------------------------------------------------------------

// A small country-flavored baseline for gdp growth. Falls back to 2.0 when
// we don't recognize the trend's hint. Kept conservative — we don't have
// access to Country here, so we infer from existing macro level instead.
function gdpBaseline(macro: MacroState): number {
  // Anchor towards the macro's own midpoint. If a country is structurally a
  // higher-growth economy (e.g. starts at 3.0+), keep that as its center.
  // We compute a soft EMA-like anchor: the existing value's slow component.
  const anchor = 2.0
  // Use a fraction of the current level so countries that started higher
  // keep a higher mean over many turns.
  return anchor * 0.6 + macro.nationalGdpGrowth * 0.4
}

function nextGeopolitical(
  current: GeopoliticalState,
  climateRisk: number,
  rng: () => number,
): GeopoliticalState {
  const r = rng()
  if (current === 'calm') {
    // Base 6% chance to escalate; +2% if climate stress is high.
    const escalate = 0.06 + (climateRisk > 60 ? 0.02 : 0)
    if (r < escalate) return 'tense'
    return 'calm'
  }
  if (current === 'tense') {
    // 4% to crisis, 8% to calm, otherwise stay.
    if (r < 0.04) return 'crisis'
    if (r < 0.04 + 0.08) return 'calm'
    return 'tense'
  }
  // crisis
  if (r < 0.12) return 'tense'
  return 'crisis'
}

function maybeAddStateDrivenTrend(
  macro: MacroState,
  rng: () => number,
): MacroTrend | null {
  // 3% chance to add an ad-hoc trend that mirrors current macro conditions.
  if (rng() >= 0.03) return null

  // Only add if its slot isn't already taken.
  const has = (id: string) => macro.activeTrends.some((t) => t.id === id)

  if (macro.nationalInflation > 6 && !has('inflation-spiral')) {
    return makeTrend(
      'Inflation Spiral',
      Math.min(90, 60 + (macro.nationalInflation - 6) * 4),
      12,
      'Prices outrun wages; central bank tightening looms.',
    )
  }
  if (macro.geopolitical === 'crisis' && !has('geopolitical-shock')) {
    return makeTrend(
      'Geopolitical Shock',
      80,
      10,
      'Allies and adversaries posture; trade routes and supply lines wobble.',
    )
  }
  if (macro.techWave > 85 && !has('ai-surge')) {
    return makeTrend(
      'AI Surge',
      Math.min(95, macro.techWave),
      18,
      'Automation rolls through services and back offices, reshaping employment.',
    )
  }
  if (macro.climateRisk > 70 && !has('climate-stress')) {
    return makeTrend(
      'Climate Stress',
      Math.min(95, macro.climateRisk),
      20,
      'Heatwaves, fires, and floods intensify across the region.',
    )
  }
  return null
}

export function updateMacroPerTurn(
  macro: MacroState,
  turn: number,
  seed?: number,
): { macro: MacroState; notes: string[] } {
  const rng = makeRng(seed, turn)
  const notes: string[] = []

  // ---- Business cycle: ~24-quarter (~6-year) sine wave around baseline ----
  const baseline = gdpBaseline(macro)
  const cycle = 1.5 * Math.sin((turn * 2 * Math.PI) / 24)
  const gdpNoise = noise(rng, 0.3)
  const prevGdp = macro.nationalGdpGrowth
  const nextGdp = clamp(baseline + cycle + gdpNoise, -6, 8)

  // Recession / recovery notes
  if (prevGdp >= 0 && nextGdp < 0) {
    notes.push('National economy enters recession.')
  } else if (prevGdp < 0 && nextGdp >= 0) {
    notes.push('National economy returns to growth.')
  } else if (prevGdp < 3 && nextGdp >= 3) {
    notes.push('National economy is overheating; growth accelerates.')
  }

  // ---- Inflation: mean-revert toward 2.5, plus heat from hot cycles ----
  let nextInflation = macro.nationalInflation + (2.5 - macro.nationalInflation) * 0.05
  if (nextGdp > 3) nextInflation += 0.2
  nextInflation += noise(rng, 0.15)
  nextInflation = clamp(nextInflation, -2, 30)
  if (macro.nationalInflation < 6 && nextInflation >= 6) {
    notes.push('Inflation is heating up nationally.')
  } else if (macro.nationalInflation >= 6 && nextInflation < 6) {
    notes.push('Inflation pressures are easing.')
  }

  // ---- Consumer confidence ----
  const nextConfidence = clamp(
    50 + (nextGdp - 2) * 10 - (nextInflation - 2) * 5 + noise(rng, 10),
    0,
    100,
  )
  if (macro.consumerConfidence >= 50 && nextConfidence < 40) {
    notes.push('Consumer confidence collapses.')
  } else if (macro.consumerConfidence < 50 && nextConfidence >= 65) {
    notes.push('Consumer confidence rebounds.')
  }

  // ---- Federal funding: stable, occasional bumps ----
  let nextFunding = macro.federalFunding
  if (rng() < 0.05) {
    const direction = rng() < 0.5 ? -1 : 1
    const pct = 0.1 + rng() * 0.2 // 10–30%
    nextFunding = Math.max(0, macro.federalFunding * (1 + direction * pct))
    if (direction > 0) {
      notes.push('Federal grants increase this quarter.')
    } else {
      notes.push('Federal funding is trimmed this quarter.')
    }
  }

  // ---- Geopolitics ----
  const nextGeo = nextGeopolitical(macro.geopolitical, macro.climateRisk, rng)
  if (nextGeo !== macro.geopolitical) {
    if (nextGeo === 'tense' && macro.geopolitical === 'calm') {
      notes.push('Geopolitical tensions rising.')
    } else if (nextGeo === 'crisis') {
      notes.push('Geopolitical crisis erupts on the world stage.')
    } else if (nextGeo === 'calm' && macro.geopolitical === 'tense') {
      notes.push('Geopolitical tensions ease.')
    } else if (nextGeo === 'tense' && macro.geopolitical === 'crisis') {
      notes.push('The geopolitical crisis de-escalates to a tense standoff.')
    }
  }

  // ---- Tech wave: random walk ----
  const nextTech = clamp(macro.techWave + noise(rng, 2), 0, 100)
  if (macro.techWave < 80 && nextTech >= 80) {
    notes.push('A new wave of technology disruption is cresting.')
  } else if (macro.techWave >= 80 && nextTech < 70) {
    notes.push('The current tech wave subsides.')
  }

  // ---- Climate risk: slow drift up, occasional spike ----
  let nextClimate = macro.climateRisk + 0.2
  if (rng() < 0.04) {
    nextClimate += 4 + rng() * 6
    notes.push('A climate shock spike rattles the region.')
  }
  nextClimate += noise(rng, 0.5)
  nextClimate = clamp(nextClimate, 0, 100)
  if (macro.climateRisk < 70 && nextClimate >= 70) {
    notes.push('Climate risk is now critical.')
  }

  // ---- Evolve active trends ----
  const evolvedTrends: MacroTrend[] = []
  for (const t of macro.activeTrends) {
    const remaining = t.turnsRemaining - 1
    if (remaining <= 0) {
      notes.push(`Trend ends: ${t.name}.`)
      continue
    }
    const newIntensity = clamp01(t.intensity + noise(rng, 5))
    evolvedTrends.push({
      ...t,
      intensity: newIntensity,
      turnsRemaining: remaining,
    })
  }

  // ---- Tech-driven trend: high tech wave can spawn AI Disruption Wave ----
  if (nextTech > 80 && !evolvedTrends.some((t) => t.id === 'ai-disruption-wave')) {
    if (rng() < 0.08) {
      evolvedTrends.push(
        makeTrend(
          'AI Disruption Wave',
          Math.min(95, nextTech),
          16,
          'Sweeping automation reshapes industries and labor markets.',
        ),
      )
      notes.push('AI disruption wave begins reshaping industries.')
    }
  }

  // ---- 3% chance: state-driven ad-hoc trend ----
  const ephemeralMacro: MacroState = {
    ...macro,
    nationalGdpGrowth: nextGdp,
    nationalInflation: nextInflation,
    federalFunding: nextFunding,
    geopolitical: nextGeo,
    techWave: nextTech,
    climateRisk: nextClimate,
    consumerConfidence: nextConfidence,
    activeTrends: evolvedTrends,
  }
  const adHoc = maybeAddStateDrivenTrend(ephemeralMacro, rng)
  if (adHoc) {
    evolvedTrends.push(adHoc)
    notes.push(`New trend: ${adHoc.name}.`)
  }

  const next: MacroState = {
    nationalGdpGrowth: nextGdp,
    nationalInflation: nextInflation,
    federalFunding: nextFunding,
    geopolitical: nextGeo,
    techWave: nextTech,
    climateRisk: nextClimate,
    consumerConfidence: nextConfidence,
    activeTrends: evolvedTrends,
  }

  return { macro: next, notes }
}

// ----------------------------------------------------------------------------
// Per-turn effect of macro on city stats
// ----------------------------------------------------------------------------

export function applyMacroToCityStats(
  macro: MacroState,
  cityStats: CityStats,
): { effects: Partial<CityStats>; notes: string[] } {
  const effects: Partial<CityStats> = {}
  const notes: string[] = []

  // Inflation drift: city inflation drifts toward national by 10% per turn.
  const inflationDrift = (macro.nationalInflation - cityStats.inflation) * 0.1
  if (Math.abs(inflationDrift) > 0.01) {
    effects.inflation = inflationDrift
    if (inflationDrift > 0.05) {
      notes.push(
        `National inflation (${macro.nationalInflation.toFixed(1)}%) is pulling local prices up.`,
      )
    } else if (inflationDrift < -0.05) {
      notes.push(
        `National disinflation (${macro.nationalInflation.toFixed(1)}%) is easing local prices.`,
      )
    }
  }

  // GDP per capita: macro growth annualized to a quarterly nudge.
  // gdpGrowth is %/year; we approximate per-quarter $ delta as growth * 20.
  const gdpDelta = macro.nationalGdpGrowth * 20
  effects.gdpPerCapita = (effects.gdpPerCapita ?? 0) + gdpDelta
  if (macro.nationalGdpGrowth < 0) {
    notes.push('National contraction is dragging local incomes.')
  } else if (macro.nationalGdpGrowth > 3.5) {
    notes.push('Strong national growth is lifting local incomes.')
  }

  // Federal funding lands straight in the treasury.
  if (macro.federalFunding !== 0) {
    effects.treasury = (effects.treasury ?? 0) + macro.federalFunding
    if (macro.federalFunding >= 8) {
      notes.push(`Federal grants of $${macro.federalFunding.toFixed(0)}M flowing in.`)
    } else if (macro.federalFunding <= 2) {
      notes.push('Federal funding is thin this quarter.')
    }
  }

  // Geopolitical crisis: confidence drops, incomes dip, mood sours.
  if (macro.geopolitical === 'crisis') {
    effects.gdpPerCapita = (effects.gdpPerCapita ?? 0) - 50
    effects.happiness = (effects.happiness ?? 0) - 1
    notes.push('Geopolitical crisis weighs on the city.')
  } else if (macro.geopolitical === 'tense') {
    // Mild headwind.
    effects.happiness = (effects.happiness ?? 0) - 0.2
  }

  // Climate stress: pollution drifts up, happiness drifts down.
  if (macro.climateRisk > 70) {
    effects.pollution = (effects.pollution ?? 0) + 0.3
    effects.happiness = (effects.happiness ?? 0) - 0.2
    notes.push('High climate risk is straining the city.')
  }

  // Tech wave: rewards educated cities, otherwise widens inequality.
  if (macro.techWave > 80) {
    if (cityStats.education > 60) {
      effects.innovation = (effects.innovation ?? 0) + 0.3
      notes.push('The tech wave is paying off for an educated workforce.')
    } else {
      effects.inequality = (effects.inequality ?? 0) + 0.2
      notes.push('The tech wave is widening inequality without an educated base.')
    }
  }

  // Consumer confidence: very low/high adds small nudges to approval.
  if (macro.consumerConfidence < 30) {
    effects.approval = (effects.approval ?? 0) - 0.5
  } else if (macro.consumerConfidence > 80) {
    effects.approval = (effects.approval ?? 0) + 0.3
  }

  return { effects, notes }
}

// ----------------------------------------------------------------------------
// One-line UI description
// ----------------------------------------------------------------------------

function gdpPhrase(g: number): string {
  if (g < -1) return 'National economy in recession'
  if (g < 0.5) return 'National economy stalling'
  if (g < 2.0) return 'National economy slow'
  if (g < 3.5) return 'National economy growing'
  return 'National economy booming'
}

function geoPhrase(g: GeopoliticalState): string {
  switch (g) {
    case 'calm':
      return 'Calm abroad'
    case 'tense':
      return 'Tense'
    case 'crisis':
      return 'Geopolitical crisis'
  }
}

function fundingPhrase(f: number): string {
  if (f >= 10) return 'Federal grants flowing'
  if (f >= 5) return 'Federal funding steady'
  if (f >= 2) return 'Federal funding thin'
  return 'Federal funding scarce'
}

function techPhrase(t: number): string {
  if (t >= 80) return 'Tech wave high'
  if (t >= 60) return 'Tech wave rising'
  if (t >= 40) return 'Tech wave moderate'
  return 'Tech wave quiet'
}

function climatePhrase(c: number): string {
  if (c >= 80) return 'Climate risk severe'
  if (c >= 70) return 'Climate risk high'
  if (c >= 50) return 'Climate risk elevated'
  return 'Climate risk low'
}

function intensityTag(intensity: number): string {
  if (intensity >= 80) return 'severe'
  if (intensity >= 60) return 'strong'
  if (intensity >= 40) return 'moderate'
  return 'mild'
}

export function describeMacroEnvironment(macro: MacroState): string {
  const parts: string[] = [
    gdpPhrase(macro.nationalGdpGrowth),
    `Inflation ${macro.nationalInflation.toFixed(1)}%`,
    geoPhrase(macro.geopolitical),
    fundingPhrase(macro.federalFunding),
    techPhrase(macro.techWave),
    climatePhrase(macro.climateRisk),
  ]

  if (macro.activeTrends.length > 0) {
    const trendTags = macro.activeTrends
      .slice(0, 3)
      .map((t) => `${t.name} (${intensityTag(t.intensity)})`)
      .join(', ')
    parts.push(`Trends: ${trendTags}`)
  }

  return parts.join('; ')
}

// ----------------------------------------------------------------------------
// Shock injection — adds a high-intensity temporary trend.
// ----------------------------------------------------------------------------

interface ShockTemplate {
  name: string
  description: string
  baseIntensity: number
  baseTurns: number
}

const SHOCK_POOL: ShockTemplate[] = [
  {
    name: 'Banking Panic',
    description: 'Credit markets seize up; lenders pull back across sectors.',
    baseIntensity: 80,
    baseTurns: 8,
  },
  {
    name: 'Energy Price Spike',
    description: 'Fuel and power costs jump, squeezing households and industry.',
    baseIntensity: 75,
    baseTurns: 10,
  },
  {
    name: 'Supply Chain Disruption',
    description: 'Global logistics buckle; shortages ripple across goods.',
    baseIntensity: 70,
    baseTurns: 12,
  },
  {
    name: 'Currency Crash',
    description: 'The national currency plunges; imports and debt costs surge.',
    baseIntensity: 85,
    baseTurns: 8,
  },
  {
    name: 'Pandemic Wave',
    description: 'A new disease wave strains hospitals and disrupts work.',
    baseIntensity: 82,
    baseTurns: 14,
  },
  {
    name: 'Climate Disaster',
    description: 'A regional climate event causes widespread damage.',
    baseIntensity: 88,
    baseTurns: 10,
  },
  {
    name: 'AI Labor Shock',
    description: 'Sudden automation displaces a swath of white-collar workers.',
    baseIntensity: 78,
    baseTurns: 16,
  },
  {
    name: 'Trade War Escalation',
    description: 'Tariffs and retaliations disrupt exports and import costs.',
    baseIntensity: 76,
    baseTurns: 12,
  },
]

function pickShock(macro: MacroState, rng: () => number): ShockTemplate {
  // Bias the pool toward thematically relevant shocks.
  const weighted: Array<{ s: ShockTemplate; w: number }> = SHOCK_POOL.map((s) => {
    let w = 1
    if (macro.climateRisk > 70 && s.name === 'Climate Disaster') w += 3
    if (macro.techWave > 80 && s.name === 'AI Labor Shock') w += 3
    if (macro.geopolitical === 'crisis' && s.name === 'Trade War Escalation') w += 3
    if (macro.geopolitical === 'crisis' && s.name === 'Energy Price Spike') w += 2
    if (macro.nationalInflation > 6 && s.name === 'Currency Crash') w += 2
    if (macro.nationalGdpGrowth < 0 && s.name === 'Banking Panic') w += 2
    return { s, w }
  })
  const total = weighted.reduce((acc, x) => acc + x.w, 0)
  let r = rng() * total
  for (const item of weighted) {
    r -= item.w
    if (r <= 0) return item.s
  }
  return weighted[weighted.length - 1].s
}

export function maybeMacroShock(
  macro: MacroState,
  turn: number,
): MacroState | null {
  const rng = makeRng(undefined, turn)
  let probability = 0.02
  if (macro.techWave > 80) probability += 0.02
  if (macro.climateRisk > 70) probability += 0.02
  if (macro.geopolitical === 'crisis') probability += 0.05

  if (rng() >= probability) return null

  const template = pickShock(macro, rng)
  const intensity = clamp01(template.baseIntensity + noise(rng, 8))
  const turns = Math.max(4, Math.round(template.baseTurns + noise(rng, 3)))
  const shockTrend = makeTrend(template.name, intensity, turns, template.description)

  // Don't stack duplicates — if same id already active, refresh duration.
  const existingIdx = macro.activeTrends.findIndex((t) => t.id === shockTrend.id)
  let activeTrends: MacroTrend[]
  if (existingIdx >= 0) {
    activeTrends = macro.activeTrends.map((t, i) =>
      i === existingIdx
        ? {
            ...t,
            intensity: Math.max(t.intensity, shockTrend.intensity),
            turnsRemaining: Math.max(t.turnsRemaining, shockTrend.turnsRemaining),
          }
        : t,
    )
  } else {
    activeTrends = [...macro.activeTrends, shockTrend]
  }

  return {
    ...macro,
    activeTrends,
  }
}
