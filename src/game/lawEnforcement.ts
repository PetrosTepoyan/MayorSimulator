import type { CityStats, GameState, PolicyState } from './types'
import { clamp, clamp01 } from './util'

// ============================================================================
// LAW ENFORCEMENT — staffing, response times, internal affairs, civilian
// complaints, body cameras, drug enforcement. Models tradeoffs between
// security and civil liberties.
// ============================================================================

export interface LawEnforcementState {
  officersPerCapita: number       // per 100k residents
  responseTimeMin: number          // average minutes
  caseClearanceRate: number        // 0-100 % of crimes solved
  bodyCamCoverage: number          // 0-100 %
  internalAffairsActivity: number  // 0-100, higher = more oversight
  civilianComplaints: number       // per 1000 stops, lower is better
  corruptionIndex: number          // 0-100, higher is worse
  publicTrust: number              // 0-100 community trust in police
  prisonPopulation: number         // count
  recidivismRate: number           // 0-100
  drugEnforcementIntensity: number // 0-100
  communityPolicingPrograms: number // 0-100
  gunViolenceRate: number          // per 100k
  hateCrimeRate: number            // per 100k
}

// ----------------------------------------------------------------------------
// Local helpers — not exported to keep API surface minimal.
// ----------------------------------------------------------------------------

const POLICY_DRUG_ENFORCEMENT: Readonly<Record<PolicyState['drugPolicy'], number>> = {
  punitive: 80,
  mixed: 30,
  lenient: 15,
}

const POLICY_OFFICER_BASE: Readonly<Record<PolicyState['drugPolicy'], number>> = {
  punitive: 350,
  mixed: 200,
  lenient: 200,
}

const PRISONERS_PER_JAIL = 800

const roundTo = (n: number, digits: number): number => {
  const f = Math.pow(10, digits)
  return Math.round(n * f) / f
}

// ----------------------------------------------------------------------------
// generateLawEnforcementState — initial values derived from CityStats + policy
// ----------------------------------------------------------------------------

export function generateLawEnforcementState(
  stats: CityStats,
  policy: PolicyState,
): LawEnforcementState {
  const officersPerCapita = POLICY_OFFICER_BASE[policy.drugPolicy]
  const responseTimeMin = Math.max(2, 8 + (stats.crime - 30) * 0.1)
  const caseClearanceRate = clamp01(35 + (stats.education - 50) * 0.2)
  const bodyCamCoverage = 30
  const internalAffairsActivity = policy.drugPolicy === 'lenient' ? 50 : 30
  // Lower IA activity -> more complaints (since fewer accountability mechanisms).
  // 25 base, reduced by ~0.1 per IA point above baseline.
  const civilianComplaints = clamp01(
    25 - (internalAffairsActivity - 30) * 0.1,
  )
  const corruptionIndex = clamp01(20 + stats.inequality * 0.3)
  const publicTrust = clamp01(
    60 - corruptionIndex * 0.5 - civilianComplaints * 0.4,
  )
  const prisonPopulation = Math.max(0, Math.round(stats.population * 0.005))
  // Recidivism drops with education (rehab works better with educated returnees).
  const recidivismRate = clamp01(40 - (stats.education - 50) * 0.15)
  const drugEnforcementIntensity = POLICY_DRUG_ENFORCEMENT[policy.drugPolicy]
  const communityPolicingPrograms = 20
  const gunViolenceRate = Math.max(0, stats.crime * 0.5)
  const hateCrimeRate = Math.max(0, 2 + stats.inequality * 0.05)

  return {
    officersPerCapita: roundTo(officersPerCapita, 1),
    responseTimeMin: roundTo(responseTimeMin, 2),
    caseClearanceRate: roundTo(caseClearanceRate, 1),
    bodyCamCoverage: roundTo(bodyCamCoverage, 1),
    internalAffairsActivity: roundTo(internalAffairsActivity, 1),
    civilianComplaints: roundTo(civilianComplaints, 2),
    corruptionIndex: roundTo(corruptionIndex, 1),
    publicTrust: roundTo(publicTrust, 1),
    prisonPopulation,
    recidivismRate: roundTo(recidivismRate, 1),
    drugEnforcementIntensity: roundTo(drugEnforcementIntensity, 1),
    communityPolicingPrograms: roundTo(communityPolicingPrograms, 1),
    gunViolenceRate: roundTo(gunViolenceRate, 2),
    hateCrimeRate: roundTo(hateCrimeRate, 2),
  }
}

// ----------------------------------------------------------------------------
// updateLawEnforcementPerTurn — advance the law enforcement state one quarter.
// Returns a brand-new state object (immutability), plus effects on city stats
// and human-readable notes.
// ----------------------------------------------------------------------------

interface PerTurnResult {
  readonly law: LawEnforcementState
  readonly effects: Partial<CityStats>
  readonly notes: string[]
}

export function updateLawEnforcementPerTurn(
  law: LawEnforcementState,
  state: GameState,
): PerTurnResult {
  const { stats, policy, budget, buildings } = state
  const notes: string[] = []

  // -- Staffing & equipment driven by security budget --------------------
  // Security budget is treated as 0-100 allocation; ~30 is "normal".
  const securityBudget = budget.security
  const budgetPull = (securityBudget - 30) * 0.5

  const officersTarget = POLICY_OFFICER_BASE[policy.drugPolicy] + budgetPull
  // Smooth toward target staffing (hiring/attrition lags).
  const nextOfficersPerCapita = clamp(
    law.officersPerCapita + (officersTarget - law.officersPerCapita) * 0.2,
    50,
    600,
  )

  // Body cam coverage grows with budget, plateaus near 100.
  const bodyCamDelta = securityBudget > 25 ? 1.5 + (securityBudget - 25) * 0.05 : -0.5
  const nextBodyCamCoverage = clamp01(law.bodyCamCoverage + bodyCamDelta)

  // -- Internal affairs activity slowly tracks policy expectations -------
  const iaTarget = policy.drugPolicy === 'lenient' ? 55 : 35
  const nextInternalAffairsActivity = clamp01(
    law.internalAffairsActivity + (iaTarget - law.internalAffairsActivity) * 0.15,
  )

  // -- Civilian complaints: inequality and aggressive policing raise them,
  //    body cams and IA reduce them. -----------------------------------
  const complaintsPressure =
    (stats.inequality - 40) * 0.05 +
    (law.drugEnforcementIntensity - 30) * 0.03 -
    (nextBodyCamCoverage - 30) * 0.04 -
    (nextInternalAffairsActivity - 30) * 0.05
  const nextCivilianComplaints = clamp01(
    law.civilianComplaints + complaintsPressure,
  )

  // -- Corruption: IA and body cams drive it down; inequality drives up --
  const corruptionDelta =
    -nextInternalAffairsActivity * 0.02 -
    nextBodyCamCoverage * 0.01 +
    (stats.inequality - 40) * 0.04
  const nextCorruptionIndex = clamp01(law.corruptionIndex + corruptionDelta)

  // -- Drug enforcement intensity tracks policy ------------------------
  const drugTarget = POLICY_DRUG_ENFORCEMENT[policy.drugPolicy]
  const nextDrugEnforcementIntensity = clamp01(
    law.drugEnforcementIntensity + (drugTarget - law.drugEnforcementIntensity) * 0.25,
  )

  // -- Community policing — grows with welfare/education budget --------
  const cpTarget = clamp01(20 + (budget.welfare + budget.education) * 0.2)
  const nextCommunityPolicingPrograms = clamp01(
    law.communityPolicingPrograms + (cpTarget - law.communityPolicingPrograms) * 0.1,
  )

  // -- Gun violence and hate crime rates --------------------------------
  const gunViolenceDelta =
    (stats.inequality - 40) * 0.05 -
    (nextCommunityPolicingPrograms - 20) * 0.04 -
    (nextOfficersPerCapita - 200) * 0.005
  const nextGunViolenceRate = Math.max(0, law.gunViolenceRate + gunViolenceDelta)

  const hateCrimeDelta =
    (stats.inequality - 40) * 0.02 -
    (nextCommunityPolicingPrograms - 20) * 0.02
  const nextHateCrimeRate = Math.max(0, law.hateCrimeRate + hateCrimeDelta)

  // -- Response time and clearance rate ---------------------------------
  const responseTarget = Math.max(
    2,
    8 + (stats.crime - 30) * 0.1 - (nextOfficersPerCapita - 200) * 0.01,
  )
  const nextResponseTimeMin = clamp(
    law.responseTimeMin + (responseTarget - law.responseTimeMin) * 0.2,
    1,
    60,
  )

  const clearanceTarget = clamp01(
    35 +
      (stats.education - 50) * 0.2 +
      (nextOfficersPerCapita - 200) * 0.02 -
      nextCorruptionIndex * 0.1,
  )
  const nextCaseClearanceRate = clamp01(
    law.caseClearanceRate + (clearanceTarget - law.caseClearanceRate) * 0.2,
  )

  // -- Prison population and jail capacity ------------------------------
  const jailCount = buildings.filter((b) => b.type === 'jail').length
  const jailCapacity = jailCount * PRISONERS_PER_JAIL
  // Punitive drug policy and high enforcement intensity inflate prison pop.
  const drugMultiplier =
    policy.drugPolicy === 'punitive' ? 1.5 : policy.drugPolicy === 'lenient' ? 0.6 : 1.0
  const prisonTarget = Math.max(
    0,
    Math.round(
      stats.population *
        0.005 *
        drugMultiplier *
        (1 + (nextDrugEnforcementIntensity - 50) * 0.005),
    ),
  )
  const nextPrisonPopulation = Math.round(
    law.prisonPopulation + (prisonTarget - law.prisonPopulation) * 0.25,
  )

  const overcapacity =
    jailCapacity > 0
      ? Math.max(0, nextPrisonPopulation - jailCapacity) / jailCapacity
      : nextPrisonPopulation > 0
        ? 1
        : 0

  // -- Recidivism: education + welfare lower it, overcapacity raises ----
  const recidTarget = clamp01(
    40 -
      (stats.education - 50) * 0.15 -
      (budget.welfare - 20) * 0.2 +
      overcapacity * 30,
  )
  const nextRecidivismRate = clamp01(
    law.recidivismRate + (recidTarget - law.recidivismRate) * 0.15,
  )

  // -- Public trust ------------------------------------------------------
  const trustTarget = clamp01(
    60 -
      nextCorruptionIndex * 0.5 -
      nextCivilianComplaints * 0.4 +
      (nextBodyCamCoverage - 30) * 0.1 +
      (nextCommunityPolicingPrograms - 20) * 0.15 +
      (policy.drugPolicy === 'lenient' ? 5 : policy.drugPolicy === 'punitive' ? -8 : 0),
  )
  const nextPublicTrust = clamp01(
    law.publicTrust + (trustTarget - law.publicTrust) * 0.2,
  )

  // -- Notes -------------------------------------------------------------
  if (nextRecidivismRate > 55 && nextRecidivismRate > law.recidivismRate) {
    notes.push('Recidivism rising — rehab programs underfunded')
  }
  if (nextPublicTrust < 35 && nextPublicTrust < law.publicTrust) {
    notes.push('Public trust slipping after scandal')
  }
  if (overcapacity > 0.2) {
    notes.push(
      `Prisons overcrowded (${Math.round(overcapacity * 100)}% over capacity) — build more jails`,
    )
  }
  if (nextCorruptionIndex > 60) {
    notes.push('Internal corruption widening — IA budget falling behind')
  }
  if (nextBodyCamCoverage > 75 && law.bodyCamCoverage <= 75) {
    notes.push('Body cam program reaches majority coverage')
  }
  if (nextCivilianComplaints > 45) {
    notes.push('Civilian complaints spiking — community trust at risk')
  }
  if (nextGunViolenceRate > 30) {
    notes.push('Gun violence rate elevated')
  }
  if (
    policy.drugPolicy === 'punitive' &&
    nextDrugEnforcementIntensity > 75 &&
    nextPublicTrust < 45
  ) {
    notes.push('Drug crackdown straining community relations')
  }

  // -- Effects on CityStats ---------------------------------------------
  // Improvements in trust and clearance lower crime and raise happiness.
  // High complaints and corruption raise inequality (perceived unfairness)
  // and lower happiness.
  const crimeDelta =
    -(nextCaseClearanceRate - 35) * 0.02 -
    (nextOfficersPerCapita - 200) * 0.003 +
    (nextGunViolenceRate - 15) * 0.05 -
    (nextCommunityPolicingPrograms - 20) * 0.02
  const happinessDelta =
    (nextPublicTrust - 50) * 0.04 -
    (nextCivilianComplaints - 25) * 0.05 -
    (nextCorruptionIndex - 30) * 0.03 -
    (overcapacity > 0.2 ? overcapacity * 2 : 0)
  const inequalityDelta =
    (nextCivilianComplaints - 25) * 0.02 +
    (nextCorruptionIndex - 30) * 0.02 +
    (policy.drugPolicy === 'punitive' ? 0.2 : 0) -
    (nextCommunityPolicingPrograms - 20) * 0.01

  const effects: Partial<CityStats> = {
    crime: roundTo(crimeDelta, 3),
    happiness: roundTo(happinessDelta, 3),
    inequality: roundTo(inequalityDelta, 3),
  }

  const nextLaw: LawEnforcementState = {
    officersPerCapita: roundTo(nextOfficersPerCapita, 1),
    responseTimeMin: roundTo(nextResponseTimeMin, 2),
    caseClearanceRate: roundTo(nextCaseClearanceRate, 1),
    bodyCamCoverage: roundTo(nextBodyCamCoverage, 1),
    internalAffairsActivity: roundTo(nextInternalAffairsActivity, 1),
    civilianComplaints: roundTo(nextCivilianComplaints, 2),
    corruptionIndex: roundTo(nextCorruptionIndex, 1),
    publicTrust: roundTo(nextPublicTrust, 1),
    prisonPopulation: nextPrisonPopulation,
    recidivismRate: roundTo(nextRecidivismRate, 1),
    drugEnforcementIntensity: roundTo(nextDrugEnforcementIntensity, 1),
    communityPolicingPrograms: roundTo(nextCommunityPolicingPrograms, 1),
    gunViolenceRate: roundTo(nextGunViolenceRate, 2),
    hateCrimeRate: roundTo(nextHateCrimeRate, 2),
  }

  return { law: nextLaw, effects, notes }
}

// ----------------------------------------------------------------------------
// lawEnforcementScore — single 0-100 quality score for the regime.
// Combines public trust (good), low corruption (good), low gun violence
// (good), high clearance (good), low complaints (good).
// ----------------------------------------------------------------------------

export function lawEnforcementScore(law: LawEnforcementState): number {
  // Each component contributes a normalized 0-100 sub-score, then weighted avg.
  const trustScore = law.publicTrust
  const corruptionScore = 100 - law.corruptionIndex
  const complaintsScore = clamp01(100 - law.civilianComplaints * 2) // 50 complaints -> 0
  const clearanceScore = law.caseClearanceRate
  // Gun violence rate ~0 is great, ~50 is terrible.
  const gunViolenceScore = clamp01(100 - law.gunViolenceRate * 2)

  const weights = {
    trust: 0.3,
    corruption: 0.2,
    complaints: 0.15,
    clearance: 0.2,
    gun: 0.15,
  } as const

  const raw =
    trustScore * weights.trust +
    corruptionScore * weights.corruption +
    complaintsScore * weights.complaints +
    clearanceScore * weights.clearance +
    gunViolenceScore * weights.gun

  return roundTo(clamp01(raw), 1)
}

// ----------------------------------------------------------------------------
// describeLawSituation — one-line human summary.
// ----------------------------------------------------------------------------

export function describeLawSituation(law: LawEnforcementState): string {
  const score = lawEnforcementScore(law)
  const trust = law.publicTrust
  const corruption = law.corruptionIndex
  const complaints = law.civilianComplaints

  if (score >= 75) {
    return `Trusted, professional force: ${trust.toFixed(0)}% public trust, ${law.caseClearanceRate.toFixed(0)}% case clearance.`
  }
  if (score >= 60) {
    return `Steady policing with room to grow: trust ${trust.toFixed(0)}%, complaints ${complaints.toFixed(1)}/1k stops.`
  }
  if (corruption > 60) {
    return `Department under a cloud: corruption index ${corruption.toFixed(0)}, trust slumped to ${trust.toFixed(0)}%.`
  }
  if (complaints > 40) {
    return `Civilian complaints surging (${complaints.toFixed(1)}/1k stops); community relations strained.`
  }
  if (law.gunViolenceRate > 30) {
    return `Gun violence at ${law.gunViolenceRate.toFixed(1)}/100k — public demands action.`
  }
  if (score >= 40) {
    return `Mixed record: response time ${law.responseTimeMin.toFixed(1)}min, trust ${trust.toFixed(0)}%.`
  }
  return `Crisis in policing: trust ${trust.toFixed(0)}%, clearance ${law.caseClearanceRate.toFixed(0)}%, reform overdue.`
}
