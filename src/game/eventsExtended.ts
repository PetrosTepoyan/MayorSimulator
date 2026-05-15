import type { GameEvent } from './types'

// Extended event card library. These supplement the core EVENTS array.
// Each card is built around a real-world mechanism: capital flight, network
// externalities, moral hazard, regulatory capture, congestion pricing, etc.
// Outcomes are written to hint at the mechanism so players learn while they play.

export const EVENTS_EXTENDED: GameEvent[] = [
  // ============================================================================
  // ECONOMIC
  // ============================================================================
  {
    id: 'major_employer_relocating',
    title: 'Anchor Employer Threatens Exit',
    description:
      'A 4,000-employee manufacturer says rising costs may force them to relocate operations to a neighboring metro area within 18 months.',
    flavor: '"We love this city, but the math no longer works," reads their press release.',
    category: 'economic',
    weight: 7,
    choices: [
      {
        label: 'Offer 10-year property tax abatement',
        effects: { treasury: -14, unemployment: -1.4, gdpPerCapita: 220, inequality: 0.8, approval: 1 },
        outcome:
          'They stay and renew their lease. The race-to-the-bottom dynamic now means rival firms will demand the same deal next quarter.',
      },
      {
        label: 'Retrain fund for displaced workers',
        cost: 12,
        effects: { unemployment: 0.6, education: 1.5, innovation: 0.8, happiness: -1, approval: -1 },
        outcome:
          'They leave anyway. Active labor-market policy softens the blow, but unemployment spikes before retraining lands.',
      },
      {
        label: 'Call their bluff, do nothing',
        effects: { unemployment: 1.8, gdpPerCapita: -150, approval: -4, treasury: 6 },
        outcome:
          'They actually leave. Local suppliers contract. Treasury holds in the short run because no incentive was paid.',
      },
    ],
    countryBias: { atlantica: 1.3, eastoria: 1.2, sahel: 0.8 },
  },
  {
    id: 'startup_ipo',
    title: 'Hometown Startup Going Public',
    description:
      'A local tech firm files for IPO at a $4B valuation. Early employees suddenly become millionaires; neighborhoods are bracing for a wave of new money.',
    category: 'economic',
    weight: 6,
    choices: [
      {
        label: 'Capital-gains city surcharge on IPO proceeds',
        effects: { treasury: 30, innovation: -1, inequality: -0.8, approval: -2, gdpPerCapita: 60 },
        outcome:
          'Windfall revenue funds a budget gap. Founders quietly redomicile future ventures to lower-tax jurisdictions — expect capital flight on the next IPO.',
      },
      {
        label: 'Streamline permits to retain founders here',
        cost: 3,
        effects: { innovation: 3, gdpPerCapita: 180, inequality: 1.5, approval: 1 },
        outcome:
          'A cluster effect takes hold — talent attracts more talent. Housing prices spike in nearby districts as newly liquid employees bid up real estate.',
      },
      {
        label: 'Pass — let market sort it out',
        effects: { inequality: 0.6, gdpPerCapita: 60 },
        outcome:
          'A few enclaves boom, the rest of the city sees little of it. The gini coefficient ticks upward.',
      },
    ],
    countryBias: { atlantica: 1.5, pacifica: 1.4, sahel: 0.5 },
  },
  {
    id: 'housing_bubble_warning',
    title: 'Economists Warn of Housing Bubble',
    description:
      'Median home prices have risen 38% in two years. Three independent analyses warn of a speculative bubble fueled by investor purchases.',
    category: 'economic',
    weight: 6,
    choices: [
      {
        label: 'Slap a 15% tax on non-resident investor purchases',
        effects: { treasury: 18, inequality: -1, approval: 2, gdpPerCapita: -80, creditRating: -1 },
        outcome:
          'Speculative demand cools and prices stabilize. Construction lobbyists threaten litigation; building starts slow.',
      },
      {
        label: 'Mandate a 20% affordable unit set-aside on new builds',
        effects: { inequality: -1.2, happiness: 1, gdpPerCapita: -40, innovation: -0.4, approval: 1 },
        outcome:
          'Developers internalize the cost — fewer total units get built, but those that do help the missing middle.',
      },
      {
        label: 'Stay hands-off — corrections self-resolve',
        effects: { inequality: 1, approval: -2, gdpPerCapita: 40 },
        outcome:
          'Prices rise another year before a sharp correction. Late buyers go underwater on mortgages.',
      },
    ],
  },
  {
    id: 'crypto_mining',
    title: 'Crypto Mining Farm Inquiry',
    description:
      'An offshore mining operation wants to plug into your grid. They promise jobs and $8M annual taxes. Power demand would equal 12,000 homes.',
    category: 'economic',
    weight: 5,
    choices: [
      {
        label: 'Approve in special economic zone',
        effects: { treasury: 8, unemployment: -0.2, pollution: 2, inflation: 0.4, innovation: 0.5 },
        outcome:
          'Operation goes live. Residential electricity rates climb as wholesale prices respond to the new baseload demand.',
      },
      {
        label: 'Approve only if powered by dedicated solar',
        cost: 5,
        effects: { treasury: 3, innovation: 1.5, pollution: -0.5 },
        outcome:
          'They build at half the scale. Project doubles as a renewable demonstration but the tax base contribution is smaller.',
      },
      {
        label: 'Reject — too volatile, too power-hungry',
        effects: { approval: 1, innovation: -0.5 },
        outcome:
          'Environmental groups cheer. A neighboring city takes the deal and crows about it for months.',
      },
    ],
    countryBias: { nordfjord: 1.3, sahel: 1.2, costaverde: 0.8 },
  },
  {
    id: 'hotel_chain',
    title: 'International Hotel Chain Bidding',
    description:
      'A luxury hotel group wants prime waterfront land for a 600-room conference hotel. Tourism advocates are excited; the neighborhood is not.',
    category: 'economic',
    weight: 6,
    choices: [
      {
        label: 'Sell waterfront land at market rate',
        effects: { treasury: 35, gdpPerCapita: 120, unemployment: -0.4, happiness: -1, inequality: 0.5 },
        outcome:
          'Project breaks ground. Public access to the shoreline shrinks. Service workers commute in from outer districts due to displaced housing.',
      },
      {
        label: 'Sell with public-access easements + local hire',
        effects: { treasury: 22, gdpPerCapita: 80, unemployment: -0.3, happiness: 1, approval: 1 },
        outcome:
          'Compromise reached. Hotel still built; public boardwalk is preserved.',
      },
      {
        label: 'Block sale — preserve as public park',
        cost: 4,
        effects: { happiness: 3, approval: 2, treasury: -2, gdpPerCapita: -40 },
        outcome:
          'Park is wildly popular. Foregone tax revenue becomes a recurring talking point in budget hearings.',
      },
    ],
    countryBias: { costaverde: 1.4, pacifica: 1.3 },
  },
  {
    id: 'currency_depreciation',
    title: 'National Currency Slips 14%',
    description:
      'A sudden currency depreciation makes imports painful and exports cheap. Local industry is split.',
    category: 'economic',
    weight: 5,
    choices: [
      {
        label: 'Subsidize import-dependent essentials (food, fuel)',
        cost: 15,
        effects: { inflation: -0.8, happiness: 1, approval: 1, debt: 6 },
        outcome:
          'Pass-through inflation is dampened. Subsidy fiscal cost is visible in next quarter accounts.',
      },
      {
        label: 'Pivot port and warehousing toward export-oriented firms',
        cost: 6,
        effects: { gdpPerCapita: 180, unemployment: -0.6, inequality: 0.8, inflation: 0.4 },
        outcome:
          'Exporters surge; non-tradable sectors lag. Wage inequality widens between sectors.',
      },
      {
        label: 'Do nothing, let prices clear',
        effects: { inflation: 1.4, happiness: -2, approval: -2 },
        outcome:
          'Imported-goods prices jump, especially in lower-income districts. Real wages fall.',
      },
    ],
    countryBias: { sahel: 1.4, eastoria: 1.2, atlantica: 0.7 },
  },
  {
    id: 'tax_fraud_investigation',
    title: 'Major Tax Evasion Ring Uncovered',
    description:
      'A federal investigation identifies $90M in unpaid corporate taxes from a real estate trust operating in your city. Names are about to drop.',
    category: 'economic',
    weight: 4,
    choices: [
      {
        label: 'Cooperate fully, claim back-taxes',
        effects: { treasury: 22, approval: 3, gdpPerCapita: -30, creditRating: 2 },
        outcome:
          'The shell entities unravel. Some developers wind up projects mid-stream, slowing housing supply for a year.',
      },
      {
        label: 'Quiet settlement to keep investors calm',
        effects: { treasury: 8, approval: -3, inequality: 0.8 },
        outcome:
          'Most of the money escapes accountability. Investor confidence is preserved at a credibility cost.',
      },
    ],
  },
  {
    id: 'productivity_boom',
    title: 'Productivity Numbers Surge',
    description:
      'Labor productivity in your city jumped 6.2% — well above national. Economists credit a wave of small-firm software adoption.',
    category: 'economic',
    weight: 5,
    choices: [
      {
        label: 'Channel windfall into worker dividend',
        cost: 8,
        effects: { happiness: 3, inequality: -1, approval: 3, gdpPerCapita: 60 },
        outcome:
          'Direct rebate cheques arrive. Critics call it populist; recipients spend the money locally and the velocity boosts retail.',
      },
      {
        label: 'Invest in vocational re-skilling',
        cost: 6,
        effects: { education: 2, innovation: 1.5, unemployment: -0.4, gdpPerCapita: 80 },
        outcome:
          'Workers most exposed to automation get a runway. Returns compound slowly but visibly.',
      },
      {
        label: 'Bank the surplus for the next downturn',
        effects: { treasury: 10, creditRating: 2, approval: -1 },
        outcome:
          'Reserves grow. Voters wonder loudly why the budget surplus isn’t in their pockets.',
      },
    ],
  },

  // ============================================================================
  // SOCIAL
  // ============================================================================
  {
    id: 'racial_tensions',
    title: 'Police Shooting Sparks Outcry',
    description:
      'An officer-involved shooting of an unarmed resident has triggered protests downtown. The community wants independent oversight.',
    category: 'social',
    weight: 6,
    choices: [
      {
        label: 'Establish civilian review board with subpoena power',
        cost: 4,
        effects: { approval: 3, happiness: 1, crime: 0.5, inequality: -0.5 },
        outcome:
          'Trust slowly rebuilds in affected districts. Police union files grievance over loss of internal discretion.',
      },
      {
        label: 'Internal investigation, body cam mandate',
        cost: 6,
        effects: { approval: 1, crime: -0.5, happiness: 0 },
        outcome:
          'Procedural reform is real but underwhelming to activists. Body-cam compliance issues persist.',
      },
      {
        label: 'Back the officer pending due process',
        effects: { approval: -7, happiness: -4, crime: 1.5 },
        outcome:
          'Demonstrations escalate. Cross-district turnout in the next election shifts measurably.',
      },
    ],
  },
  {
    id: 'generational_housing',
    title: 'Young Renters March on City Hall',
    description:
      'Tenants under 35 stage a mass protest, arguing they pay 47% of income to rent while older homeowners hold most equity.',
    flavor: '"Tax our parents, not our wages," reads one sign.',
    category: 'social',
    weight: 6,
    choices: [
      {
        label: 'Raise property tax 0.8 pts on properties #2+',
        effects: { treasury: 14, inequality: -1.5, approval: 1, gdpPerCapita: -40 },
        outcome:
          'Small landlords sell into the market — supply bumps up. The "double-house" lobby is furious.',
      },
      {
        label: 'Vacancy tax + first-time-buyer assistance',
        cost: 10,
        effects: { inequality: -0.8, happiness: 1, approval: 2 },
        outcome:
          'Empty units come onto the market. Young homebuyers gain a foothold; demand is now durable.',
      },
      {
        label: 'Issue a sympathetic statement only',
        effects: { approval: -3, happiness: -2, inequality: 0.6 },
        outcome:
          'The protesters leave angrier than they came. Outflow of working-age renters accelerates.',
      },
    ],
  },
  {
    id: 'mental_health_report',
    title: 'Mental Health Crisis Report Released',
    description:
      'A university study finds 1-in-5 residents experienced severe distress this year. Wait times for therapy average 14 weeks.',
    category: 'health',
    weight: 5,
    choices: [
      {
        label: 'Stand up city-funded clinic network',
        cost: 18,
        effects: { health: 3, happiness: 2, approval: 2, crime: -1, treasury: -6 },
        outcome:
          'Clinics open within a year. Crisis call volume falls measurably; ER visits for psychiatric emergencies decline.',
      },
      {
        label: 'Embed mental health workers in 911 response',
        cost: 7,
        effects: { health: 1, crime: -1.5, approval: 1 },
        outcome:
          'Diversion from jail and ER cuts costs downstream. Police union initially resistant but data wins them over.',
      },
      {
        label: 'Public awareness campaign only',
        cost: 2,
        effects: { happiness: 0.5, health: 0.5 },
        outcome:
          'PSAs run. Stigma drops slightly. Capacity bottleneck is unchanged.',
      },
    ],
  },
  {
    id: 'pride_funding',
    title: 'Pride Festival Funding Vote',
    description:
      'Organizers request $400K for a 50th anniversary Pride event. A vocal religious coalition opposes city funding.',
    category: 'social',
    weight: 5,
    choices: [
      {
        label: 'Approve full funding',
        cost: 1,
        effects: { happiness: 2, approval: 1, inequality: -0.3 },
        outcome:
          'Event draws 200K visitors. Hotel occupancy spikes; local businesses report strong weekend revenue.',
      },
      {
        label: 'Partial funding ($120K) — match private donors',
        cost: 1,
        effects: { happiness: 1, approval: 0 },
        outcome:
          'Compromise pleases no one fully. Event still happens at smaller scale.',
      },
      {
        label: 'Deny funding — private organizers can do this',
        effects: { happiness: -1, approval: -2, gdpPerCapita: -20 },
        outcome:
          'Organizers relocate next year’s event to a neighboring city. Tourism revenue follows them.',
      },
    ],
    countryBias: { atlantica: 1.3, nordfjord: 1.2, sahel: 0.5, eastoria: 0.7 },
  },
  {
    id: 'veterans_homelessness',
    title: 'Veterans Encampment Grows',
    description:
      'A growing camp of veterans behind the bus terminal has become a focal point for a housing-first advocacy push.',
    category: 'social',
    weight: 5,
    choices: [
      {
        label: 'Adopt housing-first policy with wraparound services',
        cost: 22,
        effects: { health: 1.5, crime: -1, happiness: 2, approval: 2, inequality: -0.6 },
        outcome:
          'Within a year, sustained-housing rates exceed 80%. Total costs end up below traditional shelter models due to fewer ER and jail visits.',
      },
      {
        label: 'Clear encampment, expand shelter beds',
        cost: 6,
        effects: { crime: -0.3, happiness: -1, approval: -1 },
        outcome:
          'Camp dispersed; new camps appear elsewhere. Shelter beds are full but turnover is low.',
      },
      {
        label: 'Refer to county and federal services',
        effects: { approval: -2, happiness: -1, crime: 0.5 },
        outcome:
          'Buck-passing is visible. Coverage cycles intensify.',
      },
    ],
  },
  {
    id: 'public_art_controversy',
    title: 'Founder Statue Faces Calls for Removal',
    description:
      'A 100-year-old statue of the city’s founder is now widely cited as celebrating someone who profited from slavery. Historians, descendants, and tourism boards disagree.',
    category: 'social',
    weight: 5,
    choices: [
      {
        label: 'Move statue to museum with context',
        cost: 1,
        effects: { happiness: 1, approval: 1, innovation: 0.3 },
        outcome:
          'Most accept the compromise. A new commissioned piece replaces it in the plaza.',
      },
      {
        label: 'Leave statue, add a plaque',
        effects: { approval: -2, happiness: -1, inequality: 0.3 },
        outcome:
          'Activists are unsatisfied; preservationists are unsatisfied. The plaque becomes a meme.',
      },
      {
        label: 'Take it down without process',
        effects: { approval: -3, happiness: 0, crime: 0.3 },
        outcome:
          'Process critics call it lawless. Counter-protest follows. Trust in city procedure dips.',
      },
    ],
  },
  {
    id: 'refugee_influx',
    title: 'Sudden Refugee Resettlement Request',
    description:
      'A regional disaster has displaced thousands. The federal government asks your city to accept 5,000 refugees with limited support funding.',
    category: 'social',
    weight: 4,
    choices: [
      {
        label: 'Accept fully with city-funded settlement services',
        cost: 18,
        effects: { population: 5000, unemployment: 0.6, education: 0.5, happiness: -1, approval: -2, innovation: 1.2 },
        outcome:
          'Short-term strain on housing and schools. Decade-long literature suggests positive net fiscal and labor-force outcomes.',
      },
      {
        label: 'Accept a portion (1,500) and negotiate more federal aid',
        cost: 6,
        effects: { population: 1500, unemployment: 0.2, education: 0.2, approval: -1 },
        outcome:
          'Moderate intake gives time to adapt. Other cities take the rest.',
      },
      {
        label: 'Decline — capacity exceeded',
        effects: { approval: 1, happiness: -1, innovation: -0.4 },
        outcome:
          'Refugees resettled elsewhere. Diaspora communities here are demoralized.',
      },
    ],
    countryBias: { nordfjord: 1.3, atlantica: 1.2, sahel: 0.6 },
  },

  // ============================================================================
  // ENVIRONMENTAL
  // ============================================================================
  {
    id: 'old_growth_trees',
    title: 'Developer Wants to Clear Old-Growth Stand',
    description:
      'A 12-acre stand of 200-year-old trees sits on land approved for a mixed-use development. Environmentalists are chaining themselves to trunks.',
    category: 'environmental',
    weight: 5,
    choices: [
      {
        label: 'Designate as protected urban forest',
        cost: 8,
        effects: { pollution: -1, happiness: 2, approval: 1, gdpPerCapita: -60 },
        outcome:
          'Forest preserved. Developer sues; eventually settles with reduced project nearby.',
      },
      {
        label: 'Approve clearing with replanting requirement (3-to-1)',
        effects: { pollution: 1, gdpPerCapita: 80, approval: -2, happiness: -2 },
        outcome:
          'Trees come down. Replanted saplings will take 60 years to match the canopy lost.',
      },
      {
        label: 'Partial preserve — half developed, half park',
        cost: 3,
        effects: { pollution: -0.3, gdpPerCapita: 30, approval: 0 },
        outcome:
          'Both sides feel slighted; both can live with it. Compromise documented as case study by planners.',
      },
    ],
  },
  {
    id: 'endangered_species',
    title: 'Endangered Salamander on Build Site',
    description:
      'A protected species was found at a long-planned hospital expansion site. Federal regulators have paused construction.',
    category: 'environmental',
    weight: 4,
    choices: [
      {
        label: 'Fund relocation program for species',
        cost: 12,
        effects: { pollution: -0.3, approval: 1, gdpPerCapita: 40, health: 0.5 },
        outcome:
          'Biologists relocate the population to a protected wetland. Hospital build resumes after a 4-month delay.',
      },
      {
        label: 'Litigate the listing',
        cost: 6,
        effects: { approval: -2, pollution: 0.2, gdpPerCapita: 60 },
        outcome:
          'You win partially; precedent is set that emboldens future developers. Environmental NGOs commit to opposition.',
      },
      {
        label: 'Cancel project, look for new site',
        effects: { gdpPerCapita: -40, health: -1, approval: -3 },
        outcome:
          'Hospital expansion delayed by years. Trust in long-term planning erodes.',
      },
    ],
  },
  {
    id: 'river_pollution',
    title: 'PFAS Detected in River',
    description:
      '"Forever chemicals" are detected at 8x safe levels in the river that 60% of residents drink from. Source is unclear.',
    category: 'environmental',
    weight: 5,
    choices: [
      {
        label: 'Emergency carbon filtration upgrade',
        cost: 45,
        effects: { health: 3, debt: 20, approval: 2, creditRating: -1 },
        outcome:
          'Filtration online in 6 months. Long-term population health effects averted, with the cost financed over decades.',
      },
      {
        label: 'Bottled water distribution while investigating source',
        cost: 12,
        effects: { health: 0.5, treasury: -5, approval: 0 },
        outcome:
          'Plastic waste explodes; some districts get inconsistent deliveries. Equity questions surface immediately.',
      },
      {
        label: 'Disclose, set advisory, take no action',
        effects: { health: -3, approval: -6, happiness: -3 },
        outcome:
          'Bottled water sales spike privately. Low-income residents lack the means to substitute.',
      },
    ],
  },
  {
    id: 'coastal_erosion',
    title: 'Coastline Retreats 11 Meters',
    description:
      'A storm season has eaten away the dune system protecting six oceanfront blocks. Engineers warn it will only accelerate.',
    category: 'environmental',
    weight: 4,
    choices: [
      {
        label: 'Managed retreat — buy out vulnerable homes',
        cost: 60,
        effects: { health: 1, approval: 1, debt: 30, inequality: -0.5 },
        outcome:
          'Painful but pragmatic. Property owners are made whole; rebuilt dune is left to nature.',
      },
      {
        label: 'Sea wall + beach replenishment',
        cost: 30,
        effects: { health: 0.3, gdpPerCapita: 50, approval: 2, pollution: 0.5 },
        outcome:
          'Engineering buys 30 years. Beach loses width to the wall; downstream erosion accelerates as currents shift.',
      },
      {
        label: 'Hope for a calm decade',
        effects: { approval: -3, health: -1, gdpPerCapita: -120 },
        outcome:
          'Two more major storms hit. Insurance market for coastal properties collapses.',
      },
    ],
    countryBias: { costaverde: 1.6, pacifica: 1.5, nordfjord: 1.2, eastoria: 0.6 },
  },
  {
    id: 'wildfire_season',
    title: 'Severe Wildfire Season Forecast',
    description:
      'Drought and heat domes set up the worst fire season in a decade. Suburbs in the wildland-urban interface are exposed.',
    category: 'environmental',
    weight: 5,
    choices: [
      {
        label: 'Pre-position resources + defensible space program',
        cost: 14,
        effects: { health: 1.5, pollution: -0.5, approval: 2, treasury: -4 },
        outcome:
          'When fires hit, response is fast. Homes lost are a fraction of projection.',
      },
      {
        label: 'Mandatory evacuation drills, no new funding',
        cost: 2,
        effects: { happiness: -1, approval: 0, health: 0.3 },
        outcome:
          'Awareness up. Response capacity still under-resourced.',
      },
      {
        label: 'Standard preparedness',
        effects: { health: -2, pollution: 2, approval: -3, gdpPerCapita: -80 },
        outcome:
          'Several blocks burn. Air quality plunges across the metro for weeks; chronic respiratory cases tick up.',
      },
    ],
    countryBias: { pacifica: 1.6, costaverde: 1.3, sahel: 1.2, nordfjord: 0.5 },
  },
  {
    id: 'bike_lane_network',
    title: 'Cyclists Propose Protected Lane Grid',
    description:
      'Advocates submit a $35M plan for 80 km of protected bike lanes. Drivers, retailers, and delivery firms have concerns.',
    category: 'environmental',
    weight: 5,
    choices: [
      {
        label: 'Build full network in two years',
        cost: 35,
        effects: { pollution: -2, health: 2, happiness: 1, gdpPerCapita: 30, approval: 0 },
        outcome:
          'Cycling commute share triples within 3 years. Retail along corridors sees foot-traffic gains; deliveries shift to e-bikes.',
      },
      {
        label: 'Pilot on three corridors first',
        cost: 8,
        effects: { pollution: -0.5, health: 0.5, approval: 1 },
        outcome:
          'Data collected. Two of three corridors expand; one is removed after community feedback.',
      },
      {
        label: 'Pass — drivers already complain about congestion',
        effects: { pollution: 0.5, approval: -1, happiness: -1 },
        outcome:
          'Status quo. Cyclist fatalities rise to a multi-year high.',
      },
    ],
  },
  {
    id: 'plastic_ban',
    title: 'Single-Use Plastic Ban Proposed',
    description:
      'Council proposes banning single-use plastics in food service. Small restaurants warn of cost shocks.',
    category: 'environmental',
    weight: 5,
    choices: [
      {
        label: 'Full ban with 6-month transition + transition fund',
        cost: 4,
        effects: { pollution: -2, happiness: 0.5, approval: 1, gdpPerCapita: -30 },
        outcome:
          'Substitutes scale; supply chains adapt. Restaurants pass small cost increases to customers.',
      },
      {
        label: 'Tax single-use plastics rather than ban',
        effects: { treasury: 8, pollution: -1, approval: 0 },
        outcome:
          'Behavior shifts gradually. Higher revenue, slower environmental gain.',
      },
      {
        label: 'Voluntary pledge program',
        effects: { pollution: -0.2, approval: -1 },
        outcome:
          'A few firms join. Plastics use barely changes.',
      },
    ],
  },

  // ============================================================================
  // CRISIS
  // ============================================================================
  {
    id: 'cyberattack',
    title: 'Ransomware Hits City Systems',
    description:
      'Payroll, permitting, and 311 are offline. The attackers demand $8M in cryptocurrency within 72 hours.',
    flavor: '"We were warned about this exact vector two years ago," an aide admits.',
    category: 'crisis',
    weight: 4,
    choices: [
      {
        label: 'Pay the ransom — restore services fast',
        cost: 8,
        effects: { approval: -2, treasury: -8, innovation: -1, creditRating: -1 },
        outcome:
          'Systems restored within a week. Federal agencies condemn the precedent; expect repeat attempts.',
      },
      {
        label: 'Refuse, rebuild from backups, full security audit',
        cost: 22,
        effects: { innovation: 2, approval: -3, treasury: -10, creditRating: 1 },
        outcome:
          'Six weeks of partial blackout. Long-term posture much stronger; insurance premiums drop next renewal.',
      },
      {
        label: 'Refuse, no audit — patch and hope',
        effects: { approval: -5, innovation: -1, treasury: -3 },
        outcome:
          'Services limp back. Two months later a different group hits the same vector.',
      },
    ],
  },
  {
    id: 'bridge_failure',
    title: 'Inspectors Downgrade Major Bridge',
    description:
      'The artery bridge carrying 90K vehicles a day is reclassified "structurally deficient." Closure recommended within 30 days.',
    category: 'crisis',
    weight: 4,
    choices: [
      {
        label: 'Close immediately, fast-track rebuild',
        cost: 80,
        effects: { debt: 40, gdpPerCapita: -100, approval: -3, happiness: -3, health: 1 },
        outcome:
          'Massive traffic disruption for 18 months. Lives saved; surface streets transform into commute corridors temporarily.',
      },
      {
        label: 'Weight-restrict + accelerated inspection',
        cost: 6,
        effects: { gdpPerCapita: -30, approval: -1, health: -0.5 },
        outcome:
          'Trucks reroute through residential streets. Lawsuits begin appearing within months.',
      },
      {
        label: 'Patch and continue normal use',
        effects: { health: -2, approval: -6, gdpPerCapita: -40, treasury: -4 },
        outcome:
          'A partial collapse occurs within months. Casualties trigger federal investigation.',
      },
    ],
  },
  {
    id: 'water_contamination',
    title: 'Coliform Detected in Water Mains',
    description:
      'Routine sampling detects E. coli in five district mains. Public health officials urge a boil-water advisory tonight.',
    category: 'crisis',
    weight: 4,
    choices: [
      {
        label: 'Citywide boil advisory + free bottled water',
        cost: 8,
        effects: { health: 2, approval: 1, treasury: -3 },
        outcome:
          'Caution pays off. No outbreak. Some media call it overcautious; sample data later vindicates the call.',
      },
      {
        label: 'Targeted advisory to five districts only',
        cost: 3,
        effects: { health: 0, approval: -1, inequality: 0.4 },
        outcome:
          'Most residents unaffected. Affected residents complain of inequitable communication.',
      },
      {
        label: 'Quietly fix mains; no advisory',
        effects: { health: -4, approval: -8, treasury: -2 },
        outcome:
          'Eventual outbreak. The cover-up becomes the story; resignations follow.',
      },
    ],
  },
  {
    id: 'mass_shooting',
    title: 'Mass Shooting at Public Event',
    description:
      'A shooter killed eleven at a community festival. The grieving city looks to the mayor for a response.',
    category: 'crisis',
    weight: 3,
    choices: [
      {
        label: 'Comprehensive package: mental health, security, gun storage law',
        cost: 14,
        effects: { health: 1, crime: -1, approval: 3, happiness: -2 },
        outcome:
          'Bipartisan support emerges. Gun lobby challenges storage law in court; case takes years.',
      },
      {
        label: 'Increased event security only',
        cost: 5,
        effects: { crime: -0.5, approval: 0, happiness: -1 },
        outcome:
          'Visible policing presence. Root causes unaddressed. Anxiety persists at public gatherings.',
      },
      {
        label: 'Vigil and "thoughts and prayers" statement',
        effects: { approval: -5, happiness: -3, crime: 0.5 },
        outcome:
          'Editorials are scathing. Activists organize a recall petition.',
      },
    ],
  },
  {
    id: 'power_grid_failure',
    title: 'Grid Blackout During Heat Dome',
    description:
      'The grid fails during a 44°C heat event. 200,000 are without power, including hospital backup systems running thin.',
    category: 'crisis',
    weight: 4,
    choices: [
      {
        label: 'Emergency procurement of microgrids + standby gen',
        cost: 32,
        effects: { health: 2, innovation: 1.5, approval: 2, debt: 15 },
        outcome:
          'Critical facilities restored within 36 hours. The microgrid investment pays off in resilience for years.',
      },
      {
        label: 'Sue utility, await standard repair',
        effects: { health: -2, approval: -4, treasury: 3 },
        outcome:
          'Restoration takes nine days. Heat-related deaths reach double digits. Settlement comes years later.',
      },
      {
        label: 'Mutual aid request from neighbors',
        cost: 6,
        effects: { health: 0, approval: -1, happiness: -2 },
        outcome:
          'Partial restoration in three days. Aid debt to neighbor cities will be repaid next time they’re hit.',
      },
    ],
  },
  {
    id: 'train_derailment',
    title: 'Freight Train Derails Near Schools',
    description:
      'A freight train carrying chemicals derails 400m from two schools. Tanker integrity is uncertain.',
    category: 'crisis',
    weight: 3,
    choices: [
      {
        label: 'Evacuate 2 km radius, full hazmat response',
        cost: 6,
        effects: { health: 1, pollution: -0.5, approval: 1, gdpPerCapita: -30 },
        outcome:
          'Better safe than sorry. Schools reopen in five days. Resident anxiety lingers for months.',
      },
      {
        label: 'Shelter-in-place; controlled burn-off',
        cost: 3,
        effects: { health: -1, pollution: 1.5, approval: -2 },
        outcome:
          'Plume drifts across one district. Long-term air quality monitoring required.',
      },
      {
        label: 'Wait for federal response',
        effects: { health: -3, pollution: 2, approval: -5 },
        outcome:
          'Federal team arrives in 72 hours. Bureaucratic blame-shifting dominates the news cycle.',
      },
    ],
  },
  {
    id: 'food_poisoning_outbreak',
    title: 'Restaurant Outbreak Sickens 200',
    description:
      'Salmonella from a popular catering company has sickened 200 residents, including a school cohort. Sources are still being traced.',
    category: 'crisis',
    weight: 5,
    choices: [
      {
        label: 'Public name-and-shame + emergency inspections',
        cost: 3,
        effects: { health: 1, approval: 1, gdpPerCapita: -30 },
        outcome:
          'Outbreak contained in days. Restaurant lobby protests "due process"; sector compliance improves.',
      },
      {
        label: 'Confidential investigation, voluntary recall',
        cost: 2,
        effects: { health: 0, gdpPerCapita: -5, approval: -1 },
        outcome:
          'Investigation slower; cases continue trickling. Some venues quietly close.',
      },
    ],
  },

  // ============================================================================
  // OPPORTUNITY
  // ============================================================================
  {
    id: 'international_summit',
    title: 'Bid to Host Climate Summit',
    description:
      'A UN-affiliated body invites you to bid for hosting a 5,000-delegate climate summit. Other cities are competing aggressively.',
    category: 'opportunity',
    weight: 5,
    choices: [
      {
        label: 'Full bid — invest in venue and security',
        cost: 28,
        effects: { gdpPerCapita: 220, innovation: 1.5, approval: 2, happiness: 1, treasury: -8 },
        outcome:
          'You win. Two-week boost in tourism is followed by lasting reputational dividends in green investment.',
      },
      {
        label: 'Modest bid — reuse existing venues',
        cost: 8,
        effects: { gdpPerCapita: 70, innovation: 0.5, approval: 0 },
        outcome:
          'Bid loses to a city offering more. Local catering still benefits from the planning meetings.',
      },
      {
        label: 'Pass — focus on domestic priorities',
        effects: { innovation: -0.3, approval: -1 },
        outcome:
          'Summit goes to a rival. Network effects accrue elsewhere.',
      },
    ],
    countryBias: { nordfjord: 1.4, atlantica: 1.2, sahel: 0.6 },
  },
  {
    id: 'film_studio',
    title: 'Major Film Studio Scouting Locations',
    description:
      'A studio wants to base a 5-year production deal here, with crew training and soundstages, if you provide tax credits.',
    category: 'opportunity',
    weight: 5,
    choices: [
      {
        label: 'Approve generous tax credits',
        effects: { treasury: -16, gdpPerCapita: 110, unemployment: -0.6, innovation: 1, happiness: 1 },
        outcome:
          'Productions arrive within a year. Net fiscal impact is debated; cultural cachet is real.',
      },
      {
        label: 'Approve modest credits + soundstage public-private',
        cost: 14,
        effects: { gdpPerCapita: 60, unemployment: -0.3, innovation: 0.5, treasury: -2 },
        outcome:
          'Smaller scale but assets remain city-owned. Independent productions also start using them.',
      },
      {
        label: 'Decline — credit programs rarely break even',
        effects: { innovation: -0.4, happiness: -0.5 },
        outcome:
          'Studio chooses another region. Local film school grads continue commuting elsewhere for work.',
      },
    ],
    countryBias: { atlantica: 1.3, pacifica: 1.3, costaverde: 1.2 },
  },
  {
    id: 'olympic_bid',
    title: 'Olympic Games Bid Window',
    description:
      'The IOC will accept bids for the 2040 Summer Games. A bid will cost $80M over 4 years and may not win.',
    category: 'opportunity',
    weight: 3,
    choices: [
      {
        label: 'Full bid — go for it',
        cost: 60,
        effects: { gdpPerCapita: 180, debt: 40, approval: 1, innovation: 1, inequality: 1 },
        outcome:
          'If you win, the games bring decades-long infrastructure. If you don’t, the spending becomes a punchline.',
      },
      {
        label: 'Coordinated regional bid (split costs)',
        cost: 25,
        effects: { gdpPerCapita: 80, debt: 12, approval: 0 },
        outcome:
          'Shared infrastructure is more lasting. Spotlight is split too.',
      },
      {
        label: 'Skip — Olympic finances are notorious',
        effects: { approval: -1, innovation: -0.3 },
        outcome:
          'The post-games budget surveys around the world confirm you were right. Few remember.',
      },
    ],
  },
  {
    id: 'direct_flight',
    title: 'Direct Long-Haul Route Possible',
    description:
      'An airline will open a direct route to a major global hub if the city subsidizes the first two years.',
    category: 'opportunity',
    weight: 5,
    choices: [
      {
        label: 'Subsidize route launch',
        cost: 6,
        effects: { gdpPerCapita: 90, innovation: 0.8, approval: 1, pollution: 0.6 },
        outcome:
          'Business travel and FDI inflows grow. Carbon footprint of city travel also rises.',
      },
      {
        label: 'Negotiate frequency commitment instead of subsidy',
        effects: { gdpPerCapita: 30, innovation: 0.2 },
        outcome:
          'Airline pulls out after a year. Route reverts to one-stop.',
      },
    ],
    countryBias: { eastoria: 1.3, atlantica: 1.2, costaverde: 1.1 },
  },
  {
    id: 'free_trade_zone',
    title: 'Free Trade Zone Designation Offered',
    description:
      'Federal commerce dept offers FTZ designation for the port district. Customs benefits could attract logistics operators.',
    category: 'opportunity',
    weight: 4,
    choices: [
      {
        label: 'Accept designation, market aggressively',
        cost: 8,
        effects: { gdpPerCapita: 140, unemployment: -0.8, inequality: 0.6, pollution: 1 },
        outcome:
          'Logistics tenants commit within 18 months. Traffic and air-quality issues become campaign topics.',
      },
      {
        label: 'Accept with strict environmental conditions',
        cost: 6,
        effects: { gdpPerCapita: 70, unemployment: -0.3, pollution: 0.3, innovation: 0.5 },
        outcome:
          'Slower uptake; cleaner operators only. Wages tend to be higher than the unconditional path.',
      },
      {
        label: 'Decline — sovereignty concerns',
        effects: { gdpPerCapita: -30 },
        outcome:
          'Designation goes to a competing port. Local cargo volumes erode over five years.',
      },
    ],
    countryBias: { eastoria: 1.4, sahel: 1.2 },
  },
  {
    id: 'university_partnership',
    title: 'University Offers Free Tuition Pilot',
    description:
      'A nearby state university offers free tuition to qualifying city residents if the city co-funds support services.',
    category: 'opportunity',
    weight: 5,
    choices: [
      {
        label: 'Co-fund the pilot for 5 years',
        cost: 18,
        effects: { education: 3, innovation: 1.5, inequality: -1.2, approval: 2 },
        outcome:
          'Enrollment of first-generation students surges. Effects on workforce composition compound over a decade.',
      },
      {
        label: 'Partial co-fund tied to STEM majors',
        cost: 10,
        effects: { education: 1.5, innovation: 2, inequality: -0.4 },
        outcome:
          'Tech workforce grows fastest. Arts and humanities students feel slighted.',
      },
      {
        label: 'Pass — university should self-fund',
        effects: { education: -0.5, inequality: 0.3 },
        outcome:
          'Pilot scaled down. University reroutes resources to a neighboring city.',
      },
    ],
  },

  // ============================================================================
  // POLITICAL
  // ============================================================================
  {
    id: 'leaked_documents',
    title: 'Reporter Has Internal Documents',
    description:
      'A reporter informs your office she has leaked internal memos showing budget overruns hidden from council. Story goes Sunday.',
    category: 'political',
    weight: 5,
    choices: [
      {
        label: 'Pre-empt: publish memos, own the story',
        effects: { approval: -1, creditRating: 1, happiness: 0, treasury: -2 },
        outcome:
          'Sting taken out of the story. Reform package announced same day; trust in process modestly recovers.',
      },
      {
        label: 'Issue legal threat to source',
        effects: { approval: -5, happiness: -2, creditRating: -1 },
        outcome:
          'Streisand effect. Documents go viral. Source is shielded by press laws.',
      },
      {
        label: 'No comment',
        effects: { approval: -3, happiness: -1 },
        outcome:
          'Reporter publishes. Opposition fills the narrative vacuum.',
      },
    ],
  },
  {
    id: 'recall_threatened',
    title: 'Recall Petition Drive Launched',
    description:
      'A coalition has filed a recall petition citing "fiscal mismanagement." They need 25,000 signatures in 90 days.',
    category: 'political',
    weight: 4,
    choices: [
      {
        label: 'Major town-hall tour, address concerns directly',
        cost: 3,
        effects: { approval: 3, happiness: 1, gdpPerCapita: 0 },
        outcome:
          'Petition signatures stall well below threshold. Direct contact remains the most reliable approval lever.',
      },
      {
        label: 'Counter-campaign attacking organizers',
        cost: 4,
        effects: { approval: -4, happiness: -2 },
        outcome:
          'Petition gains energy from your reaction. Backfire effect well documented in political science.',
      },
      {
        label: 'Ignore — let it run its course',
        effects: { approval: -2 },
        outcome:
          'Petition gathers steam slowly. Whether it qualifies depends on momentum next quarter.',
      },
    ],
  },
  {
    id: 'district_secession',
    title: 'Wealthy District Talks Secession',
    description:
      'The wealthiest district has hired lawyers to explore incorporating as a separate city, citing "tax misallocation."',
    category: 'political',
    weight: 4,
    choices: [
      {
        label: 'Negotiate new service-sharing agreement',
        cost: 4,
        effects: { inequality: 0.6, treasury: -2, approval: 0 },
        outcome:
          'Secession talk fades; wealthy district keeps tax base inside city limits. Other districts negotiate harder next time.',
      },
      {
        label: 'Legal challenge to block secession',
        cost: 6,
        effects: { approval: -1, gdpPerCapita: -20 },
        outcome:
          'Years of litigation. Wealthy residents quietly relocate; tax base erodes regardless.',
      },
      {
        label: 'Let them go — keep urban core',
        effects: { treasury: -20, inequality: -1, gdpPerCapita: -100, approval: 0 },
        outcome:
          'Tax base shrinks dramatically. Remaining city becomes more equal but less able to deliver services.',
      },
    ],
    countryBias: { atlantica: 1.3, sahel: 0.6 },
  },
  {
    id: 'term_limits',
    title: 'Term Limits Ballot Measure',
    description:
      'A council member proposes a referendum capping mayors at two terms. Public opinion is split.',
    category: 'political',
    weight: 4,
    choices: [
      {
        label: 'Endorse — show statesmanship',
        effects: { approval: 3, happiness: 1, innovation: -0.3 },
        outcome:
          'Passes easily with your endorsement. Voters reward the gesture; future you is term-limited.',
      },
      {
        label: 'Oppose — claim continuity matters',
        effects: { approval: -3, happiness: -1 },
        outcome:
          'Passes anyway. Your opposition reads as self-serving.',
      },
      {
        label: 'Stay neutral',
        effects: { approval: 0 },
        outcome:
          'Measure barely passes. Voters notice you didn’t pick a side.',
      },
    ],
  },
  {
    id: 'lobbying_disclosure',
    title: 'Lobbying Disclosure Ordinance',
    description:
      'Reform advocates want every meeting with paid lobbyists to be public record within 48 hours.',
    category: 'political',
    weight: 5,
    choices: [
      {
        label: 'Pass the ordinance as written',
        cost: 1,
        effects: { approval: 3, creditRating: 1, innovation: -0.3, gdpPerCapita: -20 },
        outcome:
          'Transparency improves. Some firms relocate government affairs; others adapt to the new norm.',
      },
      {
        label: 'Weakened version: 30-day delay, $5K threshold',
        effects: { approval: 0, gdpPerCapita: 0 },
        outcome:
          'Disclosure is partial. Reform groups call it a fig leaf.',
      },
      {
        label: 'Block — chamber of commerce opposed',
        effects: { approval: -3, inequality: 0.4 },
        outcome:
          'Status quo. Investigative journalism beat picks up the slack.',
      },
    ],
  },

  // ============================================================================
  // FOREIGN
  // ============================================================================
  {
    id: 'diaspora_plaza',
    title: 'Diaspora Community Requests Plaza',
    description:
      'A 60,000-strong diaspora wants a downtown plaza named after a homeland figure controversial in their country of origin.',
    category: 'foreign',
    weight: 4,
    choices: [
      {
        label: 'Approve — recognize the community',
        cost: 1,
        effects: { happiness: 1, approval: 1, innovation: 0.3 },
        outcome:
          'Plaza dedicated. Diplomatic tensions with the homeland flare briefly; trade impacts minimal.',
      },
      {
        label: 'Approve a neutral name acceptable to all',
        effects: { happiness: 0.5, approval: 0 },
        outcome:
          'Compromise. Diaspora is muted; homeland mollified.',
      },
      {
        label: 'Decline citing diplomatic risk',
        effects: { happiness: -1, approval: -2 },
        outcome:
          'Diaspora organizes voter drive in next cycle. Foreign ministry sends a quiet thank-you.',
      },
    ],
  },
  {
    id: 'sovereign_wealth',
    title: 'Sovereign Wealth Fund Offer',
    description:
      'A Gulf-state sovereign wealth fund offers $200M to take a long lease on the airport in return for revenue share.',
    category: 'foreign',
    weight: 4,
    choices: [
      {
        label: 'Accept the deal',
        effects: { treasury: 80, debt: -40, gdpPerCapita: 60, approval: -2, innovation: -0.3 },
        outcome:
          'Massive liquidity injection. Sovereignty critics will mention this every election cycle.',
      },
      {
        label: 'Accept with golden-share veto rights',
        effects: { treasury: 40, gdpPerCapita: 30, approval: 0 },
        outcome:
          'Smaller upfront, more control. Foreign fund accepts after negotiation; precedent set for future deals.',
      },
      {
        label: 'Decline — strategic asset',
        effects: { treasury: 0, approval: 2, creditRating: -1 },
        outcome:
          'Airport remains city-controlled. Capital costs continue to compete with other priorities.',
      },
    ],
    countryBias: { eastoria: 1.3, sahel: 1.4 },
  },
  {
    id: 'consulate_opening',
    title: 'Foreign Power Wants to Open Consulate',
    description:
      'A geopolitically tense state wants to open a consulate in your city, citing growing diaspora needs.',
    category: 'foreign',
    weight: 4,
    choices: [
      {
        label: 'Welcome, normal protocol',
        effects: { gdpPerCapita: 40, innovation: 0.3, happiness: 0, approval: -1 },
        outcome:
          'Consulate opens. Counter-intelligence cooperation with federal partners increases discreetly.',
      },
      {
        label: 'Defer to federal foreign-affairs guidance',
        effects: { approval: 0 },
        outcome:
          'Federal partners take six months to respond. Eventually approved with monitoring.',
      },
      {
        label: 'Block — security review insufficient',
        effects: { gdpPerCapita: -10, approval: 1 },
        outcome:
          'Consulate locates elsewhere. Diaspora services rerouted through neighboring cities.',
      },
    ],
  },
  {
    id: 'sister_city_mission',
    title: 'Sister City Hosts Trade Mission',
    description:
      'Your sister city wants to send a 200-person trade mission to explore investment.',
    category: 'foreign',
    weight: 6,
    choices: [
      {
        label: 'Roll out the red carpet',
        cost: 3,
        effects: { gdpPerCapita: 70, innovation: 0.5, approval: 1, happiness: 1 },
        outcome:
          'Six MOUs signed; two materialize within a year. Reciprocal mission scheduled.',
      },
      {
        label: 'Standard reception',
        cost: 1,
        effects: { gdpPerCapita: 25, innovation: 0.2 },
        outcome:
          'Productive but unmemorable. Two follow-up calls scheduled.',
      },
      {
        label: 'Skip — political optics',
        effects: { gdpPerCapita: -10, approval: -1 },
        outcome:
          'Mission goes home; sister-city relationship cools for a cycle.',
      },
    ],
  },
  {
    id: 'trade_war',
    title: 'Trade War Hits Port Revenues',
    description:
      'A national-level trade dispute has cut port traffic 22%. Layoffs are spreading through logistics, customs brokers, and dock services.',
    category: 'foreign',
    weight: 5,
    choices: [
      {
        label: 'Bridge program for port workers (6 months)',
        cost: 14,
        effects: { unemployment: 0.4, happiness: 1, approval: 2, treasury: -6 },
        outcome:
          'Worst-affected workers stabilized. Skills retained for when traffic resumes.',
      },
      {
        label: 'Pivot port to non-affected trade corridors',
        cost: 9,
        effects: { gdpPerCapita: 60, innovation: 1, unemployment: 0.6 },
        outcome:
          'Diversification reduces future vulnerability. Transition friction is real in the short run.',
      },
      {
        label: 'Wait it out',
        effects: { unemployment: 1.5, gdpPerCapita: -120, approval: -3 },
        outcome:
          'Skilled workers leave the region. When trade resumes, capacity is degraded.',
      },
    ],
    countryBias: { eastoria: 1.4, atlantica: 1.2, sahel: 0.8 },
  },
  {
    id: 'international_aid_offer',
    title: 'NGO Offers Health Infrastructure Grant',
    description:
      'A major international NGO offers $40M for primary health clinics, conditional on hiring criteria favoring NGO-trained personnel.',
    category: 'foreign',
    weight: 4,
    choices: [
      {
        label: 'Accept fully',
        effects: { health: 3, treasury: 8, approval: 2, education: 0.5 },
        outcome:
          'Clinics open in 18 months. Local health unions complain about the hiring criteria.',
      },
      {
        label: 'Accept with local-hire renegotiation',
        effects: { health: 2, treasury: 5, approval: 1 },
        outcome:
          'Smaller grant, fewer disputes. Local employment captures more of the benefit.',
      },
      {
        label: 'Decline — sovereignty over health policy',
        effects: { health: -0.5, approval: -1 },
        outcome:
          'Grant flows to a neighboring municipality. Their clinics are open within two years.',
      },
    ],
    countryBias: { sahel: 1.5, costaverde: 1.3, atlantica: 0.7, nordfjord: 0.6 },
  },

  // ============================================================================
  // TECH
  // ============================================================================
  {
    id: 'ai_hiring_bias',
    title: 'City Hiring AI Shows Racial Bias',
    description:
      'A third-party audit finds the AI screening tool used in city hiring rejected qualified minority applicants at 2.3x the baseline rate.',
    category: 'tech',
    weight: 5,
    choices: [
      {
        label: 'Suspend tool, hire affected applicants, open audit',
        cost: 4,
        effects: { approval: 2, inequality: -0.8, innovation: -0.5, treasury: -2 },
        outcome:
          'Affected candidates remediated. Industry-wide reckoning prompts vendor reforms.',
      },
      {
        label: 'Retrain model with corrected dataset',
        cost: 3,
        effects: { innovation: 0.8, inequality: -0.3, approval: 0 },
        outcome:
          'Faster fix; affected applicants remain in limbo. Activists call it inadequate.',
      },
      {
        label: 'Defend tool — disparate impact, not intent',
        effects: { approval: -5, inequality: 0.7 },
        outcome:
          'Civil rights complaint filed. Federal investigation begins within months.',
      },
    ],
  },
  {
    id: 'robotaxi_pilot',
    title: 'Robotaxi Pilot Proposed',
    description:
      'A robotaxi company wants to run 200 vehicles in your city. Taxi drivers and the union are mobilizing in opposition.',
    category: 'tech',
    weight: 5,
    choices: [
      {
        label: 'Approve pilot in limited zone',
        cost: 2,
        effects: { innovation: 2, unemployment: 0.4, pollution: -0.3, gdpPerCapita: 30 },
        outcome:
          'Pilot launches. Drivers stage protests at city hall; data on safety incidents will be the deciding factor for expansion.',
      },
      {
        label: 'Approve only with mandatory backup-driver hire program',
        effects: { innovation: 1, unemployment: 0, approval: 1, gdpPerCapita: 10 },
        outcome:
          'Slower scaling. Job transitions are smoother but firm threatens to exit.',
      },
      {
        label: 'Block — safety data inadequate',
        effects: { innovation: -1, approval: 1 },
        outcome:
          'Company pilots in a rival city. Eventually returns asking the same question.',
      },
    ],
    countryBias: { pacifica: 1.5, atlantica: 1.3, sahel: 0.4 },
  },
  {
    id: 'smart_city_sensors',
    title: 'Smart City Sensor Network',
    description:
      'A vendor proposes 4,000 IoT sensors for traffic, air quality, and noise. Privacy advocates raise alarms.',
    category: 'tech',
    weight: 5,
    choices: [
      {
        label: 'Deploy with open data + strict privacy ordinance',
        cost: 18,
        effects: { innovation: 2, pollution: -1, health: 1, approval: 1 },
        outcome:
          'Researchers and startups build on the open data layer. Privacy ordinance becomes a model for other cities.',
      },
      {
        label: 'Deploy without ordinance — move fast',
        cost: 15,
        effects: { innovation: 1.5, pollution: -1, approval: -2, happiness: -1 },
        outcome:
          'Faster benefits, slow-burn surveillance backlash. Vendor data-sharing terms become the next scandal.',
      },
      {
        label: 'Decline pilot',
        effects: { innovation: -0.5, pollution: 0.2 },
        outcome:
          'Sensor network deferred. Traffic and air-quality data remain anecdotal.',
      },
    ],
  },
  {
    id: 'deepfake_video',
    title: 'Deepfake of You Goes Viral',
    description:
      'A fabricated video shows you accepting a bribe. Forensics are clear it’s fake, but the clip has 4M views by morning.',
    category: 'tech',
    weight: 5,
    choices: [
      {
        label: 'Press conference with experts, side-by-side analysis',
        effects: { approval: -1, innovation: 0.5, happiness: 0 },
        outcome:
          'Most coverage reflects the analysis. A persistent minority still believes the video. Reputation recovers slowly.',
      },
      {
        label: 'Legal action against platforms hosting it',
        cost: 5,
        effects: { approval: -3, happiness: -1 },
        outcome:
          'Streisand effect amplifies reach. Takedowns are partial and slow.',
      },
      {
        label: 'Ignore — it will fade',
        effects: { approval: -5, happiness: -2 },
        outcome:
          'It does not fade. The clip becomes recurring opposition content.',
      },
    ],
  },
  {
    id: 'surveillance_expansion',
    title: 'Police Want More Surveillance Cameras',
    description:
      'PD requests $25M for 2,000 new AI-enabled cameras citywide, citing crime reduction in pilot areas.',
    category: 'tech',
    weight: 5,
    choices: [
      {
        label: 'Approve with judicial oversight on retention',
        cost: 25,
        effects: { crime: -2, happiness: -1, approval: 0, inequality: 0.3 },
        outcome:
          'Crime drops in covered districts; some displacement to non-covered areas. Oversight board reduces misuse incidents.',
      },
      {
        label: 'Approve a smaller pilot in two districts',
        cost: 8,
        effects: { crime: -0.8, happiness: -0.5, approval: 0 },
        outcome:
          'Data inconclusive. Decision deferred a year.',
      },
      {
        label: 'Reject — civil liberties concern',
        effects: { crime: 0.5, happiness: 1, approval: -1 },
        outcome:
          'Police union frustrated. ACLU sends a thank-you letter; voters split.',
      },
    ],
  },
  {
    id: 'drone_delivery',
    title: 'Drone Delivery Pilot Proposal',
    description:
      'Two e-commerce giants want airspace for drone delivery, promising 6,000 jobs over a decade.',
    category: 'tech',
    weight: 5,
    choices: [
      {
        label: 'Approve restricted air corridors',
        cost: 2,
        effects: { innovation: 1.5, unemployment: -0.4, pollution: -0.2, happiness: -1, gdpPerCapita: 40 },
        outcome:
          'Drones launch. Noise complaints rise in flight-path neighborhoods; e-commerce dependence deepens.',
      },
      {
        label: 'Require partnership with city for last-mile equity routes',
        cost: 4,
        effects: { innovation: 1, inequality: -0.4, approval: 1 },
        outcome:
          'Service includes underserved districts. Slower scale but better political durability.',
      },
      {
        label: 'Decline — premature regulation',
        effects: { innovation: -0.5 },
        outcome:
          'Pilot moves to neighboring metro. Local firms cite the decision in lobbying.',
      },
    ],
  },
  {
    id: 'open_source_government',
    title: 'Open Source Government Code Initiative',
    description:
      'Civic technologists propose all city-funded software be open-sourced by default. IT vendors object.',
    category: 'tech',
    weight: 4,
    choices: [
      {
        label: 'Adopt open-source default',
        cost: 4,
        effects: { innovation: 2.5, approval: 1, treasury: -2, gdpPerCapita: 30 },
        outcome:
          'Other cities reuse your code; modest license-cost savings emerge. Vendor lock-in problems decline over years.',
      },
      {
        label: 'Adopt for new procurements only',
        effects: { innovation: 1, treasury: -1 },
        outcome:
          'Compromise. Existing licenses still bind the city budget.',
      },
      {
        label: 'Reject — too disruptive',
        effects: { innovation: -0.5, approval: -1 },
        outcome:
          'Vendors retain leverage. Civic tech community drifts to other cities.',
      },
    ],
  },

  // ============================================================================
  // HEALTH
  // ============================================================================
  {
    id: 'opioid_crisis',
    title: 'Overdose Deaths Hit Decade High',
    description:
      'Overdose mortality has doubled in two years. Fentanyl now appears in 90% of toxicology screens.',
    category: 'health',
    weight: 6,
    choices: [
      {
        label: 'Harm reduction: free naloxone, safe-supply pilot',
        cost: 14,
        effects: { health: 2, crime: -1, approval: 1, happiness: -1 },
        outcome:
          'Overdose fatalities drop within months. Conservative critics call it enabling; emergency rooms breathe easier.',
      },
      {
        label: 'Enforcement-heavy: more drug arrests, tougher sentences',
        cost: 8,
        effects: { crime: -0.5, health: -1, approval: 0, inequality: 0.6 },
        outcome:
          'Jails fill. Overdose rates barely move; recidivism stays high.',
      },
      {
        label: 'Education campaign in schools',
        cost: 3,
        effects: { health: 0.5, education: 0.3, approval: 0 },
        outcome:
          'Long-term prevention seedlings planted. Current crisis continues unabated.',
      },
    ],
  },
  {
    id: 'childhood_obesity',
    title: 'Childhood Obesity Rate Climbs to 29%',
    description:
      'Public health data show child obesity has climbed steadily for a decade, especially in food-desert districts.',
    category: 'health',
    weight: 5,
    choices: [
      {
        label: 'Free school meals + active recess + soda tax',
        cost: 10,
        effects: { health: 2, treasury: 4, inequality: -0.7, approval: 1, happiness: 0 },
        outcome:
          'Multi-year decline begins in pilot schools. Beverage industry lobbies aggressively against soda tax expansion.',
      },
      {
        label: 'Subsidize grocers in food-desert districts',
        cost: 8,
        effects: { health: 1, inequality: -0.8, gdpPerCapita: 20 },
        outcome:
          'Two new stores open in underserved areas. Habits shift slowly as access improves.',
      },
      {
        label: 'Public awareness campaign',
        cost: 1,
        effects: { health: 0.2 },
        outcome:
          'PSAs run. Behavioral change requires structural change; the needle barely moves.',
      },
    ],
  },
  {
    id: 'virus_variant',
    title: 'New Respiratory Variant Detected',
    description:
      'Wastewater surveillance shows a transmissible new variant. Severity is still unclear; hospital capacity is at 78%.',
    category: 'health',
    weight: 5,
    choices: [
      {
        label: 'Pre-position vaccines + masks in clinics',
        cost: 8,
        effects: { health: 2, approval: 1, treasury: -3 },
        outcome:
          'When the wave hits, response is brisk. Hospitalizations stay within capacity.',
      },
      {
        label: 'Wait for federal CDC guidance',
        effects: { health: -1, approval: -1 },
        outcome:
          'Guidance arrives late. Local response is reactive; some preventable deaths.',
      },
      {
        label: 'Public reassurance — avoid panic',
        effects: { health: -2, happiness: 1, approval: -2 },
        outcome:
          'Reassurance unsupported by action. When variant proves serious, credibility takes a hit.',
      },
    ],
  },
  {
    id: 'healthcare_burnout',
    title: 'Nurses Threaten Mass Resignation',
    description:
      'A 30% vacancy rate in public hospitals has pushed nurses to threaten coordinated resignations unless staffing and pay improve.',
    category: 'health',
    weight: 5,
    choices: [
      {
        label: 'Mandate safe nurse-patient ratios + 8% raise',
        cost: 22,
        effects: { health: 2, approval: 1, treasury: -8, debt: 6, happiness: 1 },
        outcome:
          'Vacancies fall within a year. Hospital finances strained; care quality measurably improves.',
      },
      {
        label: 'Recruitment bonuses + travel-nurse stopgap',
        cost: 12,
        effects: { health: 0.5, approval: 0, treasury: -4 },
        outcome:
          'Vacancies persist; travel-nurse costs strain budgets long-term.',
      },
      {
        label: 'Reject demands — fiscal limits',
        effects: { health: -2, approval: -3, happiness: -2 },
        outcome:
          'Mass resignations materialize in two waves. ER wait times spike; private hospitals poach what remains.',
      },
    ],
  },
  {
    id: 'vaccine_hesitancy',
    title: 'Routine Vaccination Rates Drop',
    description:
      'Child MMR coverage has fallen below 87%. A measles outbreak hits a private school.',
    category: 'health',
    weight: 4,
    choices: [
      {
        label: 'School entry vaccine requirement, no exemptions',
        effects: { health: 2, approval: -2, happiness: -1, inequality: -0.2 },
        outcome:
          'Coverage rises back above herd threshold. Exemption advocates organize for next election.',
      },
      {
        label: 'Outreach campaign with trusted local doctors',
        cost: 3,
        effects: { health: 1, approval: 0, education: 0.3 },
        outcome:
          'Slower but durable. Distrust addressed at the relationship level.',
      },
      {
        label: 'Wait for state mandate',
        effects: { health: -2, approval: -2 },
        outcome:
          'Outbreak expands across three school districts before state acts.',
      },
    ],
  },
  {
    id: 'cancer_cluster',
    title: 'Cancer Cluster Suspected Near Refinery',
    description:
      'A community group has documented elevated cancer rates around the refinery. The company disputes the findings.',
    category: 'health',
    weight: 4,
    choices: [
      {
        label: 'Commission independent epidemiology study',
        cost: 5,
        effects: { health: 0.5, approval: 1, gdpPerCapita: 0 },
        outcome:
          'Study takes 18 months. Findings, if significant, will force a regulatory fight.',
      },
      {
        label: 'Demand emission controls immediately',
        cost: 12,
        effects: { health: 1.5, pollution: -1.5, approval: 2, gdpPerCapita: -50 },
        outcome:
          'Refinery installs controls. Sector lobby pushes back; some operations may relocate.',
      },
      {
        label: 'Trust company self-assessment',
        effects: { health: -2, approval: -4, pollution: 0.5 },
        outcome:
          'Class action begins assembling. Discovery process will be ugly.',
      },
    ],
  },
  {
    id: 'pharmacy_desert',
    title: 'Two Pharmacies Close in Poor District',
    description:
      'Chain pharmacies have closed two locations citing theft losses. Residents now travel an hour for prescriptions.',
    category: 'health',
    weight: 5,
    choices: [
      {
        label: 'Subsidize community pharmacy startup',
        cost: 6,
        effects: { health: 1.5, inequality: -0.6, unemployment: -0.2, approval: 2 },
        outcome:
          'Independent pharmacy opens within a year. Refill adherence improves visibly.',
      },
      {
        label: 'Mobile pharmacy van program',
        cost: 3,
        effects: { health: 0.8, inequality: -0.3, approval: 1 },
        outcome:
          'Twice-weekly service covers basics. Acute needs still require travel.',
      },
      {
        label: 'Let market reorganize',
        effects: { health: -1, inequality: 0.5, approval: -1 },
        outcome:
          'Adherence drops in the district. Chronic disease outcomes worsen over years.',
      },
    ],
  },
  {
    id: 'aging_population',
    title: 'Senior Population Hits 22%',
    description:
      'Demographers report your over-65 population now equals 22% — care infrastructure was built for 14%.',
    category: 'health',
    weight: 4,
    choices: [
      {
        label: 'Major aging-in-place investment program',
        cost: 25,
        effects: { health: 2, happiness: 2, debt: 12, approval: 2, inequality: -0.5 },
        outcome:
          'Home modifications, in-home care, transit access funded. Long-term care costs avoided; happier seniors.',
      },
      {
        label: 'Public-private senior housing partnerships',
        cost: 8,
        effects: { health: 1, gdpPerCapita: 40, inequality: 0.3 },
        outcome:
          'New facilities open within three years. Affordability questions emerge as private partners price up.',
      },
      {
        label: 'Defer — state handles seniors',
        effects: { health: -1.5, happiness: -1, approval: -2 },
        outcome:
          'Service gaps widen. Family caregivers — disproportionately women — bear the burden.',
      },
    ],
    countryBias: { nordfjord: 1.4, eastoria: 1.3, sahel: 0.6 },
  },
  {
    id: 'maternity_ward_closure',
    title: 'Hospital Plans to Close Maternity Ward',
    description:
      'The only maternity ward in two districts is set to close due to "low volume." Birthing residents would travel 45+ minutes.',
    category: 'health',
    weight: 5,
    choices: [
      {
        label: 'Subsidize ward to keep it open',
        cost: 9,
        effects: { health: 1.5, approval: 2, inequality: -0.5, treasury: -3 },
        outcome:
          'Ward stays. Other low-volume services demand similar treatment.',
      },
      {
        label: 'Fund birthing center alternative with hospital partnership',
        cost: 5,
        effects: { health: 1, innovation: 0.5, inequality: -0.3 },
        outcome:
          'Center opens; low-risk births handled locally, high-risk transfers maintained.',
      },
      {
        label: 'Accept closure, fund medical transport',
        cost: 2,
        effects: { health: -1, approval: -3, inequality: 0.4 },
        outcome:
          'Birth-on-the-way stories make local news. Pregnant residents cite the closure as a factor in moving.',
      },
    ],
  },
]
