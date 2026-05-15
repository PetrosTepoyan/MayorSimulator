// ============================================================================
// MayorSim — Real Estate System
// ----------------------------------------------------------------------------
// Models the housing market: prices, rents, vacancy, homeownership, construction,
// homelessness, gentrification, and foreign-buyer share. Reacts to population
// growth, inflation, macro conditions, policy levers (rent control, transit,
// healthcare), and the city's stock of housing buildings. Feeds back into core
// CityStats — primarily inequality, happiness, and population — and produces
// human-readable notes used by the news / causal log layers.
// ============================================================================

import type { CityStats, GameState, PolicyState } from './types'
import { clamp, clamp01 } from './util'

// ----------------------------------------------------------------------------
// Public state shape
// ----------------------------------------------------------------------------

export interface RealEstateState {
  medianHomePrice: number          // $
  medianRent: number               // $/month
  pricesPerSqFt: number            // $
  vacancyRate: number              // 0-100 %
  homeownershipRate: number        // 0-100 %
  homelessPopulation: number       // count
  constructionStartsPerQuarter: number  // count of new housing units started
  housingShortage: number          // estimated units short
  gentrificationIndex: number      // 0-100 average
  foreignBuyerShare: number        // 0-100 %
  rentRegulationStrength: number   // 0-100 (derived from policy)
  buildingPermitDelayWeeks: number // weeks (efficiency proxy)
}

// ----------------------------------------------------------------------------
// Local constants — clamps / weights kept here so they're easy to tune.
// ----------------------------------------------------------------------------

// Each housing building unit absorbs this many residents.
const RESIDENTS_PER_HOUSING_BUILDING = 5000
// Each new housing build reduces shortage by this many units.
const UNITS_PER_HOUSING_BUILDING = 1200

const MIN_HOME_PRICE = 30_000
const MIN_RENT = 200

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function rentStrengthFor(policy: PolicyState): number {
  if (policy.rentControl === 'strict') return 80
  if (policy.rentControl === 'soft') return 50
  return 10
}

// Rough rent-burden proxy: what fraction of monthly income goes to rent.
// Annual rent (12 * medianRent) over gdpPerCapita. Clamped to 0..1.5.
function rentBurden(re: RealEstateState, stats: CityStats): number {
  const annualRent = re.medianRent * 12
  const income = Math.max(1, stats.gdpPerCapita)
  return clamp(annualRent / income, 0, 1.5)
}

// Stable housing-unit estimate from buildings list.
function totalHousingUnits(state: GameState): number {
  let units = 0
  for (const b of state.buildings) {
    if (b.type === 'housing') units += UNITS_PER_HOUSING_BUILDING
  }
  return units
}

// Pull the country id off the game state safely.
function countryOf(state: GameState): string {
  return state.countryId ?? ''
}

// ----------------------------------------------------------------------------
// Generation — initial market snapshot
// ----------------------------------------------------------------------------

export function generateRealEstateState(
  stats: CityStats,
  policy: PolicyState,
): RealEstateState {
  // Country-flavored generation is keyed by hints in the stats and the
  // policy. We don't have access to the country object here, so we treat
  // certain stat patterns as proxies (e.g., very high pollution + high
  // population can mimic eastoria-style stock surplus). Callers that want
  // strict per-country tuning can post-process the returned state.

  const medianHomePrice = Math.max(MIN_HOME_PRICE, stats.gdpPerCapita * 5)
  const medianRent = Math.max(MIN_RENT, stats.gdpPerCapita * 0.024)
  const pricesPerSqFt = medianHomePrice / 1500

  const vacancyRate = 5
  const homeownershipRate = 60

  const homelessPopulation = Math.max(
    0,
    Math.round(stats.population * 0.003 + (stats.inequality - 50) * 50),
  )

  const constructionStartsPerQuarter = Math.max(
    0,
    Math.round(stats.population * 0.001),
  )

  return {
    medianHomePrice,
    medianRent,
    pricesPerSqFt,
    vacancyRate,
    homeownershipRate,
    homelessPopulation,
    constructionStartsPerQuarter,
    housingShortage: 0,
    gentrificationIndex: 30,
    foreignBuyerShare: 10,
    rentRegulationStrength: rentStrengthFor(policy),
    buildingPermitDelayWeeks: 12,
  }
}

// ----------------------------------------------------------------------------
// Per-turn update
// ----------------------------------------------------------------------------

interface PerTurnResult {
  realEstate: RealEstateState
  effects: Partial<CityStats>
  notes: string[]
}

export function updateRealEstatePerTurn(
  re: RealEstateState,
  state: GameState,
): PerTurnResult {
  const { stats, macro, policy, sectors } = state
  const notes: string[] = []
  const effects: Partial<CityStats> = {}

  // --- Demand side --------------------------------------------------------
  // Population pressure: per-quarter growth proxy. We use the *current* count
  // as the demand base; the growth term is small because real population
  // adjustments live in the population system itself.
  const popDemand = stats.population / 1_000_000 // ~1 per million residents
  const inflationPush = clamp(stats.inflation, -5, 30)
  const macroPush = macro?.nationalInflation ?? 2.5

  // Policy-driven attractors
  const freeTransit = policy.transit === 'free'
  const universalHealth = policy.healthcare === 'universal'
  const attractorBoost =
    (freeTransit ? 0.3 : 0) + (universalHealth ? 0.3 : 0)

  // Crime + pollution headwinds: high values push prices down.
  const livabilityDrag =
    Math.max(0, stats.crime - 50) * 0.01 +
    Math.max(0, stats.pollution - 50) * 0.01

  // --- Supply side --------------------------------------------------------
  const housingUnits = totalHousingUnits(state)
  const housingCapacityResidents =
    housingUnits > 0 ? housingUnits * (RESIDENTS_PER_HOUSING_BUILDING / UNITS_PER_HOUSING_BUILDING) : 0
  const housingShortageRaw = Math.max(
    0,
    stats.population - housingCapacityResidents,
  )
  // Smooth the shortage so a single build doesn't whip it around.
  const nextShortage = Math.round(re.housingShortage * 0.6 + housingShortageRaw * 0.4)

  // --- Price growth -------------------------------------------------------
  // Base annualized growth, expressed per-quarter (divide by 4 implicitly):
  // - 0.5%/quarter floor anchor
  // - +0.15% per million residents (demand)
  // - +inflation/40 (e.g., 4% inflation -> +0.1)
  // - +attractor boost
  // - -livability drag
  // - -supply relief (each housing unit shaves a little)
  // - rent control trims price growth modestly
  const supplyRelief = clamp(housingUnits / Math.max(1, stats.population) * 6, 0, 1.5)
  const rentRegBrake = re.rentRegulationStrength / 250 // strict -> 0.32
  const priceGrowthPct =
    0.5 +
    popDemand * 0.15 +
    inflationPush / 40 +
    (macroPush - 2.5) / 60 +
    attractorBoost -
    livabilityDrag -
    supplyRelief -
    rentRegBrake

  const newHomePrice = Math.max(
    MIN_HOME_PRICE,
    re.medianHomePrice * (1 + priceGrowthPct / 100),
  )

  // Rent growth tracks price growth but is dampened by rent control.
  const rentControlDamp = re.rentRegulationStrength / 100 // 0..0.8
  const rentGrowthPct = priceGrowthPct * (1 - rentControlDamp * 0.7)
  const newRent = Math.max(MIN_RENT, re.medianRent * (1 + rentGrowthPct / 100))

  const newPricesPerSqFt = newHomePrice / 1500

  // --- Vacancy ------------------------------------------------------------
  // Vacancy climbs when there's excess supply and crime/pollution scare
  // residents off; falls when demand outstrips. Rent control compresses
  // vacancy slightly (some units come off the rental market).
  let nextVacancy = re.vacancyRate
  if (nextShortage > 0) nextVacancy -= 0.1
  else nextVacancy += 0.05
  nextVacancy += livabilityDrag * 0.2
  nextVacancy -= rentControlDamp * 0.05
  nextVacancy = clamp01(nextVacancy)

  // --- Homeownership ------------------------------------------------------
  // Slowly drifts down when rent burden is high (people can't save for down
  // payments) and drifts up when prices are stable relative to incomes.
  const burden = rentBurden(re, stats)
  let nextOwnership = re.homeownershipRate
  if (burden > 0.4) nextOwnership -= 0.15
  else if (burden < 0.25) nextOwnership += 0.08
  if (re.foreignBuyerShare > 25) nextOwnership -= 0.08
  nextOwnership = clamp01(nextOwnership)

  // --- Construction starts ------------------------------------------------
  // Base on population, modulated by permit delay (efficiency) and
  // rent-control (which suppresses new construction).
  const permitFriction = clamp(re.buildingPermitDelayWeeks / 12, 0.2, 2.5)
  let constructionStarts = (stats.population * 0.001) / permitFriction
  constructionStarts *= 1 - rentControlDamp * 0.35
  // High inflation chills construction starts a touch.
  if (stats.inflation > 8) constructionStarts *= 0.85
  if (macro?.geopolitical === 'crisis') constructionStarts *= 0.8
  constructionStarts = Math.max(0, Math.round(constructionStarts))

  if (
    re.constructionStartsPerQuarter > 0 &&
    constructionStarts < re.constructionStartsPerQuarter * 0.6
  ) {
    notes.push('Construction starts down — permits backed up.')
  }

  // --- Gentrification -----------------------------------------------------
  // Tech sector growth (or simply a large tech share) drives gentrification
  // up. High inequality also accelerates it.
  const techSector = sectors?.find((s) => s.id === 'tech')
  let gentDelta = 0
  if (techSector && techSector.growth > 1.5) gentDelta += 0.2
  if (techSector && techSector.share > 25) gentDelta += 0.1
  if (stats.inequality > 60) gentDelta += 0.1
  if (re.foreignBuyerShare > 25) gentDelta += 0.1
  if (policy.rentControl === 'strict') gentDelta -= 0.1
  const nextGent = clamp01(re.gentrificationIndex + gentDelta)
  if (
    re.gentrificationIndex < 50 &&
    nextGent >= 50 &&
    techSector &&
    techSector.share > 20
  ) {
    notes.push('Gentrification accelerating in the tech district.')
  }

  // --- Foreign buyer share ------------------------------------------------
  // Rises with calm geopolitics + high tech wave; falls under crisis.
  let nextForeign = re.foreignBuyerShare
  if (macro?.geopolitical === 'calm' && (macro?.techWave ?? 0) > 70) {
    nextForeign += 0.4
  }
  if (macro?.geopolitical === 'crisis') nextForeign -= 0.5
  if (macro?.geopolitical === 'tense') nextForeign -= 0.1
  if (policy.immigration === 'restrictive') nextForeign -= 0.1
  nextForeign = clamp01(nextForeign)
  if (re.foreignBuyerShare < 30 && nextForeign >= 30) {
    notes.push('Foreign buyers now a major share of the market.')
  }

  // --- Homelessness -------------------------------------------------------
  // Rent burden over 35% of income is a strong driver; rent control and
  // a healthy welfare budget reduce it; new housing builds reduce it.
  let homelessDelta = 0
  if (burden > 0.35) homelessDelta += stats.population * 0.0008 * (burden - 0.35) * 10
  if (burden < 0.25) homelessDelta -= stats.population * 0.0002
  if (policy.rentControl === 'strict') homelessDelta -= stats.population * 0.0001
  if (stats.unemployment > 10) homelessDelta += stats.population * 0.00015 * (stats.unemployment - 10)
  // Housing builds in the last turn reduce the count materially.
  const recentHousing = state.buildings.filter(
    (b) => b.type === 'housing' && b.builtTurn === state.turn,
  ).length
  homelessDelta -= recentHousing * 60

  let nextHomeless = Math.max(0, Math.round(re.homelessPopulation + homelessDelta))
  // Bound by population.
  nextHomeless = Math.min(nextHomeless, Math.max(0, stats.population))

  if (
    re.homelessPopulation > 0 &&
    nextHomeless > re.homelessPopulation * 1.15 &&
    homelessDelta > 0
  ) {
    notes.push('Homelessness rising sharply as rent burdens climb.')
  } else if (
    re.homelessPopulation > 0 &&
    nextHomeless < re.homelessPopulation * 0.85
  ) {
    notes.push('Homelessness easing as housing pressure subsides.')
  }

  // --- Rent regulation strength (re-derived from policy each turn) -------
  const nextRentReg = rentStrengthFor(policy)

  // --- Permit delay (slow drift; civic tech / efficiency would change this)
  // We let it drift mildly toward 8 weeks when innovation is high, away when
  // not. External callers can stamp it to 4 when "permit streamlining" lands.
  let nextPermitDelay = re.buildingPermitDelayWeeks
  if (stats.innovation > 70) nextPermitDelay -= 0.05
  else if (stats.innovation < 30) nextPermitDelay += 0.05
  nextPermitDelay = clamp(nextPermitDelay, 1, 40)

  // --- Effects on CityStats -----------------------------------------------
  // Inequality: high prices + high gent + high foreign share push up.
  let inequalityDelta = 0
  if (burden > 0.35) inequalityDelta += 0.2 * (burden - 0.35) * 4
  if (nextGent > 60) inequalityDelta += 0.1
  if (nextForeign > 30) inequalityDelta += 0.08
  if (policy.rentControl === 'strict') inequalityDelta -= 0.08
  if (recentHousing > 0) inequalityDelta -= 0.05 * recentHousing
  if (Math.abs(inequalityDelta) > 0.005) effects.inequality = inequalityDelta

  // Happiness: rent burden bites.
  let happinessDelta = 0
  if (burden > 0.4) happinessDelta -= 0.4
  else if (burden > 0.3) happinessDelta -= 0.15
  if (nextHomeless > stats.population * 0.01) happinessDelta -= 0.2
  if (nextVacancy > 15) happinessDelta -= 0.05
  if (recentHousing > 0) happinessDelta += 0.1 * recentHousing
  if (Math.abs(happinessDelta) > 0.005) effects.happiness = happinessDelta

  // Population: very high prices push residents out (small).
  // We work in absolute residents per quarter, kept conservative.
  let populationDelta = 0
  if (burden > 0.45) populationDelta -= Math.round(stats.population * 0.001)
  if (attractorBoost > 0 && burden < 0.35) {
    populationDelta += Math.round(stats.population * 0.0005)
  }
  if (nextHomeless > stats.population * 0.02) {
    populationDelta -= Math.round(stats.population * 0.0005)
  }
  if (populationDelta !== 0) effects.population = populationDelta

  // --- Threshold notes ----------------------------------------------------
  if (re.medianHomePrice < newHomePrice && priceGrowthPct > 2) {
    notes.push('Home prices are climbing fast this quarter.')
  } else if (priceGrowthPct < -1) {
    notes.push('Home prices slipped this quarter.')
  }
  if (re.vacancyRate < 10 && nextVacancy >= 12) {
    notes.push('Vacancy ticking up — softer rental market.')
  }
  if (burden > 0.45 && rentBurden(
    { ...re, medianRent: newRent },
    { ...stats, gdpPerCapita: stats.gdpPerCapita },
  ) > 0.45) {
    notes.push('Rent burden is severe — over 45% of income.')
  }

  const next: RealEstateState = {
    medianHomePrice: newHomePrice,
    medianRent: newRent,
    pricesPerSqFt: newPricesPerSqFt,
    vacancyRate: nextVacancy,
    homeownershipRate: nextOwnership,
    homelessPopulation: nextHomeless,
    constructionStartsPerQuarter: constructionStarts,
    housingShortage: nextShortage,
    gentrificationIndex: nextGent,
    foreignBuyerShare: nextForeign,
    rentRegulationStrength: nextRentReg,
    buildingPermitDelayWeeks: nextPermitDelay,
  }

  return { realEstate: next, effects, notes }
}

// ----------------------------------------------------------------------------
// Health score — weighted composite for UI / advisor.
// Higher is better. Bounded [0, 100].
// ----------------------------------------------------------------------------

export function realEstateScore(re: RealEstateState): number {
  // Sub-scores, each on a 0..100 scale where 100 = great.
  const homelessScore = clamp(100 - re.homelessPopulation / 200, 0, 100)
  // Vacancy: 5-8% considered healthy. Penalize both extremes.
  const vacancyScore = (() => {
    const v = re.vacancyRate
    if (v >= 5 && v <= 8) return 100
    if (v < 5) return clamp(100 - (5 - v) * 12, 0, 100)
    return clamp(100 - (v - 8) * 6, 0, 100)
  })()
  // Construction: roughly want construction starts to keep up with population
  // growth. We don't have pop directly here, so we use an absolute floor.
  const constructionScore = clamp(re.constructionStartsPerQuarter / 5, 0, 100)
  // Shortage: penalize linearly.
  const shortageScore = clamp(100 - re.housingShortage / 200, 0, 100)
  // Ownership: a moderate range is desirable; very low or very high are odd.
  const ownershipScore = clamp(
    100 - Math.abs(re.homeownershipRate - 60) * 1.2,
    0,
    100,
  )
  // Gentrification + foreign share + permit friction: each above moderate
  // levels chips at the score.
  const gentScore = clamp(100 - Math.max(0, re.gentrificationIndex - 40), 0, 100)
  const foreignScore = clamp(100 - Math.max(0, re.foreignBuyerShare - 15) * 1.2, 0, 100)
  const permitScore = clamp(100 - Math.max(0, re.buildingPermitDelayWeeks - 6) * 4, 0, 100)

  // Weights — homelessness and shortage dominate.
  const score =
    homelessScore * 0.22 +
    shortageScore * 0.18 +
    vacancyScore * 0.12 +
    constructionScore * 0.12 +
    ownershipScore * 0.1 +
    gentScore * 0.1 +
    foreignScore * 0.08 +
    permitScore * 0.08

  return Math.round(clamp(score, 0, 100))
}

// ----------------------------------------------------------------------------
// Short status line — used by UI tooltips / news summaries.
// ----------------------------------------------------------------------------

function priceTier(p: number): string {
  if (p >= 1_000_000) return 'sky-high'
  if (p >= 600_000) return 'very high'
  if (p >= 350_000) return 'high'
  if (p >= 200_000) return 'moderate'
  return 'affordable'
}

function vacancyPhrase(v: number): string {
  if (v < 3) return 'tight market'
  if (v < 6) return 'healthy market'
  if (v < 10) return 'soft market'
  return 'oversupplied market'
}

function homelessPhrase(h: number): string {
  if (h < 500) return 'low homelessness'
  if (h < 5_000) return 'visible homelessness'
  if (h < 20_000) return 'sizeable homeless population'
  return 'homelessness crisis'
}

function gentPhrase(g: number): string {
  if (g >= 75) return 'gentrification severe'
  if (g >= 55) return 'gentrification strong'
  if (g >= 35) return 'gentrification moderate'
  return 'gentrification low'
}

export function describeRealEstate(re: RealEstateState): string {
  const parts: string[] = [
    `Median home ${priceTier(re.medianHomePrice)} ($${Math.round(re.medianHomePrice).toLocaleString()})`,
    `Rent $${Math.round(re.medianRent).toLocaleString()}/mo`,
    `${re.vacancyRate.toFixed(1)}% vacancy (${vacancyPhrase(re.vacancyRate)})`,
    homelessPhrase(re.homelessPopulation),
    gentPhrase(re.gentrificationIndex),
  ]
  if (re.foreignBuyerShare >= 25) {
    parts.push(`foreign buyers ${re.foreignBuyerShare.toFixed(0)}%`)
  }
  if (re.buildingPermitDelayWeeks >= 16) {
    parts.push(`permits slow (${Math.round(re.buildingPermitDelayWeeks)} wk)`)
  } else if (re.buildingPermitDelayWeeks <= 4) {
    parts.push('permits fast')
  }
  return parts.join('; ')
}
