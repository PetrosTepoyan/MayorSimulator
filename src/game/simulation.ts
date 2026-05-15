import { BUILDINGS } from './buildings'
import type {
  CityStats,
  GameState,
  StatChange,
  StatKey,
  TaxPolicy,
  BudgetAllocation,
} from './types'
import { applyDelta, clamp, clamp01 } from './util'

// ============================================================================
// Tax revenue model
// ============================================================================
// Revenue from each tax type, plus side effects on growth/employment/etc.
//
// All numbers in $M per quarter. Calibrated against the starter country values
// so a typical city produces ~30-80 $M per quarter at moderate rates.

export interface TaxResult {
  revenue: number              // $M for this quarter
  effects: Partial<CityStats>  // side effects on growth, etc.
}

export function computeTaxRevenue(
  tax: TaxPolicy,
  stats: CityStats,
): TaxResult {
  const popM = stats.population / 1_000_000
  const employed = 1 - stats.unemployment / 100

  // Personal income tax — primary revenue source
  const incomeBase = popM * employed * (stats.gdpPerCapita / 1000) // $M base
  const incomeRevenue = incomeBase * (tax.income / 100) * 0.6

  // Sales tax — proportional to consumption (gdp * pop)
  const salesBase = popM * (stats.gdpPerCapita / 1000) * 0.7
  const salesRevenue = salesBase * (tax.sales / 100) * 0.5

  // Property tax — proportional to housing stock & GDP per capita
  const propertyBase = popM * (stats.gdpPerCapita / 1000) * 2.0
  const propertyRevenue = propertyBase * (tax.property / 100)

  // Corporate tax — gdp-driven, sensitive to rate (Laffer-ish)
  const corpBase = popM * (stats.gdpPerCapita / 1000) * 0.3
  const corpEffectiveRate = tax.corporate / 100 * (1 - tax.corporate / 110) // diminishing
  const corpRevenue = corpBase * corpEffectiveRate * 1.2

  const revenue = incomeRevenue + salesRevenue + propertyRevenue + corpRevenue

  // ---- Side effects ----
  const effects: Partial<CityStats> = {}

  // High income tax depresses happiness and growth; very low boosts gdp & inflation
  if (tax.income > 30) effects.happiness = -0.3
  if (tax.income > 35) effects.unemployment = 0.1
  if (tax.income < 12) {
    effects.gdpPerCapita = 80
    effects.inflation = 0.15
    effects.inequality = 0.2
  }

  // Sales tax — regressive, lowers happiness in lower brackets, drives inflation
  if (tax.sales > 18) {
    effects.happiness = (effects.happiness ?? 0) - 0.2
    effects.inflation = (effects.inflation ?? 0) + 0.1
  }
  if (tax.sales < 5) {
    effects.gdpPerCapita = (effects.gdpPerCapita ?? 0) + 30
  }

  // Corporate tax — high rates push businesses out
  if (tax.corporate > 30) {
    effects.gdpPerCapita = (effects.gdpPerCapita ?? 0) - 80
    effects.unemployment = (effects.unemployment ?? 0) + 0.2
    effects.innovation = -0.2
  }
  if (tax.corporate < 15) {
    effects.gdpPerCapita = (effects.gdpPerCapita ?? 0) + 60
    effects.inequality = (effects.inequality ?? 0) + 0.15
  }

  // Property tax — high rates trim inequality (progressive on landlords)
  if (tax.property > 2) {
    effects.inequality = (effects.inequality ?? 0) - 0.15
    effects.happiness = (effects.happiness ?? 0) - 0.1
  }

  return { revenue, effects }
}

// ============================================================================
// Budget allocation effects
// ============================================================================
// Budget is a % split of *discretionary* spending. Total discretionary spend
// per turn = (tax revenue * 0.4). This abstraction keeps it tractable.

export function computeBudgetEffects(
  budget: BudgetAllocation,
  revenue: number,
): { spend: number; effects: Partial<CityStats> } {
  const discretionary = Math.max(0, revenue * 0.4)
  const effects: Partial<CityStats> = {}

  // Helper: each $1M into a category yields a small stat effect.
  // Scaled so balanced budgets give noticeable but realistic shifts.
  const eduSpend = discretionary * (budget.education / 100)
  effects.education = eduSpend * 0.04
  effects.innovation = eduSpend * 0.015

  const healthSpend = discretionary * (budget.healthcare / 100)
  effects.health = healthSpend * 0.05
  effects.happiness = (effects.happiness ?? 0) + healthSpend * 0.01

  const secSpend = discretionary * (budget.security / 100)
  effects.crime = -(secSpend * 0.06)
  // Heavy policing causes mild approval friction
  if (budget.security > 25) effects.approval = -0.2

  const infraSpend = discretionary * (budget.infrastructure / 100)
  effects.gdpPerCapita = infraSpend * 8
  effects.unemployment = -(infraSpend * 0.02)

  const welfareSpend = discretionary * (budget.welfare / 100)
  effects.inequality = -(welfareSpend * 0.06)
  effects.happiness = (effects.happiness ?? 0) + welfareSpend * 0.02
  effects.crime = (effects.crime ?? 0) - welfareSpend * 0.02

  const researchSpend = discretionary * (budget.research / 100)
  effects.innovation = (effects.innovation ?? 0) + researchSpend * 0.08
  effects.gdpPerCapita = (effects.gdpPerCapita ?? 0) + researchSpend * 4

  const envSpend = discretionary * (budget.environment / 100)
  effects.pollution = -(envSpend * 0.08)
  effects.health = (effects.health ?? 0) + envSpend * 0.01

  return { spend: discretionary, effects }
}

// ============================================================================
// Building per-turn effects (operational buildings only)
// ============================================================================

export function computeBuildingEffects(state: GameState): {
  upkeep: number
  effects: Partial<CityStats>
} {
  let upkeep = 0
  const effects: Partial<CityStats> = {}

  for (const b of state.buildings) {
    const def = BUILDINGS[b.type]
    if (!def) continue

    // Upkeep applies to base + variant delta
    let bUpkeep = def.upkeep
    let bEffects = def.perTurnEffect
    if (b.variant && def.variants) {
      const v = def.variants.find((x) => x.id === b.variant)
      if (v) {
        bUpkeep += v.upkeepDelta ?? 0
        bEffects = v.perTurnEffect
      }
    }
    upkeep += bUpkeep

    for (const k of Object.keys(bEffects) as StatKey[]) {
      effects[k] = (effects[k] ?? 0) + (bEffects[k] as number)
    }
  }

  return { upkeep, effects }
}

// ============================================================================
// Natural drift — feedback loops between existing stats
// ============================================================================
// These represent how stats influence each other without explicit decisions.

export function computeNaturalDrift(
  s: CityStats,
): { effects: Partial<CityStats>; notes: string[] } {
  const effects: Partial<CityStats> = {}
  const notes: string[] = []

  // Pollution erodes health
  if (s.pollution > 50) {
    effects.health = -(s.pollution - 50) * 0.04
    notes.push('Pollution is harming public health.')
  }

  // High unemployment raises crime, lowers happiness
  if (s.unemployment > 8) {
    effects.crime = (effects.crime ?? 0) + (s.unemployment - 8) * 0.25
    effects.happiness = (effects.happiness ?? 0) - (s.unemployment - 8) * 0.15
    notes.push('Joblessness is fueling crime and discontent.')
  }

  // Inequality raises crime, lowers happiness over time
  if (s.inequality > 55) {
    effects.crime = (effects.crime ?? 0) + (s.inequality - 55) * 0.05
    effects.happiness = (effects.happiness ?? 0) - (s.inequality - 55) * 0.05
    notes.push('Widening inequality strains social cohesion.')
  }

  // Education compounds slowly into innovation and GDP
  if (s.education > 60) {
    effects.innovation = (effects.innovation ?? 0) + (s.education - 60) * 0.04
    effects.gdpPerCapita = (effects.gdpPerCapita ?? 0) + (s.education - 60) * 4
  }

  // Innovation drives GDP further
  if (s.innovation > 50) {
    effects.gdpPerCapita = (effects.gdpPerCapita ?? 0) + (s.innovation - 50) * 6
  }

  // High inflation eats happiness
  if (s.inflation > 4) {
    effects.happiness = (effects.happiness ?? 0) - (s.inflation - 4) * 0.6
    notes.push('Inflation is biting household budgets.')
  }

  // Approval drifts toward happiness (slow but persistent)
  const approvalGap = s.happiness - s.approval
  effects.approval = approvalGap * 0.15

  // Population drifts based on attractiveness
  const attractiveness =
    (s.happiness - 50) * 0.001 +
    (s.education - 50) * 0.0005 +
    -(s.crime - 30) * 0.0008 +
    -(s.pollution - 30) * 0.0004
  effects.population = Math.round(s.population * attractiveness)

  // Unemployment slow mean reversion influenced by gdp growth
  // (already handled mostly through other effects)

  return { effects, notes }
}

// ============================================================================
// Debt service + credit dynamics
// ============================================================================

export function computeDebtService(s: CityStats): {
  interest: number
  ratingShift: number
} {
  // Annual interest scaled by credit rating: 100→2%, 50→8%, 0→18%
  const annualRate = 0.02 + (1 - s.creditRating / 100) * 0.16
  const interest = (s.debt * annualRate) / 4 // per quarter

  // Credit rating drift: drops if debt/gdp ratio gets ugly
  const gdp = (s.population * s.gdpPerCapita) / 1_000_000 // $M
  const debtToGdp = s.debt / Math.max(1, gdp)
  let ratingShift = 0
  if (debtToGdp > 0.6) ratingShift -= (debtToGdp - 0.6) * 4
  if (debtToGdp < 0.2) ratingShift += 0.5
  if (s.treasury < 0) ratingShift -= 1.5
  if (s.inflation > 10) ratingShift -= 1

  return { interest, ratingShift }
}

// ============================================================================
// Inflation dynamics
// ============================================================================

export function computeInflationDrift(
  s: CityStats,
  taxRevenue: number,
  spendingTotal: number,
): number {
  let delta = 0
  // Deficit drives inflation
  const deficit = spendingTotal - taxRevenue
  if (deficit > 5) delta += deficit * 0.02
  // Hot economy
  if (s.unemployment < 3.5) delta += 0.2
  // Cool economy reduces inflation
  if (s.unemployment > 10) delta -= 0.15
  // Mean reversion toward 2%
  delta += (2 - s.inflation) * 0.05
  return delta
}

// ============================================================================
// Helpers
// ============================================================================

export function statSummary(prev: CityStats, next: CityStats): StatChange[] {
  const out: StatChange[] = []
  for (const k of Object.keys(prev) as StatKey[]) {
    const d = (next[k] as number) - (prev[k] as number)
    if (Math.abs(d) > 0.05) {
      out.push({ stat: k, delta: d, reason: '' })
    }
  }
  return out
}

// Convenience: merge two partial deltas
export function mergeDelta(
  a: Partial<CityStats>,
  b: Partial<CityStats>,
): Partial<CityStats> {
  const out: Partial<CityStats> = { ...a }
  for (const k of Object.keys(b) as StatKey[]) {
    out[k] = ((out[k] ?? 0) + (b[k] ?? 0)) as never
  }
  return out
}

export { applyDelta, clamp, clamp01 }
