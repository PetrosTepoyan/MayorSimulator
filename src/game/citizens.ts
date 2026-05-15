import type {
  Citizen,
  District,
  Sector,
  GameState,
  Country,
  EmploymentStatus,
  PoliticalLeaning,
  IndustryType,
} from './types'
import { clamp, clamp01, uid, weightedPick } from './util'

// ============================================================================
// CITIZENS — a representative sample (~150) of the city's population.
// They have names, jobs, opinions, and life stories that feed news + approval.
// ============================================================================

// ---------------------------------------------------------------------------
// Names — internationally diverse pool. Combined randomly for variety.
// ---------------------------------------------------------------------------

const FIRST_NAMES: readonly string[] = [
  'Aisha', 'Mateo', 'Yuki', 'Liam', 'Sofia', 'Kenji', 'Amina', 'Noah',
  'Priya', 'Lucas', 'Mei', 'Olivia', 'Ahmed', 'Isabella', 'Diego', 'Anya',
  'Marcus', 'Fatima', 'Hiroshi', 'Elena', 'Kwame', 'Camila', 'Dmitri', 'Zara',
  'Jamal', 'Ingrid', 'Ravi', 'Chiamaka', 'Tomas', 'Linh', 'Astrid', 'Oluwa',
  'Sven', 'Mariam', 'Tariq', 'Beatriz', 'Jin', 'Hannah', 'Cyrus', 'Naomi',
  'Pavel', 'Leila', 'Bjorn', 'Esperanza', 'Hassan', 'Sakura', 'Kofi', 'Vera',
  'Idris', 'Ayse',
]

const LAST_NAMES: readonly string[] = [
  'Nakamura', 'Okonkwo', 'Patel', 'Garcia', 'Larsen', 'Khan', 'Silva', 'Tanaka',
  'Ahmadi', 'Müller', 'Rossi', 'Kowalski', 'Diallo', 'Chen', 'Hassan', 'Ivanov',
  'Adeyemi', 'Lopez', 'Berg', 'Singh', 'Rivera', 'Yamamoto', 'Park', 'Olsen',
  'Becker', 'Marin', 'Nguyen', 'Cohen', 'Reyes', 'Sato', 'Romero', 'Kobayashi',
  'Andersson', 'Petrov', 'Touré', 'Mendes', 'Brennan', 'Hoffman', 'Karimov', 'Acosta',
  'Doumbia', 'Schneider', 'Vasquez', 'Lindgren', 'Akinyemi', 'O\'Brien', 'Volkov', 'Saito',
  'Ferreira', 'Goldberg',
]

// ---------------------------------------------------------------------------
// Profession pools by sector. The sector id matches the keys in sectorMix.
// 'other' is a catch-all for residential/civic professions.
// ---------------------------------------------------------------------------

const PROFESSIONS_BY_SECTOR: Record<string, readonly string[]> = {
  finance: ['Banker', 'Accountant', 'Trader', 'Financial Analyst'],
  tech: ['Software Engineer', 'Product Manager', 'Data Scientist', 'UX Designer'],
  industrial: ['Welder', 'Machine Operator', 'Factory Worker', 'Foreman'],
  services: ['Cashier', 'Server', 'Cleaner', 'Receptionist'],
  healthcare: ['Nurse', 'Doctor', 'Paramedic', 'Therapist'],
  education: ['Teacher', 'Professor', 'School Administrator'],
  agriculture: ['Farmer', 'Farm Hand'],
  retail: ['Shop Owner', 'Sales Associate'],
  energy: ['Engineer', 'Lineworker'],
  tourism: ['Hotel Manager', 'Tour Guide', 'Concierge'],
  other: [
    'Driver', 'Artist', 'Musician', 'Writer',
    'Mechanic', 'Plumber', 'Bus Driver',
    'Police Officer', 'Firefighter',
  ],
}

// Profession income multiplier vs. district average. ~1.0 is neutral.
const PROFESSION_MULTIPLIER: Record<string, number> = {
  // finance
  Banker: 1.8, Accountant: 1.2, Trader: 2.0, 'Financial Analyst': 1.5,
  // tech
  'Software Engineer': 1.6, 'Product Manager': 1.8, 'Data Scientist': 1.7, 'UX Designer': 1.3,
  // industrial
  Welder: 0.95, 'Machine Operator': 0.85, 'Factory Worker': 0.75, Foreman: 1.15,
  // services
  Cashier: 0.5, Server: 0.55, Cleaner: 0.5, Receptionist: 0.7,
  // healthcare
  Nurse: 1.1, Doctor: 2.0, Paramedic: 0.95, Therapist: 1.3,
  // education
  Teacher: 1.0, Professor: 1.4, 'School Administrator': 1.2,
  // agriculture
  Farmer: 0.7, 'Farm Hand': 0.45,
  // retail
  'Shop Owner': 1.3, 'Sales Associate': 0.65,
  // energy
  Engineer: 1.5, Lineworker: 1.0,
  // tourism
  'Hotel Manager': 1.3, 'Tour Guide': 0.75, Concierge: 0.85,
  // other
  Driver: 0.7, Artist: 0.6, Musician: 0.65, Writer: 0.75,
  Mechanic: 0.9, Plumber: 1.0, 'Bus Driver': 0.75,
  'Police Officer': 1.0, Firefighter: 1.05,
}

// Map a district's primary industry to candidate sector ids.
// The result is a weighted pool: the matching sector dominates,
// with some spillover into general-purpose categories so a
// purely-industrial district still has a few drivers and shopkeepers.
const INDUSTRY_TO_SECTOR_WEIGHTS: Record<IndustryType, Array<{ sector: string; weight: number }>> = {
  finance: [
    { sector: 'finance', weight: 50 },
    { sector: 'services', weight: 18 },
    { sector: 'tech', weight: 10 },
    { sector: 'retail', weight: 8 },
    { sector: 'other', weight: 14 },
  ],
  tech: [
    { sector: 'tech', weight: 50 },
    { sector: 'services', weight: 14 },
    { sector: 'education', weight: 10 },
    { sector: 'retail', weight: 8 },
    { sector: 'other', weight: 18 },
  ],
  industrial: [
    { sector: 'industrial', weight: 55 },
    { sector: 'energy', weight: 10 },
    { sector: 'services', weight: 12 },
    { sector: 'retail', weight: 7 },
    { sector: 'other', weight: 16 },
  ],
  services: [
    { sector: 'services', weight: 45 },
    { sector: 'retail', weight: 18 },
    { sector: 'healthcare', weight: 10 },
    { sector: 'finance', weight: 8 },
    { sector: 'other', weight: 19 },
  ],
  agriculture: [
    { sector: 'agriculture', weight: 55 },
    { sector: 'services', weight: 10 },
    { sector: 'retail', weight: 10 },
    { sector: 'industrial', weight: 8 },
    { sector: 'other', weight: 17 },
  ],
  residential: [
    { sector: 'services', weight: 22 },
    { sector: 'retail', weight: 16 },
    { sector: 'healthcare', weight: 12 },
    { sector: 'education', weight: 12 },
    { sector: 'other', weight: 38 },
  ],
  tourism: [
    { sector: 'tourism', weight: 45 },
    { sector: 'services', weight: 18 },
    { sector: 'retail', weight: 14 },
    { sector: 'other', weight: 23 },
  ],
  energy: [
    { sector: 'energy', weight: 50 },
    { sector: 'industrial', weight: 18 },
    { sector: 'services', weight: 10 },
    { sector: 'other', weight: 22 },
  ],
  university: [
    { sector: 'education', weight: 50 },
    { sector: 'tech', weight: 14 },
    { sector: 'services', weight: 12 },
    { sector: 'healthcare', weight: 8 },
    { sector: 'other', weight: 16 },
  ],
  mixed: [
    { sector: 'services', weight: 22 },
    { sector: 'retail', weight: 14 },
    { sector: 'industrial', weight: 12 },
    { sector: 'tech', weight: 10 },
    { sector: 'finance', weight: 8 },
    { sector: 'healthcare', weight: 8 },
    { sector: 'other', weight: 26 },
  ],
}

// Age bracket weights (rough realistic distribution).
const AGE_BRACKETS: ReadonlyArray<{ min: number; max: number; weight: number }> = [
  { min: 5, max: 17, weight: 22 },
  { min: 18, max: 29, weight: 13 },
  { min: 30, max: 44, weight: 17 },
  { min: 45, max: 59, weight: 19 },
  { min: 60, max: 84, weight: 19 },
]

const MAX_STORY_LOG = 6
const DEFAULT_CITIZEN_COUNT = 150

// ---------------------------------------------------------------------------
// Small RNG helpers — keep code terse and deterministic-friendly.
// ---------------------------------------------------------------------------

const pickRandom = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

const randRange = (lo: number, hi: number): number => lo + Math.random() * (hi - lo)

const randInt = (lo: number, hi: number): number => Math.floor(randRange(lo, hi + 1))

const noisyMultiplier = (pct: number): number => 1 + (Math.random() * 2 - 1) * pct

// ---------------------------------------------------------------------------
// Sub-generators
// ---------------------------------------------------------------------------

function pickName(): string {
  return `${pickRandom(FIRST_NAMES)} ${pickRandom(LAST_NAMES)}`
}

function pickAge(): number {
  const bracket = weightedPick(AGE_BRACKETS.map((b) => ({ ...b }))) ?? AGE_BRACKETS[2]
  return randInt(bracket.min, bracket.max)
}

function pickSectorForDistrict(district: District, availableSectors: ReadonlySet<string>): string {
  const candidates = INDUSTRY_TO_SECTOR_WEIGHTS[district.primaryIndustry]
  // Down-weight sectors the country doesn't actually have.
  const filtered = candidates
    .map((c) => ({
      sector: c.sector,
      weight: c.sector === 'other' || availableSectors.has(c.sector) ? c.weight : c.weight * 0.15,
    }))
    .filter((c) => c.weight > 0)
  const picked = weightedPick(filtered)
  return picked ? picked.sector : 'other'
}

function pickProfessionForSector(sector: string): string {
  const pool = PROFESSIONS_BY_SECTOR[sector] ?? PROFESSIONS_BY_SECTOR.other
  return pickRandom(pool)
}

function pickPoliticalLeaning(districtLeaning: PoliticalLeaning): PoliticalLeaning {
  // ~70% match district, 30% mixed.
  if (Math.random() < 0.7) return districtLeaning
  const others: PoliticalLeaning[] = (['progressive', 'centrist', 'conservative'] as PoliticalLeaning[])
    .filter((l) => l !== districtLeaning)
  return pickRandom(others)
}

function pickEmploymentStatus(age: number, district: District): EmploymentStatus {
  if (age < 18) return 'student'
  if (age >= 18 && age <= 22 && Math.random() < 0.3) return 'student'
  if (age >= 60 && Math.random() < 0.5) return 'retired'
  // 10% combined chance of self-employed / informal among work-age people.
  const roll = Math.random()
  if (roll < 0.05) return 'self-employed'
  if (roll < 0.10) return 'informal'
  // Working-age unemployment proportional to district crime as a rough proxy.
  const unemploymentChance = clamp(district.stats.crime / 100, 0.02, 0.35)
  if (Math.random() < unemploymentChance) return 'unemployed'
  return 'employed'
}

function computeIncome(profession: string, status: EmploymentStatus, district: District): number {
  if (status === 'student' || status === 'unemployed') return 0
  if (status === 'retired') {
    // Pension ≈ 35-55% of district avg, profession-neutral.
    return Math.round(district.stats.avgIncome * randRange(0.35, 0.55))
  }
  const base = district.stats.avgIncome
  const mult = PROFESSION_MULTIPLIER[profession] ?? 1.0
  const informalDiscount = status === 'informal' ? 0.55 : status === 'self-employed' ? 0.9 : 1.0
  return Math.round(base * mult * informalDiscount * noisyMultiplier(0.2))
}

function computeEducationLevel(age: number, district: District, profession: string): number {
  let base = district.stats.education + randRange(-12, 12)
  // Professional bumps for credentialed jobs.
  if (
    profession === 'Doctor' ||
    profession === 'Professor' ||
    profession === 'Software Engineer' ||
    profession === 'Data Scientist' ||
    profession === 'Financial Analyst' ||
    profession === 'Therapist'
  ) {
    base += 15
  } else if (profession === 'Factory Worker' || profession === 'Farm Hand' || profession === 'Cleaner') {
    base -= 10
  }
  if (age < 18) base -= 15
  return Math.round(clamp01(base))
}

function computeInitialOpinion(
  district: District,
  political: PoliticalLeaning,
  status: EmploymentStatus,
): number {
  let opinion = district.stats.approval + randRange(-15, 15)
  // Leaning vs district leaning mild adjustment (already correlated by pickPoliticalLeaning).
  if (political !== district.leaning) opinion -= 5
  if (status === 'unemployed') opinion -= 10
  if (status === 'retired') opinion += 5
  return clamp01(opinion)
}

function computeSatisfaction(income: number, district: District, status: EmploymentStatus): number {
  const avg = Math.max(1, district.stats.avgIncome)
  const incomeFactor = status === 'employed' || status === 'self-employed'
    ? ((income - avg) / avg) * 20
    : status === 'retired'
      ? -2
      : status === 'unemployed'
        ? -15
        : 0
  return clamp01(50 + incomeFactor + randRange(-8, 8))
}

function computeFamilySize(age: number, status: EmploymentStatus): number {
  if (age < 18) return randInt(2, 5)
  if (age < 25) return Math.random() < 0.7 ? 1 : randInt(2, 3)
  if (age < 60) {
    const r = Math.random()
    if (r < 0.25) return 1
    if (r < 0.55) return 2
    if (r < 0.85) return 3
    return randInt(4, 5)
  }
  // Older — empty-nesters likelier.
  return Math.random() < 0.4 ? 1 : 2
  void status
}

function initialStoryLog(cityName: string, district: District, age: number): string[] {
  const log: string[] = []
  const roll = Math.random()
  if (roll < 0.4) {
    log.push(`Born in ${cityName}.`)
  } else if (roll < 0.75) {
    const yearsAgo = Math.max(1, Math.min(age - 1, randInt(2, 25)))
    log.push(`Moved to ${district.name} ${yearsAgo} years ago.`)
  } else {
    log.push(`Graduated from ${cityName} University.`)
  }
  return log
}

// ---------------------------------------------------------------------------
// generateCitizens
// ---------------------------------------------------------------------------

export function generateCitizens(
  districts: District[],
  sectors: Sector[],
  country: Country,
  count: number = DEFAULT_CITIZEN_COUNT,
): Citizen[] {
  if (districts.length === 0) return []

  const availableSectors = new Set(sectors.map((s) => s.id))
  // Distribute citizens across districts proportional to population.
  const totalPop = districts.reduce((s, d) => s + d.stats.population, 0) || 1
  const perDistrict = districts.map((d) =>
    Math.max(1, Math.round((d.stats.population / totalPop) * count)),
  )

  // Adjust to hit requested count exactly.
  let allocated = perDistrict.reduce((s, n) => s + n, 0)
  let i = 0
  while (allocated > count && perDistrict.some((n) => n > 1)) {
    if (perDistrict[i % perDistrict.length] > 1) {
      perDistrict[i % perDistrict.length]--
      allocated--
    }
    i++
  }
  while (allocated < count) {
    perDistrict[i % perDistrict.length]++
    allocated++
    i++
  }

  const citizens: Citizen[] = []
  for (let d = 0; d < districts.length; d++) {
    const district = districts[d]
    const n = perDistrict[d]
    for (let k = 0; k < n; k++) {
      citizens.push(makeCitizen(district, availableSectors, country.cityName))
    }
  }
  return citizens
}

function makeCitizen(
  district: District,
  availableSectors: ReadonlySet<string>,
  cityName: string,
): Citizen {
  const age = pickAge()
  const status = pickEmploymentStatus(age, district)
  const political = pickPoliticalLeaning(district.leaning)

  // Students/retirees/unemployed have no sector; otherwise pick from district mix.
  const hasJob = status === 'employed' || status === 'self-employed' || status === 'informal'
  const sectorId = hasJob ? pickSectorForDistrict(district, availableSectors) : ''
  const profession = hasJob
    ? pickProfessionForSector(sectorId)
    : status === 'student'
      ? 'Student'
      : status === 'retired'
        ? 'Retiree'
        : 'Job Seeker'

  const income = computeIncome(profession, status, district)
  const education = computeEducationLevel(age, district, profession)
  const family = computeFamilySize(age, status)
  const opinion = computeInitialOpinion(district, political, status)
  const satisfaction = computeSatisfaction(income, district, status)

  return {
    id: uid('cit'),
    name: pickName(),
    age,
    districtId: district.id,
    profession,
    sectorId,
    income,
    education,
    family,
    status,
    opinion,
    political,
    storyLog: initialStoryLog(cityName, district, age),
    satisfaction,
  }
}

// ---------------------------------------------------------------------------
// updateCitizensPerTurn — life events, opinion drift, aging.
// ---------------------------------------------------------------------------

type LifeEvent = {
  headline: string
  tone: 'good' | 'bad' | 'neutral'
  districtId?: string
}

export function updateCitizensPerTurn(
  citizens: Citizen[],
  state: GameState,
): { citizens: Citizen[]; events: LifeEvent[] } {
  const events: LifeEvent[] = []
  const districtById = new Map(state.districts.map((d) => [d.id, d]))
  const availableSectors = new Set(state.sectors.map((s) => s.id))
  const ageThisTurn = state.turn > 0 && state.turn % 4 === 0
  const next: Citizen[] = []

  for (const c of citizens) {
    const district = districtById.get(c.districtId)
    if (!district) {
      // Citizen's district disappeared somehow — drop them.
      continue
    }

    // Start from an immutable copy.
    let citizen: Citizen = { ...c, storyLog: c.storyLog.slice() }

    if (ageThisTurn) {
      citizen = { ...citizen, age: citizen.age + 1 }
    }

    // ---- Life events ------------------------------------------------------
    const moved = rollLifeEvents(citizen, district, state, events)
    if (moved.removed) continue
    citizen = moved.citizen

    // ---- Opinion drift from macro conditions ------------------------------
    citizen = applyOpinionDrift(citizen, district, state)

    // Cap story log.
    if (citizen.storyLog.length > MAX_STORY_LOG) {
      citizen = { ...citizen, storyLog: citizen.storyLog.slice(-MAX_STORY_LOG) }
    }

    next.push(citizen)
  }

  // Rare new arrivals from outside the city.
  if (state.districts.length > 0 && Math.random() < 0.1) {
    const target = pickRandom(state.districts)
    const country = state.cityName ? { cityName: state.cityName } : { cityName: 'the city' }
    const newcomer = makeCitizen(target, availableSectors, country.cityName)
    newcomer.storyLog = [`Arrived in ${target.name} this quarter, drawn by opportunity.`]
    // Newcomers start optimistic.
    newcomer.opinion = clamp01(newcomer.opinion + 8)
    next.push(newcomer)
    events.push({
      headline: `${newcomer.name}, a ${newcomer.profession}, moved to ${target.name} this quarter.`,
      tone: 'good',
      districtId: target.id,
    })
  }

  return { citizens: next, events }
}

function rollLifeEvents(
  citizen: Citizen,
  district: District,
  state: GameState,
  events: LifeEvent[],
): { citizen: Citizen; removed: boolean } {
  let c = citizen
  const stats = state.stats

  // 1. Lose job (employed)
  if (c.status === 'employed' && Math.random() < 0.005) {
    const log = [...c.storyLog, `Lost job as a ${c.profession}.`]
    c = { ...c, status: 'unemployed', opinion: clamp01(c.opinion - 15), income: 0, storyLog: log }
    events.push({
      headline: `${c.name}, a ${c.profession} in ${district.name}, lost their job this quarter.`,
      tone: 'bad',
      districtId: district.id,
    })
  }

  // 2. Find a new job (unemployed)
  if (c.status === 'unemployed' && Math.random() < 0.004) {
    const sectorId = pickSectorForDistrict(district, new Set(state.sectors.map((s) => s.id)))
    const profession = pickProfessionForSector(sectorId)
    const income = computeIncome(profession, 'employed', district)
    const log = [...c.storyLog, `Found work as a ${profession}.`]
    c = {
      ...c,
      status: 'employed',
      profession,
      sectorId,
      income,
      opinion: clamp01(c.opinion + 10),
      storyLog: log,
    }
    events.push({
      headline: `After months searching, ${c.name} found work as a ${profession} in ${district.name}.`,
      tone: 'good',
      districtId: district.id,
    })
  }

  // 3. Illness
  if (Math.random() < 0.002) {
    const opinionPenalty = stats.health < 50 ? 8 : 0
    const log = [...c.storyLog, `Fell ill — recovery affected by city healthcare.`]
    c = {
      ...c,
      satisfaction: clamp01(c.satisfaction - 10),
      opinion: clamp01(c.opinion - opinionPenalty),
      storyLog: log,
    }
    if (stats.health < 50) {
      events.push({
        headline: `${c.name} of ${district.name} struggled to get hospital care after falling ill.`,
        tone: 'bad',
        districtId: district.id,
      })
    }
  }

  // 4. Child born (employed adult of childbearing age)
  if (c.age >= 20 && c.age <= 40 && c.status === 'employed' && Math.random() < 0.003) {
    const log = [...c.storyLog, `Welcomed a new child into the family.`]
    c = {
      ...c,
      family: c.family + 1,
      opinion: clamp01(c.opinion + 3),
      storyLog: log,
    }
    events.push({
      headline: `${c.name}, a ${c.profession} in ${district.name}, welcomed a newborn into the family.`,
      tone: 'good',
      districtId: district.id,
    })
  }

  // 5. Kid starts school
  if (c.family >= 2 && Math.random() < 0.002) {
    const educationGood = stats.education >= 60
    const delta = educationGood ? 4 : -3
    const log = [...c.storyLog, `Child enrolled at the local school.`]
    c = { ...c, opinion: clamp01(c.opinion + delta), storyLog: log }
    events.push({
      headline: educationGood
        ? `${c.name}'s child started school in ${district.name} — the family says the classroom is full but lively.`
        : `${c.name}'s child started school in ${district.name}, where overcrowding remains a complaint.`,
      tone: educationGood ? 'good' : 'bad',
      districtId: district.id,
    })
  }

  // 6. Retirement
  if (c.age >= 60 && c.status === 'employed' && Math.random() < 0.004) {
    const pension = Math.round(district.stats.avgIncome * randRange(0.35, 0.55))
    const log = [...c.storyLog, `Retired after a long career as a ${c.profession}.`]
    c = {
      ...c,
      status: 'retired',
      income: pension,
      opinion: clamp01(c.opinion + 4),
      storyLog: log,
    }
    events.push({
      headline: `${c.name} retired this quarter after years as a ${c.profession} in ${district.name}.`,
      tone: 'neutral',
      districtId: district.id,
    })
  }

  // 7. Moves out — only if opinion is low AND city has real problems.
  const badCity = stats.crime > 55 || stats.inequality > 65
  if (c.opinion < 20 && badCity && Math.random() < 0.001) {
    events.push({
      headline: `${c.name}, a ${c.profession}, is leaving ${district.name} for opportunities elsewhere.`,
      tone: 'bad',
      districtId: district.id,
    })
    return { citizen: c, removed: true }
  }

  return { citizen: c, removed: false }
}

// ---------------------------------------------------------------------------
// Opinion drift — anchoring + policy preferences + macro mood.
// ---------------------------------------------------------------------------

function leaningPolicyDelta(citizen: Citizen, policy: GameState['policy']): number {
  // Progressives like high min wage, strict emissions, universal healthcare/education,
  // open immigration, lenient drugs, subsidized/free transit, soft rent control.
  // Conservatives roughly opposite.
  // Centrists are neutral.
  if (citizen.political === 'centrist') return 0

  const sign = citizen.political === 'progressive' ? 1 : -1
  let score = 0

  // Minimum wage: scale relative to "neutral" ~10
  score += sign * clamp((policy.minimumWage - 10) / 10, -1, 1)

  // Emission standards
  if (policy.emissionStandards === 'strict') score += sign * 1.0
  else if (policy.emissionStandards === 'lax') score -= sign * 1.0

  // Healthcare
  if (policy.healthcare === 'universal') score += sign * 1.0
  else if (policy.healthcare === 'private') score -= sign * 1.0

  // Education
  if (policy.education === 'universal') score += sign * 0.5
  else if (policy.education === 'meritocratic') score -= sign * 0.3

  // Immigration
  if (policy.immigration === 'open') score += sign * 0.6
  else if (policy.immigration === 'restrictive') score -= sign * 0.6

  // Drug policy
  if (policy.drugPolicy === 'lenient') score += sign * 0.5
  else if (policy.drugPolicy === 'punitive') score -= sign * 0.5

  // Transit
  if (policy.transit === 'free' || policy.transit === 'subsidized') score += sign * 0.4
  else if (policy.transit === 'market') score -= sign * 0.4

  // Rent control
  if (policy.rentControl === 'strict' || policy.rentControl === 'soft') score += sign * 0.3
  else score -= sign * 0.2

  // Clamp into the requested [0.5, 1.0]-ish per turn band when score is strong.
  return clamp(score * 0.4, -1.5, 1.5)
}

function applyOpinionDrift(citizen: Citizen, district: District, state: GameState): Citizen {
  const stats = state.stats
  const budget = state.budget

  // Anchor toward cityStats.approval at 10%.
  let opinion = citizen.opinion + (stats.approval - citizen.opinion) * 0.1

  // Policy alignment.
  opinion += leaningPolicyDelta(citizen, state.policy)

  // Macro mood.
  if (stats.inflation > 8) opinion -= 2
  if (stats.unemployment > 10) opinion -= 1.5
  if (stats.happiness > 70) opinion += 1

  // Profession-specific budget responses (centered at 15, modest range).
  const budgetEffect = (cat: keyof typeof budget) => (budget[cat] - 15) * 0.08
  switch (citizen.profession) {
    case 'Teacher':
    case 'Professor':
    case 'School Administrator':
      opinion += budgetEffect('education')
      break
    case 'Police Officer':
    case 'Firefighter':
      opinion += budgetEffect('security')
      break
    case 'Nurse':
    case 'Doctor':
    case 'Paramedic':
    case 'Therapist':
      opinion += budgetEffect('healthcare')
      break
    case 'Software Engineer':
    case 'Data Scientist':
    case 'Product Manager':
      opinion += budgetEffect('research')
      break
    default:
      break
  }

  // Unemployed citizens are especially welfare-sensitive.
  if (citizen.status === 'unemployed') opinion += budgetEffect('welfare')

  // Pollution makes everyone in dirty districts unhappy.
  if (district.stats.pollution > 60) opinion -= 0.5

  return { ...citizen, opinion: clamp01(opinion) }
}

// ---------------------------------------------------------------------------
// approvalFromCitizens — simple mean across the sample.
// ---------------------------------------------------------------------------

export function approvalFromCitizens(citizens: Citizen[]): number {
  if (citizens.length === 0) return 50
  let sum = 0
  for (const c of citizens) sum += c.opinion
  return clamp01(sum / citizens.length)
}

// ---------------------------------------------------------------------------
// pickFeaturedCitizens — return n diverse citizens for UI display.
// We bucket by status & leaning and round-robin pick from buckets for variety.
// ---------------------------------------------------------------------------

export function pickFeaturedCitizens(citizens: Citizen[], n: number): Citizen[] {
  if (n <= 0 || citizens.length === 0) return []
  if (citizens.length <= n) return [...citizens].sort((a, b) => a.id.localeCompare(b.id))

  // Stable ordering by id so the UI doesn't shuffle every render.
  const sorted = [...citizens].sort((a, b) => a.id.localeCompare(b.id))

  // Build buckets keyed by (status, leaning).
  const buckets = new Map<string, Citizen[]>()
  for (const c of sorted) {
    const key = `${c.status}|${c.political}`
    const list = buckets.get(key)
    if (list) list.push(c)
    else buckets.set(key, [c])
  }

  // Round-robin across buckets, then across age tertiles within each bucket.
  const bucketLists = Array.from(buckets.values()).map((list) => sortByAgeTertile(list))
  const picked: Citizen[] = []
  const cursors = bucketLists.map(() => 0)
  let exhausted = 0
  while (picked.length < n && exhausted < bucketLists.length) {
    exhausted = 0
    for (let i = 0; i < bucketLists.length && picked.length < n; i++) {
      const list = bucketLists[i]
      const cur = cursors[i]
      if (cur < list.length) {
        picked.push(list[cur])
        cursors[i] = cur + 1
      } else {
        exhausted++
      }
    }
  }
  return picked
}

function sortByAgeTertile(list: Citizen[]): Citizen[] {
  // Interleave young / middle / old so the first picks from a bucket are age-diverse.
  const young = list.filter((c) => c.age < 30).sort((a, b) => a.id.localeCompare(b.id))
  const middle = list.filter((c) => c.age >= 30 && c.age < 60).sort((a, b) => a.id.localeCompare(b.id))
  const old = list.filter((c) => c.age >= 60).sort((a, b) => a.id.localeCompare(b.id))
  const out: Citizen[] = []
  const maxLen = Math.max(young.length, middle.length, old.length)
  for (let i = 0; i < maxLen; i++) {
    if (i < young.length) out.push(young[i])
    if (i < middle.length) out.push(middle[i])
    if (i < old.length) out.push(old[i])
  }
  return out
}
