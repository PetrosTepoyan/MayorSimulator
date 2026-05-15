import type { GameEvent } from './types'

// Event card library. Each card has 2-3 choices with diverging consequences.
// Goal: every choice should teach something — there are tradeoffs, not "right" answers.

export const EVENTS: GameEvent[] = [
  // ------------------- ECONOMIC -------------------
  {
    id: 'factory_expansion',
    title: 'Old Factory Wants to Expand',
    description:
      'The largest employer in the industrial district wants a permit to expand. They are promising 600 new jobs but say they need a tax break to make it work.',
    flavor: '"Without this, we move operations elsewhere," the CEO says publicly.',
    category: 'economic',
    weight: 10,
    choices: [
      {
        label: 'Grant a 5-year tax break',
        effects: { unemployment: -1.2, gdpPerCapita: 200, treasury: -8, pollution: 1.5, approval: 1 },
        outcome: 'Jobs come online quickly. Treasury takes a near-term hit; pollution rises.',
      },
      {
        label: 'Approve, no tax break',
        effects: { unemployment: -0.6, gdpPerCapita: 80, pollution: 0.8, treasury: 4, inequality: 0.3 },
        outcome: 'They expand smaller than planned. Revenue holds.',
      },
      {
        label: 'Refuse — demand cleaner alternatives',
        effects: { unemployment: 0.4, pollution: -0.3, innovation: 0.5, approval: -2 },
        outcome: 'Workers protest the lost jobs. Long-term you protect air quality.',
      },
    ],
  },
  {
    id: 'tech_hq',
    title: 'Tech Company Eyes Your City',
    description:
      'A growing tech company is considering opening a regional headquarters in your city — but so are three other cities.',
    category: 'opportunity',
    weight: 7,
    choices: [
      {
        label: 'Offer $40M in incentives',
        cost: 40,
        effects: { innovation: 4, gdpPerCapita: 350, unemployment: -0.8, inequality: 1.5, approval: 1 },
        outcome: 'They sign. Innovation surges. Critics call it a giveaway to the wealthy.',
      },
      {
        label: 'Offer fast-tracked permits, no cash',
        effects: { innovation: 1.5, gdpPerCapita: 80, unemployment: -0.2 },
        outcome: 'They open a smaller satellite office. Modest win.',
      },
      {
        label: 'Pass — focus on small business',
        effects: { inequality: -1, innovation: -0.5, happiness: 1, approval: 1 },
        outcome: 'Small business community cheers. The HQ goes to a rival city.',
      },
    ],
  },
  {
    id: 'bond_market',
    title: 'Bond Market Jitters',
    description:
      'Rating agencies are reviewing the city. They warn that without a credible fiscal plan, your credit rating may be downgraded.',
    category: 'economic',
    weight: 6,
    choices: [
      {
        label: 'Announce austerity package',
        effects: { creditRating: 6, happiness: -3, approval: -4, treasury: 12 },
        outcome: 'Bond yields drop. Residents are angry about service cuts.',
      },
      {
        label: 'Reassure via PR — change nothing',
        effects: { creditRating: -4, happiness: 0, approval: -1 },
        outcome: 'Agencies are unconvinced. Downgrade looms.',
      },
      {
        label: 'Raise corporate tax 2 points temporarily',
        effects: { creditRating: 2, treasury: 8, gdpPerCapita: -50, approval: -1 },
        outcome: 'Revenue stabilizes; businesses grumble.',
      },
    ],
  },

  // ------------------- SOCIAL -------------------
  {
    id: 'teacher_strike',
    title: 'Teachers Threaten Strike',
    description:
      'The teachers union is demanding a 12% pay raise. Schools will close in 3 weeks if unresolved.',
    category: 'social',
    weight: 8,
    choices: [
      {
        label: 'Agree to 12% raise',
        effects: { treasury: -10, education: 2, happiness: 2, approval: 2, inflation: 0.3 },
        outcome: 'Schools stay open. Other unions are watching closely.',
      },
      {
        label: 'Counter with 6%',
        effects: { treasury: -4, education: 1, happiness: 0, approval: -1 },
        outcome: 'Deal reached after tense negotiations.',
      },
      {
        label: 'Refuse — schools close',
        effects: { education: -3, happiness: -5, approval: -8, crime: 1 },
        outcome: 'Strike drags on. Parents are furious. Kids fall behind.',
      },
    ],
  },
  {
    id: 'protest',
    title: 'Mass Protest at City Hall',
    description:
      'Thousands gather outside city hall demanding action on inequality and housing costs.',
    category: 'political',
    weight: 8,
    choices: [
      {
        label: 'Address them publicly, commit to a housing plan',
        cost: 6,
        effects: { approval: 3, happiness: 2, inequality: -0.5 },
        outcome: 'You earn respect. The plan must be delivered.',
      },
      {
        label: 'Send police to disperse',
        effects: { approval: -6, happiness: -3, crime: 2 },
        outcome: 'Images of crackdown circulate. Trust in government drops.',
      },
      {
        label: 'Wait it out',
        effects: { approval: -2, happiness: -1 },
        outcome: 'It passes. Nothing changed. People remember.',
      },
    ],
  },
  {
    id: 'crime_spike',
    title: 'Crime Spike in District 5',
    description:
      'Robberies in the southeast district have doubled this month. Local council members are demanding action.',
    category: 'social',
    weight: 9,
    choices: [
      {
        label: 'Deploy more patrols',
        cost: 4,
        effects: { crime: -3, approval: 1, happiness: 1 },
        outcome: 'Crime drops quickly. Tension between police and residents rises.',
      },
      {
        label: 'Fund youth programs and jobs',
        cost: 6,
        effects: { crime: -1, unemployment: -0.3, happiness: 1, approval: 0 },
        outcome: 'Slower fix but addresses root causes.',
      },
      {
        label: 'Do nothing — media exaggerates',
        effects: { crime: 1, approval: -3, happiness: -1 },
        outcome: 'It gets worse. Editorials are scathing.',
      },
    ],
  },

  // ------------------- ENVIRONMENTAL -------------------
  {
    id: 'heatwave',
    title: 'Record Heatwave',
    description:
      'A deadly heatwave is forecast. Vulnerable residents are at risk.',
    category: 'environmental',
    weight: 7,
    choices: [
      {
        label: 'Open cooling centers',
        cost: 3,
        effects: { health: 1, happiness: 2, approval: 2 },
        outcome: 'Vulnerable residents are safe. You get credit for preparedness.',
      },
      {
        label: 'Issue advisory only',
        effects: { health: -2, approval: -1 },
        outcome: 'Some deaths reported. Editorials demand action.',
      },
    ],
  },
  {
    id: 'industrial_spill',
    title: 'Industrial Accident',
    description:
      'A chemical leak at a plant on the riverfront. Cleanup costs are real.',
    category: 'environmental',
    weight: 5,
    choices: [
      {
        label: 'Full cleanup, sue the company',
        cost: 18,
        effects: { pollution: -4, approval: 2, treasury: 4 },
        outcome: 'River recovers. Legal battle drags on but the city wins.',
      },
      {
        label: 'Minimal cleanup, settle quietly',
        cost: 4,
        effects: { pollution: 2, health: -1, approval: -3, treasury: -2 },
        outcome: 'Cheaper now, expensive in headlines later.',
      },
    ],
  },

  // ------------------- CRISIS -------------------
  {
    id: 'pandemic',
    title: 'Pandemic Wave',
    description:
      'A respiratory virus is spreading rapidly. Hospitals are filling up.',
    category: 'crisis',
    weight: 4,
    choices: [
      {
        label: 'Order strict lockdown',
        effects: { health: 2, gdpPerCapita: -300, unemployment: 1.5, happiness: -4, approval: -2 },
        outcome: 'Cases fall. Economy stalls hard.',
      },
      {
        label: 'Mask mandate + capacity limits',
        cost: 4,
        effects: { health: 1, gdpPerCapita: -100, unemployment: 0.4, happiness: -1 },
        outcome: 'Balanced approach. Some compliance fights.',
      },
      {
        label: 'Stay open, advise caution',
        effects: { health: -4, gdpPerCapita: 50, happiness: -2, approval: -1 },
        outcome: 'Hospitals overwhelmed. Death toll climbs.',
      },
    ],
  },
  {
    id: 'hurricane',
    title: 'Hurricane Warning',
    description:
      'A category 3 storm is 48 hours out. Coastal districts are at risk.',
    category: 'crisis',
    weight: 4,
    choices: [
      {
        label: 'Mandatory evacuation',
        cost: 10,
        effects: { health: 1, happiness: -2, approval: 1, gdpPerCapita: -80 },
        outcome: 'Lives saved. Businesses lose days of revenue.',
      },
      {
        label: 'Voluntary evacuation + shelter',
        cost: 4,
        effects: { health: -1, happiness: -1, approval: 0 },
        outcome: 'Mixed outcomes. Some deaths in low-lying areas.',
      },
      {
        label: 'Trust the forecast may shift',
        effects: { health: -4, happiness: -3, approval: -6, gdpPerCapita: -150 },
        outcome: 'Storm hits. Cleanup costs and political costs are massive.',
      },
    ],
  },
  {
    id: 'budget_crisis',
    title: 'Pension Shortfall Discovered',
    description:
      "The auditor finds the city's pension fund is $40M short of obligations.",
    category: 'crisis',
    weight: 4,
    choices: [
      {
        label: 'Inject $25M now, raise taxes 1pt',
        cost: 25,
        effects: { creditRating: 4, approval: -3, happiness: -2 },
        outcome: 'Pensioners safe. Voters grumble.',
      },
      {
        label: 'Borrow to fill the gap',
        effects: { debt: 40, creditRating: -3, approval: -1 },
        outcome: 'Problem deferred. Interest costs accumulate.',
      },
      {
        label: 'Negotiate benefit cuts',
        effects: { treasury: 12, happiness: -4, approval: -5, inequality: 1 },
        outcome: 'Pensioners protest. Saves money long-term.',
      },
    ],
  },

  // ------------------- OPPORTUNITY -------------------
  {
    id: 'federal_grant',
    title: 'Federal Infrastructure Grant Available',
    description:
      'A national program is offering matching grants for transit projects.',
    category: 'opportunity',
    weight: 6,
    choices: [
      {
        label: 'Apply (commits $20M of city funds)',
        cost: 20,
        effects: { gdpPerCapita: 150, pollution: -1, happiness: 2, approval: 2 },
        outcome: 'Grant received. Construction underway.',
      },
      {
        label: 'Pass — keep funds flexible',
        effects: { treasury: 0 },
        outcome: 'No match, no project. Money stays in the bank.',
      },
    ],
  },
  {
    id: 'ai_initiative',
    title: 'AI Initiative Pitched',
    description:
      "A consortium wants to make your city a hub for AI research and deployment in government services.",
    category: 'opportunity',
    weight: 5,
    choices: [
      {
        label: 'Go all-in: invest, retrain workers',
        cost: 30,
        effects: { innovation: 5, education: 2, unemployment: 0.6, inequality: 1, gdpPerCapita: 250 },
        outcome: 'Bold move. Innovation surges; some workers displaced before retraining lands.',
      },
      {
        label: 'Pilot in one department',
        cost: 8,
        effects: { innovation: 1.5, gdpPerCapita: 60 },
        outcome: 'Measured progress. Lessons learned.',
      },
      {
        label: 'Decline — too risky',
        effects: { innovation: -0.5, happiness: 0 },
        outcome: 'Status quo holds.',
      },
    ],
  },
  {
    id: 'green_bond',
    title: 'Green Bond Offer',
    description:
      'International investors offer favorable rates on green infrastructure bonds — strings: must spend on renewables.',
    category: 'opportunity',
    weight: 4,
    choices: [
      {
        label: 'Issue $50M green bond',
        effects: { debt: 50, pollution: -3, gdpPerCapita: 80, innovation: 1, approval: 1 },
        outcome: 'Cheap capital, restricted spending.',
      },
      {
        label: 'Decline — keep debt low',
        effects: {},
        outcome: 'Bonds go to another city.',
      },
    ],
  },

  // ------------------- POLITICAL -------------------
  {
    id: 'scandal',
    title: 'Aide Caught in Scandal',
    description:
      'A senior aide is accused of corruption — kickbacks from a construction contract.',
    category: 'political',
    weight: 6,
    choices: [
      {
        label: 'Fire them immediately, public apology',
        effects: { approval: -2, happiness: -1, creditRating: 1 },
        outcome: 'Damage controlled. You look decisive.',
      },
      {
        label: 'Defend them pending investigation',
        effects: { approval: -5, happiness: -2 },
        outcome: 'Investigation drags. Trust erodes.',
      },
      {
        label: 'Quietly let them resign',
        effects: { approval: -3, happiness: -1 },
        outcome: 'Press senses something. Half-credit.',
      },
    ],
  },
  {
    id: 'foreign_visit',
    title: 'Foreign Mayor Wants to Twin Cities',
    description:
      'A wealthy international city proposes a sister-city partnership with trade and student exchanges.',
    category: 'political',
    weight: 5,
    choices: [
      {
        label: 'Accept enthusiastically',
        cost: 2,
        effects: { gdpPerCapita: 30, education: 0.5, innovation: 0.5, happiness: 1 },
        outcome: 'Modest but real gains over time.',
      },
      {
        label: 'Polite decline',
        effects: {},
        outcome: 'Nothing changes.',
      },
    ],
  },
  {
    id: 'university_proposal',
    title: 'New University Campus Proposed',
    description:
      'A private foundation wants to build a STEM campus if the city contributes land and $25M.',
    category: 'opportunity',
    weight: 4,
    choices: [
      {
        label: 'Approve and contribute',
        cost: 25,
        effects: { education: 3, innovation: 3, gdpPerCapita: 150, approval: 2 },
        outcome: 'Construction begins. Long payoff.',
      },
      {
        label: 'Decline — city land is too valuable',
        effects: { treasury: 5 },
        outcome: 'They build in the suburbs.',
      },
    ],
  },
]
