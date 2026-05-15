// ============================================================================
// MayorSim — Save / Load
// AsyncStorage-backed persistence for game state and user settings.
// All calls are wrapped in try/catch; errors are logged but never thrown.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { GameState } from './types'

export const SAVE_KEY = '@mayorsim/save/v1'
export const SETTINGS_KEY = '@mayorsim/settings/v1'

export interface Settings {
  showExplanations: boolean
  sfxEnabled: boolean
  hapticsEnabled: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  showExplanations: true,
  sfxEnabled: true,
  hapticsEnabled: true,
}

// Persist the full game state as JSON.
export async function saveGame(state: GameState): Promise<void> {
  try {
    await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch (err) {
    console.warn('[saveLoad] saveGame failed:', err)
  }
}

// Load the saved game state, or null if none / on error.
export async function loadGame(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(SAVE_KEY)
    if (raw == null) return null
    return JSON.parse(raw) as GameState
  } catch (err) {
    console.warn('[saveLoad] loadGame failed:', err)
    return null
  }
}

// Remove any persisted save (safe to call when nothing is stored).
export async function clearSave(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SAVE_KEY)
  } catch (err) {
    console.warn('[saveLoad] clearSave failed:', err)
  }
}

// True if a save currently exists in storage.
export async function hasSave(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SAVE_KEY)
    return raw != null
  } catch (err) {
    console.warn('[saveLoad] hasSave failed:', err)
    return false
  }
}

// Load settings, merging with defaults so new fields are populated.
export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY)
    if (raw == null) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<Settings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch (err) {
    console.warn('[saveLoad] loadSettings failed:', err)
    return { ...DEFAULT_SETTINGS }
  }
}

// Persist user settings as JSON.
export async function saveSettings(s: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch (err) {
    console.warn('[saveLoad] saveSettings failed:', err)
  }
}
