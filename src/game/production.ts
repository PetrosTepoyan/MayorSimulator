// ============================================================================
// MayorSim — Production & Supply Chain Subsystem
// Models manufacturing capacity, port throughput, supply chain resilience,
// raw material reserves, energy security, trade balance, automation, and
// workplace conditions. Drives the industrial sector.
// ============================================================================

import type { CityStats, GameState, PolicyState } from './types'
import { clamp, clamp01 } from './util'

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export interface ProductionState {
  manufacturingCapacity: number    // 0-100 utilization
  industrialOutput: number          // $M/quarter
  portThroughputIndex: number       // 0-100 (only meaningful for coastal cities)
  supplyChainResilience: number     // 0-100 (high = diversified suppliers)
  rawMaterialReserves: number       // 0-100 (city-stockpiled essentials)
  energySecurity: number            // 0-100 (diversification of energy supply)
  tradeBalance: number              // -100..+100 imports vs exports
  industrialAutomation: number      // 0-100
  workplaceAccidents: number        // per 10k workers
  unionDensity: number              // 0-100 % workforce
}

// ============================================================================
// LOCAL TYPES & CONSTANTS
// ============================================================================

interface CountryProductionProfile {
  readonly tradeBalance: number
  readonly unionDensity: number
}

const COUNTRY_PROFILES: Readonly<Record<string, CountryProductionProfile>> = {
  pacifica: { tradeBalance: 30, unionDensity: 25 },
  costaverde: { tradeBalance: -10, unionDensity: 25 },
  nordfjord: { tradeBalance: 10, unionDensity: 60 },
  eastoria: { tradeBalance: 5, unionDensity: 60 },
}

const DEFAULT_PROFILE: CountryProductionProfile = {
  tradeBalance: 0,
  unionDensity: 25,
}

// Clamp a value to the -100..+100 trade balance range.
const clampTrade = (n: number): number => clamp(n, -100, 100)

// Clamp an accidents-per-10k value to a reasonable non-negative ceiling.
const clampAccidents = (n: number): number => clamp(n, 0, 100)

// Resolve the country-specific defaults for a city. Falls back gracefully.
function profileFor(countryId: string | undefined): CountryProductionProfile {
  if (!countryId) return DEFAULT_PROFILE
  return COUNTRY_PROFILES[countryId] ?? DEFAULT_PROFILE
}

// ============================================================================
// GENERATION
// ============================================================================

/**
 * Build an initial ProductionState from base stats + policy. Country-specific
 * defaults can be applied later by callers via `generateProductionStateFor`,
 * but this base signature is what the spec asks for.
 */
export function generateProductionState(
  stats: CityStats,
  policy: PolicyState,
): ProductionState {
  const manufacturingCapacity = clamp01(
    65 + (stats.gdpPerCapita > 30000 ? 10 : -5),
  )

  const industrialOutput =
    stats.gdpPerCapita * stats.population * 0.000015

  const portThroughputIndex = 50

  const supplyChainResilience = 60

  const rawMaterialReserves = 50

  const energySecurity = clamp01(50 + (stats.innovation > 60 ? 15 : 0))

  const tradeBalance = 0

  const industrialAutomation = clamp01(30 + (stats.innovation - 50) * 0.4)

  // Strict emissions implies stronger safety regs → fewer accidents; lax
  // emissions correlates with looser industrial oversight.
  let workplaceAccidents = 8
  if (policy.emissionStandards === 'strict') workplaceAccidents -= 2
  else if (policy.emissionStandards === 'lax') workplaceAccidents += 2

  const unionDensity = 25

  return Object.freeze({
    manufacturingCapacity,
    industrialOutput: Math.max(0, industrialOutput),
    portThroughputIndex,
    supplyChainResilience,
    rawMaterialReserves,
    energySecurity,
    tradeBalance,
    industrialAutomation,
    workplaceAccidents: clampAccidents(workplaceAccidents),
    unionDensity,
  })
}

/**
 * Country-aware generator. Useful at game init when the country preset is
 * available. Applies country baselines (e.g. nordfjord high union density).
 */
export function generateProductionStateFor(
  stats: CityStats,
  policy: PolicyState,
  countryId: string,
): ProductionState {
  const base = generateProductionState(stats, policy)
  const profile = profileFor(countryId)
  return Object.freeze({
    ...base,
    tradeBalance: clampTrade(profile.tradeBalance),
    unionDensity: clamp01(profile.unionDensity),
  })
}

// ============================================================================
// PER-TURN UPDATE
// ============================================================================

/**
 * Advance the production subsystem by one quarter. Returns the next
 * ProductionState (immutable, frozen), the city-stat effects to fold back
 * into CityStats, and a list of human-readable causal notes.
 */
export function updateProductionPerTurn(
  prod: ProductionState,
  state: GameState,
): { production: ProductionState; effects: Partial<CityStats>; notes: string[] } {
  const notes: string[] = []
  const { stats, buildings, budget, macro, policy, sectors } = state

  // --- Industrial parks: capacity & output boosts ----------------------------
  const industrialParks = buildings.filter(
    (b) => b.type === 'industrialPark',
  ).length
  const parkCapacityBoost = industrialParks * 5
  const parkOutputGrowth = industrialParks * 0.4

  // --- Infrastructure budget feeds ports & supply chain ----------------------
  // Budget categories are 0..100 sliders; treat >50 as net-positive.
  const infraPressure = (budget.infrastructure - 50) / 50 // -1..+1
  const portBoost = infraPressure * 3 // ±3 per turn near extremes
  const supplyChainBoost = infraPressure * 2

  // --- Geopolitics: crisis disrupts supply chains and reserves ---------------
  let supplyChainDelta = supplyChainBoost
  let reservesDelta = 0
  if (macro.geopolitical === 'crisis') {
    supplyChainDelta -= 2
    reservesDelta -= 1.5
    notes.push('Supply chain disruption due to geopolitical crisis')
  } else if (macro.geopolitical === 'tense') {
    supplyChainDelta -= 0.8
    reservesDelta -= 0.5
  } else {
    // Calm: slow reserve replenishment.
    reservesDelta += 0.4
  }

  // --- Industrial sector growth drives output --------------------------------
  const industrialSector = sectors.find((s) => s.id === 'industrial')
  const industrialGrowthPct = industrialSector?.growth ?? 0
  const industrialShare = industrialSector?.share ?? 20

  // Combined output growth rate per quarter: park-driven + sector-driven.
  // industrialGrowthPct is a %/quarter so divide by 100.
  const outputGrowthRate =
    parkOutputGrowth / 100 + industrialGrowthPct / 100
  const newIndustrialOutput = Math.max(
    0,
    prod.industrialOutput * (1 + outputGrowthRate),
  )

  if (industrialGrowthPct > 2 && industrialParks > 0) {
    notes.push('Manufacturing booming as new industrial parks ramp up')
  } else if (industrialGrowthPct < -1) {
    notes.push('Industrial sector contracting — output slipping')
  }

  // --- Manufacturing capacity utilization ------------------------------------
  // Capacity drifts toward 60 baseline, adjusted by parks and sector growth.
  const capacityTarget = clamp01(
    60 + parkCapacityBoost + industrialGrowthPct * 2,
  )
  const newCapacity = clamp01(
    prod.manufacturingCapacity * 0.85 + capacityTarget * 0.15,
  )

  // --- Workplace accidents ---------------------------------------------------
  // Lax emissions = looser oversight; high pollution = lax practices.
  let accidentsDelta = 0
  if (policy.emissionStandards === 'lax') accidentsDelta += 0.4
  if (policy.emissionStandards === 'strict') accidentsDelta -= 0.3
  if (stats.pollution > 70) accidentsDelta += 1
  // Higher automation slightly reduces accidents (machines do dirty work).
  accidentsDelta -= (prod.industrialAutomation - 50) * 0.01
  // High union density pushes for safety reforms.
  accidentsDelta -= (prod.unionDensity - 30) * 0.01

  const newAccidents = clampAccidents(prod.workplaceAccidents + accidentsDelta)

  if (stats.pollution > 70 && policy.emissionStandards === 'lax') {
    notes.push('Lax oversight and pollution are driving workplace injuries')
  }

  // --- Automation: tech wave pushes it up ------------------------------------
  let automationDelta = 0
  if (macro.techWave > 75) automationDelta += 1.2
  else if (macro.techWave > 50) automationDelta += 0.4
  else automationDelta += 0.1
  const newAutomation = clamp01(prod.industrialAutomation + automationDelta)

  // High automation + low education → displacement risk
  const automationDisplacement = newAutomation > 60 && stats.education < 50
  if (macro.techWave > 75 && stats.education < 50) {
    notes.push('Automation wave outpacing workforce skills')
  }

  // --- Energy security -------------------------------------------------------
  // Power plants + research budget push diversification up; crisis erodes it.
  const powerPlants = buildings.filter((b) => b.type === 'powerPlant').length
  const researchPressure = (budget.research - 50) / 50
  let energyDelta = powerPlants * 0.3 + researchPressure * 0.6
  if (macro.geopolitical === 'crisis') energyDelta -= 1
  if (macro.climateRisk > 70) energyDelta -= 0.3
  const newEnergySecurity = clamp01(prod.energySecurity + energyDelta)

  // --- Trade balance ---------------------------------------------------------
  // Drift toward equilibrium, but strong industry + diversified supply chain
  // tilts toward exports. Crisis tilts toward deficit.
  let tradeDelta = 0
  tradeDelta += (newCapacity - 60) * 0.05
  tradeDelta += (prod.supplyChainResilience - 60) * 0.03
  if (macro.geopolitical === 'crisis') tradeDelta -= 1.5
  if (industrialShare > 30) tradeDelta += 0.4
  const newTradeBalance = clampTrade(prod.tradeBalance + tradeDelta)

  // --- Port throughput -------------------------------------------------------
  // Driven by infra budget and trade balance volume.
  const portDelta = portBoost + Math.abs(newTradeBalance) * 0.02
  const newPort = clamp01(prod.portThroughputIndex + portDelta * 0.3)

  // --- Supply chain resilience clamp ----------------------------------------
  // Diversification slowly recovers in calm times.
  const newSupplyChain = clamp01(prod.supplyChainResilience + supplyChainDelta)

  // --- Raw material reserves -------------------------------------------------
  const newReserves = clamp01(prod.rawMaterialReserves + reservesDelta)
  if (newReserves < 25) {
    notes.push('Raw material reserves running dangerously low')
  }

  // --- Union density ---------------------------------------------------------
  // High inequality + high unemployment slowly raises unionization; high
  // automation chips away at it.
  let unionDelta = 0
  if (stats.inequality > 60) unionDelta += 0.3
  if (stats.unemployment > 10) unionDelta += 0.2
  if (newAutomation > 70) unionDelta -= 0.3
  const newUnion = clamp01(prod.unionDensity + unionDelta)

  // ===========================================================================
  // EFFECTS ON CityStats
  // ===========================================================================
  const effects: Partial<CityStats> = {}

  // GDP per capita lifted by industrial output growth relative to population.
  // Translate ~$M/quarter delta into per-capita drift.
  const outputDelta = newIndustrialOutput - prod.industrialOutput
  if (stats.population > 0) {
    // outputDelta is $M, population is people — convert to $: *1_000_000.
    const gdpLift = (outputDelta * 1_000_000) / stats.population
    // Smooth out — only a fraction shows up immediately.
    effects.gdpPerCapita = gdpLift * 0.25
  }

  // Unemployment: automation displaces, parks employ.
  let unemploymentDelta = 0
  if (automationDisplacement) unemploymentDelta += 0.4
  unemploymentDelta -= industrialParks * 0.05
  if (industrialGrowthPct > 0) unemploymentDelta -= industrialGrowthPct * 0.05
  effects.unemployment = unemploymentDelta

  // Pollution: industrial activity adds pollution, scaled by capacity & lax
  // emissions; strict emissions discount it.
  let pollutionDelta = 0
  pollutionDelta += (newCapacity / 100) * 0.6
  if (policy.emissionStandards === 'lax') pollutionDelta += 0.5
  if (policy.emissionStandards === 'strict') pollutionDelta -= 0.6
  // Automation reduces some pollution; wasteTreatment buildings help too.
  const wasteTreatment = buildings.filter(
    (b) => b.type === 'wasteTreatment',
  ).length
  pollutionDelta -= wasteTreatment * 0.2
  effects.pollution = pollutionDelta

  // ===========================================================================
  // ASSEMBLE NEW STATE
  // ===========================================================================
  const next: ProductionState = Object.freeze({
    manufacturingCapacity: newCapacity,
    industrialOutput: newIndustrialOutput,
    portThroughputIndex: newPort,
    supplyChainResilience: newSupplyChain,
    rawMaterialReserves: newReserves,
    energySecurity: newEnergySecurity,
    tradeBalance: newTradeBalance,
    industrialAutomation: newAutomation,
    workplaceAccidents: newAccidents,
    unionDensity: newUnion,
  })

  return { production: next, effects, notes }
}

// ============================================================================
// SCORING
// ============================================================================

/**
 * A 0-100 composite of how healthy the production subsystem is.
 * Weighted: output capacity (high), resilience (high), accidents (penalty).
 */
export function productionScore(prod: ProductionState): number {
  // Output normalized to 0-100 using a soft cap. Industrial output above
  // $1B/quarter saturates the score.
  const outputNorm = clamp01((prod.industrialOutput / 1000) * 100)

  // Accidents normalized: 0 acc/10k = 100 score, 25/10k = 0 score.
  const accidentNorm = clamp01(100 - prod.workplaceAccidents * 4)

  // Trade balance: 0 maps to 50, +100 maps to 100, -100 maps to 0.
  const tradeNorm = clamp01(50 + prod.tradeBalance * 0.5)

  const weights = {
    capacity: 0.18,
    output: 0.18,
    port: 0.06,
    resilience: 0.16,
    reserves: 0.08,
    energy: 0.12,
    trade: 0.06,
    automation: 0.04,
    accidents: 0.08,
    union: 0.04,
  }

  const score =
    prod.manufacturingCapacity * weights.capacity +
    outputNorm * weights.output +
    prod.portThroughputIndex * weights.port +
    prod.supplyChainResilience * weights.resilience +
    prod.rawMaterialReserves * weights.reserves +
    prod.energySecurity * weights.energy +
    tradeNorm * weights.trade +
    prod.industrialAutomation * weights.automation +
    accidentNorm * weights.accidents +
    prod.unionDensity * weights.union

  return clamp01(score)
}

// ============================================================================
// DESCRIPTION
// ============================================================================

/**
 * Short, human-readable status string summarizing the production subsystem.
 */
export function describeProductionSituation(prod: ProductionState): string {
  const score = productionScore(prod)
  const parts: string[] = []

  if (score >= 75) parts.push('Industry is humming')
  else if (score >= 55) parts.push('Industrial base is steady')
  else if (score >= 35) parts.push('Production is sluggish')
  else parts.push('Industrial base is fragile')

  if (prod.manufacturingCapacity > 85) {
    parts.push('factories near full tilt')
  } else if (prod.manufacturingCapacity < 40) {
    parts.push('factories underused')
  }

  if (prod.supplyChainResilience < 35) {
    parts.push('supply chains brittle')
  } else if (prod.supplyChainResilience > 75) {
    parts.push('supply chains diversified')
  }

  if (prod.rawMaterialReserves < 25) {
    parts.push('reserves critically low')
  }

  if (prod.energySecurity < 35) {
    parts.push('energy mix dangerously concentrated')
  } else if (prod.energySecurity > 75) {
    parts.push('energy mix robust')
  }

  if (prod.workplaceAccidents > 15) {
    parts.push('worker safety record poor')
  }

  if (prod.tradeBalance > 30) {
    parts.push('strong trade surplus')
  } else if (prod.tradeBalance < -30) {
    parts.push('persistent trade deficit')
  }

  if (prod.industrialAutomation > 70) {
    parts.push('heavily automated')
  }

  return parts.join('; ') + '.'
}
