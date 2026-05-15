import type { BuildingDef, BuildingType } from './types'

// Each building has:
// - cost: upfront $M
// - upkeep: $M per turn (auto-deducted)
// - buildTurns: how many quarters of construction
// - perTurnEffect: stat changes applied each turn the building is operational
// - onBuiltEffect: one-shot effects when it opens (capacity bumps)
// - educational: shown in tooltip, explains the real-world mechanism

// Core buildings — extended set lives in buildingsExtended.ts and is merged
// into ALL_BUILDINGS by the consumer.
export const BUILDINGS: Partial<Record<BuildingType, BuildingDef>> = {
  school: {
    type: 'school',
    name: 'Public School',
    icon: '🏫',
    description:
      'A K-12 school. Each one boosts education levels and lowers long-term crime.',
    educational:
      'Schools take years to pay off — early childhood and primary education compound over decades. Returns show up as lower crime, higher innovation, and a stronger tax base.',
    cost: 18,
    upkeep: 0.8,
    buildTurns: 2,
    perTurnEffect: { education: 0.25, crime: -0.05 },
    onBuiltEffect: { happiness: 1, approval: 1 },
  },
  hospital: {
    type: 'hospital',
    name: 'Hospital',
    icon: '🏥',
    description:
      'Treats illness, raises health, reduces deaths from events like pandemics.',
    educational:
      'Healthcare capacity is the difference between a manageable illness wave and a crisis. Hospitals raise baseline health and dampen the impact of disease events.',
    cost: 45,
    upkeep: 2.0,
    buildTurns: 3,
    perTurnEffect: { health: 0.35, happiness: 0.1 },
    onBuiltEffect: { approval: 2 },
  },
  jail: {
    type: 'jail',
    name: 'Jail & Police Station',
    icon: '🚓',
    description:
      'Adds policing capacity. Suppresses crime in the short term.',
    educational:
      'Policing reduces visible crime quickly but does not address root causes (unemployment, inequality). Overuse can hurt approval in communities that feel over-policed.',
    cost: 22,
    upkeep: 1.2,
    buildTurns: 2,
    perTurnEffect: { crime: -0.45, approval: -0.05 },
    onBuiltEffect: { happiness: 0.5 },
  },
  university: {
    type: 'university',
    name: 'University',
    icon: '🎓',
    description:
      'Drives innovation, attracts talent, boosts long-term GDP.',
    educational:
      'Universities are slow-burn engines: they create research, train high-skill workers, and seed local businesses. Costly upfront but transformative over 10+ years.',
    cost: 90,
    upkeep: 4.5,
    buildTurns: 4,
    perTurnEffect: { education: 0.4, innovation: 0.5, gdpPerCapita: 80 },
    onBuiltEffect: { approval: 2, happiness: 1 },
  },
  powerPlant: {
    type: 'powerPlant',
    name: 'Power Plant',
    icon: '⚡',
    description:
      'Generates electricity. Choose: cheap & dirty, clean & moderate, or expensive & clean.',
    educational:
      'Energy mix is the slowest-moving lever a city has. Cheap coal accelerates growth but accumulates pollution debt; renewables and nuclear cost more upfront but pay off in health and reputation.',
    cost: 60,
    upkeep: 2.5,
    buildTurns: 3,
    perTurnEffect: { gdpPerCapita: 50 },
    variants: [
      {
        id: 'coal',
        name: 'Coal',
        costDelta: -15,
        upkeepDelta: -0.5,
        perTurnEffect: { gdpPerCapita: 60, pollution: 1.2 },
      },
      {
        id: 'solar',
        name: 'Solar',
        costDelta: 10,
        upkeepDelta: 0,
        perTurnEffect: { gdpPerCapita: 35, pollution: -0.15, approval: 0.1 },
      },
      {
        id: 'nuclear',
        name: 'Nuclear',
        costDelta: 80,
        upkeepDelta: 1.5,
        perTurnEffect: { gdpPerCapita: 90, pollution: -0.05, innovation: 0.2 },
      },
    ],
  },
  housing: {
    type: 'housing',
    name: 'Housing Block',
    icon: '🏘️',
    description:
      'Affordable housing. Reduces inequality and supports population growth.',
    educational:
      'Housing supply is the quiet driver of inequality. Build enough and rents stay affordable; fall behind population growth and inequality climbs while approval tanks.',
    cost: 30,
    upkeep: 0.6,
    buildTurns: 2,
    perTurnEffect: { inequality: -0.2, happiness: 0.1 },
    onBuiltEffect: { approval: 1 },
  },
  researchLab: {
    type: 'researchLab',
    name: 'Research Lab',
    icon: '🧪',
    description:
      'Boosts innovation directly. Pairs well with universities.',
    educational:
      'R&D spending is the strongest predictor of long-term productivity growth. Labs amplify the innovation effect of universities.',
    cost: 70,
    upkeep: 3.5,
    buildTurns: 3,
    perTurnEffect: { innovation: 0.8, gdpPerCapita: 60 },
  },
  park: {
    type: 'park',
    name: 'Park',
    icon: '🌳',
    description:
      'Cheap, popular. Raises happiness and slightly reduces pollution.',
    educational:
      'Parks are the highest-leverage cheap policy tool: they raise quality of life, reduce urban heat, and cost little to maintain.',
    cost: 8,
    upkeep: 0.3,
    buildTurns: 1,
    perTurnEffect: { happiness: 0.2, pollution: -0.1 },
    onBuiltEffect: { approval: 1 },
  },
  transitHub: {
    type: 'transitHub',
    name: 'Transit Hub',
    icon: '🚇',
    description:
      'Public transport. Reduces pollution, raises GDP, lowers unemployment.',
    educational:
      'Public transit raises productivity by getting workers to jobs faster, cuts pollution, and reduces inequality (cars are expensive). Heavy upfront cost.',
    cost: 120,
    upkeep: 4.0,
    buildTurns: 4,
    perTurnEffect: { pollution: -0.3, gdpPerCapita: 70, unemployment: -0.05 },
    onBuiltEffect: { happiness: 2, approval: 2 },
  },
}

export const BUILDING_LIST: BuildingDef[] = Object.values(BUILDINGS)
