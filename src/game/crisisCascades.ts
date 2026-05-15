import type { GameState } from './types'

// ============================================================================
// Crisis Cascades
// ----------------------------------------------------------------------------
// A cascade is a chain reaction: when one event resolves, it can schedule a
// follow-up event some turns later. That follow-up may itself trigger more.
// The graph below encodes the "follow-up" relationships — every edge has a
// base probability, a delay window, and optionally a narrative reason or a
// runtime condition.
//
// The cascade system is deliberately probabilistic, so identical playthroughs
// diverge: a pandemic may bleed into a bond market panic in one run and
// nothing at all in another.
// ============================================================================

export interface CascadeNode {
  triggerId: string // event id that fires this node
  followUps: Array<{
    eventId: string // event id to trigger
    probability: number // 0-1
    minTurnsLater: number // earliest turn delta to fire
    maxTurnsLater: number // latest turn delta to fire
    condition?: (s: GameState) => boolean
    notes?: string // narrative reason
  }>
}

export interface ScheduledEvent {
  eventId: string
  fireOnTurn: number
  reason: string // why it's scheduled
}

// ----------------------------------------------------------------------------
// CASCADE GRAPH
// ----------------------------------------------------------------------------
// Each node lists realistic follow-up events. Probabilities are base values
// before state-conditional multipliers (applied in scheduleCascade).
// ----------------------------------------------------------------------------

export const CASCADE_GRAPH: CascadeNode[] = [
  // ----- CRISES -------------------------------------------------------------
  {
    triggerId: 'pandemic',
    followUps: [
      {
        eventId: 'bond_market',
        probability: 0.6,
        minTurnsLater: 2,
        maxTurnsLater: 4,
        notes: 'Economy weakens, lenders nervous',
      },
      {
        eventId: 'crime_spike',
        probability: 0.35,
        minTurnsLater: 1,
        maxTurnsLater: 3,
        notes: 'Social fabric strained, desperation rises',
      },
      {
        eventId: 'teacher_strike',
        probability: 0.4,
        minTurnsLater: 2,
        maxTurnsLater: 5,
        notes: 'Education sector exhausted by remote schooling',
      },
      {
        eventId: 'budget_crisis',
        probability: 0.3,
        minTurnsLater: 3,
        maxTurnsLater: 6,
        notes: 'Emergency spending drains the city reserves',
      },
      {
        eventId: 'healthcare_burnout',
        probability: 0.5,
        minTurnsLater: 1,
        maxTurnsLater: 3,
        notes: 'Hospitals are pushed past their breaking point',
      },
      {
        eventId: 'virus_variant',
        probability: 0.35,
        minTurnsLater: 2,
        maxTurnsLater: 5,
        notes: 'A new strain emerges before the wave is over',
      },
    ],
  },

  {
    triggerId: 'hurricane',
    followUps: [
      {
        eventId: 'industrial_spill',
        probability: 0.25,
        minTurnsLater: 1,
        maxTurnsLater: 2,
        notes: 'Storm damages industrial facilities',
      },
      {
        eventId: 'bond_market',
        probability: 0.45,
        minTurnsLater: 3,
        maxTurnsLater: 6,
        notes: 'Recovery costs strain the budget',
      },
      {
        eventId: 'protest',
        probability: 0.3,
        minTurnsLater: 2,
        maxTurnsLater: 4,
        notes: 'Anger over emergency response',
      },
      {
        eventId: 'water_contamination',
        probability: 0.25,
        minTurnsLater: 1,
        maxTurnsLater: 3,
        notes: 'Flooding compromises water infrastructure',
      },
      {
        eventId: 'power_grid_failure',
        probability: 0.3,
        minTurnsLater: 0,
        maxTurnsLater: 2,
        notes: 'Downed lines, transformers fried',
      },
      {
        eventId: 'coastal_erosion',
        probability: 0.35,
        minTurnsLater: 2,
        maxTurnsLater: 6,
        notes: 'Shoreline gives way under storm surge',
      },
    ],
  },

  {
    triggerId: 'industrial_spill',
    followUps: [
      {
        eventId: 'protest',
        probability: 0.6,
        minTurnsLater: 1,
        maxTurnsLater: 3,
        notes: 'Public outrage at contamination',
      },
      {
        eventId: 'bond_market',
        probability: 0.3,
        minTurnsLater: 4,
        maxTurnsLater: 8,
        notes: 'Litigation costs and reputational damage',
      },
      {
        eventId: 'river_pollution',
        probability: 0.45,
        minTurnsLater: 1,
        maxTurnsLater: 2,
        notes: 'Spill contaminates the waterway',
      },
      {
        eventId: 'cancer_cluster',
        probability: 0.2,
        minTurnsLater: 6,
        maxTurnsLater: 12,
        notes: 'Long-tail health effects emerge',
      },
    ],
  },

  {
    triggerId: 'crime_spike',
    followUps: [
      {
        eventId: 'protest',
        probability: 0.4,
        minTurnsLater: 2,
        maxTurnsLater: 4,
        notes: 'Communities demand safety reforms',
      },
      {
        eventId: 'teacher_strike',
        probability: 0.15,
        minTurnsLater: 3,
        maxTurnsLater: 5,
        notes: 'Teachers fear for school safety',
      },
      {
        eventId: 'mass_shooting',
        probability: 0.1,
        minTurnsLater: 1,
        maxTurnsLater: 4,
        notes: 'Escalating violence reaches a tragic peak',
        condition: (s) => s.stats.crime > 55,
      },
      {
        eventId: 'surveillance_expansion',
        probability: 0.25,
        minTurnsLater: 2,
        maxTurnsLater: 5,
        notes: 'Police push for new monitoring powers',
      },
    ],
  },

  {
    triggerId: 'budget_crisis',
    followUps: [
      {
        eventId: 'protest',
        probability: 0.5,
        minTurnsLater: 1,
        maxTurnsLater: 3,
        notes: 'Service cuts trigger public anger',
      },
      {
        eventId: 'teacher_strike',
        probability: 0.45,
        minTurnsLater: 2,
        maxTurnsLater: 4,
        notes: 'Education cuts spark union action',
      },
      {
        eventId: 'scandal',
        probability: 0.25,
        minTurnsLater: 4,
        maxTurnsLater: 8,
        notes: 'Investigations under fiscal stress',
      },
      {
        eventId: 'bond_market',
        probability: 0.55,
        minTurnsLater: 1,
        maxTurnsLater: 3,
        notes: 'Rating agencies smell distress',
      },
      {
        eventId: 'recall_threatened',
        probability: 0.2,
        minTurnsLater: 4,
        maxTurnsLater: 8,
        notes: 'Opponents seize the moment',
        condition: (s) => s.stats.approval < 40,
      },
    ],
  },

  // ----- ECONOMIC -----------------------------------------------------------
  {
    triggerId: 'tech_hq',
    followUps: [
      {
        eventId: 'protest',
        probability: 0.15,
        minTurnsLater: 2,
        maxTurnsLater: 3,
        notes: 'Gentrification fears boil over',
        condition: (s) => s.stats.inequality > 60,
      },
      {
        eventId: 'housing_bubble_warning',
        probability: 0.3,
        minTurnsLater: 3,
        maxTurnsLater: 6,
        notes: 'New high-paid jobs push rents up',
      },
      {
        eventId: 'generational_housing',
        probability: 0.2,
        minTurnsLater: 4,
        maxTurnsLater: 8,
        notes: 'Locals priced out by newcomers',
      },
      {
        eventId: 'startup_ipo',
        probability: 0.25,
        minTurnsLater: 3,
        maxTurnsLater: 7,
        notes: 'Tech momentum attracts more capital',
      },
    ],
  },

  {
    triggerId: 'factory_expansion',
    followUps: [
      {
        eventId: 'industrial_spill',
        probability: 0.15,
        minTurnsLater: 3,
        maxTurnsLater: 6,
        notes: 'More activity, more risk',
      },
      {
        eventId: 'protest',
        probability: 0.12,
        minTurnsLater: 4,
        maxTurnsLater: 6,
        notes: 'Neighbors object to noise and emissions',
        condition: (s) => s.stats.pollution > 50,
      },
      {
        eventId: 'river_pollution',
        probability: 0.1,
        minTurnsLater: 4,
        maxTurnsLater: 8,
        notes: 'Effluent levels creep up',
      },
    ],
  },

  {
    triggerId: 'bond_market',
    followUps: [
      {
        eventId: 'budget_crisis',
        probability: 0.35,
        minTurnsLater: 2,
        maxTurnsLater: 5,
        notes: 'Higher borrowing costs blow a hole in the budget',
      },
      {
        eventId: 'currency_depreciation',
        probability: 0.2,
        minTurnsLater: 1,
        maxTurnsLater: 3,
        notes: 'Confidence wobbles spread to FX markets',
      },
      {
        eventId: 'protest',
        probability: 0.2,
        minTurnsLater: 3,
        maxTurnsLater: 6,
        notes: 'Austerity bites the working class',
      },
    ],
  },

  {
    triggerId: 'federal_grant',
    followUps: [
      {
        eventId: 'tech_hq',
        probability: 0.2,
        minTurnsLater: 4,
        maxTurnsLater: 6,
        notes: 'Modernization momentum attracts investment',
      },
      {
        eventId: 'bike_lane_network',
        probability: 0.25,
        minTurnsLater: 2,
        maxTurnsLater: 5,
        notes: 'Transit funds enable cycling infrastructure',
      },
      {
        eventId: 'university_proposal',
        probability: 0.15,
        minTurnsLater: 5,
        maxTurnsLater: 9,
        notes: 'Federal partnership opens academic doors',
      },
    ],
  },

  {
    triggerId: 'ai_initiative',
    followUps: [
      {
        eventId: 'protest',
        probability: 0.25,
        minTurnsLater: 2,
        maxTurnsLater: 4,
        notes: 'Job displacement fear',
      },
      {
        eventId: 'tech_hq',
        probability: 0.35,
        minTurnsLater: 3,
        maxTurnsLater: 6,
        notes: 'AI investments attract other tech firms',
      },
      {
        eventId: 'ai_hiring_bias',
        probability: 0.3,
        minTurnsLater: 2,
        maxTurnsLater: 5,
        notes: 'Algorithmic bias issues surface',
      },
      {
        eventId: 'open_source_government',
        probability: 0.2,
        minTurnsLater: 4,
        maxTurnsLater: 8,
        notes: 'Transparency advocates push back',
      },
    ],
  },

  // ----- SOCIAL -------------------------------------------------------------
  {
    triggerId: 'scandal',
    followUps: [
      {
        eventId: 'recall_threatened',
        probability: 0.5,
        minTurnsLater: 2,
        maxTurnsLater: 4,
        notes: 'Opponents move to remove you',
      },
      {
        eventId: 'protest',
        probability: 0.35,
        minTurnsLater: 1,
        maxTurnsLater: 3,
        notes: 'Public demands accountability',
      },
      {
        eventId: 'leaked_documents',
        probability: 0.3,
        minTurnsLater: 1,
        maxTurnsLater: 4,
        notes: 'More inconvenient truths surface',
      },
      {
        eventId: 'lobbying_disclosure',
        probability: 0.25,
        minTurnsLater: 3,
        maxTurnsLater: 6,
        notes: 'Reform momentum builds',
      },
    ],
  },

  {
    triggerId: 'protest',
    followUps: [
      {
        eventId: 'scandal',
        probability: 0.15,
        minTurnsLater: 4,
        maxTurnsLater: 7,
        notes: 'Pressure exposes wrongdoing',
        condition: (s) => s.stats.approval < 35,
      },
      {
        eventId: 'recall_threatened',
        probability: 0.2,
        minTurnsLater: 3,
        maxTurnsLater: 6,
        notes: 'Sustained anger becomes a campaign',
        condition: (s) => s.stats.approval < 30,
      },
      {
        eventId: 'racial_tensions',
        probability: 0.2,
        minTurnsLater: 1,
        maxTurnsLater: 3,
        notes: 'Underlying tensions surface in the crowd',
      },
      {
        eventId: 'crime_spike',
        probability: 0.15,
        minTurnsLater: 2,
        maxTurnsLater: 4,
        notes: 'Unrest spills into property crime',
      },
    ],
  },

  {
    triggerId: 'teacher_strike',
    followUps: [
      {
        eventId: 'protest',
        probability: 0.3,
        minTurnsLater: 2,
        maxTurnsLater: 4,
        notes: 'Parents and students join the picket lines',
      },
      {
        eventId: 'budget_crisis',
        probability: 0.2,
        minTurnsLater: 3,
        maxTurnsLater: 6,
        notes: 'Settlement strains the budget',
      },
      {
        eventId: 'mental_health_report',
        probability: 0.15,
        minTurnsLater: 4,
        maxTurnsLater: 8,
        notes: 'Disrupted schooling shows up in youth metrics',
      },
    ],
  },

  // ----- ENVIRONMENTAL -----------------------------------------------------
  {
    triggerId: 'heatwave',
    followUps: [
      {
        eventId: 'power_grid_failure',
        probability: 0.35,
        minTurnsLater: 0,
        maxTurnsLater: 2,
        notes: 'AC demand overwhelms the grid',
      },
      {
        eventId: 'wildfire_season',
        probability: 0.3,
        minTurnsLater: 1,
        maxTurnsLater: 4,
        notes: 'Tinder-dry conditions ignite',
      },
      {
        eventId: 'protest',
        probability: 0.15,
        minTurnsLater: 1,
        maxTurnsLater: 3,
        notes: 'Anger at lack of cooling centers',
        condition: (s) => s.stats.inequality > 55,
      },
    ],
  },

  // ----- OPPORTUNITY -------------------------------------------------------
  {
    triggerId: 'green_bond',
    followUps: [
      {
        eventId: 'bond_market',
        probability: 0.25,
        minTurnsLater: 3,
        maxTurnsLater: 6,
        notes: 'Added debt service draws agency attention',
      },
      {
        eventId: 'plastic_ban',
        probability: 0.2,
        minTurnsLater: 2,
        maxTurnsLater: 5,
        notes: 'Green agenda momentum',
      },
    ],
  },

  {
    triggerId: 'university_proposal',
    followUps: [
      {
        eventId: 'tech_hq',
        probability: 0.2,
        minTurnsLater: 5,
        maxTurnsLater: 9,
        notes: 'Talent pipeline attracts employers',
      },
      {
        eventId: 'startup_ipo',
        probability: 0.15,
        minTurnsLater: 6,
        maxTurnsLater: 12,
        notes: 'Campus spinoffs reach maturity',
      },
      {
        eventId: 'university_partnership',
        probability: 0.3,
        minTurnsLater: 3,
        maxTurnsLater: 6,
        notes: 'Foreign campuses court a partnership',
      },
    ],
  },

  // ----- POLITICAL / FOREIGN -----------------------------------------------
  {
    triggerId: 'foreign_visit',
    followUps: [
      {
        eventId: 'consulate_opening',
        probability: 0.25,
        minTurnsLater: 3,
        maxTurnsLater: 6,
        notes: 'Diplomatic ties firm up',
      },
      {
        eventId: 'sister_city_mission',
        probability: 0.3,
        minTurnsLater: 4,
        maxTurnsLater: 8,
        notes: 'Twinning blossoms into a working delegation',
      },
      {
        eventId: 'direct_flight',
        probability: 0.25,
        minTurnsLater: 2,
        maxTurnsLater: 5,
        notes: 'Travel demand justifies a new route',
      },
    ],
  },

  // ----- CRISIS (extended) -------------------------------------------------
  {
    triggerId: 'cyberattack',
    followUps: [
      {
        eventId: 'scandal',
        probability: 0.2,
        minTurnsLater: 2,
        maxTurnsLater: 4,
        notes: 'Breach review uncovers negligence',
      },
      {
        eventId: 'surveillance_expansion',
        probability: 0.3,
        minTurnsLater: 1,
        maxTurnsLater: 3,
        notes: 'Security hawks demand response',
      },
      {
        eventId: 'protest',
        probability: 0.2,
        minTurnsLater: 2,
        maxTurnsLater: 5,
        notes: 'Citizens fear data exposure',
      },
    ],
  },

  {
    triggerId: 'water_contamination',
    followUps: [
      {
        eventId: 'protest',
        probability: 0.5,
        minTurnsLater: 1,
        maxTurnsLater: 3,
        notes: 'Public outrage at unsafe water',
      },
      {
        eventId: 'cancer_cluster',
        probability: 0.15,
        minTurnsLater: 8,
        maxTurnsLater: 14,
        notes: 'Long-term health impact emerges',
      },
      {
        eventId: 'bond_market',
        probability: 0.25,
        minTurnsLater: 3,
        maxTurnsLater: 6,
        notes: 'Remediation costs strain finances',
      },
    ],
  },
]

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

/**
 * Apply state-conditional probability multipliers to a base probability.
 * The multipliers reflect that a city already on edge is more vulnerable to
 * certain follow-ups: e.g. high inequality fuels protests, low approval invites
 * scandal narratives, heavy debt amplifies bond market panic.
 */
function applyStateMultiplier(
  eventId: string,
  baseProbability: number,
  state: GameState,
): number {
  let multiplier = 1
  const stats = state.stats

  switch (eventId) {
    case 'protest': {
      const m = 1 + (stats.inequality - 50) / 50
      multiplier = clamp(m, 0.3, 2)
      break
    }
    case 'scandal': {
      const m = 1 + (60 - stats.approval) / 50
      multiplier = clamp(m, 0.5, 2)
      break
    }
    case 'bond_market': {
      const denominator = Math.max(
        (stats.gdpPerCapita * stats.population) / 1e6,
        1,
      )
      const ratio = stats.debt / denominator
      const m = 1 + (ratio - 0.4)
      multiplier = clamp(m, 0.5, 2.5)
      break
    }
    case 'pandemic':
    case 'virus_variant':
    case 'healthcare_burnout': {
      const m = 1 + (40 - stats.health) / 50
      multiplier = clamp(m, 0.5, 2)
      break
    }
    case 'recall_threatened': {
      const m = 1 + (50 - stats.approval) / 40
      multiplier = clamp(m, 0.5, 2.5)
      break
    }
    case 'crime_spike': {
      const m = 1 + (stats.crime - 50) / 60
      multiplier = clamp(m, 0.5, 2)
      break
    }
    case 'industrial_spill':
    case 'river_pollution': {
      const m = 1 + (stats.pollution - 50) / 70
      multiplier = clamp(m, 0.6, 1.8)
      break
    }
    case 'teacher_strike': {
      const m = 1 + (50 - stats.education) / 60
      multiplier = clamp(m, 0.6, 1.8)
      break
    }
    case 'budget_crisis': {
      const treasuryDrag = stats.treasury < 0 ? 1.5 : 1
      const m = treasuryDrag * (1 + (40 - stats.creditRating) / 80)
      multiplier = clamp(m, 0.5, 2.2)
      break
    }
    default:
      multiplier = 1
  }

  const final = baseProbability * multiplier
  return clamp(final, 0, 0.95)
}

function pickTurnInWindow(
  currentTurn: number,
  minTurnsLater: number,
  maxTurnsLater: number,
): number {
  const lo = Math.max(0, Math.floor(minTurnsLater))
  const hi = Math.max(lo, Math.floor(maxTurnsLater))
  const span = hi - lo
  const offset = span === 0 ? 0 : Math.floor(Math.random() * (span + 1))
  return currentTurn + lo + offset
}

// ----------------------------------------------------------------------------
// PUBLIC API
// ----------------------------------------------------------------------------

/**
 * Given a just-resolved event id, roll for follow-up events and return any
 * scheduled cascades. Each call is independent — callers should merge the
 * returned list into their persistent scheduling queue.
 */
export function scheduleCascade(
  resolvedEventId: string,
  currentTurn: number,
  state: GameState,
): ScheduledEvent[] {
  const node = CASCADE_GRAPH.find((n) => n.triggerId === resolvedEventId)
  if (!node) return []

  const result: ScheduledEvent[] = []

  for (const followUp of node.followUps) {
    // Skip if a runtime condition is provided and false right now.
    if (followUp.condition) {
      try {
        if (!followUp.condition(state)) continue
      } catch {
        // Defensive: never let a malformed condition crash scheduling.
        continue
      }
    }

    const probability = applyStateMultiplier(
      followUp.eventId,
      followUp.probability,
      state,
    )

    if (Math.random() >= probability) continue

    const fireOnTurn = pickTurnInWindow(
      currentTurn,
      followUp.minTurnsLater,
      followUp.maxTurnsLater,
    )

    result.push({
      eventId: followUp.eventId,
      fireOnTurn,
      reason: followUp.notes ?? `${resolvedEventId} -> ${followUp.eventId}`,
    })
  }

  return result
}

/**
 * Pull the next due cascade event whose fireOnTurn matches the current turn.
 * If a corresponding cascade edge has a condition function we re-check it at
 * fire time so stale schedules don't fire after the city recovers.
 * Returns the event (if any) and the remaining queue.
 */
export function popDueCascadeEvent(
  scheduled: ScheduledEvent[],
  currentTurn: number,
  state: GameState,
): { event: ScheduledEvent | null; remaining: ScheduledEvent[] } {
  for (let i = 0; i < scheduled.length; i++) {
    const candidate = scheduled[i]
    if (candidate.fireOnTurn !== currentTurn) continue

    // Re-check any condition tied to the candidate's eventId across the graph.
    // We look up the *first* node whose followUps reference this eventId with
    // a condition matching it — best-effort, since the original edge isn't
    // tracked on the schedule entry.
    let conditionHolds = true
    for (const node of CASCADE_GRAPH) {
      const edge = node.followUps.find(
        (fu) => fu.eventId === candidate.eventId && fu.condition,
      )
      if (edge && edge.condition) {
        try {
          if (!edge.condition(state)) {
            conditionHolds = false
          }
        } catch {
          conditionHolds = false
        }
        break
      }
    }

    if (!conditionHolds) continue

    const remaining = scheduled.slice(0, i).concat(scheduled.slice(i + 1))
    return { event: candidate, remaining }
  }

  return { event: null, remaining: scheduled }
}
