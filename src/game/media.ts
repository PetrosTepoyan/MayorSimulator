// ============================================================================
// MayorSim — Media System
//
// News outlets with biases that react to your stats, events, and decisions.
// Each outlet has favor toward the mayor; their headlines reflect their bias.
// ============================================================================

import type {
  NewsOutlet,
  NewsItem,
  Country,
  GameState,
  StatChange,
  StatKey,
  GameEvent,
  EventChoice,
  MediaBias,
} from './types'
import { clamp, weightedPick } from './util'

// ============================================================================
// OUTLET TEMPLATES — country-specific names
// ============================================================================

interface OutletTemplate {
  bias: MediaBias
  baseDescription: string
}

const OUTLET_TEMPLATES: OutletTemplate[] = [
  {
    bias: 'left',
    baseDescription:
      'Progressive paper of record. Focuses on inequality, climate, social justice.',
  },
  {
    bias: 'center',
    baseDescription:
      'Centrist newspaper. Tries to be balanced. Focuses on practical outcomes.',
  },
  {
    bias: 'right',
    baseDescription:
      'Conservative paper. Focuses on crime, taxes, business climate.',
  },
  {
    bias: 'tabloid',
    baseDescription: 'Tabloid. Sensationalist. Loves scandals and crime panics.',
  },
]

const COUNTRY_OUTLET_NAMES: Record<string, [string, string, string, string]> = {
  atlantica: [
    'Port Liberty Tribune',
    'Liberty Times',
    'Atlantica Sentinel',
    'Liberty Buzz',
  ],
  nordfjord: ['Bjornholm Tidende', 'Nordfjord Daily', 'Nordic Sentinel', 'Bjornholm Buzz'],
  eastoria: ['Volsk Daily', 'Eastoria Times', 'The Sentinel', 'Volsk Tabloid'],
  costaverde: ['El Tribuno', 'Diario de la Costa', 'El Centinela', 'La Buzz'],
  pacifica: ['Shintoku Times', 'Pacific Daily', 'Shintoku Sentinel', 'Shintoku Buzz'],
  sahel: ['Le Tribune', 'Tamberen Daily', 'Le Sentinelle', 'Tamberen Buzz'],
}

const FALLBACK_NAMES: [string, string, string, string] = [
  'The Daily Tribune',
  'City Times',
  'Sentinel',
  'Daily Buzz',
]

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function generateOutlets(country: Country): NewsOutlet[] {
  const names = COUNTRY_OUTLET_NAMES[country.id] ?? FALLBACK_NAMES
  // Spread influence values by bias — give center the largest reach, tabloid second.
  const baseInfluence: Record<MediaBias, number> = {
    left: 55,
    center: 68,
    right: 50,
    tabloid: 60,
  }
  return OUTLET_TEMPLATES.map((tpl, i) => {
    const name = names[i] ?? FALLBACK_NAMES[i]
    // Add some deterministic variance per country so outlets feel slightly different.
    const variance = ((country.id.charCodeAt(0) + i * 7) % 21) - 10
    const influence = clamp(baseInfluence[tpl.bias] + variance, 25, 75)
    return {
      id: `outlet_${slugify(name)}`,
      name,
      bias: tpl.bias,
      influence,
      favor: 0,
      description: tpl.baseDescription,
    }
  })
}

// ============================================================================
// HEADLINE TEMPLATES — keyed by stat + direction + bias
// Placeholders: {mayor}, {city}, {value}, {delta}
// ============================================================================

type Direction = 'up' | 'down'

interface TemplateSet {
  left: string[]
  center: string[]
  right: string[]
  tabloid: string[]
}

// Empty/missing buckets fall back to center.
const STAT_TEMPLATES: Partial<Record<StatKey, Partial<Record<Direction, TemplateSet>>>> = {
  crime: {
    up: {
      left: [
        'Crime spike linked to widening inequality, advocates say',
        'Underfunded schools, overworked cops: a crime cycle deepens',
      ],
      center: [
        'Crime rate climbs by {delta} points this quarter',
        'Crime indicators tick up to {value}; police chief urges patience',
      ],
      right: [
        "Crime out of control under {mayor}'s watch",
        'Soft-on-crime policies bear bitter fruit in {city}',
      ],
      tabloid: [
        'TERROR: Crime SOARS in {city}!',
        'STREETS OF FEAR — what is {mayor} doing?',
      ],
    },
    down: {
      left: [
        'Crime drop welcomed; experts caution about over-policing',
        'Community programs credited as crime eases',
      ],
      center: [
        'Crime down {delta} points after security investments',
        'Crime indicators fall to {value} this quarter',
      ],
      right: [
        'Strong leadership delivers crime reduction',
        'Tough policing pays off: crime falls in {city}',
      ],
      tabloid: [
        "Streets safer? Don't get comfortable, warn experts",
        'CRIME DIPS — but for how long?',
      ],
    },
  },
  unemployment: {
    up: {
      left: [
        'Layoffs in industrial sector hit working families hardest',
        'Job losses mount; workers demand a safety net that works',
      ],
      center: [
        'Unemployment up to {value}% this quarter',
        'Labor market softens; analysts expect slow recovery',
      ],
      right: [
        'Jobs report grim; pro-business reforms needed',
        'High taxes drive employers out of {city}',
      ],
      tabloid: [
        'JOB MASSACRE: {city} hemorrhages workers',
        'PINK SLIPS RAIN DOWN on {city}',
      ],
    },
    down: {
      left: [
        'Job growth, but wages lag behind cost of living',
        'Hiring picks up; advocates push for union protections next',
      ],
      center: [
        'Unemployment falls to {value}%',
        'Job market tightens as employers compete for workers',
      ],
      right: [
        'Strong job numbers vindicate tax cuts',
        'Business-friendly policies deliver jobs in {city}',
      ],
      tabloid: [
        '{city} JOBS BOOM!',
        'HIRING FRENZY sweeps {city}',
      ],
    },
  },
  pollution: {
    up: {
      left: [
        'Air quality declines; environmental groups demand action',
        'Children breathing dirtier air as standards slip',
      ],
      center: [
        'Pollution levels rising — health concerns grow',
        'Air quality index worsens to {value} this quarter',
      ],
      right: [
        'Environmental rules costly, businesses warn',
        'Green crackdown looming? Industry braces',
      ],
      tabloid: [
        'POISONED AIR? Residents fear for kids',
        'SMOG ALERT: is {city} choking?',
      ],
    },
    down: {
      left: [
        'Cleaner skies a victory for climate movement',
        'Air gets cleaner — but justice still needed for past harms',
      ],
      center: [
        'Pollution down to {value}; new rules show effect',
        'Air quality improves after environmental push',
      ],
      right: [
        'Pollution down — but at what cost to jobs?',
        'Environmental gains real, but industry pays the price',
      ],
      tabloid: [
        'BREATHE EASY? Maybe.',
        '{city} skies a tad clearer this quarter',
      ],
    },
  },
  inflation: {
    up: {
      left: [
        'Working families squeezed by rising prices',
        'Wage-price spiral: workers fall behind again',
      ],
      center: [
        'Inflation ticks up to {value}%',
        'Cost of living climbs; analysts watch wage data',
      ],
      right: [
        'Government spending fuels inflation, critics say',
        'Reckless budget feeds price increases',
      ],
      tabloid: [
        'PRICES SOAR — when will it end?',
        'GROCERIES GET CRAZY in {city}',
      ],
    },
    down: {
      left: [
        'Inflation cooling, but rents stay punishing',
        'Prices ease — slowly — for {city} families',
      ],
      center: [
        'Inflation eases to {value}%',
        'Price pressure abating after policy tightening',
      ],
      right: [
        'Fiscal discipline tames inflation',
        'Sound money returns to {city} — for now',
      ],
      tabloid: [
        'PRICE RELIEF at last?',
        'Wallet wins as inflation cools',
      ],
    },
  },
  gdpPerCapita: {
    up: {
      left: ['Growth strong, but who benefits?', 'Boom for the boardroom, slog for the worker'],
      center: ['Economy expanding', 'Per-capita output rises to ${value}'],
      right: ['Pro-growth agenda delivers', "Mayor's economy hums"],
      tabloid: ['BOOM TIMES?', 'CASH FLOWS in {city}'],
    },
    down: {
      left: ['Economy slows; cuts may follow', 'Growth stalls — workers feel it first'],
      center: ['Economic output dips this quarter', 'GDP per capita slides to ${value}'],
      right: ['Recession warning: business climate is hostile', 'Anti-growth policies catching up to {mayor}'],
      tabloid: ['SHRINKING SHOCK as economy slumps', 'BUST INCOMING?'],
    },
  },
  innovation: {
    up: {
      left: ['Innovation up; ensure the gains are shared, advocates say', 'Tech boom risks leaving low-skill workers behind'],
      center: ['Innovation index rises to {value}', 'Research investment paying off'],
      right: ['Free enterprise unlocks innovation in {city}', 'Pro-business climate fuels invention'],
      tabloid: ['ROBOT REVOLUTION in {city}?', 'Gizmo gold rush hits {city}'],
    },
    down: {
      left: ['Innovation slows; underfunded schools to blame, teachers say', 'Talent leaving as research cuts bite'],
      center: ['Innovation index dips to {value}', 'Patent activity cooling this quarter'],
      right: ['Red tape strangling innovation in {city}', 'Researchers flee as taxes climb'],
      tabloid: ['BRAIN DRAIN! Smart kids flee {city}', 'INNOVATION FLOP for {mayor}'],
    },
  },
  approval: {
    up: {
      left: [
        'Approval rises on progressive wins',
        '{mayor} gains support after social investments',
      ],
      center: [
        'Approval at {value}%',
        "Voters warm to {mayor}'s recent moves",
      ],
      right: [
        'Voters reward fiscal restraint',
        'Approval up for {mayor} as economy steadies',
      ],
      tabloid: [
        '{mayor} WINS BIG with voters',
        'POPULARITY EXPLODES for {mayor}!',
      ],
    },
    down: {
      left: [
        'Approval slips amid inequality concerns',
        '{mayor} bleeding support on the left',
      ],
      center: [
        "Approval at {value}%",
        "{mayor}'s numbers sag this quarter",
      ],
      right: [
        'Approval slips amid tax frustrations',
        'Voters cooling on {mayor} as wallets pinch',
      ],
      tabloid: [
        'Voters TURN ON {mayor}!',
        '{mayor} CRATERS in latest poll',
      ],
    },
  },
  education: {
    up: {
      left: ['Schools improving — but funding gaps remain', 'Education gains lift hopes in {city}'],
      center: ['Education index climbs to {value}', 'Schools post better outcomes this quarter'],
      right: ['Accountability reforms lift test scores', 'School standards rise in {city}'],
      tabloid: ['SMART KIDS RISING in {city}', 'GRADES UP — for once'],
    },
    down: {
      left: ['Underfunded schools failing kids', 'Teachers warn of crisis as schools slip'],
      center: ['Education index falls to {value}', 'School outcomes weaken this quarter'],
      right: ['Bloated bureaucracy hurts students', 'School performance slides under {mayor}'],
      tabloid: ['SCHOOLS IN CRISIS!', 'KIDS LEFT BEHIND in {city}'],
    },
  },
  health: {
    up: {
      left: ['Public health gains underline value of universal care', 'Healthier neighborhoods — keep investing'],
      center: ['Health metrics improve to {value}', 'Clinic expansion shows results'],
      right: ['Private-sector medicine delivers better care', 'Health outcomes rise without breaking the bank'],
      tabloid: ['LIVE LONGER in {city}?', 'CITY GETS HEALTHIER — for now'],
    },
    down: {
      left: ['Health outcomes worsen; uninsured suffer most', 'Public clinics overwhelmed as cuts bite'],
      center: ['Health index declines to {value}', 'Hospital strain reported across {city}'],
      right: ['Government health programs failing patients', 'Public hospitals underperform — again'],
      tabloid: ['HEALTH CRISIS GRIPS {city}', 'SICK CITY: are clinics collapsing?'],
    },
  },
  happiness: {
    up: {
      left: ['Quality of life rises — keep the momentum', "Cultural investment pays off in {city}"],
      center: ['Happiness index reaches {value}', 'Surveys show residents feeling better'],
      right: ['Stable streets and strong jobs lift spirits', 'A more prosperous {city} is a happier one'],
      tabloid: ['{city} SMILES — finally', 'GOOD VIBES sweep {city}'],
    },
    down: {
      left: ['Quality of life slips; inequality blamed', 'Residents grumble as inequality bites'],
      center: ['Happiness index falls to {value}', 'Survey: {city} mood at recent low'],
      right: ['Rising costs sap {city} morale', 'Tax fatigue saps happiness'],
      tabloid: ['{city} GLUM and getting glummer', 'SAD CITY: surveys plunge'],
    },
  },
  debt: {
    up: {
      left: ['Debt-funded social investment is the right call, economists say', 'Borrowing rises — but the city needed it'],
      center: ['Public debt climbs to ${value}M', 'City borrowing increases this quarter'],
      right: ['Debt explodes under {mayor}: a fiscal time bomb', 'Reckless spending mortgages the city'],
      tabloid: ['DEBT BOMB ticking in {city}', 'CITY ON THE HOOK for ${value}M'],
    },
    down: {
      left: ['Debt down — at what cost to services?', "Austerity not the answer, advocates warn"],
      center: ['Debt falls to ${value}M after fiscal moves', 'Borrowing levels easing'],
      right: ['Fiscal sanity returns to {city}', '{mayor} pays down debt — finally'],
      tabloid: ['CITY GETS A BREAK on debt', 'LESS RED INK for {city}'],
    },
  },
  creditRating: {
    up: {
      left: ['Credit rating up; use cheaper borrowing for people, not banks', 'Bond markets reward stability'],
      center: ['Credit rating rises to {value}', 'Borrowing costs ease as rating improves'],
      right: ['Discipline rewarded: credit rating climbs', 'Investors return as {city} cleans up its books'],
      tabloid: ['{city} CREDIT JUMPS', 'BONDS FLY — credit upgraded'],
    },
    down: {
      left: ['Downgrade penalizes city for serving residents', "Markets punish needed investments"],
      center: ['Credit rating slips to {value}', 'Downgrade may raise borrowing costs'],
      right: ['Downgrade: a damning verdict on {mayor}', 'Bond markets balk as deficits balloon'],
      tabloid: ['CREDIT CRASH for {city}', 'BOND BLOODBATH as rating drops'],
    },
  },
  inequality: {
    up: {
      left: ['Inequality widens — and so does the city we let it become', 'Rich getting richer in {city}; rest left behind'],
      center: ['Inequality index rises to {value}', 'Gap between rich and poor widens'],
      right: ['Inequality up — but so is mobility, defenders argue', "Inequality measure rises; growth lifts top earners faster"],
      tabloid: ['HAVES AND HAVE-NOTS: gap explodes', 'TWO CITIES emerging in {city}'],
    },
    down: {
      left: ['Inequality narrows — proof that policy can work', 'Gap closes as wages rise for the bottom half'],
      center: ['Inequality falls to {value}', 'Income gap narrowing this quarter'],
      right: ['Inequality drops — but at the cost of high earners fleeing', 'Equality up, but at what price to ambition?'],
      tabloid: ['GAP SHRINKS in {city}', 'RICH-POOR DIVIDE eases'],
    },
  },
}

// ============================================================================
// HELPERS — replace placeholders, format values
// ============================================================================

function fmtValue(stat: StatKey, value: number): string {
  switch (stat) {
    case 'unemployment':
    case 'inflation':
      return value.toFixed(1)
    case 'gdpPerCapita':
      return value.toFixed(0)
    case 'debt':
      return value.toFixed(0)
    default:
      return Math.round(value).toString()
  }
}

interface FillContext {
  mayor: string
  city: string
  value: number
  delta: number
  stat: StatKey
}

function fillTemplate(template: string, ctx: FillContext): string {
  return template
    .replace(/\{mayor\}/g, ctx.mayor)
    .replace(/\{city\}/g, ctx.city)
    .replace(/\{value\}/g, fmtValue(ctx.stat, ctx.value))
    .replace(/\{delta\}/g, fmtValue(ctx.stat, Math.abs(ctx.delta)))
}

// ============================================================================
// SIGNIFICANCE — what counts as a "newsworthy" change?
// ============================================================================

// Per-stat thresholds. "abs" = minimum absolute delta. "rel" = minimum relative.
const STAT_THRESHOLDS: Partial<Record<StatKey, { abs: number; rel: number }>> = {
  crime: { abs: 2, rel: 0.05 },
  unemployment: { abs: 0.8, rel: 0.05 },
  pollution: { abs: 2, rel: 0.05 },
  inflation: { abs: 0.5, rel: 0.05 },
  gdpPerCapita: { abs: 500, rel: 0.02 },
  innovation: { abs: 2, rel: 0.05 },
  approval: { abs: 2, rel: 0.05 },
  education: { abs: 2, rel: 0.05 },
  health: { abs: 2, rel: 0.05 },
  happiness: { abs: 2, rel: 0.05 },
  debt: { abs: 15, rel: 0.05 },
  creditRating: { abs: 2, rel: 0.04 },
  inequality: { abs: 2, rel: 0.05 },
}

function isSignificant(stat: StatKey, delta: number, current: number): boolean {
  const t = STAT_THRESHOLDS[stat]
  if (!t) return false
  if (Math.abs(delta) < t.abs) return false
  // Relative check is a soft override: if the absolute change is tiny but
  // the relative one is huge, still report it.
  const base = Math.max(1, Math.abs(current))
  return Math.abs(delta) / base >= t.rel || Math.abs(delta) >= t.abs
}

// Tone for a stat change. Some stats are inverse (up = bad).
const INVERSE_STATS: ReadonlySet<StatKey> = new Set<StatKey>([
  'crime',
  'unemployment',
  'pollution',
  'inflation',
  'debt',
  'inequality',
])

function toneFor(stat: StatKey, delta: number): 'good' | 'bad' | 'neutral' {
  if (delta === 0) return 'neutral'
  const isBadDirection = INVERSE_STATS.has(stat) ? delta > 0 : delta < 0
  return isBadDirection ? 'bad' : 'good'
}

// ============================================================================
// OUTLET SELECTION — pick an outlet to "carry" a story, weighted by bias affinity
// ============================================================================

// Topic affinity: which bias tends to pick up which kinds of stories?
const TOPIC_AFFINITY: Partial<Record<StatKey, Partial<Record<MediaBias, number>>>> = {
  crime: { left: 0.7, center: 1, right: 1.5, tabloid: 1.8 },
  unemployment: { left: 1.4, center: 1, right: 1.2, tabloid: 1.1 },
  pollution: { left: 1.7, center: 1, right: 0.7, tabloid: 1.2 },
  inflation: { left: 1.1, center: 1, right: 1.4, tabloid: 1.5 },
  gdpPerCapita: { left: 0.9, center: 1, right: 1.4, tabloid: 0.9 },
  innovation: { left: 0.9, center: 1, right: 1.3, tabloid: 0.7 },
  approval: { left: 1, center: 1.2, right: 1, tabloid: 1.6 },
  education: { left: 1.4, center: 1, right: 1, tabloid: 0.8 },
  health: { left: 1.5, center: 1, right: 0.9, tabloid: 1 },
  happiness: { left: 1, center: 1.1, right: 0.9, tabloid: 1.2 },
  debt: { left: 0.9, center: 1, right: 1.7, tabloid: 1.1 },
  creditRating: { left: 0.7, center: 1.2, right: 1.4, tabloid: 0.6 },
  inequality: { left: 1.9, center: 1, right: 0.6, tabloid: 1 },
}

interface WeightedOutlet {
  outlet: NewsOutlet
  weight: number
}

function pickOutletForTopic(
  outlets: NewsOutlet[],
  stat: StatKey,
  tone: 'good' | 'bad' | 'neutral',
  excludeIds: ReadonlySet<string>,
  rng: () => number,
): NewsOutlet | null {
  const affinity = TOPIC_AFFINITY[stat] ?? {}
  const weighted: WeightedOutlet[] = outlets
    .filter((o) => !excludeIds.has(o.id))
    .map((o) => {
      // Outlets aligned with the mayor are likelier to soften bad news, and
      // hostile ones are likelier to amplify bad news.
      const favorTilt =
        tone === 'bad' ? (-o.favor / 200) : tone === 'good' ? (o.favor / 200) : 0
      const baseAffinity = affinity[o.bias] ?? 1
      const weight = Math.max(0.1, o.influence * baseAffinity * (1 + favorTilt))
      return { outlet: o, weight }
    })
  const picked = weightedPick(weighted, rng)
  return picked ? picked.outlet : null
}

// ============================================================================
// HEADLINE BUILDING — turn a stat change into a NewsItem
// ============================================================================

function pickTemplate(
  stat: StatKey,
  direction: Direction,
  bias: MediaBias,
  rng: () => number,
): string | null {
  const byDir = STAT_TEMPLATES[stat]
  if (!byDir) return null
  const set = byDir[direction]
  if (!set) return null
  const arr = set[bias]
  const pool = arr && arr.length > 0 ? arr : set.center
  if (!pool || pool.length === 0) return null
  return pool[Math.floor(rng() * pool.length)]
}

function buildStatHeadline(
  outlet: NewsOutlet,
  change: StatChange,
  ctx: FillContext,
  direction: Direction,
  rng: () => number,
): NewsItem | null {
  const tpl = pickTemplate(change.stat, direction, outlet.bias, rng)
  if (!tpl) return null
  const headline = fillTemplate(tpl, ctx)
  return {
    turn: 0, // caller sets the real turn
    outletId: outlet.id,
    headline,
    tone: toneFor(change.stat, change.delta),
    tags: [change.stat],
  }
}

// ============================================================================
// EVENT HEADLINES — react to a resolved event/choice
// ============================================================================

interface EventTemplateSet extends TemplateSet {}

// Generic event template fallbacks, keyed by a coarse mood derived from the
// choice outcome and net stat effect.
const EVENT_FALLBACK: Record<'good' | 'bad' | 'neutral', EventTemplateSet> = {
  good: {
    left: [
      '{mayor} sides with workers on {title}',
      '{mayor} chooses fairness in {title} fight',
    ],
    center: [
      '{title}: {mayor} acts',
      '{mayor} resolves {title}',
    ],
    right: [
      '{mayor} avoids disaster on {title}',
      'Pragmatism wins on {title}',
    ],
    tabloid: [
      '{mayor} pulls off {title} stunt',
      'DRAMA: {mayor} handles {title}',
    ],
  },
  bad: {
    left: [
      '{mayor} backs business in {title} clash',
      'Workers betrayed in {title} decision, advocates say',
    ],
    center: [
      '{title} ends with controversy',
      '{mayor} takes heat over {title}',
    ],
    right: [
      'Costly choice on {title} sets bad precedent',
      '{mayor} caves on {title}',
    ],
    tabloid: [
      'MAYOR CAVES on {title}',
      'BACKLASH GROWS over {mayor} {title} call',
    ],
  },
  neutral: {
    left: ['{title}: opportunity for bolder action missed', '{mayor} settles {title} quietly'],
    center: ['{title} settled', '{mayor} responds to {title}'],
    right: ['{title}: {mayor} muddles through', "Status quo wins on {title}"],
    tabloid: ['INSIDE: what really happened with {title}', '{title} — the untold story'],
  },
}

// Some specific event titles get hand-crafted lines.
const EVENT_TITLE_TEMPLATES: Record<string, EventTemplateSet> = {
  'teachers threaten strike': {
    left: [
      'Mayor sides with teachers; classrooms stay open',
      'Strike averted as {mayor} backs educators',
    ],
    center: [
      "Teachers' strike averted",
      'Schools to stay open after deal with teachers',
    ],
    right: [
      'Costly union concession sets dangerous precedent',
      'Teachers extract big raise from {mayor}',
    ],
    tabloid: [
      'MAYOR CAVES to union demands',
      'TEACHERS WIN as {mayor} folds',
    ],
  },
}

function classifyEventOutcome(choice: EventChoice): 'good' | 'bad' | 'neutral' {
  // Sum the deltas of stats, weighting inverse stats opposite, to pick a tone.
  let score = 0
  for (const [key, raw] of Object.entries(choice.effects)) {
    if (raw === undefined) continue
    const stat = key as StatKey
    const sign = INVERSE_STATS.has(stat) ? -1 : 1
    score += (raw as number) * sign
  }
  // Cost penalties bias things slightly negative.
  if (choice.cost && choice.cost > 0) score -= choice.cost / 50
  if (score > 2) return 'good'
  if (score < -2) return 'bad'
  return 'neutral'
}

function buildEventHeadline(
  outlet: NewsOutlet,
  event: GameEvent,
  choice: EventChoice,
  ctx: { mayor: string; city: string },
  rng: () => number,
): NewsItem {
  const titleKey = event.title.toLowerCase()
  const tone = classifyEventOutcome(choice)
  const set = EVENT_TITLE_TEMPLATES[titleKey] ?? EVENT_FALLBACK[tone]
  const pool = set[outlet.bias].length > 0 ? set[outlet.bias] : set.center
  const tpl = pool[Math.floor(rng() * pool.length)]
  const headline = tpl
    .replace(/\{mayor\}/g, ctx.mayor)
    .replace(/\{city\}/g, ctx.city)
    .replace(/\{title\}/g, event.title)
  return {
    turn: 0,
    outletId: outlet.id,
    headline,
    tone,
    tags: ['event', event.category, event.id],
  }
}

// ============================================================================
// PUBLIC: generateTurnHeadlines
// ============================================================================

export function generateTurnHeadlines(
  state: GameState,
  changes: StatChange[],
  resolvedEvent?: { event: GameEvent; choice: EventChoice },
): NewsItem[] {
  const rng = Math.random
  const ctxBase = {
    mayor: state.mayorName || 'the Mayor',
    city: state.cityName || 'the City',
  }
  const turn = state.turn
  const outlets = state.outlets
  if (outlets.length === 0) return []

  const items: NewsItem[] = []
  const usedOutletsThisTurn = new Set<string>()

  // 1) Build candidate stat-change headlines, sorted by absolute impact so the
  // biggest stories surface first if we cap.
  const sortedChanges = [...changes]
    .filter((c) => isSignificant(c.stat, c.delta, state.stats[c.stat] as number))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  // Cap to ~5 stat headlines per turn; aim for 1-3 outlets covering distinct topics.
  const MAX_STAT_HEADLINES = 5
  const coveredStats = new Set<StatKey>()
  for (const change of sortedChanges) {
    if (coveredStats.has(change.stat)) continue
    if (items.length >= MAX_STAT_HEADLINES) break

    const direction: Direction = change.delta > 0 ? 'up' : 'down'
    const tone = toneFor(change.stat, change.delta)
    const outlet = pickOutletForTopic(
      outlets,
      change.stat,
      tone,
      usedOutletsThisTurn.size >= outlets.length - 1
        ? new Set<string>() // allow reuse if we'd otherwise run out
        : usedOutletsThisTurn,
      rng,
    )
    if (!outlet) continue

    const ctx: FillContext = {
      ...ctxBase,
      stat: change.stat,
      value: state.stats[change.stat] as number,
      delta: change.delta,
    }
    const item = buildStatHeadline(outlet, change, ctx, direction, rng)
    if (item) {
      items.push({ ...item, turn })
      coveredStats.add(change.stat)
      usedOutletsThisTurn.add(outlet.id)
    }
  }

  // 2) If there was an event, add 1-2 event headlines from outlets not yet used
  // (prefer fresh voices for variety).
  if (resolvedEvent) {
    const eventTone = classifyEventOutcome(resolvedEvent.choice)
    const wantTwo = outlets.length >= 2
    const numEventHeadlines = wantTwo ? 2 : 1

    for (let i = 0; i < numEventHeadlines; i++) {
      const outlet = pickOutletForTopic(
        outlets,
        // Use 'approval' affinity weights as a proxy for event coverage —
        // every outlet has at least some interest, with tabloids favored.
        'approval',
        eventTone,
        i === 0 ? new Set<string>() : usedOutletsThisTurn,
        rng,
      )
      if (!outlet) break
      const item = buildEventHeadline(
        outlet,
        resolvedEvent.event,
        resolvedEvent.choice,
        ctxBase,
        rng,
      )
      items.push({ ...item, turn })
      usedOutletsThisTurn.add(outlet.id)
    }
  }

  // 3) Hard cap at 6 to keep the dashboard readable.
  return items.slice(0, 6)
}

// ============================================================================
// PUBLIC: updateOutletFavor
// ============================================================================

function changeOf(changes: StatChange[], stat: StatKey): number {
  let sum = 0
  for (const c of changes) {
    if (c.stat === stat) sum += c.delta
  }
  return sum
}

export function updateOutletFavor(
  outlets: NewsOutlet[],
  changes: StatChange[],
  resolvedEvent?: { event: GameEvent; choice: EventChoice },
): NewsOutlet[] {
  // Read the world via changes (we don't have full state here, but stat changes
  // and the event are enough to score satisfaction).
  const crimeDelta = changeOf(changes, 'crime')
  const inequalityDelta = changeOf(changes, 'inequality')
  const gdpDelta = changeOf(changes, 'gdpPerCapita')
  const inflationDelta = changeOf(changes, 'inflation')
  const unemploymentDelta = changeOf(changes, 'unemployment')
  const debtDelta = changeOf(changes, 'debt')
  const happinessDelta = changeOf(changes, 'happiness')
  const pollutionDelta = changeOf(changes, 'pollution')
  const approvalDelta = changeOf(changes, 'approval')

  // The event "policyChange" side-effects help score the policy-style scoring.
  const policyChange = resolvedEvent?.choice.side?.policyChange
  const eventCost = resolvedEvent?.choice.cost ?? 0
  const eventTone = resolvedEvent ? classifyEventOutcome(resolvedEvent.choice) : 'neutral'
  const mediaFavorFromEvent = resolvedEvent?.choice.side?.mediaFavor ?? {}
  const isScandal =
    resolvedEvent?.event.category === 'political' ||
    resolvedEvent?.event.id?.toLowerCase().includes('scandal') ||
    resolvedEvent?.event.title?.toLowerCase().includes('scandal') ||
    false

  return outlets.map((outlet) => {
    let delta = 0
    switch (outlet.bias) {
      case 'left': {
        if (inequalityDelta < -1) delta += 1
        if (pollutionDelta < -1) delta += 1
        if (happinessDelta > 1) delta += 1
        if (unemploymentDelta < -0.5) delta += 1
        if (policyChange?.minimumWage !== undefined && policyChange.minimumWage > 0) delta += 1
        if (policyChange?.healthcare === 'universal') delta += 1
        if (policyChange?.healthcare === 'private') delta -= 2
        if (policyChange?.emissionStandards === 'lax') delta -= 1
        if (inequalityDelta > 1) delta -= 1
        if (eventCost > 0 && eventTone === 'good') delta += 1 // spending on good policy is a plus
        break
      }
      case 'right': {
        if (crimeDelta < -1) delta += 1
        if (gdpDelta > 100) delta += 1
        if (debtDelta < -5) delta += 1
        if (inflationDelta < -0.3) delta += 1
        if (policyChange?.drugPolicy === 'punitive') delta += 1
        if (policyChange?.immigration === 'restrictive') delta += 1
        if (debtDelta > 10) delta -= 2
        if (crimeDelta > 1) delta -= 1
        if (policyChange?.rentControl === 'strict') delta -= 1
        if (policyChange?.healthcare === 'universal') delta -= 1
        break
      }
      case 'center': {
        const inflationStable = Math.abs(inflationDelta) < 0.4
        if (gdpDelta > 50 && inflationStable) delta += 1
        if (approvalDelta > 1 && unemploymentDelta <= 0) delta += 1
        if (gdpDelta < -50 && inflationDelta > 0.4) delta -= 1
        if (debtDelta > 15 && gdpDelta < 0) delta -= 1
        if (eventTone === 'good') delta += 1
        if (eventTone === 'bad') delta -= 1
        break
      }
      case 'tabloid': {
        // Indifferent to policy substance — chases drama and weakness.
        if (isScandal) delta += eventTone === 'bad' ? -2 : 2
        if (approvalDelta < -2) delta -= 2 // pile-on when mayor is wounded
        if (approvalDelta > 3) delta += 1
        if (crimeDelta > 2) delta -= 1 // crime panics sell papers and attack mayor
        break
      }
    }

    // Explicit per-outlet adjustments from the event payload override the rest.
    if (mediaFavorFromEvent[outlet.id] !== undefined) {
      delta += mediaFavorFromEvent[outlet.id]
    }

    // Clamp the per-turn delta itself so favor can't whiplash by more than 3.
    delta = clamp(delta, -3, 3)
    const newFavor = clamp(outlet.favor + delta, -100, 100)
    return { ...outlet, favor: newFavor }
  })
}

// ============================================================================
// PUBLIC: citizenEventToNews
// ============================================================================

export function citizenEventToNews(
  event: { headline: string; tone: 'good' | 'bad' | 'neutral'; districtId?: string },
  turn: number,
  outletId?: string,
): NewsItem {
  const tags = ['citizen']
  if (event.districtId) tags.push(event.districtId)
  return {
    turn,
    outletId,
    headline: event.headline,
    tone: event.tone,
    tags,
  }
}

// ============================================================================
// PUBLIC: pickLeadHeadline
// ============================================================================

// Higher = more leadworthy.
function leadScore(item: NewsItem, outletInfluenceById: Map<string, number>): number {
  let score = 0
  if (item.tone === 'bad') score += 100
  else if (item.tone === 'good') score += 50
  else score += 10
  if (item.outletId) {
    score += outletInfluenceById.get(item.outletId) ?? 0
  }
  // Event-tagged stories are inherently more "lead" than ambient stat reports.
  if (item.tags?.includes('event')) score += 25
  return score
}

export function pickLeadHeadline(items: NewsItem[]): NewsItem | null {
  if (items.length === 0) return null
  // We don't have outlet objects here, so weight by tag/tone alone for influence.
  // The caller can re-rank with real outlet data if it wants; this is a sensible default.
  const influenceById = new Map<string, number>()
  let best: NewsItem | null = null
  let bestScore = -Infinity
  for (const item of items) {
    const score = leadScore(item, influenceById)
    if (score > bestScore) {
      best = item
      bestScore = score
    }
  }
  return best
}
