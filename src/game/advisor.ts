// ============================================================================
// MayorSim — Advisor System
// Produces in-game tips, warnings, opportunities, and educational notes based
// on the current game state. This is how the game *teaches* the player about
// the underlying causal model: stat thresholds, policy combos, macro forces.
// ============================================================================

import type {
  GameState,
  CityStats,
  StatKey,
  Faction,
} from './types'

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export interface AdvisorTip {
  id: string
  severity: 'info' | 'warn' | 'crit' | 'opportunity'
  title: string
  body: string
  topic: 'economy' | 'social' | 'political' | 'environment' | 'tech' | 'foreign' | 'tutorial'
}

// ============================================================================
// MAIN COMPUTATION — runs all rules and returns active tips
// ============================================================================

export function computeAdvisorTips(state: GameState): AdvisorTip[] {
  const tips: AdvisorTip[] = []
  const s = state.stats
  const b = state.budget
  const t = state.tax
  const macro = state.macro
  const turn = state.turn
  const factions = state.factions ?? []

  // Derived metrics
  const debtToGdpRatio = computeDebtToGdpRatio(state)
  const budgetTotal = sumBudget(b)

  // -------------------------------------------------------------------------
  // ECONOMY RULES
  // -------------------------------------------------------------------------

  // 1. Treasury crisis combined with high debt
  if (s.treasury < 30 && debtToGdpRatio > 0.4) {
    tips.push({
      id: 'eco-fiscal-danger',
      severity: 'crit',
      title: 'Fiscal danger',
      body:
        'Treasury is low while debt is high relative to GDP. Investors will demand higher interest, ' +
        'choking your budget further. Consider a small tax hike, trimming non-essential spending, ' +
        'or pausing capital projects until reserves recover.',
      topic: 'economy',
    })
  }

  // 2. Approaching bankruptcy
  if (s.treasury < 0) {
    tips.push({
      id: 'eco-insolvent',
      severity: 'crit',
      title: 'City running on fumes',
      body:
        'The treasury is in the red. Each turn you spend more than you take in compounds the problem. ' +
        'Raise revenue, cut a budget category temporarily, or issue debt while your rating still allows it.',
      topic: 'economy',
    })
  }

  // 3. High inflation
  if (s.inflation > 6) {
    tips.push({
      id: 'eco-inflation-high',
      severity: 'warn',
      title: 'High inflation',
      body:
        'Prices are rising fast. This often follows deficit spending, supply shocks, or an overheated ' +
        'labor market. Tightening the budget or cooling growth helps — but voters will hate the slowdown.',
      topic: 'economy',
    })
  }

  // 4. Deflation
  if (s.inflation < 0) {
    tips.push({
      id: 'eco-deflation',
      severity: 'warn',
      title: 'Deflation risk',
      body:
        'Prices are falling. Citizens may delay spending, dragging the economy further down. ' +
        'A modest stimulus through infrastructure or research can break the cycle.',
      topic: 'economy',
    })
  }

  // 5. Credit downgrade risk
  if (s.creditRating < 50) {
    tips.push({
      id: 'eco-credit-fragile',
      severity: 'warn',
      title: 'Credit downgrade risk',
      body:
        'Your bond rating is fragile. Each downgrade raises debt-servicing costs and shrinks your ' +
        'budget flexibility. Steady surpluses, even small ones, signal discipline to rating agencies.',
      topic: 'economy',
    })
  }

  // 6. High unemployment
  if (s.unemployment > 9) {
    tips.push({
      id: 'eco-unemployment-high',
      severity: 'warn',
      title: 'High unemployment',
      body:
        'Joblessness drags GDP, fuels crime, and dents approval. Direct levers: infrastructure spending ' +
        'creates short-term work; education and research grow long-term sectors that absorb labor.',
      topic: 'economy',
    })
  }

  // 7. Overheating labor market
  if (s.unemployment < 3) {
    tips.push({
      id: 'eco-overheating',
      severity: 'info',
      title: 'Labor market tight',
      body:
        'Near-full employment is great politically but pushes wages and inflation up. Productivity-boosting ' +
        'investments (research, infrastructure) help absorb the heat without breaking growth.',
      topic: 'economy',
    })
  }

  // 8. GDP per capita weak
  if (s.gdpPerCapita < 25000) {
    tips.push({
      id: 'eco-gdp-weak',
      severity: 'info',
      title: 'GDP per capita low',
      body:
        'Average productivity is lagging. Long-run remedies — education, research, transit, and clean ' +
        'energy — compound over many quarters. Quick fixes rarely move this number.',
      topic: 'economy',
    })
  }

  // 9. Debt-to-GDP very high
  if (debtToGdpRatio > 0.8) {
    tips.push({
      id: 'eco-debt-spiral',
      severity: 'crit',
      title: 'Debt spiral approaching',
      body:
        'Debt has overtaken 80% of annual GDP. Interest payments now crowd out useful spending. ' +
        'Each new bond round becomes more expensive; rebuild fiscal credibility before borrowing more.',
      topic: 'economy',
    })
  }

  // -------------------------------------------------------------------------
  // SOCIAL RULES
  // -------------------------------------------------------------------------

  // 10. High crime
  if (s.crime > 60) {
    tips.push({
      id: 'soc-crime-high',
      severity: 'warn',
      title: 'Crime is high',
      body:
        'Pure policing suppresses crime in the short run, but the durable fixes are the root causes: ' +
        'employment, education, and inequality. A balanced approach beats heavy-handed enforcement alone.',
      topic: 'social',
    })
  }

  // 11. Education stagnating mid-game
  if (s.education < 50 && turn > 6) {
    tips.push({
      id: 'soc-education-low',
      severity: 'warn',
      title: 'Education falling behind',
      body:
        'Schools are underperforming city-wide. Educational gains take years to compound, so neglect now ' +
        'limits innovation, growth, and resilience for many quarters ahead. Boost the education budget or build a school/university.',
      topic: 'social',
    })
  }

  // 12. High inequality
  if (s.inequality > 65) {
    tips.push({
      id: 'soc-inequality-high',
      severity: 'warn',
      title: 'Inequality climbing',
      body:
        'A widening gap erodes social trust, fuels crime, and depresses overall happiness. ' +
        'Welfare, progressive taxation, and broad access to education are the most durable levers.',
      topic: 'social',
    })
  }

  // 13. Happiness sagging
  if (s.happiness < 40) {
    tips.push({
      id: 'soc-happiness-low',
      severity: 'warn',
      title: 'Citizens are unhappy',
      body:
        'Low happiness today becomes low approval next quarter. Causes vary — pollution, crime, joblessness, ' +
        'inflation. Check which is highest and target it first.',
      topic: 'social',
    })
  }

  // 14. Recall danger
  if (s.approval < 25) {
    tips.push({
      id: 'soc-recall-risk',
      severity: 'crit',
      title: 'Recall danger',
      body:
        'Your approval is critically low. Voters could remove you from office. A high-visibility win — ' +
        'a popular building, a tax cut on essentials, or a populist policy — may stem the bleeding.',
      topic: 'social',
    })
  }

  // 15. Health declining
  if (s.health < 50) {
    tips.push({
      id: 'soc-health-low',
      severity: 'warn',
      title: 'Public health declining',
      body:
        'A less healthy population means lower productivity and higher welfare costs. Hospitals, clean air, ' +
        'and stable employment all feed health. Long pollution streaks quietly cripple this stat.',
      topic: 'social',
    })
  }

  // -------------------------------------------------------------------------
  // POLITICAL RULES
  // -------------------------------------------------------------------------

  // 16. Election approaching
  const termTurns = state.termLengthYears * 4
  if (turn > 0 && turn % termTurns >= termTurns - 2 && turn % termTurns !== 0) {
    tips.push({
      id: 'pol-election-near',
      severity: 'info',
      title: 'Election approaching',
      body:
        'Your term ends in 1-2 quarters. Visible, popular moves now have outsized impact on re-election; ' +
        'unpopular reforms are best deferred to the start of the next term.',
      topic: 'political',
    })
  }

  // 17. Strong mandate
  if (state.termsServed > 0 && s.approval > 65) {
    tips.push({
      id: 'pol-mandate-strong',
      severity: 'opportunity',
      title: 'Strong mandate',
      body:
        'You enjoy broad public support after re-election. This is the right moment to pass difficult ' +
        'long-term reforms — voters cut you slack right after they renewed your contract.',
      topic: 'political',
    })
  }

  // 18. Hostile faction warning
  if (factions.length > 0) {
    const hostile = factions
      .filter((f) => f.favor < -50 && f.power > 40)
      .sort((a, b) => b.power - a.power)[0]
    if (hostile) {
      tips.push({
        id: `pol-hostile-${hostile.id}`,
        severity: 'warn',
        title: `${hostile.name} is hostile`,
        body:
          `The ${hostile.name} faction is influential and opposes you. Expect them to block events, ` +
          `pressure media outlets, or rally their base. A small concession on something they care about ` +
          `often costs less than the damage they can do.`,
        topic: 'political',
      })
    }
  }

  // 19. Faction overlooked — high power, neutral favor
  if (factions.length > 0) {
    const swingFaction = factions.find((f) => f.power > 60 && Math.abs(f.favor) < 15)
    if (swingFaction) {
      tips.push({
        id: `pol-swing-${swingFaction.id}`,
        severity: 'opportunity',
        title: `${swingFaction.name} is winnable`,
        body:
          `${swingFaction.name} holds real power but is currently undecided about you. A modest favor ` +
          `aimed at what they care about could turn them into a durable ally.`,
        topic: 'political',
      })
    }
  }

  // -------------------------------------------------------------------------
  // ENVIRONMENT RULES
  // -------------------------------------------------------------------------

  // 20. Pollution high
  if (s.pollution > 60) {
    tips.push({
      id: 'env-pollution-high',
      severity: 'warn',
      title: 'Pollution is high',
      body:
        'Dirty air and water silently drag down health and happiness. Pollution is much cheaper to ' +
        'prevent than to clean up. Stricter emission standards, parks, and waste treatment plants help.',
      topic: 'environment',
    })
  }

  // 21. Lax standards + rising pollution
  if (state.policy.emissionStandards === 'lax' && s.pollution > 50) {
    tips.push({
      id: 'env-lax-standards',
      severity: 'warn',
      title: 'Lax emission standards biting',
      body:
        'You allow heavy emissions, and pollution is climbing. Tightening standards costs growth in dirty ' +
        'sectors short-term but pays back in long-run health and tourism revenue.',
      topic: 'environment',
    })
  }

  // 22. Climate risk macro
  if (macro && macro.climateRisk > 70) {
    tips.push({
      id: 'env-climate-risk',
      severity: 'warn',
      title: 'Climate risk elevated',
      body:
        'National climate risk is high — expect more frequent disaster events. Invest in resilience: ' +
        'fire stations, waste treatment, and parks reduce the damage when disasters strike.',
      topic: 'environment',
    })
  }

  // 23. Zero environment budget
  if (b.environment === 0) {
    tips.push({
      id: 'env-budget-zero',
      severity: 'info',
      title: 'No environment funding',
      body:
        'You allocate nothing to the environment. Pollution will drift upward each quarter, slowly ' +
        'eroding health and happiness. Even a small allocation slows the drift.',
      topic: 'environment',
    })
  }

  // -------------------------------------------------------------------------
  // TECH RULES
  // -------------------------------------------------------------------------

  // 24. Tech wave + low education = falling behind
  if (macro && macro.techWave > 80 && s.education < 60) {
    tips.push({
      id: 'tech-left-behind',
      severity: 'warn',
      title: 'Tech wave passing you by',
      body:
        'A national wave of automation and AI is reshaping work, but your workforce is undertrained. ' +
        'Without urgent investment in education and research, displaced workers will swell unemployment.',
      topic: 'tech',
    })
  }

  // 25. Tech wave + high education = catch the wave
  if (macro && macro.techWave > 80 && s.education > 60) {
    tips.push({
      id: 'tech-ride-wave',
      severity: 'opportunity',
      title: 'Ride the tech wave',
      body:
        'A tech surge is here, and your educated workforce can capture it. Doubling down on research ' +
        'and a research-lab build now could lift GDP per capita for many quarters.',
      topic: 'tech',
    })
  }

  // 26. Low innovation
  if (s.innovation < 40 && turn > 4) {
    tips.push({
      id: 'tech-innovation-low',
      severity: 'info',
      title: 'Innovation lagging',
      body:
        'Few patents, slow new-business formation. Innovation grows where education, research funding, ' +
        'and universities meet — a long compounding bet, not a quick win.',
      topic: 'tech',
    })
  }

  // -------------------------------------------------------------------------
  // FOREIGN / MACRO RULES
  // -------------------------------------------------------------------------

  // 27. Geopolitical crisis
  if (macro && macro.geopolitical === 'crisis') {
    tips.push({
      id: 'foreign-crisis',
      severity: 'warn',
      title: 'Geopolitical crisis',
      body:
        'National security tensions are rising. Federal funding may shift toward defense, leaving less for ' +
        'cities. Trade-linked sectors face headwinds; prepare reserves.',
      topic: 'foreign',
    })
  }

  // 28. Federal funding boost opportunity
  if (macro && macro.federalFunding > 50) {
    tips.push({
      id: 'foreign-fed-boost',
      severity: 'opportunity',
      title: 'Federal funding flowing',
      body:
        'Federal transfers are unusually generous this quarter. Use the windfall on a project with ' +
        'long-tail benefits — infrastructure or a university — rather than recurring spending.',
      topic: 'foreign',
    })
  }

  // -------------------------------------------------------------------------
  // BUDGET BALANCE RULES
  // -------------------------------------------------------------------------

  // 29. Underinvesting in growth
  if (b.education + b.research < 20) {
    tips.push({
      id: 'bud-growth-low',
      severity: 'info',
      title: 'Underinvesting in growth',
      body:
        'Education plus research is under 20% of your budget. Both compound over many quarters; thin ' +
        'allocations here cap your long-run GDP and innovation ceiling.',
      topic: 'economy',
    })
  }

  // 30. Over-securitized budget
  if (b.security > 30) {
    tips.push({
      id: 'bud-security-overweight',
      severity: 'warn',
      title: 'Security spending heavy',
      body:
        'Security exceeds 30% of the budget. Returns diminish quickly past this point, and other ' +
        'engines (education, infrastructure) suffer. Consider rebalancing once crime stabilizes.',
      topic: 'social',
    })
  }

  // 31. Severely lopsided budget (single category dominates)
  const maxBudgetEntry = (Object.entries(b) as Array<[string, number]>).reduce(
    (acc, [k, v]) => (v > acc[1] ? [k, v] : acc),
    ['', 0] as [string, number]
  )
  if (maxBudgetEntry[1] > 45) {
    tips.push({
      id: 'bud-lopsided',
      severity: 'info',
      title: 'Budget is lopsided',
      body:
        `Over 45% of your budget goes to ${maxBudgetEntry[0]}. A single priority can starve other ` +
        `systems and produce surprise crises. Diversify unless this is a deliberate, time-limited push.`,
      topic: 'economy',
    })
  }

  // 32. Welfare neglected with high inequality
  if (b.welfare < 5 && s.inequality > 55) {
    tips.push({
      id: 'bud-welfare-low',
      severity: 'info',
      title: 'Welfare under-funded',
      body:
        'Welfare is below 5% of the budget while inequality climbs. A small safety net reduces crime, ' +
        'unrest, and the political cost of harder reforms later.',
      topic: 'social',
    })
  }

  // 33. Budget doesn't sum to roughly 100
  if (budgetTotal < 90 || budgetTotal > 110) {
    tips.push({
      id: 'bud-misallocated',
      severity: 'info',
      title: 'Budget allocation unusual',
      body:
        `Your budget shares total ${budgetTotal.toFixed(0)}% rather than the expected ~100%. ` +
        `Re-check the sliders so allocations reflect what you intend to spend.`,
      topic: 'economy',
    })
  }

  // -------------------------------------------------------------------------
  // TAX RULES
  // -------------------------------------------------------------------------

  // 34. Corporate tax high (Laffer)
  if (t.corporate > 32) {
    tips.push({
      id: 'tax-corp-high',
      severity: 'info',
      title: 'Corporate tax above the curve',
      body:
        'Beyond about 30%, corporate tax revenue actually falls as firms relocate or shrink. You may be ' +
        'collecting less than a lower rate would yield. Consider trimming to broaden the base.',
      topic: 'economy',
    })
  }

  // 35. Income tax high — happiness drag
  if (t.income > 35) {
    tips.push({
      id: 'tax-income-high',
      severity: 'info',
      title: 'High income tax pinching households',
      body:
        'Income tax above 35% reliably drags happiness and approval. The revenue helps services, but ' +
        'sustained levels here erode political room for everything else.',
      topic: 'economy',
    })
  }

  // 36. Income tax very low — revenue strain
  if (t.income < 10) {
    tips.push({
      id: 'tax-income-low',
      severity: 'info',
      title: 'Low income tax — revenue thin',
      body:
        'Income tax under 10% boosts disposable income and approval, but leaves the city short on ' +
        'recurring revenue. Watch the treasury closely; a single shock can push you into deficit.',
      topic: 'economy',
    })
  }

  // 37. Sales tax high — regressive bite
  if (t.sales > 18) {
    tips.push({
      id: 'tax-sales-high',
      severity: 'info',
      title: 'Sales tax steep',
      body:
        'Sales taxes above 18% hit lower-income residents hardest and raise inequality. They are easy ' +
        'revenue but politically costly when they push inflation higher.',
      topic: 'economy',
    })
  }

  // 38. Property tax high — housing pressure
  if (t.property > 7) {
    tips.push({
      id: 'tax-prop-high',
      severity: 'info',
      title: 'Property tax pressure',
      body:
        'Heavy property taxes can dampen real-estate investment and discourage housing supply. Pair with ' +
        'targeted housing policy if you want to keep rates this high.',
      topic: 'economy',
    })
  }

  // -------------------------------------------------------------------------
  // OPPORTUNITY RULES
  // -------------------------------------------------------------------------

  // 39. Cash-rich + idle
  if (s.treasury > 200 && state.pendingEvent === null) {
    tips.push({
      id: 'opp-treasury-rich',
      severity: 'opportunity',
      title: 'Surplus ready to deploy',
      body:
        'You hold a large cash surplus with no pending crisis. Capital projects (university, research lab, ' +
        'transit hub) lock in long-term benefits better than letting it sit idle.',
      topic: 'economy',
    })
  }

  // 40. Pristine credit — borrow cheap
  if (s.creditRating > 85) {
    tips.push({
      id: 'opp-credit-strong',
      severity: 'opportunity',
      title: 'Cheap borrowing available',
      body:
        'Your credit rating is elite. Borrowing for a productive investment (transit, research, energy) ' +
        'costs little; market-rate returns easily exceed interest payments.',
      topic: 'economy',
    })
  }

  // 41. Consumer confidence high opportunity
  if (macro && macro.consumerConfidence > 75 && s.inflation < 4) {
    tips.push({
      id: 'opp-confidence-high',
      severity: 'opportunity',
      title: 'Tailwind: consumer confidence',
      body:
        'Households feel good and inflation is contained. This is the easiest time to grow the economy — ' +
        'business-friendly policies, transit, and infrastructure all multiply through.',
      topic: 'economy',
    })
  }

  return tips
}

// ============================================================================
// TUTORIAL TIPS — fire on specific early turns
// ============================================================================

export function tutorialTipForTurn(turn: number, countryId: string): AdvisorTip | null {
  // Country-specific flavoring kept light; tutorial is universal.
  const countryNote = countryId ? '' : ''
  void countryNote

  const tutorials: Record<number, AdvisorTip> = {
    0: {
      id: 'tut-0',
      severity: 'info',
      title: 'Welcome to MayorSim',
      body:
        'Each turn equals one quarter — three months. Decisions cascade over many quarters, so patience ' +
        'and consistency matter more than dramatic single moves.',
      topic: 'tutorial',
    },
    1: {
      id: 'tut-1',
      severity: 'info',
      title: 'Budget is your main lever',
      body:
        'Allocating between education, healthcare, security, infrastructure, welfare, research, and the ' +
        'environment is your most flexible tool. Each category compounds slowly — small shifts add up.',
      topic: 'tutorial',
    },
    2: {
      id: 'tut-2',
      severity: 'info',
      title: 'Taxes have curves',
      body:
        'Tax rates feed revenue but lose returns at extremes — the Laffer curve is real. Tap the info ' +
        'icon on Corporate Tax to see how rates above 30% can actually shrink your tax take.',
      topic: 'tutorial',
    },
    3: {
      id: 'tut-3',
      severity: 'info',
      title: 'Buildings take time',
      body:
        'Buildings need 1-4 quarters to come online, but their effects persist for the rest of the game. ' +
        'Plan ahead — what you queue today shapes the city next year.',
      topic: 'tutorial',
    },
    4: {
      id: 'tut-4',
      severity: 'info',
      title: 'Events test your principles',
      body:
        'Each event card forces a real trade-off — there is rarely a free choice. Every option costs ' +
        'something: cash, faction favor, approval, or future flexibility.',
      topic: 'tutorial',
    },
    5: {
      id: 'tut-5',
      severity: 'info',
      title: 'Factions remember',
      body:
        'Factions, councils, and lobbies track your decisions across many turns. Build coalitions where ' +
        'you can; pure opposition makes governing brittle.',
      topic: 'tutorial',
    },
    6: {
      id: 'tut-6',
      severity: 'info',
      title: 'Approval decides your fate',
      body:
        'Approval is how the city grades you. Below 20 risks recall; above 65 at term end opens promotion ' +
        'to higher office. Everything you do nudges this number.',
      topic: 'tutorial',
    },
    7: {
      id: 'tut-7',
      severity: 'info',
      title: 'Check the causal log',
      body:
        'After each turn, review what changed and why. Patterns emerge — you will start to anticipate ' +
        'how today\'s policy ripples through next quarter\'s stats.',
      topic: 'tutorial',
    },
  }

  return tutorials[turn] ?? null
}

// ============================================================================
// EXPLAIN CHANGE — plain English reason for a stat delta
// ============================================================================

export function explainChange(stat: keyof CityStats, delta: number, state: GameState): string {
  const s = state.stats
  const b = state.budget
  const t = state.tax
  const up = delta > 0
  const magnitude = Math.abs(delta)

  switch (stat) {
    case 'treasury':
      return up
        ? `Treasury grew by ${magnitude.toFixed(1)}M — tax revenue outpaced spending this quarter, often a sign of healthy growth or restraint.`
        : `Treasury fell by ${magnitude.toFixed(1)}M — spending exceeded revenue. Check whether a one-off cost (building, event) or a structural shortfall drove it.`

    case 'gdpPerCapita':
      return up
        ? `GDP per capita rose — productivity ticked up, likely from education, infrastructure, or favorable macro winds.`
        : `GDP per capita fell — typical causes are rising unemployment, lost business confidence, or a sector shock dragging output.`

    case 'unemployment':
      return up
        ? `Unemployment climbed — slowing business activity, automation displacing workers, or a sector contraction is the usual culprit.`
        : `Unemployment dropped — fresh hiring, often from infrastructure spend or growing sectors absorbing the workforce.`

    case 'inflation':
      return up
        ? `Inflation rose ${magnitude.toFixed(1)} pts — likely from deficit spending, a tight labor market, or supply shocks feeding prices.`
        : `Inflation cooled ${magnitude.toFixed(1)} pts — tighter budgets, weaker demand, or improved supply conditions are easing prices.`

    case 'debt':
      return up
        ? `Debt rose — new borrowing or rolling over existing bonds. Watch the interest cost as the rating drifts.`
        : `Debt fell — surplus dollars retired bonds. This strengthens credit and frees future budget.`

    case 'creditRating':
      return up
        ? `Credit improved — rating agencies reward steady reserves, contained debt, and stable growth.`
        : `Credit weakened — high debt, deficits, political instability, or downgrades among peer cities can all push it down.`

    case 'population':
      return up
        ? `Population grew — births plus net migration in. Good schools, jobs, and housing usually drive the inflow.`
        : `Population shrank — emigration outpaced births. High crime, taxes, pollution, or low approval often trigger this.`

    case 'education':
      return up
        ? `Education rose — sustained funding, new schools, or universities are slowly lifting attainment.`
        : `Education slipped — underfunded schools or a brain drain (residents leaving) can drag the average down.`

    case 'health':
      return up
        ? `Health improved — healthcare investment, cleaner air, and lower unemployment all show up here.`
        : `Health declined — typically pollution, a pandemic event, or welfare cuts hitting vulnerable groups.`

    case 'happiness':
      return up
        ? `Happiness rose — most often from lower crime, lower inflation, parks, or rising real incomes.`
        : `Happiness dropped — likely from higher crime, pollution, joblessness, or a regressive tax shift.`

    case 'approval':
      return up && magnitude > 2
        ? `Approval jumped — a popular decision, visible win, or rising happiness lifted you in voters\' eyes.`
        : up
          ? `Approval drifted up — small wins accumulating; voters reward steady, visible competence.`
          : magnitude > 2
            ? `Approval slipped sharply — likely a tax hike, controversial choice, or rising inflation.`
            : `Approval drifted down — minor frustrations adding up; check happiness and pending events.`

    case 'crime':
      return up
        ? `Crime climbed — usually rooted in joblessness, inequality, or under-funded education and policing.`
        : `Crime fell — a combination of policing, jobs, and education tends to drive durable declines.`

    case 'pollution':
      return up
        ? `Pollution rose — industrial growth, dirty power, or lax emission standards added to the load.`
        : `Pollution eased — environmental spending, stricter standards, or new parks are helping.`

    case 'innovation':
      return up
        ? `Innovation accelerated — research spend, university output, and an educated workforce are paying off.`
        : `Innovation slipped — talent loss, cut research budgets, or competing tech hubs pulling ideas away.`

    case 'inequality':
      return up
        ? `Inequality widened — top-end growth outpaced the bottom, often from regressive taxes or job polarization.`
        : `Inequality narrowed — progressive taxes, welfare, or broad education access flattened the curve.`
  }

  // Defensive default
  void s
  void b
  void t
  return `${String(stat)} changed by ${delta.toFixed(2)}.`
}

// ============================================================================
// CAUSAL CHAIN TRACER — likely contributing factors for the current value
// ============================================================================

export function traceCausalChain(stat: keyof CityStats, state: GameState): string[] {
  const s = state.stats
  const b = state.budget
  const t = state.tax
  const macro = state.macro
  const factions = state.factions ?? []
  const chain: string[] = []

  switch (stat) {
    case 'treasury': {
      if (s.unemployment > 8) chain.push('High unemployment is shrinking the tax base.')
      if (t.income < 15) chain.push('Income tax is low — recurring revenue is thin.')
      if (b.security + b.healthcare + b.infrastructure > 70)
        chain.push('Large recurring spending categories are squeezing reserves.')
      if (s.debt > s.gdpPerCapita * state.stats.population * 0.0000005)
        chain.push('Debt service costs are eating into the operating surplus.')
      if (macro && macro.federalFunding < 20)
        chain.push('Federal transfers are below normal this period.')
      break
    }

    case 'gdpPerCapita': {
      if (s.education < 55) chain.push('Workforce education is below the productivity threshold.')
      if (b.infrastructure < 12) chain.push('Infrastructure spend is too thin to support firms.')
      if (s.unemployment > 7) chain.push('Idle labor is dragging average output down.')
      if (s.pollution > 60) chain.push('Heavy pollution is suppressing high-value sectors.')
      if (macro && macro.nationalGdpGrowth < 1)
        chain.push('National growth headwinds are limiting your ceiling.')
      break
    }

    case 'unemployment': {
      if (s.education < 50) chain.push('Skills mismatch: education lags available jobs.')
      if (b.infrastructure < 10) chain.push('Underfunded infrastructure suppresses construction jobs.')
      if (macro && macro.techWave > 70 && s.education < 60)
        chain.push('Automation is displacing undertrained workers.')
      if (t.corporate > 30) chain.push('High corporate tax is discouraging local hiring.')
      if (s.crime > 55) chain.push('Crime is pushing employers out of the city.')
      break
    }

    case 'inflation': {
      if (s.unemployment < 4) chain.push('Tight labor market is pushing wages and prices up.')
      if (s.treasury < 0 || b.welfare + b.security + b.healthcare > 75)
        chain.push('Heavy deficit spending is fueling demand.')
      if (macro && macro.nationalInflation > 4)
        chain.push('National inflation is anchoring yours higher.')
      if (t.sales > 15) chain.push('Sales tax is showing up in consumer prices.')
      break
    }

    case 'debt': {
      if (s.treasury < 30) chain.push('Treasury is thin, forcing reliance on borrowing.')
      if (s.creditRating < 60) chain.push('Weaker credit raises the cost of every new bond.')
      if (b.infrastructure > 20) chain.push('Infrastructure pushes are capital-intensive.')
      if (s.unemployment > 8) chain.push('Counter-cyclical spending is adding to liabilities.')
      break
    }

    case 'creditRating': {
      if (s.debt > 0 && s.gdpPerCapita * state.stats.population * 0.000001 < s.debt)
        chain.push('Debt has grown faster than the economy can comfortably carry.')
      if (s.treasury < 30) chain.push('Slim reserves spook rating analysts.')
      if (s.inflation > 6) chain.push('High inflation undermines the value of city bonds.')
      if (macro && macro.geopolitical === 'crisis')
        chain.push('National risk premium is rising during a geopolitical crisis.')
      break
    }

    case 'population': {
      if (s.crime > 55) chain.push('Crime is driving residents out.')
      if (s.pollution > 60) chain.push('Air and water quality are pushing families to leave.')
      if (s.unemployment > 8) chain.push('Lack of jobs encourages out-migration.')
      if (state.policy.immigration === 'restrictive')
        chain.push('Restrictive immigration policy limits inflow.')
      if (s.happiness < 45) chain.push('Low happiness reduces the net inflow of new residents.')
      break
    }

    case 'education': {
      if (b.education < 12) chain.push('Education budget is below the maintenance threshold.')
      const schools = state.buildings.filter((bld) => bld.type === 'school').length
      const universities = state.buildings.filter((bld) => bld.type === 'university').length
      if (schools < 2) chain.push('Few schools relative to population — capacity is strained.')
      if (universities === 0) chain.push('No universities means weak top-end attainment.')
      if (s.inequality > 60) chain.push('High inequality limits access for poorer districts.')
      break
    }

    case 'health': {
      if (b.healthcare < 12) chain.push('Healthcare budget is light for the population size.')
      if (s.pollution > 55) chain.push('Pollution is degrading public health.')
      if (s.unemployment > 8)
        chain.push('Joblessness reduces preventive care use among lower-income residents.')
      const hospitals = state.buildings.filter((bld) => bld.type === 'hospital').length
      if (hospitals < 2) chain.push('Hospital capacity is limited.')
      break
    }

    case 'happiness': {
      if (s.crime > 55) chain.push('Crime is depressing daily life satisfaction.')
      if (s.inflation > 5) chain.push('Rising prices are eroding real incomes.')
      if (s.unemployment > 8) chain.push('Joblessness weighs heavily on overall mood.')
      if (s.pollution > 55) chain.push('Pollution is degrading quality of life.')
      if (t.income > 35 || t.sales > 18) chain.push('Tax burden is biting household budgets.')
      break
    }

    case 'approval': {
      if (s.happiness < 45) chain.push('Happiness has been low; approval is tracking it down.')
      if (s.inflation > 5) chain.push('Inflation almost always punishes incumbents.')
      if (t.income > 35) chain.push('High income tax is unpopular.')
      const hostile = factions.find((f: Faction) => f.favor < -50 && f.power > 40)
      if (hostile) chain.push(`${hostile.name} is actively campaigning against you.`)
      if (s.crime > 55) chain.push('Voters rate safety highly; crime is dragging numbers down.')
      break
    }

    case 'crime': {
      if (s.unemployment > 7) chain.push('High unemployment in working-class districts.')
      if (b.education < 10) chain.push('Underfunded education limits long-run prevention.')
      if (s.inequality > 60) chain.push('Inequality is climbing — a leading indicator of crime.')
      if (b.security < 10) chain.push('Police and corrections funding is thin.')
      if (state.policy.drugPolicy === 'punitive')
        chain.push('Punitive drug policy is filling jails without reducing supply.')
      break
    }

    case 'pollution': {
      if (state.policy.emissionStandards === 'lax')
        chain.push('Lax emission standards let industry pollute freely.')
      const dirtyPlants = state.buildings.filter((bld) => bld.type === 'powerPlant').length
      const wasteTreatment = state.buildings.filter((bld) => bld.type === 'wasteTreatment').length
      if (dirtyPlants > 2) chain.push('Several power plants concentrate emissions.')
      if (wasteTreatment === 0) chain.push('No waste treatment facilities to offset the load.')
      if (b.environment < 8) chain.push('Environment budget is too thin to clean up.')
      if (macro && macro.climateRisk > 60) chain.push('National climate stress is amplifying local pollution episodes.')
      break
    }

    case 'innovation': {
      if (b.research < 8) chain.push('Research budget is below the threshold for new patents.')
      if (s.education < 60) chain.push('Education limits the talent pipeline.')
      const labs = state.buildings.filter((bld) => bld.type === 'researchLab').length
      const unis = state.buildings.filter((bld) => bld.type === 'university').length
      if (labs === 0) chain.push('No research labs to anchor R&D activity.')
      if (unis === 0) chain.push('No universities to feed the innovation pipeline.')
      if (macro && macro.techWave < 30) chain.push('National tech wave is weak — fewer external sparks.')
      break
    }

    case 'inequality': {
      if (t.income < 15 || t.corporate < 12)
        chain.push('Low progressive taxation lets top incomes outpace the rest.')
      if (b.welfare < 6) chain.push('Welfare is thin — the safety net is not catching everyone.')
      if (s.education < 55) chain.push('Unequal education access reproduces income gaps.')
      if (s.unemployment > 7)
        chain.push('Joblessness concentrated in lower-income districts widens the gap.')
      break
    }
  }

  // Keep to top 2-4 factors
  if (chain.length === 0) chain.push(`No dominant driver detected for ${String(stat)}.`)
  return chain.slice(0, 4)
}

// ============================================================================
// HELPERS — internal
// ============================================================================

function sumBudget(b: GameState['budget']): number {
  return (
    b.education +
    b.healthcare +
    b.security +
    b.infrastructure +
    b.welfare +
    b.research +
    b.environment
  )
}

function computeDebtToGdpRatio(state: GameState): number {
  const s = state.stats
  // Annualize per-capita GDP across population, in $M (gdpPerCapita is $/person)
  const annualGdpInMillions = (s.gdpPerCapita * s.population) / 1_000_000
  if (annualGdpInMillions <= 0) return 0
  return s.debt / annualGdpInMillions
}
