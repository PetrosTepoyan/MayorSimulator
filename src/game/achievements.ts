// ============================================================================
// MayorSim — Achievements
// Persistent badges that the player unlocks by hitting milestones or doing
// notable things. Each achievement has a pure `check(state)` predicate; the
// store is responsible for calling `checkNewAchievements` after each turn
// and persisting unlocked ids across runs.
// ============================================================================

import type { GameState, BuildingType, CityStats } from './types'

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export type AchievementCategory =
  | 'economic'
  | 'social'
  | 'political'
  | 'environment'
  | 'tech'
  | 'crisis'
  | 'meta'

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string // emoji
  category: AchievementCategory
  hidden?: boolean // shown as ??? until unlocked
  // Returns true if this state qualifies for the achievement
  check: (state: GameState) => boolean
  reward?: { approval?: number; treasury?: number }
}

// ----------------------------------------------------------------------------
// Local helpers — keep predicates O(1) where possible and reuse counting
// ----------------------------------------------------------------------------

/** Count buildings of a given type that have been built (not queued). */
function countBuildings(state: GameState, type: BuildingType): number {
  let n = 0
  for (const b of state.buildings) {
    if (b.type === type) n++
  }
  return n
}

/** Count distinct building types that have been built at least once. */
function distinctBuildingTypes(state: GameState): number {
  const seen = new Set<BuildingType>()
  for (const b of state.buildings) seen.add(b.type)
  return seen.size
}

/**
 * Number of unique BuildingType values in the type union. We can't enumerate
 * the union at runtime, so this list mirrors the BuildingType union in types.ts.
 * If a new building type is added there, update this list too.
 */
const ALL_BUILDING_TYPES: ReadonlyArray<BuildingType> = [
  'school',
  'hospital',
  'jail',
  'university',
  'powerPlant',
  'housing',
  'researchLab',
  'park',
  'transitHub',
  'industrialPark',
  'financialCenter',
  'culturalCenter',
  'fireStation',
  'wasteTreatment',
  'stadium',
  'library',
]

/** True if the player has at least one of every building type. */
function hasEveryBuildingType(state: GameState): boolean {
  const seen = new Set<BuildingType>()
  for (const b of state.buildings) seen.add(b.type)
  for (const t of ALL_BUILDING_TYPES) {
    if (!seen.has(t)) return false
  }
  return true
}

/** Returns true if any recent news item carries one of the given tags. */
function hasNewsTag(state: GameState, tags: string[]): boolean {
  for (const n of state.news) {
    if (!n.tags) continue
    for (const t of n.tags) {
      if (tags.includes(t)) return true
    }
  }
  return false
}

/** Average favor across factions of a given ideology. */
function minFactionFavor(state: GameState): number {
  if (state.factions.length === 0) return 0
  let m = Infinity
  for (const f of state.factions) {
    if (f.favor < m) m = f.favor
  }
  return m === Infinity ? 0 : m
}

/** Highest faction favor recorded. */
function maxFactionFavor(state: GameState): number {
  let m = -Infinity
  for (const f of state.factions) {
    if (f.favor > m) m = f.favor
  }
  return m === -Infinity ? 0 : m
}

/** Highest district approval (used for hyper-local wins). */
function maxDistrictApproval(state: GameState): number {
  let m = -Infinity
  for (const d of state.districts) {
    if (d.stats.approval > m) m = d.stats.approval
  }
  return m === -Infinity ? 0 : m
}

/** Lowest district unrest (used to confirm stability everywhere). */
function maxDistrictUnrest(state: GameState): number {
  let m = -Infinity
  for (const d of state.districts) {
    if (d.stats.unrest > m) m = d.stats.unrest
  }
  return m === -Infinity ? 0 : m
}

/** Highest media outlet favor. */
function maxOutletFavor(state: GameState): number {
  let m = -Infinity
  for (const o of state.outlets) {
    if (o.favor > m) m = o.favor
  }
  return m === -Infinity ? 0 : m
}

/** Approval rolling minimum over the recorded approval history. */
function minApprovalInHistory(state: GameState): number {
  if (state.approvalHistory.length === 0) return state.stats.approval
  let m = Infinity
  for (const a of state.approvalHistory) {
    if (a < m) m = a
  }
  return m
}

// ----------------------------------------------------------------------------
// The catalogue — at least 50 achievements, grouped by category
// ----------------------------------------------------------------------------

export const ACHIEVEMENTS: Achievement[] = [
  // -------- ECONOMIC (15+) -----------------------------------------------
  {
    id: 'first_million',
    name: 'First Million',
    description: 'Grow city treasury past $100M. A healthy reserve gives you policy flexibility.',
    icon: '💰',
    category: 'economic',
    check: (s) => s.stats.treasury > 100,
    reward: { approval: 1 },
  },
  {
    id: 'fat_coffers',
    name: 'Fat Coffers',
    description: 'Treasury crosses $500M — you have real fiscal muscle.',
    icon: '🏦',
    category: 'economic',
    check: (s) => s.stats.treasury > 500,
    reward: { approval: 2 },
  },
  {
    id: 'sovereign_wealth',
    name: 'Sovereign Wealth',
    description: 'Hit $1B in the treasury. Long-term reserves smooth shocks.',
    icon: '💎',
    category: 'economic',
    check: (s) => s.stats.treasury > 1000,
    reward: { approval: 4, treasury: 25 },
  },
  {
    id: 'debt_free',
    name: 'Debt Free',
    description: 'Pay off all municipal debt. Interest costs vanish from the budget.',
    icon: '🧾',
    category: 'economic',
    check: (s) => s.stats.debt <= 0 && s.turn > 4,
    reward: { approval: 4 },
  },
  {
    id: 'aaa_rating',
    name: 'Triple-A',
    description: 'Reach a 90+ credit rating — your bonds will be cheap to issue.',
    icon: '📈',
    category: 'economic',
    check: (s) => s.stats.creditRating >= 90,
    reward: { approval: 2 },
  },
  {
    id: 'low_unemployment',
    name: 'Full Employment',
    description: 'Reduce unemployment below 3% — but watch inflation!',
    icon: '💼',
    category: 'economic',
    check: (s) => s.stats.unemployment < 3,
    reward: { approval: 3 },
  },
  {
    id: 'sub_one_unemployment',
    name: 'Labor Tightrope',
    description: 'Push unemployment under 1.5%. Vacancies everywhere; wages soar.',
    icon: '🪢',
    category: 'economic',
    hidden: true,
    check: (s) => s.stats.unemployment < 1.5 && s.stats.inflation < 6,
    reward: { approval: 4 },
  },
  {
    id: 'tamed_inflation',
    name: 'Inflation Tamer',
    description: 'Keep inflation between 1.5% and 2.5% — the central-bank goldilocks zone.',
    icon: '📉',
    category: 'economic',
    check: (s) => s.stats.inflation >= 1.5 && s.stats.inflation <= 2.5 && s.turn > 6,
    reward: { approval: 2 },
  },
  {
    id: 'deflation_avoided',
    name: 'Above the Floor',
    description: 'Recover from deflation: reach 0%+ inflation after a sub-zero stretch.',
    icon: '🪜',
    category: 'economic',
    hidden: true,
    check: (s) => s.stats.inflation > 0 && s.inflationHistory.some((x) => x < 0),
    reward: { approval: 2 },
  },
  {
    id: 'high_gdp_per_capita',
    name: 'Affluent City',
    description: 'Reach $50,000 GDP per capita — broad-based prosperity.',
    icon: '💵',
    category: 'economic',
    check: (s) => s.stats.gdpPerCapita >= 50000,
    reward: { approval: 3 },
  },
  {
    id: 'rich_city',
    name: 'World City',
    description: 'Achieve $80,000 GDP per capita. Top-tier developed-economy territory.',
    icon: '🌆',
    category: 'economic',
    check: (s) => s.stats.gdpPerCapita >= 80000,
    reward: { approval: 5, treasury: 50 },
  },
  {
    id: 'balanced_books',
    name: 'Balanced Books',
    description: 'Run with debt under $50M and treasury over $200M at the same time.',
    icon: '⚖️',
    category: 'economic',
    check: (s) => s.stats.debt < 50 && s.stats.treasury > 200,
    reward: { approval: 2 },
  },
  {
    id: 'tax_cutter',
    name: 'Supply-Sider',
    description: 'Keep income tax under 15% and corporate tax under 18% with 75+ approval.',
    icon: '✂️',
    category: 'economic',
    check: (s) =>
      s.tax.income < 15 && s.tax.corporate < 18 && s.stats.approval >= 75,
    reward: { approval: 2 },
  },
  {
    id: 'progressive_pocketbook',
    name: 'Progressive Pocketbook',
    description: 'Run income tax 30%+ and corporate tax 25%+ without unemployment topping 8%.',
    icon: '🧮',
    category: 'economic',
    check: (s) =>
      s.tax.income >= 30 && s.tax.corporate >= 25 && s.stats.unemployment <= 8,
    reward: { approval: 2 },
  },
  {
    id: 'low_inequality',
    name: 'Egalitarian',
    description: 'Drop inequality below 25 — strong middle class, narrow income gaps.',
    icon: '🤝',
    category: 'economic',
    check: (s) => s.stats.inequality < 25,
    reward: { approval: 3 },
  },
  {
    id: 'megapolis',
    name: 'Megapolis',
    description: 'Grow the city population past 2 million residents.',
    icon: '🏙️',
    category: 'economic',
    check: (s) => s.stats.population >= 2_000_000,
    reward: { approval: 3 },
  },

  // -------- SOCIAL (12+) ------------------------------------------------
  {
    id: 'happy_city',
    name: 'Happy City',
    description: 'Push citywide happiness to 80+. Services, parks, and growth all help.',
    icon: '😊',
    category: 'social',
    check: (s) => s.stats.happiness >= 80,
    reward: { approval: 3 },
  },
  {
    id: 'utopian',
    name: 'Utopian Drift',
    description: 'Reach 90+ happiness — citizens write songs about you.',
    icon: '🌈',
    category: 'social',
    check: (s) => s.stats.happiness >= 90,
    reward: { approval: 5 },
  },
  {
    id: 'beloved_mayor',
    name: 'Beloved Mayor',
    description: 'Hold 80+ approval for at least 8 quarters in a row.',
    icon: '🏅',
    category: 'social',
    check: (s) => {
      const h = s.approvalHistory
      if (h.length < 8) return false
      for (let i = h.length - 8; i < h.length; i++) {
        if (h[i] < 80) return false
      }
      return true
    },
    reward: { approval: 4 },
  },
  {
    id: 'low_crime',
    name: 'Safe Streets',
    description: 'Drop crime below 20. Police, jobs, and education all contribute.',
    icon: '🛡️',
    category: 'social',
    check: (s) => s.stats.crime < 20,
    reward: { approval: 3 },
  },
  {
    id: 'minimal_crime',
    name: 'Civic Peace',
    description: 'Push crime under 10. Public order is now a civic identity.',
    icon: '🕊️',
    category: 'social',
    check: (s) => s.stats.crime < 10,
    reward: { approval: 4 },
  },
  {
    id: 'well_educated',
    name: 'Scholarly City',
    description: 'Average education at 75+. Knowledge compounds across generations.',
    icon: '🎓',
    category: 'social',
    check: (s) => s.stats.education >= 75,
    reward: { approval: 3 },
  },
  {
    id: 'top_education',
    name: 'Learning Capital',
    description: 'Push average education to 90+ — globally competitive talent base.',
    icon: '📚',
    category: 'social',
    check: (s) => s.stats.education >= 90,
    reward: { approval: 4 },
  },
  {
    id: 'healthy_city',
    name: 'Healthy City',
    description: 'Average health 80+. Preventive care and clean air pay off.',
    icon: '🩺',
    category: 'social',
    check: (s) => s.stats.health >= 80,
    reward: { approval: 3 },
  },
  {
    id: 'universal_services',
    name: 'Cradle to Career',
    description: 'Run universal healthcare AND universal education simultaneously.',
    icon: '🎒',
    category: 'social',
    check: (s) =>
      s.policy.healthcare === 'universal' && s.policy.education === 'universal',
    reward: { approval: 3 },
  },
  {
    id: 'safety_net',
    name: 'Safety Net',
    description: 'Universal healthcare, universal education, and free transit at once.',
    icon: '🛟',
    category: 'social',
    check: (s) =>
      s.policy.healthcare === 'universal' &&
      s.policy.education === 'universal' &&
      s.policy.transit === 'free',
    reward: { approval: 5, treasury: 20 },
  },
  {
    id: 'living_wage',
    name: 'Living Wage',
    description: 'Set the minimum wage to $20/hr or higher without unemployment going above 9%.',
    icon: '💲',
    category: 'social',
    check: (s) => s.policy.minimumWage >= 20 && s.stats.unemployment <= 9,
    reward: { approval: 2 },
  },
  {
    id: 'thriving_districts',
    name: 'Thriving Districts',
    description: 'Every district has approval above 60. Govern broadly, not just the center.',
    icon: '🗺️',
    category: 'social',
    check: (s) => s.districts.length > 0 && s.districts.every((d) => d.stats.approval >= 60),
    reward: { approval: 3 },
  },
  {
    id: 'no_unrest',
    name: 'Steady Hand',
    description: 'No district has unrest above 15. Stability everywhere, not just on average.',
    icon: '🧘',
    category: 'social',
    check: (s) => s.districts.length > 0 && maxDistrictUnrest(s) <= 15,
    reward: { approval: 2 },
  },
  {
    id: 'fan_favorite_district',
    name: 'Hometown Hero',
    description: 'Get any single district to 95+ approval — your political base is locked in.',
    icon: '🏘️',
    category: 'social',
    check: (s) => s.districts.length > 0 && maxDistrictApproval(s) >= 95,
    reward: { approval: 2 },
  },

  // -------- POLITICAL (10+) ---------------------------------------------
  {
    id: 'first_term_won',
    name: 'Re-Elected',
    description: 'Serve a second term. Voters gave you the benefit of the doubt.',
    icon: '🗳️',
    category: 'political',
    check: (s) => s.termsServed >= 2,
    reward: { approval: 2 },
  },
  {
    id: 'three_term_mayor',
    name: 'Veteran',
    description: 'Win three full terms. Experience compounds in governance.',
    icon: '🎖️',
    category: 'political',
    check: (s) => s.termsServed >= 3,
    reward: { approval: 3 },
  },
  {
    id: 'four_term_mayor',
    name: 'Institution',
    description: 'Serve four full terms — you ARE the local political system now.',
    icon: '🏛️',
    category: 'political',
    check: (s) => s.termsServed >= 4,
    reward: { approval: 2 },
  },
  {
    id: 'landslide',
    name: 'Landslide',
    description: 'Enter an election turn with approval above 80.',
    icon: '🌊',
    category: 'political',
    check: (s) => s.stats.approval >= 80 && s.termsServed >= 1,
    reward: { approval: 2 },
  },
  {
    id: 'coalition_builder',
    name: 'Coalition Builder',
    description: 'Have every faction at 30+ favor at once — broad governing alliance.',
    icon: '🤲',
    category: 'political',
    check: (s) => s.factions.length > 0 && minFactionFavor(s) >= 30,
    reward: { approval: 3 },
  },
  {
    id: 'kingmaker',
    name: 'Kingmaker',
    description: 'Get every faction to 80+ favor. The deepest political achievement.',
    icon: '👑',
    category: 'political',
    hidden: true,
    check: (s) => s.factions.length > 0 && minFactionFavor(s) >= 80,
    reward: { approval: 6, treasury: 30 },
  },
  {
    id: 'partisan_warrior',
    name: 'Partisan Warrior',
    description: 'Push one faction to 100 favor while another sits below -50.',
    icon: '⚔️',
    category: 'political',
    hidden: true,
    check: (s) => maxFactionFavor(s) >= 100 && minFactionFavor(s) <= -50,
    reward: { approval: 2 },
  },
  {
    id: 'media_darling',
    name: 'Media Darling',
    description: 'Get a news outlet to 80+ favor. Headlines that practically write themselves.',
    icon: '📰',
    category: 'political',
    check: (s) => maxOutletFavor(s) >= 80,
    reward: { approval: 2 },
  },
  {
    id: 'three_losses',
    name: 'Wilderness Years',
    description: 'Lose three elections back-to-back. A humbling political education.',
    icon: '🪦',
    category: 'political',
    hidden: true,
    check: (s) => s.gameOver === 'termLimitLost' && s.termsServed === 0 && s.turn >= 12,
  },
  {
    id: 'recalled',
    name: 'The Recall',
    description: 'Get recalled mid-term. The voters didn\'t wait for an election.',
    icon: '🚫',
    category: 'political',
    hidden: true,
    check: (s) => s.gameOver === 'recalled',
  },
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Dip below 25 approval at some point, then climb back to 70+.',
    icon: '🪃',
    category: 'political',
    hidden: true,
    check: (s) => minApprovalInHistory(s) < 25 && s.stats.approval >= 70,
    reward: { approval: 3 },
  },

  // -------- ENVIRONMENT (5+) --------------------------------------------
  {
    id: 'clean_air',
    name: 'Clean Air',
    description: 'Drop pollution below 30. Emission standards and parks compound here.',
    icon: '🍃',
    category: 'environment',
    check: (s) => s.stats.pollution < 30,
    reward: { approval: 2 },
  },
  {
    id: 'green_city',
    name: 'Green Mayor',
    description: 'Drop pollution below 20 while keeping GDP per capita above 30000.',
    icon: '🌿',
    category: 'environment',
    check: (s) => s.stats.pollution < 20 && s.stats.gdpPerCapita > 30000,
    reward: { approval: 5 },
  },
  {
    id: 'park_paradise',
    name: 'Park Paradise',
    description: 'Build five parks. Green space lifts happiness and health.',
    icon: '🌳',
    category: 'environment',
    check: (s) => countBuildings(s, 'park') >= 5,
    reward: { approval: 2 },
  },
  {
    id: 'waste_warrior',
    name: 'Waste Warrior',
    description: 'Build three waste treatment plants — the dull infrastructure that lowers pollution.',
    icon: '♻️',
    category: 'environment',
    check: (s) => countBuildings(s, 'wasteTreatment') >= 3,
    reward: { approval: 2 },
  },
  {
    id: 'strict_emissions',
    name: 'Strict Emissions',
    description: 'Adopt strict emission standards and keep them while pollution falls under 25.',
    icon: '🏭',
    category: 'environment',
    check: (s) => s.policy.emissionStandards === 'strict' && s.stats.pollution < 25,
    reward: { approval: 2 },
  },
  {
    id: 'energy_transition',
    name: 'Energy Transition',
    description: 'Run two power plants AND keep pollution under 30 — proof of clean variants.',
    icon: '⚡',
    category: 'environment',
    check: (s) => countBuildings(s, 'powerPlant') >= 2 && s.stats.pollution < 30,
    reward: { approval: 3 },
  },

  // -------- TECH (5+) ---------------------------------------------------
  {
    id: 'innovation_hub',
    name: 'Innovation Hub',
    description: 'Push innovation above 75. Education + research + tech sector compound.',
    icon: '💡',
    category: 'tech',
    check: (s) => s.stats.innovation >= 75,
    reward: { approval: 3 },
  },
  {
    id: 'silicon_valley',
    name: 'Silicon Mayor',
    description: 'Reach 90+ innovation while education is 80+ — top-tier knowledge economy.',
    icon: '🧠',
    category: 'tech',
    check: (s) => s.stats.innovation >= 90 && s.stats.education >= 80,
    reward: { approval: 5, treasury: 30 },
  },
  {
    id: 'university_town',
    name: 'University Town',
    description: 'Build three universities. The pipeline of skilled labor is now yours.',
    icon: '🏫',
    category: 'tech',
    check: (s) => countBuildings(s, 'university') >= 3,
    reward: { approval: 2 },
  },
  {
    id: 'five_universities',
    name: 'Ivy Cluster',
    description: 'Build five universities. A national research hub.',
    icon: '🎓',
    category: 'tech',
    check: (s) => countBuildings(s, 'university') >= 5,
    reward: { approval: 4 },
  },
  {
    id: 'lab_coats',
    name: 'Lab Coats',
    description: 'Build three research labs. Where breakthroughs incubate.',
    icon: '🧪',
    category: 'tech',
    check: (s) => countBuildings(s, 'researchLab') >= 3,
    reward: { approval: 2 },
  },
  {
    id: 'research_boost',
    name: 'R&D Budget',
    description: 'Allocate at least 15% of the budget to research while innovation rises above 70.',
    icon: '🔬',
    category: 'tech',
    check: (s) => s.budget.research >= 15 && s.stats.innovation >= 70,
    reward: { approval: 2 },
  },

  // -------- CRISIS (5+) -------------------------------------------------
  {
    id: 'pandemic_survivor',
    name: 'Pandemic Survivor',
    description: 'Live through a pandemic event with average health still above 60.',
    icon: '🦠',
    category: 'crisis',
    hidden: true,
    check: (s) => hasNewsTag(s, ['pandemic', 'epidemic', 'outbreak']) && s.stats.health > 60,
    reward: { approval: 4 },
  },
  {
    id: 'hurricane_hero',
    name: 'Hurricane Hero',
    description: 'Survive a hurricane or major storm event while keeping happiness above 50.',
    icon: '🌀',
    category: 'crisis',
    hidden: true,
    check: (s) => hasNewsTag(s, ['hurricane', 'storm', 'flood']) && s.stats.happiness > 50,
    reward: { approval: 3 },
  },
  {
    id: 'fiscal_firefighter',
    name: 'Fiscal Firefighter',
    description: 'Survive a financial crisis event and keep treasury positive afterward.',
    icon: '🧯',
    category: 'crisis',
    hidden: true,
    check: (s) => hasNewsTag(s, ['recession', 'financialCrisis', 'crash']) && s.stats.treasury > 0,
    reward: { approval: 3 },
  },
  {
    id: 'riot_resolved',
    name: 'Calmed the Streets',
    description: 'Defuse a riot or major unrest event and bring crime back below 30 afterward.',
    icon: '🚓',
    category: 'crisis',
    hidden: true,
    check: (s) => hasNewsTag(s, ['riot', 'unrest', 'protest']) && s.stats.crime < 30,
    reward: { approval: 3 },
  },
  {
    id: 'climate_resilient',
    name: 'Climate Resilient',
    description: 'Climate risk peaks above 70 but you keep approval above 55 the whole time.',
    icon: '🌡️',
    category: 'crisis',
    hidden: true,
    check: (s) => s.macro.climateRisk >= 70 && s.stats.approval >= 55,
    reward: { approval: 3 },
  },
  {
    id: 'geopolitical_steady',
    name: 'Steady in the Storm',
    description: 'Hold approval above 60 during a "crisis" geopolitical state.',
    icon: '🌐',
    category: 'crisis',
    hidden: true,
    check: (s) => s.macro.geopolitical === 'crisis' && s.stats.approval >= 60,
    reward: { approval: 2 },
  },

  // -------- BUILD-COMPLETION ACHIEVEMENTS (slot into economic/tech) -----
  {
    id: 'builders_complete',
    name: 'Master Planner',
    description: 'Build at least one of every building type. Diversity hardens the city.',
    icon: '🏗️',
    category: 'tech',
    check: hasEveryBuildingType,
    reward: { approval: 5, treasury: 50 },
  },
  {
    id: 'transit_oriented',
    name: 'Transit-Oriented',
    description: 'Build two transit hubs AND run free transit policy.',
    icon: '🚇',
    category: 'environment',
    check: (s) => countBuildings(s, 'transitHub') >= 2 && s.policy.transit === 'free',
    reward: { approval: 3 },
  },
  {
    id: 'culture_capital',
    name: 'Culture Capital',
    description: 'Build a cultural center, a library, and a stadium — civic life beyond commerce.',
    icon: '🎭',
    category: 'social',
    check: (s) =>
      countBuildings(s, 'culturalCenter') >= 1 &&
      countBuildings(s, 'library') >= 1 &&
      countBuildings(s, 'stadium') >= 1,
    reward: { approval: 3 },
  },

  // -------- COUNTRY-SPECIFIC (one per country) --------------------------
  {
    id: 'atlantica_revival',
    name: 'Atlantica Revival',
    description: 'In Atlantica: lift Port Liberty\'s GDP per capita past $70,000 with crime under 25.',
    icon: '🗽',
    category: 'economic',
    check: (s) =>
      s.countryId === 'atlantica' && s.stats.gdpPerCapita >= 70000 && s.stats.crime < 25,
    reward: { approval: 4 },
  },
  {
    id: 'nordfjord_balance',
    name: 'Nordic Model',
    description: 'In Nordfjord: hit 85+ happiness with inequality under 20.',
    icon: '🛷',
    category: 'social',
    check: (s) =>
      s.countryId === 'nordfjord' && s.stats.happiness >= 85 && s.stats.inequality < 20,
    reward: { approval: 4 },
  },
  {
    id: 'eastoria_transition',
    name: 'Post-Industrial Pivot',
    description: 'In Eastoria: push innovation to 70+ while keeping unemployment under 6%.',
    icon: '⚙️',
    category: 'tech',
    check: (s) =>
      s.countryId === 'eastoria' && s.stats.innovation >= 70 && s.stats.unemployment < 6,
    reward: { approval: 4 },
  },
  {
    id: 'costaverde_green',
    name: 'Costa Verde Verdant',
    description: 'In Costa Verde: pollution under 20 and happiness above 75 — eco-tourism dream.',
    icon: '🌴',
    category: 'environment',
    check: (s) =>
      s.countryId === 'costaverde' && s.stats.pollution < 20 && s.stats.happiness >= 75,
    reward: { approval: 4 },
  },
  {
    id: 'pacifica_export',
    name: 'Pacifica Export Engine',
    description: 'In Pacifica: GDP per capita 60000+ with treasury above $400M.',
    icon: '🏯',
    category: 'economic',
    check: (s) =>
      s.countryId === 'pacifica' && s.stats.gdpPerCapita >= 60000 && s.stats.treasury > 400,
    reward: { approval: 4 },
  },
  {
    id: 'sahel_renaissance',
    name: 'Tamberen Renaissance',
    description: 'In Sahel: lift Tamberen\'s GDP per capita past $20,000 with education above 65.',
    icon: '🌾',
    category: 'economic',
    check: (s) =>
      s.countryId === 'sahel' && s.stats.gdpPerCapita >= 20000 && s.stats.education >= 65,
    reward: { approval: 5, treasury: 30 },
  },

  // -------- COMBO / SPEEDRUN ACHIEVEMENTS -------------------------------
  {
    id: 'speed_prosperity',
    name: 'Fast Start',
    description: 'Reach 70+ approval within the first 8 turns.',
    icon: '⏱️',
    category: 'political',
    check: (s) => s.turn <= 8 && s.stats.approval >= 70 && s.turn >= 1,
    reward: { approval: 2 },
  },
  {
    id: 'speed_treasury',
    name: 'Quick Profits',
    description: 'Cross $300M treasury within the first 12 turns.',
    icon: '🏁',
    category: 'economic',
    check: (s) => s.turn <= 12 && s.stats.treasury > 300,
    reward: { approval: 2 },
  },
  {
    id: 'triple_high',
    name: 'Triple Threat',
    description: 'Health, education, and happiness all above 75 simultaneously.',
    icon: '🎯',
    category: 'social',
    check: (s) => s.stats.health >= 75 && s.stats.education >= 75 && s.stats.happiness >= 75,
    reward: { approval: 4 },
  },
  {
    id: 'low_everything_bad',
    name: 'Clean Sweep',
    description: 'Crime, pollution, AND inequality all below 25 at once.',
    icon: '🧹',
    category: 'social',
    check: (s) => s.stats.crime < 25 && s.stats.pollution < 25 && s.stats.inequality < 25,
    reward: { approval: 5, treasury: 25 },
  },

  // -------- META (5+) — counters tracked externally by the store --------
  {
    id: 'meta_first_game',
    name: 'First Steps',
    description: 'Finish your first mayoral game — win, lose, or get recalled.',
    icon: '👶',
    category: 'meta',
    check: (s) => s.gameOver !== null,
  },
  {
    id: 'meta_first_win',
    name: 'A True Mayor',
    description: 'Finish a game by completing a full term (not recalled or bankrupt).',
    icon: '🏆',
    category: 'meta',
    check: (s) => s.gameOver === 'termLimitWon',
    reward: { approval: 2 },
  },
  {
    id: 'meta_bankruptcy',
    name: 'In the Red',
    description: 'Go bankrupt at least once — every politician should feel a budget hole.',
    icon: '💸',
    category: 'meta',
    hidden: true,
    check: (s) => s.gameOver === 'bankrupt',
  },
  {
    id: 'meta_civil_unrest_loss',
    name: 'The People Spoke',
    description: 'Lose a game to civil unrest. A reminder that legitimacy is fragile.',
    icon: '🪧',
    category: 'meta',
    hidden: true,
    check: (s) => s.gameOver === 'civilUnrest',
  },
  {
    id: 'meta_pandemic_collapse',
    name: 'Public Health Failure',
    description: 'Lose a game to pandemic collapse. Health systems require redundancy.',
    icon: '🏥',
    category: 'meta',
    hidden: true,
    check: (s) => s.gameOver === 'pandemicCollapse',
  },
  {
    id: 'meta_long_run',
    name: 'Long Run',
    description: 'Reach turn 60 in a single game. Patience pays off in city politics.',
    icon: '🛤️',
    category: 'meta',
    check: (s) => s.turn >= 60,
    reward: { approval: 2 },
  },
  {
    id: 'meta_news_chronicle',
    name: 'Chronicled',
    description: 'Accumulate 100 news items in your log. The city remembers everything.',
    icon: '📜',
    category: 'meta',
    check: (s) => s.news.length >= 100,
  },
]

// ----------------------------------------------------------------------------
// Functions exposed to the store
// ----------------------------------------------------------------------------

/**
 * Check for newly-unlocked achievements given current state and a set of
 * already-unlocked ids. Pure function — does not mutate inputs.
 */
export function checkNewAchievements(
  state: GameState,
  alreadyUnlocked: string[],
): { newlyUnlocked: Achievement[]; allUnlocked: string[] } {
  const already = new Set(alreadyUnlocked)
  const newlyUnlocked: Achievement[] = []
  for (const a of ACHIEVEMENTS) {
    if (already.has(a.id)) continue
    try {
      if (a.check(state)) {
        newlyUnlocked.push(a)
        already.add(a.id)
      }
    } catch {
      // A malformed check should never block other achievements
    }
  }
  return {
    newlyUnlocked,
    allUnlocked: Array.from(already),
  }
}

/** Look up an achievement definition by its id. */
export function getAchievement(id: string): Achievement | undefined {
  for (const a of ACHIEVEMENTS) {
    if (a.id === id) return a
  }
  return undefined
}

/**
 * Group unlocked achievements by category. The result always contains every
 * category key, even if the corresponding array is empty — convenient for UIs.
 */
export function unlockedByCategory(
  unlockedIds: string[],
): Record<AchievementCategory, Achievement[]> {
  const out: Record<AchievementCategory, Achievement[]> = {
    economic: [],
    social: [],
    political: [],
    environment: [],
    tech: [],
    crisis: [],
    meta: [],
  }
  const unlocked = new Set(unlockedIds)
  for (const a of ACHIEVEMENTS) {
    if (unlocked.has(a.id)) {
      out[a.category].push(a)
    }
  }
  return out
}

// Re-export CityStats so consumers that import from this module for badge UIs
// don't need a second import path. Intentional — keeps callers tidy.
export type { CityStats }
