// ============================================================================
// MayorSim — Education Subsystem
// Deep simulation of literacy, STEM, college attainment, teacher quality,
// dropout rate, school funding and downstream effects on city innovation,
// employment quality and inequality.
// ============================================================================

import type { CityStats, GameState, PolicyState } from './types'
import { clamp, clamp01 } from './util'

// ============================================================================
// LOCAL TYPES
// ============================================================================

export interface EducationState {
  literacyRate: number           // 0-100
  stemProficiency: number        // 0-100 (math/science scores)
  collegeAttainment: number      // % adults with degrees
  teacherQuality: number         // 0-100
  studentTeacherRatio: number    // typical 12-30
  dropoutRate: number            // 0-100 (lower is better)
  schoolFunding: number          // $/student per year (e.g. 5000-25000)
  earlyChildhoodCoverage: number // 0-100 universal pre-K access
  digitalLiteracy: number        // 0-100
  vocationalTraining: number     // 0-100
  testScoreMath: number          // 0-100 percentile
  testScoreReading: number       // 0-100
  testScoreScience: number       // 0-100
}

interface UpdateResult {
  education: EducationState
  effects: Partial<CityStats>
  notes: string[]
}

// ============================================================================
// CONSTANTS / TUNING
// ============================================================================

const RATIO_MIN = 10
const RATIO_MAX = 40
const FUNDING_MIN = 3000
const FUNDING_MAX = 30000

// Symmetric noise in range [-amp, amp]
const noise = (amp: number): number => (Math.random() * 2 - 1) * amp

// Clamp the student/teacher ratio to a plausible range
const clampRatio = (r: number): number => clamp(r, RATIO_MIN, RATIO_MAX)
const clampFunding = (f: number): number => clamp(f, FUNDING_MIN, FUNDING_MAX)

// ============================================================================
// GENERATE INITIAL STATE
// ============================================================================

export function generateEducationState(
  stats: CityStats,
  policy: PolicyState,
): EducationState {
  const eduGap = stats.education - 50
  const innoGap = stats.innovation - 50

  const baseRatio =
    policy.education === 'universal'
      ? 16
      : policy.education === 'meritocratic'
        ? 28
        : 22

  const earlyChildhood = policy.education === 'universal' ? 75 : 30

  // Vocational training: meritocratic tracks favour technical specialisation,
  // universal favours general access. Use policy as a proxy.
  const vocBase =
    policy.education === 'meritocratic'
      ? 55
      : policy.education === 'universal'
        ? 50
        : 40

  const testBase = 50 + eduGap * 0.6

  return {
    literacyRate: clamp01(70 + eduGap * 0.5 + noise(5)),
    stemProficiency: clamp01(50 + eduGap * 0.7 + noise(5)),
    collegeAttainment: clamp01(25 + eduGap * 0.5 + noise(5)),
    teacherQuality: clamp01(55 + eduGap * 0.4 + noise(5)),
    studentTeacherRatio: clampRatio(baseRatio + noise(2)),
    dropoutRate: clamp01(12 - eduGap * 0.1 + noise(3)),
    schoolFunding: clampFunding(8000 + stats.gdpPerCapita * 0.15 + noise(500)),
    earlyChildhoodCoverage: clamp01(earlyChildhood + noise(5)),
    digitalLiteracy: clamp01(50 + innoGap * 0.5 + noise(5)),
    vocationalTraining: clamp01(vocBase + noise(5)),
    testScoreMath: clamp01(testBase + noise(5)),
    testScoreReading: clamp01(testBase + noise(5)),
    testScoreScience: clamp01(testBase + noise(5)),
  }
}

// ============================================================================
// PER-TURN UPDATE
// ============================================================================

export function updateEducationPerTurn(
  edu: EducationState,
  state: GameState,
): UpdateResult {
  const notes: string[] = []
  const { buildings, stats, budget, policy } = state

  // --- Building counts ---------------------------------------------------
  let schools = 0
  let universities = 0
  let labs = 0
  let libraries = 0
  for (const b of buildings) {
    if (b.type === 'school') schools++
    else if (b.type === 'university') universities++
    else if (b.type === 'researchLab') labs++
    else if (b.type === 'library') libraries++
  }

  // --- Budget driver -----------------------------------------------------
  // Budget value is treated as a 0..100 allocation; the driver centers at
  // a neutral 25 (an under-funded baseline) so increasing it boosts metrics.
  const eduBudget = budget.education ?? 0
  const driver = (eduBudget - 25) / 100 // ~ -0.25..+0.75

  // Funding shifts toward target driven by budget + gdpPerCapita
  const fundingTarget =
    8000 + stats.gdpPerCapita * 0.15 + eduBudget * 80 // each pt ~ $80 more
  const fundingDelta = (fundingTarget - edu.schoolFunding) * 0.15
  const schoolFunding = clampFunding(edu.schoolFunding + fundingDelta)

  // Inequality penalties
  const inequalityPenalty = stats.inequality > 60 ? 0.2 : 0
  const inequalityAttainmentDrag = Math.max(0, (stats.inequality - 50) * 0.01)

  // Policy multipliers
  const universalBoost = policy.education === 'universal' ? 0.05 : 0
  const meritocraticBoost = policy.education === 'meritocratic' ? 0.04 : 0

  // --- Metric deltas -----------------------------------------------------
  const dLiteracy =
    driver * 0.6 +
    schools * 0.05 +
    libraries * 0.2 +
    universalBoost -
    Math.max(0, edu.dropoutRate - 15) * 0.01

  const dStem =
    driver * 0.5 +
    universities * 0.1 +
    labs * 0.1 +
    meritocraticBoost * 0.6 +
    (edu.teacherQuality - 50) * 0.005

  const dCollege =
    driver * 0.4 +
    universities * 0.15 +
    universalBoost * 0.5 -
    inequalityAttainmentDrag

  const dTeacher =
    driver * 0.3 +
    (schoolFunding > 12000 ? 0.15 : schoolFunding < 6000 ? -0.2 : 0) +
    universalBoost * 0.4

  // More schools = more capacity = lower ratio. Less budget pushes it up.
  const dRatio =
    -schools * 0.1 +
    (driver < 0 ? -driver * 0.6 : -driver * 0.4) * -1 // budget shrinks ratio
  // The above keeps the sign explicit: positive driver -> negative dRatio.

  const dDropout =
    -driver * 0.5 +
    inequalityPenalty -
    libraries * 0.05 -
    (edu.earlyChildhoodCoverage - 50) * 0.005 +
    (stats.unemployment - 50) * 0.005

  const dEarlyChildhood =
    driver * 0.4 +
    (policy.education === 'universal' ? 0.3 : 0) -
    (stats.inequality > 70 ? 0.05 : 0)

  const dDigital =
    driver * 0.3 +
    labs * 0.1 +
    libraries * 0.05 +
    (stats.innovation - 50) * 0.005

  const dVocational =
    driver * 0.3 +
    (policy.education === 'meritocratic' ? 0.15 : 0) +
    (stats.unemployment > 8 ? 0.1 : 0) // demand pulls vocational up

  // Test scores drift toward a funding-adjusted target
  const fundingFactor = (schoolFunding - 8000) / 5000 // ~ -1..+4
  const teacherFactor = (edu.teacherQuality - 50) / 50 // -1..+1
  const ratioFactor = (22 - edu.studentTeacherRatio) / 10 // smaller ratio = better
  const baseTestTarget = clamp01(
    50 +
      fundingFactor * 4 +
      teacherFactor * 10 +
      ratioFactor * 5 +
      (stats.education - 50) * 0.3,
  )

  const driftScore = (current: number, target: number): number =>
    (target - current) * 0.1

  const literacyRate = clamp01(edu.literacyRate + dLiteracy)
  const stemProficiency = clamp01(edu.stemProficiency + dStem)
  const collegeAttainment = clamp01(edu.collegeAttainment + dCollege)
  const teacherQuality = clamp01(edu.teacherQuality + dTeacher)
  const studentTeacherRatio = clampRatio(edu.studentTeacherRatio + dRatio)
  const dropoutRate = clamp01(edu.dropoutRate + dDropout)
  const earlyChildhoodCoverage = clamp01(
    edu.earlyChildhoodCoverage + dEarlyChildhood,
  )
  const digitalLiteracy = clamp01(edu.digitalLiteracy + dDigital)
  const vocationalTraining = clamp01(edu.vocationalTraining + dVocational)

  // STEM-targeted bias for math/science
  const stemTestTarget = clamp01(
    baseTestTarget + (stemProficiency - 50) * 0.2,
  )
  const readingTestTarget = clamp01(
    baseTestTarget + (literacyRate - 70) * 0.15,
  )

  const testScoreMath = clamp01(
    edu.testScoreMath + driftScore(edu.testScoreMath, stemTestTarget),
  )
  const testScoreReading = clamp01(
    edu.testScoreReading + driftScore(edu.testScoreReading, readingTestTarget),
  )
  const testScoreScience = clamp01(
    edu.testScoreScience + driftScore(edu.testScoreScience, stemTestTarget),
  )

  const nextEdu: EducationState = {
    literacyRate,
    stemProficiency,
    collegeAttainment,
    teacherQuality,
    studentTeacherRatio,
    dropoutRate,
    schoolFunding,
    earlyChildhoodCoverage,
    digitalLiteracy,
    vocationalTraining,
    testScoreMath,
    testScoreReading,
    testScoreScience,
  }

  // --- Notes -------------------------------------------------------------
  const meanTestDelta =
    (testScoreMath - edu.testScoreMath +
      testScoreReading - edu.testScoreReading +
      testScoreScience - edu.testScoreScience) /
    3

  if (meanTestDelta > 0.3) notes.push('Test scores improving across the board.')
  else if (meanTestDelta < -0.3)
    notes.push('Test scores slipping; parents are anxious.')

  if (dropoutRate - edu.dropoutRate > 0.15 && stats.inequality > 55)
    notes.push('Dropout rate climbing in low-income districts.')

  if (collegeAttainment - edu.collegeAttainment > 0.2)
    notes.push('More residents earning college degrees.')

  if (studentTeacherRatio < 18)
    notes.push('Smaller class sizes are paying off.')
  else if (studentTeacherRatio > 30)
    notes.push('Overcrowded classrooms are straining teachers.')

  if (teacherQuality < 40)
    notes.push('Teacher burnout reported; quality is declining.')

  if (digitalLiteracy - edu.digitalLiteracy > 0.2)
    notes.push('Digital literacy programs are gaining traction.')

  if (earlyChildhoodCoverage > 70 && policy.education === 'universal')
    notes.push('Universal pre-K expanding to more families.')

  if (schoolFunding < 5500)
    notes.push('Schools warn that per-student funding is critically low.')

  // --- City-stat effects -------------------------------------------------
  const eduComposite =
    (literacyRate + stemProficiency + collegeAttainment) / 3
  // Pull stats.education toward composite/1.5 baseline
  const educationTarget = clamp01(eduComposite / 1.5 + 30)
  const educationDelta = (educationTarget - stats.education) * 0.05

  const innovationBoost =
    ((stemProficiency - 50) * 0.01 +
      (digitalLiteracy - 50) * 0.005 +
      (collegeAttainment - 25) * 0.01) *
    0.5

  const inequalityRelief =
    ((collegeAttainment - 25) * 0.005 +
      (earlyChildhoodCoverage - 30) * 0.003 -
      (dropoutRate - 12) * 0.01) *
    -1 // higher attainment / coverage REDUCES inequality

  const unemploymentRelief =
    ((vocationalTraining - 40) * 0.003 + (collegeAttainment - 25) * 0.002) * -1

  const effects: Partial<CityStats> = {
    education: educationDelta,
    innovation: innovationBoost,
    inequality: inequalityRelief,
    unemployment: unemploymentRelief,
  }

  return { education: nextEdu, effects, notes }
}

// ============================================================================
// COMPOSITE SCORE
// ============================================================================

export function educationSystemScore(edu: EducationState): number {
  // Normalise non-percentage fields onto 0-100 then weighted-mean.
  // Ratio: 12 = best (100), 30 = worst (0)
  const ratioScore = clamp01(((30 - edu.studentTeacherRatio) / 18) * 100)
  // Funding: 5000 = bad (0), 25000 = excellent (100)
  const fundingScore = clamp01(((edu.schoolFunding - 5000) / 20000) * 100)
  // Dropout: invert (lower is better)
  const dropoutScore = clamp01(100 - edu.dropoutRate)

  const meanTest =
    (edu.testScoreMath + edu.testScoreReading + edu.testScoreScience) / 3

  const weighted =
    edu.literacyRate * 0.12 +
    edu.stemProficiency * 0.1 +
    edu.collegeAttainment * 0.1 +
    edu.teacherQuality * 0.1 +
    ratioScore * 0.08 +
    dropoutScore * 0.1 +
    fundingScore * 0.08 +
    edu.earlyChildhoodCoverage * 0.07 +
    edu.digitalLiteracy * 0.07 +
    edu.vocationalTraining * 0.06 +
    meanTest * 0.12

  return clamp01(weighted)
}

// ============================================================================
// UI DESCRIPTION
// ============================================================================

export function describeEducationSituation(edu: EducationState): string {
  const score = educationSystemScore(edu)
  const meanTest =
    (edu.testScoreMath + edu.testScoreReading + edu.testScoreScience) / 3

  if (score >= 80) {
    return `World-class schools: ${edu.collegeAttainment.toFixed(0)}% degrees, test scores at ${meanTest.toFixed(0)}th percentile, classes of ${edu.studentTeacherRatio.toFixed(0)}.`
  }
  if (score >= 65) {
    return `Strong system: ${edu.literacyRate.toFixed(0)}% literacy, ${edu.dropoutRate.toFixed(1)}% dropout, teachers rated ${edu.teacherQuality.toFixed(0)}/100.`
  }
  if (score >= 50) {
    return `Mixed results: ${edu.literacyRate.toFixed(0)}% literacy, $${(edu.schoolFunding / 1000).toFixed(1)}K per student, dropout ${edu.dropoutRate.toFixed(1)}%.`
  }
  if (score >= 35) {
    return `Struggling schools: dropout ${edu.dropoutRate.toFixed(1)}%, classes of ${edu.studentTeacherRatio.toFixed(0)}, only ${edu.collegeAttainment.toFixed(0)}% with degrees.`
  }
  return `Education crisis: ${edu.literacyRate.toFixed(0)}% literacy, ${edu.dropoutRate.toFixed(1)}% dropping out, funding at $${(edu.schoolFunding / 1000).toFixed(1)}K/student.`
}
