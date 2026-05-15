// ============================================================================
// MayorSim — Policies Module
// ----------------------------------------------------------------------------
// Policies are the non-tax law levers a mayor sets: minimum wage, rent control,
// emission standards, immigration stance, drug policy, transit philosophy,
// education model, and healthcare model. Unlike a tax rate that moves money
// next quarter, policy is structural — small, persistent per-turn deltas
// that compound across many turns. This module exposes:
//
//   - applyPolicyEffects(policy, state): the per-turn stat deltas + notes
//   - POLICY_INFO: full UI/educational metadata for every lever
//   - previewPolicyChange(current, change): short reaction notes for the UI
//
// All numbers are intentionally small. The expectation is that policies layer
// on top of tax + budget + buildings, and that a "strict" lever pulled for
// twenty turns produces a meaningful shift, not an overnight crisis.
// ============================================================================

import type {
  PolicyState,
  CityStats,
  GameState,
  RentControl,
  EmissionStandards,
  ImmigrationStance,
  DrugPolicy,
  TransitPolicy,
  EducationPolicy,
  HealthcarePolicy,
} from './types'

// ----------------------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------------------

type EffectMap = Partial<CityStats>

/**
 * Accumulate a partial stat delta into a running totals object. Anything
 * undefined on either side is treated as zero.
 */
function add(into: EffectMap, from: EffectMap): void {
  for (const key of Object.keys(from) as Array<keyof CityStats>) {
    const v = from[key]
    if (v === undefined) continue
    into[key] = ((into[key] ?? 0) as number) + v
  }
}

// ============================================================================
// applyPolicyEffects
// ----------------------------------------------------------------------------
// Returns the *per-turn* delta produced by the current policy stack, plus a
// small set of natural-language notes that the turn-summary UI can surface.
// Notes are reserved for clearly-extreme settings so the player isn't drowned
// in chatter every quarter.
// ============================================================================

export function applyPolicyEffects(
  policy: PolicyState,
  _state: GameState,
): { effects: Partial<CityStats>; notes: string[] } {
  const effects: EffectMap = {}
  const notes: string[] = []

  // --- Minimum wage ---------------------------------------------------------
  // A real lever in $/hr. We treat ~$10-15 as the neutral band that most
  // economies tolerate. Below $5 is essentially deregulated; above $15 starts
  // squeezing employers; above $25 produces serious dislocation.
  const wage = policy.minimumWage
  if (wage > 25) {
    add(effects, {
      unemployment: 0.2,
      gdpPerCapita: -10,
      inequality: -0.5,
      happiness: 0.1,
      inflation: 0.05,
    })
    notes.push('Very high minimum wage is pricing low-skill workers out of jobs.')
  } else if (wage > 15) {
    add(effects, {
      inequality: -0.3,
      happiness: 0.2,
      unemployment: 0.05,
      inflation: 0.05,
    })
  } else if (wage < 5) {
    add(effects, {
      inequality: 0.3,
      happiness: -0.2,
    })
    notes.push('Minimum wage is below subsistence — working poor are growing.')
  }

  // --- Rent control ---------------------------------------------------------
  // Tightening rent ceilings is a classic tradeoff: short-term tenant relief
  // for long-term supply contraction and reduced labor mobility.
  switch (policy.rentControl) {
    case 'none':
      add(effects, { inequality: 0.1 })
      break
    case 'soft':
      add(effects, {
        inequality: -0.15,
        happiness: 0.1,
        gdpPerCapita: -5,
      })
      break
    case 'strict':
      add(effects, {
        inequality: -0.3,
        happiness: 0.2,
        gdpPerCapita: -25,
        innovation: -0.1,
      })
      notes.push('Strict rent control is suppressing housing development.')
      break
  }

  // --- Emission standards ---------------------------------------------------
  // Direct dial on air-quality vs industrial-cost. Strict standards push the
  // economy toward clean-tech, which boosts innovation over time.
  switch (policy.emissionStandards) {
    case 'lax':
      add(effects, {
        pollution: 0.4,
        gdpPerCapita: 30,
      })
      notes.push('Lax emission standards are degrading air quality.')
      break
    case 'normal':
      // Baseline — no deltas.
      break
    case 'strict':
      add(effects, {
        pollution: -0.4,
        gdpPerCapita: -20,
        innovation: 0.1,
      })
      break
  }

  // --- Immigration ----------------------------------------------------------
  // Open inflows lift innovation and GDP but produce short-term frictions in
  // the labor market. Restrictive stances shrink the working-age base.
  switch (policy.immigration) {
    case 'restrictive':
      add(effects, {
        innovation: -0.1,
        gdpPerCapita: -10,
      })
      break
    case 'open':
      add(effects, {
        innovation: 0.2,
        gdpPerCapita: 15,
        inequality: 0.05,
        unemployment: 0.05,
      })
      break
    case 'targeted':
      add(effects, {
        innovation: 0.15,
        gdpPerCapita: 10,
        unemployment: -0.02,
      })
      break
  }

  // --- Drug policy ----------------------------------------------------------
  // Punitive enforcement suppresses visible crime but raises inequality and
  // (in budget land) carceral costs. Lenient root-cause approaches improve
  // public health and modestly reduce inequality.
  switch (policy.drugPolicy) {
    case 'punitive':
      add(effects, {
        crime: -0.2,
        inequality: 0.1,
      })
      break
    case 'mixed':
      add(effects, {
        crime: -0.1,
        health: 0.05,
      })
      break
    case 'lenient':
      add(effects, {
        crime: -0.05,
        health: 0.1,
        inequality: -0.05,
      })
      break
  }

  // --- Transit --------------------------------------------------------------
  // Public-transit subsidy is one of the strongest urban productivity levers.
  // We let the budget separately reflect the cash cost.
  switch (policy.transit) {
    case 'market':
      add(effects, { pollution: 0.1 })
      break
    case 'subsidized':
      add(effects, {
        gdpPerCapita: 20,
        pollution: -0.15,
        happiness: 0.1,
      })
      break
    case 'free':
      add(effects, {
        gdpPerCapita: 50,
        pollution: -0.4,
        happiness: 0.2,
      })
      notes.push('Free transit is moving riders and lifting productivity.')
      break
  }

  // --- Education -----------------------------------------------------------
  // The model the city uses to organize schooling. Meritocratic systems push
  // top performance and innovation while widening inequality. Universal
  // systems flatten the distribution and modestly raise the floor.
  switch (policy.education) {
    case 'standard':
      // Baseline drift — no policy delta.
      break
    case 'meritocratic':
      add(effects, {
        innovation: 0.1,
        education: 0.1,
        inequality: 0.1,
      })
      break
    case 'universal':
      add(effects, {
        education: 0.15,
        inequality: -0.15,
        happiness: 0.05,
      })
      break
  }

  // --- Healthcare ----------------------------------------------------------
  // Private healthcare leans on out-of-pocket spend and grows finance/medical
  // GDP, but tends to leave gaps. Universal coverage shifts cost to the
  // public ledger (modeled as a GDP drag) and lifts population health.
  switch (policy.healthcare) {
    case 'private':
      add(effects, {
        gdpPerCapita: 10,
        health: -0.05,
        inequality: 0.1,
      })
      break
    case 'mixed':
      // Baseline.
      break
    case 'universal':
      add(effects, {
        health: 0.2,
        happiness: 0.1,
        gdpPerCapita: -15,
      })
      break
  }

  return { effects, notes }
}

// ============================================================================
// POLICY_INFO — UI + educational metadata
// ============================================================================

export interface PolicyOptionInfo {
  value: string
  label: string
  description: string
  effects: string[]
}

export interface PolicyInfo {
  key: keyof PolicyState
  label: string
  short: string
  educational: string
  options?: PolicyOptionInfo[]
  isNumeric?: boolean
  min?: number
  max?: number
  step?: number
  unit?: string
}

export const POLICY_INFO: Record<keyof PolicyState, PolicyInfo> = {
  minimumWage: {
    key: 'minimumWage',
    label: 'Minimum Wage',
    short: 'The legal hourly wage floor for any covered worker in the city.',
    educational:
      'A minimum wage sets the lowest legal hourly pay employers may offer. ' +
      'When set near the local cost of living it lifts incomes for the working poor ' +
      'and shrinks the gap between low- and middle-wage households. Push it far above ' +
      'productivity, however, and employers respond by cutting hours, automating, ' +
      'raising prices, or hiring fewer entry-level workers — which can leave the most ' +
      'vulnerable workers out of the labor market entirely. The "right" level is ' +
      'highly local: a wage that lifts a high-cost coastal city can lock low-cost ' +
      'regions out of jobs.',
    isNumeric: true,
    min: 0,
    max: 50,
    step: 0.5,
    unit: '$/hr',
  },

  rentControl: {
    key: 'rentControl',
    label: 'Rent Control',
    short: 'How tightly the city caps residential rents.',
    educational:
      'Rent control sets ceilings on how much landlords can charge or raise rent. ' +
      'Tenants benefit from stable, predictable housing costs and are less likely to ' +
      'be displaced. But strict caps reduce the financial reward for building or ' +
      'maintaining housing, so over time supply tightens, vacancies disappear, and ' +
      'the unregulated portion of the market becomes more expensive. Tight caps also ' +
      'reduce labor mobility — a renter with a controlled lease is reluctant to ' +
      'move toward a better job in a different district.',
    options: [
      {
        value: 'none',
        label: 'None',
        description: 'Free-market rents with no caps on increases.',
        effects: [
          'Housing supply responds quickly to demand',
          'Rents can spike during booms',
          'Higher inequality between owners and renters',
        ],
      },
      {
        value: 'soft',
        label: 'Soft caps',
        description: 'Annual rent increases capped near inflation plus a small margin.',
        effects: [
          'Modest tenant protection without freezing the market',
          'Small drag on new construction',
          'Mild reduction in inequality',
        ],
      },
      {
        value: 'strict',
        label: 'Strict caps',
        description: 'Tight rent ceilings combined with strong eviction restrictions.',
        effects: [
          'Strong protection for sitting tenants',
          'Reduced housing supply over many years',
          'Noticeable GDP drag from lower mobility',
          'Innovation may suffer as workers cannot relocate to opportunity',
        ],
      },
    ],
  },

  emissionStandards: {
    key: 'emissionStandards',
    label: 'Emission Standards',
    short: 'How strictly the city limits industrial and vehicle pollution.',
    educational:
      'Emission standards regulate the pollutants that factories, power plants, and ' +
      'vehicles may release into the air and water. Lax rules lower compliance costs ' +
      'and attract heavy industry, which can lift short-term output but at the cost ' +
      'of public health and long-term environmental damage. Strict rules force ' +
      'industry to invest in cleaner technology — painful in the short run, but ' +
      'often the path that produces durable innovation, lower cleanup costs later, ' +
      'and a more attractive city for high-skill workers.',
    options: [
      {
        value: 'lax',
        label: 'Lax',
        description: 'Minimal limits on industrial output.',
        effects: [
          'Industry-friendly: GDP boost',
          'Rising air and water pollution',
          'Long-term health and cleanup costs',
        ],
      },
      {
        value: 'normal',
        label: 'Normal',
        description: 'Standard national-level rules.',
        effects: [
          'Pollution stays roughly flat from policy alone',
          'No major economic boost or drag',
          'Predictable baseline for industry',
        ],
      },
      {
        value: 'strict',
        label: 'Strict',
        description: 'Tough caps and aggressive enforcement.',
        effects: [
          'Visibly cleaner air over time',
          'Short-term GDP drag on dirty industry',
          'Forces clean-tech adoption — innovation rises',
        ],
      },
    ],
  },

  immigration: {
    key: 'immigration',
    label: 'Immigration Stance',
    short: 'How welcoming the city is to new arrivals from elsewhere.',
    educational:
      'Cities cannot fully set national immigration law, but they can set the tone ' +
      'through sanctuary policies, occupational licensing, language services, and ' +
      'welcoming infrastructure. Open cities tend to grow faster, become more ' +
      'entrepreneurial, and fill labor gaps — at the cost of short-term frictions ' +
      'as housing, schools, and services absorb newcomers. Restrictive postures slow ' +
      'population growth and can leave the city aging and short on workers. Targeted ' +
      'approaches try to capture the upside while smoothing the transition.',
    options: [
      {
        value: 'restrictive',
        label: 'Restrictive',
        description: 'Active discouragement of new arrivals.',
        effects: [
          'Slower population growth',
          'Lower innovation over time',
          'Reduced GDP per capita',
        ],
      },
      {
        value: 'open',
        label: 'Open',
        description: 'Welcoming to newcomers of any skill level.',
        effects: [
          'Strong innovation and GDP gains',
          'Short-term unemployment friction',
          'Some upward pressure on inequality',
        ],
      },
      {
        value: 'targeted',
        label: 'Targeted',
        description: 'Pathways aimed at specific skills and shortages.',
        effects: [
          'Innovation and GDP gains, slightly smaller than fully open',
          'Less labor-market friction',
          'Fills specific shortages efficiently',
        ],
      },
    ],
  },

  drugPolicy: {
    key: 'drugPolicy',
    label: 'Drug Policy',
    short: 'How the city treats drug possession and addiction.',
    educational:
      'Drug policy spans two questions: how to deter use and how to help those ' +
      'already addicted. Punitive systems lean on arrests and incarceration; they ' +
      'can suppress visible street activity but are expensive, produce records that ' +
      'limit future employment, and fall hardest on poor neighborhoods. Lenient ' +
      'systems treat addiction as a health problem first — needle exchanges, ' +
      'supervised consumption, and treatment-on-demand — which lowers overdose ' +
      'deaths and disease transmission. Mixed systems try to keep the deterrent ' +
      'effect while expanding treatment.',
    options: [
      {
        value: 'punitive',
        label: 'Punitive',
        description: 'Arrest and incarcerate users and dealers.',
        effects: [
          'Short-term reduction in visible crime',
          'Higher inequality from criminal records',
          'High jail and court costs',
        ],
      },
      {
        value: 'mixed',
        label: 'Mixed',
        description: 'Enforce against dealers; divert users to treatment.',
        effects: [
          'Moderate crime reduction',
          'Some public-health gains',
          'Balanced cost profile',
        ],
      },
      {
        value: 'lenient',
        label: 'Harm-reduction',
        description: 'Treat use as a health issue; emphasize treatment and harm reduction.',
        effects: [
          'Better public health outcomes',
          'Modest reduction in inequality',
          'Smaller direct effect on visible crime',
        ],
      },
    ],
  },

  transit: {
    key: 'transit',
    label: 'Transit Policy',
    short: 'How the city funds and prices public transportation.',
    educational:
      'Public transit determines who can get to which jobs at what cost. Markets ' +
      'left alone tend to favor cars and produce congestion, sprawl, and pollution. ' +
      'Subsidized transit lowers fares enough to keep buses and trains full, which ' +
      'lifts productivity by widening labor markets. Fare-free transit goes further: ' +
      'it removes the friction of paying, speeds boarding, and tends to lift ridership ' +
      'enough to substantially reduce car trips and emissions, though the operating ' +
      'cost falls on the city budget.',
    options: [
      {
        value: 'market',
        label: 'Market',
        description: 'Transit pays for itself; little subsidy.',
        effects: [
          'Low direct cost to city',
          'Higher car use and pollution',
          'Limited mobility for low-income workers',
        ],
      },
      {
        value: 'subsidized',
        label: 'Subsidized',
        description: 'Significant subsidy keeps fares affordable.',
        effects: [
          'Higher ridership and productivity',
          'Cleaner air',
          'Moderate budget cost',
        ],
      },
      {
        value: 'free',
        label: 'Fare-free',
        description: 'No fares; transit funded entirely from the budget.',
        effects: [
          'Largest productivity and air-quality gains',
          'Highest direct cost on the budget',
          'Strong happiness gains for working-class districts',
        ],
      },
    ],
  },

  education: {
    key: 'education',
    label: 'Education Model',
    short: 'How the city organizes and resources its public schools.',
    educational:
      'A school system is one of the slowest-moving but most consequential policies a ' +
      'mayor sets — its effects show up a decade later, in the workforce. ' +
      'Meritocratic systems concentrate resources on top performers via tracking, ' +
      'gifted programs, and selective high schools, which lifts the ceiling but tends ' +
      'to widen gaps. Universal systems aim to lift the floor with equal funding, ' +
      'mixed-ability classrooms, and broad access to electives, which narrows gaps ' +
      'but may produce fewer star outliers. The standard model muddles through with ' +
      'neither focus.',
    options: [
      {
        value: 'standard',
        label: 'Standard',
        description: 'Traditional model with no special focus.',
        effects: [
          'Predictable baseline outcomes',
          'No strong push on innovation or equity',
          'Neutral budget profile',
        ],
      },
      {
        value: 'meritocratic',
        label: 'Meritocratic',
        description: 'Tracking, gifted programs, selective schools.',
        effects: [
          'Stronger innovation pipeline',
          'Rising education averages',
          'Wider inequality between high- and low-track students',
        ],
      },
      {
        value: 'universal',
        label: 'Universal',
        description: 'Equalized funding, broad access, mixed-ability classrooms.',
        effects: [
          'Largest gains in average education',
          'Reduced inequality',
          'Modest happiness boost from fairness perception',
        ],
      },
    ],
  },

  healthcare: {
    key: 'healthcare',
    label: 'Healthcare Model',
    short: 'How the city pays for and delivers medical care.',
    educational:
      'Healthcare delivery shapes both public health and the city budget. Private ' +
      'systems rely on insurance and out-of-pocket spending, which keeps direct ' +
      'public costs low but leaves coverage gaps that show up as worse population ' +
      'health and higher emergency-room use. Universal systems pool risk across the ' +
      'whole population, which improves outcomes and reduces medical bankruptcy, but ' +
      'shifts costs onto the public ledger and requires careful management to avoid ' +
      'queues. Mixed systems combine a public floor with private options on top.',
    options: [
      {
        value: 'private',
        label: 'Private',
        description: 'Care funded primarily through private insurance.',
        effects: [
          'Lower direct city cost',
          'Coverage gaps drag on health over time',
          'Higher inequality in access',
        ],
      },
      {
        value: 'mixed',
        label: 'Mixed',
        description: 'Public floor plus private options.',
        effects: [
          'Balanced costs and outcomes',
          'No strong push in any direction',
          'Common in many democracies',
        ],
      },
      {
        value: 'universal',
        label: 'Universal',
        description: 'Single-payer or fully public coverage for all residents.',
        effects: [
          'Largest gains in population health',
          'Happiness boost from financial security',
          'Significant ongoing cost to the city',
        ],
      },
    ],
  },
}

// ============================================================================
// previewPolicyChange — short, concrete reaction notes per changed lever
// ----------------------------------------------------------------------------
// Used by the UI before a mayor commits a policy switch. We do not predict
// the full numeric impact (the per-turn deltas do that); instead we name two
// or three concrete things a reasonable advisor would say about the move.
// ============================================================================

const MIN_WAGE_NOTES = (next: number, prev: number): string[] => {
  if (next === prev) return []
  const delta = next - prev
  const notes: string[] = []
  if (delta > 0) {
    notes.push(`Minimum wage rising from $${prev.toFixed(2)} to $${next.toFixed(2)}/hr.`)
    if (next > 25) {
      notes.push('Expect significant layoffs among low-margin employers.')
    } else if (next > 15) {
      notes.push('Low-wage workers will see real income gains.')
      notes.push('Service prices and unemployment will edge up.')
    } else {
      notes.push('Working-poor incomes will rise modestly.')
    }
  } else {
    notes.push(`Minimum wage falling from $${prev.toFixed(2)} to $${next.toFixed(2)}/hr.`)
    if (next < 5) {
      notes.push('Working poor will be squeezed; unions will protest.')
    } else {
      notes.push('Employers will hire more freely at the lower floor.')
    }
  }
  return notes
}

const RENT_CONTROL_NOTES: Record<RentControl, Record<RentControl, string[]>> = {
  none: {
    none: [],
    soft: [
      'Annual rent increases will be capped near inflation.',
      'Landlord lobby will object; tenant groups will applaud.',
    ],
    strict: [
      'Tight rent ceilings will lock in current tenants.',
      'New construction will stall over the coming years.',
      'Real-estate sector will recoil.',
    ],
  },
  soft: {
    none: [
      'Caps lifted — rents will reset to market within a year.',
      'Tenant groups will protest displacement.',
    ],
    soft: [],
    strict: [
      'Caps tightening — landlord investment will slow.',
      'Tenant groups will applaud the move.',
    ],
  },
  strict: {
    none: [
      'Full deregulation — sitting tenants face large rent hikes.',
      'Construction will surge as returns recover.',
      'Mass evictions are likely in the first year.',
    ],
    soft: [
      'Caps loosening — gradual rent normalization.',
      'New building permits will rise.',
    ],
    strict: [],
  },
}

const EMISSION_NOTES: Record<EmissionStandards, Record<EmissionStandards, string[]>> = {
  lax: {
    lax: [],
    normal: [
      'Heavy industry will face new compliance costs.',
      'Air quality will improve over several quarters.',
    ],
    strict: [
      'Industrial growth will slow sharply.',
      'Air quality will improve over several quarters.',
      'Green coalition will be pleased; chamber of commerce will not.',
    ],
  },
  normal: {
    lax: [
      'Dirty industry will rush to expand.',
      'Air quality will visibly degrade.',
      'Health costs will climb in the long run.',
    ],
    normal: [],
    strict: [
      'Industrial sector growth will slow.',
      'Clean-tech investment will accelerate.',
      'Air quality will improve over several quarters.',
    ],
  },
  strict: {
    lax: [
      'Industry will rebound, with serious pollution costs.',
      'Environmental groups will mobilize against you.',
    ],
    normal: [
      'Compliance costs will ease for manufacturers.',
      'Pollution will tick upward.',
    ],
    strict: [],
  },
}

const IMMIGRATION_NOTES: Record<ImmigrationStance, Record<ImmigrationStance, string[]>> = {
  restrictive: {
    restrictive: [],
    open: [
      'Population growth will accelerate.',
      'Labor shortages will ease; wages soften at the low end.',
      'Innovation will pick up over the coming years.',
    ],
    targeted: [
      'Skilled-worker pathways will open.',
      'Specific labor shortages will fill quickly.',
    ],
  },
  open: {
    restrictive: [
      'New arrivals will slow to a trickle.',
      'Labor shortages will widen in service sectors.',
      'Civil-rights groups will protest.',
    ],
    open: [],
    targeted: [
      'Inflows will narrow to specific skill categories.',
      'Service-sector employers will complain about shortages.',
    ],
  },
  targeted: {
    restrictive: [
      'Skilled visa pipelines will close.',
      'Tech and medical sectors will see hiring pain.',
    ],
    open: [
      'Pathways will broaden to all skill levels.',
      'Population growth will accelerate.',
    ],
    targeted: [],
  },
}

const DRUG_NOTES: Record<DrugPolicy, Record<DrugPolicy, string[]>> = {
  punitive: {
    punitive: [],
    mixed: [
      'Diversion programs will reduce jail intake.',
      'Public-health spending will tick up.',
    ],
    lenient: [
      'Arrests for use will drop sharply.',
      'Treatment capacity will expand.',
      'Police union will object.',
    ],
  },
  mixed: {
    punitive: [
      'Enforcement will intensify; jail population will grow.',
      'Civil-rights groups will protest.',
    ],
    mixed: [],
    lenient: [
      'Focus will shift fully to harm reduction.',
      'Overdose deaths should decline over time.',
    ],
  },
  lenient: {
    punitive: [
      'Mass arrests will resume.',
      'Public-health workers will protest.',
      'Visible street activity will drop.',
    ],
    mixed: [
      'Some enforcement returns alongside treatment.',
      'Streets will look modestly more orderly.',
    ],
    lenient: [],
  },
}

const TRANSIT_NOTES: Record<TransitPolicy, Record<TransitPolicy, string[]>> = {
  market: {
    market: [],
    subsidized: [
      'Bus and rail fares will drop.',
      'Ridership will climb; congestion will ease.',
      'Transit unions will applaud.',
    ],
    free: [
      'Fares disappear entirely.',
      'Ridership will surge; cars will come off the road.',
      'The operating subsidy will be a major budget line.',
    ],
  },
  subsidized: {
    market: [
      'Fares will rise to cover full operating costs.',
      'Ridership will fall; congestion will return.',
    ],
    subsidized: [],
    free: [
      'Remaining fares disappear.',
      'Expect a meaningful ridership bump.',
    ],
  },
  free: {
    market: [
      'Fares will return at full cost-recovery levels.',
      'Working-class commuters will be hit hardest.',
      'Ridership will collapse.',
    ],
    subsidized: [
      'Modest fares will return.',
      'Ridership will decline somewhat.',
    ],
    free: [],
  },
}

const EDUCATION_NOTES: Record<EducationPolicy, Record<EducationPolicy, string[]>> = {
  standard: {
    standard: [],
    meritocratic: [
      'Selective schools and tracking will expand.',
      'Top performers will pull ahead.',
      'Equity advocates will object.',
    ],
    universal: [
      'Funding will be equalized across districts.',
      'Mixed-ability classrooms will become the norm.',
      'Teachers union may welcome the shift.',
    ],
  },
  meritocratic: {
    standard: [
      'Selective programs will be wound down.',
      'Some parents in affluent districts will protest.',
    ],
    meritocratic: [],
    universal: [
      'Tracking will end; funding equalized.',
      'High-achieving families may push back hard.',
    ],
  },
  universal: {
    standard: [
      'Equalization will end; district-level disparities will return.',
      'Outcomes will diverge over time.',
    ],
    meritocratic: [
      'Tracking and selective schools will return.',
      'Equity advocates will mobilize against the shift.',
    ],
    universal: [],
  },
}

const HEALTHCARE_NOTES: Record<HealthcarePolicy, Record<HealthcarePolicy, string[]>> = {
  private: {
    private: [],
    mixed: [
      'A public coverage floor will be added.',
      'Uninsured rates will fall.',
    ],
    universal: [
      'Single-payer coverage will roll out for all residents.',
      'Medical bankruptcy will disappear.',
      'The cost will become a major budget commitment.',
    ],
  },
  mixed: {
    private: [
      'The public floor will be wound down.',
      'Uninsured rates will rise sharply.',
    ],
    mixed: [],
    universal: [
      'Coverage will become fully public.',
      'Insurance industry will lobby against the move.',
    ],
  },
  universal: {
    private: [
      'Universal coverage will be dismantled.',
      'Hospitals will see a wave of uninsured patients.',
      'Public-health outcomes will deteriorate.',
    ],
    mixed: [
      'A private layer will be reintroduced.',
      'Wait times for elective care may shorten.',
    ],
    universal: [],
  },
}

export function previewPolicyChange(
  current: PolicyState,
  change: Partial<PolicyState>,
): string[] {
  const notes: string[] = []

  if (change.minimumWage !== undefined && change.minimumWage !== current.minimumWage) {
    notes.push(...MIN_WAGE_NOTES(change.minimumWage, current.minimumWage))
  }
  if (change.rentControl !== undefined && change.rentControl !== current.rentControl) {
    notes.push(...RENT_CONTROL_NOTES[current.rentControl][change.rentControl])
  }
  if (
    change.emissionStandards !== undefined &&
    change.emissionStandards !== current.emissionStandards
  ) {
    notes.push(...EMISSION_NOTES[current.emissionStandards][change.emissionStandards])
  }
  if (change.immigration !== undefined && change.immigration !== current.immigration) {
    notes.push(...IMMIGRATION_NOTES[current.immigration][change.immigration])
  }
  if (change.drugPolicy !== undefined && change.drugPolicy !== current.drugPolicy) {
    notes.push(...DRUG_NOTES[current.drugPolicy][change.drugPolicy])
  }
  if (change.transit !== undefined && change.transit !== current.transit) {
    notes.push(...TRANSIT_NOTES[current.transit][change.transit])
  }
  if (change.education !== undefined && change.education !== current.education) {
    notes.push(...EDUCATION_NOTES[current.education][change.education])
  }
  if (change.healthcare !== undefined && change.healthcare !== current.healthcare) {
    notes.push(...HEALTHCARE_NOTES[current.healthcare][change.healthcare])
  }

  return notes
}
