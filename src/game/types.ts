// ============================================================================
// MayorSim — Living City: Type Contract
// This file is the SINGLE SOURCE OF TRUTH for all data shapes across the
// simulation. Every module imports from here. Do not re-define these elsewhere.
// ============================================================================

// ============================================================================
// CORE CITY STATS — macro aggregates that summarize the whole city.
// ============================================================================

export interface CityStats {
  // Economy
  treasury: number       // $M (can go negative briefly before bankruptcy)
  gdpPerCapita: number   // $
  unemployment: number   // 0-100 (%)
  inflation: number      // -5 to 25 (%)
  debt: number           // $M
  creditRating: number   // 0-100 — affects borrowing cost

  // People
  population: number     // count
  education: number      // 0-100 average level
  health: number         // 0-100 average level
  happiness: number      // 0-100
  approval: number       // 0-100 — how much your city likes you

  // Society
  crime: number          // 0-100
  pollution: number      // 0-100
  innovation: number     // 0-100
  inequality: number     // 0-100 (Gini-like)
}

export type StatKey = keyof CityStats

// ============================================================================
// TAX + BUDGET — your direct levers each turn
// ============================================================================

export interface TaxPolicy {
  income: number     // 0-50 %
  sales: number      // 0-25 %
  property: number   // 0-10 %
  corporate: number  // 0-40 %
}

export type BudgetCategory =
  | 'education'
  | 'healthcare'
  | 'security'
  | 'infrastructure'
  | 'welfare'
  | 'research'
  | 'environment'

export type BudgetAllocation = Record<BudgetCategory, number>

// ============================================================================
// POLICIES — non-tax law levers
// ============================================================================

export type RentControl = 'none' | 'soft' | 'strict'
export type EmissionStandards = 'lax' | 'normal' | 'strict'
export type ImmigrationStance = 'restrictive' | 'open' | 'targeted'
export type DrugPolicy = 'punitive' | 'mixed' | 'lenient'
export type TransitPolicy = 'market' | 'subsidized' | 'free'
export type EducationPolicy = 'standard' | 'meritocratic' | 'universal'
export type HealthcarePolicy = 'private' | 'mixed' | 'universal'

export interface PolicyState {
  minimumWage: number           // $/hr, 0-50
  rentControl: RentControl
  emissionStandards: EmissionStandards
  immigration: ImmigrationStance
  drugPolicy: DrugPolicy
  transit: TransitPolicy
  education: EducationPolicy
  healthcare: HealthcarePolicy
}

// ============================================================================
// BUILDINGS — capacity infrastructure
// ============================================================================

export type BuildingType =
  | 'school'
  | 'hospital'
  | 'jail'
  | 'university'
  | 'powerPlant'
  | 'housing'
  | 'researchLab'
  | 'park'
  | 'transitHub'
  | 'industrialPark'      // boosts industry sector
  | 'financialCenter'     // boosts finance sector
  | 'culturalCenter'      // boosts happiness, tourism
  | 'fireStation'         // disaster resilience
  | 'wasteTreatment'      // pollution reducer
  | 'stadium'             // happiness, civic pride
  | 'library'             // education, equity

export interface Building {
  id: string
  type: BuildingType
  builtTurn: number
  variant?: string
  districtId?: string     // which district it's in
}

export interface BuildingDef {
  type: BuildingType
  name: string
  icon: string
  description: string
  educational: string
  cost: number            // $M upfront
  upkeep: number          // $M per turn
  buildTurns: number
  perTurnEffect: Partial<CityStats>
  onBuiltEffect?: Partial<CityStats>
  // Effects on the district where built (subset of stats)
  perTurnDistrictEffect?: Partial<DistrictStats>
  variants?: Array<{
    id: string
    name: string
    costDelta?: number
    upkeepDelta?: number
    perTurnEffect: Partial<CityStats>
    perTurnDistrictEffect?: Partial<DistrictStats>
  }>
}

// ============================================================================
// DISTRICTS — neighborhoods within the city
// Each district aggregates its own demographics, industry, attitude.
// City-wide stats are computed as weighted means over districts (mostly).
// ============================================================================

export type IndustryType =
  | 'industrial'
  | 'finance'
  | 'tech'
  | 'services'
  | 'agriculture'
  | 'residential'
  | 'tourism'
  | 'energy'
  | 'university'
  | 'mixed'

export type PoliticalLeaning = 'progressive' | 'centrist' | 'conservative'

export interface DistrictStats {
  population: number
  avgIncome: number       // $/year
  education: number       // 0-100
  crime: number           // 0-100
  pollution: number       // 0-100
  unrest: number          // 0-100 (protest/riot risk)
  approval: number        // 0-100 — district's view of mayor
  housing: number         // 0-100 housing availability/affordability
}

export interface District {
  id: string
  name: string
  primaryIndustry: IndustryType
  leaning: PoliticalLeaning
  flavor: string          // short text describing it
  stats: DistrictStats
}

// ============================================================================
// CITIZENS — representative sample of the population
// Each citizen has an opinion of the mayor that feeds into district approval.
// ============================================================================

export type EmploymentStatus =
  | 'employed'
  | 'unemployed'
  | 'student'
  | 'retired'
  | 'self-employed'
  | 'informal'

export interface Citizen {
  id: string
  name: string
  age: number
  districtId: string
  profession: string
  sectorId: string        // which economic sector they work in (or '' if none)
  income: number          // $/year
  education: number       // 0-100
  family: number          // family size including self
  status: EmploymentStatus
  opinion: number         // 0-100, their view of the mayor
  political: PoliticalLeaning
  storyLog: string[]      // life-event log (newest last)
  satisfaction: number    // 0-100 their personal life satisfaction
}

// ============================================================================
// FACTIONS — council members + lobbies + civic groups
// They have favor with you (-100..100) and influence (0..100).
// Their reactions to your decisions modify other systems.
// ============================================================================

export type FactionType = 'council' | 'lobby' | 'union' | 'civic' | 'business'

export interface Faction {
  id: string
  name: string
  type: FactionType
  description: string
  ideology: PoliticalLeaning
  favor: number           // -100..100, your standing with them
  power: number           // 0..100, how much they matter
  demand?: string         // current top demand (free text)
  // What they care about most — used to compute reactions
  caresAbout: Array<keyof CityStats | BudgetCategory>
}

// ============================================================================
// SECTORS — economic verticals
// Each sector has its own employment, output (% of GDP), growth rate.
// Sectors react to your policies, budget, buildings, and macro conditions.
// ============================================================================

export interface Sector {
  id: string
  name: string
  icon: string
  description: string
  share: number           // 0-100, % of city GDP
  growth: number          // % per quarter
  employment: number      // jobs (count)
  averageWage: number     // $/year
  // Stat / policy weights — what affects this sector
  responds: {
    education?: number
    research?: number
    infrastructure?: number
    pollution?: number
    corporateTax?: number  // negative coefficient typical
    energy?: number
    crime?: number
  }
  vulnerabilities: string[] // free text descriptions of shocks
}

// ============================================================================
// MACRO / EXTERNAL — forces beyond your control
// ============================================================================

export type GeopoliticalState = 'calm' | 'tense' | 'crisis'

export interface MacroState {
  nationalGdpGrowth: number   // %/year (modifies your gdp drift)
  nationalInflation: number   // %/year (anchors yours)
  federalFunding: number      // $M/quarter currently flowing
  geopolitical: GeopoliticalState
  techWave: number            // 0-100, current tech disruption level
  climateRisk: number         // 0-100
  consumerConfidence: number  // 0-100
  // Active named macro trends/cycles
  activeTrends: Array<{
    id: string
    name: string
    intensity: number         // 0-100
    turnsRemaining: number
    description: string
  }>
}

// ============================================================================
// MEDIA — news outlets with biases
// ============================================================================

export type MediaBias = 'left' | 'center' | 'right' | 'tabloid'

export interface NewsOutlet {
  id: string
  name: string
  bias: MediaBias
  influence: number       // 0-100
  favor: number           // -100..100, their view of mayor
  description: string
}

export interface NewsItem {
  turn: number
  outletId?: string
  headline: string
  body?: string
  tone: 'good' | 'bad' | 'neutral'
  // Stat-tags for the news (e.g. 'crime', 'inflation') — used for grouping
  tags?: string[]
}

// ============================================================================
// EVENTS — card decisions
// ============================================================================

export type EventCategory =
  | 'economic'
  | 'social'
  | 'environmental'
  | 'crisis'
  | 'opportunity'
  | 'political'
  | 'foreign'
  | 'tech'
  | 'health'

// Side-effects an event choice can have on non-stat systems
export interface EventSideEffects {
  factionFavor?: Record<string, number>   // factionId -> delta
  districtEffect?: { districtId?: string; effects: Partial<DistrictStats> }
  sectorEffect?: { sectorId: string; growth?: number; employmentDelta?: number }
  mediaFavor?: Record<string, number>     // outletId -> delta
  triggerEvent?: string                   // chain event id
  policyChange?: Partial<PolicyState>
  unlockAchievement?: string
}

export interface EventChoice {
  label: string
  cost?: number
  effects: Partial<CityStats>
  side?: EventSideEffects
  outcome: string
}

export interface GameEvent {
  id: string
  title: string
  description: string
  flavor?: string
  category: EventCategory
  weight: number
  choices: EventChoice[]
  // String key referenced by an optional condition fn in events module
  conditionKey?: string
  // Country bias multipliers (id -> multiplier). If absent, uses base weight.
  countryBias?: Record<string, number>
}

// ============================================================================
// CONSTRUCTION QUEUE
// ============================================================================

export interface QueuedBuild {
  id: string
  type: BuildingType
  variant?: string
  districtId?: string
  turnsLeft: number
  totalTurns: number
  cost: number
  upkeep: number
}

// ============================================================================
// HISTORY / LOG
// ============================================================================

export interface StatChange {
  stat: StatKey
  delta: number
  reason: string
}

export interface CausalNote {
  turn: number
  text: string
  category: 'economy' | 'social' | 'political' | 'environment' | 'tech' | 'crisis'
}

// ============================================================================
// COUNTRY PRESET
// ============================================================================

export interface Country {
  id: string
  name: string
  flag: string
  cityName: string
  description: string
  culturalNotes: string[]
  termLengthYears: number
  startingStats: CityStats
  startingTax: TaxPolicy
  startingBuildings: Partial<Record<BuildingType, number>>
  eventModifiers: Record<string, number>
  // District templates — names + industry mix that initGame will instantiate
  districtTemplates?: Array<{
    name: string
    industry: IndustryType
    leaning: PoliticalLeaning
    popShare: number          // 0-1 fraction of total population
    incomeMultiplier: number  // vs city avg
    crimeBias?: number        // delta
    pollutionBias?: number    // delta
    educationBias?: number    // delta
  }>
  // Sector mix for this country
  sectorMix?: Record<string, number>  // sectorId -> initial share
  // Starting macro
  startingMacro?: Partial<MacroState>
  startingPolicy?: Partial<PolicyState>
}

// ============================================================================
// GAME STATE — root state held in the Zustand store
// ============================================================================

export type GamePhase =
  | 'start'           // start screen
  | 'select'          // country select
  | 'plan'            // main dashboard, planning the turn
  | 'event'           // event card modal showing
  | 'resolving'       // turn animation
  | 'turnSummary'     // after-turn summary modal
  | 'gameOver'

export type GameOverReason =
  | 'recalled'
  | 'bankrupt'
  | 'termLimitWon'
  | 'termLimitLost'
  | 'civilUnrest'
  | 'pandemicCollapse'

export interface GameState {
  // Setup
  countryId: string
  cityName: string
  mayorName: string

  // Time
  turn: number
  termLengthYears: number
  termsServed: number

  // Core stats
  stats: CityStats

  // Policies / levers
  tax: TaxPolicy
  budget: BudgetAllocation
  policy: PolicyState

  // Infrastructure
  buildings: Building[]
  queuedBuilds: QueuedBuild[]

  // Living systems
  districts: District[]
  citizens: Citizen[]
  factions: Faction[]
  sectors: Sector[]
  outlets: NewsOutlet[]
  macro: MacroState

  // History
  lastTurnChanges: StatChange[]
  causalLog: CausalNote[]
  news: NewsItem[]

  // Events
  pendingEvent: GameEvent | null
  eventsSeenThisTurn: number
  recentEventIds: string[]   // to avoid repeats

  // Status
  gameOver: GameOverReason | null
  phase: GamePhase

  // Settings
  showExplanations: boolean

  // Approval rolling history for charts (last 24 quarters)
  approvalHistory: number[]
  gdpHistory: number[]
  inflationHistory: number[]
}

// ============================================================================
// HELPERS
// ============================================================================

export interface StatExplanation {
  label: string
  unit: string
  short: string
  long: string
}
