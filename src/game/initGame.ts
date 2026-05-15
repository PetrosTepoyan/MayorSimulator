// Initialize a fresh GameState from a country preset.
// Pulls in all subsystem initializers and assembles the world.

import type { GameState, CityStats, TaxPolicy, BudgetAllocation, PolicyState, Building, BuildingType } from './types'
import { getCountry } from './countries'
import { generateDistricts } from './districts'
import { generateCitizens } from './citizens'
import { generateFactions } from './factions'
import { generateSectors } from './sectors'
import { generateMacroState } from './macro'
import { generateOutlets } from './media'

const DEFAULT_BUDGET: BudgetAllocation = {
  education: 18,
  healthcare: 16,
  security: 14,
  infrastructure: 16,
  welfare: 14,
  research: 10,
  environment: 12,
}

const DEFAULT_POLICY: PolicyState = {
  minimumWage: 12,
  rentControl: 'none',
  emissionStandards: 'normal',
  immigration: 'targeted',
  drugPolicy: 'mixed',
  transit: 'subsidized',
  education: 'standard',
  healthcare: 'mixed',
}

export function initGame(countryId: string, mayorName: string): GameState {
  const country = getCountry(countryId)

  // Hydrate the city stats from country starting values (deep clone to avoid shared refs)
  const stats: CityStats = { ...country.startingStats }
  const tax: TaxPolicy = { ...country.startingTax }
  const policy: PolicyState = { ...DEFAULT_POLICY, ...(country.startingPolicy ?? {}) }
  const budget: BudgetAllocation = { ...DEFAULT_BUDGET }

  // Generate districts based on country templates
  const districts = generateDistricts(country)

  // Generate sectors based on country mix
  const sectors = generateSectors(country)

  // Generate citizens populated across districts
  const citizens = generateCitizens(districts, sectors, country, 150)

  // Council members + lobbies for this city
  const factions = generateFactions(country, districts)

  // 4 media outlets
  const outlets = generateOutlets(country)

  // Macro state with country-flavored trends
  const macro = generateMacroState(country)

  // Initial buildings from country.startingBuildings (existing infrastructure)
  const buildings = expandStartingBuildings(country.startingBuildings)

  const state: GameState = {
    countryId,
    cityName: country.cityName,
    mayorName: mayorName.trim() || 'Mayor',
    turn: 0,
    termLengthYears: country.termLengthYears,
    termsServed: 0,
    stats,
    tax,
    budget,
    policy,
    buildings,
    queuedBuilds: [],
    districts,
    citizens,
    factions,
    sectors,
    outlets,
    macro,
    lastTurnChanges: [],
    causalLog: [],
    news: [
      {
        turn: 0,
        headline: `${mayorName} sworn in as Mayor of ${country.cityName}`,
        tone: 'good',
        tags: ['inauguration'],
      },
    ],
    pendingEvent: null,
    eventsSeenThisTurn: 0,
    recentEventIds: [],
    gameOver: null,
    phase: 'plan',
    showExplanations: true,
    approvalHistory: [stats.approval],
    gdpHistory: [stats.gdpPerCapita],
    inflationHistory: [stats.inflation],
  }

  return state
}

// Helper: turn `{ school: 8, hospital: 4 }` into an array of Building records
function expandStartingBuildings(
  startingBuildings: Partial<Record<BuildingType, number>>,
): Building[] {
  const out: Building[] = []
  let counter = 0
  for (const key of Object.keys(startingBuildings) as BuildingType[]) {
    const count = startingBuildings[key] ?? 0
    for (let i = 0; i < count; i++) {
      out.push({
        id: `seed_${key}_${counter++}`,
        type: key,
        builtTurn: -1,
      })
    }
  }
  return out
}
