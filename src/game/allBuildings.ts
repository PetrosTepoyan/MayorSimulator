// Unified building registry — merges the core and extended sets.
// Consumers should always import from here, not from buildings.ts directly.

import { BUILDINGS } from './buildings'
import { BUILDINGS_EXTENDED } from './buildingsExtended'
import type { BuildingDef, BuildingType } from './types'

export const ALL_BUILDINGS: Partial<Record<BuildingType, BuildingDef>> = {
  ...BUILDINGS,
  ...BUILDINGS_EXTENDED,
} as Partial<Record<BuildingType, BuildingDef>>

export const ALL_BUILDING_LIST: BuildingDef[] = Object.values(ALL_BUILDINGS).filter(
  (b): b is BuildingDef => b !== undefined,
)

export function getBuildingDef(type: BuildingType): BuildingDef | undefined {
  return ALL_BUILDINGS[type]
}
