import { create } from 'zustand'
import type {
  BudgetAllocation,
  Building,
  BuildingType,
  GamePhase,
  GameState,
  PolicyState,
  TaxPolicy,
  GameEvent,
  EventChoice,
  StatChange,
} from '../game/types'
import { saveGame, loadGame as loadGameStorage, clearSave } from '../game/saveLoad'

// ============================================================================
// Store actions API — what the UI calls
// ============================================================================

export interface GameStoreActions {
  // Lifecycle
  startNewGame: (countryId: string, mayorName: string) => void
  loadSavedGame: () => Promise<boolean>
  saveCurrentGame: () => Promise<void>
  resetGame: () => Promise<void>

  // Navigation between screens / phases
  setPhase: (phase: GamePhase) => void

  // Policy levers (merges partial updates)
  setTax: (tax: Partial<TaxPolicy>) => void
  setBudget: (budget: Partial<BudgetAllocation>) => void
  setPolicy: (policy: Partial<PolicyState>) => void

  // Construction
  queueBuild: (type: BuildingType, variant?: string, districtId?: string) => boolean
  cancelQueuedBuild: (id: string) => void

  // Events
  chooseEventOption: (choiceIndex: number) => void
  triggerEvent: (eventId: string) => void

  // Turn resolution
  endTurn: () => void
  dismissTurnSummary: () => void

  // Settings
  setShowExplanations: (b: boolean) => void
}

export interface GameStore extends GameState, GameStoreActions {
  // Internal: tracks whether a game is in progress
  initialized: boolean
}

// ============================================================================
// Initial empty state used before a game starts
// ============================================================================

const EMPTY_STATE: GameState = {
  countryId: '',
  cityName: '',
  mayorName: '',
  turn: 0,
  termLengthYears: 4,
  termsServed: 0,
  stats: {
    treasury: 0, gdpPerCapita: 0, unemployment: 0, inflation: 0,
    debt: 0, creditRating: 0, population: 0, education: 0,
    health: 0, happiness: 0, approval: 0, crime: 0,
    pollution: 0, innovation: 0, inequality: 0,
  },
  tax: { income: 20, sales: 8, property: 1, corporate: 22 },
  budget: {
    education: 18, healthcare: 16, security: 14, infrastructure: 16,
    welfare: 14, research: 10, environment: 12,
  },
  policy: {
    minimumWage: 12, rentControl: 'none', emissionStandards: 'normal',
    immigration: 'targeted', drugPolicy: 'mixed', transit: 'subsidized',
    education: 'standard', healthcare: 'mixed',
  },
  buildings: [],
  queuedBuilds: [],
  districts: [],
  citizens: [],
  factions: [],
  sectors: [],
  outlets: [],
  macro: {
    nationalGdpGrowth: 2, nationalInflation: 2.5, federalFunding: 5,
    geopolitical: 'calm', techWave: 50, climateRisk: 40,
    consumerConfidence: 60, activeTrends: [],
  },
  lastTurnChanges: [],
  causalLog: [],
  news: [],
  pendingEvent: null,
  eventsSeenThisTurn: 0,
  recentEventIds: [],
  gameOver: null,
  phase: 'start',
  showExplanations: true,
  approvalHistory: [],
  gdpHistory: [],
  inflationHistory: [],
}

// ============================================================================
// Store implementation — actions delegate to integrationLayer
// where the cross-module orchestration lives.
// ============================================================================

import { initGame } from '../game/initGame'
import { resolveTurn } from '../game/resolveTurn'
import { applyEventChoice, drawEvent } from '../game/resolveTurn'
import { ALL_BUILDINGS } from '../game/allBuildings'
import { uid } from '../game/util'

export const useGameStore = create<GameStore>((set, get) => ({
  ...EMPTY_STATE,
  initialized: false,

  startNewGame: (countryId, mayorName) => {
    const fresh = initGame(countryId, mayorName)
    set({ ...fresh, initialized: true, phase: 'plan' })
  },

  loadSavedGame: async () => {
    const loaded = await loadGameStorage()
    if (!loaded) return false
    set({ ...loaded, initialized: true })
    return true
  },

  saveCurrentGame: async () => {
    const state = get()
    if (!state.initialized) return
    // Extract serializable GameState fields, excluding store actions + flags
    const serializable: GameState = {
      countryId: state.countryId,
      cityName: state.cityName,
      mayorName: state.mayorName,
      turn: state.turn,
      termLengthYears: state.termLengthYears,
      termsServed: state.termsServed,
      stats: state.stats,
      tax: state.tax,
      budget: state.budget,
      policy: state.policy,
      buildings: state.buildings,
      queuedBuilds: state.queuedBuilds,
      districts: state.districts,
      citizens: state.citizens,
      factions: state.factions,
      sectors: state.sectors,
      outlets: state.outlets,
      macro: state.macro,
      lastTurnChanges: state.lastTurnChanges,
      causalLog: state.causalLog,
      news: state.news,
      pendingEvent: state.pendingEvent,
      eventsSeenThisTurn: state.eventsSeenThisTurn,
      recentEventIds: state.recentEventIds,
      gameOver: state.gameOver,
      phase: state.phase,
      showExplanations: state.showExplanations,
      approvalHistory: state.approvalHistory,
      gdpHistory: state.gdpHistory,
      inflationHistory: state.inflationHistory,
    }
    await saveGame(serializable)
  },

  resetGame: async () => {
    await clearSave()
    set({ ...EMPTY_STATE, initialized: false, phase: 'start' })
  },

  setPhase: (phase) => set({ phase }),

  setTax: (tax) => set((s) => ({ tax: { ...s.tax, ...tax } })),

  setBudget: (delta) => {
    set((s) => {
      const next = { ...s.budget, ...delta }
      // Renormalize so the sum stays at 100
      const sum = Object.values(next).reduce((a, b) => a + b, 0)
      if (sum > 0 && Math.abs(sum - 100) > 0.1) {
        const scale = 100 / sum
        for (const k of Object.keys(next) as Array<keyof BudgetAllocation>) {
          next[k] = Math.round((next[k] * scale) * 10) / 10
        }
      }
      return { budget: next }
    })
  },

  setPolicy: (delta) => set((s) => ({ policy: { ...s.policy, ...delta } })),

  queueBuild: (type, variant, districtId) => {
    const state = get()
    const def = ALL_BUILDINGS[type]
    if (!def) return false

    let cost = def.cost
    let upkeep = def.upkeep
    let buildTurns = def.buildTurns
    if (variant && def.variants) {
      const v = def.variants.find((x) => x.id === variant)
      if (v) {
        cost += v.costDelta ?? 0
        upkeep += v.upkeepDelta ?? 0
      }
    }
    if (state.stats.treasury < cost) return false

    const q = {
      id: uid('build'),
      type,
      variant,
      districtId,
      turnsLeft: buildTurns,
      totalTurns: buildTurns,
      cost,
      upkeep,
    }
    set((s) => ({
      stats: { ...s.stats, treasury: s.stats.treasury - cost },
      queuedBuilds: [...s.queuedBuilds, q],
    }))
    return true
  },

  cancelQueuedBuild: (id) => {
    const state = get()
    const q = state.queuedBuilds.find((x) => x.id === id)
    if (!q) return
    // Refund 70% of cost
    const refund = Math.round(q.cost * 0.7)
    set((s) => ({
      stats: { ...s.stats, treasury: s.stats.treasury + refund },
      queuedBuilds: s.queuedBuilds.filter((x) => x.id !== id),
    }))
  },

  chooseEventOption: (choiceIndex) => {
    const state = get()
    if (!state.pendingEvent) return
    const choice = state.pendingEvent.choices[choiceIndex]
    if (!choice) return
    const next = applyEventChoice(state, state.pendingEvent, choice)
    set({ ...next, pendingEvent: null, eventsSeenThisTurn: state.eventsSeenThisTurn + 1, phase: 'plan' })
  },

  triggerEvent: (eventId) => {
    const event = drawEvent(get(), eventId)
    if (!event) return
    set({ pendingEvent: event, phase: 'event' })
  },

  endTurn: () => {
    const state = get()
    if (state.gameOver) return
    const next = resolveTurn(state)
    set({ ...next, phase: next.gameOver ? 'gameOver' : (next.pendingEvent ? 'event' : 'turnSummary') })
  },

  dismissTurnSummary: () => {
    const state = get()
    set({ phase: state.pendingEvent ? 'event' : 'plan' })
  },

  setShowExplanations: (b) => set({ showExplanations: b }),
}))

// ============================================================================
// Convenient selector hooks
// ============================================================================
export const useStats = () => useGameStore((s) => s.stats)
export const useTax = () => useGameStore((s) => s.tax)
export const useBudget = () => useGameStore((s) => s.budget)
export const usePolicy = () => useGameStore((s) => s.policy)
export const useDistricts = () => useGameStore((s) => s.districts)
export const useCitizens = () => useGameStore((s) => s.citizens)
export const useFactions = () => useGameStore((s) => s.factions)
export const useSectors = () => useGameStore((s) => s.sectors)
export const useOutlets = () => useGameStore((s) => s.outlets)
export const useMacro = () => useGameStore((s) => s.macro)
export const useNews = () => useGameStore((s) => s.news)
export const useBuildings = () => useGameStore((s) => s.buildings)
export const useQueuedBuilds = () => useGameStore((s) => s.queuedBuilds)
export const usePhase = () => useGameStore((s) => s.phase)
export const usePendingEvent = () => useGameStore((s) => s.pendingEvent)
export const useTurn = () => useGameStore((s) => s.turn)
export const useGameOver = () => useGameStore((s) => s.gameOver)
export const useShowExplanations = () => useGameStore((s) => s.showExplanations)
