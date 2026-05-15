// ============================================================================
// MayorSim — Medical & Public Health Subsystem
// ----------------------------------------------------------------------------
// Models hospital capacity, disease prevalence, life expectancy, vaccination
// coverage, mental health, maternal care, drug overdose rates, and healthcare
// worker burnout. Feeds into the city health stat and triggers events.
//
// Design notes:
//  - Effects compound slowly: per-turn drifts are small (typically <1) so that
//    sustained policy choices, not single-turn swings, dominate outcomes.
//  - Diseases are written to match real-world public-health concerns so that
//    players learn what drives each (pollution → asthma, inequality → opioid,
//    lifestyle → diabetes, etc.).
// ============================================================================

import type { CityStats, GameState, PolicyState } from './types'
import { clamp, clamp01 } from './util'

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export type DiseaseId = string

export interface Disease {
  id: DiseaseId
  name: string
  severity: 'mild' | 'moderate' | 'severe'
  prevalence: number       // 0-100 share of population affected
  treatable: boolean
  preventable: boolean     // by vaccine / lifestyle / policy
  description: string
}

export interface MedicalState {
  hospitalCapacity: number       // 0-100, % of demand met
  staffBurnout: number           // 0-100
  vaccinationCoverage: number    // 0-100 for routine vaccines
  lifeExpectancy: number         // years (typically 60-85)
  mentalHealthIndex: number      // 0-100
  maternalCareIndex: number      // 0-100
  drugOverdoseRate: number       // per 100k, typically 5-80
  diseases: Disease[]            // currently active concerns
  ePrescriptionAdopted: boolean
  pandemicAlertLevel: 'green' | 'yellow' | 'orange' | 'red'
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Severity → numeric weight used by score & alert calculations.
const SEVERITY_WEIGHT: Record<Disease['severity'], number> = {
  mild: 1,
  moderate: 2.5,
  severe: 5,
}

// Reasonable life-expectancy bounds (years).
const MIN_LIFE_EXPECTANCY = 55
const MAX_LIFE_EXPECTANCY = 90

// Drug overdose deaths per 100k — empirical bounds across US/EU.
const MIN_OVERDOSE_RATE = 2
const MAX_OVERDOSE_RATE = 120

// ============================================================================
// BASE DISEASE CATALOG
// ----------------------------------------------------------------------------
// Each disease's prevalence is later adjusted by policy & environment in
// generateMedicalState. These defaults are educational baselines reflecting
// typical urban populations.
// ============================================================================

export const INITIAL_DISEASES: Disease[] = [
  {
    id: 'common_flu',
    name: 'Seasonal Influenza',
    severity: 'mild',
    prevalence: 8,
    treatable: true,
    preventable: true,
    description:
      'Annual viral respiratory illness. Vaccination coverage and hospital capacity determine whether a bad season becomes a crisis.',
  },
  {
    id: 'covid_endemic',
    name: 'Endemic COVID',
    severity: 'mild',
    prevalence: 3,
    treatable: true,
    preventable: true,
    description:
      'Persistent low-level SARS-CoV-2 circulation. Boosters and indoor air quality blunt the seasonal waves.',
  },
  {
    id: 'diabetes_type2',
    name: 'Type 2 Diabetes',
    severity: 'moderate',
    prevalence: 12,
    treatable: true,
    preventable: true,
    description:
      'Chronic metabolic disorder strongly tied to diet, obesity, and inequality. Eating habits and welfare programs matter more than hospitals.',
  },
  {
    id: 'opioid_addiction',
    name: 'Opioid Use Disorder',
    severity: 'severe',
    prevalence: 4,
    treatable: true,
    preventable: true,
    description:
      'A substance-use crisis fueled by despair, unemployment, and over-prescription. Harm-reduction policy saves lives; punitive policy rarely does.',
  },
  {
    id: 'depression',
    name: 'Clinical Depression',
    severity: 'moderate',
    prevalence: 16,
    treatable: true,
    preventable: false,
    description:
      'Mood disorder that costs cities billions in lost productivity. Access to therapy, green space, and stable employment all reduce prevalence.',
  },
  {
    id: 'hypertension',
    name: 'Hypertension',
    severity: 'moderate',
    prevalence: 28,
    treatable: true,
    preventable: true,
    description:
      'Silent killer behind most strokes & heart attacks. Driven by diet, stress, and air pollution; managed cheaply when caught early.',
  },
  {
    id: 'cancer_lung',
    name: 'Lung Cancer',
    severity: 'severe',
    prevalence: 1.5,
    treatable: true,
    preventable: true,
    description:
      'Tightly correlated with smoking and chronic air-pollution exposure. Emission standards have a measurable decade-scale payoff.',
  },
  {
    id: 'malnutrition',
    name: 'Malnutrition',
    severity: 'severe',
    prevalence: 3,
    treatable: true,
    preventable: true,
    description:
      'Under-nutrition or micronutrient deficiency, concentrated among the poor and elderly. Welfare programs and school meals reduce it sharply.',
  },
  {
    id: 'asthma_child',
    name: 'Pediatric Asthma',
    severity: 'mild',
    prevalence: 9,
    treatable: true,
    preventable: true,
    description:
      'Childhood respiratory disease driven by particulate pollution, mold, and traffic exposure. A clean-air bellwether.',
  },
]

// Convenience: deep-copy a disease so mutations to per-game state never
// pollute the module-level catalog.
function cloneDisease(d: Disease): Disease {
  return { ...d }
}

function cloneDiseases(list: Disease[]): Disease[] {
  return list.map(cloneDisease)
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function generateMedicalState(
  stats: CityStats,
  policy: PolicyState,
): MedicalState {
  const hospitalCapacity = clamp(50 + (stats.health - 50) * 0.6, 30, 100)

  const vaccinationCoverage =
    policy.healthcare === 'universal'
      ? 85
      : policy.healthcare === 'private'
        ? 55
        : 70

  const pollutionBonus = stats.pollution < 30 ? 4 : -2
  const lifeExpectancy = clamp(
    65 + (stats.health - 50) * 0.3 + pollutionBonus,
    MIN_LIFE_EXPECTANCY,
    MAX_LIFE_EXPECTANCY,
  )

  const mentalHealthIndex = clamp01(50 + (stats.happiness - 50) * 0.4)

  const drugOverdoseRate =
    policy.drugPolicy === 'punitive'
      ? 35
      : policy.drugPolicy === 'lenient'
        ? 12
        : 20

  // Seed diseases, then tune prevalence based on policy & environment.
  const diseases = cloneDiseases(INITIAL_DISEASES).map((d) => {
    const tuned = { ...d }
    switch (d.id) {
      case 'cancer_lung':
        // Strict emission standards lower baseline; lax raises it.
        if (policy.emissionStandards === 'strict') tuned.prevalence *= 0.7
        else if (policy.emissionStandards === 'lax') tuned.prevalence *= 1.4
        // Direct pollution component.
        tuned.prevalence += (stats.pollution - 40) * 0.02
        break
      case 'asthma_child':
        if (policy.emissionStandards === 'strict') tuned.prevalence *= 0.75
        else if (policy.emissionStandards === 'lax') tuned.prevalence *= 1.3
        tuned.prevalence += (stats.pollution - 40) * 0.05
        break
      case 'opioid_addiction':
        if (policy.drugPolicy === 'punitive') tuned.prevalence *= 1.25
        else if (policy.drugPolicy === 'lenient') tuned.prevalence *= 0.85
        // Despair: high inequality + unemployment amplifies.
        tuned.prevalence += (stats.inequality - 40) * 0.02
        tuned.prevalence += (stats.unemployment - 6) * 0.05
        break
      case 'malnutrition':
        tuned.prevalence += (stats.inequality - 40) * 0.04
        break
      case 'diabetes_type2':
        // Lifestyle: inequality & low education increase prevalence.
        tuned.prevalence += (stats.inequality - 40) * 0.05
        tuned.prevalence -= (stats.education - 50) * 0.03
        break
      case 'depression':
        tuned.prevalence -= (stats.happiness - 50) * 0.1
        break
      case 'common_flu':
      case 'covid_endemic':
        if (policy.healthcare === 'universal') tuned.prevalence *= 0.85
        else if (policy.healthcare === 'private') tuned.prevalence *= 1.1
        break
      default:
        break
    }
    tuned.prevalence = clamp(tuned.prevalence, 0, 100)
    return tuned
  })

  return {
    hospitalCapacity,
    staffBurnout: 30,
    vaccinationCoverage,
    lifeExpectancy,
    mentalHealthIndex,
    maternalCareIndex: 60,
    drugOverdoseRate,
    diseases,
    ePrescriptionAdopted: false,
    pandemicAlertLevel: 'green',
  }
}

// ============================================================================
// PER-TURN UPDATE
// ============================================================================

export function updateMedicalPerTurn(
  med: MedicalState,
  state: GameState,
): { medical: MedicalState; effects: Partial<CityStats>; notes: string[] } {
  const notes: string[] = []
  const stats = state.stats
  const policy = state.policy

  // Healthcare budget on 0..100 scale (most allocations sit 0..30 in practice;
  // we normalize using a generous denominator so per-turn signal stays small).
  const hcBudget = clamp(state.budget.healthcare ?? 0, 0, 100)
  const hcWeight = hcBudget / 100 // 0..1
  const educationBudget = clamp(state.budget.education ?? 0, 0, 100)
  const welfareBudget = clamp(state.budget.welfare ?? 0, 0, 100)

  // Count relevant buildings.
  let hospitalCount = 0
  let parkCount = 0
  let universityCount = 0
  let wasteTreatmentCount = 0
  for (const b of state.buildings) {
    if (b.type === 'hospital') hospitalCount++
    else if (b.type === 'park') parkCount++
    else if (b.type === 'university') universityCount++
    else if (b.type === 'wasteTreatment') wasteTreatmentCount++
  }

  // ------------------------------------------------------------------
  // 1. Hospital capacity
  // Each hospital adds 4 per turn, but baseline decays toward demand-met
  // equilibrium if you under-fund (budget < 15 erodes capacity).
  // ------------------------------------------------------------------
  let hospitalCapacity = med.hospitalCapacity
  const capGain = hospitalCount * 4 * (0.6 + hcWeight * 0.8)
  hospitalCapacity += capGain
  // Maintenance erosion when underfunded.
  if (hcBudget < 15) {
    hospitalCapacity -= (15 - hcBudget) * 0.15
  } else {
    // mild upkeep payoff
    hospitalCapacity += (hcBudget - 15) * 0.05
  }
  // Population-driven demand strain: very large cities relative to hospitals
  // grind capacity down slightly each turn.
  const popInThousands = stats.population / 1000
  const demandPressure = popInThousands / Math.max(1, hospitalCount * 50)
  if (demandPressure > 1) {
    hospitalCapacity -= (demandPressure - 1) * 1.5
  }
  hospitalCapacity = clamp(hospitalCapacity, 0, 100)

  // ------------------------------------------------------------------
  // 2. Staff burnout
  // Rises when hospitals are overloaded (low capacity, high demand).
  // Falls when budget supports staffing.
  // ------------------------------------------------------------------
  let staffBurnout = med.staffBurnout
  if (hospitalCapacity < 60) staffBurnout += (60 - hospitalCapacity) * 0.04
  if (hcBudget > 20) staffBurnout -= (hcBudget - 20) * 0.06
  if (med.pandemicAlertLevel === 'orange') staffBurnout += 1.5
  if (med.pandemicAlertLevel === 'red') staffBurnout += 3
  staffBurnout = clamp01(staffBurnout)
  if (staffBurnout > 75 && med.staffBurnout <= 75) {
    notes.push('Healthcare worker burnout has reached critical levels.')
  }

  // ------------------------------------------------------------------
  // 3. Vaccination coverage
  // Rises with healthcare budget and universal-healthcare policy.
  // Drifts down very slowly without investment.
  // ------------------------------------------------------------------
  let vaccinationCoverage = med.vaccinationCoverage
  vaccinationCoverage += hcWeight * 0.8
  if (policy.healthcare === 'universal') vaccinationCoverage += 0.25
  else if (policy.healthcare === 'private') vaccinationCoverage -= 0.15
  vaccinationCoverage -= 0.1 // natural waning without effort
  vaccinationCoverage = clamp01(vaccinationCoverage)

  // ------------------------------------------------------------------
  // 4. Mental health index
  // Parks help, pollution & unemployment & inequality hurt.
  // ------------------------------------------------------------------
  let mentalHealthIndex = med.mentalHealthIndex
  mentalHealthIndex += parkCount * 0.08
  mentalHealthIndex -= clamp(stats.unemployment - 5, 0, 50) * 0.05
  mentalHealthIndex -= clamp(stats.pollution - 30, 0, 70) * 0.02
  mentalHealthIndex -= clamp(stats.inequality - 40, 0, 60) * 0.03
  mentalHealthIndex += hcWeight * 0.4 // therapy access
  mentalHealthIndex += welfareBudget / 100 * 0.3
  mentalHealthIndex = clamp01(mentalHealthIndex)
  if (mentalHealthIndex < 35 && med.mentalHealthIndex >= 35) {
    notes.push('Mental health crisis worsening across the city.')
  } else if (mentalHealthIndex > 70 && med.mentalHealthIndex <= 70) {
    notes.push('Citizens report improved mental wellbeing.')
  }

  // ------------------------------------------------------------------
  // 5. Maternal care
  // Driven by hospital capacity + healthcare budget.
  // ------------------------------------------------------------------
  let maternalCareIndex = med.maternalCareIndex
  maternalCareIndex += (hospitalCapacity - 50) * 0.01
  maternalCareIndex += hcWeight * 0.3
  if (policy.healthcare === 'universal') maternalCareIndex += 0.1
  maternalCareIndex = clamp01(maternalCareIndex)

  // ------------------------------------------------------------------
  // 6. Life expectancy — very slow drift toward an optimum that depends
  //    on overall medical and environmental conditions.
  // ------------------------------------------------------------------
  const target =
    70 +
    (hospitalCapacity - 50) * 0.05 +
    (vaccinationCoverage - 70) * 0.04 +
    (mentalHealthIndex - 50) * 0.03 -
    clamp(stats.pollution - 30, 0, 70) * 0.06 -
    clamp(stats.crime - 30, 0, 70) * 0.02 +
    (policy.healthcare === 'universal' ? 1.5 : 0) +
    (policy.healthcare === 'private' ? -1 : 0)
  const targetClamped = clamp(target, MIN_LIFE_EXPECTANCY, MAX_LIFE_EXPECTANCY)
  let lifeExpectancy = med.lifeExpectancy + (targetClamped - med.lifeExpectancy) * 0.05
  lifeExpectancy = clamp(lifeExpectancy, MIN_LIFE_EXPECTANCY, MAX_LIFE_EXPECTANCY)

  // ------------------------------------------------------------------
  // 7. Drug overdose rate
  // Inequality and unemployment push it up; mental health & welfare pull
  // it down. Drug policy strongly modulates.
  // ------------------------------------------------------------------
  let drugOverdoseRate = med.drugOverdoseRate
  drugOverdoseRate += clamp(stats.inequality - 40, 0, 60) * 0.04
  drugOverdoseRate += clamp(stats.unemployment - 5, 0, 50) * 0.05
  drugOverdoseRate -= (mentalHealthIndex - 50) * 0.04
  drugOverdoseRate -= welfareBudget / 100 * 0.4
  if (policy.drugPolicy === 'punitive') drugOverdoseRate += 0.3
  else if (policy.drugPolicy === 'lenient') drugOverdoseRate -= 0.2
  drugOverdoseRate = clamp(drugOverdoseRate, MIN_OVERDOSE_RATE, MAX_OVERDOSE_RATE)
  if (drugOverdoseRate > 50 && med.drugOverdoseRate <= 50) {
    notes.push('Drug overdose deaths are climbing — a harm-reduction strategy may be needed.')
  }

  // ------------------------------------------------------------------
  // 8. Diseases — each evolves based on environmental & policy drivers.
  // ------------------------------------------------------------------
  const diseases = med.diseases.map((d) => {
    const next = cloneDisease(d)
    // Universal healthcare driver: improves treatment, lowers prevalence.
    const treatPressure =
      hcWeight * 0.15 + (policy.healthcare === 'universal' ? 0.05 : 0)

    switch (d.id) {
      case 'cancer_lung':
        // Pollution drives up over time; emission standards & waste plants help.
        next.prevalence += clamp(stats.pollution - 35, 0, 65) * 0.005
        next.prevalence -= wasteTreatmentCount * 0.01
        if (policy.emissionStandards === 'strict') next.prevalence -= 0.02
        next.prevalence -= treatPressure * 0.3
        break
      case 'asthma_child':
        next.prevalence += clamp(stats.pollution - 30, 0, 70) * 0.015
        next.prevalence -= parkCount * 0.02
        if (policy.emissionStandards === 'strict') next.prevalence -= 0.05
        next.prevalence -= treatPressure * 0.4
        break
      case 'opioid_addiction':
        next.prevalence += clamp(stats.inequality - 45, 0, 55) * 0.01
        next.prevalence += clamp(stats.unemployment - 7, 0, 50) * 0.015
        next.prevalence -= (mentalHealthIndex - 50) * 0.01
        if (policy.drugPolicy === 'lenient') next.prevalence -= 0.05
        if (policy.drugPolicy === 'punitive') next.prevalence += 0.04
        next.prevalence -= treatPressure * 0.5
        break
      case 'depression':
        next.prevalence -= (mentalHealthIndex - 50) * 0.04
        next.prevalence += clamp(stats.unemployment - 5, 0, 50) * 0.02
        next.prevalence -= parkCount * 0.01
        next.prevalence -= treatPressure * 0.5
        break
      case 'diabetes_type2':
        next.prevalence += clamp(stats.inequality - 40, 0, 60) * 0.005
        next.prevalence -= clamp(stats.education - 60, 0, 40) * 0.005
        next.prevalence -= welfareBudget / 100 * 0.05
        next.prevalence -= treatPressure * 0.3
        break
      case 'hypertension':
        next.prevalence += clamp(stats.pollution - 30, 0, 70) * 0.005
        next.prevalence -= treatPressure * 0.4
        next.prevalence -= parkCount * 0.01
        break
      case 'malnutrition':
        next.prevalence += clamp(stats.inequality - 40, 0, 60) * 0.01
        next.prevalence -= welfareBudget / 100 * 0.4
        next.prevalence -= treatPressure * 0.3
        break
      case 'common_flu':
      case 'covid_endemic':
        next.prevalence -= (vaccinationCoverage - 70) * 0.02
        next.prevalence -= treatPressure * 0.4
        // Pandemic alerts inflate during update.
        if (med.pandemicAlertLevel === 'orange') next.prevalence += 0.5
        if (med.pandemicAlertLevel === 'red') next.prevalence += 1.5
        break
      default:
        next.prevalence -= treatPressure * 0.3
        break
    }
    next.prevalence = clamp(next.prevalence, 0, 100)
    return next
  })

  // Notable disease threshold notes.
  const asthma = diseases.find((d) => d.id === 'asthma_child')
  if (asthma && asthma.prevalence > 14) {
    notes.push('Pediatric asthma rising due to pollution.')
  }
  const opioid = diseases.find((d) => d.id === 'opioid_addiction')
  if (opioid && opioid.prevalence > 8) {
    notes.push('Opioid epidemic spreading; treatment access is critical.')
  }
  const malnut = diseases.find((d) => d.id === 'malnutrition')
  if (malnut && malnut.prevalence > 6) {
    notes.push('Malnutrition reports climbing in low-income districts.')
  }

  // ------------------------------------------------------------------
  // 9. Pandemic alert level — derived from total severity * prevalence.
  // ------------------------------------------------------------------
  const threatScore = diseases.reduce(
    (sum, d) => sum + d.prevalence * SEVERITY_WEIGHT[d.severity],
    0,
  )
  let pandemicAlertLevel: MedicalState['pandemicAlertLevel'] = 'green'
  if (threatScore > 400) pandemicAlertLevel = 'red'
  else if (threatScore > 250) pandemicAlertLevel = 'orange'
  else if (threatScore > 150) pandemicAlertLevel = 'yellow'

  if (
    pandemicAlertLevel !== med.pandemicAlertLevel &&
    (pandemicAlertLevel === 'orange' || pandemicAlertLevel === 'red')
  ) {
    notes.push(`Pandemic alert raised to ${pandemicAlertLevel.toUpperCase()}.`)
  } else if (
    pandemicAlertLevel === 'green' &&
    (med.pandemicAlertLevel === 'orange' || med.pandemicAlertLevel === 'red')
  ) {
    notes.push('Pandemic alert lifted — situation stabilizing.')
  }

  // ------------------------------------------------------------------
  // 10. ePrescription adoption — once on, stays on. Adoption requires a
  //     research investment threshold + a university.
  // ------------------------------------------------------------------
  let ePrescriptionAdopted = med.ePrescriptionAdopted
  if (
    !ePrescriptionAdopted &&
    universityCount > 0 &&
    (state.budget.research ?? 0) > 15 &&
    state.stats.innovation > 55
  ) {
    ePrescriptionAdopted = true
    notes.push('E-prescription system rolled out citywide; medical errors drop.')
  }

  const nextMedical: MedicalState = {
    hospitalCapacity,
    staffBurnout,
    vaccinationCoverage,
    lifeExpectancy,
    mentalHealthIndex,
    maternalCareIndex,
    drugOverdoseRate,
    diseases,
    ePrescriptionAdopted,
    pandemicAlertLevel,
  }

  // ------------------------------------------------------------------
  // 11. Compose effects on CityStats.
  // health: function of capacity, vaccination, life expectancy proxy,
  //         minus disease burden.
  // happiness: small influence from mental health & burnout.
  // ------------------------------------------------------------------
  const healthTarget =
    hospitalCapacity * 0.35 +
    vaccinationCoverage * 0.2 +
    mentalHealthIndex * 0.15 +
    ((lifeExpectancy - MIN_LIFE_EXPECTANCY) /
      (MAX_LIFE_EXPECTANCY - MIN_LIFE_EXPECTANCY)) *
      100 *
      0.2 -
    Math.min(40, threatScore / 12) // disease drag, capped
  const healthDelta = clamp((healthTarget - stats.health) * 0.06, -1.5, 1.5)

  const happinessDelta =
    (mentalHealthIndex - 50) * 0.01 -
    Math.max(0, staffBurnout - 60) * 0.01 -
    (pandemicAlertLevel === 'orange' ? 0.4 : 0) -
    (pandemicAlertLevel === 'red' ? 1.0 : 0)

  const effects: Partial<CityStats> = {
    health: healthDelta,
    happiness: clamp(happinessDelta, -1.5, 1.5),
  }

  return { medical: nextMedical, effects, notes }
}

// ============================================================================
// EPIDEMIC TRIGGER
// ============================================================================

export function triggerEpidemic(
  med: MedicalState,
  diseaseId: DiseaseId,
  intensity: number,
): MedicalState {
  const safeIntensity = clamp(intensity, 0, 100)
  const diseases = med.diseases.map((d) => {
    if (d.id !== diseaseId) return cloneDisease(d)
    return {
      ...d,
      prevalence: clamp(d.prevalence + safeIntensity, 0, 100),
    }
  })

  // If the named disease wasn't in the list, add a generic outbreak entry so
  // event chains can still spike unknown threats.
  if (!diseases.some((d) => d.id === diseaseId)) {
    diseases.push({
      id: diseaseId,
      name: 'Outbreak',
      severity: safeIntensity >= 30 ? 'severe' : 'moderate',
      prevalence: safeIntensity,
      treatable: true,
      preventable: false,
      description: 'An emergent outbreak triggered by a recent event.',
    })
  }

  const pandemicAlertLevel: MedicalState['pandemicAlertLevel'] =
    safeIntensity >= 40 ? 'red' : 'orange'

  return {
    ...med,
    diseases,
    hospitalCapacity: clamp(med.hospitalCapacity - 15, 0, 100),
    staffBurnout: clamp01(med.staffBurnout + 8),
    pandemicAlertLevel,
  }
}

// ============================================================================
// DESCRIPTION
// ============================================================================

export function describeMedicalSituation(med: MedicalState): string {
  const activeConcerns = med.diseases.filter((d) => d.prevalence >= 2).length
  const cap = Math.round(med.hospitalCapacity)
  return `${activeConcerns} active concerns; capacity ${cap}%; alert: ${med.pandemicAlertLevel}`
}

// ============================================================================
// SCORE — 0..100 summary
// ============================================================================

export function medicalSystemScore(med: MedicalState): number {
  // Normalize life expectancy to 0..100.
  const lifeNorm = clamp(
    ((med.lifeExpectancy - MIN_LIFE_EXPECTANCY) /
      (MAX_LIFE_EXPECTANCY - MIN_LIFE_EXPECTANCY)) *
      100,
    0,
    100,
  )

  // Disease burden: severity-weighted prevalence sum, mapped inversely.
  const burden = med.diseases.reduce(
    (sum, d) => sum + d.prevalence * SEVERITY_WEIGHT[d.severity],
    0,
  )
  const diseasePenalty = clamp(burden / 6, 0, 60) // cap penalty at 60 pts

  // Burnout drags the score down a bit too — strained staff = worse outcomes.
  const burnoutPenalty = clamp((med.staffBurnout - 50) * 0.2, 0, 15)

  // Alert-level penalty.
  const alertPenalty =
    med.pandemicAlertLevel === 'red'
      ? 15
      : med.pandemicAlertLevel === 'orange'
        ? 8
        : med.pandemicAlertLevel === 'yellow'
          ? 3
          : 0

  const positive =
    med.hospitalCapacity * 0.28 +
    med.vaccinationCoverage * 0.18 +
    med.mentalHealthIndex * 0.18 +
    lifeNorm * 0.22 +
    med.maternalCareIndex * 0.14

  return clamp(positive - diseasePenalty - burnoutPenalty - alertPenalty, 0, 100)
}
