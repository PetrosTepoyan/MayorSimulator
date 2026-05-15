// ============================================================================
// MayorSim — Named NPCs
// Recurring characters who give the city personality. They show up in events,
// headlines, and quests, with backstories, opinions, and relationships with
// the mayor that evolve over time.
// ============================================================================

import type { GameState, CityStats } from './types'

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type NPCRole =
  | 'rival_politician'    // could run against you
  | 'journalist'          // investigates, breaks stories
  | 'business_tycoon'     // mega donor, deals
  | 'activist'            // organizes protests, pressure
  | 'celebrity'           // local celeb, soft power
  | 'crime_boss'          // shady but powerful
  | 'tech_founder'        // disruption + innovation
  | 'spiritual_leader'    // faith-based influence
  | 'union_chief'         // labor power broker
  | 'foreign_emissary'    // external pressure

export interface NamedNPC {
  id: string
  name: string
  title: string                  // e.g. "Investigative Journalist", "CEO of MoriTech"
  role: NPCRole
  bio: string                    // 2-3 sentence backstory
  // Opinion of the mayor: -100..+100
  opinion: number
  // Power/visibility: 0..100
  power: number
  // What they "want" — drives their actions
  agenda: string
  // Catchphrase / quote that headlines use
  quote: string
  // Possible event ids they appear in
  appearsIn: string[]
  // Country-specific (or null = universal)
  country?: string
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

// Deterministic-ish small jitter in [-10, +10] from id, so the seed list still
// looks varied without true randomness at import time. Pure function — no RNG.
function seedOpinion(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0
  }
  // Range -10..+10
  const v = ((h % 21) + 21) % 21
  return v - 10
}

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n
}

// ----------------------------------------------------------------------------
// NPC ROSTER
// ----------------------------------------------------------------------------

export const NAMED_NPCS: NamedNPC[] = [
  // =========================================================================
  // ATLANTICA — 5 NPCs (rival politician, journalist, business tycoon,
  // tech founder, activist)
  // =========================================================================
  {
    id: 'atlantica.marcus_hale',
    name: 'Senator Marcus Hale',
    title: 'Former Mayor, Sitting Senator',
    role: 'rival_politician',
    bio:
      'Hale ran the city before you and never quite let go of the keys. A polished conservative with a country-club smile, he is famous for handshake deals — and for the lobbyists on speed dial. Rumor says he keeps a binder of every promise you have broken.',
    opinion: seedOpinion('atlantica.marcus_hale'),
    power: 78,
    agenda: 'Position himself for a mayoral comeback by undermining your record.',
    quote: '"The city deserves a steady hand, not whatever this experiment is."',
    appearsIn: ['election_challenge', 'tax_debate', 'budget_fight'],
    country: 'atlantica',
  },
  {
    id: 'atlantica.eliza_park',
    name: 'Eliza Park',
    title: 'Pulitzer-winning Investigative Journalist',
    role: 'journalist',
    bio:
      'Park broke the housing-permit scandal that ended two careers, and she has been chasing the next one ever since. She is meticulous, allergic to spin, and lives on cold coffee and leaked PDFs. Burn her on background and she will bury you on the record.',
    opinion: seedOpinion('atlantica.eliza_park'),
    power: 70,
    agenda: 'Expose the city\'s biggest hidden story before anyone else does.',
    quote: '"If it is on a budget line, it is on the record."',
    appearsIn: ['leak_scandal', 'budget_fight', 'corruption_probe'],
    country: 'atlantica',
  },
  {
    id: 'atlantica.daxter_quinn',
    name: 'Daxter Quinn',
    title: 'Real Estate Mogul, Quinn Holdings',
    role: 'business_tycoon',
    bio:
      'Quinn owns half the skyline and acts like he owns the other half too. He bankrolled three of the last four mayoral campaigns and expects friendly zoning in return. Charming at galas, ruthless at the table — never sign anything he hands you without a lawyer in the room.',
    opinion: seedOpinion('atlantica.daxter_quinn'),
    power: 76,
    agenda: 'Secure favorable zoning for a megaproject on the waterfront.',
    quote: '"A city grows up or it dies. I am here to help it grow up."',
    appearsIn: ['zoning_request', 'donor_dinner', 'megaproject_pitch'],
    country: 'atlantica',
  },
  {
    id: 'atlantica.yana_mori',
    name: 'Yana Mori',
    title: 'Founder & CEO of MoriTech',
    role: 'tech_founder',
    bio:
      'Mori turned a college thesis into a billion-dollar AI lab and never quite outgrew the founder swagger. She speaks in TED talk soundbites and posts manifestos at 3 AM. Progressive on paper, allergic to anything that slows the shipping cadence.',
    opinion: seedOpinion('atlantica.yana_mori'),
    power: 72,
    agenda: 'Make the city a global hub for ethical AI — on her terms.',
    quote: '"Regulate the harm, not the imagination."',
    appearsIn: ['tech_summit', 'data_privacy_event', 'startup_grant'],
    country: 'atlantica',
  },
  {
    id: 'atlantica.dion_carter',
    name: 'Reverend Dion Carter',
    title: 'Community Organizer, Eastside Coalition',
    role: 'activist',
    bio:
      'A second-generation pastor who turned a small congregation into the city\'s loudest moral voice. He marched for tenants in the eighties and has not stopped marching since. Patient with people, impatient with politicians.',
    opinion: seedOpinion('atlantica.dion_carter'),
    power: 64,
    agenda: 'Block displacement in the Eastside and force a real housing plan.',
    quote: '"You can measure a mayor by who they keep in town, not who they bring."',
    appearsIn: ['rent_protest', 'housing_summit', 'eastside_march'],
    country: 'atlantica',
  },

  // =========================================================================
  // NORDFJORD — 4 NPCs
  // =========================================================================
  {
    id: 'nordfjord.astrid_lindqvist',
    name: 'Astrid Lindqvist',
    title: 'Leader of the Green Coalition',
    role: 'rival_politician',
    bio:
      'A climate scientist turned charismatic politician, Astrid quotes data the way other politicians quote scripture. She is genuinely principled, which makes her harder to outmaneuver than the cynics. Her one flaw: she struggles to hide her disdain for compromise.',
    opinion: seedOpinion('nordfjord.astrid_lindqvist'),
    power: 70,
    agenda: 'Force a carbon-neutral mandate by the end of your first term.',
    quote: '"The fjord does not negotiate. Neither will we."',
    appearsIn: ['climate_referendum', 'emissions_debate', 'green_budget'],
    country: 'nordfjord',
  },
  {
    id: 'nordfjord.erik_solberg',
    name: 'Erik Solberg',
    title: 'Host of Morning Nordfjord (NRK Radio)',
    role: 'journalist',
    bio:
      'Solberg has the most-listened-to drive-time slot in the country and a velvet voice that hides surgical questioning. He prides himself on civility and on never letting a politician change the subject. The mayor who survives his morning hour wins the week.',
    opinion: seedOpinion('nordfjord.erik_solberg'),
    power: 66,
    agenda: 'Keep his audience trusting him as the only unbiased mic in the city.',
    quote: '"With respect, Mayor — that is not what I asked."',
    appearsIn: ['morning_interview', 'leak_scandal'],
    country: 'nordfjord',
  },
  {
    id: 'nordfjord.magnus_olsen',
    name: 'Magnus Olsen',
    title: 'Chair of the Transit & Dockworkers Union',
    role: 'union_chief',
    bio:
      'Magnus drove a snowplow for twenty years before climbing the union ranks. He still wears the work boots to council hearings on purpose. Loyal to his members to a fault — cross them and he will shut the harbor down before lunch.',
    opinion: seedOpinion('nordfjord.magnus_olsen'),
    power: 68,
    agenda: 'Lock in inflation-indexed wages and protect transit jobs from automation.',
    quote: '"You move snow in February, then we will talk about cuts."',
    appearsIn: ['transit_strike', 'wage_negotiation', 'budget_fight'],
    country: 'nordfjord',
  },
  {
    id: 'nordfjord.freya_berg',
    name: 'Freya Berg',
    title: 'CEO of Fjordwind Energy',
    role: 'tech_founder',
    bio:
      'Freya turned a family fishing boat into an offshore wind empire in under a decade. She is precise, allergic to small talk, and treats every meeting as a project review. Her engineers worship her; her board mostly stays out of her way.',
    opinion: seedOpinion('nordfjord.freya_berg'),
    power: 64,
    agenda: 'Win the contract for the new offshore wind farm on the outer coast.',
    quote: '"Subsidies are a bridge. We are already on the other side."',
    appearsIn: ['energy_tender', 'green_budget', 'climate_referendum'],
    country: 'nordfjord',
  },

  // =========================================================================
  // EASTORIA — 4 NPCs
  // =========================================================================
  {
    id: 'eastoria.bohdan_volsky',
    name: 'Bohdan Volsky',
    title: 'Mayor-emeritus, Council Elder',
    role: 'rival_politician',
    bio:
      'Volsky ran the city for sixteen years and still walks the corridors like he owns them. He knows every backroom, every favor owed, every body buried. He prefers a handshake to a contract — which is exactly why his enemies regret meeting him.',
    opinion: seedOpinion('eastoria.bohdan_volsky'),
    power: 74,
    agenda: 'Stay relevant by brokering every deal that crosses your desk.',
    quote: '"There are two ways to do this, Mayor. Mine, and the slow way."',
    appearsIn: ['corruption_probe', 'budget_fight', 'old_guard_meeting'],
    country: 'eastoria',
  },
  {
    id: 'eastoria.iryna_kovalenko',
    name: 'Iryna Kovalenko',
    title: 'Editor of OpenCity Blog',
    role: 'journalist',
    bio:
      'A former tax auditor who got fired for asking too many questions, Iryna now runs the most-read anti-corruption blog in the country. She publishes from an apartment with three locks and one cat. Half the city wants her shut down; the other half donates anonymously.',
    opinion: seedOpinion('eastoria.iryna_kovalenko'),
    power: 62,
    agenda: 'Map the entire shadow economy of the city, contract by contract.',
    quote: '"Every envelope leaves a paper trail. I find the paper."',
    appearsIn: ['corruption_probe', 'leak_scandal'],
    country: 'eastoria',
  },
  {
    id: 'eastoria.pavel_drac',
    name: 'Pavel Drac',
    title: 'Owner of Drac Holdings (assorted interests)',
    role: 'crime_boss',
    bio:
      'On paper, Pavel runs a chain of car washes, a casino, and a charity for orphans. Off paper, his name appears in every police file that gets quietly closed. He smiles a lot, donates publicly, and never raises his voice — which is somehow worse.',
    opinion: seedOpinion('eastoria.pavel_drac'),
    power: 70,
    agenda: 'Keep the police away from the docks and the prosecutors well-fed.',
    quote: '"I am a simple businessman. Ask anyone who is still around."',
    appearsIn: ['crime_wave', 'port_scandal', 'old_guard_meeting'],
    country: 'eastoria',
  },
  {
    id: 'eastoria.father_mikhail',
    name: 'Father Mikhail',
    title: 'Archpriest of the Cathedral of Saint Vasily',
    role: 'spiritual_leader',
    bio:
      'Father Mikhail blesses the city every Easter on live television and reaches more pensioners than any politician ever has. Conservative to the bone, he holds a quiet veto over family policy. He gives long sermons and short interviews.',
    opinion: seedOpinion('eastoria.father_mikhail'),
    power: 60,
    agenda: 'Preserve traditional values in education and family law.',
    quote: '"A city without faith is just a busy intersection."',
    appearsIn: ['education_reform', 'family_policy', 'cathedral_event'],
    country: 'eastoria',
  },

  // =========================================================================
  // COSTA VERDE — 4 NPCs
  // =========================================================================
  {
    id: 'costaverde.mariana_suarez',
    name: 'Mariana Suárez',
    title: 'Leader of the Pueblo Unido Movement',
    role: 'rival_politician',
    bio:
      'Mariana grew up in the hillside barrios and never lets the city forget it. A natural speaker who can fill a plaza in an afternoon, she trades in righteous anger and well-rehearsed tears. Her enemies underestimate her math skills at their peril.',
    opinion: seedOpinion('costaverde.mariana_suarez'),
    power: 72,
    agenda: 'Ride a populist wave to the mayor\'s chair on a platform of redistribution.',
    quote: '"They built the city on our backs. We are coming for the keys."',
    appearsIn: ['rent_protest', 'plaza_rally', 'minimum_wage_debate'],
    country: 'costaverde',
  },
  {
    id: 'costaverde.joaquin_vega',
    name: 'Joaquín Vega',
    title: 'Host of "La Voz de la Costa" Radio',
    role: 'journalist',
    bio:
      'Joaquín runs a four-hour daily program that lurches between investigative scoops and operatic rants. He has been sued seven times and won six. He likes you only as long as you take his calls.',
    opinion: seedOpinion('costaverde.joaquin_vega'),
    power: 60,
    agenda: 'Be feared by every politician who values their reputation.',
    quote: '"Mayor, the people have a few questions — and so do I."',
    appearsIn: ['leak_scandal', 'radio_interview', 'rent_protest'],
    country: 'costaverde',
  },
  {
    id: 'costaverde.camila_ortiz',
    name: 'Sister Camila Ortiz',
    title: 'Director of the Casa de la Esperanza Mission',
    role: 'activist',
    bio:
      'Sister Camila runs the largest slum-relief mission in the country and quietly trains a generation of organizers in the basement. A liberation-theology nun who reads Marx and Aquinas with equal underlining. She does not yell — she just does not blink.',
    opinion: seedOpinion('costaverde.camila_ortiz'),
    power: 56,
    agenda: 'Get land titles and water service for the hillside settlements.',
    quote: '"You promised housing. Bring keys, not cameras."',
    appearsIn: ['slum_upgrade', 'water_crisis', 'plaza_rally'],
    country: 'costaverde',
  },
  {
    id: 'costaverde.don_esteban_rios',
    name: 'Don Esteban Ríos',
    title: 'Patriarch of Casa Ríos (Sugar & Ports)',
    role: 'business_tycoon',
    bio:
      'The Ríos family has run the sugar trade for four generations and the main port for two. Don Esteban prefers a quiet study, a strong rum, and a phone that does most of the work. He gives generously to anyone he plans to call later.',
    opinion: seedOpinion('costaverde.don_esteban_rios'),
    power: 74,
    agenda: 'Keep export tariffs low and the port concession in family hands.',
    quote: '"Politicians come and go. The harbor stays."',
    appearsIn: ['port_scandal', 'export_tariff_debate', 'donor_dinner'],
    country: 'costaverde',
  },

  // =========================================================================
  // PACIFICA — 4 NPCs
  // =========================================================================
  {
    id: 'pacifica.hiro_tanaka',
    name: 'Hiro Tanaka',
    title: 'Chairman of Tanaka Robotics',
    role: 'tech_founder',
    bio:
      'Tanaka started in his grandfather\'s machine shop and now runs the largest robotics firm on the coast. He is courteous, formal, and obsessed with precision — every meeting starts and ends on the minute. He sees the city as one big optimization problem.',
    opinion: seedOpinion('pacifica.hiro_tanaka'),
    power: 76,
    agenda: 'Get the city to pilot full automation in transit and logistics.',
    quote: '"A patient machine outlives an impatient politician."',
    appearsIn: ['automation_pilot', 'industrial_grant', 'tech_summit'],
    country: 'pacifica',
  },
  {
    id: 'pacifica.akiko_sato',
    name: 'Akiko Sato',
    title: 'Council Member, Reform Bloc',
    role: 'rival_politician',
    bio:
      'A former prosecutor who moved into politics on a clean-governance ticket, Akiko is the kind of opponent who studies your briefing notes more carefully than you do. She is polite, exact, and politically lethal in committee. She does not raise her voice; she raises questions.',
    opinion: seedOpinion('pacifica.akiko_sato'),
    power: 66,
    agenda: 'Build a centrist reform coalition strong enough to replace you.',
    quote: '"Procedure is not a delay, Mayor. It is the point."',
    appearsIn: ['procurement_audit', 'council_vote', 'election_challenge'],
    country: 'pacifica',
  },
  {
    id: 'pacifica.chen_wei',
    name: 'Ambassador Chen Wei',
    title: 'Trade Representative for the Mainland',
    role: 'foreign_emissary',
    bio:
      'Soft-spoken, deeply patient, and reading three languages at once at any meeting. Ambassador Chen has spent a decade cultivating ports and politicians along the coast. Disagree with him and the trade calendar mysteriously slows down.',
    opinion: seedOpinion('pacifica.chen_wei'),
    power: 70,
    agenda: 'Lock in long-term port and logistics agreements on favorable terms.',
    quote: '"Friendship is built turn by turn, Mayor. Like a good highway."',
    appearsIn: ['trade_deal', 'port_negotiation', 'diplomatic_dinner'],
    country: 'pacifica',
  },
  {
    id: 'pacifica.junzo_ito',
    name: 'Master Junzo Ito',
    title: 'Abbot of Ryōkō-ji Temple',
    role: 'spiritual_leader',
    bio:
      'A Buddhist abbot with a popular ethics column, Master Ito has become a quiet conscience for the city\'s middle class. He speaks slowly, writes briefly, and never names his targets — yet everyone knows. He has politely declined every political endorsement he has ever been offered.',
    opinion: seedOpinion('pacifica.junzo_ito'),
    power: 56,
    agenda: 'Slow the city\'s pace enough to remember the people behind the numbers.',
    quote: '"Efficiency without virtue is only a faster mistake."',
    appearsIn: ['ethics_column', 'temple_event', 'automation_pilot'],
    country: 'pacifica',
  },

  // =========================================================================
  // SAHEL — 4 NPCs
  // =========================================================================
  {
    id: 'sahel.aminata_diallo',
    name: 'Aminata Diallo',
    title: 'Founder of the Youth Future Movement',
    role: 'activist',
    bio:
      'Aminata started organizing at university and has not stopped — she pulled fifty thousand people into the central square last year over fuel prices. Charismatic, social-media native, and a step ahead of any government press office. She is patient with policy but never with promises.',
    opinion: seedOpinion('sahel.aminata_diallo'),
    power: 64,
    agenda: 'Force the city to invest in youth jobs and public university seats.',
    quote: '"We are not the future. We are the unpaid bill."',
    appearsIn: ['youth_protest', 'jobs_program', 'plaza_rally'],
    country: 'sahel',
  },
  {
    id: 'sahel.zhang_liu',
    name: 'Mr. Zhang Liu',
    title: 'Regional Director, ChinaBridge Infrastructure',
    role: 'foreign_emissary',
    bio:
      'Zhang Liu shows up to every infrastructure ribbon-cutting and stays for the coffee. He carries blueprints, soft loans, and a patient timeline. The cities that work with him get highways; the ones that do not get traffic.',
    opinion: seedOpinion('sahel.zhang_liu'),
    power: 68,
    agenda: 'Secure a multi-billion port and rail concession on long-term terms.',
    quote: '"Our partnership is a road, Mayor. Roads take patience."',
    appearsIn: ['infra_loan', 'port_negotiation', 'foreign_visit'],
    country: 'sahel',
  },
  {
    id: 'sahel.yusuf_ndiaye',
    name: 'Yusuf Ndiaye',
    title: 'CEO of SahelCell Communications',
    role: 'business_tycoon',
    bio:
      'Yusuf built the country\'s largest mobile network from a single tower outside the capital. He prefers a tailored boubou to a suit and runs his empire from a glass office above the central market. Generous with foundations, fierce with regulators.',
    opinion: seedOpinion('sahel.yusuf_ndiaye'),
    power: 70,
    agenda: 'Keep telecom regulation light and the spectrum auction in his favor.',
    quote: '"You cannot govern what you cannot call."',
    appearsIn: ['spectrum_auction', 'donor_dinner', 'jobs_program'],
    country: 'sahel',
  },
  {
    id: 'sahel.abdoulaye_kane',
    name: 'Imam Abdoulaye Kane',
    title: 'Chair of the Council of Elders',
    role: 'spiritual_leader',
    bio:
      'Imam Kane leads Friday prayers at the great mosque and chairs a council that quietly mediates half the city\'s disputes. Calm, soft-spoken, and immovable on matters of principle. Every politician in the country comes to him eventually.',
    opinion: seedOpinion('sahel.abdoulaye_kane'),
    power: 62,
    agenda: 'Mediate peace between rival neighborhoods and shield religious schools.',
    quote: '"A city is a family that does not always know it."',
    appearsIn: ['mosque_event', 'community_mediation', 'family_policy'],
    country: 'sahel',
  },

  // =========================================================================
  // Bonus union chief & celebrity to round out roles (Atlantica + Pacifica)
  // =========================================================================
  {
    id: 'atlantica.lou_brennan',
    name: 'Lou Brennan',
    title: 'President, Firefighters Local 22',
    role: 'union_chief',
    bio:
      'Lou worked twenty-two years on a ladder truck and carries the scars to prove it. He is plainspoken, beloved by rank and file, and a master of the well-timed press conference. Cross his firefighters and you will face them in formation on the City Hall steps.',
    opinion: seedOpinion('atlantica.lou_brennan'),
    power: 60,
    agenda: 'Protect firefighter pensions and headcount against budget cuts.',
    quote: '"You can balance a budget. You cannot balance a four-alarm blaze."',
    appearsIn: ['budget_fight', 'pension_debate', 'fire_disaster'],
    country: 'atlantica',
  },
  {
    id: 'pacifica.miyu_arai',
    name: 'Miyu Arai',
    title: 'Pop Singer & Cultural Icon',
    role: 'celebrity',
    bio:
      'Miyu went from busking outside the central station to selling out the harbor stadium in three years. She is shy off-stage, fearless on it, and surprisingly literate on housing policy. Her endorsements move polling among voters under thirty more than any newspaper.',
    opinion: seedOpinion('pacifica.miyu_arai'),
    power: 58,
    agenda: 'Use her platform to push affordable housing and arts funding.',
    quote: '"Build something beautiful. Then let us live in it."',
    appearsIn: ['arts_grant', 'housing_summit', 'stadium_concert'],
    country: 'pacifica',
  },
]

// ----------------------------------------------------------------------------
// Selectors / mutators
// ----------------------------------------------------------------------------

/**
 * Get the NPCs relevant to a given country (universal + country-specific).
 * Universal NPCs are those with no `country` set (none in current roster,
 * but the function supports them for future additions).
 */
export function npcsForCountry(countryId: string): NamedNPC[] {
  return NAMED_NPCS.filter(
    (n) => n.country === undefined || n.country === countryId,
  )
}

/**
 * Update NPC opinion based on a stat or policy change.
 *
 * Heuristics (additive, clamped to [-100, +100]):
 *  - tax increase (positive taxDelta) → business_tycoon -3, union_chief +1
 *  - pollutionDelta > 0 → activist -3
 *  - crimeDelta > 0 → crime_boss +1 (cynical), journalist +0 (interested),
 *                     rival_politician +0 (opportunistic)
 *  - approvalDelta < -5 → rival_politician +2 (sees opportunity)
 *  - inequalityDelta > 0 → activist -2, spiritual_leader -1
 *  - eventId is reserved for hooks; no built-in reactions yet.
 */
export function reactToChange(
  npcs: NamedNPC[],
  change: {
    taxDelta?: number
    pollutionDelta?: number
    inequalityDelta?: number
    approvalDelta?: number
    crimeDelta?: number
    eventId?: string
  },
): NamedNPC[] {
  const {
    taxDelta = 0,
    pollutionDelta = 0,
    inequalityDelta = 0,
    approvalDelta = 0,
    crimeDelta = 0,
  } = change

  return npcs.map((npc) => {
    let delta = 0

    // Tax reactions
    if (taxDelta > 0) {
      if (npc.role === 'business_tycoon') delta -= 3
      if (npc.role === 'union_chief') delta += 1
      if (npc.role === 'tech_founder') delta -= 1
    } else if (taxDelta < 0) {
      if (npc.role === 'business_tycoon') delta += 2
      if (npc.role === 'activist') delta -= 1
    }

    // Pollution reactions
    if (pollutionDelta > 0) {
      if (npc.role === 'activist') delta -= 3
      if (npc.role === 'spiritual_leader') delta -= 1
    } else if (pollutionDelta < 0) {
      if (npc.role === 'activist') delta += 2
    }

    // Crime reactions
    if (crimeDelta > 0) {
      if (npc.role === 'crime_boss') delta += 1
      // journalist & rival_politician are "interested" — flagged but neutral.
      // Keep at 0 to leave room for event-driven swings later.
    }

    // Approval reactions — rivals capitalize on weakness
    if (approvalDelta < -5) {
      if (npc.role === 'rival_politician') delta += 2
      if (npc.role === 'journalist') delta += 1
    } else if (approvalDelta > 5) {
      if (npc.role === 'rival_politician') delta -= 1
    }

    // Inequality reactions
    if (inequalityDelta > 0) {
      if (npc.role === 'activist') delta -= 2
      if (npc.role === 'spiritual_leader') delta -= 1
      if (npc.role === 'union_chief') delta -= 1
    } else if (inequalityDelta < 0) {
      if (npc.role === 'activist') delta += 1
      if (npc.role === 'union_chief') delta += 1
    }

    // eventId hook — reserved for future per-event reactions
    // (intentionally no built-in reactions yet)

    if (delta === 0) return npc
    return { ...npc, opinion: clamp(npc.opinion + delta, -100, 100) }
  })
}

export type NPCTopic =
  | 'crime'
  | 'business'
  | 'inequality'
  | 'tech'
  | 'scandal'
  | 'environment'

const TOPIC_ROLES: Record<NPCTopic, readonly NPCRole[]> = {
  crime: ['crime_boss', 'rival_politician'],
  business: ['business_tycoon', 'tech_founder'],
  inequality: ['activist', 'spiritual_leader'],
  tech: ['tech_founder'],
  scandal: ['journalist', 'rival_politician'],
  environment: ['activist'],
}

/**
 * Pick an NPC to mention in a headline (highest power, filtered by topic).
 * Returns null if no NPC in the list matches.
 */
export function pickRelevantNPC(
  npcs: NamedNPC[],
  topic: NPCTopic,
): NamedNPC | null {
  const allowed = new Set<NPCRole>(TOPIC_ROLES[topic])
  const candidates = npcs.filter((n) => allowed.has(n.role))
  if (candidates.length === 0) return null

  let best = candidates[0]
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i].power > best.power) best = candidates[i]
  }
  return best
}

/**
 * Per-turn drift: opinions tend toward 0 slowly (forgetting).
 * Applies a 5% multiplicative decay toward 0 each turn.
 * Values within ±1 snap to 0 to avoid endless fractional drift.
 */
export function updateNPCsPerTurn(npcs: NamedNPC[]): NamedNPC[] {
  return npcs.map((npc) => {
    const decayed = npc.opinion * 0.95
    const next = Math.abs(decayed) < 1 ? 0 : decayed
    if (next === npc.opinion) return npc
    return { ...npc, opinion: next }
  })
}

// ----------------------------------------------------------------------------
// Re-export type aliases used by callers (kept for ergonomic imports).
// ----------------------------------------------------------------------------
export type { GameState, CityStats }
