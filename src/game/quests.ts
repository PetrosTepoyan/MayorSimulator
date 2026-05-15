import type { GameState, CityStats } from './types'

// ============================================================================
// QUESTS — multi-turn narrative arcs.
// Each quest is a small story with branching stages. Stages unlock based on
// the player's choices and current city state. Quests reference recurring
// NPCs (Councilor Reyes, CEO Yana Mori, Journalist Liam Ortega, etc.) so the
// player feels they live in a city with persistent characters and continuity.
// ============================================================================

export interface QuestStage {
  id: string
  title: string
  description: string
  // Choice or task to complete this stage
  choices: Array<{
    label: string
    cost?: number
    effects: Partial<CityStats>
    outcome: string
    // What stage to advance to (or 'complete'/'fail')
    next: string | 'complete' | 'fail'
  }>
  // Stat-based auto-advance (e.g. "if treasury > 500, advance")
  autoAdvance?: { stat: keyof CityStats; gt?: number; lt?: number; next: string }
}

export interface Quest {
  id: string
  name: string
  description: string
  giver: string
  category: 'civic' | 'economic' | 'political' | 'environment' | 'tech' | 'social'
  startCondition: (state: GameState) => boolean
  stages: QuestStage[]
  reward: { approval?: number; treasury?: number; innovation?: number; achievement?: string }
  failPenalty?: { approval?: number; treasury?: number }
}

export interface ActiveQuest {
  questId: string
  currentStageId: string
  startedTurn: number
  log: string[]
  status: 'active' | 'completed' | 'failed'
}

// ============================================================================
// QUEST LIBRARY
// ============================================================================

export const QUESTS: Quest[] = [
  // --------------------------------------------------------------------------
  // 1. THE TECH HUB PUSH
  // --------------------------------------------------------------------------
  {
    id: 'tech_hub_push',
    name: 'The Tech Hub Push',
    description:
      'Yana Mori, the rising-star CEO of Mori Systems, has been in your office three Wednesdays in a row. She believes your city could be the next great tech corridor — if you move fast. Other mayors are circling.',
    giver: 'Tech Industry CEO Yana Mori',
    category: 'tech',
    startCondition: (s) => s.stats.innovation >= 35 && s.stats.treasury >= 80,
    reward: { approval: 6, treasury: 25, innovation: 12, achievement: 'silicon_mayor' },
    failPenalty: { approval: -4, treasury: -10 },
    stages: [
      {
        id: 'seed_district',
        title: 'Seed the Tech District',
        description:
          'Yana wants the old textile quarter rezoned into a "Tech Corridor" — fiber backbone, tax breaks for startups, the works. Your finance team is twitchy about the cost.',
        choices: [
          {
            label: 'Fund full district rezone & fiber rollout ($35M)',
            cost: 35,
            effects: { innovation: 4, gdpPerCapita: 80, approval: 2, inequality: 1 },
            outcome:
              'The corridor opens with fanfare. Property values around it surge — locals worry about being priced out.',
            next: 'build_labs',
          },
          {
            label: 'Modest pilot zone, no incentives',
            cost: 8,
            effects: { innovation: 1, gdpPerCapita: 15, approval: 0 },
            outcome:
              'Two startups move in. Yana is visibly disappointed at the ribbon-cutting.',
            next: 'build_labs',
          },
          {
            label: 'Decline — focus on traditional industry',
            effects: { innovation: -1, approval: -2 },
            outcome:
              'Yana takes her conference call from a rival city the next morning.',
            next: 'fail',
          },
        ],
      },
      {
        id: 'build_labs',
        title: 'Research Labs or Bust',
        description:
          'Mori Systems will only sign a long-term lease if the city co-funds two research labs. The Council is split.',
        choices: [
          {
            label: 'Co-fund two public-private research labs ($25M)',
            cost: 25,
            effects: { innovation: 5, education: 2, treasury: -5, approval: 1 },
            outcome:
              'Lab construction begins. The university is delighted; the welfare lobby is not.',
            next: 'attract_talent',
          },
          {
            label: 'Co-fund one lab, share IP rights',
            cost: 12,
            effects: { innovation: 2, education: 1, gdpPerCapita: 30 },
            outcome:
              'A leaner deal. Yana grumbles but signs the MOU.',
            next: 'attract_talent',
          },
          {
            label: 'Demand labs without public funds',
            effects: { innovation: -1, approval: -1 },
            outcome:
              'Mori Systems threatens to walk. The press calls you a "rust-belt mayor."',
            next: 'fail',
          },
        ],
      },
      {
        id: 'attract_talent',
        title: 'The Talent Migration',
        description:
          'Out-of-town engineers will only relocate if there is housing they can afford and schools they trust. Yana is hosting a recruiting dinner Saturday.',
        choices: [
          {
            label: 'Subsidize tech-worker housing & STEM school upgrades',
            cost: 18,
            effects: { education: 3, happiness: 1, inequality: 1, innovation: 2 },
            outcome:
              'Three hundred engineers sign relocation papers within a month. Existing residents notice the favoritism.',
            next: 'host_conference',
          },
          {
            label: 'Run a relocation marketing blitz only',
            cost: 4,
            effects: { innovation: 1, gdpPerCapita: 20 },
            outcome:
              'Decent turnout, but recruits keep asking about rent. Several pass.',
            next: 'host_conference',
          },
        ],
      },
      {
        id: 'host_conference',
        title: 'The MoriCon Bid',
        description:
          'Yana offers to bring her annual conference here — 40,000 attendees. The convention bureau is ecstatic; the residents along the boulevard, less so.',
        choices: [
          {
            label: 'Host MoriCon, close streets for 5 days',
            cost: 10,
            effects: { gdpPerCapita: 200, innovation: 3, happiness: -1, approval: 1 },
            outcome:
              'The city is in every tech publication for a week. Local commuters are furious.',
            next: 'ipo_decision',
          },
          {
            label: 'Host a smaller side-event instead',
            cost: 3,
            effects: { innovation: 1, gdpPerCapita: 40 },
            outcome:
              'A polite success. Yana sends a thank-you note that reads like a shrug.',
            next: 'ipo_decision',
          },
        ],
      },
      {
        id: 'ipo_decision',
        title: 'IPO Day',
        description:
          'Mori Systems is going public. Yana asks you to ring the bell with her — and to publicly endorse a city pension fund investment in the offering.',
        choices: [
          {
            label: 'Endorse and invest pension funds in the IPO',
            effects: { treasury: 30, innovation: 3, creditRating: -3, inequality: 2 },
            outcome:
              'The stock pops 40%. Pensioners cheer — until the inevitable correction.',
            next: 'complete',
          },
          {
            label: 'Ring the bell, but keep pensions out',
            effects: { innovation: 2, approval: 3, gdpPerCapita: 100 },
            outcome:
              'A clean win. The pension board sends you a fruit basket.',
            next: 'complete',
          },
          {
            label: 'Skip the ceremony — too political',
            effects: { approval: -3, innovation: -1 },
            outcome:
              'Yana never quite forgets. Mori Systems opens its second HQ elsewhere.',
            next: 'complete',
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 2. THE RIVERFRONT RENEWAL
  // --------------------------------------------------------------------------
  {
    id: 'riverfront_renewal',
    name: 'The Riverfront Renewal',
    description:
      'The Old Mill District abuts a river that used to be the city\'s pride and is now its embarrassment. Councilor Reyes has tabled a renewal motion three sessions in a row. This time it might actually pass.',
    giver: 'Councilor Adela Reyes',
    category: 'civic',
    startCondition: (s) => s.stats.pollution >= 35,
    reward: { approval: 8, achievement: 'river_reborn', innovation: 2 },
    failPenalty: { approval: -5 },
    stages: [
      {
        id: 'clean_pollution',
        title: 'Clean the River',
        description:
          'Decades of industrial runoff have made the river unswimmable. The cleanup will be slow, public, and expensive.',
        choices: [
          {
            label: 'Full dredging + upstream enforcement ($30M)',
            cost: 30,
            effects: { pollution: -5, health: 2, approval: 2 },
            outcome:
              'The river runs clearer within months. The first heron in 20 years lands at Pier 9.',
            next: 'build_treatment',
          },
          {
            label: 'Surface cleanup, voluntary corporate pledges',
            cost: 8,
            effects: { pollution: -1, approval: 0 },
            outcome:
              'Plastic bottles vanish; the chemicals do not. Reyes is unimpressed.',
            next: 'build_treatment',
          },
          {
            label: 'Sue the polluters first, cleanup later',
            cost: 4,
            effects: { treasury: 8, pollution: 1, approval: -1 },
            outcome:
              'A judge sides with the city — in three years. The smell remains.',
            next: 'build_treatment',
          },
        ],
      },
      {
        id: 'build_treatment',
        title: 'Build the Waste Treatment Plant',
        description:
          'Reyes wants a state-of-the-art waste treatment facility upstream. Engineers say it would be a 30-year investment.',
        choices: [
          {
            label: 'Build the flagship plant ($45M)',
            cost: 45,
            effects: { pollution: -6, health: 2, innovation: 1, debt: 20 },
            outcome:
              'Construction begins. Even neighboring towns ask to plug into it.',
            next: 'build_park',
          },
          {
            label: 'Retrofit the existing facility',
            cost: 15,
            effects: { pollution: -2, health: 1 },
            outcome:
              'It will do — for now. Engineers say to budget for a replacement in a decade.',
            next: 'build_park',
          },
        ],
      },
      {
        id: 'build_park',
        title: 'The Riverside Park',
        description:
          'Now that the water no longer eats your shoes, the riverbank is prime real estate. Reyes wants a public park; developers want condos.',
        choices: [
          {
            label: 'Build a long linear public park',
            cost: 20,
            effects: { happiness: 4, health: 2, approval: 3, pollution: -1 },
            outcome:
              'Joggers, kayakers, and weekend painters arrive. The park becomes a postcard.',
            next: 'housing_decision',
          },
          {
            label: 'Mixed: half park, half boardwalk businesses',
            cost: 12,
            effects: { happiness: 2, gdpPerCapita: 60, approval: 1 },
            outcome:
              'A compromise nobody loves and nobody hates. The cafes do well.',
            next: 'housing_decision',
          },
        ],
      },
      {
        id: 'housing_decision',
        title: 'Riverside Housing',
        description:
          'A developer wants to build 800 luxury units along the new park. The renters\' coalition wants affordable housing. Reyes asks you to choose.',
        choices: [
          {
            label: 'Approve luxury towers — tax revenue is real',
            effects: { treasury: 25, inequality: 3, gdpPerCapita: 100, approval: -2 },
            outcome:
              'The skyline gleams. Reyes resigns from your renewal committee.',
            next: 'complete',
          },
          {
            label: 'Mandate 40% affordable units',
            cost: 6,
            effects: { inequality: -2, happiness: 2, approval: 4, treasury: 8 },
            outcome:
              'The developer grumbles but signs. Reyes hugs you on camera.',
            next: 'complete',
          },
          {
            label: 'Public housing only',
            cost: 18,
            effects: { inequality: -3, happiness: 3, approval: 2, treasury: -6 },
            outcome:
              'The developer walks. The city builds it anyway, slowly.',
            next: 'complete',
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 3. THE CRIME WAVE TRILOGY
  // --------------------------------------------------------------------------
  {
    id: 'crime_wave_trilogy',
    name: 'The Crime Wave Trilogy',
    description:
      'Three districts have seen violent crime spike. Police Chief Donovan wants funds. Community organizer Maya Holt wants reform. Both are right; both are watching.',
    giver: 'Police Chief Frank Donovan',
    category: 'political',
    startCondition: (s) => s.stats.crime >= 45,
    reward: { approval: 7, achievement: 'safer_streets' },
    failPenalty: { approval: -8 },
    stages: [
      {
        id: 'district_spikes',
        title: 'The Three-District Spike',
        description:
          'A drive-by in the East End. A string of robberies in Midtown. Arson on Beacon Hill. The news runs the map every night.',
        choices: [
          {
            label: 'Triple patrols in all three districts',
            cost: 10,
            effects: { crime: -4, approval: 1, happiness: -1, inequality: 1 },
            outcome:
              'Crime drops. Community trust drops with it. Holt calls a press conference.',
            next: 'policing_vs_youth',
          },
          {
            label: 'Surge investigators, dial back uniform presence',
            cost: 7,
            effects: { crime: -2, approval: 0 },
            outcome:
              'Steady progress. Donovan says it isn\'t enough.',
            next: 'policing_vs_youth',
          },
          {
            label: 'Call for community-led town halls first',
            cost: 3,
            effects: { crime: 1, happiness: 1, approval: -1 },
            outcome:
              'Powerful conversations. Crime keeps rising while you talk.',
            next: 'policing_vs_youth',
          },
        ],
      },
      {
        id: 'policing_vs_youth',
        title: 'Where Do The Dollars Go?',
        description:
          'The supplementary budget vote is Tuesday. Donovan wants more officers and a new precinct. Holt wants youth programs and job placement.',
        choices: [
          {
            label: 'Heavy on policing: new precinct, 80 officers',
            cost: 24,
            effects: { crime: -5, approval: 1, happiness: -2, inequality: 1 },
            outcome:
              'Donovan beams. East End residents protest the new precinct site.',
            next: 'prison_reform',
          },
          {
            label: 'Balanced: split funding 50/50',
            cost: 22,
            effects: { crime: -3, education: 1, happiness: 1, unemployment: -0.3 },
            outcome:
              'A pragmatic deal. Neither side is fully happy — usually a sign you got it right.',
            next: 'prison_reform',
          },
          {
            label: 'Heavy on youth programs: jobs, mentoring, after-school',
            cost: 20,
            effects: { crime: -1, education: 2, unemployment: -0.5, happiness: 2, approval: 1 },
            outcome:
              'Holt cries on camera. Donovan files an early retirement notice.',
            next: 'prison_reform',
          },
        ],
      },
      {
        id: 'prison_reform',
        title: 'The Prison Reform Debate',
        description:
          'The county prison is at 140% capacity. The state is threatening intervention. There is a window for serious reform.',
        choices: [
          {
            label: 'Build a new jail wing',
            cost: 35,
            effects: { crime: -3, treasury: -10, inequality: 2, approval: -1 },
            outcome:
              'Beds appear. So do questions about why this city locks up so many people.',
            next: 'complete',
          },
          {
            label: 'Diversion courts + treatment programs',
            cost: 18,
            effects: { crime: -2, health: 1, happiness: 2, approval: 3, inequality: -1 },
            outcome:
              'Recidivism falls. National outlets call it a model.',
            next: 'complete',
          },
          {
            label: 'Cut sentences for non-violent offenses',
            effects: { crime: 1, inequality: -2, approval: -2, happiness: 1 },
            outcome:
              'Bold. Controversial. The op-eds outnumber the policy papers two to one.',
            next: 'complete',
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 4. THE WHISTLEBLOWER
  // --------------------------------------------------------------------------
  {
    id: 'whistleblower',
    name: 'The Whistleblower',
    description:
      'Liam Ortega, the investigative reporter from the City Tribune, slides a manila folder across your desk. "Procurement fraud. Goes high. I\'m running it Friday — unless you give me something better."',
    giver: 'Investigative Journalist Liam Ortega',
    category: 'political',
    startCondition: (s) => s.turn >= 3,
    reward: { approval: 5, achievement: 'transparency_wins' },
    failPenalty: { approval: -12, treasury: -15 },
    stages: [
      {
        id: 'the_tip',
        title: 'The Tip',
        description:
          'Ortega says a senior procurement officer has been steering contracts to a shell company. His source is solid. He wants your reaction.',
        choices: [
          {
            label: 'Promise a full independent investigation, on the record',
            effects: { approval: 1, treasury: -2 },
            outcome:
              'Ortega holds the story. The investigation begins under your own banner.',
            next: 'investigate',
          },
          {
            label: 'Tell him there\'s nothing to it — your team would know',
            effects: { approval: -2 },
            outcome:
              'Ortega smiles thinly. He says he\'ll see you on Friday.',
            next: 'scandal_fallout',
          },
          {
            label: 'Offer him an exclusive interview on a different topic',
            cost: 1,
            effects: { approval: 0 },
            outcome:
              'He accepts the interview. He does not kill the story.',
            next: 'scandal_fallout',
          },
        ],
      },
      {
        id: 'investigate',
        title: 'The Investigation',
        description:
          'The inspector general moves fast. The trail leads to two officials — and skims the office of your chief of staff.',
        choices: [
          {
            label: 'Public hearings, all transcripts released',
            effects: { approval: 4, treasury: -3, happiness: 1 },
            outcome:
              'Two arrests. The Tribune runs a long piece praising your "rare political courage."',
            next: 'reform',
          },
          {
            label: 'Quiet referrals to prosecutors, brief statement',
            effects: { approval: 1, treasury: -1 },
            outcome:
              'Charges filed. The city moves on; the rumor mill does not.',
            next: 'reform',
          },
          {
            label: 'Bury the chief of staff\'s involvement',
            effects: { approval: -6, happiness: -3, inequality: 1 },
            outcome:
              'It leaks within weeks. Ortega writes the leak.',
            next: 'scandal_fallout',
          },
        ],
      },
      {
        id: 'scandal_fallout',
        title: 'The Scandal Lands',
        description:
          'The Friday story is brutal. Procurement fraud, your office named four times. The Council demands answers.',
        choices: [
          {
            label: 'Public apology, fire everyone implicated',
            effects: { approval: -2, treasury: -5, creditRating: 2, happiness: -1 },
            outcome:
              'Damage controlled. You look bruised but honest.',
            next: 'reform',
          },
          {
            label: 'Attack the press, deny everything',
            effects: { approval: -8, happiness: -3, creditRating: -3 },
            outcome:
              'The hole gets deeper. Two more stories drop the following week.',
            next: 'fail',
          },
        ],
      },
      {
        id: 'reform',
        title: 'Procurement Reform',
        description:
          'You can use this moment to fix the system — or quietly let it pass. Ortega will be watching either way.',
        choices: [
          {
            label: 'Pass sweeping procurement reform & open contracts portal',
            cost: 8,
            effects: { approval: 4, treasury: -2, innovation: 1, creditRating: 3 },
            outcome:
              'A genuine legacy item. Other cities call to ask how you did it.',
            next: 'complete',
          },
          {
            label: 'Modest internal reforms',
            cost: 3,
            effects: { approval: 1, creditRating: 1 },
            outcome:
              'Enough to declare victory. The same problems will return in five years.',
            next: 'complete',
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 5. THE AGING CITY
  // --------------------------------------------------------------------------
  {
    id: 'aging_city',
    name: 'The Aging City',
    description:
      'Margaret Chen, head of the Senior Citizens Lobby, points out that one in four residents is now over 65. The city was not built for them.',
    giver: 'Senior Citizens Lobby leader Margaret Chen',
    category: 'social',
    startCondition: (s) => s.stats.health <= 70 || s.turn >= 5,
    reward: { approval: 6, achievement: 'silver_city' },
    failPenalty: { approval: -6 },
    stages: [
      {
        id: 'build_hospitals',
        title: 'Hospital Capacity Crisis',
        description:
          'St. Catherine\'s emergency room is on diversion two nights a week. Chen has photos of patients in hallways.',
        choices: [
          {
            label: 'Build a new regional hospital ($60M)',
            cost: 60,
            effects: { health: 5, approval: 3, debt: 30, treasury: -10 },
            outcome:
              'Ground breaks within the year. Chen sends you a cake.',
            next: 'healthcare_budget',
          },
          {
            label: 'Expand existing hospital wings',
            cost: 22,
            effects: { health: 3, approval: 1 },
            outcome:
              'Beds added; hallway gurneys retired. Chen is grateful but not satisfied.',
            next: 'healthcare_budget',
          },
          {
            label: 'Tell hospitals to manage with what they have',
            effects: { health: -2, approval: -3 },
            outcome:
              'A patient dies in an ambulance bay. The story runs for a week.',
            next: 'fail',
          },
        ],
      },
      {
        id: 'healthcare_budget',
        title: 'The Healthcare Budget Fight',
        description:
          'Chen wants a 30% healthcare budget increase. The corporate lobby wants you to cap public health spending.',
        choices: [
          {
            label: 'Increase healthcare budget by 30%',
            cost: 0,
            effects: { health: 4, happiness: 2, approval: 2, debt: 10 },
            outcome:
              'Home care expands. The pharmacy lobby starts grumbling about price controls.',
            next: 'pension_fight',
          },
          {
            label: 'Increase healthcare 15%, fund preventative care',
            cost: 0,
            effects: { health: 2, happiness: 1, approval: 1 },
            outcome:
              'Smart and steady. Chen calls it "a fine start."',
            next: 'pension_fight',
          },
          {
            label: 'Hold the line — efficiency first',
            effects: { health: -1, approval: -2 },
            outcome:
              'Chen organizes a protest of 4,000 seniors on the steps of City Hall.',
            next: 'pension_fight',
          },
        ],
      },
      {
        id: 'pension_fight',
        title: 'The Pension Fight',
        description:
          'The city pension fund is shaky. The unions demand top-ups; the bondholders demand cuts. Chen demands certainty.',
        choices: [
          {
            label: 'Top up the pension fund fully',
            cost: 40,
            effects: { happiness: 3, approval: 3, creditRating: 4, treasury: -5 },
            outcome:
              'Retirees breathe. Bond rating improves. Future budgets will feel it.',
            next: 'aging_in_place',
          },
          {
            label: 'Partial top-up + modest benefit reforms',
            cost: 22,
            effects: { happiness: 1, approval: 0, creditRating: 2 },
            outcome:
              'A negotiated compromise. Lawyers win, mostly.',
            next: 'aging_in_place',
          },
          {
            label: 'Cut benefits for new hires',
            effects: { treasury: 12, happiness: -3, approval: -4 },
            outcome:
              'Younger workers grumble; the union files a lawsuit.',
            next: 'aging_in_place',
          },
        ],
      },
      {
        id: 'aging_in_place',
        title: 'Aging in Place',
        description:
          'Chen\'s final ask: a program to help seniors stay in their homes — accessible transit, home modifications, community check-ins.',
        choices: [
          {
            label: 'Launch the full "Stay Home" initiative',
            cost: 14,
            effects: { health: 2, happiness: 3, approval: 3, inequality: -1 },
            outcome:
              'A real legacy program. Chen invites you to her 80th birthday party.',
            next: 'complete',
          },
          {
            label: 'Pilot in two districts',
            cost: 5,
            effects: { health: 1, happiness: 1, approval: 1 },
            outcome:
              'Encouraging results. Scaling will be next mayor\'s job.',
            next: 'complete',
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 6. THE CLIMATE PACT
  // --------------------------------------------------------------------------
  {
    id: 'climate_pact',
    name: 'The Climate Pact',
    description:
      'The Green Coalition, led by activist Dr. Imani Okafor, asks you to sign the Mayors\' Carbon Pact — a binding 30% emission reduction in ten years. Industrial lobbyists are already drafting opposition op-eds.',
    giver: 'Green Coalition leader Dr. Imani Okafor',
    category: 'environment',
    startCondition: (s) => s.stats.pollution >= 30 || s.stats.innovation >= 50,
    reward: { approval: 7, achievement: 'green_legacy', innovation: 4 },
    failPenalty: { approval: -5 },
    stages: [
      {
        id: 'commit_cuts',
        title: 'Sign the Pact',
        description:
          'Okafor stands behind a podium with twelve other mayors. Your seat is empty for now.',
        choices: [
          {
            label: 'Sign the binding 30% pact',
            effects: { pollution: -2, approval: 3, innovation: 1, gdpPerCapita: -30 },
            outcome:
              'A photograph goes global. Industrial CEOs draft an angry letter.',
            next: 'build_solar',
          },
          {
            label: 'Sign a non-binding "aspiration" version',
            effects: { pollution: -1, approval: 1 },
            outcome:
              'Okafor calls it "performance." The op-eds calm down.',
            next: 'build_solar',
          },
          {
            label: 'Refuse — say it would hurt jobs',
            effects: { approval: -3, pollution: 1, unemployment: -0.2 },
            outcome:
              'Industry sends you flowers. Okafor leads a march on city hall.',
            next: 'fail',
          },
        ],
      },
      {
        id: 'build_solar',
        title: 'The Solar Build-Out',
        description:
          'Okafor wants rooftop solar on every public building, plus a utility-scale solar farm at the old landfill.',
        choices: [
          {
            label: 'Fund the full build-out ($55M)',
            cost: 55,
            effects: { pollution: -4, innovation: 3, gdpPerCapita: 30, debt: 25 },
            outcome:
              'Hard hats and panels everywhere. The grid noticeably greens within two years.',
            next: 'green_expo',
          },
          {
            label: 'Public buildings only, defer the farm',
            cost: 20,
            effects: { pollution: -2, innovation: 1, approval: 1 },
            outcome:
              'A visible win, slower transformation.',
            next: 'green_expo',
          },
        ],
      },
      {
        id: 'green_expo',
        title: 'The Green Expo',
        description:
          'Twenty thousand climate-tech entrepreneurs are choosing a host city for next year\'s expo. Okafor is on the selection committee.',
        choices: [
          {
            label: 'Bid hard with public funds and Mori-style incentives',
            cost: 12,
            effects: { innovation: 4, gdpPerCapita: 120, approval: 2 },
            outcome:
              'You win. The expo books out every hotel in town for a week.',
            next: 'industrial_backlash',
          },
          {
            label: 'Modest bid — let the location sell itself',
            cost: 2,
            effects: { innovation: 1, gdpPerCapita: 20 },
            outcome:
              'A rival city wins the expo. You host a regional satellite event.',
            next: 'industrial_backlash',
          },
        ],
      },
      {
        id: 'industrial_backlash',
        title: 'Industrial Backlash',
        description:
          'Three legacy manufacturers warn they will relocate if the new emissions caps take effect. They employ 8,000 people.',
        choices: [
          {
            label: 'Hold the line — phased transition assistance',
            cost: 20,
            effects: { pollution: -3, unemployment: 0.8, approval: 1, innovation: 2 },
            outcome:
              'One factory leaves; two retool. The transition fund softens the blow.',
            next: 'complete',
          },
          {
            label: 'Negotiate exemptions for legacy industry',
            effects: { pollution: 2, approval: -2, gdpPerCapita: 50 },
            outcome:
              'Jobs saved. Okafor calls the exemption a "betrayal of the pact."',
            next: 'complete',
          },
          {
            label: 'Buy out the dirtiest factory, convert to a green hub',
            cost: 35,
            effects: { pollution: -4, innovation: 3, approval: 3, unemployment: 0.3 },
            outcome:
              'An ambitious play. The old smokestack becomes a public artwork.',
            next: 'complete',
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 7. THE REFUGEE QUESTION
  // --------------------------------------------------------------------------
  {
    id: 'refugee_question',
    name: 'The Refugee Question',
    description:
      'Father Tomas, head of the city\'s Faith Council, asks you to accept three thousand refugees fleeing a regional conflict. The talk-radio hosts are already warming up.',
    giver: 'Faith Council Father Tomas Andreescu',
    category: 'social',
    startCondition: (s) => s.stats.happiness >= 35 && s.macro.geopolitical !== 'calm',
    reward: { approval: 5, achievement: 'sanctuary_city' },
    failPenalty: { approval: -8 },
    stages: [
      {
        id: 'accept_them',
        title: 'The Decision',
        description:
          'The buses are forty miles out. The state will house them somewhere; the question is whether you ask for them.',
        choices: [
          {
            label: 'Welcome all three thousand publicly',
            effects: { approval: 1, happiness: -1, unemployment: 0.4, gdpPerCapita: -20 },
            outcome:
              'Father Tomas weeps on the courthouse steps. Talk radio explodes.',
            next: 'integrate',
          },
          {
            label: 'Accept one thousand, quietly',
            effects: { approval: 0, unemployment: 0.2 },
            outcome:
              'A measured response. Father Tomas is disappointed but understanding.',
            next: 'integrate',
          },
          {
            label: 'Decline — cite capacity',
            effects: { approval: -2, happiness: -1 },
            outcome:
              'A neighboring city takes them. Father Tomas does not return your calls.',
            next: 'fail',
          },
        ],
      },
      {
        id: 'integrate',
        title: 'Integration Programs',
        description:
          'Language classes, credential recognition, employer matching — refugees who get these in the first 90 days do dramatically better.',
        choices: [
          {
            label: 'Full integration package, multi-language',
            cost: 18,
            effects: { education: 2, happiness: 1, unemployment: -0.3, approval: 2 },
            outcome:
              'Within a year, two-thirds are employed. National media notices.',
            next: 'manage_backlash',
          },
          {
            label: 'Basic English classes + employer hotline',
            cost: 6,
            effects: { education: 1, unemployment: 0.1, approval: 0 },
            outcome:
              'Adequate. Some refugees thrive; others struggle in silence.',
            next: 'manage_backlash',
          },
          {
            label: 'Let charities handle it',
            effects: { unemployment: 0.3, inequality: 1, happiness: -1 },
            outcome:
              'Father Tomas\'s soup kitchens are overwhelmed.',
            next: 'manage_backlash',
          },
        ],
      },
      {
        id: 'manage_backlash',
        title: 'The Backlash',
        description:
          'A populist councilor is staging "Save Our City" rallies. Three thousand attend the first one.',
        choices: [
          {
            label: 'Hold a city-wide unity forum',
            cost: 4,
            effects: { happiness: 2, approval: 1, crime: -1 },
            outcome:
              'A genuine moment. Father Tomas and the rally organizer share an awkward handshake.',
            next: 'deliver_housing',
          },
          {
            label: 'Counter-rally with sympathetic groups',
            effects: { happiness: -1, approval: 0, crime: 1 },
            outcome:
              'Tensions escalate. Two cars are flipped after the dueling rallies.',
            next: 'deliver_housing',
          },
          {
            label: 'Stay above it — say nothing',
            effects: { approval: -3, happiness: -2 },
            outcome:
              'The rally grows. Father Tomas wonders aloud where his mayor is.',
            next: 'deliver_housing',
          },
        ],
      },
      {
        id: 'deliver_housing',
        title: 'Housing the New Residents',
        description:
          'Three thousand people need somewhere to live. The vacancy rate was already tight.',
        choices: [
          {
            label: 'Build modular housing on city land',
            cost: 28,
            effects: { happiness: 2, approval: 2, inequality: -1, unemployment: -0.2 },
            outcome:
              'Move-in by winter. The modular units become a model others copy.',
            next: 'complete',
          },
          {
            label: 'Subsidize private rentals',
            cost: 14,
            effects: { gdpPerCapita: 40, inflation: 0.4, approval: 1 },
            outcome:
              'Quick housing. Landlords rejoice; long-term renters notice rents climbing.',
            next: 'complete',
          },
          {
            label: 'Reopen shuttered school buildings as shelters',
            cost: 6,
            effects: { happiness: -1, inequality: 1, approval: -1 },
            outcome:
              'Temporary, awkward, and increasingly permanent.',
            next: 'complete',
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 8. THE BOND STRATEGY
  // --------------------------------------------------------------------------
  {
    id: 'bond_strategy',
    name: 'The Bond Strategy',
    description:
      'Finance Director Hideo Park lays out a multi-stage plan: a flagship green bond, careful credit-rating management, and a portfolio of high-visibility projects to keep investors confident.',
    giver: 'Finance Director Hideo Park',
    category: 'economic',
    startCondition: (s) => s.stats.creditRating >= 55 && s.stats.debt < 500,
    reward: { approval: 4, treasury: 35, achievement: 'fiscal_steward' },
    failPenalty: { treasury: -25, approval: -3 },
    stages: [
      {
        id: 'issue_green_bond',
        title: 'Issue the Green Bond',
        description:
          'Park has lined up institutional investors. The terms are favorable, but the bond proceeds must be spent on certified green projects.',
        choices: [
          {
            label: 'Issue a $100M green bond at 3.4%',
            effects: { debt: 100, treasury: 100, innovation: 1, creditRating: 1 },
            outcome:
              'Oversubscribed within an hour. Park frames the term sheet.',
            next: 'rating_review',
          },
          {
            label: 'Issue a smaller $40M sustainability bond',
            effects: { debt: 40, treasury: 40, creditRating: 1 },
            outcome:
              'Conservative and clean. Park nods approvingly.',
            next: 'rating_review',
          },
          {
            label: 'Pass — bonds are political risk',
            effects: { approval: -1 },
            outcome:
              'Park doesn\'t hide his disappointment. The other cities issue theirs.',
            next: 'fail',
          },
        ],
      },
      {
        id: 'rating_review',
        title: 'The Credit Rating Review',
        description:
          'Rating agencies want assurances of fiscal discipline. Park drafts three possible packages.',
        choices: [
          {
            label: 'Announce a multi-year debt ceiling',
            effects: { creditRating: 5, approval: -1, happiness: -1 },
            outcome:
              'Rating maintained. Department heads scramble to plan within the cap.',
            next: 'deliver_projects',
          },
          {
            label: 'Show new revenue streams (small tax tweaks)',
            effects: { treasury: 6, creditRating: 3, approval: -1 },
            outcome:
              'Rating maintained. Voters notice their tax bills.',
            next: 'deliver_projects',
          },
          {
            label: 'Lobby the rating agencies directly',
            cost: 2,
            effects: { creditRating: 1 },
            outcome:
              'Some sympathy gained. Not enough.',
            next: 'deliver_projects',
          },
        ],
      },
      {
        id: 'deliver_projects',
        title: 'Deliver the Promised Projects',
        description:
          'The green bond requires visible deployment within two years. Park has a shortlist.',
        choices: [
          {
            label: 'Mass transit electrification ($60M)',
            cost: 60,
            effects: { pollution: -4, innovation: 2, happiness: 2, approval: 3 },
            outcome:
              'Quiet electric buses become the city\'s new sound. Park is on three magazine covers.',
            next: 'complete',
          },
          {
            label: 'Distributed solar + grid upgrades',
            cost: 45,
            effects: { pollution: -3, innovation: 2, approval: 2 },
            outcome:
              'The grid hardens. Power outages drop by 40%.',
            next: 'complete',
          },
          {
            label: 'Spread the funds across many small projects',
            cost: 40,
            effects: { pollution: -2, approval: 1, happiness: 1 },
            outcome:
              'Many ribbon cuttings. No flagship — Park argues this hurts the next bond.',
            next: 'complete',
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 9. THE CULTURAL AWAKENING
  // --------------------------------------------------------------------------
  {
    id: 'cultural_awakening',
    name: 'The Cultural Awakening',
    description:
      'Sofia Klein, head of the Cultural Coalition, makes the case that your city has soul but no stage. Other cities spend ten times more on culture per capita.',
    giver: 'Cultural Coalition leader Sofia Klein',
    category: 'civic',
    startCondition: (s) => s.stats.happiness <= 75 && s.stats.treasury >= 50,
    reward: { approval: 5, achievement: 'capital_of_culture' },
    failPenalty: { approval: -3 },
    stages: [
      {
        id: 'cultural_center',
        title: 'Build the Cultural Center',
        description:
          'Klein wants a flagship cultural center — galleries, theater, makerspace, library. The architects pitch a striking glass-and-timber design.',
        choices: [
          {
            label: 'Build the flagship design ($40M)',
            cost: 40,
            effects: { happiness: 4, education: 1, gdpPerCapita: 60, approval: 2 },
            outcome:
              'Two years of construction. The opening night packs every gallery.',
            next: 'arts_grants',
          },
          {
            label: 'Build a more modest center',
            cost: 18,
            effects: { happiness: 2, education: 1, approval: 1 },
            outcome:
              'Functional and welcoming. Klein says "it\'s a start."',
            next: 'arts_grants',
          },
          {
            label: 'Renovate an existing building instead',
            cost: 8,
            effects: { happiness: 1, approval: 0 },
            outcome:
              'Charming, slightly underwhelming. The artists are happy to have a home.',
            next: 'arts_grants',
          },
        ],
      },
      {
        id: 'arts_grants',
        title: 'The Arts Grants Program',
        description:
          'Klein proposes a recurring grants program for independent artists. The Council fiscal hawks want to know how this returns ROI.',
        choices: [
          {
            label: 'Fund a $5M annual arts grants program',
            cost: 5,
            effects: { happiness: 3, innovation: 1, approval: 2 },
            outcome:
              'Murals, plays, dance companies bloom. The civic identity starts to shift.',
            next: 'film_festival',
          },
          {
            label: 'Smaller program targeted at youth artists',
            cost: 2,
            effects: { happiness: 1, education: 1, approval: 1 },
            outcome:
              'A modest but meaningful pipeline forms. Klein focuses her thanks on the kids.',
            next: 'film_festival',
          },
          {
            label: 'No grants — let the market decide',
            effects: { happiness: -1, approval: -1 },
            outcome:
              'Two beloved local theaters close that year.',
            next: 'film_festival',
          },
        ],
      },
      {
        id: 'film_festival',
        title: 'Host a Film Festival',
        description:
          'A respected indie festival is looking for a new home. Klein has been making calls for months.',
        choices: [
          {
            label: 'Bid hard for the festival',
            cost: 8,
            effects: { gdpPerCapita: 80, happiness: 2, innovation: 1, approval: 2 },
            outcome:
              'The festival arrives. Red carpets snake through downtown for a week.',
            next: 'mural_project',
          },
          {
            label: 'Launch a smaller homegrown festival instead',
            cost: 3,
            effects: { happiness: 2, gdpPerCapita: 20, approval: 1 },
            outcome:
              'Authentic, local. Three years later it has its own reputation.',
            next: 'mural_project',
          },
        ],
      },
      {
        id: 'mural_project',
        title: 'The Mural Project',
        description:
          'Klein\'s final ask: a public art initiative — commissioned murals across every district, with locals choosing the artists.',
        choices: [
          {
            label: 'City-wide mural initiative',
            cost: 4,
            effects: { happiness: 3, approval: 3, crime: -1, inequality: -1 },
            outcome:
              'Walls bloom. Tourists come for the murals. The civic mood shifts.',
            next: 'complete',
          },
          {
            label: 'Murals only in central districts',
            cost: 2,
            effects: { happiness: 1, approval: 0, inequality: 1 },
            outcome:
              'Beautiful — but outer-district residents notice the omission.',
            next: 'complete',
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 10. THE SMART CITY ROADMAP
  // --------------------------------------------------------------------------
  {
    id: 'smart_city_roadmap',
    name: 'The Smart City Roadmap',
    description:
      'Your tech advisor, Dr. Arman Patel, pitches a city-wide sensor network: traffic, air quality, waste, water. The promise is efficiency; the worry is surveillance.',
    giver: 'Tech Advisor Dr. Arman Patel',
    category: 'tech',
    startCondition: (s) => s.stats.innovation >= 40,
    reward: { approval: 4, innovation: 8, achievement: 'wired_city' },
    failPenalty: { approval: -6 },
    stages: [
      {
        id: 'deploy_sensors',
        title: 'Deploy the Sensors',
        description:
          'Patel\'s team has a phased rollout ready. Each phase covers more districts and more sensor types.',
        choices: [
          {
            label: 'Full deployment, all districts ($45M)',
            cost: 45,
            effects: { innovation: 5, pollution: -1, gdpPerCapita: 50, approval: 1 },
            outcome:
              'The dashboard goes live. Traffic light timing improves overnight.',
            next: 'privacy_backlash',
          },
          {
            label: 'Pilot in three districts',
            cost: 12,
            effects: { innovation: 2, gdpPerCapita: 15 },
            outcome:
              'Useful data. The other districts wait their turn.',
            next: 'privacy_backlash',
          },
          {
            label: 'Pass — too risky for civil liberties',
            effects: { innovation: -2, approval: 1 },
            outcome:
              'Patel takes a sabbatical. He may not come back.',
            next: 'fail',
          },
        ],
      },
      {
        id: 'privacy_backlash',
        title: 'The Privacy Backlash',
        description:
          'A coalition of civil liberties groups discovers cameras with license-plate recognition were included in the rollout.',
        choices: [
          {
            label: 'Independent privacy oversight board + audits',
            cost: 3,
            effects: { approval: 3, happiness: 1, innovation: 1 },
            outcome:
              'A clear win. The board becomes a national model.',
            next: 'roi_demonstration',
          },
          {
            label: 'Internal review only',
            effects: { approval: -2, happiness: -1 },
            outcome:
              'The civil liberties groups remain unconvinced. Litigation looms.',
            next: 'roi_demonstration',
          },
          {
            label: 'Defend the cameras as essential for safety',
            effects: { approval: -5, happiness: -2, crime: -1 },
            outcome:
              'A divisive press conference. Two councilors disown the program.',
            next: 'roi_demonstration',
          },
        ],
      },
      {
        id: 'roi_demonstration',
        title: 'Show the ROI',
        description:
          'Twelve months in, the Council wants proof. Patel has dashboards but the wins are scattered.',
        choices: [
          {
            label: 'Publish a transparent annual impact report',
            cost: 1,
            effects: { innovation: 2, approval: 2, creditRating: 1 },
            outcome:
              'Numbers are real: 12% less congestion, 18% faster trash routes. Patel beams.',
            next: 'expand_or_pause',
          },
          {
            label: 'Cherry-pick the best metrics for PR',
            effects: { approval: 1, innovation: 0 },
            outcome:
              'A journalist (Ortega, of course) finds the methodology weak.',
            next: 'expand_or_pause',
          },
        ],
      },
      {
        id: 'expand_or_pause',
        title: 'Expand or Pause',
        description:
          'Patel pitches phase two — predictive policing modules and AI permit processing. The privacy board pushes back.',
        choices: [
          {
            label: 'Expand carefully, with the privacy board in the loop',
            cost: 18,
            effects: { innovation: 3, gdpPerCapita: 50, happiness: 1, approval: 2 },
            outcome:
              'A genuine smart-city pioneer. National conferences want you to keynote.',
            next: 'complete',
          },
          {
            label: 'Pause and consolidate gains',
            effects: { innovation: 1, approval: 1, happiness: 1 },
            outcome:
              'A mature decision. Patel respects it, even if he chafes.',
            next: 'complete',
          },
          {
            label: 'Expand aggressively, override the privacy board',
            cost: 22,
            effects: { innovation: 4, approval: -4, happiness: -2, crime: -1 },
            outcome:
              'Powerful tools. A civil liberties lawsuit follows.',
            next: 'complete',
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 11. THE HOUSING CRISIS
  // --------------------------------------------------------------------------
  {
    id: 'housing_crisis',
    name: 'The Housing Crisis',
    description:
      'Renters\' coalition organizer Diana Suarez stands in your lobby with a stack of eviction notices. The rent has outrun the wages. Something is going to give.',
    giver: 'Renters\' Coalition organizer Diana Suarez',
    category: 'social',
    startCondition: (s) => s.stats.inequality >= 35,
    reward: { approval: 6, achievement: 'roof_over_heads' },
    failPenalty: { approval: -8 },
    stages: [
      {
        id: 'declare_emergency',
        title: 'Declare a Housing Emergency',
        description:
          'Suarez wants you to formally declare a housing emergency. Doing so unlocks state funds and political heat in equal measure.',
        choices: [
          {
            label: 'Declare a housing emergency, full press',
            effects: { approval: 2, happiness: -1, treasury: 10 },
            outcome:
              'State funds flow. The real estate lobby calls it a "war on landlords."',
            next: 'rent_policy',
          },
          {
            label: 'Quietly announce a "housing action plan"',
            effects: { approval: 0, treasury: 4 },
            outcome:
              'Some federal funds. Suarez says "the press needs to hear the word emergency."',
            next: 'rent_policy',
          },
          {
            label: 'Decline — markets will correct',
            effects: { approval: -3, inequality: 1 },
            outcome:
              'Suarez leads a march. The press loves the marches.',
            next: 'fail',
          },
        ],
      },
      {
        id: 'rent_policy',
        title: 'Rent Policy Decision',
        description:
          'Suarez wants rent control. The landlord lobby wants supply-side incentives. Both are watching the next council meeting.',
        choices: [
          {
            label: 'Pass strict rent stabilization',
            effects: { inequality: -3, happiness: 1, approval: 2, gdpPerCapita: -40 },
            outcome:
              'Renters cheer. Construction starts slow within six months.',
            next: 'build_housing',
          },
          {
            label: 'Soft rent caps + landlord incentives for new builds',
            effects: { inequality: -1, gdpPerCapita: 10, approval: 1 },
            outcome:
              'A negotiated middle path. Both sides claim partial victory.',
            next: 'build_housing',
          },
          {
            label: 'No rent control — boost supply with tax breaks',
            effects: { inequality: 1, gdpPerCapita: 30, approval: -1 },
            outcome:
              'Construction surges. Existing renters keep getting squeezed.',
            next: 'build_housing',
          },
        ],
      },
      {
        id: 'build_housing',
        title: 'Build the Housing',
        description:
          'You need units on the ground. The question is who builds them, and for whom.',
        choices: [
          {
            label: 'Massive public housing program ($50M)',
            cost: 50,
            effects: { inequality: -3, happiness: 3, approval: 3, debt: 25 },
            outcome:
              'Five thousand units in four years. Suarez frames the groundbreaking photo on her wall.',
            next: 'long_term_plan',
          },
          {
            label: 'Public-private partnerships, mixed income',
            cost: 20,
            effects: { inequality: -1, gdpPerCapita: 40, approval: 2 },
            outcome:
              'Three thousand units, half subsidized. A model others copy.',
            next: 'long_term_plan',
          },
          {
            label: 'Zoning reform only — let private builders deliver',
            effects: { gdpPerCapita: 50, inequality: 0, approval: 1 },
            outcome:
              'Apartment blocks rise on former parking lots. Affordability lags supply.',
            next: 'long_term_plan',
          },
        ],
      },
      {
        id: 'long_term_plan',
        title: 'The Twenty-Year Plan',
        description:
          'Suarez wants a binding twenty-year affordable housing plan, with quarterly reporting and consequences for missing targets.',
        choices: [
          {
            label: 'Pass the twenty-year plan, binding',
            cost: 4,
            effects: { inequality: -2, approval: 2, happiness: 2 },
            outcome:
              'A genuine commitment. Suarez says it\'s the best day of her career.',
            next: 'complete',
          },
          {
            label: 'Non-binding ten-year plan',
            cost: 1,
            effects: { inequality: -1, approval: 1 },
            outcome:
              'Useful framework. The next mayor can quietly abandon it.',
            next: 'complete',
          },
          {
            label: 'No plan — annual review will do',
            effects: { approval: -2 },
            outcome:
              'Suarez calls it "the long retreat." Voters notice in two years.',
            next: 'complete',
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 12. THE TRANSIT REVOLUTION
  // --------------------------------------------------------------------------
  {
    id: 'transit_revolution',
    name: 'The Transit Revolution',
    description:
      'Transit Director Lin Zhao argues the buses are the city\'s circulatory system, and the patient is on the brink of a stroke. She proposes a generational overhaul.',
    giver: 'Transit Director Lin Zhao',
    category: 'civic',
    startCondition: (s) => s.stats.pollution >= 25 || s.turn >= 6,
    reward: { approval: 6, achievement: 'moving_city', innovation: 3 },
    failPenalty: { approval: -5, treasury: -10 },
    stages: [
      {
        id: 'fleet_decision',
        title: 'The Fleet Decision',
        description:
          'The bus fleet is aging. Zhao has three replacement strategies, each with different timelines and price tags.',
        choices: [
          {
            label: 'Full electric bus fleet replacement ($55M)',
            cost: 55,
            effects: { pollution: -3, innovation: 2, gdpPerCapita: 30, approval: 1, debt: 25 },
            outcome:
              'Quieter streets within two years. Zhao\'s photo runs above the fold.',
            next: 'transit_hub',
          },
          {
            label: 'Hybrid fleet, slower transition',
            cost: 22,
            effects: { pollution: -1, innovation: 1, approval: 1 },
            outcome:
              'Steady, sensible, slower. Zhao says "fine, but mark my words."',
            next: 'transit_hub',
          },
          {
            label: 'Patch and maintain the diesel fleet',
            cost: 5,
            effects: { pollution: 1, approval: -1 },
            outcome:
              'Cheap now. Zhao quietly updates her resume.',
            next: 'transit_hub',
          },
        ],
      },
      {
        id: 'transit_hub',
        title: 'Build a Central Transit Hub',
        description:
          'Zhao wants a flagship multi-modal hub — buses, light rail, bikes, intercity. Three neighborhoods are vying for the site.',
        choices: [
          {
            label: 'Build the flagship hub downtown ($40M)',
            cost: 40,
            effects: { gdpPerCapita: 80, innovation: 2, happiness: 2, approval: 2 },
            outcome:
              'A vaulted glass roof rises. Daily ridership jumps 20%.',
            next: 'fare_decision',
          },
          {
            label: 'Two smaller neighborhood hubs',
            cost: 25,
            effects: { gdpPerCapita: 40, happiness: 1, approval: 1, inequality: -1 },
            outcome:
              'Less spectacular, more equitable. Two ribbon cuttings instead of one.',
            next: 'fare_decision',
          },
        ],
      },
      {
        id: 'fare_decision',
        title: 'The Fare Decision',
        description:
          'Zhao proposes free transit. The finance team is alarmed. The riders\' union is ecstatic.',
        choices: [
          {
            label: 'Make transit free',
            effects: { gdpPerCapita: -40, happiness: 4, approval: 3, inequality: -2, treasury: -15 },
            outcome:
              'Ridership doubles. The city debates free transit on national TV.',
            next: 'expansion',
          },
          {
            label: 'Free for seniors, students, low-income riders',
            cost: 8,
            effects: { happiness: 2, approval: 2, inequality: -1 },
            outcome:
              'Targeted, defensible, popular. Zhao says it\'s a "real first step."',
            next: 'expansion',
          },
          {
            label: 'Modest fare reduction, keep paid model',
            cost: 3,
            effects: { happiness: 1, approval: 0 },
            outcome:
              'A small win. The fare debate will return.',
            next: 'expansion',
          },
        ],
      },
      {
        id: 'expansion',
        title: 'Expand the Network',
        description:
          'Zhao\'s final ask: a light rail line connecting the outer districts. Federal matching funds are available — if you commit this fiscal year.',
        choices: [
          {
            label: 'Apply for the federal match, commit the city share',
            cost: 30,
            effects: { gdpPerCapita: 120, pollution: -2, inequality: -2, approval: 3, debt: 30 },
            outcome:
              'A twenty-year project begins. Future mayors will inherit the credit and the bills.',
            next: 'complete',
          },
          {
            label: 'Express bus rapid transit instead of rail',
            cost: 15,
            effects: { gdpPerCapita: 50, pollution: -1, approval: 2 },
            outcome:
              'Faster, cheaper, less iconic. Zhao calls it "the right call."',
            next: 'complete',
          },
          {
            label: 'Decline — too much debt',
            effects: { approval: -2 },
            outcome:
              'The federal match goes elsewhere. Zhao starts taking calls from other cities.',
            next: 'complete',
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 13. THE EDUCATION OVERHAUL
  // --------------------------------------------------------------------------
  {
    id: 'education_overhaul',
    name: 'The Education Overhaul',
    description:
      'Superintendent Dr. Renee Lacroix presents grim data: the city\'s schools rank in the bottom third nationally. She proposes a sweeping multi-year overhaul.',
    giver: 'Schools Superintendent Dr. Renee Lacroix',
    category: 'social',
    startCondition: (s) => s.stats.education <= 65,
    reward: { approval: 7, achievement: 'lifted_a_generation' },
    failPenalty: { approval: -5 },
    stages: [
      {
        id: 'teacher_pay',
        title: 'Teacher Pay Reform',
        description:
          'Lacroix says nothing else matters if you cannot retain good teachers. The union has been waiting.',
        choices: [
          {
            label: 'Raise teacher pay 18% across the board',
            cost: 22,
            effects: { education: 4, happiness: 1, approval: 2, treasury: -8 },
            outcome:
              'Resignations drop overnight. Lacroix\'s recruitment pipeline triples.',
            next: 'curriculum',
          },
          {
            label: 'Targeted raises for STEM and special education',
            cost: 10,
            effects: { education: 2, approval: 1 },
            outcome:
              'Strategic. Other teachers grumble about being second-tier.',
            next: 'curriculum',
          },
          {
            label: 'Performance-based bonuses only',
            cost: 6,
            effects: { education: 1, happiness: -1, approval: -1 },
            outcome:
              'A few teachers thrive. Many feel surveilled. The union files a grievance.',
            next: 'curriculum',
          },
        ],
      },
      {
        id: 'curriculum',
        title: 'Curriculum Modernization',
        description:
          'Lacroix proposes adding coding, civics, financial literacy, and arts to the core curriculum. Parents are split.',
        choices: [
          {
            label: 'Full modern curriculum rollout',
            cost: 12,
            effects: { education: 3, innovation: 2, approval: 1, happiness: 1 },
            outcome:
              'Some districts thrive. A culture-war flare-up over the civics module gets media attention.',
            next: 'infrastructure',
          },
          {
            label: 'Phase in subjects over five years',
            cost: 6,
            effects: { education: 2, innovation: 1, approval: 1 },
            outcome:
              'A careful build. Lacroix grumbles about the pace but supports it publicly.',
            next: 'infrastructure',
          },
          {
            label: 'Add coding only — keep the rest traditional',
            cost: 3,
            effects: { education: 1, innovation: 1 },
            outcome:
              'A safe call. Coding clubs flourish.',
            next: 'infrastructure',
          },
        ],
      },
      {
        id: 'infrastructure',
        title: 'School Infrastructure',
        description:
          'Three schools have leaking roofs. Two have lead pipes. Lacroix needs the capital budget approved.',
        choices: [
          {
            label: 'Comprehensive infrastructure overhaul ($35M)',
            cost: 35,
            effects: { education: 2, health: 2, happiness: 2, approval: 2 },
            outcome:
              'Schools become places kids want to be again. The PTA delivers a cake.',
            next: 'achievement_gap',
          },
          {
            label: 'Fix the worst three buildings',
            cost: 12,
            effects: { education: 1, health: 1, approval: 1 },
            outcome:
              'Triage. Other schools remain on the waiting list.',
            next: 'achievement_gap',
          },
        ],
      },
      {
        id: 'achievement_gap',
        title: 'Close the Achievement Gap',
        description:
          'Test score data shows a stark gap between the city\'s wealthier and lower-income districts. Lacroix has a closing-the-gap initiative ready.',
        choices: [
          {
            label: 'Targeted resources & after-school programs in lagging districts',
            cost: 14,
            effects: { education: 3, inequality: -3, approval: 3, happiness: 2 },
            outcome:
              'Within three years, the gap narrows by a third. Lacroix gets a national award.',
            next: 'complete',
          },
          {
            label: 'Boost gifted programs across all districts',
            cost: 8,
            effects: { education: 2, inequality: 1, innovation: 1 },
            outcome:
              'Top students soar. The gap remains.',
            next: 'complete',
          },
          {
            label: 'Let principals decide locally',
            cost: 4,
            effects: { education: 1, approval: 0 },
            outcome:
              'Mixed results. Some schools find gold; others spin their wheels.',
            next: 'complete',
          },
        ],
      },
    ],
  },
]

// ============================================================================
// HELPERS
// ============================================================================

export function getQuest(id: string): Quest | undefined {
  return QUESTS.find((q) => q.id === id)
}

export function getCurrentStage(active: ActiveQuest): QuestStage | null {
  if (active.status !== 'active') return null
  const quest = getQuest(active.questId)
  if (!quest) return null
  return quest.stages.find((s) => s.id === active.currentStageId) ?? null
}

export function eligibleQuests(
  state: GameState,
  activeQuestIds: string[],
  category?: Quest['category'],
): Quest[] {
  const active = new Set(activeQuestIds)
  const out: Quest[] = []
  for (const q of QUESTS) {
    if (active.has(q.id)) continue
    if (category && q.category !== category) continue
    let ok = false
    try {
      ok = q.startCondition(state)
    } catch {
      ok = false
    }
    if (ok) out.push(q)
    if (out.length >= 5) break
  }
  return out
}

export function applyQuestChoice(
  active: ActiveQuest,
  choiceIndex: number,
): { active: ActiveQuest; effects: Partial<CityStats>; outcome: string; cost: number } {
  const stage = getCurrentStage(active)
  if (!stage) {
    return {
      active,
      effects: {},
      outcome: 'No active stage.',
      cost: 0,
    }
  }
  const choice = stage.choices[choiceIndex]
  if (!choice) {
    return {
      active,
      effects: {},
      outcome: 'Invalid choice.',
      cost: 0,
    }
  }

  const cost = choice.cost ?? 0
  // Merge the cost into effects as a treasury debit, while still respecting
  // any explicit treasury delta in the choice's effects object.
  const baseEffects: Partial<CityStats> = { ...choice.effects }
  if (cost > 0) {
    const existingTreasury = baseEffects.treasury ?? 0
    baseEffects.treasury = existingTreasury - cost
  }

  const nextLog = [...active.log, `${stage.title}: ${choice.outcome}`]
  let nextStatus: ActiveQuest['status'] = active.status
  let nextStageId = active.currentStageId

  if (choice.next === 'complete') {
    nextStatus = 'completed'
    nextStageId = active.currentStageId
  } else if (choice.next === 'fail') {
    nextStatus = 'failed'
    nextStageId = active.currentStageId
  } else {
    nextStageId = choice.next
  }

  const updated: ActiveQuest = {
    questId: active.questId,
    currentStageId: nextStageId,
    startedTurn: active.startedTurn,
    log: nextLog,
    status: nextStatus,
  }

  return {
    active: updated,
    effects: baseEffects,
    outcome: choice.outcome,
    cost,
  }
}
