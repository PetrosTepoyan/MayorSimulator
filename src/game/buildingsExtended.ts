import type { BuildingDef } from './types'

// Extended building set — sector-focused, resilience, and quality-of-life
// infrastructure that rounds out the base build menu.
//
// Conventions (same as buildings.ts):
// - cost: upfront $M
// - upkeep: $M per turn
// - buildTurns: quarters of construction
// - perTurnEffect: stat deltas applied each operating turn
// - onBuiltEffect: one-shot effects on completion
// - perTurnDistrictEffect: local district stat deltas while operating
// - educational: tooltip text explaining the real-world mechanism

export const BUILDINGS_EXTENDED: Record<string, BuildingDef> = {
  industrialPark: {
    type: 'industrialPark',
    name: 'Industrial Park',
    icon: '🏭',
    description:
      'Zoning + infrastructure for manufacturing. Boosts industrial sector and employment.',
    educational:
      'Industrial parks concentrate manufacturing where roads, power, and waste systems can support it. They boost employment in middle-wage sectors but raise local pollution.',
    cost: 50,
    upkeep: 1.5,
    buildTurns: 3,
    perTurnEffect: { gdpPerCapita: 90, unemployment: -0.15, pollution: 0.5 },
    onBuiltEffect: { approval: 1 },
    perTurnDistrictEffect: { crime: 0.1, pollution: 0.5 },
  },
  financialCenter: {
    type: 'financialCenter',
    name: 'Financial Center',
    icon: '🏦',
    description:
      'Office tower for finance firms. Drives finance sector growth and high-wage jobs.',
    educational:
      'Financial districts cluster capital, expertise, and amenities together. They drive GDP per capita up but accentuate inequality unless paired with housing.',
    cost: 120,
    upkeep: 2.5,
    buildTurns: 4,
    perTurnEffect: { gdpPerCapita: 200, innovation: 0.3, inequality: 0.4 },
    onBuiltEffect: { approval: 2 },
  },
  culturalCenter: {
    type: 'culturalCenter',
    name: 'Cultural Center',
    icon: '🎭',
    description:
      'Theaters, galleries, plaza. Lifts happiness, attracts tourism.',
    educational:
      'Cultural infrastructure boosts quality of life and economic activity through tourism and creative industries. It also fosters civic identity.',
    cost: 40,
    upkeep: 1.4,
    buildTurns: 2,
    perTurnEffect: { happiness: 0.4, innovation: 0.15, gdpPerCapita: 30 },
    onBuiltEffect: { approval: 2 },
  },
  fireStation: {
    type: 'fireStation',
    name: 'Fire Station',
    icon: '🚒',
    description:
      'Fire & rescue station. Improves disaster response and reduces casualty events.',
    educational:
      "Fire and emergency response capacity is the city's insurance against disasters. Investments here are invisible during good times but life-saving in crises.",
    cost: 25,
    upkeep: 1.2,
    buildTurns: 2,
    perTurnEffect: { health: 0.15, happiness: 0.1, crime: -0.05 },
    onBuiltEffect: { approval: 1 },
  },
  wasteTreatment: {
    type: 'wasteTreatment',
    name: 'Waste Treatment Plant',
    icon: '♻️',
    description:
      'Modern waste & water treatment plant. Cuts pollution, raises health.',
    educational:
      'Waste treatment is the unsung hero of public health — proper sewage and trash management prevent disease outbreaks and clean rivers.',
    cost: 55,
    upkeep: 1.8,
    buildTurns: 3,
    perTurnEffect: { pollution: -0.8, health: 0.2 },
    onBuiltEffect: { approval: 1 },
  },
  stadium: {
    type: 'stadium',
    name: 'Stadium',
    icon: '🏟️',
    description:
      'Multi-use sports & event arena. Big happiness boost; modest GDP.',
    educational:
      'Stadiums create civic pride and event-day economic activity, but tax-funded sports infrastructure often has weak direct ROI. Voters love them.',
    cost: 80,
    upkeep: 2.0,
    buildTurns: 3,
    perTurnEffect: { happiness: 0.5, gdpPerCapita: 25 },
    onBuiltEffect: { approval: 4, happiness: 3 },
  },
  library: {
    type: 'library',
    name: 'Public Library',
    icon: '📚',
    description:
      'Public library. Equity-boosting community institution.',
    educational:
      'Libraries are remarkably high-leverage: they offer free education, internet, and community space, especially serving lower-income residents. Outsized return per dollar.',
    cost: 12,
    upkeep: 0.4,
    buildTurns: 1,
    perTurnEffect: { education: 0.2, inequality: -0.1, happiness: 0.15 },
    onBuiltEffect: { approval: 1 },
  },
}

export const BUILDING_LIST_EXTENDED: BuildingDef[] =
  Object.values(BUILDINGS_EXTENDED)
