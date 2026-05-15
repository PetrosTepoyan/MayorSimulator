// resolveTurn — the master per-turn orchestrator.
// Coordinates: taxes → budget → buildings → policies → districts → sectors → macro → citizens
// → factions → media → events → drift → game-over checks.

import type {
  GameState,
  CityStats,
  StatChange,
  StatKey,
  GameEvent,
  EventChoice,
} from './types'
import { applyDelta, clamp, clamp01 } from './util'
import { ALL_BUILDINGS } from './allBuildings'
import {
  computeTaxRevenue,
  computeBudgetEffects,
  computeBuildingEffects,
  computeNaturalDrift,
  computeDebtService,
  computeInflationDrift,
} from './simulation'
import { updateDistrictsPerTurn, aggregateFromDistricts } from './districts'
import { updateCitizensPerTurn, approvalFromCitizens } from './citizens'
import { updateFactionsPerTurn, applyFactionReactions } from './factions'
import { updateSectorsPerTurn } from './sectors'
import { updateMacroPerTurn, applyMacroToCityStats, maybeMacroShock } from './macro'
import { generateTurnHeadlines, updateOutletFavor, citizenEventToNews } from './media'
import { applyPolicyEffects } from './policies'
import { EVENTS } from './events'
import { EVENTS_EXTENDED } from './eventsExtended'

const ALL_EVENTS: GameEvent[] = [...EVENTS, ...EVENTS_EXTENDED]

const GOOD_IF_UP: StatKey[] = [
  'gdpPerCapita',
  'education',
  'health',
  'happiness',
  'approval',
  'innovation',
  'creditRating',
  'population',
  'treasury',
]

function delta(prev: CityStats, next: CityStats): StatChange[] {
  const out: StatChange[] = []
  for (const k of Object.keys(prev) as StatKey[]) {
    const d = (next[k] as number) - (prev[k] as number)
    if (Math.abs(d) > 0.05) out.push({ stat: k, delta: d, reason: '' })
  }
  return out
}

function merge(a: Partial<CityStats>, b: Partial<CityStats>): Partial<CityStats> {
  const out: Partial<CityStats> = { ...a }
  for (const k of Object.keys(b) as StatKey[]) {
    const v = (out[k] as number | undefined) ?? 0
    out[k] = (v + (b[k] as number)) as never
  }
  return out
}

// ============================================================================
// Main turn resolver
// ============================================================================

export function resolveTurn(state: GameState): GameState {
  if (state.gameOver) return state

  const prevStats = { ...state.stats }
  let working: CityStats = { ...state.stats }
  const reasons: string[] = []

  // ---- 1. Tax revenue ----
  const taxResult = computeTaxRevenue(state.tax, state.stats)
  working = applyDelta(working, { treasury: taxResult.revenue, ...taxResult.effects })
  reasons.push(`Tax revenue: +${taxResult.revenue.toFixed(1)} $M`)

  // ---- 2. Budget allocation effects ----
  const budgetResult = computeBudgetEffects(state.budget, taxResult.revenue)
  working = applyDelta(working, { treasury: -budgetResult.spend, ...budgetResult.effects })
  reasons.push(`Budget spend: -${budgetResult.spend.toFixed(1)} $M`)

  // ---- 3. Buildings — upkeep + per-turn effects ----
  const buildingResult = computeBuildingEffects(state)
  working = applyDelta(working, { treasury: -buildingResult.upkeep, ...buildingResult.effects })

  // ---- 4. Process construction queue ----
  const advancedBuilds: typeof state.queuedBuilds = []
  const newBuildings = [...state.buildings]
  for (const q of state.queuedBuilds) {
    if (q.turnsLeft <= 1) {
      newBuildings.push({ id: q.id, type: q.type, variant: q.variant, builtTurn: state.turn + 1, districtId: q.districtId })
      const def = ALL_BUILDINGS[q.type]
      if (def?.onBuiltEffect) working = applyDelta(working, def.onBuiltEffect)
      reasons.push(`Construction complete: ${def?.name ?? q.type}`)
    } else {
      advancedBuilds.push({ ...q, turnsLeft: q.turnsLeft - 1 })
    }
  }

  // ---- 5. Policy effects ----
  const policyResult = applyPolicyEffects(state.policy, state)
  working = applyDelta(working, policyResult.effects)

  // ---- 6. Sectors ----
  const sectorResult = updateSectorsPerTurn(state.sectors, state)
  working = applyDelta(working, {
    gdpPerCapita: sectorResult.gdpDelta,
    unemployment: sectorResult.unemploymentDelta,
    innovation: sectorResult.innovationDelta,
  })

  // ---- 7. Macro layer ----
  const macroUpdate = updateMacroPerTurn(state.macro, state.turn + 1)
  const macroEffects = applyMacroToCityStats(macroUpdate.macro, working)
  working = applyDelta(working, macroEffects.effects)
  let newMacro = macroUpdate.macro
  const shocked = maybeMacroShock(newMacro, state.turn + 1)
  if (shocked) newMacro = shocked

  // ---- 8. Districts ----
  const districtResult = updateDistrictsPerTurn(state.districts, working, state.policy, newBuildings)
  // Aggregate city stats from districts (population, crime, etc.)
  const agg = aggregateFromDistricts(districtResult.districts)
  // Blend aggregates into working stats (50/50 with current)
  working.population = Math.round((working.population + agg.population) / 2) || working.population
  working.education = (working.education + agg.education) / 2
  working.crime = (working.crime + agg.crime) / 2
  working.pollution = (working.pollution + agg.pollution) / 2
  working.inequality = (working.inequality + agg.inequality) / 2

  // ---- 9. Citizens — life events drive headlines ----
  const citizenResult = updateCitizensPerTurn(state.citizens, { ...state, stats: working })
  // Their aggregate opinion influences approval
  const citizenApproval = approvalFromCitizens(citizenResult.citizens)
  working.approval = clamp01((working.approval * 0.6) + (citizenApproval * 0.4))

  // ---- 10. Natural drift (feedback loops) ----
  const drift = computeNaturalDrift(working)
  working = applyDelta(working, drift.effects)
  reasons.push(...drift.notes)

  // ---- 11. Debt service ----
  const debt = computeDebtService(working)
  working = applyDelta(working, { treasury: -debt.interest, creditRating: debt.ratingShift })

  // ---- 12. Inflation drift ----
  const inflationDelta = computeInflationDrift(working, taxResult.revenue, budgetResult.spend + buildingResult.upkeep + debt.interest)
  working = applyDelta(working, { inflation: inflationDelta })

  // ---- 13. Factions tick ----
  const newFactions = updateFactionsPerTurn(state.factions, { ...state, stats: working })

  // ---- 14. Stat changes summary ----
  const changes = delta(prevStats, working)
  for (const c of changes) {
    c.reason = pickReason(c.stat, c.delta, reasons)
  }

  // ---- 15. Media: headlines + outlet favor ----
  const headlines = generateTurnHeadlines({ ...state, stats: working, mayorName: state.mayorName, cityName: state.cityName, turn: state.turn + 1 }, changes)
  const citizenNews = citizenResult.events.map((e) => citizenEventToNews(e, state.turn + 1))
  const newNews = [...state.news, ...headlines, ...citizenNews].slice(-100) // keep last 100
  const newOutlets = updateOutletFavor(state.outlets, changes)

  // ---- 16. Draw an event for next turn? ----
  let pendingEvent: GameEvent | null = null
  // Don't pile up if there's already a pending event
  if (!state.pendingEvent && state.eventsSeenThisTurn < 2) {
    if (Math.random() < 0.65) {
      pendingEvent = pickEvent(state, working)
    }
  }

  // ---- 17. Game-over checks ----
  let gameOver: GameState['gameOver'] = null
  if (working.approval < 18) {
    gameOver = 'recalled'
  } else if (working.treasury < -50 || (working.debt > 1500 && working.creditRating < 20)) {
    gameOver = 'bankrupt'
  } else if (working.health < 15) {
    gameOver = 'pandemicCollapse'
  } else if (working.crime > 92 && working.happiness < 25) {
    gameOver = 'civilUnrest'
  }

  // Check term limits (after 2 terms — promotion or end)
  const quartersPerTerm = state.termLengthYears * 4
  const nextTurn = state.turn + 1
  if (!gameOver && nextTurn > 0 && nextTurn % quartersPerTerm === 0) {
    const newTermsServed = state.termsServed + 1
    if (newTermsServed >= 2) {
      gameOver = working.approval > 60 ? 'termLimitWon' : 'termLimitLost'
    }
  }

  const next: GameState = {
    ...state,
    turn: nextTurn,
    termsServed: nextTurn % quartersPerTerm === 0 ? state.termsServed + 1 : state.termsServed,
    stats: working,
    buildings: newBuildings,
    queuedBuilds: advancedBuilds,
    districts: districtResult.districts,
    citizens: citizenResult.citizens,
    factions: newFactions,
    sectors: sectorResult.sectors,
    outlets: newOutlets,
    macro: newMacro,
    lastTurnChanges: changes,
    news: newNews,
    pendingEvent,
    eventsSeenThisTurn: 0,
    gameOver,
    approvalHistory: [...state.approvalHistory, working.approval].slice(-24),
    gdpHistory: [...state.gdpHistory, working.gdpPerCapita].slice(-24),
    inflationHistory: [...state.inflationHistory, working.inflation].slice(-24),
  }

  return next
}

// ============================================================================
// Apply event choice — mutates a state copy and returns it
// ============================================================================

export function applyEventChoice(state: GameState, event: GameEvent, choice: EventChoice): GameState {
  let working: CityStats = { ...state.stats }
  if (choice.cost) working = applyDelta(working, { treasury: -choice.cost })
  working = applyDelta(working, choice.effects)

  // Faction reactions from the choice (using statChange as proxy)
  const factionResult = applyFactionReactions(state.factions, {
    statChange: choice.effects,
    eventChoice: { eventId: event.id, choiceIndex: event.choices.indexOf(choice) },
  })

  // Add a news item summarizing the resolution
  const eventNews = {
    turn: state.turn,
    headline: `${event.title}: ${choice.outcome}`,
    tone: (choice.effects.approval ?? 0) > 0 ? 'good' as const : (choice.effects.approval ?? 0) < 0 ? 'bad' as const : 'neutral' as const,
    tags: [event.category],
  }

  return {
    ...state,
    stats: working,
    factions: factionResult.factions,
    news: [...state.news, eventNews].slice(-100),
    recentEventIds: [...state.recentEventIds, event.id].slice(-12),
  }
}

// ============================================================================
// Event picker — weighted by event.weight, country bias, and recent history
// ============================================================================

function pickEvent(state: GameState, _stats: CityStats): GameEvent | null {
  const candidates = ALL_EVENTS.filter((e) => !state.recentEventIds.includes(e.id))
  if (candidates.length === 0) return null
  const weighted = candidates.map((e) => {
    let w = e.weight
    if (e.countryBias?.[state.countryId]) w *= e.countryBias[state.countryId]
    return { event: e, weight: w }
  })
  const total = weighted.reduce((s, x) => s + x.weight, 0)
  let r = Math.random() * total
  for (const x of weighted) {
    r -= x.weight
    if (r <= 0) return x.event
  }
  return weighted[weighted.length - 1].event
}

export function drawEvent(state: GameState, eventId?: string): GameEvent | null {
  if (eventId) return ALL_EVENTS.find((e) => e.id === eventId) ?? null
  return pickEvent(state, state.stats)
}

// ============================================================================
// Helpers
// ============================================================================

function pickReason(stat: StatKey, _d: number, reasons: string[]): string {
  // Naive: pick the most relevant reason or empty
  const matchers: Record<string, string[]> = {
    treasury: ['Tax', 'Budget', 'upkeep', 'Construction'],
    crime: ['security', 'unemployment', 'inequality'],
    inflation: ['deficit', 'unemployment'],
    education: ['budget', 'school'],
    health: ['hospital', 'budget'],
  }
  const keys = matchers[stat] ?? []
  for (const r of reasons) {
    for (const k of keys) if (r.toLowerCase().includes(k.toLowerCase())) return r
  }
  return reasons[0] ?? ''
}

// Re-export for the store
export { GOOD_IF_UP }
