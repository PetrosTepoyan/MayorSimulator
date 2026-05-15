// ============================================================================
// MayorSim — Waste & Recycling Subsystem
// ----------------------------------------------------------------------------
// Models the unglamorous-but-essential plumbing of a city: who picks up the
// trash, what fraction is diverted from landfill, how close the dump is to
// capacity, and how much waste ends up in rivers, alleys, and lungs. Poor
// service tends to bite hardest in lower-income districts, so this system
// drives both pollution and the happiness floor for the city's most fragile
// neighborhoods.
//
// The data is exposed via a single `WasteState` object that the wider sim
// owns and mutates each turn through `updateWastePerTurn`. All updates here
// are pure: we return a NEW WasteState plus a delta of CityStats and notes.
// ============================================================================

import type { CityStats, GameState, PolicyState } from './types'
import { clamp, clamp01 } from './util'

// ============================================================================
// PUBLIC SHAPE
// ============================================================================

export interface WasteState {
  collectionCoverage: number   // 0-100 % of city covered by regular service
  collectionFrequency: number  // pickups per week
  recyclingRate: number        // 0-100 share recycled
  compostingRate: number       // 0-100 share composted
  landfillCapacityLeftYears: number  // years before capacity runs out
  illegalDumpingIncidents: number    // per quarter
  eWasteHandled: number               // 0-100 share processed properly
  organicProgramAdopted: boolean
  plasticBanLevel: 'none' | 'partial' | 'comprehensive'
  ratPopulationIndex: number   // 0-100 (urban vermin proxy)
  recyclingContaminationRate: number  // 0-100 (lower is better)
}

// ============================================================================
// LOCAL CONSTANTS
// ============================================================================

const BASELINE_LANDFILL_DRAIN_PER_TURN = 0.2
const HIGH_INEQUALITY_THRESHOLD = 55
const HIGH_GDP_THRESHOLD = 30000
const RICH_GDP_THRESHOLD = 45000

// ============================================================================
// GENERATION — initial WasteState from city stats and policy
// ============================================================================

export function generateWasteState(
  stats: CityStats,
  policy: PolicyState,
): WasteState {
  const wealthy = stats.gdpPerCapita > HIGH_GDP_THRESHOLD
  const veryWealthy = stats.gdpPerCapita > RICH_GDP_THRESHOLD
  const emission = policy.emissionStandards

  // Recycling rate proxy: emissions policy stands in for civic environmental
  // tradition (Nordfjord-like = strict, Sahel-like = lax).
  const recyclingRate =
    emission === 'strict' ? 45 : emission === 'normal' ? 25 : 15

  // Composting follows the same civic-priority signal but more sharply.
  const compostingRate = emission === 'strict' ? 40 : 10

  // Illegal dumping rises with inequality — poorer districts tend to be
  // both under-served and over-dumped-upon.
  const dumpingBase = 30
  const inequalityKick = Math.max(
    0,
    (stats.inequality - 40) * 0.6,
  )
  const illegalDumpingIncidents = Math.round(dumpingBase + inequalityKick)

  // Wealthier societies tend to have e-waste programs already running.
  const eWasteHandled = clamp01(40 + (veryWealthy ? 15 : wealthy ? 5 : 0))

  // Organic programs: present in green-civic economies. We use the
  // combination of wealth and strict emissions to detect that profile —
  // matching Nordfjord/Pacifica style city presets.
  const organicProgramAdopted = wealthy && emission !== 'lax'

  const plasticBanLevel: WasteState['plasticBanLevel'] =
    emission === 'strict' ? 'partial' : 'none'

  // Collection coverage: 80 baseline, +10 if wealthy.
  const collectionCoverage = clamp01(80 + (wealthy ? 10 : 0))

  return {
    collectionCoverage,
    collectionFrequency: 2,
    recyclingRate,
    compostingRate,
    landfillCapacityLeftYears: 20,
    illegalDumpingIncidents,
    eWasteHandled,
    organicProgramAdopted,
    plasticBanLevel,
    ratPopulationIndex: 30,
    recyclingContaminationRate: 25,
  }
}

// ============================================================================
// PER-TURN UPDATE
// ============================================================================

interface WasteUpdateResult {
  waste: WasteState
  effects: Partial<CityStats>
  notes: string[]
}

export function updateWastePerTurn(
  waste: WasteState,
  state: GameState,
): WasteUpdateResult {
  const notes: string[] = []
  const { stats, buildings, budget, policy } = state

  // --------------------------------------------------------------------------
  // Building counts
  // --------------------------------------------------------------------------
  let wasteTreatmentCount = 0
  let parkCount = 0
  for (const b of buildings) {
    if (b.type === 'wasteTreatment') wasteTreatmentCount++
    else if (b.type === 'park') parkCount++
  }

  // --------------------------------------------------------------------------
  // Environment budget signal (0-100ish typical range)
  // --------------------------------------------------------------------------
  const envBudget = budget.environment
  // Budget delta vs neutral baseline of 30.
  const envBudgetDelta = (envBudget - 30) / 30

  // --------------------------------------------------------------------------
  // Population pressure: more people => more pressure on coverage & landfill.
  // We normalize against 500k as a reference city size.
  // --------------------------------------------------------------------------
  const popPressure = clamp(stats.population / 500_000, 0.5, 4)

  // --------------------------------------------------------------------------
  // RECYCLING RATE
  // --------------------------------------------------------------------------
  let nextRecyclingRate =
    waste.recyclingRate +
    wasteTreatmentCount * 0.4 +
    envBudgetDelta * 0.3 +
    (policy.emissionStandards === 'strict' ? 0.15 : 0) -
    (policy.emissionStandards === 'lax' ? 0.1 : 0)
  nextRecyclingRate = clamp01(nextRecyclingRate)

  // --------------------------------------------------------------------------
  // COMPOSTING — pushed up by organic program and strict emissions.
  // --------------------------------------------------------------------------
  let nextCompostingRate =
    waste.compostingRate +
    (waste.organicProgramAdopted ? 0.3 : -0.05) +
    (policy.emissionStandards === 'strict' ? 0.1 : 0)
  nextCompostingRate = clamp01(nextCompostingRate)

  // --------------------------------------------------------------------------
  // COLLECTION COVERAGE — budget pulls up, population pressure pulls down.
  // --------------------------------------------------------------------------
  let nextCoverage =
    waste.collectionCoverage +
    envBudgetDelta * 0.5 -
    (popPressure - 1) * 0.3
  nextCoverage = clamp01(nextCoverage)

  // --------------------------------------------------------------------------
  // E-WASTE HANDLING — driven by budget and civic tech proxy.
  // --------------------------------------------------------------------------
  let nextEWaste =
    waste.eWasteHandled +
    envBudgetDelta * 0.4 +
    (stats.education > 70 ? 0.1 : 0)
  nextEWaste = clamp01(nextEWaste)

  // --------------------------------------------------------------------------
  // LANDFILL CAPACITY — drains with population pressure.
  // --------------------------------------------------------------------------
  // Higher recycling slows the drain; more waste-treatment further extends.
  const recyclingRelief = (nextRecyclingRate + nextCompostingRate) / 200
  const drain =
    BASELINE_LANDFILL_DRAIN_PER_TURN * popPressure *
    (1 - recyclingRelief) -
    wasteTreatmentCount * 0.05
  let nextLandfillYears = Math.max(0, waste.landfillCapacityLeftYears - drain)

  // --------------------------------------------------------------------------
  // ILLEGAL DUMPING — inequality, coverage shortfall, and budget cuts drive.
  // --------------------------------------------------------------------------
  const inequalityKick =
    stats.inequality > HIGH_INEQUALITY_THRESHOLD ? 2 : 0
  const coverageGap = (100 - nextCoverage) * 0.05
  let nextDumping =
    waste.illegalDumpingIncidents +
    inequalityKick +
    coverageGap -
    envBudgetDelta * 1.5 -
    wasteTreatmentCount * 0.5
  nextDumping = Math.max(0, Math.round(nextDumping))

  // --------------------------------------------------------------------------
  // RAT POPULATION INDEX
  // - Waste treatment & parks reduce
  // - Illegal dumping & low coverage raise
  // --------------------------------------------------------------------------
  let nextRatIndex =
    waste.ratPopulationIndex -
    wasteTreatmentCount * 0.3 -
    parkCount * 0.05 +
    (nextDumping - 30) * 0.05 +
    (100 - nextCoverage) * 0.02
  nextRatIndex = clamp01(nextRatIndex)

  // --------------------------------------------------------------------------
  // PLASTIC BAN — strict emissions push it up over time; lax pushes it back.
  // --------------------------------------------------------------------------
  let nextPlasticBan = waste.plasticBanLevel
  if (policy.emissionStandards === 'strict') {
    // Probability-flavored progression based on turn parity for determinism.
    if (waste.plasticBanLevel === 'none' && state.turn % 4 === 0) {
      nextPlasticBan = 'partial'
      notes.push('Plastic ban gaining support — partial restrictions taking effect.')
    } else if (
      waste.plasticBanLevel === 'partial' &&
      state.turn % 8 === 0 &&
      state.turn > 0
    ) {
      nextPlasticBan = 'comprehensive'
      notes.push('Comprehensive plastic ban now in force across the city.')
    }
  } else if (policy.emissionStandards === 'lax') {
    if (waste.plasticBanLevel === 'comprehensive' && state.turn % 6 === 0) {
      nextPlasticBan = 'partial'
    } else if (waste.plasticBanLevel === 'partial' && state.turn % 8 === 0 && state.turn > 0) {
      nextPlasticBan = 'none'
    }
  }

  // --------------------------------------------------------------------------
  // CONTAMINATION — strict bans improve sorting; lax service worsens it.
  // --------------------------------------------------------------------------
  let nextContamination =
    waste.recyclingContaminationRate -
    (nextPlasticBan === 'comprehensive' ? 0.3 : nextPlasticBan === 'partial' ? 0.1 : 0) -
    envBudgetDelta * 0.2 +
    (nextCoverage < 70 ? 0.2 : 0)
  nextContamination = clamp01(nextContamination)

  // --------------------------------------------------------------------------
  // NOTES
  // --------------------------------------------------------------------------
  if (nextLandfillYears < 5 && waste.landfillCapacityLeftYears >= 5) {
    notes.push('Landfill nearing capacity — siting a new facility is overdue.')
  } else if (nextLandfillYears < 2) {
    notes.push('Landfill critically full — overflow expected within months.')
  }

  if (nextRatIndex > 70 && waste.ratPopulationIndex <= 70) {
    notes.push('Rat sightings up sharply in dense districts.')
  }

  if (nextDumping > 60 && waste.illegalDumpingIncidents <= 60) {
    notes.push('Illegal dumping reports surging in under-served neighborhoods.')
  }

  if (nextRecyclingRate > 50 && waste.recyclingRate <= 50) {
    notes.push('Recycling rate has cleared the 50% milestone.')
  }

  // --------------------------------------------------------------------------
  // CITY STAT EFFECTS — small per-turn drifts (clamped/applied upstream).
  // --------------------------------------------------------------------------
  // Pollution: recycling, composting, and waste treatment cut it. Illegal
  // dumping and low coverage raise it.
  const pollutionDelta =
    -nextRecyclingRate * 0.01 +
    -nextCompostingRate * 0.005 +
    -wasteTreatmentCount * 0.15 +
    nextDumping * 0.015 +
    (100 - nextCoverage) * 0.005

  // Health: rats and dumping erode it; clean streets protect it.
  const healthDelta =
    -nextRatIndex * 0.01 +
    -nextDumping * 0.005 +
    nextCoverage * 0.002

  // Happiness: dirtier, more vermin-ridden districts are unhappier; high
  // recycling is mildly positive (civic pride).
  const happinessDelta =
    -nextRatIndex * 0.008 +
    -nextDumping * 0.004 +
    nextRecyclingRate * 0.003 +
    (waste.organicProgramAdopted ? 0.05 : 0)

  // Approval: light touch — visible service quality matters.
  const approvalDelta =
    nextCoverage * 0.002 -
    nextDumping * 0.003 -
    (nextLandfillYears < 5 ? 0.1 : 0)

  const effects: Partial<CityStats> = {
    pollution: round3(pollutionDelta),
    health: round3(healthDelta),
    happiness: round3(happinessDelta),
    approval: round3(approvalDelta),
  }

  const nextWaste: WasteState = {
    collectionCoverage: nextCoverage,
    collectionFrequency: waste.collectionFrequency,
    recyclingRate: nextRecyclingRate,
    compostingRate: nextCompostingRate,
    landfillCapacityLeftYears: nextLandfillYears,
    illegalDumpingIncidents: nextDumping,
    eWasteHandled: nextEWaste,
    organicProgramAdopted: waste.organicProgramAdopted,
    plasticBanLevel: nextPlasticBan,
    ratPopulationIndex: nextRatIndex,
    recyclingContaminationRate: nextContamination,
  }

  return { waste: nextWaste, effects, notes }
}

// ============================================================================
// SCORE — single-number summary, 0-100. Higher is better.
// ============================================================================

export function wasteScore(waste: WasteState): number {
  // Dumping needs a 0-100 normalization. Anything >=100 incidents counts as
  // fully saturated bad.
  const dumpingNormalized = clamp01(waste.illegalDumpingIncidents)
  const score =
    0.3 * waste.collectionCoverage +
    0.3 * waste.recyclingRate +
    0.2 * (100 - dumpingNormalized) +
    0.2 * (100 - waste.ratPopulationIndex)
  return clamp01(score)
}

// ============================================================================
// DESCRIBE — short, human-readable status line for UI / news flavor.
// ============================================================================

export function describeWasteSituation(waste: WasteState): string {
  const score = wasteScore(waste)
  const tone =
    score >= 75
      ? 'Clean streets, strong sorting, and a recycling culture you can be proud of.'
      : score >= 55
        ? 'Service is broadly reliable, though some neighborhoods complain about missed pickups.'
        : score >= 35
          ? 'Coverage is patchy and recycling is uneven — illegal dumping is a daily complaint.'
          : 'Sanitation is in crisis: overflowing bins, rats in the alleys, and trust in city hall is sinking.'

  const detail: string[] = []
  if (waste.landfillCapacityLeftYears < 5) {
    detail.push(
      `landfill has only ${waste.landfillCapacityLeftYears.toFixed(1)} years of capacity left`,
    )
  }
  if (waste.plasticBanLevel !== 'none') {
    detail.push(`${waste.plasticBanLevel} plastic ban in effect`)
  }
  if (waste.organicProgramAdopted) {
    detail.push('organic-waste program operating')
  }
  if (waste.ratPopulationIndex > 65) {
    detail.push('vermin pressure is high')
  }

  return detail.length > 0 ? `${tone} (${detail.join('; ')})` : tone
}

// ============================================================================
// LOCAL HELPERS
// ============================================================================

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}
