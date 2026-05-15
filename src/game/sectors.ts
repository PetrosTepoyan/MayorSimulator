// ============================================================================
// MayorSim — Sectors module
// Economic verticals that make up the city's GDP. Each sector grows, shrinks,
// and reacts to policies, taxes, infrastructure, and macro forces. Aggregate
// results feed back into city-level GDP, unemployment, and innovation.
// ============================================================================

import type {
  Sector,
  Country,
  GameState,
  BuildingType,
} from './types'
import { clamp } from './util'

// Template shape: everything stable per sector type (id, name, icon, weights),
// with the variable fields (share/growth/employment/wage) filled at gen time.
type SectorTemplate = Omit<Sector, 'share' | 'employment' | 'growth' | 'averageWage'>

// Sector definitions — exact ids referenced by country.sectorMix entries.
const SECTOR_TEMPLATES: SectorTemplate[] = [
  {
    id: 'tech',
    name: 'Technology',
    icon: '💻',
    description: 'Software, AI, robotics. High wages, fast growth, hungry for talent.',
    responds: { education: 0.8, research: 1.0, corporateTax: -0.6, infrastructure: 0.3 },
    vulnerabilities: ['talent drain', 'AI regulation shocks'],
  },
  {
    id: 'finance',
    name: 'Finance',
    icon: '🏦',
    description: 'Banks, investment, insurance. High wages, sensitive to confidence.',
    responds: { education: 0.5, corporateTax: -0.7, infrastructure: 0.4 },
    vulnerabilities: ['bond market shocks', 'regulation'],
  },
  {
    id: 'industrial',
    name: 'Industrial',
    icon: '🏭',
    description: 'Manufacturing, heavy industry. Polluting but stable employment.',
    responds: { infrastructure: 0.6, energy: 0.8, corporateTax: -0.4, pollution: 0.3 },
    vulnerabilities: ['supply shocks', 'green transitions'],
  },
  {
    id: 'services',
    name: 'Services',
    icon: '🛎️',
    description: 'Hospitality, retail, professional services. Broad employer.',
    responds: { education: 0.3, infrastructure: 0.3, crime: -0.3 },
    vulnerabilities: ['pandemic', 'consumer slumps'],
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    icon: '🌾',
    description: 'Farming and processing. Vulnerable to weather and trade.',
    responds: { infrastructure: 0.3, energy: 0.4 },
    vulnerabilities: ['drought', 'price shocks'],
  },
  {
    id: 'energy',
    name: 'Energy',
    icon: '⚡',
    description: 'Power generation, fuel processing. Strategic and political.',
    responds: { research: 0.4, infrastructure: 0.5, corporateTax: -0.3 },
    vulnerabilities: ['regulation', 'fuel prices'],
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    icon: '🏥',
    description: 'Hospitals, clinics, pharma. Counter-cyclical employer.',
    responds: { education: 0.4, research: 0.3 },
    vulnerabilities: ['budget cuts', 'pandemics increase demand'],
  },
  {
    id: 'retail',
    name: 'Retail',
    icon: '🛒',
    description: 'Stores, e-commerce, restaurants. Sensitive to consumer mood.',
    responds: { infrastructure: 0.3, crime: -0.4 },
    vulnerabilities: ['consumer confidence', 'rents'],
  },
  {
    id: 'tourism',
    name: 'Tourism',
    icon: '🏖️',
    description: 'Travel, hotels, attractions. Boost from happiness and culture.',
    responds: { infrastructure: 0.5, crime: -0.6, pollution: -0.3 },
    vulnerabilities: ['pandemics', 'climate events'],
  },
]

// Per-sector tunings: starting growth rate (%/quarter) and wage multiplier
// relative to country average income.
const SECTOR_BASE_GROWTH: Record<string, number> = {
  tech: 2.5,
  finance: 1.8,
  industrial: 0.8,
  services: 1.5,
  agriculture: 0.5,
  energy: 1.2,
  healthcare: 1.6,
  retail: 1.3,
  tourism: 1.7,
}

const SECTOR_WAGE_MULTIPLIER: Record<string, number> = {
  tech: 1.7,
  finance: 2.0,
  industrial: 1.0,
  services: 0.7,
  agriculture: 0.5,
  energy: 1.3,
  healthcare: 1.2,
  retail: 0.6,
  tourism: 0.8,
}

// Baseline growth used as a reference point for "swing" / spotlight selection.
const BASELINE_GROWTH = 1.5

// Generate the initial sector list for a country from its sectorMix.
export function generateSectors(country: Country): Sector[] {
  const mix = country.sectorMix ?? {}
  const mixIds = Object.keys(mix)
  const useTemplates = SECTOR_TEMPLATES.filter((t) =>
    mixIds.length > 0 ? mixIds.includes(t.id) : true,
  )
  // If country has no mix at all, fall back to an even split across all templates.
  const evenShare = mixIds.length === 0 ? 100 / SECTOR_TEMPLATES.length : 0
  const employedPopulation =
    country.startingStats.population *
    (1 - country.startingStats.unemployment / 100)
  // Rough country-wide average income proxy from GDP per capita.
  const countryAvgIncome = country.startingStats.gdpPerCapita

  return useTemplates.map((tpl) => {
    const share = mixIds.length === 0 ? evenShare : (mix[tpl.id] ?? 0)
    const growth = SECTOR_BASE_GROWTH[tpl.id] ?? BASELINE_GROWTH
    const wageMul = SECTOR_WAGE_MULTIPLIER[tpl.id] ?? 1.0
    const employment = Math.max(
      0,
      Math.round(employedPopulation * (share / 100)),
    )
    const averageWage = Math.round(countryAvgIncome * wageMul)
    return {
      id: tpl.id,
      name: tpl.name,
      icon: tpl.icon,
      description: tpl.description,
      share,
      growth,
      employment,
      averageWage,
      responds: { ...tpl.responds },
      vulnerabilities: [...tpl.vulnerabilities],
    }
  })
}

// Count buildings of a given type — used for innovation contribution.
function countBuildings(state: GameState, type: BuildingType): number {
  return state.buildings.filter((b) => b.type === type).length
}

// Compute a per-sector growth modifier from the sector's `responds` weights.
function growthModifiersFor(sector: Sector, state: GameState): number {
  const stats = state.stats
  const budget = state.budget
  const tax = state.tax
  const macro = state.macro
  const r = sector.responds
  let mod = 0

  if (r.education !== undefined) {
    mod += ((stats.education - 50) / 50) * r.education
  }
  if (r.research !== undefined) {
    mod += (budget.research / 20) * r.research
  }
  if (r.infrastructure !== undefined) {
    mod += (budget.infrastructure / 20) * r.infrastructure
  }
  if (r.corporateTax !== undefined) {
    // Low tax = positive growth (weight is typically negative)
    mod += ((20 - tax.corporate) / 20) * r.corporateTax
  }
  if (r.pollution !== undefined) {
    // Polluted environment helps polluting sectors (positive weight) and
    // hurts clean ones (negative weight, e.g. tourism).
    mod += ((stats.pollution - 30) / 70) * r.pollution
  }
  if (r.crime !== undefined) {
    // Low crime is positive when weight is negative (typical for retail/tourism).
    mod += ((30 - stats.crime) / 30) * r.crime
  }
  if (r.energy !== undefined) {
    const federal = macro?.federalFunding ?? 0
    mod += federal > 5 ? 0.5 * r.energy : 0
  }
  return mod
}

// Per-turn evolution: applies growth, recalibrates share/employment, returns deltas.
export function updateSectorsPerTurn(
  sectors: Sector[],
  state: GameState,
): {
  sectors: Sector[]
  gdpDelta: number
  unemploymentDelta: number
  innovationDelta: number
  notes: string[]
} {
  const notes: string[] = []
  const macro = state.macro
  const nationalShift = ((macro?.nationalGdpGrowth ?? 2) - 2) / 4
  const techWave = macro?.techWave ?? 0

  // Step 1: compute each sector's new growth rate based on policies + macro.
  const withGrowth: Sector[] = sectors.map((s) => {
    const base = SECTOR_BASE_GROWTH[s.id] ?? BASELINE_GROWTH
    let g = base + growthModifiersFor(s, state) + nationalShift

    // Tech wave: creative destruction when wave is strong.
    if (techWave > 70) {
      if (s.id === 'tech') g += 1.5
      else if (s.id === 'services') g -= 0.3
      else if (s.id === 'industrial') g -= 0.5
    }

    const growth = clamp(g, -5, 8)
    return { ...s, growth }
  })

  // Step 2: apply growth to shares (with floor/ceiling) and renormalize.
  const grown: Sector[] = withGrowth.map((s) => ({
    ...s,
    share: clamp(s.share * (1 + s.growth / 100), 0.5, 60),
  }))
  const totalShare = grown.reduce((sum, s) => sum + s.share, 0)
  const normalized: Sector[] = grown.map((s) => ({
    ...s,
    share: totalShare > 0 ? (s.share / totalShare) * 100 : s.share,
  }))

  // Step 3: redistribute employment by share, with a touch of inertia from
  // previous employment so workforces don't teleport between sectors.
  const totalPopulation = state.stats.population
  const employedJobs = Math.max(
    0,
    Math.round(totalPopulation * (1 - state.stats.unemployment / 100)),
  )
  const totalPrevEmployment = sectors.reduce((sum, s) => sum + s.employment, 0)
  const next: Sector[] = normalized.map((s, idx) => {
    const targetByShare = employedJobs * (s.share / 100)
    const prev = sectors[idx]?.employment ?? targetByShare
    // 70% new target, 30% prior (inertia).
    const employment = Math.max(0, Math.round(targetByShare * 0.7 + prev * 0.3))
    return { ...s, employment }
  })

  // Step 4: aggregate effects on city stats.
  // GDP contribution: average of (growth * share) scaled into $ per turn.
  const weightedGrowth =
    next.reduce((sum, s) => sum + s.growth * (s.share / 100), 0) /
    Math.max(1, next.length)
  const gdpDelta = weightedGrowth * 30

  const avgGrowth =
    next.reduce((sum, s) => sum + s.growth, 0) / Math.max(1, next.length)
  let unemploymentDelta = 0
  if (avgGrowth > 1.5) unemploymentDelta = -0.1
  else if (avgGrowth < 0.5) unemploymentDelta = 0.1

  const techShare = next.find((s) => s.id === 'tech')?.share ?? 0
  const researchLabs = countBuildings(state, 'researchLab')
  const innovationDelta = ((techShare - 10) / 10) * 0.5 + researchLabs * 0.1

  // Step 5: narrative notes for big swings (>2% absolute growth or sharp
  // movement from the prior turn's growth value).
  for (let i = 0; i < next.length; i++) {
    const cur = next[i]
    const prev = sectors[i]
    const swing = Math.abs(cur.growth - (prev?.growth ?? BASELINE_GROWTH))
    if (cur.growth > 3.5 || swing > 2) {
      notes.push(`${cur.name} sector booming this quarter (${cur.growth.toFixed(1)}%).`)
    } else if (cur.growth < -1 || (prev && prev.growth - cur.growth > 2)) {
      notes.push(`${cur.name} output contracting (${cur.growth.toFixed(1)}%).`)
    }
  }
  // Tech wave specific narrative.
  if (techWave > 70 && next.some((s) => s.id === 'tech')) {
    notes.push('Tech wave is reshaping the economy — winners and losers.')
  }
  // Total unemployment context.
  if (totalPrevEmployment > 0) {
    const employmentShift =
      (next.reduce((sum, s) => sum + s.employment, 0) - totalPrevEmployment) /
      totalPrevEmployment
    if (employmentShift > 0.02) {
      notes.push('Job creation across sectors is accelerating.')
    } else if (employmentShift < -0.02) {
      notes.push('Net layoffs reported across multiple sectors.')
    }
  }

  return {
    sectors: next,
    gdpDelta,
    unemploymentDelta,
    innovationDelta,
    notes,
  }
}

// Find a sector by id (immutable lookup).
export function getSector(sectors: Sector[], id: string): Sector | undefined {
  return sectors.find((s) => s.id === id)
}

// Pick the sector with the biggest deviation from baseline growth — the one
// that's most worth highlighting in UI this turn.
export function spotlightSector(sectors: Sector[]): Sector | null {
  if (sectors.length === 0) return null
  let best: Sector | null = null
  let bestSwing = -Infinity
  for (const s of sectors) {
    const swing = Math.abs(s.growth - BASELINE_GROWTH)
    if (swing > bestSwing) {
      bestSwing = swing
      best = s
    }
  }
  return best
}
