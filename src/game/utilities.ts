// ============================================================================
// MayorSim — City Utilities
// Tracks water, electricity, gas, sewerage, broadband, and trash collection
// channels for the city. Each channel has capacity, reliability, modernization,
// and per-channel quality metrics. Drives quality of life and outage risk.
// ============================================================================

import type { CityStats, GameState, PolicyState } from './types'
import { clamp, clamp01 } from './util'

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export interface UtilityChannel {
  capacityPct: number // 0-100 vs. demand
  reliability: number // 0-100 uptime
  cost: number // average $/month per household
  modernizationIndex: number // 0-100 how modernized
}

export interface UtilitiesState {
  water: UtilityChannel & { contaminationLevel: number /* 0-100 */ }
  electricity: UtilityChannel & { renewableShare: number /* 0-100 */ }
  gas: UtilityChannel
  sewerage: UtilityChannel
  broadband: UtilityChannel & { gigCoverage: number /* 0-100 */ }
  trashCollection: UtilityChannel & { recyclingRate: number /* 0-100 */ }
  outageRiskNextTurn: number // 0-1 probability of an outage event
}

// ----------------------------------------------------------------------------
// Local helpers
// ----------------------------------------------------------------------------

type ChannelKey =
  | 'water'
  | 'electricity'
  | 'gas'
  | 'sewerage'
  | 'broadband'
  | 'trashCollection'

const CHANNEL_KEYS: readonly ChannelKey[] = [
  'water',
  'electricity',
  'gas',
  'sewerage',
  'broadband',
  'trashCollection',
] as const

interface ChannelRanges {
  capacityMin: number
  capacityMax: number
  reliabilityMin: number
  reliabilityMax: number
  modernizationMin: number
  modernizationMax: number
}

/**
 * Country profile - drives baseline reliability/modernization ranges,
 * cost multipliers (via GDP) and per-channel quality metrics.
 */
interface CountryProfile {
  ranges: ChannelRanges
  gdpAnchor: number // expected gdpPerCapita anchor for cost scaling
  contaminationLevel: number
  renewableShare: number
  gigCoverage: number
  recyclingRate: number
}

const DEFAULT_PROFILE: CountryProfile = {
  ranges: {
    capacityMin: 70,
    capacityMax: 90,
    reliabilityMin: 80,
    reliabilityMax: 95,
    modernizationMin: 40,
    modernizationMax: 70,
  },
  gdpAnchor: 50_000,
  contaminationLevel: 10,
  renewableShare: 20,
  gigCoverage: 30,
  recyclingRate: 25,
}

function profileFor(countryId: string): CountryProfile {
  switch (countryId) {
    case 'costaverde':
      return {
        ranges: {
          capacityMin: 70,
          capacityMax: 90,
          reliabilityMin: 60,
          reliabilityMax: 80,
          modernizationMin: 30,
          modernizationMax: 50,
        },
        gdpAnchor: 18_000,
        contaminationLevel: 25,
        renewableShare: 20,
        gigCoverage: 30,
        recyclingRate: 25,
      }
    case 'sahel':
      return {
        ranges: {
          capacityMin: 70,
          capacityMax: 90,
          reliabilityMin: 60,
          reliabilityMax: 80,
          modernizationMin: 30,
          modernizationMax: 50,
        },
        gdpAnchor: 6_000,
        contaminationLevel: 25,
        renewableShare: 20,
        gigCoverage: 10,
        recyclingRate: 25,
      }
    case 'pacifica':
      return {
        ranges: {
          capacityMin: 70,
          capacityMax: 90,
          reliabilityMin: 90,
          reliabilityMax: 98,
          modernizationMin: 75,
          modernizationMax: 90,
        },
        gdpAnchor: 60_000,
        contaminationLevel: 10,
        renewableShare: 20,
        gigCoverage: 80,
        recyclingRate: 25,
      }
    case 'nordfjord':
      return {
        ranges: {
          capacityMin: 70,
          capacityMax: 90,
          reliabilityMin: 90,
          reliabilityMax: 98,
          modernizationMin: 75,
          modernizationMax: 90,
        },
        gdpAnchor: 75_000,
        contaminationLevel: 10,
        renewableShare: 60,
        gigCoverage: 80,
        recyclingRate: 60,
      }
    case 'eastoria':
      return {
        ranges: {
          capacityMin: 70,
          capacityMax: 90,
          reliabilityMin: 75,
          reliabilityMax: 90,
          modernizationMin: 45,
          modernizationMax: 70,
        },
        gdpAnchor: 25_000,
        contaminationLevel: 10,
        renewableShare: 20,
        gigCoverage: 30,
        recyclingRate: 25,
      }
    case 'atlantica':
    default:
      return DEFAULT_PROFILE
  }
}

/**
 * Pseudo-deterministic value within [min, max] from a stable seed.
 * Uses sin-based hash to avoid needing the RNG for purely descriptive scaffold.
 */
function midRange(min: number, max: number): number {
  return Math.round((min + max) / 2)
}

/** Cost scales gently with GDP per capita; expressed in $/month/household. */
function costForChannel(channel: ChannelKey, gdpAnchor: number): number {
  // Base monthly cost per channel ($/household), at ~$30k GDP anchor
  const base: Record<ChannelKey, number> = {
    water: 35,
    electricity: 110,
    gas: 60,
    sewerage: 30,
    broadband: 55,
    trashCollection: 25,
  }
  const scale = clamp(gdpAnchor / 30_000, 0.4, 2.5)
  return Math.round(base[channel] * scale)
}

function makeChannel(
  channel: ChannelKey,
  profile: CountryProfile,
): UtilityChannel {
  const r = profile.ranges
  return {
    capacityPct: midRange(r.capacityMin, r.capacityMax),
    reliability: midRange(r.reliabilityMin, r.reliabilityMax),
    cost: costForChannel(channel, profile.gdpAnchor),
    modernizationIndex: midRange(r.modernizationMin, r.modernizationMax),
  }
}

function cloneChannel<T extends UtilityChannel>(c: T): T {
  return { ...c }
}

function bumpChannel(
  c: UtilityChannel,
  capacityDelta: number,
  reliabilityDelta: number,
  modernizationDelta: number,
): UtilityChannel {
  return {
    capacityPct: clamp01(c.capacityPct + capacityDelta),
    reliability: clamp01(c.reliability + reliabilityDelta),
    cost: c.cost,
    modernizationIndex: clamp01(c.modernizationIndex + modernizationDelta),
  }
}

function channelScore(c: UtilityChannel): number {
  return (
    c.capacityPct * 0.3 + c.reliability * 0.5 + c.modernizationIndex * 0.2
  )
}

// ----------------------------------------------------------------------------
// generateUtilitiesState
// ----------------------------------------------------------------------------

export function generateUtilitiesState(
  stats: CityStats,
  policy: PolicyState,
): UtilitiesState {
  // The PolicyState argument is part of the contract; reference defensively
  // so future policy hooks (e.g. transit, emission) can shift baselines.
  void policy
  // CityStats includes no countryId directly. We approximate country tier from
  // the macro of the city: GDP-per-capita proxies country, pollution proxies
  // contamination/renewable bias. We start from defaults and tune.
  const gdp = stats.gdpPerCapita ?? 30_000
  const pollution = stats.pollution ?? 30

  // Heuristic country class derivation from stats:
  let countryId = 'atlantica'
  if (gdp >= 65_000) countryId = 'nordfjord'
  else if (gdp >= 50_000) countryId = 'pacifica'
  else if (gdp >= 30_000) countryId = 'eastoria'
  else if (gdp >= 12_000) countryId = 'costaverde'
  else countryId = 'sahel'

  const profile = profileFor(countryId)

  // Bias contamination upward in highly polluted cities.
  const contaminationLevel = clamp01(
    profile.contaminationLevel + (pollution > 50 ? 10 : 0),
  )

  const water = {
    ...makeChannel('water', profile),
    contaminationLevel,
  }
  const electricity = {
    ...makeChannel('electricity', profile),
    renewableShare: clamp01(profile.renewableShare),
  }
  const gas: UtilityChannel = makeChannel('gas', profile)
  const sewerage: UtilityChannel = makeChannel('sewerage', profile)
  const broadband = {
    ...makeChannel('broadband', profile),
    gigCoverage: clamp01(profile.gigCoverage),
  }
  const trashCollection = {
    ...makeChannel('trashCollection', profile),
    recyclingRate: clamp01(profile.recyclingRate),
  }

  return {
    water,
    electricity,
    gas,
    sewerage,
    broadband,
    trashCollection,
    outageRiskNextTurn: 0.03,
  }
}

// ----------------------------------------------------------------------------
// updateUtilitiesPerTurn
// ----------------------------------------------------------------------------

interface UpdateResult {
  utilities: UtilitiesState
  effects: Partial<CityStats>
  notes: string[]
}

export function updateUtilitiesPerTurn(
  util: UtilitiesState,
  state: GameState,
): UpdateResult {
  const notes: string[] = []
  const effects: Partial<CityStats> = {}

  // ------- Inputs -------
  const infraBudget = state.budget?.infrastructure ?? 0
  const populationNow = state.stats?.population ?? 0
  // Approximate population growth using approval history length / treasury proxy:
  // We don't have prior pop here, so we use macro consumerConfidence + approval as
  // a stand-in for growth pressure. Treat positive consumerConfidence as growth.
  const consumerConfidence = state.macro?.consumerConfidence ?? 50
  const populationGrowing = consumerConfidence > 55 && populationNow > 0

  const climateRisk = state.macro?.climateRisk ?? 0
  const techWave = state.macro?.techWave ?? 0
  const pollution = state.stats?.pollution ?? 0

  // Building tallies
  const buildings = state.buildings ?? []
  let powerPlantCount = 0
  let solarOrNuclearCount = 0
  let coalCount = 0
  let wasteTreatmentCount = 0
  for (const b of buildings) {
    if (b.type === 'powerPlant') {
      powerPlantCount += 1
      const v = (b.variant ?? '').toLowerCase()
      if (v.includes('solar') || v.includes('nuclear') || v.includes('wind')) {
        solarOrNuclearCount += 1
      } else if (v.includes('coal') || v.includes('oil') || v.includes('gas')) {
        coalCount += 1
      }
    } else if (b.type === 'wasteTreatment') {
      wasteTreatmentCount += 1
    }
  }

  // ------- Infrastructure budget boost -------
  // Budget is a $M/turn allocation; scale gently. 10 => +0.5 reliability/turn
  const budgetBoost = clamp(infraBudget / 20, 0, 1.5)

  // ------- Per-channel updates -------
  const capacityDrift = populationGrowing ? -0.5 : 0
  const climatePenalty = clamp(climateRisk / 200, 0, 0.4) // up to -0.4 reliability/turn

  const next: UtilitiesState = {
    water: {
      ...bumpChannel(
        util.water,
        capacityDrift + budgetBoost * 0.3,
        -climatePenalty + budgetBoost * 0.5,
        budgetBoost * 0.2,
      ),
      contaminationLevel: clamp01(
        util.water.contaminationLevel +
          (pollution > 50 ? 0.4 : pollution > 30 ? 0.1 : -0.2) -
          (wasteTreatmentCount > 0 ? 0.5 * wasteTreatmentCount : 0),
      ),
    },
    electricity: {
      ...bumpChannel(
        util.electricity,
        capacityDrift + budgetBoost * 0.3 + powerPlantCount * 0.2,
        -climatePenalty + budgetBoost * 0.5,
        budgetBoost * 0.2,
      ),
      renewableShare: clamp01(
        util.electricity.renewableShare +
          solarOrNuclearCount * 0.6 -
          coalCount * 0.4,
      ),
    },
    gas: bumpChannel(
      util.gas,
      capacityDrift + budgetBoost * 0.3,
      -climatePenalty + budgetBoost * 0.4,
      budgetBoost * 0.2,
    ),
    sewerage: bumpChannel(
      util.sewerage,
      capacityDrift + budgetBoost * 0.3,
      -climatePenalty + budgetBoost * 0.4,
      budgetBoost * 0.2,
    ),
    broadband: {
      ...bumpChannel(
        util.broadband,
        capacityDrift + budgetBoost * 0.3,
        -climatePenalty * 0.5 + budgetBoost * 0.4,
        budgetBoost * 0.3 + (techWave > 75 ? 0.4 : 0),
      ),
      gigCoverage: clamp01(
        util.broadband.gigCoverage + (techWave > 75 ? 0.8 : techWave > 50 ? 0.3 : 0),
      ),
    },
    trashCollection: {
      ...bumpChannel(
        util.trashCollection,
        capacityDrift + budgetBoost * 0.3,
        -climatePenalty * 0.5 + budgetBoost * 0.3,
        budgetBoost * 0.2,
      ),
      recyclingRate: clamp01(
        util.trashCollection.recyclingRate + wasteTreatmentCount * 0.5,
      ),
    },
    outageRiskNextTurn: 0,
  }

  // ------- Outage risk -------
  const avgReliability =
    (next.water.reliability +
      next.electricity.reliability +
      next.gas.reliability +
      next.sewerage.reliability +
      next.broadband.reliability +
      next.trashCollection.reliability) /
    6
  const reliabilityGap = clamp(100 - avgReliability, 0, 100) / 100
  next.outageRiskNextTurn = clamp(
    0.03 + climateRisk / 250 + reliabilityGap * 0.15,
    0,
    1,
  )

  // ------- Effects on CityStats -------
  // Water contamination raises pollution and lowers health.
  const contam = next.water.contaminationLevel
  if (contam > 20) {
    effects.pollution = Number(((contam - 20) * 0.04).toFixed(2))
    effects.health = -Number(((contam - 20) * 0.03).toFixed(2))
  } else if (contam < 10) {
    effects.health = 0.1
  }

  // Reliability drives happiness up or down.
  if (avgReliability >= 90) {
    effects.happiness = (effects.happiness ?? 0) + 0.4
  } else if (avgReliability < 70) {
    effects.happiness = (effects.happiness ?? 0) - 0.6
  } else if (avgReliability < 80) {
    effects.happiness = (effects.happiness ?? 0) - 0.2
  }

  // ------- Notes -------
  const channelLabels: Record<ChannelKey, string> = {
    water: 'Water',
    electricity: 'Electricity',
    gas: 'Gas',
    sewerage: 'Sewerage',
    broadband: 'Broadband',
    trashCollection: 'Trash collection',
  }
  for (const key of CHANNEL_KEYS) {
    const ch = next[key] as UtilityChannel
    if (ch.reliability < 70) {
      if (key === 'broadband') {
        notes.push('Broadband outages frustrating residents')
      } else if (key === 'electricity') {
        notes.push('Rolling blackouts angering households')
      } else if (key === 'water') {
        notes.push('Water service disruptions causing concern')
      } else if (key === 'gas') {
        notes.push('Gas supply interruptions reported')
      } else if (key === 'sewerage') {
        notes.push('Sewer overflows complained about citywide')
      } else if (key === 'trashCollection') {
        notes.push('Trash piling up — collection unreliable')
      } else {
        notes.push(`${channelLabels[key]} reliability slipping`)
      }
    }
  }
  if (next.water.contaminationLevel > 35) {
    notes.push('Water contamination warnings issued')
  }
  if (next.outageRiskNextTurn > 0.25) {
    notes.push('Grid stress is elevated — outage risk rising')
  }
  if (techWave > 75 && next.broadband.gigCoverage < 50) {
    notes.push('City lagging in gigabit broadband rollout')
  }

  return { utilities: next, effects, notes }
}

// ----------------------------------------------------------------------------
// utilitiesScore
// ----------------------------------------------------------------------------

export function utilitiesScore(util: UtilitiesState): number {
  const scores = CHANNEL_KEYS.map((k) => channelScore(util[k] as UtilityChannel))
  const sum = scores.reduce((s, v) => s + v, 0)
  return clamp01(sum / scores.length)
}

// ----------------------------------------------------------------------------
// describeUtilitiesSituation
// ----------------------------------------------------------------------------

export function describeUtilitiesSituation(util: UtilitiesState): string {
  const score = utilitiesScore(util)
  const tier =
    score >= 85
      ? 'world-class'
      : score >= 70
        ? 'reliable'
        : score >= 55
          ? 'serviceable'
          : score >= 40
            ? 'strained'
            : 'failing'

  const weakest = CHANNEL_KEYS.reduce<{ k: ChannelKey; v: number }>(
    (acc, k) => {
      const s = channelScore(util[k] as UtilityChannel)
      return s < acc.v ? { k, v: s } : acc
    },
    { k: CHANNEL_KEYS[0], v: Infinity },
  )

  const weakLabel: Record<ChannelKey, string> = {
    water: 'water',
    electricity: 'electricity',
    gas: 'gas',
    sewerage: 'sewerage',
    broadband: 'broadband',
    trashCollection: 'trash collection',
  }

  const outagePct = Math.round(util.outageRiskNextTurn * 100)
  return `City utilities are ${tier} overall (${Math.round(score)}/100); ${weakLabel[weakest.k]} is the weakest link with ${outagePct}% outage risk next turn.`
}

// Re-exported as a convenience for callers that need to clone before mutating.
export const __internal = {
  cloneChannel,
  channelScore,
}
