// ============================================================================
// MayorSim — Districts
// Per-neighborhood demographics and the simulation logic that drifts them
// forward each turn. Districts are the granular layer beneath CityStats:
// city-wide aggregates are computed as population-weighted means of districts
// (plus some derived signals like inequality and housing-driven happiness).
// ============================================================================

import type {
  Country,
  District,
  DistrictStats,
  CityStats,
  Building,
  PolicyState,
  IndustryType,
  PoliticalLeaning,
} from './types'
import { clamp, clamp01 } from './util'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// Stable, deterministic-ish small noise for initialization so districts get a
// bit of texture without needing a seedable RNG plumbed through.
const noise = (lo: number, hi: number): number => lo + Math.random() * (hi - lo)

// Convert a district name into a url/id-safe slug fragment.
const slug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

// Short, human-readable flavor blurb derived from the template's industry +
// leaning so the UI has something to show without a hand-written field.
const buildFlavor = (
  industry: IndustryType,
  leaning: PoliticalLeaning,
): string => {
  const ind: Record<IndustryType, string> = {
    industrial: 'Smokestacks, freight yards and shift workers.',
    finance: 'Glass towers, hedge funds and after-hours cocktails.',
    tech: 'Open-plan offices, e-bikes and stock options.',
    services: 'Cafes, dry cleaners and small offices — the everyday city.',
    agriculture: 'Open fields feeding the city, low density.',
    residential: 'Apartments and family blocks where people actually sleep.',
    tourism: 'Hotels, beach bars and souvenir shops.',
    energy: 'Power infrastructure and the workers who keep it running.',
    university: 'Lecture halls, dorms and 2am study sessions.',
    mixed: 'A bit of everything — a working slice of the city.',
  }
  const lean: Record<PoliticalLeaning, string> = {
    progressive: 'Leans progressive.',
    centrist: 'Politically pragmatic.',
    conservative: 'Leans conservative.',
  }
  return `${ind[industry]} ${lean[leaning]}`
}

// Clamp the subset of DistrictStats that are 0-100 scales; population and
// avgIncome are unbounded counts/dollars so they pass through untouched.
const DISTRICT_PCT_KEYS: ReadonlyArray<keyof DistrictStats> = [
  'education',
  'crime',
  'pollution',
  'unrest',
  'approval',
  'housing',
]

const clampDistrictStats = (s: DistrictStats): DistrictStats => {
  const out: DistrictStats = { ...s }
  for (const k of DISTRICT_PCT_KEYS) {
    out[k] = clamp01(out[k])
  }
  out.population = Math.max(0, Math.round(out.population))
  out.avgIncome = Math.max(0, Math.round(out.avgIncome))
  return out
}

// Merge a partial DistrictStats delta into a stats object, clamping after.
const mergeDistrictDelta = (
  base: DistrictStats,
  delta: Partial<DistrictStats>,
): DistrictStats => {
  const next: DistrictStats = { ...base }
  for (const key of Object.keys(delta) as Array<keyof DistrictStats>) {
    const d = delta[key]
    if (d === undefined) continue
    next[key] = (next[key] as number) + (d as number)
  }
  return clampDistrictStats(next)
}

// Baseline unrest depends on character: poorer industrial/residential areas
// simmer hotter than glassy finance districts.
const baselineUnrest = (
  industry: IndustryType,
  incomeMultiplier: number,
): number => {
  let base = 12 + Math.random() * 13 // 12..25
  if (industry === 'industrial' || industry === 'residential') base += 4
  if (incomeMultiplier < 0.7) base += 6
  if (industry === 'finance' || industry === 'tech') base -= 4
  return clamp01(base)
}

// Baseline housing availability — finance areas have luxury slack, dense
// residential areas are tight, agriculture is roomy by default.
const baselineHousing = (
  industry: IndustryType,
  incomeMultiplier: number,
): number => {
  let base = 60
  if (industry === 'residential') base -= 12 // dense, tight market
  if (industry === 'finance') base += 8 // expensive but plenty of stock
  if (industry === 'agriculture') base += 10
  if (industry === 'tech' && incomeMultiplier > 1.4) base -= 6 // tech boom prices people out
  if (industry === 'industrial') base += 2
  return clamp01(base + noise(-3, 3))
}

// Population-weighted mean utility used by aggregation and per-turn drift.
const popWeightedMean = (
  districts: District[],
  pick: (d: District) => number,
): number => {
  const totalPop = districts.reduce((s, d) => s + d.stats.population, 0)
  if (totalPop <= 0) return 0
  const sum = districts.reduce(
    (s, d) => s + pick(d) * d.stats.population,
    0,
  )
  return sum / totalPop
}

// Standard deviation of a numeric series — used to express income spread as
// the city's inequality signal.
const stdDev = (values: number[]): number => {
  if (values.length === 0) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance =
    values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / values.length
  return Math.sqrt(variance)
}

// ---------------------------------------------------------------------------
// 1. generateDistricts
// ---------------------------------------------------------------------------

// Instantiate the country's district templates into live District objects,
// apportioning starting population and biasing stats so each neighborhood
// feels distinct from turn one.
export function generateDistricts(country: Country): District[] {
  const templates = country.districtTemplates ?? []
  const cs = country.startingStats

  return templates.map((tpl, index) => {
    const id = `district_${index}_${slug(tpl.name)}`
    const population = Math.round(cs.population * tpl.popShare)
    const avgIncome = Math.round(cs.gdpPerCapita * tpl.incomeMultiplier)

    const education = clamp01(cs.education + (tpl.educationBias ?? 0))
    const crime = clamp01(cs.crime + (tpl.crimeBias ?? 0))
    const pollution = clamp01(cs.pollution + (tpl.pollutionBias ?? 0))

    // Approval starts near city approval with a touch of district noise so
    // the map doesn't look uniform on turn one.
    const approval = clamp01(cs.approval + noise(-5, 5))

    const unrest = baselineUnrest(tpl.industry, tpl.incomeMultiplier)
    const housing = baselineHousing(tpl.industry, tpl.incomeMultiplier)

    const stats: DistrictStats = {
      population,
      avgIncome,
      education,
      crime,
      pollution,
      unrest,
      approval,
      housing,
    }

    return {
      id,
      name: tpl.name,
      primaryIndustry: tpl.industry,
      leaning: tpl.leaning,
      flavor: buildFlavor(tpl.industry, tpl.leaning),
      stats: clampDistrictStats(stats),
    }
  })
}

// ---------------------------------------------------------------------------
// 2. aggregateFromDistricts
// ---------------------------------------------------------------------------

// Roll district-level data up into the city-wide stat subset. Approval/
// education/crime/pollution are population-weighted means so big districts
// dominate the headline number; inequality is derived from income spread.
export function aggregateFromDistricts(districts: District[]): {
  population: number
  education: number
  crime: number
  pollution: number
  approval: number
  happinessBoost: number
  inequality: number
} {
  if (districts.length === 0) {
    return {
      population: 0,
      education: 0,
      crime: 0,
      pollution: 0,
      approval: 0,
      happinessBoost: 0,
      inequality: 0,
    }
  }

  const population = districts.reduce((s, d) => s + d.stats.population, 0)
  const education = popWeightedMean(districts, (d) => d.stats.education)
  const crime = popWeightedMean(districts, (d) => d.stats.crime)
  const pollution = popWeightedMean(districts, (d) => d.stats.pollution)
  const approval = popWeightedMean(districts, (d) => d.stats.approval)

  // Housing drives a small happiness contribution: a city of 50 average
  // housing yields +5 happiness, a city of 80 yields +8.
  const meanHousing =
    districts.reduce((s, d) => s + d.stats.housing, 0) / districts.length
  const happinessBoost = meanHousing * 0.1

  // Inequality: spread of district incomes around their mean, scaled into a
  // 0-100 band. The divisor turns typical city spreads (a few thousand $) into
  // a Gini-ish number; clamped so very poor mono-income cities don't read 0.
  const incomes = districts.map((d) => d.stats.avgIncome)
  const meanIncome = incomes.reduce((s, v) => s + v, 0) / incomes.length
  const sd = stdDev(incomes)
  const inequality = clamp(
    meanIncome > 0 ? (sd / meanIncome) * 100 : 0,
    0,
    100,
  )

  return {
    population,
    education,
    crime,
    pollution,
    approval,
    happinessBoost,
    inequality,
  }
}

// ---------------------------------------------------------------------------
// 3. updateDistrictsPerTurn
// ---------------------------------------------------------------------------

// Per-building per-turn effects on the district where the building sits.
// Kept small — buildings nudge, they don't dominate the simulation.
const buildingDistrictEffect = (b: Building): Partial<DistrictStats> => {
  switch (b.type) {
    case 'school':
      return { education: 0.2 }
    case 'university':
      return { education: 0.35, approval: 0.05 }
    case 'library':
      return { education: 0.15, crime: -0.05 }
    case 'hospital':
      return { approval: 0.1 }
    case 'jail':
      return { crime: -0.4, approval: -0.05 }
    case 'park':
      return { crime: -0.05, pollution: -0.1, approval: 0.1 }
    case 'wasteTreatment':
      return { pollution: -0.3 }
    case 'housing':
      return { housing: 0.5 }
    case 'transitHub':
      return { approval: 0.1, pollution: -0.05 }
    case 'culturalCenter':
      return { approval: 0.15, unrest: -0.1 }
    case 'stadium':
      return { approval: 0.1, unrest: -0.05 }
    case 'fireStation':
      return { unrest: -0.05 }
    case 'industrialPark':
      return { pollution: 0.2, avgIncome: 20 }
    case 'financialCenter':
      return { avgIncome: 40, approval: 0.05 }
    case 'researchLab':
      return { education: 0.1, avgIncome: 15 }
    case 'powerPlant':
      return { pollution: 0.15 }
    default:
      return {}
  }
}

// Leaning-aware nudge: a policy that pleases progressives by +1 should also
// quietly annoy conservatives at -1, with centrists splitting the difference.
const leaningSign = (
  leaning: PoliticalLeaning,
  pleases: PoliticalLeaning,
): number => {
  if (leaning === pleases) return 1
  if (leaning === 'centrist' || pleases === 'centrist') return 0
  return -1
}

// Walk every district through one quarter of drift driven by macro stats,
// policies, the district's own stats and any buildings sited inside it. Pure
// — returns a fresh array and never mutates inputs.
export function updateDistrictsPerTurn(
  districts: District[],
  cityStats: CityStats,
  policy: PolicyState,
  buildings: Building[],
): { districts: District[]; notes: string[] }
{
  const notes: string[] = []

  // Pre-group buildings by district so we don't scan the array N times.
  const buildingsByDistrict = new Map<string, Building[]>()
  for (const b of buildings) {
    if (!b.districtId) continue
    const arr = buildingsByDistrict.get(b.districtId) ?? []
    arr.push(b)
    buildingsByDistrict.set(b.districtId, arr)
  }

  const next = districts.map((d) => {
    const s = d.stats
    let nEducation = s.education
    let nCrime = s.crime
    let nPollution = s.pollution
    let nUnrest = s.unrest
    let nApproval = s.approval
    let nHousing = s.housing
    let nIncome = s.avgIncome
    const nPopulation = s.population

    // --- Environmental decay: heavy pollution rots quality of life slowly.
    if (s.pollution > 60) {
      nHousing -= 0.4
      nEducation -= 0.1
    } else if (s.pollution < 25) {
      // Clean districts slowly improve as people move/invest.
      nHousing += 0.05
    }

    // --- Crime / education feedback: ignorant + unsafe places boil over.
    if (s.crime > 60 && cityStats.education < 55) {
      nUnrest += 1
    }
    // Prosperous + happy cities cool unrest in their districts.
    if (s.avgIncome > cityStats.gdpPerCapita && cityStats.happiness > 60) {
      nUnrest -= 1
    }
    // High crime without enough policing also raises unrest a touch.
    if (s.crime > 75) nUnrest += 0.5

    // --- Approval mean-reverts toward city approval, biased by leaning.
    // Each district reads city mood through its own political lens.
    const leaningBonus =
      d.leaning === 'progressive'
        ? (policy.minimumWage > 15 ? 1 : 0)
        : d.leaning === 'conservative'
          ? (policy.minimumWage > 25 ? -1 : 0)
          : 0
    const target = clamp01(cityStats.approval + leaningBonus)
    nApproval += (target - nApproval) * 0.2

    // Emission standards: greens love strict, conservatives grumble.
    if (policy.emissionStandards === 'strict') {
      nApproval += leaningSign(d.leaning, 'progressive') * 1
      // Strict standards also actually scrub the air a little.
      nPollution -= 0.3
    } else if (policy.emissionStandards === 'lax') {
      nApproval += leaningSign(d.leaning, 'conservative') * 0.5
      if (
        d.primaryIndustry === 'industrial' ||
        d.primaryIndustry === 'energy'
      ) {
        nPollution += 0.4
      }
    }

    // Rent control: helps housing perception in dense residential at the
    // cost of long-run supply (we model the short-term feel here).
    if (policy.rentControl === 'strict') {
      if (d.primaryIndustry === 'residential') nApproval += 0.3
      nHousing -= 0.1
    } else if (policy.rentControl === 'soft') {
      if (d.primaryIndustry === 'residential') nApproval += 0.1
    }

    // Drug policy nudges crime up/down depending on stance.
    if (policy.drugPolicy === 'punitive') nCrime -= 0.05
    if (policy.drugPolicy === 'lenient') nCrime += 0.05

    // --- Income mean-reverts toward city GDP * district multiplier-ish.
    // We don't keep the multiplier separately, so we anchor to current income
    // and gently pull it toward city gdpPerCapita weighted by an implied
    // local multiplier (currentIncome / cityGdp), which keeps districts from
    // converging to the mean while letting macro shocks pull everyone.
    const cityGdp = Math.max(1, cityStats.gdpPerCapita)
    const localMultiplier = nIncome / cityGdp
    const incomeTarget = cityGdp * localMultiplier
    nIncome += (incomeTarget - nIncome) * 0.05
    // Macro growth raises incomes a touch each quarter; inflation eats some.
    nIncome *= 1 + 0.002 - cityStats.inflation * 0.0005

    // --- Buildings: each sited building nudges its district.
    const local = buildingsByDistrict.get(d.id) ?? []
    for (const b of local) {
      const fx = buildingDistrictEffect(b)
      if (fx.education !== undefined) nEducation += fx.education
      if (fx.crime !== undefined) nCrime += fx.crime
      if (fx.pollution !== undefined) nPollution += fx.pollution
      if (fx.unrest !== undefined) nUnrest += fx.unrest
      if (fx.approval !== undefined) nApproval += fx.approval
      if (fx.housing !== undefined) nHousing += fx.housing
      if (fx.avgIncome !== undefined) nIncome += fx.avgIncome
    }

    // --- Tight housing breeds resentment; loose housing settles it.
    if (nHousing < 30) nUnrest += 0.5
    if (nHousing > 70) nUnrest -= 0.2

    const nextStats: DistrictStats = clampDistrictStats({
      population: nPopulation,
      avgIncome: nIncome,
      education: nEducation,
      crime: nCrime,
      pollution: nPollution,
      unrest: nUnrest,
      approval: nApproval,
      housing: nHousing,
    })

    if (nextStats.unrest > 75 && s.unrest <= 75) {
      notes.push(`Unrest rising in ${d.name}`)
    } else if (nextStats.unrest > 75) {
      notes.push(`Unrest still high in ${d.name}`)
    }

    return { ...d, stats: nextStats }
  })

  return { districts: next, notes }
}

// ---------------------------------------------------------------------------
// 4. applyCitywideDelta / applyDistrictDelta
// ---------------------------------------------------------------------------

// Apply the same DistrictStats delta to every district — used by events that
// touch the whole city (a heatwave, federal stimulus, a riot wave).
export function applyCitywideDelta(
  districts: District[],
  delta: Partial<DistrictStats>,
): District[] {
  return districts.map((d) => ({
    ...d,
    stats: mergeDistrictDelta(d.stats, delta),
  }))
}

// Apply a delta to a single district by id; non-matching districts are passed
// through unchanged so callers can chain this safely.
export function applyDistrictDelta(
  districts: District[],
  districtId: string,
  delta: Partial<DistrictStats>,
): District[] {
  return districts.map((d) =>
    d.id === districtId
      ? { ...d, stats: mergeDistrictDelta(d.stats, delta) }
      : d,
  )
}

// ---------------------------------------------------------------------------
// 5. pickHighlightDistrict
// ---------------------------------------------------------------------------

// Pick the most-extreme district on a given stat for surfacing in the UI
// ("Worst crime: Southside"). worst=true returns the highest value when the
// metric is bad (crime/pollution/unrest) — callers pass worst=true to mean
// "the standout in the unwanted direction."
export function pickHighlightDistrict(
  districts: District[],
  metric: keyof DistrictStats,
  worst: boolean,
): District | null {
  if (districts.length === 0) return null
  // "Bad" metrics — for these, the worst is the maximum; for "good" metrics
  // (approval/education/housing/avgIncome/population) the worst is the min.
  const badMetrics: ReadonlyArray<keyof DistrictStats> = [
    'crime',
    'pollution',
    'unrest',
  ]
  const isBadMetric = badMetrics.includes(metric)
  const wantMax = worst ? isBadMetric : !isBadMetric

  let best = districts[0]
  let bestVal = best.stats[metric]
  for (let i = 1; i < districts.length; i++) {
    const v = districts[i].stats[metric]
    if (wantMax ? v > bestVal : v < bestVal) {
      best = districts[i]
      bestVal = v
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// 6. districtUnrestRisk
// ---------------------------------------------------------------------------

// Translate a district's current state into a 0-1 probability that the event
// system can use to roll for protests/riots. Layered: baseline from current
// unrest, plus penalties for high crime and lost approval.
export function districtUnrestRisk(district: District): number {
  const s = district.stats
  let risk = s.unrest / 100
  if (s.crime > 60) risk += 0.2
  if (s.approval < 30) risk += 0.15
  return clamp(risk, 0, 0.95)
}
