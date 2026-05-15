import type { Country } from './types'

// Six fictional but inspired-by-real countries.
// Each one has distinct economic, demographic, political character that shapes
// gameplay differently. Districts/sectors are templated here so initGame can
// instantiate the world accordingly.

export const COUNTRIES: Country[] = [
  // ============================================================
  {
    id: 'atlantica',
    name: 'Atlantica',
    flag: '🦅',
    cityName: 'Port Liberty',
    description:
      'A large coastal city in a wealthy, polarized federal republic. Capitalist, high inequality, strong financial sector.',
    culturalNotes: [
      'Federal grants are abundant but politically charged.',
      'Crime and inequality dominate headlines.',
      'Voters reward growth but punish tax hikes hard.',
    ],
    termLengthYears: 4,
    startingStats: {
      treasury: 220, gdpPerCapita: 62000, unemployment: 5.8, inflation: 3.2,
      debt: 340, creditRating: 78, population: 720_000, education: 62,
      health: 55, happiness: 58, approval: 52, crime: 48,
      pollution: 42, innovation: 64, inequality: 64,
    },
    startingTax: { income: 18, sales: 8, property: 1.2, corporate: 21 },
    startingBuildings: { school: 8, hospital: 4, jail: 3, university: 2, powerPlant: 3, housing: 12, park: 4 },
    eventModifiers: { crime: 1.3, financial: 1.4, protest: 1.2, hurricane: 1.2 },
    districtTemplates: [
      { name: 'Financial District', industry: 'finance', leaning: 'centrist', popShare: 0.08, incomeMultiplier: 2.4, crimeBias: -10, educationBias: 15 },
      { name: 'Harborside', industry: 'industrial', leaning: 'progressive', popShare: 0.18, incomeMultiplier: 0.7, crimeBias: 20, pollutionBias: 25 },
      { name: 'Midtown', industry: 'services', leaning: 'centrist', popShare: 0.22, incomeMultiplier: 1.1, crimeBias: 0, educationBias: 5 },
      { name: 'Northgate', industry: 'residential', leaning: 'conservative', popShare: 0.16, incomeMultiplier: 1.3, crimeBias: -5, educationBias: 10 },
      { name: 'Southside', industry: 'residential', leaning: 'progressive', popShare: 0.21, incomeMultiplier: 0.6, crimeBias: 25, educationBias: -10 },
      { name: 'Tech Quarter', industry: 'tech', leaning: 'progressive', popShare: 0.10, incomeMultiplier: 1.8, crimeBias: -8, educationBias: 20 },
      { name: 'University Hill', industry: 'university', leaning: 'progressive', popShare: 0.05, incomeMultiplier: 1.0, crimeBias: -5, educationBias: 25 },
    ],
    sectorMix: { finance: 22, services: 26, tech: 14, industrial: 14, healthcare: 10, energy: 6, retail: 8 },
    startingMacro: { nationalGdpGrowth: 2.4, nationalInflation: 3.0, federalFunding: 8, geopolitical: 'tense', techWave: 65, climateRisk: 45, consumerConfidence: 60 },
    startingPolicy: { minimumWage: 14, rentControl: 'none', emissionStandards: 'normal', immigration: 'targeted', drugPolicy: 'mixed', transit: 'subsidized', education: 'standard', healthcare: 'mixed' },
  },

  // ============================================================
  {
    id: 'nordfjord',
    name: 'Nordfjord',
    flag: '🌲',
    cityName: 'Bjornholm',
    description:
      'A mid-sized northern city in a wealthy welfare state. High taxes, high services, strong social cohesion, cold winters.',
    culturalNotes: [
      'Voters expect generous services and accept higher taxes.',
      'Green energy is politically required.',
      'Brain drain to bigger countries is a real risk.',
    ],
    termLengthYears: 4,
    startingStats: {
      treasury: 180, gdpPerCapita: 71000, unemployment: 4.1, inflation: 2.4,
      debt: 120, creditRating: 92, population: 280_000, education: 82,
      health: 84, happiness: 76, approval: 60, crime: 22,
      pollution: 18, innovation: 71, inequality: 28,
    },
    startingTax: { income: 38, sales: 22, property: 1.8, corporate: 24 },
    startingBuildings: { school: 6, hospital: 5, jail: 1, university: 1, powerPlant: 2, housing: 8, park: 6, researchLab: 1 },
    eventModifiers: { energy: 1.3, pandemic: 1.0, climate: 1.4, braindrain: 1.2 },
    districtTemplates: [
      { name: 'Old Town', industry: 'services', leaning: 'centrist', popShare: 0.15, incomeMultiplier: 1.2, educationBias: 10 },
      { name: 'Fjordview', industry: 'residential', leaning: 'progressive', popShare: 0.25, incomeMultiplier: 1.1, crimeBias: -10 },
      { name: 'Tech Belt', industry: 'tech', leaning: 'progressive', popShare: 0.18, incomeMultiplier: 1.5, educationBias: 18 },
      { name: 'Harbor', industry: 'industrial', leaning: 'centrist', popShare: 0.12, incomeMultiplier: 0.9, pollutionBias: 15 },
      { name: 'University Park', industry: 'university', leaning: 'progressive', popShare: 0.08, incomeMultiplier: 0.95, educationBias: 25 },
      { name: 'Greenhills', industry: 'residential', leaning: 'progressive', popShare: 0.14, incomeMultiplier: 1.4, crimeBias: -8 },
      { name: 'New Bjornholm', industry: 'mixed', leaning: 'centrist', popShare: 0.08, incomeMultiplier: 1.0 },
    ],
    sectorMix: { tech: 22, services: 28, healthcare: 16, industrial: 10, energy: 12, finance: 6, retail: 6 },
    startingMacro: { nationalGdpGrowth: 1.8, nationalInflation: 2.2, federalFunding: 12, geopolitical: 'calm', techWave: 55, climateRisk: 55, consumerConfidence: 72 },
    startingPolicy: { minimumWage: 22, rentControl: 'soft', emissionStandards: 'strict', immigration: 'targeted', drugPolicy: 'lenient', transit: 'subsidized', education: 'universal', healthcare: 'universal' },
  },

  // ============================================================
  {
    id: 'eastoria',
    name: 'Eastoria',
    flag: '⛪',
    cityName: 'Volsk',
    description:
      'A post-industrial Eastern European city pulled between EU integration and old patronage networks. Talented but emigrating youth.',
    culturalNotes: [
      'Corruption events are common.',
      'EU grants reward modernization.',
      'Old industries close, leaving unemployment shocks.',
    ],
    termLengthYears: 4,
    startingStats: {
      treasury: 75, gdpPerCapita: 22000, unemployment: 11.5, inflation: 6.8,
      debt: 140, creditRating: 58, population: 410_000, education: 70,
      health: 60, happiness: 48, approval: 45, crime: 38,
      pollution: 56, innovation: 42, inequality: 48,
    },
    startingTax: { income: 22, sales: 20, property: 0.8, corporate: 18 },
    startingBuildings: { school: 7, hospital: 3, jail: 2, university: 2, powerPlant: 4, housing: 14, park: 2 },
    eventModifiers: { corruption: 1.5, industrial: 1.3, braindrain: 1.4, eu: 1.3 },
    districtTemplates: [
      { name: 'Old Quarter', industry: 'services', leaning: 'centrist', popShare: 0.18, incomeMultiplier: 0.9, crimeBias: 5 },
      { name: 'Steelworks', industry: 'industrial', leaning: 'conservative', popShare: 0.20, incomeMultiplier: 0.7, pollutionBias: 30, crimeBias: 15 },
      { name: 'Lenina Heights', industry: 'residential', leaning: 'conservative', popShare: 0.22, incomeMultiplier: 0.6, crimeBias: 12 },
      { name: 'Europlatz', industry: 'finance', leaning: 'progressive', popShare: 0.10, incomeMultiplier: 1.8, educationBias: 18 },
      { name: 'Volsk Tech Park', industry: 'tech', leaning: 'progressive', popShare: 0.10, incomeMultiplier: 1.5, educationBias: 20 },
      { name: 'Riverside', industry: 'mixed', leaning: 'centrist', popShare: 0.13, incomeMultiplier: 0.85 },
      { name: 'University District', industry: 'university', leaning: 'progressive', popShare: 0.07, incomeMultiplier: 0.9, educationBias: 22 },
    ],
    sectorMix: { industrial: 28, services: 22, agriculture: 10, tech: 10, energy: 10, healthcare: 10, retail: 10 },
    startingMacro: { nationalGdpGrowth: 2.8, nationalInflation: 6.5, federalFunding: 4, geopolitical: 'tense', techWave: 45, climateRisk: 35, consumerConfidence: 45 },
    startingPolicy: { minimumWage: 6, rentControl: 'none', emissionStandards: 'lax', immigration: 'restrictive', drugPolicy: 'punitive', transit: 'subsidized', education: 'standard', healthcare: 'mixed' },
  },

  // ============================================================
  {
    id: 'costaverde',
    name: 'Costa Verde',
    flag: '🌴',
    cityName: 'San Hermano',
    description:
      'A growing Latin American port city. Young population, agricultural hinterland, vulnerable to currency swings and weather.',
    culturalNotes: [
      'Currency crashes shake the budget.',
      'Hurricanes and floods test infrastructure.',
      'Informal economy is large — official unemployment understates the picture.',
    ],
    termLengthYears: 4,
    startingStats: {
      treasury: 40, gdpPerCapita: 12000, unemployment: 9.2, inflation: 14.5,
      debt: 95, creditRating: 45, population: 530_000, education: 55,
      health: 52, happiness: 60, approval: 55, crime: 55,
      pollution: 38, innovation: 32, inequality: 58,
    },
    startingTax: { income: 12, sales: 16, property: 0.5, corporate: 25 },
    startingBuildings: { school: 5, hospital: 2, jail: 2, university: 1, powerPlant: 2, housing: 18, park: 3 },
    eventModifiers: { hurricane: 2.0, currency: 1.6, drug: 1.3, flood: 1.5 },
    districtTemplates: [
      { name: 'Centro', industry: 'services', leaning: 'centrist', popShare: 0.15, incomeMultiplier: 1.1 },
      { name: 'Puerto Viejo', industry: 'industrial', leaning: 'progressive', popShare: 0.18, incomeMultiplier: 0.7, crimeBias: 15, pollutionBias: 20 },
      { name: 'Las Lomas', industry: 'residential', leaning: 'progressive', popShare: 0.28, incomeMultiplier: 0.4, crimeBias: 25 },
      { name: 'Zona Rosa', industry: 'finance', leaning: 'conservative', popShare: 0.08, incomeMultiplier: 2.5, crimeBias: -10, educationBias: 20 },
      { name: 'Agro Sur', industry: 'agriculture', leaning: 'conservative', popShare: 0.16, incomeMultiplier: 0.5 },
      { name: 'Playa Norte', industry: 'tourism', leaning: 'centrist', popShare: 0.10, incomeMultiplier: 1.2 },
      { name: 'Universidad', industry: 'university', leaning: 'progressive', popShare: 0.05, incomeMultiplier: 0.8, educationBias: 22 },
    ],
    sectorMix: { agriculture: 18, services: 22, industrial: 18, tourism: 12, retail: 12, healthcare: 8, finance: 6, tech: 4 },
    startingMacro: { nationalGdpGrowth: 3.2, nationalInflation: 12.0, federalFunding: 3, geopolitical: 'calm', techWave: 35, climateRisk: 75, consumerConfidence: 50 },
    startingPolicy: { minimumWage: 4, rentControl: 'none', emissionStandards: 'normal', immigration: 'open', drugPolicy: 'punitive', transit: 'market', education: 'standard', healthcare: 'mixed' },
  },

  // ============================================================
  {
    id: 'pacifica',
    name: 'Pacifica',
    flag: '🏯',
    cityName: 'Shintoku',
    description:
      'A dense East Asian megacity district. High-tech, aging population, polluted, fast trains and tight housing.',
    culturalNotes: [
      'Housing prices are explosive.',
      'Aging population strains healthcare.',
      'AI and robotics events come up often.',
    ],
    termLengthYears: 4,
    startingStats: {
      treasury: 310, gdpPerCapita: 52000, unemployment: 3.2, inflation: 1.6,
      debt: 280, creditRating: 84, population: 1_240_000, education: 78,
      health: 72, happiness: 62, approval: 50, crime: 18,
      pollution: 64, innovation: 82, inequality: 44,
    },
    startingTax: { income: 24, sales: 10, property: 1.6, corporate: 28 },
    startingBuildings: { school: 12, hospital: 6, jail: 2, university: 4, powerPlant: 5, housing: 24, park: 5, researchLab: 3, transitHub: 4 },
    eventModifiers: { ai: 1.5, tech: 1.4, aging: 1.4, pollution: 1.3 },
    districtTemplates: [
      { name: 'Central Shintoku', industry: 'finance', leaning: 'centrist', popShare: 0.10, incomeMultiplier: 1.9, educationBias: 18 },
      { name: 'Tech Mile', industry: 'tech', leaning: 'progressive', popShare: 0.18, incomeMultiplier: 1.6, educationBias: 22 },
      { name: 'Old Shintoku', industry: 'services', leaning: 'conservative', popShare: 0.16, incomeMultiplier: 1.0 },
      { name: 'Bayfront', industry: 'industrial', leaning: 'centrist', popShare: 0.14, incomeMultiplier: 0.85, pollutionBias: 25 },
      { name: 'Hanami Hills', industry: 'residential', leaning: 'conservative', popShare: 0.16, incomeMultiplier: 1.3, crimeBias: -10 },
      { name: 'Sakura Park', industry: 'residential', leaning: 'centrist', popShare: 0.14, incomeMultiplier: 0.9 },
      { name: 'Kawamori Tower District', industry: 'tech', leaning: 'progressive', popShare: 0.07, incomeMultiplier: 2.1, educationBias: 25 },
      { name: 'Daigaku', industry: 'university', leaning: 'progressive', popShare: 0.05, incomeMultiplier: 0.95, educationBias: 25 },
    ],
    sectorMix: { tech: 26, services: 20, finance: 16, industrial: 12, healthcare: 12, energy: 6, retail: 8 },
    startingMacro: { nationalGdpGrowth: 1.4, nationalInflation: 1.8, federalFunding: 14, geopolitical: 'tense', techWave: 85, climateRisk: 50, consumerConfidence: 62 },
    startingPolicy: { minimumWage: 12, rentControl: 'strict', emissionStandards: 'strict', immigration: 'restrictive', drugPolicy: 'punitive', transit: 'subsidized', education: 'meritocratic', healthcare: 'universal' },
  },

  // ============================================================
  {
    id: 'sahel',
    name: 'Sahel',
    flag: '🌾',
    cityName: 'Tamberen',
    description:
      'An emerging West African city — young, fast-growing, resource-rich, infrastructure-thin. Real upside, real fragility.',
    culturalNotes: [
      'Population growth is fast — schools and clinics never catch up.',
      'Foreign investors arrive bearing strings.',
      'Drought and energy shocks test resilience.',
    ],
    termLengthYears: 5,
    startingStats: {
      treasury: 28, gdpPerCapita: 5400, unemployment: 14.5, inflation: 8.2,
      debt: 60, creditRating: 38, population: 380_000, education: 38,
      health: 42, happiness: 56, approval: 58, crime: 32,
      pollution: 24, innovation: 24, inequality: 55,
    },
    startingTax: { income: 8, sales: 14, property: 0.3, corporate: 20 },
    startingBuildings: { school: 4, hospital: 1, jail: 1, university: 0, powerPlant: 1, housing: 8, park: 1 },
    eventModifiers: { drought: 1.6, foreign: 1.5, health: 1.4, resource: 1.3 },
    districtTemplates: [
      { name: 'Marché Central', industry: 'services', leaning: 'centrist', popShare: 0.18, incomeMultiplier: 0.9 },
      { name: 'Quartier Mineraux', industry: 'industrial', leaning: 'centrist', popShare: 0.16, incomeMultiplier: 1.0, pollutionBias: 20 },
      { name: 'Banlieue Sud', industry: 'residential', leaning: 'progressive', popShare: 0.28, incomeMultiplier: 0.4, crimeBias: 18, educationBias: -15 },
      { name: 'Zone Industrielle', industry: 'industrial', leaning: 'conservative', popShare: 0.12, incomeMultiplier: 0.7, pollutionBias: 25 },
      { name: 'Plateau', industry: 'finance', leaning: 'conservative', popShare: 0.08, incomeMultiplier: 2.6, crimeBias: -8, educationBias: 22 },
      { name: 'Champs Agricoles', industry: 'agriculture', leaning: 'conservative', popShare: 0.13, incomeMultiplier: 0.3, educationBias: -10 },
      { name: 'Quartier Universitaire', industry: 'university', leaning: 'progressive', popShare: 0.05, incomeMultiplier: 0.8, educationBias: 18 },
    ],
    sectorMix: { agriculture: 24, industrial: 22, services: 18, energy: 14, retail: 10, healthcare: 6, finance: 4, tech: 2 },
    startingMacro: { nationalGdpGrowth: 4.5, nationalInflation: 9.0, federalFunding: 1, geopolitical: 'tense', techWave: 25, climateRisk: 70, consumerConfidence: 55 },
    startingPolicy: { minimumWage: 1.5, rentControl: 'none', emissionStandards: 'lax', immigration: 'open', drugPolicy: 'mixed', transit: 'market', education: 'standard', healthcare: 'private' },
  },
]

export const getCountry = (id: string): Country => {
  const c = COUNTRIES.find((c) => c.id === id)
  if (!c) throw new Error(`Unknown country: ${id}`)
  return c
}
