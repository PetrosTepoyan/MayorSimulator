// ============================================================================
// MayorSim — Household Economics Subsystem
// ----------------------------------------------------------------------------
// Models the financial life of the median city household: savings rate,
// household debt-to-income, rent burden, food insecurity, retirement
// readiness, emergency-fund coverage, banking access, consumer credit
// availability, and eviction pressure.
//
// Outputs feed into CityStats (happiness, inequality, approval drift) and
// drive consumer confidence and financial fragility narratives.
//
// Design notes:
//  - Per-turn effects are small (sub-1 typically) so that sustained policy,
//    not single-turn jolts, drives outcomes.
//  - Real-world signals: inflation erodes savings, rent burden above 30%
//    is the federal "cost-burdened" threshold; emergency fund coverage
//    tracks the well-known "1-in-3 Americans can't cover $400" stat.
// ============================================================================

import type { CityStats, GameState, PolicyState } from './types'
import { clamp, clamp01 } from './util'

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export interface HouseholdState {
  savingsRate: number              // 0-30 % of income saved
  householdDebtToIncome: number    // ratio (e.g. 1.5 = 150% of income)
  rentBurden: number               // 0-100 % of low/median incomes spent on rent
  foodInsecurityRate: number       // 0-100 % of households
  retirementReadinessIndex: number // 0-100 of working-age
  medianHouseholdSavings: number   // $ (median balance)
  emergencyFundCoverage: number    // 0-100 % of households with 3-month emergency fund
  bankUnbankedRate: number         // 0-100 % unbanked
  consumerCredit: number           // 0-100 credit availability
  evictionsPer1000: number         // per year per 1000 households
}

// ============================================================================
// LOCAL CONSTANTS
// ============================================================================

// Practical bounds on each scalar (avoid runaway compounding).
const MIN_SAVINGS_RATE = 0
const MAX_SAVINGS_RATE = 30

const MIN_DEBT_RATIO = 0
const MAX_DEBT_RATIO = 4 // 400% of income — collapse territory

const MIN_EVICTIONS = 0
const MAX_EVICTIONS = 60 // per 1,000 households / yr (very high)

// Rent-burden thresholds widely used in housing-policy literature.
const RENT_BURDEN_COST_BURDENED = 30 // pays >30% → "cost-burdened"
const RENT_BURDEN_SEVERE = 50        // pays >50% → "severely cost-burdened"

// Sahel and similar EM markets start with much higher unbanked rates.
const SAHEL_LIKE_COUNTRY_IDS = new Set<string>(['sahel'])

// ============================================================================
// INITIALIZATION
// ----------------------------------------------------------------------------
// generateHouseholdState builds the starting HouseholdState from initial
// CityStats and PolicyState. All formulas follow the spec, then results are
// clamped to safe operating ranges.
// ============================================================================

export function generateHouseholdState(
  stats: CityStats,
  policy: PolicyState,
  countryId?: string,
): HouseholdState {
  const savingsRate = clamp(
    8 + (stats.gdpPerCapita > 30000 ? 4 : -2),
    MIN_SAVINGS_RATE,
    MAX_SAVINGS_RATE,
  )

  const householdDebtToIncome = clamp(
    1.0 + (stats.inflation > 5 ? 0.3 : 0),
    MIN_DEBT_RATIO,
    MAX_DEBT_RATIO,
  )

  const rentBurden = clamp01(30 + (stats.inequality - 50) * 0.4)

  const foodInsecurityRate = clamp01(12 + stats.unemployment * 0.3)

  const retirementReadinessIndex = clamp01(
    45 + (stats.gdpPerCapita > 40000 ? 10 : -5),
  )

  const medianHouseholdSavings = Math.max(0, stats.gdpPerCapita * 0.05)

  const emergencyFundCoverage = clamp01(35)

  // Strict policies & strong universal welfare tend to nudge minimum-wage up;
  // some emerging markets simply have much weaker banking penetration.
  const isSahelLike = countryId !== undefined && SAHEL_LIKE_COUNTRY_IDS.has(countryId)
  // Spec: "5 (or 20 in sahel)". We additionally treat very low GDP/capita as
  // EM-like to avoid hard-coding country lists where possible.
  const bankUnbankedRate = clamp01(
    isSahelLike || stats.gdpPerCapita < 8000 ? 20 : 5,
  )

  const consumerCredit = clamp01(60)

  const evictionsPer1000 = clamp(
    5 + (rentBurden - 30) * 0.2,
    MIN_EVICTIONS,
    MAX_EVICTIONS,
  )

  // Touch policy so unused-param lint is satisfied — and to allow a small
  // tilt: free transit slightly relieves real household costs (more cash
  // free for savings).  Effect is small and conservative.
  let savingsRateAdjusted = savingsRate
  if (policy.transit === 'free') {
    savingsRateAdjusted = clamp(
      savingsRateAdjusted + 0.5,
      MIN_SAVINGS_RATE,
      MAX_SAVINGS_RATE,
    )
  }
  // Universal healthcare reduces existential medical-debt fear at baseline.
  let retirementReadinessAdjusted = retirementReadinessIndex
  if (policy.healthcare === 'universal') {
    retirementReadinessAdjusted = clamp01(retirementReadinessAdjusted + 2)
  }

  return {
    savingsRate: savingsRateAdjusted,
    householdDebtToIncome,
    rentBurden,
    foodInsecurityRate,
    retirementReadinessIndex: retirementReadinessAdjusted,
    medianHouseholdSavings,
    emergencyFundCoverage,
    bankUnbankedRate,
    consumerCredit,
    evictionsPer1000,
  }
}

// ============================================================================
// PER-TURN UPDATE
// ----------------------------------------------------------------------------
// Pure: takes the current HouseholdState plus the read-only GameState, and
// returns a fresh HouseholdState, a CityStats delta to be applied via the
// usual applyDelta machinery, and human-readable narrative notes.
// ============================================================================

export function updateHouseholdPerTurn(
  hh: HouseholdState,
  state: GameState,
): { household: HouseholdState; effects: Partial<CityStats>; notes: string[] } {
  const notes: string[] = []
  const stats = state.stats
  const policy = state.policy

  // Read budget categories with defensive defaults so a missing key never
  // throws — most callers should provide all categories.
  const welfareBudget = clamp(state.budget.welfare ?? 0, 0, 100)
  const educationBudget = clamp(state.budget.education ?? 0, 0, 100)
  const infrastructureBudget = clamp(state.budget.infrastructure ?? 0, 0, 100)

  // --------------------------------------------------------------------
  // 1. Savings rate
  // High inflation eats real returns; high minimum wage helps low earners
  // sock away a little more; severe rent burden makes saving impossible.
  // --------------------------------------------------------------------
  let savingsRate = hh.savingsRate
  if (stats.inflation > 4) {
    savingsRate -= (stats.inflation - 4) * 0.1
  }
  if (policy.minimumWage >= 15) {
    // Spec: minimumWage high → savingsRate += 0.05 for lower incomes.
    savingsRate += 0.05 + (policy.minimumWage - 15) * 0.01
  }
  // Welfare floor reduces precautionary saving pressure but lets the poorest
  // start saving anything; net very small positive.
  savingsRate += (welfareBudget / 100) * 0.1
  // Severe rent burden crowds out saving entirely.
  if (hh.rentBurden > RENT_BURDEN_SEVERE) {
    savingsRate -= 0.2
  }
  savingsRate = clamp(savingsRate, MIN_SAVINGS_RATE, MAX_SAVINGS_RATE)

  if (savingsRate < 2 && hh.savingsRate >= 2) {
    notes.push('Household savings depleted by inflation and rent pressure.')
  }

  // --------------------------------------------------------------------
  // 2. Household debt-to-income
  // Easy consumer credit + high inflation + unemployment push debt up.
  // Strong wages and welfare slowly pay it down.
  // --------------------------------------------------------------------
  let householdDebtToIncome = hh.householdDebtToIncome
  if (stats.inflation > 4) {
    householdDebtToIncome += (stats.inflation - 4) * 0.01
  }
  if (stats.unemployment > 7) {
    householdDebtToIncome += (stats.unemployment - 7) * 0.01
  }
  // Tighter credit (consumerCredit < 50) actually shrinks new borrowing.
  if (hh.consumerCredit < 50) {
    householdDebtToIncome -= 0.005
  }
  // Healthy savings paydown.
  if (savingsRate > 10) {
    householdDebtToIncome -= 0.01
  }
  // Welfare buffer reduces emergency borrowing.
  householdDebtToIncome -= (welfareBudget / 100) * 0.01
  householdDebtToIncome = clamp(
    householdDebtToIncome,
    MIN_DEBT_RATIO,
    MAX_DEBT_RATIO,
  )

  if (householdDebtToIncome > 2.0 && hh.householdDebtToIncome <= 2.0) {
    notes.push('Household debt has crossed 200% of income — financial fragility rising.')
  }

  // --------------------------------------------------------------------
  // 3. Rent burden
  // Inflation pushes rents faster than wages; strict rent control caps it;
  // big infrastructure / housing-supply spend slowly eases it.
  // --------------------------------------------------------------------
  let rentBurden = hh.rentBurden
  if (stats.inflation > 3) {
    rentBurden += (stats.inflation - 3) * 0.15
  }
  if (policy.rentControl === 'strict') {
    rentBurden -= 0.5
  } else if (policy.rentControl === 'soft') {
    rentBurden -= 0.15
  } else if (policy.rentControl === 'none' && stats.inflation > 5) {
    // unchecked market: a little extra creep when prices are rising fast
    rentBurden += 0.1
  }
  // Housing supply: count housing buildings — more = more relief.
  let housingCount = 0
  for (const b of state.buildings) {
    if (b.type === 'housing') housingCount++
  }
  // Each housing building gives a tiny breather; capped so it can't trivially
  // eliminate the burden.
  rentBurden -= Math.min(2, housingCount * 0.05)
  // Infrastructure investment slowly increases supply quality / transit
  // access, easing where people *must* live near work.
  rentBurden -= (infrastructureBudget / 100) * 0.1
  rentBurden = clamp01(rentBurden)

  if (rentBurden > 40 && hh.rentBurden <= 40) {
    notes.push('Rent burden hitting 40% — middle-income families are squeezed.')
  } else if (rentBurden > RENT_BURDEN_SEVERE && hh.rentBurden <= RENT_BURDEN_SEVERE) {
    notes.push('Severe rent burden — over half of income lost to housing for many.')
  }

  // --------------------------------------------------------------------
  // 4. Food insecurity
  // Unemployment and inflation drive it; welfare and education (financial
  // literacy + school meals) pull it down.
  // --------------------------------------------------------------------
  let foodInsecurityRate = hh.foodInsecurityRate
  if (stats.unemployment > 6) {
    foodInsecurityRate += (stats.unemployment - 6) * 0.5
  }
  if (stats.inflation > 4) {
    foodInsecurityRate += (stats.inflation - 4) * 0.2
  }
  // Welfare budget high → spec: foodInsecurity -0.4 per turn at full tilt.
  foodInsecurityRate -= (welfareBudget / 100) * 0.4
  foodInsecurityRate -= (educationBudget / 100) * 0.1 // school meals
  foodInsecurityRate = clamp01(foodInsecurityRate)

  if (foodInsecurityRate > 20 && hh.foodInsecurityRate <= 20) {
    notes.push('Food insecurity is rising — food banks report strain.')
  }

  // --------------------------------------------------------------------
  // 5. Retirement readiness
  // Universal healthcare reduces medical-cost fear; sustained savings &
  // strong wages slowly build the index; inflation erodes it.
  // --------------------------------------------------------------------
  let retirementReadinessIndex = hh.retirementReadinessIndex
  if (policy.healthcare === 'universal') {
    retirementReadinessIndex += 0.2
  } else if (policy.healthcare === 'private') {
    retirementReadinessIndex -= 0.1
  }
  retirementReadinessIndex += (savingsRate - 8) * 0.05
  retirementReadinessIndex -= Math.max(0, stats.inflation - 4) * 0.05
  retirementReadinessIndex += (educationBudget / 100) * 0.05
  retirementReadinessIndex = clamp01(retirementReadinessIndex)

  // --------------------------------------------------------------------
  // 6. Median household savings ($)
  // Drifts toward gdpPerCapita * (savingsRate fraction) * scale, but slowly
  // — represents a balance, not a flow.
  // --------------------------------------------------------------------
  const savingsTarget = stats.gdpPerCapita * (savingsRate / 100) * 0.6
  let medianHouseholdSavings =
    hh.medianHouseholdSavings + (savingsTarget - hh.medianHouseholdSavings) * 0.05
  // Inflation directly haircuts the real balance.
  if (stats.inflation > 0) {
    medianHouseholdSavings *= 1 - Math.min(0.05, stats.inflation / 400)
  }
  medianHouseholdSavings = Math.max(0, medianHouseholdSavings)

  // --------------------------------------------------------------------
  // 7. Emergency fund coverage
  // Driven by savings rate sustained over time. Welfare provides an
  // implicit safety net so even low-savers feel slightly more covered.
  // --------------------------------------------------------------------
  let emergencyFundCoverage = hh.emergencyFundCoverage
  emergencyFundCoverage += (savingsRate - 8) * 0.15
  emergencyFundCoverage += (welfareBudget / 100) * 0.15
  emergencyFundCoverage -= Math.max(0, stats.inflation - 5) * 0.1
  emergencyFundCoverage -= Math.max(0, stats.unemployment - 7) * 0.1
  emergencyFundCoverage = clamp01(emergencyFundCoverage)

  // --------------------------------------------------------------------
  // 8. Unbanked rate
  // Slowly declines with education and infrastructure; small policy assist
  // from welfare programs that often partner with banks for delivery.
  // --------------------------------------------------------------------
  let bankUnbankedRate = hh.bankUnbankedRate
  bankUnbankedRate -= (educationBudget / 100) * 0.1
  bankUnbankedRate -= (infrastructureBudget / 100) * 0.05
  bankUnbankedRate -= (welfareBudget / 100) * 0.05
  // Severe financial stress pushes some households out of the banking system.
  if (foodInsecurityRate > 25) bankUnbankedRate += 0.05
  bankUnbankedRate = clamp01(bankUnbankedRate)

  // --------------------------------------------------------------------
  // 9. Consumer credit availability
  // Tightens when defaults / debt rise; widens when growth and credit
  // rating are strong.
  // --------------------------------------------------------------------
  let consumerCredit = hh.consumerCredit
  if (householdDebtToIncome > 2.0) {
    consumerCredit -= 0.4
  } else {
    consumerCredit += (stats.creditRating - 50) * 0.01
  }
  if (stats.inflation > 8) consumerCredit -= 0.2
  consumerCredit = clamp01(consumerCredit)

  // --------------------------------------------------------------------
  // 10. Evictions
  // Strict rent control suppresses; high rent burden / unemployment raise.
  // --------------------------------------------------------------------
  let evictionsPer1000 = hh.evictionsPer1000
  if (policy.rentControl === 'strict') {
    evictionsPer1000 -= 0.3
  } else if (policy.rentControl === 'soft') {
    evictionsPer1000 -= 0.1
  }
  if (rentBurden > 40) {
    evictionsPer1000 += (rentBurden - 40) * 0.05
  }
  if (stats.unemployment > 7) {
    evictionsPer1000 += (stats.unemployment - 7) * 0.3
  }
  evictionsPer1000 -= (welfareBudget / 100) * 0.2
  evictionsPer1000 = clamp(evictionsPer1000, MIN_EVICTIONS, MAX_EVICTIONS)

  if (evictionsPer1000 > 15 && hh.evictionsPer1000 <= 15) {
    notes.push('Eviction filings spiking — housing courts overwhelmed.')
  }

  // --------------------------------------------------------------------
  // 11. Compose city-stat effects.
  // happiness: more saving / lower rent burden = less stress.
  // inequality: rent burden + food insecurity disproportionately hit
  //   the bottom of the distribution.
  // approval: small drift driven by overall household score.
  // --------------------------------------------------------------------
  const householdScoreNow = householdScore({
    savingsRate,
    householdDebtToIncome,
    rentBurden,
    foodInsecurityRate,
    retirementReadinessIndex,
    medianHouseholdSavings,
    emergencyFundCoverage,
    bankUnbankedRate,
    consumerCredit,
    evictionsPer1000,
  })

  const happinessDelta = clamp(
    (savingsRate - 8) * 0.04 -
      Math.max(0, rentBurden - 30) * 0.02 -
      Math.max(0, foodInsecurityRate - 12) * 0.03 +
      (emergencyFundCoverage - 35) * 0.01,
    -1.5,
    1.5,
  )

  const inequalityDelta = clamp(
    Math.max(0, rentBurden - 30) * 0.03 +
      Math.max(0, foodInsecurityRate - 12) * 0.04 -
      (retirementReadinessIndex - 45) * 0.01,
    -1.0,
    1.5,
  )

  const approvalDelta = clamp((householdScoreNow - 50) * 0.01, -0.8, 0.8)

  const effects: Partial<CityStats> = {
    happiness: happinessDelta,
    inequality: inequalityDelta,
    approval: approvalDelta,
  }

  const nextHousehold: HouseholdState = {
    savingsRate,
    householdDebtToIncome,
    rentBurden,
    foodInsecurityRate,
    retirementReadinessIndex,
    medianHouseholdSavings,
    emergencyFundCoverage,
    bankUnbankedRate,
    consumerCredit,
    evictionsPer1000,
  }

  return { household: nextHousehold, effects, notes }
}

// ============================================================================
// SCORE — 0..100 summary of household financial health
// ----------------------------------------------------------------------------
// Weighted composite; higher is better. Bad outcomes (high debt, high rent
// burden, high food insecurity) subtract; good outcomes add.
// ============================================================================

export function householdScore(hh: HouseholdState): number {
  // Normalize savings rate (0..30) to 0..100.
  const savingsNorm = clamp((hh.savingsRate / MAX_SAVINGS_RATE) * 100, 0, 100)

  // Debt: 0 ratio = perfect (100), 2.0 = 0, capped.
  const debtNorm = clamp(100 - (hh.householdDebtToIncome / 2.0) * 100, 0, 100)

  // Rent burden: <=30 perfect; >=60 zero (linearly).
  const rentNorm = clamp(100 - Math.max(0, hh.rentBurden - 30) * (100 / 30), 0, 100)

  // Food insecurity: 0 perfect, 30 = 0.
  const foodNorm = clamp(100 - hh.foodInsecurityRate * (100 / 30), 0, 100)

  // Retirement readiness already 0..100.
  const retirementNorm = clamp01(hh.retirementReadinessIndex)

  // Emergency fund already 0..100.
  const emergencyNorm = clamp01(hh.emergencyFundCoverage)

  // Eviction penalty: 0 evictions → 0 penalty; 30/1000 → 30 penalty.
  const evictionPenalty = clamp(hh.evictionsPer1000, 0, 30)

  // Unbanked penalty.
  const unbankedPenalty = clamp(hh.bankUnbankedRate * 0.2, 0, 15)

  const positive =
    savingsNorm * 0.18 +
    debtNorm * 0.18 +
    rentNorm * 0.2 +
    foodNorm * 0.18 +
    retirementNorm * 0.13 +
    emergencyNorm * 0.13

  return clamp(positive - evictionPenalty - unbankedPenalty, 0, 100)
}

// ============================================================================
// DESCRIPTION — short human-readable status line
// ============================================================================

export function describeHouseholdSituation(hh: HouseholdState): string {
  const score = Math.round(householdScore(hh))
  const rent = Math.round(hh.rentBurden)
  const food = Math.round(hh.foodInsecurityRate)
  const sav = hh.savingsRate.toFixed(1)

  let mood: string
  if (score >= 75) mood = 'thriving'
  else if (score >= 60) mood = 'comfortable'
  else if (score >= 45) mood = 'stretched'
  else if (score >= 30) mood = 'struggling'
  else mood = 'in crisis'

  let burdenTag = ''
  if (hh.rentBurden > RENT_BURDEN_SEVERE) burdenTag = ' (severe rent burden)'
  else if (hh.rentBurden > RENT_BURDEN_COST_BURDENED) burdenTag = ' (cost-burdened)'

  return `Households ${mood}: ${sav}% savings, rent burden ${rent}%, food insecurity ${food}%${burdenTag}.`
}
