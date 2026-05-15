import type {
  BudgetAllocation,
  BudgetCategory,
  CityStats,
  Country,
  District,
  Faction,
  FactionType,
  GameState,
  PoliticalLeaning,
  PolicyState,
  TaxPolicy,
} from './types'
import { clamp, uid } from './util'

// ============================================================================
// FACTION TEMPLATES
// ----------------------------------------------------------------------------
// Internal archetypes. Country flavor is applied during generation so a single
// template can spawn (e.g.) the 'Workers Association of Shintoku' in Pacifica
// or the 'Industrial Workers Union of Volsk' in Eastoria.
// ============================================================================

interface FactionTemplate {
  // Stable archetype key — used by reaction logic to identify factions
  archetype: string
  name: string
  type: FactionType
  ideology: PoliticalLeaning
  description: string
  basePower: number
  caresAbout: Array<keyof CityStats | BudgetCategory>
  baseDemand: string
}

// Council member archetypes (3-5 of these are picked per game)
const COUNCIL_TEMPLATES: FactionTemplate[] = [
  {
    archetype: 'council-progressive',
    name: 'Councilor Reyes',
    type: 'council',
    ideology: 'progressive',
    description:
      'A vocal progressive councilor who pushes for equity, education, and a stronger safety net.',
    basePower: 55,
    caresAbout: ['inequality', 'education', 'welfare', 'healthcare'],
    baseDemand: 'Wants more investment in education and welfare.',
  },
  {
    archetype: 'council-conservative',
    name: 'Councilor Vance',
    type: 'council',
    ideology: 'conservative',
    description:
      'A fiscal-conservative councilor focused on the treasury, public order, and a friendly climate for business.',
    basePower: 55,
    caresAbout: ['treasury', 'crime', 'security'],
    baseDemand: 'Wants tighter budgets and tougher crime policy.',
  },
  {
    archetype: 'council-centrist',
    name: 'Councilor Chen',
    type: 'council',
    ideology: 'centrist',
    description:
      'A pragmatic centrist councilor who follows polling — rewards growth, punishes scandal.',
    basePower: 60,
    caresAbout: ['gdpPerCapita', 'approval', 'infrastructure'],
    baseDemand: 'Wants steady growth and good headlines.',
  },
  {
    archetype: 'council-progressive-2',
    name: 'Councilor Okafor',
    type: 'council',
    ideology: 'progressive',
    description: 'A community-organizer councilor focused on housing and neighborhood services.',
    basePower: 50,
    caresAbout: ['inequality', 'welfare', 'happiness'],
    baseDemand: 'Wants affordable housing and stronger tenant protections.',
  },
  {
    archetype: 'council-conservative-2',
    name: 'Councilor Brennan',
    type: 'council',
    ideology: 'conservative',
    description: 'A small-business-friendly councilor wary of new taxes and regulation.',
    basePower: 50,
    caresAbout: ['treasury', 'unemployment'],
    baseDemand: 'Wants lower corporate taxes and less red tape.',
  },
]

// Lobby / civic archetypes
const LOBBY_TEMPLATES: FactionTemplate[] = [
  {
    archetype: 'business-chamber',
    name: 'Business Chamber',
    type: 'business',
    ideology: 'conservative',
    description: 'Coalition of local employers — wants low taxes and reliable infrastructure.',
    basePower: 65,
    caresAbout: ['gdpPerCapita', 'infrastructure'],
    baseDemand: 'Wants the corporate tax rate held down.',
  },
  {
    archetype: 'teachers-union',
    name: 'Teachers Union',
    type: 'union',
    ideology: 'progressive',
    description: 'Represents city teachers — demands school funding and decent wages.',
    basePower: 55,
    caresAbout: ['education', 'welfare'],
    baseDemand: 'Wants at least 12% of budget on education.',
  },
  {
    archetype: 'police-federation',
    name: 'Police Federation',
    type: 'union',
    ideology: 'conservative',
    description: 'Represents officers — demands funding, equipment, and punitive policy.',
    basePower: 60,
    caresAbout: ['security', 'crime'],
    baseDemand: 'Wants robust security funding and tough drug enforcement.',
  },
  {
    archetype: 'nurses-association',
    name: 'Nurses Association',
    type: 'union',
    ideology: 'progressive',
    description: 'Healthcare workers organized for staffing, pay, and public health.',
    basePower: 50,
    caresAbout: ['healthcare', 'health'],
    baseDemand: 'Wants stronger healthcare funding and universal coverage.',
  },
  {
    archetype: 'green-coalition',
    name: 'Green Coalition',
    type: 'civic',
    ideology: 'progressive',
    description: 'Environmental NGOs aligned to cut pollution and emissions.',
    basePower: 45,
    caresAbout: ['pollution', 'environment'],
    baseDemand: 'Wants stricter emission standards and a green transition.',
  },
  {
    archetype: 'faith-council',
    name: 'Faith Council',
    type: 'civic',
    ideology: 'conservative',
    description: 'Interfaith civic body — values social order, family, charity.',
    basePower: 45,
    caresAbout: ['happiness', 'crime'],
    baseDemand: 'Wants tougher drug policy and traditional education.',
  },
  {
    archetype: 'senior-lobby',
    name: 'Senior Citizens Lobby',
    type: 'civic',
    ideology: 'centrist',
    description: 'Older voters — care about pensions, healthcare, low inflation.',
    basePower: 55,
    caresAbout: ['healthcare', 'inflation', 'health'],
    baseDemand: 'Wants healthcare funded and inflation under control.',
  },
  {
    archetype: 'tech-industry',
    name: 'Tech Industry Group',
    type: 'business',
    ideology: 'centrist',
    description: 'Local tech employers — want talent, research funding, and modern infrastructure.',
    basePower: 50,
    caresAbout: ['education', 'research', 'innovation'],
    baseDemand: 'Wants more research funding and skilled-immigration access.',
  },
  {
    archetype: 'renters-alliance',
    name: 'Renters Alliance',
    type: 'civic',
    ideology: 'progressive',
    description: 'Tenant advocacy group pushing rent control and affordable housing.',
    basePower: 40,
    caresAbout: ['inequality', 'welfare'],
    baseDemand: 'Wants strict rent control and more housing built.',
  },
  {
    archetype: 'industrial-union',
    name: 'Industrial Workers Union',
    type: 'union',
    ideology: 'progressive',
    description: 'Blue-collar industrial workers — wages, jobs, and a fair deal.',
    basePower: 50,
    caresAbout: ['unemployment', 'welfare'],
    baseDemand: 'Wants industrial jobs protected and minimum wage raised.',
  },
]

// ============================================================================
// COUNTRY FLAVORING
// ----------------------------------------------------------------------------
// Per-country renames + power tweaks. Anything not listed uses the template
// defaults. The mapping is intentionally small — just enough to give each
// country a distinct political feel.
// ============================================================================

interface FlavorEntry {
  name?: string
  powerDelta?: number
}

const COUNTRY_FLAVOR: Record<string, Record<string, FlavorEntry>> = {
  atlantica: {
    'business-chamber': { name: 'Port Liberty Chamber of Commerce', powerDelta: 10 },
    'police-federation': { name: 'Port Liberty Police Benevolent Association', powerDelta: 5 },
    'faith-council': { name: 'Interfaith Council of Port Liberty' },
    'tech-industry': { name: 'Tech Quarter Alliance', powerDelta: 5 },
  },
  nordfjord: {
    'industrial-union': { name: 'Bjornholm Workers Confederation', powerDelta: 5 },
    'green-coalition': { name: 'Bjornholm Green Forum', powerDelta: 15 },
    'business-chamber': { name: 'Nordfjord Business Council', powerDelta: -5 },
    'faith-council': { name: 'Lutheran Community Council', powerDelta: -10 },
  },
  eastoria: {
    'industrial-union': { name: 'Volsk Industrial Workers Federation', powerDelta: 15 },
    'business-chamber': { name: 'Volsk Chamber of Commerce' },
    'faith-council': { name: 'Orthodox Pastoral Council', powerDelta: 5 },
    'tech-industry': { name: 'Europlatz Tech Forum', powerDelta: -5 },
  },
  costaverde: {
    'faith-council': { name: 'Catholic Pastoral Conference', powerDelta: 15 },
    'industrial-union': { name: 'Sindicato de Trabajadores Portuarios', powerDelta: 5 },
    'business-chamber': { name: 'Cámara de Comercio de San Hermano' },
    'police-federation': { name: 'Federación Policial de San Hermano', powerDelta: 5 },
  },
  pacifica: {
    'tech-industry': { name: 'Shintoku Tech Keiretsu', powerDelta: 20 },
    'industrial-union': { name: 'Workers Association of Shintoku' },
    'senior-lobby': { name: 'Shintoku Elders League', powerDelta: 10 },
    'faith-council': { name: 'Temple & Shrine Council', powerDelta: -5 },
  },
  sahel: {
    'industrial-union': { name: 'Tamberen Mineworkers Union', powerDelta: 10 },
    'faith-council': { name: 'Council of Imams and Pastors', powerDelta: 10 },
    'business-chamber': { name: 'Tamberen Chamber of Commerce', powerDelta: -5 },
    'tech-industry': { name: 'Tamberen Startup Forum', powerDelta: -15 },
  },
}

// Pseudo-random in [-15, +15] — used to seed initial favor.
function noise(): number {
  return Math.round((Math.random() * 2 - 1) * 15)
}

// Build a Faction instance from a template, applying country flavor.
function instantiate(
  template: FactionTemplate,
  country: Country,
): Faction {
  const flavor = COUNTRY_FLAVOR[country.id]?.[template.archetype] ?? {}
  const power = clamp(template.basePower + (flavor.powerDelta ?? 0), 0, 100)
  return {
    id: `${uid('faction')}_${template.archetype}`,
    name: flavor.name ?? template.name,
    type: template.type,
    description: template.description,
    ideology: template.ideology,
    favor: clamp(30 + noise(), -100, 100),
    power,
    demand: template.baseDemand,
    caresAbout: [...template.caresAbout],
  }
}

// Pull the archetype key out of a generated faction id. Returns '' if absent.
function archetypeOf(f: Faction): string {
  // ids are uid('faction')_<archetype>; uid format = faction_<n>_<t>
  // So the id looks like 'faction_<n>_<t>_<archetype-with-dashes>'.
  const parts = f.id.split('_')
  if (parts.length < 4) return ''
  return parts.slice(3).join('-')
}

// ============================================================================
// PUBLIC API
// ============================================================================

// Generate the initial faction set for a country — council members + civic lobbies.
export function generateFactions(country: Country, districts: District[]): Faction[] {
  // Council size scales with district count: 3 base, +1 per district above 5 (cap 5)
  const districtCount = districts.length
  const desiredCouncil = clamp(3 + Math.max(0, districtCount - 5), 3, 5)

  // Pick council members by leaning balance — bias toward the dominant district leaning
  const leaningCount: Record<PoliticalLeaning, number> = {
    progressive: 0,
    centrist: 0,
    conservative: 0,
  }
  for (const d of districts) leaningCount[d.leaning] += 1

  // Sort council templates by how well they match district leaning distribution.
  const councilPicks: FactionTemplate[] = []
  const available = [...COUNCIL_TEMPLATES]
  // Always include at least one of each major leaning where district mix supports it
  const order: PoliticalLeaning[] = (
    Object.entries(leaningCount) as Array<[PoliticalLeaning, number]>
  )
    .sort((a, b) => b[1] - a[1])
    .map((p) => p[0])

  // Greedy pick: walk preferred leaning order, picking the first matching template
  for (const leaning of order) {
    const idx = available.findIndex((t) => t.ideology === leaning)
    if (idx >= 0 && councilPicks.length < desiredCouncil) {
      councilPicks.push(available[idx])
      available.splice(idx, 1)
    }
  }
  // Fill remaining slots with any available council templates
  while (councilPicks.length < desiredCouncil && available.length > 0) {
    councilPicks.push(available.shift()!)
  }

  // Lobby picks: 4-6 — always include core ones, add extras based on country flavor
  const coreLobbies = [
    'business-chamber',
    'teachers-union',
    'police-federation',
    'green-coalition',
  ]
  const extraPool = LOBBY_TEMPLATES.filter((t) => !coreLobbies.includes(t.archetype))
  const extraCount = 2 // -> 6 total lobbies; adjust here if desired
  // Pick country-relevant extras first
  const sortedExtras = [...extraPool].sort((a, b) => {
    const aFav = COUNTRY_FLAVOR[country.id]?.[a.archetype] ? 1 : 0
    const bFav = COUNTRY_FLAVOR[country.id]?.[b.archetype] ? 1 : 0
    return bFav - aFav
  })
  const lobbyPicks: FactionTemplate[] = [
    ...LOBBY_TEMPLATES.filter((t) => coreLobbies.includes(t.archetype)),
    ...sortedExtras.slice(0, extraCount),
  ]

  return [...councilPicks, ...lobbyPicks].map((t) => instantiate(t, country))
}

// Apply reactions to a single set of decisions, returning new factions + notes.
export function applyFactionReactions(
  factions: Faction[],
  change: {
    taxDelta?: Partial<TaxPolicy>
    budgetDelta?: Partial<BudgetAllocation>
    policyChange?: Partial<PolicyState>
    statChange?: Partial<CityStats>
    eventChoice?: { eventId: string; choiceIndex: number }
  },
): { factions: Faction[]; notes: string[] } {
  const notes: string[] = []
  // Track per-faction favor deltas so we apply them once at the end.
  const deltas = new Map<string, number>()
  const bump = (id: string, d: number) => deltas.set(id, (deltas.get(id) ?? 0) + d)

  const byArch = new Map<string, Faction>()
  for (const f of factions) {
    const a = archetypeOf(f)
    if (a) byArch.set(a, f)
  }
  const get = (arch: string): Faction | undefined => byArch.get(arch)
  const councilByIdeology = (ideo: PoliticalLeaning): Faction[] =>
    factions.filter((f) => f.type === 'council' && f.ideology === ideo)

  // ---------------- TAX REACTIONS ----------------
  if (change.taxDelta) {
    const td = change.taxDelta
    if (td.corporate !== undefined && td.corporate !== 0) {
      if (td.corporate < 0) {
        // Corporate tax cut
        const biz = get('business-chamber')
        if (biz) {
          bump(biz.id, 5)
          notes.push(`${biz.name} pleased: corporate tax cut`)
        }
        const tech = get('tech-industry')
        if (tech) bump(tech.id, 3)
        for (const c of councilByIdeology('conservative')) bump(c.id, 2)
        for (const c of councilByIdeology('progressive')) bump(c.id, -3)
      } else {
        // Corporate tax hike
        const biz = get('business-chamber')
        if (biz) {
          bump(biz.id, -5)
          notes.push(`${biz.name} outraged: corporate tax hike`)
        }
        const tech = get('tech-industry')
        if (tech) bump(tech.id, -3)
        for (const c of councilByIdeology('conservative')) bump(c.id, -2)
        for (const c of councilByIdeology('progressive')) bump(c.id, 2)
      }
    }
    if (td.income !== undefined && td.income !== 0) {
      if (td.income > 0) {
        // Income tax hike
        for (const f of factions) {
          if (f.ideology === 'conservative') bump(f.id, -3)
        }
        const renters = get('renters-alliance')
        if (renters) bump(renters.id, 1)
        for (const c of councilByIdeology('progressive')) bump(c.id, 1)
        notes.push('Conservatives bristle at the income tax hike')
      } else {
        // Income tax cut
        for (const f of factions) {
          if (f.ideology === 'conservative') bump(f.id, 2)
        }
        for (const c of councilByIdeology('progressive')) bump(c.id, -1)
      }
    }
    if (td.property !== undefined && td.property !== 0) {
      const biz = get('business-chamber')
      if (biz) bump(biz.id, td.property > 0 ? -2 : 2)
      const renters = get('renters-alliance')
      if (renters && td.property > 0) bump(renters.id, 1)
    }
    if (td.sales !== undefined && td.sales !== 0) {
      // Sales tax mostly hits low-income — progressives unhappy when raised
      if (td.sales > 0) {
        for (const c of councilByIdeology('progressive')) bump(c.id, -2)
        const renters = get('renters-alliance')
        if (renters) bump(renters.id, -2)
      }
    }
  }

  // ---------------- BUDGET REACTIONS ----------------
  if (change.budgetDelta) {
    const bd = change.budgetDelta
    const direction = (n: number | undefined) => (n === undefined ? 0 : n > 0 ? 1 : n < 0 ? -1 : 0)

    if (direction(bd.education) !== 0) {
      const sign = direction(bd.education)
      const teachers = get('teachers-union')
      if (teachers) {
        bump(teachers.id, sign * 4)
        notes.push(
          sign > 0
            ? `${teachers.name} pleased by education funding boost`
            : `${teachers.name} angry over education cuts`,
        )
      }
      const tech = get('tech-industry')
      if (tech) bump(tech.id, sign * 1)
      for (const c of councilByIdeology('progressive')) bump(c.id, sign * 2)
    }
    if (direction(bd.security) !== 0) {
      const sign = direction(bd.security)
      const police = get('police-federation')
      if (police) {
        bump(police.id, sign * 5)
        notes.push(
          sign > 0
            ? `${police.name} thanks you for the security budget`
            : `${police.name} furious at security cuts`,
        )
      }
      // Progressives nervous about heavy security spending
      if (sign > 0 && (bd.security ?? 0) > 25) {
        for (const c of councilByIdeology('progressive')) bump(c.id, -1)
      }
    }
    if (direction(bd.healthcare) !== 0) {
      const sign = direction(bd.healthcare)
      const nurses = get('nurses-association')
      if (nurses) {
        bump(nurses.id, sign * 5)
        notes.push(
          sign > 0
            ? `${nurses.name} cheers healthcare funding increase`
            : `${nurses.name} alarmed by healthcare cuts`,
        )
      }
      const seniors = get('senior-lobby')
      if (seniors) bump(seniors.id, sign * 2)
    }
    if (direction(bd.welfare) !== 0) {
      const sign = direction(bd.welfare)
      const renters = get('renters-alliance')
      if (renters) {
        bump(renters.id, sign * 3)
      }
      const biz = get('business-chamber')
      if (biz) bump(biz.id, sign * -1)
      if (sign > 0) notes.push('Welfare programs expanded')
    }
    if (direction(bd.research) !== 0) {
      const sign = direction(bd.research)
      const tech = get('tech-industry')
      if (tech) {
        bump(tech.id, sign * 3)
        if (sign > 0) notes.push(`${tech.name} pleased by research investment`)
      }
    }
    if (direction(bd.environment) !== 0) {
      const sign = direction(bd.environment)
      const green = get('green-coalition')
      if (green) {
        bump(green.id, sign * 5)
        notes.push(
          sign > 0
            ? `${green.name} applauds the green spending`
            : `${green.name} dismayed by environment budget cuts`,
        )
      }
      const biz = get('business-chamber')
      if (biz) bump(biz.id, sign * -2)
    }
    if (direction(bd.infrastructure) !== 0) {
      const sign = direction(bd.infrastructure)
      const biz = get('business-chamber')
      if (biz) bump(biz.id, sign * 2)
      for (const c of councilByIdeology('centrist')) bump(c.id, sign * 1)
    }
  }

  // ---------------- POLICY REACTIONS ----------------
  if (change.policyChange) {
    const p = change.policyChange
    if (p.rentControl !== undefined) {
      const renters = get('renters-alliance')
      const biz = get('business-chamber')
      if (p.rentControl === 'strict') {
        if (renters) {
          bump(renters.id, 8)
          notes.push(`${renters.name} celebrates strict rent control`)
        }
        if (biz) {
          bump(biz.id, -5)
          notes.push(`${biz.name} warns of housing investment chill`)
        }
      } else if (p.rentControl === 'soft') {
        if (renters) bump(renters.id, 3)
        if (biz) bump(biz.id, -2)
      } else {
        // 'none'
        if (renters) bump(renters.id, -6)
        if (biz) bump(biz.id, 3)
      }
    }
    if (p.minimumWage !== undefined) {
      // Without prior wage we can't compute delta — treat as setpoint:
      // High wage = pro-union, anti-business
      const wage = p.minimumWage
      if (wage >= 15) {
        for (const f of factions) {
          if (f.type === 'union') bump(f.id, 4)
        }
        const biz = get('business-chamber')
        if (biz) {
          bump(biz.id, -3)
          notes.push(`${biz.name} grumbles about the minimum wage`)
        }
      } else if (wage <= 5) {
        for (const f of factions) {
          if (f.type === 'union') bump(f.id, -3)
        }
        const biz = get('business-chamber')
        if (biz) bump(biz.id, 2)
      }
    }
    if (p.emissionStandards !== undefined) {
      const green = get('green-coalition')
      const industrial = get('industrial-union')
      const biz = get('business-chamber')
      if (p.emissionStandards === 'strict') {
        if (green) {
          bump(green.id, 6)
          notes.push(`${green.name} applauds strict emission standards`)
        }
        if (industrial) {
          bump(industrial.id, -3)
          notes.push(`${industrial.name} fears job losses from emission rules`)
        }
        if (biz) bump(biz.id, -2)
      } else if (p.emissionStandards === 'lax') {
        if (green) {
          bump(green.id, -6)
          notes.push(`${green.name} outraged by emission rollback`)
        }
        if (industrial) bump(industrial.id, 3)
        if (biz) bump(biz.id, 2)
      }
    }
    if (p.drugPolicy !== undefined) {
      const faith = get('faith-council')
      const police = get('police-federation')
      if (p.drugPolicy === 'lenient') {
        for (const c of councilByIdeology('progressive')) bump(c.id, 2)
        if (faith) {
          bump(faith.id, -4)
          notes.push(`${faith.name} condemns lenient drug policy`)
        }
        if (police) bump(police.id, -2)
      } else if (p.drugPolicy === 'punitive') {
        if (faith) bump(faith.id, 3)
        if (police) bump(police.id, 4)
        for (const c of councilByIdeology('progressive')) bump(c.id, -2)
      }
    }
    if (p.healthcare !== undefined) {
      const nurses = get('nurses-association')
      const seniors = get('senior-lobby')
      const biz = get('business-chamber')
      if (p.healthcare === 'universal') {
        if (nurses) {
          bump(nurses.id, 6)
          notes.push(`${nurses.name} hails universal healthcare`)
        }
        if (seniors) bump(seniors.id, 4)
        for (const c of councilByIdeology('progressive')) bump(c.id, 3)
        if (biz) bump(biz.id, -2)
      } else if (p.healthcare === 'private') {
        if (nurses) bump(nurses.id, -4)
        if (biz) bump(biz.id, 2)
        for (const c of councilByIdeology('progressive')) bump(c.id, -3)
      }
    }
    if (p.education !== undefined) {
      const teachers = get('teachers-union')
      const faith = get('faith-council')
      if (p.education === 'universal') {
        if (teachers) bump(teachers.id, 4)
        for (const c of councilByIdeology('progressive')) bump(c.id, 2)
      } else if (p.education === 'meritocratic') {
        const tech = get('tech-industry')
        if (tech) bump(tech.id, 3)
        if (teachers) bump(teachers.id, -2)
      } else if (p.education === 'standard') {
        if (faith) bump(faith.id, 2)
      }
    }
    if (p.immigration !== undefined) {
      const tech = get('tech-industry')
      const faith = get('faith-council')
      if (p.immigration === 'open') {
        if (tech) bump(tech.id, 2)
        if (faith) bump(faith.id, -2)
        for (const c of councilByIdeology('progressive')) bump(c.id, 2)
        for (const c of councilByIdeology('conservative')) bump(c.id, -2)
      } else if (p.immigration === 'restrictive') {
        for (const c of councilByIdeology('conservative')) bump(c.id, 2)
        for (const c of councilByIdeology('progressive')) bump(c.id, -2)
        if (tech) bump(tech.id, -2)
      }
    }
    if (p.transit !== undefined) {
      if (p.transit === 'free') {
        const renters = get('renters-alliance')
        if (renters) bump(renters.id, 2)
        for (const c of councilByIdeology('progressive')) bump(c.id, 2)
      }
    }
  }

  // ---------------- STAT REACTIONS ----------------
  if (change.statChange) {
    const sc = change.statChange
    if (sc.crime !== undefined && sc.crime > 0) {
      const police = get('police-federation')
      if (police) bump(police.id, 3)
      // The council generally blames the mayor for rising crime
      for (const c of factions.filter((f) => f.type === 'council')) {
        bump(c.id, -1 - (sc.crime > 5 ? 1 : 0))
      }
      notes.push('Rising crime puts the council on edge')
    }
    if (sc.pollution !== undefined && sc.pollution > 0) {
      const green = get('green-coalition')
      if (green) bump(green.id, -3)
    }
    if (sc.unemployment !== undefined && sc.unemployment > 0) {
      const industrial = get('industrial-union')
      if (industrial) bump(industrial.id, -3)
      const biz = get('business-chamber')
      if (biz) bump(biz.id, -2)
    }
    if (sc.approval !== undefined && sc.approval > 0) {
      for (const c of councilByIdeology('centrist')) bump(c.id, 1)
    }
  }

  // ---------------- EVENT CHOICE ----------------
  // Free-form: factions module doesn't know event ids by default. Hook reserved
  // for future per-event reactions. No-op by default.
  if (change.eventChoice) {
    // Intentionally empty — events module already handles factionFavor via side effects.
    void change.eventChoice
  }

  // Apply deltas immutably
  const next: Faction[] = factions.map((f) => {
    const d = deltas.get(f.id)
    if (!d) return f
    return { ...f, favor: clamp(f.favor + d, -100, 100) }
  })

  return { factions: next, notes }
}

// Per-turn drift: favor decays toward 0; power shifts with the city's mood.
export function updateFactionsPerTurn(factions: Faction[], state: GameState): Faction[] {
  const s = state.stats
  return factions.map((f) => {
    // 1) Favor drift toward 0 by 1.5%
    let favor = f.favor * (1 - 0.015)
    // Round to one decimal to avoid floating-point noise in the UI
    favor = Math.round(favor * 10) / 10

    // 2) Power shifts by archetype + stats
    let power = f.power
    const arch = archetypeOf(f)
    switch (arch) {
      case 'police-federation':
        if (s.crime > 50) power += 0.5
        else if (s.crime < 25) power -= 0.3
        break
      case 'teachers-union':
      case 'industrial-union':
      case 'nurses-association':
        if (s.unemployment > 8) power += 0.5
        break
      case 'tech-industry':
        if (s.innovation > 70) power += 0.3
        break
      case 'business-chamber':
        // Treasury rising vs debt as a rough proxy for growth
        if (s.gdpPerCapita > 50000) power += 0.3
        break
      case 'green-coalition':
        if (s.pollution > 55) power += 0.5
        else if (s.pollution < 25) power -= 0.2
        break
      case 'senior-lobby':
        if (s.health < 50) power += 0.3
        break
      case 'faith-council':
        if (s.happiness < 45) power += 0.3
        break
      case 'renters-alliance':
        if (s.inequality > 55) power += 0.3
        break
      default:
        break
    }
    power = clamp(Math.round(power * 10) / 10, 0, 100)

    // 3) Demand text — refresh based on current state
    const demand = currentDemand(arch, state)

    return { ...f, favor: clamp(favor, -100, 100), power, demand }
  })
}

// Pick a current top demand for an archetype using the current GameState.
function currentDemand(arch: string, state: GameState): string {
  const b = state.budget
  const p = state.policy
  const s = state.stats
  switch (arch) {
    case 'teachers-union':
      if (b.education < 10) return 'Demands at least 12% education budget'
      if (p.minimumWage < 12) return 'Wants a higher minimum wage'
      return 'Backs your priorities — for now'
    case 'police-federation':
      if (b.security < 12) return 'Demands more security funding'
      if (p.drugPolicy === 'lenient') return 'Wants tougher drug enforcement'
      if (s.crime > 50) return 'Demands a crackdown on rising crime'
      return 'Watching crime numbers closely'
    case 'nurses-association':
      if (b.healthcare < 12) return 'Demands more healthcare funding'
      if (p.healthcare !== 'universal') return 'Pushing for universal healthcare'
      return 'Supportive of current direction'
    case 'business-chamber':
      if (state.tax.corporate > 25) return 'Wants the corporate tax cut'
      if (b.infrastructure < 12) return 'Calls for infrastructure investment'
      return 'Cautiously optimistic'
    case 'green-coalition':
      if (p.emissionStandards !== 'strict') return 'Demands strict emission standards'
      if (b.environment < 8) return 'Wants more environment budget'
      if (s.pollution > 50) return 'Alarmed by pollution levels'
      return 'Pleased with green progress'
    case 'faith-council':
      if (p.drugPolicy === 'lenient') return 'Demands a return to strict drug policy'
      if (s.crime > 50) return 'Calls for a focus on public morality'
      return 'Watching social trends'
    case 'senior-lobby':
      if (s.inflation > 5) return 'Demands action on inflation'
      if (b.healthcare < 12) return 'Wants healthcare protected'
      return 'Mostly content'
    case 'tech-industry':
      if (b.research < 6) return 'Demands more research funding'
      if (p.immigration === 'restrictive') return 'Wants skilled-immigration access'
      return 'Watching for talent and incentives'
    case 'renters-alliance':
      if (p.rentControl === 'none') return 'Demands rent control'
      if (s.inequality > 55) return 'Pushes for stronger tenant protections'
      return 'Watching housing affordability'
    case 'industrial-union':
      if (s.unemployment > 8) return 'Demands a jobs program'
      if (p.minimumWage < 10) return 'Wants the minimum wage raised'
      return 'Backs solid industrial policy'
    case 'council-progressive':
    case 'council-progressive-2':
      if (b.welfare < 8) return 'Wants stronger social spending'
      if (s.inequality > 50) return 'Pushes for equity measures'
      return 'Aligned on progressive priorities'
    case 'council-conservative':
    case 'council-conservative-2':
      if (s.treasury < 0) return 'Demands fiscal restraint'
      if (s.crime > 45) return 'Wants tougher crime policy'
      return 'Cautious on spending'
    case 'council-centrist':
      if (s.approval < 45) return 'Wants the polls to turn around'
      if (s.gdpPerCapita < 20000) return 'Looking for clear growth'
      return 'Following the polls'
    default:
      return 'Watching closely'
  }
}

// Political capital — weighted-mean favor, mapped to 0..100.
export function politicalCapital(factions: Faction[]): number {
  if (factions.length === 0) return 50
  let weightSum = 0
  let weighted = 0
  for (const f of factions) {
    weightSum += f.power
    weighted += f.favor * f.power
  }
  if (weightSum <= 0) {
    // Fall back to a plain average if power is somehow zero
    const avg = factions.reduce((s, f) => s + f.favor, 0) / factions.length
    return clamp(Math.round((avg + 100) / 2), 0, 100)
  }
  const mean = weighted / weightSum
  return clamp(Math.round((mean + 100) / 2), 0, 100)
}

// Active demands — what factions are pressing for right now, ranked by power.
export function getActiveDemands(
  factions: Faction[],
): Array<{ factionId: string; faction: string; demand: string; favor: number }> {
  return factions
    .filter((f) => (f.favor < 40 || (f.demand && f.demand.length > 0)))
    .filter((f) => Boolean(f.demand))
    .slice()
    .sort((a, b) => b.power - a.power)
    .map((f) => ({
      factionId: f.id,
      faction: f.name,
      demand: f.demand ?? '',
      favor: f.favor,
    }))
}

// Most hostile faction — the lowest favor * (1 + power/100); useful for narrative beats.
export function mostHostileFaction(factions: Faction[]): Faction | null {
  if (factions.length === 0) return null
  let worst: Faction = factions[0]
  let worstScore = worst.favor * (1 + worst.power / 100)
  for (let i = 1; i < factions.length; i++) {
    const f = factions[i]
    const score = f.favor * (1 + f.power / 100)
    if (score < worstScore) {
      worst = f
      worstScore = score
    }
  }
  return worst
}
