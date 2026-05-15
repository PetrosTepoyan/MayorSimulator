// ============================================================================
// MayorSim — Technology & AI Subsystem
// Models AI adoption, automation impact on jobs, R&D pipelines, cybersecurity,
// digital divide, surveillance level, and the ethics committee.
// ============================================================================

import type { CityStats, GameState, PolicyState } from './types'
import { clamp, clamp01 } from './util'

// ----------------------------------------------------------------------------
// Public state shape
// ----------------------------------------------------------------------------

export interface TechAIState {
  aiAdoption: number // 0-100 % gov & business
  automationLevel: number // 0-100 % of jobs automatable
  jobsDisplacedThisYear: number // count, last 4 turns
  digitalDivideIndex: number // 0-100 lower is better (gap between haves/have-nots)
  cybersecurityScore: number // 0-100 city defenses
  rdSpend: number // $M/turn
  patentsFiled: number // last quarter
  surveillanceLevel: number // 0-100 city-wide surveillance
  aiEthicsCommittee: boolean
  smartCityIndex: number // 0-100 IoT/smart infra adoption
  startupEcosystemScore: number // 0-100
  publicAIComfortLevel: number // 0-100 public attitude toward AI
}

// ----------------------------------------------------------------------------
// Local types
// ----------------------------------------------------------------------------

interface CountryTechBias {
  rdSpend: number
  surveillanceLevel: number
  publicAIComfortLevel: number
}

interface TechUpdateResult {
  tech: TechAIState
  effects: Partial<CityStats>
  notes: string[]
}

// ----------------------------------------------------------------------------
// Country / culture biases for initial state
// ----------------------------------------------------------------------------

const COUNTRY_BIASES: Record<string, Partial<CountryTechBias>> = {
  pacifica: { rdSpend: 4, surveillanceLevel: 25, publicAIComfortLevel: 65 },
  atlantica: { rdSpend: 4, surveillanceLevel: 35, publicAIComfortLevel: 60 },
  nordica: { rdSpend: 3, surveillanceLevel: 20, publicAIComfortLevel: 60 },
  meridia: { rdSpend: 2, surveillanceLevel: 30, publicAIComfortLevel: 55 },
  // Fallback handled by defaults below
}

function getCountryBias(stats: CityStats, policy: PolicyState): CountryTechBias {
  // We don't always know the countryId here, but innovation/education context
  // can imply a "country style". Use neutral defaults — generateTechAIState
  // overrides via separate hints.
  const _stats = stats
  const _policy = policy
  return {
    rdSpend: 2,
    surveillanceLevel: 30,
    publicAIComfortLevel: 55,
  }
}

// ----------------------------------------------------------------------------
// generateTechAIState
// ----------------------------------------------------------------------------

export function generateTechAIState(
  stats: CityStats,
  policy: PolicyState,
): TechAIState {
  const bias = getCountryBias(stats, policy)

  const innovationDelta = stats.innovation - 50
  const educationDelta = stats.education - 50

  return {
    aiAdoption: clamp01(20 + innovationDelta * 0.5),
    automationLevel: clamp01(30 + innovationDelta * 0.3),
    jobsDisplacedThisYear: 0,
    digitalDivideIndex: clamp01(50 - educationDelta * 0.3),
    cybersecurityScore: clamp01(50 + innovationDelta * 0.3),
    rdSpend: Math.max(0, bias.rdSpend),
    patentsFiled: 5,
    surveillanceLevel: clamp01(bias.surveillanceLevel),
    aiEthicsCommittee: false,
    smartCityIndex: clamp01(30 + innovationDelta * 0.3),
    startupEcosystemScore: clamp01(40 + innovationDelta * 0.4),
    publicAIComfortLevel: clamp01(bias.publicAIComfortLevel),
  }
}

// ----------------------------------------------------------------------------
// updateTechAIPerTurn
// ----------------------------------------------------------------------------

export function updateTechAIPerTurn(
  tech: TechAIState,
  state: GameState,
): TechUpdateResult {
  const notes: string[] = []
  const effects: Partial<CityStats> = {}

  // ---- Inputs from world state ------------------------------------------
  const researchBudget = state.budget.research ?? 0
  const educationBudget = state.budget.education ?? 0
  const infrastructureBudget = state.budget.infrastructure ?? 0
  const securityBudget = state.budget.security ?? 0

  const researchLabs = state.buildings.filter((b) => b.type === 'researchLab').length
  const universities = state.buildings.filter((b) => b.type === 'university').length
  const libraries = state.buildings.filter((b) => b.type === 'library').length
  const transitHubs = state.buildings.filter((b) => b.type === 'transitHub').length

  const gdpFactor = clamp(state.stats.gdpPerCapita / 50000, 0.3, 3)
  const populationScale = Math.max(1, state.stats.population / 100_000)

  // ---- R&D spend & funding -----------------------------------------------
  // Research budget drives baseline rdSpend with smoothing toward target.
  const targetRdSpend = researchBudget * 0.6 + researchLabs * 1.2 + universities * 0.8
  const rdSpend = Math.max(0, tech.rdSpend * 0.5 + targetRdSpend * 0.5)

  // ---- AI Adoption -------------------------------------------------------
  // Budget research and lab count push adoption upward; comfort gates it.
  const adoptionGrowth =
    researchBudget * 0.08 +
    researchLabs * 0.4 +
    universities * 0.2 +
    (tech.publicAIComfortLevel - 50) * 0.02 -
    0.3 // baseline tech debt / friction
  const aiAdoption = clamp01(tech.aiAdoption + adoptionGrowth)

  // ---- Cybersecurity -----------------------------------------------------
  // Funded by research + security; decays slightly each turn (threat evolves).
  const cyberGrowth =
    researchBudget * 0.05 + securityBudget * 0.04 + (tech.aiEthicsCommittee ? 0.2 : 0) - 0.4
  const cybersecurityScore = clamp01(tech.cybersecurityScore + cyberGrowth)

  // ---- Automation Level --------------------------------------------------
  // High AI adoption raises automation, dampened by lower-skill workforce
  // (digital divide). Cap target at 95 to leave a floor.
  const automationDrift =
    (aiAdoption - tech.automationLevel) * 0.15 + (researchLabs * 0.1)
  const automationLevel = clamp(tech.automationLevel + automationDrift, 0, 95)

  // ---- Jobs displaced (per quarter) --------------------------------------
  // ~2% of automation level scaled by population & gdp factor.
  const jobsDisplacedThisYear = Math.max(
    0,
    Math.round(automationLevel * 0.02 * populationScale * 100 * gdpFactor),
  )

  // ---- Patents Filed -----------------------------------------------------
  const patentsFiled = Math.max(
    0,
    Math.round(
      researchLabs * 0.3 * 10 +
        universities * 0.4 * 10 +
        researchBudget * 0.1 +
        (state.stats.innovation - 40) * 0.05,
    ),
  )

  // ---- Smart City Index --------------------------------------------------
  const smartGrowth =
    infrastructureBudget * 0.05 + researchBudget * 0.04 + transitHubs * 0.3 - 0.2
  const smartCityIndex = clamp01(tech.smartCityIndex + smartGrowth)

  // ---- Digital Divide ----------------------------------------------------
  // Falls (improves) with education budget + libraries.
  const divideShift =
    -(educationBudget * 0.04) - libraries * 0.5 + (aiAdoption > 60 ? 0.4 : 0)
  const digitalDivideIndex = clamp01(tech.digitalDivideIndex + divideShift)

  // ---- Startup Ecosystem -------------------------------------------------
  const startupGrowth =
    universities * 0.2 +
    researchLabs * 0.15 +
    (state.stats.innovation - 50) * 0.02 -
    (state.stats.inequality > 70 ? 0.4 : 0) -
    0.1
  const startupEcosystemScore = clamp01(tech.startupEcosystemScore + startupGrowth)

  // ---- Surveillance Level ------------------------------------------------
  // High crime makes voters want more; ethics committee dampens growth.
  let surveillanceShift = 0
  if (state.stats.crime > 60) surveillanceShift += 0.6
  else if (state.stats.crime > 45) surveillanceShift += 0.25
  if (tech.aiEthicsCommittee) surveillanceShift -= 0.4
  if (smartCityIndex > 60) surveillanceShift += 0.15
  if (state.policy.drugPolicy === 'punitive') surveillanceShift += 0.1
  const surveillanceLevel = clamp01(tech.surveillanceLevel + surveillanceShift)

  // ---- Public AI Comfort -------------------------------------------------
  // Eroded by surveillance and job displacement; boosted by ethics committee
  // and a healthy startup ecosystem.
  const displacedPressure = clamp(jobsDisplacedThisYear / Math.max(1, populationScale * 1000), 0, 4)
  const comfortShift =
    (tech.aiEthicsCommittee ? 0.6 : 0) +
    (startupEcosystemScore > 60 ? 0.2 : 0) -
    (surveillanceLevel > 60 ? 0.8 : 0) -
    displacedPressure * 0.5
  const publicAIComfortLevel = clamp01(tech.publicAIComfortLevel + comfortShift)

  // ---- Effects on CityStats ---------------------------------------------
  // Innovation: research pipelines, patents, smart city.
  const innovationDelta =
    researchLabs * 0.15 +
    universities * 0.1 +
    Math.min(1.5, patentsFiled * 0.01) +
    (smartCityIndex - 50) * 0.01 -
    0.1
  if (Math.abs(innovationDelta) > 0.01) effects.innovation = innovationDelta

  // GDP per capita: automation + AI productivity bump (mild), gated by comfort.
  const gdpDelta =
    aiAdoption * 0.6 +
    automationLevel * 0.3 -
    (digitalDivideIndex - 50) * 0.4 -
    (publicAIComfortLevel < 35 ? 50 : 0)
  if (Math.abs(gdpDelta) > 1) effects.gdpPerCapita = gdpDelta

  // Unemployment: displacement raises it; startups absorb some.
  const unemploymentDelta =
    (automationLevel - 50) * 0.01 +
    displacedPressure * 0.4 -
    Math.min(0.5, startupEcosystemScore * 0.005)
  if (Math.abs(unemploymentDelta) > 0.05) effects.unemployment = unemploymentDelta

  // Happiness: surveillance & displacement reduce, smart city & ethics raise.
  const happinessDelta =
    -(surveillanceLevel > 55 ? (surveillanceLevel - 55) * 0.03 : 0) -
    displacedPressure * 0.4 +
    (tech.aiEthicsCommittee ? 0.2 : 0) +
    (smartCityIndex > 60 ? 0.15 : 0)
  if (Math.abs(happinessDelta) > 0.05) effects.happiness = happinessDelta

  // Inequality: high digital divide widens it.
  const inequalityDelta =
    (digitalDivideIndex - 50) * 0.02 + (automationLevel - 50) * 0.01
  if (Math.abs(inequalityDelta) > 0.05) effects.inequality = inequalityDelta

  // ---- Notes (player-facing causal hints) --------------------------------
  if (jobsDisplacedThisYear > populationScale * 200) {
    notes.push(
      `AI displacing ${jobsDisplacedThisYear.toLocaleString()} jobs this quarter`,
    )
  }
  if (surveillanceLevel > 65) {
    notes.push('Surveillance concerns growing among residents')
  }
  if (cybersecurityScore < 30) {
    notes.push('Critical cybersecurity gap — cyberattack risk elevated')
  } else if (cybersecurityScore < 45) {
    notes.push('Cybersecurity defenses are weakening')
  }
  if (digitalDivideIndex > 70) {
    notes.push('Digital divide widening — many households left behind')
  }
  if (aiAdoption > 75 && !tech.aiEthicsCommittee) {
    notes.push('High AI adoption without ethics oversight is raising civic alarm')
  }
  if (patentsFiled > 25) {
    notes.push(`Strong R&D quarter: ${patentsFiled} patents filed`)
  }
  if (startupEcosystemScore > 75) {
    notes.push('Startup ecosystem is thriving')
  }
  if (smartCityIndex > 75) {
    notes.push('Smart city infrastructure now world-class')
  }
  if (publicAIComfortLevel < 30) {
    notes.push('Public trust in AI has collapsed')
  }

  const nextTech: TechAIState = {
    aiAdoption,
    automationLevel,
    jobsDisplacedThisYear,
    digitalDivideIndex,
    cybersecurityScore,
    rdSpend,
    patentsFiled,
    surveillanceLevel,
    aiEthicsCommittee: tech.aiEthicsCommittee,
    smartCityIndex,
    startupEcosystemScore,
    publicAIComfortLevel,
  }

  return { tech: nextTech, effects, notes }
}

// ----------------------------------------------------------------------------
// techScore
// ----------------------------------------------------------------------------

export function techScore(tech: TechAIState): number {
  // Positive contributors
  const positive =
    tech.aiAdoption * 0.12 +
    tech.cybersecurityScore * 0.16 +
    tech.smartCityIndex * 0.14 +
    tech.startupEcosystemScore * 0.14 +
    tech.publicAIComfortLevel * 0.12 +
    Math.min(100, tech.patentsFiled * 2) * 0.06 +
    Math.min(100, tech.rdSpend * 4) * 0.06 +
    (tech.aiEthicsCommittee ? 6 : 0)

  // Negative contributors (treated as inversions)
  const negative =
    (100 - tech.digitalDivideIndex) * 0.1 +
    (100 - Math.max(0, tech.surveillanceLevel - 30)) * 0.05 +
    (100 - Math.max(0, tech.automationLevel - 50)) * 0.05

  return clamp01(positive + negative * 0.5)
}

// ----------------------------------------------------------------------------
// describeTechSituation
// ----------------------------------------------------------------------------

export function describeTechSituation(tech: TechAIState): string {
  const parts: string[] = []

  // Adoption headline
  if (tech.aiAdoption > 75) parts.push('AI is woven into daily life')
  else if (tech.aiAdoption > 50) parts.push('AI adoption is mainstream')
  else if (tech.aiAdoption > 25) parts.push('AI adoption is emerging')
  else parts.push('AI adoption lags far behind peers')

  // Innovation pipeline
  if (tech.startupEcosystemScore > 70 && tech.patentsFiled > 15) {
    parts.push('a vibrant startup and patent pipeline')
  } else if (tech.startupEcosystemScore < 35) {
    parts.push('a weak startup scene')
  }

  // Smart city
  if (tech.smartCityIndex > 65) parts.push('smart infrastructure is robust')
  else if (tech.smartCityIndex < 30) parts.push('IoT/smart infra is minimal')

  // Surveillance / ethics balance
  if (tech.surveillanceLevel > 65 && !tech.aiEthicsCommittee) {
    parts.push('surveillance is heavy and unchecked')
  } else if (tech.aiEthicsCommittee) {
    parts.push('an ethics committee oversees deployments')
  }

  // Cybersecurity warning
  if (tech.cybersecurityScore < 35) parts.push('cyber defenses are alarmingly thin')
  else if (tech.cybersecurityScore > 75) parts.push('cyber defenses are strong')

  // Divide / displacement
  if (tech.digitalDivideIndex > 65) parts.push('the digital divide is severe')
  if (tech.jobsDisplacedThisYear > 5000) {
    parts.push(`automation displaced ${tech.jobsDisplacedThisYear.toLocaleString()} jobs recently`)
  }

  if (tech.publicAIComfortLevel < 35) parts.push('public sentiment toward AI is hostile')
  else if (tech.publicAIComfortLevel > 70) parts.push('citizens broadly welcome AI')

  if (parts.length === 0) return 'Tech sector is unremarkable.'
  // Capitalize first
  const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
  return `${first}; ${parts.slice(1).join('; ')}.`
}
