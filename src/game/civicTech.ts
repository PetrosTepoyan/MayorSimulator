import type { CityStats, StatKey } from './types'

// ============================================================================
// MayorSim — Civic Tech Tree
// ----------------------------------------------------------------------------
// A long-game system: the player invests treasury and time researching real-
// world governance innovations. Each unlock provides small, compounding bonuses
// (per-turn stat drifts), one-shot effects when the tech is finished, building
// discounts, and/or new event options.
//
// Effects are intentionally small per quarter — the value of the tech tree
// comes from compounding over the 16-40 turns of a typical playthrough.
// ============================================================================

export type CivicTechCategory =
  | 'transparency'
  | 'efficiency'
  | 'equity'
  | 'sustainability'
  | 'safety'
  | 'innovation'

export interface CivicTech {
  id: string
  name: string
  description: string
  educational: string                  // 2-4 sentences on real-world analogue
  icon: string
  category: CivicTechCategory
  // Prerequisite tech ids (must be researched first)
  requires: string[]
  // Cost to research
  cost: number                         // $M
  researchTurns: number                // quarters to complete
  // Effect once researched (applied per turn or once)
  perTurnEffect?: Partial<CityStats>
  onResearchedEffect?: Partial<CityStats>
  // Discount on certain building types
  buildingDiscounts?: Record<string, number>  // type -> discount fraction (0.1 = 10%)
  // Unlocks events (event id strings)
  unlocks?: string[]
}

// ============================================================================
// THE TECH LIST
// 20+ techs across 6 categories with prerequisite chains.
// ============================================================================

export const CIVIC_TECHS: CivicTech[] = [
  // --------------------------------------------------------------------------
  // TRANSPARENCY
  // --------------------------------------------------------------------------
  {
    id: 'openDataPortal',
    name: 'Open Data Portal',
    description:
      'Publish municipal datasets (budgets, 311 calls, permits) online for anyone to inspect and remix.',
    educational:
      'Cities like New York, London, and Buenos Aires run public data portals that release thousands of datasets in machine-readable formats. Open data lowers the cost of journalism and civic-tech experimentation, and lets startups build apps on top of city operations. Studies link open data programs to modest but measurable increases in citizen trust and innovation.',
    icon: '📂',
    category: 'transparency',
    requires: [],
    cost: 15,
    researchTurns: 2,
    perTurnEffect: { education: 0.05, innovation: 0.1 },
    onResearchedEffect: { approval: 1 },
    unlocks: ['civicHackathon'],
  },
  {
    id: 'spendingTracker',
    name: 'Public Spending Tracker',
    description:
      'A live dashboard that shows every dollar the city spends, by department, vendor, and project.',
    educational:
      'Real-time expenditure dashboards (pioneered by cities like Chicago and São Paulo) make graft far harder by exposing each invoice and contract. Sunlight on procurement tends to compress vendor margins, reduce no-bid contracts, and rebuild trust after corruption scandals. The technical lift is small; the political lift is large.',
    icon: '💸',
    category: 'transparency',
    requires: ['openDataPortal'],
    cost: 20,
    researchTurns: 3,
    perTurnEffect: { approval: 0.05, inequality: -0.02 },
    onResearchedEffect: { approval: 2, happiness: 0.5 },
    unlocks: ['corruptionLeak'],
  },
  {
    id: 'foiaModernization',
    name: 'FOIA Modernization',
    description:
      'Digitize and accelerate public records requests with a tracked online queue and AI-assisted redaction.',
    educational:
      'Most Freedom of Information regimes still rely on paper, fax, or PDF. Modernizing FOIA — putting requests in a queue, publishing common responses, and using AI to redact PII — can cut response time from months to days. Faster records access strengthens watchdog journalism and constituent trust.',
    icon: '📑',
    category: 'transparency',
    requires: ['openDataPortal'],
    cost: 18,
    researchTurns: 3,
    perTurnEffect: { approval: 0.04, education: 0.03 },
    onResearchedEffect: { approval: 1 },
  },

  // --------------------------------------------------------------------------
  // EFFICIENCY
  // --------------------------------------------------------------------------
  {
    id: 'digitalId',
    name: 'Digital ID',
    description:
      'A single secure city-issued identity for residents, used across permits, benefits, transit, and library access.',
    educational:
      'Estonia’s e-Estonia and India’s Aadhaar show how a unified digital identity can collapse hours of paperwork into minutes. Done right, it cuts fraud and lifts benefit take-up rates among the poor; done poorly, it raises serious privacy and surveillance concerns. The hardest design problem is consent and revocation, not the cryptography.',
    icon: '🪪',
    category: 'efficiency',
    requires: [],
    cost: 35,
    researchTurns: 4,
    perTurnEffect: { gdpPerCapita: 2, approval: 0.04 },
    onResearchedEffect: { treasury: 4 },
    buildingDiscounts: { school: 0.05, hospital: 0.05, library: 0.1 },
  },
  {
    id: 'permitStreamlining',
    name: 'Permit Streamlining',
    description:
      'One-stop online portal for business licenses and construction permits; statutory clocks on each step.',
    educational:
      'In many cities, opening a small business or building an ADU still takes a year and a stack of paper. Cities like Seoul and Tallinn cut this to days by mapping every step, putting it online, and forcing departments to act within a clock. Faster permits raise small-business formation rates and housing supply.',
    icon: '⏱️',
    category: 'efficiency',
    requires: [],
    cost: 22,
    researchTurns: 3,
    perTurnEffect: { gdpPerCapita: 4, unemployment: -0.03 },
    onResearchedEffect: { approval: 2 },
    buildingDiscounts: { housing: 0.1, industrialPark: 0.08, financialCenter: 0.08 },
  },
  {
    id: 'aiDocumentReview',
    name: 'AI Document Review',
    description:
      'Use large language models to triage permit applications, contract drafts, and benefits claims.',
    educational:
      'Generative models are now reliable enough to summarize and classify routine government documents — flagging missing fields, computing eligibility, and drafting standard responses. Cities piloting this report 40-70% reductions in staff time on common workflows. The risk is hallucination and bias; effective deployments keep a human reviewer in the loop.',
    icon: '🤖',
    category: 'efficiency',
    requires: ['digitalId'],
    cost: 40,
    researchTurns: 4,
    perTurnEffect: { gdpPerCapita: 3, approval: 0.05 },
    onResearchedEffect: { treasury: 6 },
    buildingDiscounts: { housing: 0.05, school: 0.05 },
    unlocks: ['aiBiasAudit'],
  },
  {
    id: 'smartProcurement',
    name: 'Smart Procurement',
    description:
      'Replace lowest-bidder defaults with weighted scoring, reverse auctions, and shared regional contracts.',
    educational:
      'Cities spend roughly a third of their budget on contracted goods and services. Modern procurement — cooperative purchasing, transparent scoring rubrics, and reverse auctions — has been shown to save 8-15% on the same line items. The savings compound annually with no service cuts.',
    icon: '🧾',
    category: 'efficiency',
    requires: ['spendingTracker'],
    cost: 25,
    researchTurns: 3,
    perTurnEffect: { treasury: 0.6 },
    onResearchedEffect: { treasury: 5, approval: 1 },
    buildingDiscounts: {
      jail: 0.1,
      fireStation: 0.1,
      wasteTreatment: 0.1,
      powerPlant: 0.05,
    },
  },

  // --------------------------------------------------------------------------
  // EQUITY
  // --------------------------------------------------------------------------
  {
    id: 'participatoryBudgeting',
    name: 'Participatory Budgeting',
    description:
      'Allocate a slice of the capital budget directly to citizen-voted neighborhood projects.',
    educational:
      'Originating in Porto Alegre, Brazil in 1989, participatory budgeting now runs in thousands of cities. Residents propose and vote on how to spend a portion of public funds, typically capital projects. Studies link PB to reduced inequality, higher civic engagement, and modest improvements in service quality, especially in poor neighborhoods. The trade-off is administrative friction.',
    icon: '🗳️',
    category: 'equity',
    requires: [],
    cost: 18,
    researchTurns: 3,
    perTurnEffect: { inequality: -0.1, happiness: 0.05, approval: 0.06 },
    onResearchedEffect: { approval: -1 },
    unlocks: ['neighborhoodAssembly'],
  },
  {
    id: 'universalBasicInternet',
    name: 'Universal Basic Internet',
    description:
      'Free or near-free broadband for low-income households, often delivered via municipal fiber or partnerships.',
    educational:
      'Affordable broadband is now a prerequisite for school, work, and benefits access. Cities like Chattanooga and Barcelona run their own fiber networks; others subsidize private plans for low-income residents. Programs consistently raise high-school graduation rates and reduce digital-divide unemployment gaps.',
    icon: '🌐',
    category: 'equity',
    requires: [],
    cost: 45,
    researchTurns: 5,
    perTurnEffect: { education: 0.1, inequality: -0.08, unemployment: -0.02 },
    onResearchedEffect: { approval: 2, happiness: 1 },
    buildingDiscounts: { school: 0.05, library: 0.1 },
  },
  {
    id: 'translationServices',
    name: 'Multilingual City Services',
    description:
      'Translate every public-facing service into the top languages spoken in the city; require interpreters in clinics and courts.',
    educational:
      'Language access laws (like NYC’s Local Law 30) require core city services to be available in the most-spoken non-English languages. Studies link translation programs to higher benefit take-up among immigrants, better health outcomes, and reduced court appearance failures. Cost is modest; equity gains are large.',
    icon: '🗣️',
    category: 'equity',
    requires: [],
    cost: 12,
    researchTurns: 2,
    perTurnEffect: { inequality: -0.05, happiness: 0.04, approval: 0.03 },
    onResearchedEffect: { approval: 1 },
  },
  {
    id: 'guaranteedIncomePilot',
    name: 'Guaranteed Income Pilot',
    description:
      'Send monthly unconditional cash to a randomized group of low-income residents and study the outcomes.',
    educational:
      'From Stockton, California to Tacoma and Helsinki, guaranteed-income pilots provide $500-1000/month with no strings attached. Recipients consistently report better mental health, more full-time employment (not less), and lower financial volatility. Pilots are politically risky but yield strong evidence for future policy.',
    icon: '💵',
    category: 'equity',
    requires: ['participatoryBudgeting'],
    cost: 50,
    researchTurns: 5,
    perTurnEffect: { inequality: -0.12, happiness: 0.08, crime: -0.04 },
    onResearchedEffect: { approval: -2, treasury: -2 },
    unlocks: ['ubiResults'],
  },

  // --------------------------------------------------------------------------
  // SUSTAINABILITY
  // --------------------------------------------------------------------------
  {
    id: 'smartGrid',
    name: 'Smart Grid',
    description:
      'Replace one-way power lines with a sensor-rich grid that load-balances renewables and isolates outages.',
    educational:
      'A smart grid uses real-time sensors, automated switches, and demand-response pricing to integrate solar/wind generation and limit blackouts to single blocks instead of districts. Cities deploying smart grids report 5-15% reductions in grid losses and meaningful CO₂ cuts. Capital cost is real but pays back over a decade.',
    icon: '⚡',
    category: 'sustainability',
    requires: [],
    cost: 55,
    researchTurns: 5,
    perTurnEffect: { pollution: -0.2, innovation: 0.05 },
    onResearchedEffect: { approval: 1 },
    buildingDiscounts: { powerPlant: 0.15, industrialPark: 0.05 },
  },
  {
    id: 'heatMapping',
    name: 'Urban Heat Mapping',
    description:
      'Drive sensors through the city on summer days to map block-by-block heat-island intensity and target tree planting.',
    educational:
      'Heat is the deadliest weather hazard in most cities, and its burden is wildly uneven — poor neighborhoods are often 5-10°F hotter than wealthy ones. Campaigns like NOAA’s urban heat-island mapping send volunteers with sensors to build block-level maps used to target shade, cool roofs, and cooling centers. Outcome: fewer heat deaths during waves.',
    icon: '🌡️',
    category: 'sustainability',
    requires: ['openDataPortal'],
    cost: 14,
    researchTurns: 2,
    perTurnEffect: { health: 0.08, pollution: -0.05, inequality: -0.03 },
    onResearchedEffect: { approval: 1 },
    buildingDiscounts: { park: 0.15 },
    unlocks: ['heatWaveResponse'],
  },
  {
    id: 'carbonAccounting',
    name: 'Municipal Carbon Accounting',
    description:
      'Inventory and publish the city’s greenhouse-gas emissions by source on an annual cycle.',
    educational:
      'You cannot manage what you do not measure. Cities reporting via frameworks like CDP-ICLEI track scope 1-3 emissions for buildings, transport, waste, and procurement. Public inventories anchor climate plans, attract green bonds, and let voters hold mayors to commitments.',
    icon: '📊',
    category: 'sustainability',
    requires: ['openDataPortal'],
    cost: 16,
    researchTurns: 3,
    perTurnEffect: { pollution: -0.08, innovation: 0.03 },
    onResearchedEffect: { approval: 1 },
    buildingDiscounts: { wasteTreatment: 0.1 },
    unlocks: ['greenBondOffer'],
  },
  {
    id: 'congestionPricing',
    name: 'Congestion Pricing',
    description:
      'Charge a variable fee to drive in the city core during peak hours; recycle revenue into transit.',
    educational:
      'Stockholm, London, Singapore, and (eventually) New York have shown that pricing road space cuts traffic 15-25%, reduces emissions and crashes, and generates large transit subsidies. Approval is usually negative pre-launch and strongly positive within two years. It is the rare policy that gets more popular after it ships.',
    icon: '🚦',
    category: 'sustainability',
    requires: ['smartGrid'],
    cost: 30,
    researchTurns: 4,
    perTurnEffect: { pollution: -0.18, treasury: 1.2, gdpPerCapita: 1 },
    onResearchedEffect: { approval: -3 },
    buildingDiscounts: { transitHub: 0.15 },
    unlocks: ['congestionBacklash'],
  },

  // --------------------------------------------------------------------------
  // SAFETY
  // --------------------------------------------------------------------------
  {
    id: 'bodyCameras',
    name: 'Police Body Cameras',
    description:
      'Equip every patrol officer with a body-worn camera and publish footage policies.',
    educational:
      'Body cameras are now standard in U.S. policing. Evidence is mixed but converging: they modestly reduce use-of-force incidents, sharply reduce frivolous complaints, and increase prosecution rates for assault on officers. The harder questions are storage, redaction, and public-release policy.',
    icon: '📹',
    category: 'safety',
    requires: [],
    cost: 18,
    researchTurns: 2,
    perTurnEffect: { crime: -0.1, approval: 0.04 },
    onResearchedEffect: { approval: 0.5 },
  },
  {
    id: 'mentalHealthRouting',
    name: '311 Mental Health Routing',
    description:
      'Route non-violent mental-health and homelessness calls to clinicians instead of police.',
    educational:
      'Programs like Eugene’s CAHOOTS and Denver’s STAR send unarmed clinician-paramedic pairs to a fifth of 911/311 calls — usually mental-health crises, welfare checks, or substance use. They resolve nearly every call without arrest or use-of-force, free up officers, and save cities money on emergency-room visits and jail bookings.',
    icon: '🧠',
    category: 'safety',
    requires: ['bodyCameras'],
    cost: 22,
    researchTurns: 3,
    perTurnEffect: { crime: -0.08, health: 0.05, happiness: 0.04 },
    onResearchedEffect: { approval: 2 },
    buildingDiscounts: { hospital: 0.05 },
    unlocks: ['homelessSurge'],
  },
  {
    id: 'connectedStreetlights',
    name: 'Connected Streetlights',
    description:
      'Replace sodium lights with networked LEDs that auto-report outages and dim when streets are empty.',
    educational:
      'Cities like Los Angeles and Copenhagen retrofitted hundreds of thousands of streetlights to networked LEDs. Energy use dropped 50-70%, maintenance costs fell because lamps self-report failures, and well-lit blocks show small but consistent crime reductions. The underlying mesh network can later carry traffic and air-quality sensors.',
    icon: '💡',
    category: 'safety',
    requires: [],
    cost: 28,
    researchTurns: 3,
    perTurnEffect: { crime: -0.06, pollution: -0.04, treasury: 0.4 },
    onResearchedEffect: { approval: 1 },
    buildingDiscounts: { powerPlant: 0.05, transitHub: 0.05 },
  },
  {
    id: 'cybersecurityOps',
    name: 'Municipal SOC',
    description:
      'Stand up a Security Operations Center to monitor city networks, train staff against phishing, and rehearse ransomware drills.',
    educational:
      'Atlanta, Baltimore, and dozens of smaller cities have been crippled by ransomware, sometimes costing $20M+ to recover. A municipal SOC — even outsourced — pays for itself by detecting intrusions early and forcing employee training. Cyber insurance increasingly requires it.',
    icon: '🛡️',
    category: 'safety',
    requires: ['digitalId'],
    cost: 30,
    researchTurns: 4,
    perTurnEffect: { approval: 0.03, treasury: 0.2 },
    onResearchedEffect: { approval: 1 },
    unlocks: ['ransomwareAttempt'],
  },

  // --------------------------------------------------------------------------
  // INNOVATION
  // --------------------------------------------------------------------------
  {
    id: 'innovationSandbox',
    name: 'Innovation Sandbox',
    description:
      'A legal carve-out where startups can pilot drones, scooters, autonomous vehicles, and fintech under temporary rules.',
    educational:
      'Regulatory sandboxes (pioneered for fintech in the UK, then for mobility in cities like Singapore and Phoenix) let firms test new products with regulators in the loop. Done well, they attract investment, surface harms early, and produce evidence for permanent rules. Done poorly, they become permanent exemptions.',
    icon: '🧪',
    category: 'innovation',
    requires: [],
    cost: 20,
    researchTurns: 3,
    perTurnEffect: { innovation: 0.15, gdpPerCapita: 2 },
    onResearchedEffect: { approval: 1 },
    unlocks: ['scooterPilot'],
  },
  {
    id: 'techApprenticeships',
    name: 'Tech Apprenticeships',
    description:
      'Subsidize earn-while-you-learn apprenticeships in software, data, and cybersecurity for residents without degrees.',
    educational:
      'Programs like Apprenti and TechHire show that 6-12 month paid apprenticeships can move workers without four-year degrees into $70-90k tech jobs at near-100% placement rates. The city wins on the income-tax base; companies win on retention. Scale is the hard part.',
    icon: '🧑‍💻',
    category: 'innovation',
    requires: [],
    cost: 25,
    researchTurns: 3,
    perTurnEffect: { education: 0.08, unemployment: -0.04, gdpPerCapita: 3 },
    onResearchedEffect: { approval: 1, happiness: 0.5 },
    buildingDiscounts: { university: 0.08, researchLab: 0.05 },
  },
  {
    id: 'cityVentureFund',
    name: 'City Venture Fund',
    description:
      'A small evergreen fund that takes equity in local startups, recycling exits back into the city budget.',
    educational:
      'Cities from Tel Aviv to Paris run small venture or evergreen funds that co-invest in local startups. Returns are unpredictable, but anchoring funds attract private VCs and tie successful exits to civic infrastructure. The political risk is picking winners and being blamed for losers.',
    icon: '🏦',
    category: 'innovation',
    requires: ['innovationSandbox'],
    cost: 60,
    researchTurns: 5,
    perTurnEffect: { innovation: 0.12, gdpPerCapita: 4, treasury: 0.3 },
    onResearchedEffect: { treasury: -10, approval: -1 },
    buildingDiscounts: { financialCenter: 0.1, researchLab: 0.08 },
    unlocks: ['unicornExit'],
  },
  {
    id: 'publicAiLab',
    name: 'Public AI Lab',
    description:
      'A city-owned lab that builds and evaluates AI tools for municipal use and audits private vendors.',
    educational:
      'A handful of cities (Helsinki, Amsterdam, NYC) have started in-house AI offices to build chatbots for resident services, evaluate vendor claims, and publish algorithmic-impact assessments. Public capacity is the only durable check on opaque private models running parts of government.',
    icon: '🧬',
    category: 'innovation',
    requires: ['innovationSandbox', 'techApprenticeships'],
    cost: 75,
    researchTurns: 6,
    perTurnEffect: {
      innovation: 0.25,
      education: 0.06,
      gdpPerCapita: 5,
      approval: 0.04,
    },
    onResearchedEffect: { approval: 3, happiness: 1 },
    buildingDiscounts: { researchLab: 0.15, university: 0.05 },
    unlocks: ['aiVendorScandal', 'modelOpenSource'],
  },
]

// ============================================================================
// LOOKUPS + AGGREGATES
// ============================================================================

// Quick index for getCivicTech — built once at module load.
const TECH_BY_ID: Record<string, CivicTech> = (() => {
  const map: Record<string, CivicTech> = {}
  for (const t of CIVIC_TECHS) map[t.id] = t
  return map
})()

/** Get tech by id, or undefined. */
export function getCivicTech(id: string): CivicTech | undefined {
  return TECH_BY_ID[id]
}

/**
 * Sum the per-turn effects of every researched tech.
 * Note: onResearchedEffect is one-shot and is NOT included here.
 */
export function aggregateTechEffects(
  researchedIds: string[],
): Partial<CityStats> {
  const result: Partial<CityStats> = {}
  for (const id of researchedIds) {
    const tech = TECH_BY_ID[id]
    if (!tech || !tech.perTurnEffect) continue
    for (const key of Object.keys(tech.perTurnEffect) as StatKey[]) {
      const delta = tech.perTurnEffect[key]
      if (typeof delta !== 'number') continue
      const prev = result[key]
      result[key] = (typeof prev === 'number' ? prev : 0) + delta
    }
  }
  return result
}

/**
 * Techs the player can start researching right now: not already researched,
 * and all prerequisites satisfied. Sorted by category, then name.
 */
export function availableToResearch(researchedIds: string[]): CivicTech[] {
  const done = new Set(researchedIds)
  const available = CIVIC_TECHS.filter((t) => {
    if (done.has(t.id)) return false
    for (const req of t.requires) {
      if (!done.has(req)) return false
    }
    return true
  })
  available.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category)
    }
    return a.name.localeCompare(b.name)
  })
  return available
}

/**
 * Sum the discount applied to a building type by all researched techs.
 * Capped at 0.4 (40%) to avoid runaway free builds.
 */
export function getBuildingDiscount(
  buildingType: string,
  researchedIds: string[],
): number {
  let total = 0
  for (const id of researchedIds) {
    const tech = TECH_BY_ID[id]
    if (!tech || !tech.buildingDiscounts) continue
    const d = tech.buildingDiscounts[buildingType]
    if (typeof d === 'number') total += d
  }
  if (total < 0) return 0
  if (total > 0.4) return 0.4
  return total
}

/**
 * Flatten the `unlocks` event-id arrays from every researched tech.
 * De-duplicated; preserves first-seen order.
 */
export function unlockedEventIds(researchedIds: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of researchedIds) {
    const tech = TECH_BY_ID[id]
    if (!tech || !tech.unlocks) continue
    for (const eventId of tech.unlocks) {
      if (seen.has(eventId)) continue
      seen.add(eventId)
      out.push(eventId)
    }
  }
  return out
}
