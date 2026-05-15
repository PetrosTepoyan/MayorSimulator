// ============================================================================
// MayorSim — City Intelligence / Security Operations
// Emergency preparedness, cyber threats, intelligence coordination, civic
// data privacy, disaster response readiness, counter-terrorism.
// The "boring but critical" infrastructure that decides crisis outcomes.
// ============================================================================

import type { CityStats, GameState, PolicyState } from './types'
import { clamp, clamp01, uid } from './util'

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export type ThreatLevel = 'low' | 'elevated' | 'high' | 'severe'

export interface Threat {
  id: string
  name: string
  category: 'cyber' | 'terror' | 'natural' | 'biological' | 'economic'
  level: ThreatLevel
  description: string
}

export interface CityIntelligenceState {
  emergencyPreparednessScore: number    // 0-100
  cyberThreatLevel: ThreatLevel
  intelligenceCoordinationScore: number // 0-100 inter-agency coordination
  citizenSurveillanceConsent: number    // 0-100 public approval of monitoring
  disasterDrillFrequency: number        // per year
  fireResponseTimeMin: number           // minutes
  ambulanceResponseTimeMin: number      // minutes
  policeResponseTimeMin: number         // minutes
  evacuationPlanScore: number           // 0-100
  cyberDefenseScore: number             // 0-100
  threatRegister: Threat[]              // active threats
  privacyComplaintsRate: number         // 0-100
  inteligenceBudget: number             // $M/turn
}

// ============================================================================
// LOCAL HELPERS
// ============================================================================

const THREAT_ORDER: ThreatLevel[] = ['low', 'elevated', 'high', 'severe']

const threatIndex = (t: ThreatLevel): number => THREAT_ORDER.indexOf(t)

const threatFromIndex = (i: number): ThreatLevel =>
  THREAT_ORDER[clamp(i, 0, THREAT_ORDER.length - 1)]

const escalateThreat = (t: ThreatLevel, steps = 1): ThreatLevel =>
  threatFromIndex(threatIndex(t) + steps)

const deescalateThreat = (t: ThreatLevel, steps = 1): ThreatLevel =>
  threatFromIndex(threatIndex(t) - steps)

const threatToScore = (t: ThreatLevel): number => {
  switch (t) {
    case 'low':
      return 90
    case 'elevated':
      return 65
    case 'high':
      return 35
    case 'severe':
      return 10
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10
const round2 = (n: number) => Math.round(n * 100) / 100

// ============================================================================
// GENERATION
// ============================================================================

export function generateCityIntelligenceState(
  stats: CityStats,
  policy: PolicyState,
): CityIntelligenceState {
  // Surveillance consent baseline shifts a little with policy stance
  const surveillanceBase = 55
  const surveillanceFromPolicy =
    policy.drugPolicy === 'punitive'
      ? 5
      : policy.drugPolicy === 'lenient'
        ? -5
        : 0

  const fireResponse = round1(7 + (stats.crime - 30) * 0.05)
  const policeResponse = round1(8 + (stats.crime - 30) * 0.07)

  const threatRegister: Threat[] = [
    {
      id: uid('threat'),
      name: 'Municipal Ransomware Probes',
      category: 'cyber',
      level: 'elevated',
      description:
        'Repeated phishing attempts targeting city payroll and permits portals.',
    },
    {
      id: uid('threat'),
      name: 'Coastal Flood Risk Window',
      category: 'natural',
      level: 'elevated',
      description:
        'Seasonal storm surge and aging stormwater infrastructure raise flood exposure.',
    },
    {
      id: uid('threat'),
      name: 'Critical Infrastructure Outage Risk',
      category: 'cyber',
      level: 'low',
      description:
        'Power and water SCADA networks have unpatched legacy components.',
    },
  ]

  return {
    emergencyPreparednessScore: 55,
    cyberThreatLevel: 'elevated',
    intelligenceCoordinationScore: 50,
    citizenSurveillanceConsent: clamp01(surveillanceBase + surveillanceFromPolicy),
    disasterDrillFrequency: 2,
    fireResponseTimeMin: Math.max(2, fireResponse),
    ambulanceResponseTimeMin: 9,
    policeResponseTimeMin: Math.max(2, policeResponse),
    evacuationPlanScore: 50,
    cyberDefenseScore: 55,
    threatRegister,
    privacyComplaintsRate: 20,
    inteligenceBudget: 1.5,
  }
}

// ============================================================================
// PER-TURN UPDATE
// ============================================================================

export function updateCityIntelligencePerTurn(
  intel: CityIntelligenceState,
  state: GameState,
): { intel: CityIntelligenceState; effects: Partial<CityStats>; notes: string[] } {
  const notes: string[] = []
  const { budget, buildings, macro, stats, policy } = state

  // --- Budget influences ---
  const securityBudget = budget.security ?? 0
  const infrastructureBudget = budget.infrastructure ?? 0
  const researchBudget = budget.research ?? 0
  const healthcareBudget = budget.healthcare ?? 0

  // Security budget centered at ~5 ($M); >5 improves, <5 erodes.
  const securityImpulse = (securityBudget - 5) * 0.6
  const infraImpulse = (infrastructureBudget - 5) * 0.4
  const researchImpulse = (researchBudget - 4) * 0.5
  const healthImpulse = (healthcareBudget - 5) * 0.3

  // --- Building counts ---
  const fireStations = buildings.filter((b) => b.type === 'fireStation').length
  const hospitals = buildings.filter((b) => b.type === 'hospital').length
  const researchLabs = buildings.filter((b) => b.type === 'researchLab').length
  const jails = buildings.filter((b) => b.type === 'jail').length

  // --- Emergency preparedness ---
  let emergencyPreparednessScore =
    intel.emergencyPreparednessScore + securityImpulse + infraImpulse * 0.5
  emergencyPreparednessScore += fireStations * 1
  emergencyPreparednessScore += hospitals * 0.4
  // Drift toward 50 if neglected
  if (securityBudget < 3) emergencyPreparednessScore -= 0.5
  emergencyPreparednessScore = clamp01(emergencyPreparednessScore)

  // --- Cyber defense & threat ---
  let cyberDefenseScore = intel.cyberDefenseScore + researchImpulse + securityImpulse * 0.4
  // Tech wave is a double-edged sword: more capability but more attack surface
  cyberDefenseScore += researchLabs * 0.7
  cyberDefenseScore -= Math.max(0, (macro.techWave - 60)) * 0.05
  cyberDefenseScore = clamp01(cyberDefenseScore)

  const previousCyberLevel = intel.cyberThreatLevel
  let cyberLevelIdx = threatIndex(intel.cyberThreatLevel)
  // Pressure index — higher means cyber threat trends up
  const cyberPressure =
    (macro.techWave - 50) * 0.02 +
    (macro.geopolitical === 'crisis' ? 0.8 : macro.geopolitical === 'tense' ? 0.3 : -0.1) -
    (cyberDefenseScore - 50) * 0.02
  if (cyberPressure > 0.7) cyberLevelIdx += 1
  else if (cyberPressure < -0.5) cyberLevelIdx -= 1
  let cyberThreatLevel = threatFromIndex(cyberLevelIdx)
  if (cyberThreatLevel !== previousCyberLevel) {
    notes.push(
      cyberLevelIdx > threatIndex(previousCyberLevel)
        ? `Cyber threat level rose to ${capitalize(cyberThreatLevel)}`
        : `Cyber threat level eased to ${capitalize(cyberThreatLevel)}`,
    )
  }

  // --- Intelligence coordination ---
  let intelligenceCoordinationScore =
    intel.intelligenceCoordinationScore + securityImpulse * 0.5 + researchImpulse * 0.2
  if (macro.geopolitical === 'crisis') intelligenceCoordinationScore += 1.5
  intelligenceCoordinationScore = clamp01(intelligenceCoordinationScore)

  // --- Surveillance consent / privacy ---
  // Higher security spend with low transparency erodes consent.
  let citizenSurveillanceConsent = intel.citizenSurveillanceConsent
  let privacyComplaintsRate = intel.privacyComplaintsRate
  const surveillancePush = securityImpulse * 0.3 - (stats.education - 60) * 0.02
  citizenSurveillanceConsent -= Math.max(0, surveillancePush)
  if (policy.drugPolicy === 'punitive') {
    citizenSurveillanceConsent -= 0.3
    privacyComplaintsRate += 0.4
  } else if (policy.drugPolicy === 'lenient') {
    citizenSurveillanceConsent += 0.2
    privacyComplaintsRate -= 0.2
  }
  // Education and approval anchor consent
  citizenSurveillanceConsent += (stats.approval - 50) * 0.01
  privacyComplaintsRate += Math.max(0, securityBudget - 7) * 0.3
  privacyComplaintsRate -= (stats.happiness - 50) * 0.01
  citizenSurveillanceConsent = clamp01(citizenSurveillanceConsent)
  privacyComplaintsRate = clamp01(privacyComplaintsRate)

  // --- Disaster drills ---
  let disasterDrillFrequency = intel.disasterDrillFrequency
  if (
    macro.climateRisk > 60 &&
    securityBudget >= 4 &&
    Math.random() < 0.15 &&
    disasterDrillFrequency < 6
  ) {
    disasterDrillFrequency += 1
    notes.push('New disaster drill scheduled')
  } else if (securityBudget < 2 && disasterDrillFrequency > 1 && Math.random() < 0.1) {
    disasterDrillFrequency -= 1
    notes.push('Disaster drill program scaled back due to budget cuts')
  }

  // --- Response times ---
  // Higher preparedness, more stations/hospitals lower times.
  let fireResponseTimeMin = intel.fireResponseTimeMin
  fireResponseTimeMin -= fireStations * 0.2
  fireResponseTimeMin -= securityImpulse * 0.05
  fireResponseTimeMin += Math.max(0, (stats.crime - 50)) * 0.01
  fireResponseTimeMin = clamp(round1(fireResponseTimeMin), 2, 25)

  let ambulanceResponseTimeMin = intel.ambulanceResponseTimeMin
  ambulanceResponseTimeMin -= hospitals * 0.15
  ambulanceResponseTimeMin -= healthImpulse * 0.05
  ambulanceResponseTimeMin += Math.max(0, (stats.crime - 50)) * 0.005
  ambulanceResponseTimeMin = clamp(round1(ambulanceResponseTimeMin), 2, 25)

  let policeResponseTimeMin = intel.policeResponseTimeMin
  policeResponseTimeMin -= jails * 0.1
  policeResponseTimeMin -= securityImpulse * 0.08
  policeResponseTimeMin += Math.max(0, (stats.crime - 40)) * 0.015
  policeResponseTimeMin = clamp(round1(policeResponseTimeMin), 2, 25)

  // --- Evacuation plan score ---
  let evacuationPlanScore =
    intel.evacuationPlanScore + infraImpulse * 0.6 + (disasterDrillFrequency - 2) * 1.2
  if (macro.climateRisk > 70) evacuationPlanScore += 0.5  // pressure spurs upgrades
  evacuationPlanScore = clamp01(evacuationPlanScore)

  // --- Intelligence budget tracking ---
  // Smoothly converges toward 30% of security budget allocation, with floor 0.5.
  const targetBudget = Math.max(0.5, securityBudget * 0.3)
  const inteligenceBudget = round2(
    intel.inteligenceBudget + (targetBudget - intel.inteligenceBudget) * 0.4,
  )

  // --- Threat register management ---
  const threatRegister = updateThreatRegister(
    intel.threatRegister,
    {
      cyberThreatLevel,
      macro,
      cyberDefenseScore,
      emergencyPreparednessScore,
      evacuationPlanScore,
    },
    notes,
  )

  // --- Effects on CityStats ---
  const effects: Partial<CityStats> = {}

  // Better response times + preparedness reduce crime slowly
  const responseQuality =
    (emergencyPreparednessScore - 50) * 0.005 +
    (10 - policeResponseTimeMin) * 0.02
  effects.crime = round2(-0.1 - Math.max(0, responseQuality))

  // Faster ambulance + preparedness modestly help health
  const healthBoost =
    (10 - ambulanceResponseTimeMin) * 0.015 + (emergencyPreparednessScore - 50) * 0.003
  if (Math.abs(healthBoost) > 0.001) effects.health = round2(healthBoost)

  // Happiness: privacy complaints erode it; good preparedness adds a touch of safety
  const happinessDelta =
    -privacyComplaintsRate * 0.005 + (emergencyPreparednessScore - 50) * 0.004
  if (Math.abs(happinessDelta) > 0.001) effects.happiness = round2(happinessDelta)

  // Severe threats during crisis dent approval
  if (macro.geopolitical === 'crisis' && cyberThreatLevel === 'severe') {
    effects.approval = round2((effects.approval ?? 0) - 0.4)
    notes.push('Approval under pressure from active security crisis')
  }

  // Innovation gets a small assist from cyber defense investment
  if (researchBudget >= 5 && cyberDefenseScore > 65) {
    effects.innovation = round2((effects.innovation ?? 0) + 0.1)
  }

  const next: CityIntelligenceState = {
    emergencyPreparednessScore: round1(emergencyPreparednessScore),
    cyberThreatLevel,
    intelligenceCoordinationScore: round1(intelligenceCoordinationScore),
    citizenSurveillanceConsent: round1(citizenSurveillanceConsent),
    disasterDrillFrequency,
    fireResponseTimeMin,
    ambulanceResponseTimeMin,
    policeResponseTimeMin,
    evacuationPlanScore: round1(evacuationPlanScore),
    cyberDefenseScore: round1(cyberDefenseScore),
    threatRegister,
    privacyComplaintsRate: round1(privacyComplaintsRate),
    inteligenceBudget,
  }

  return { intel: next, effects, notes }
}

// ============================================================================
// THREAT REGISTER UPDATE
// ============================================================================

interface ThreatContext {
  cyberThreatLevel: ThreatLevel
  macro: GameState['macro']
  cyberDefenseScore: number
  emergencyPreparednessScore: number
  evacuationPlanScore: number
}

function updateThreatRegister(
  current: Threat[],
  ctx: ThreatContext,
  notes: string[],
): Threat[] {
  // Start with a copy, mutate immutably via new array entries.
  const next: Threat[] = current.map((t) => ({ ...t }))

  // Adjust cyber threats to match cyberThreatLevel band
  for (const t of next) {
    if (t.category === 'cyber') {
      if (threatIndex(t.level) < threatIndex(ctx.cyberThreatLevel)) {
        t.level = escalateThreat(t.level)
      } else if (
        ctx.cyberDefenseScore > 75 &&
        threatIndex(t.level) > threatIndex(ctx.cyberThreatLevel)
      ) {
        t.level = deescalateThreat(t.level)
      }
    }
    // Natural threats track climateRisk
    if (t.category === 'natural') {
      const target =
        ctx.macro.climateRisk > 80
          ? 'severe'
          : ctx.macro.climateRisk > 60
            ? 'high'
            : ctx.macro.climateRisk > 35
              ? 'elevated'
              : 'low'
      if (threatIndex(t.level) < threatIndex(target)) {
        t.level = escalateThreat(t.level)
      } else if (ctx.evacuationPlanScore > 75 && threatIndex(t.level) > threatIndex(target)) {
        t.level = deescalateThreat(t.level)
      }
    }
  }

  // Geopolitical crisis can spawn a terror threat if one isn't already present.
  if (
    ctx.macro.geopolitical === 'crisis' &&
    !next.some((t) => t.category === 'terror') &&
    Math.random() < 0.25
  ) {
    next.push({
      id: uid('threat'),
      name: 'Soft-Target Threat Advisory',
      category: 'terror',
      level: 'high',
      description:
        'Federal partners flag elevated risk to transit hubs and public gatherings.',
    })
    notes.push('New threat added to register: Soft-Target Threat Advisory')
  }

  // Pandemic-style biological threat if health system stressed and crisis macro
  if (
    ctx.macro.geopolitical !== 'calm' &&
    ctx.emergencyPreparednessScore < 35 &&
    !next.some((t) => t.category === 'biological') &&
    Math.random() < 0.15
  ) {
    next.push({
      id: uid('threat'),
      name: 'Outbreak Surveillance Gap',
      category: 'biological',
      level: 'elevated',
      description:
        'Reporting delays and lab capacity shortfalls raise pandemic detection risk.',
    })
    notes.push('New threat added to register: Outbreak Surveillance Gap')
  }

  // Retire low + well-defended cyber threats occasionally
  return next.filter((t) => {
    if (
      t.category === 'cyber' &&
      t.level === 'low' &&
      ctx.cyberDefenseScore > 80 &&
      Math.random() < 0.2
    ) {
      notes.push(`Threat resolved: ${t.name}`)
      return false
    }
    return true
  })
}

// ============================================================================
// SCORING
// ============================================================================

export function intelligenceScore(intel: CityIntelligenceState): number {
  // Positive contributors (averaged, weighted)
  const positives =
    intel.emergencyPreparednessScore * 0.22 +
    intel.cyberDefenseScore * 0.18 +
    intel.intelligenceCoordinationScore * 0.14 +
    intel.evacuationPlanScore * 0.12 +
    intel.citizenSurveillanceConsent * 0.08 +
    threatToScore(intel.cyberThreatLevel) * 0.10

  // Negative contributors via response times (clamped 2-25 -> 0-100 inverted)
  const fireNorm = clamp01(((25 - intel.fireResponseTimeMin) / 23) * 100)
  const ambNorm = clamp01(((25 - intel.ambulanceResponseTimeMin) / 23) * 100)
  const polNorm = clamp01(((25 - intel.policeResponseTimeMin) / 23) * 100)
  const responseAvg = (fireNorm + ambNorm + polNorm) / 3

  // Privacy complaints subtract
  const privacyPenalty = intel.privacyComplaintsRate * 0.06

  // Active severe/high threats penalize
  const threatPenalty = intel.threatRegister.reduce((sum, t) => {
    if (t.level === 'severe') return sum + 6
    if (t.level === 'high') return sum + 3
    if (t.level === 'elevated') return sum + 1
    return sum
  }, 0)

  const raw = positives + responseAvg * 0.16 - privacyPenalty - threatPenalty
  return Math.round(clamp01(raw))
}

// ============================================================================
// DESCRIPTION
// ============================================================================

export function describeIntelligence(intel: CityIntelligenceState): string {
  const score = intelligenceScore(intel)
  const grade =
    score >= 80
      ? 'robust'
      : score >= 65
        ? 'solid'
        : score >= 50
          ? 'adequate'
          : score >= 35
            ? 'fragile'
            : 'critical'

  const highOrSevere = intel.threatRegister.filter(
    (t) => t.level === 'high' || t.level === 'severe',
  )
  const threatBlurb =
    highOrSevere.length > 0
      ? `${highOrSevere.length} active high-priority threat${highOrSevere.length === 1 ? '' : 's'} (${highOrSevere
          .map((t) => t.category)
          .join(', ')})`
      : 'no high-priority threats logged'

  const responseAvg = round1(
    (intel.fireResponseTimeMin +
      intel.ambulanceResponseTimeMin +
      intel.policeResponseTimeMin) /
      3,
  )

  const privacyClause =
    intel.privacyComplaintsRate > 60
      ? ' Civic privacy complaints are running hot.'
      : intel.privacyComplaintsRate < 20
        ? ' Public trust in monitoring remains intact.'
        : ''

  return (
    `City intelligence posture is ${grade} (score ${score}). ` +
    `Cyber threat level is ${intel.cyberThreatLevel}; ${threatBlurb}. ` +
    `Average emergency response is ${responseAvg} min, with preparedness at ` +
    `${Math.round(intel.emergencyPreparednessScore)}/100 and evacuation planning at ` +
    `${Math.round(intel.evacuationPlanScore)}/100.${privacyClause}`
  )
}

// ============================================================================
// INTERNAL UTILS
// ============================================================================

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1)
}
