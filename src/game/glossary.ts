// ============================================================================
// MayorSim — Glossary
// A reference of economic, political, civic, and environmental terms used
// throughout the game. Each entry is written for a high-school civics
// audience: accurate, neutral in political tone, and tied back to how the
// concept appears in MayorSim's mechanics.
// ============================================================================

export interface GlossaryEntry {
  id: string
  term: string
  category: 'economics' | 'politics' | 'civics' | 'governance' | 'environment' | 'social'
  shortDef: string         // one-liner under 25 words
  longDef: string          // 3-6 sentence explanation
  realWorldExample: string // a 1-2 sentence example
  inGameRelevance: string  // how it shows up in MayorSim
}

export const GLOSSARY: GlossaryEntry[] = [
  // ==========================================================================
  // ECONOMICS
  // ==========================================================================
  {
    id: 'inflation',
    term: 'Inflation',
    category: 'economics',
    shortDef: 'The general rate at which prices rise, lowering the buying power of each dollar.',
    longDef:
      'Inflation measures how much more expensive a typical basket of goods has become over time. It usually comes from too much money chasing too few goods, supply shocks that lift production costs, or wages rising faster than productivity. Mild inflation around 2% is considered healthy; very high or very low inflation both cause problems. Central banks fight high inflation by raising interest rates, which slows borrowing and spending.',
    realWorldExample:
      'In 2022, many countries saw inflation jump above 8% after pandemic stimulus collided with energy and supply chain shocks.',
    inGameRelevance:
      'Tracked as the inflation stat (-5 to 25%). Big deficits, ultra-low taxes, or supply-shock events push it up; tight budgets and rate-style policies pull it down. High inflation tanks approval and erodes treasury value.',
  },
  {
    id: 'deflation',
    term: 'Deflation',
    category: 'economics',
    shortDef: 'A sustained fall in prices across the economy — the opposite of inflation.',
    longDef:
      'Deflation sounds nice — cheaper goods! — but is usually a sign of trouble. When people expect prices to keep falling, they delay purchases, businesses cut investment and wages, and debt becomes harder to repay because dollars are worth more. This can trigger a downward spiral of layoffs and bankruptcies. Most economists treat deflation as a more dangerous problem than mild inflation.',
    realWorldExample:
      'Japan struggled with on-and-off deflation for roughly two decades after its 1990s asset-bubble collapse, dragging on growth.',
    inGameRelevance:
      'Inflation can go negative in MayorSim, simulating deflation. Sustained negative inflation drags GDP per capita, raises unemployment, and makes existing debt heavier in real terms.',
  },
  {
    id: 'gdp',
    term: 'Gross Domestic Product (GDP)',
    category: 'economics',
    shortDef: 'The total dollar value of all goods and services produced in an economy over a period.',
    longDef:
      'GDP is the headline number for the size of an economy. It can be measured by adding up everything produced, everything earned, or everything spent — all three approaches should land in the same place. Real GDP strips out inflation so you can compare years fairly. Growth in GDP usually means more jobs, more tax revenue, and more political room to govern.',
    realWorldExample:
      'The United States GDP is roughly $27 trillion, while a mid-sized city like Austin produces somewhere on the order of $200 billion in goods and services per year.',
    inGameRelevance:
      'MayorSim does not show raw GDP, but it is implicit in GDP per capita times population. Sector growth, employment, and infrastructure all feed it.',
  },
  {
    id: 'gdpPerCapita',
    term: 'GDP per capita',
    category: 'economics',
    shortDef: 'A country or city\'s total output divided by its population — average economic output per person.',
    longDef:
      'GDP per capita is a quick proxy for how rich the average resident is. It is not the same as income or wealth, but it correlates strongly with both. A city can grow its GDP while GDP per capita stagnates if population grows just as fast. Improving education, infrastructure, and innovation is how you lift this number durably.',
    realWorldExample:
      'San Francisco has a GDP per capita above $130,000, while many mid-sized American cities sit closer to $55,000.',
    inGameRelevance:
      'A core stat. Driven by sector productivity, education, innovation, and capital investment. Higher GDP/capita widens your tax base and improves credit rating.',
  },
  {
    id: 'unemploymentRate',
    term: 'Unemployment rate',
    category: 'economics',
    shortDef: 'The percentage of people who want a job and are actively looking but cannot find one.',
    longDef:
      'Only people who are working-age, available, and actively searching count as unemployed; retirees and discouraged workers who have stopped looking are excluded. A healthy economy still has some unemployment — around 3-5% — as people switch jobs. Above that, you typically see weak demand, mismatched skills, or recession. Long-term unemployment is especially damaging because skills atrophy.',
    realWorldExample:
      'During the 2008-2009 financial crisis, U.S. unemployment doubled from about 5% to 10% in roughly a year.',
    inGameRelevance:
      'Tracked as the unemployment stat (0-100%). Rises with sector downturns, automation events, and weak education-jobs matching. High unemployment depresses happiness and raises crime.',
  },
  {
    id: 'lafferCurve',
    term: 'Laffer Curve',
    category: 'economics',
    shortDef: 'The idea that beyond some point, raising tax rates actually collects less revenue, not more.',
    longDef:
      'At a 0% tax rate the government gets nothing; at a 100% rate, people stop working or hide income and the government also gets nothing. Somewhere in between is a maximum-revenue tax rate. The Laffer Curve is a real concept, but economists disagree sharply about where the peak sits — some put it well above 50%, others lower. Politicians on the right often invoke it to argue for tax cuts; critics note the curve says nothing about which side of the peak we are on.',
    realWorldExample:
      'Supply-side advocates cited the Laffer Curve to justify the U.S. Reagan-era tax cuts of the 1980s, though the actual revenue impact remains debated.',
    inGameRelevance:
      'MayorSim models diminishing tax returns: pushing income tax above ~35-40% or corporate tax above ~30% triggers capital flight, lower compliance, and slower growth — sometimes shrinking total revenue.',
  },
  {
    id: 'progressiveVsRegressive',
    term: 'Progressive vs Regressive Tax',
    category: 'economics',
    shortDef: 'Progressive taxes take a bigger share from the rich; regressive taxes take a bigger share from the poor.',
    longDef:
      'A progressive tax like a tiered income tax charges a higher percentage as income rises. A regressive tax like a flat sales tax takes the same rate from everyone, but that rate is a much larger slice of a poor family\'s budget than a wealthy family\'s. Property taxes can fall either way depending on who owns property. Most tax systems mix both. Progressives generally favor more progressive structures to reduce inequality; conservatives often argue flatter taxes encourage investment and simplicity.',
    realWorldExample:
      'The U.S. federal income tax is progressive, with rates from 10% to 37%, while most state sales taxes are flat and regressive in effect.',
    inGameRelevance:
      'Your income tax acts roughly progressive in MayorSim, while sales tax is regressive. Raising sales tax hits low-income districts harder, increasing inequality and unrest there.',
  },
  {
    id: 'sovereignDebt',
    term: 'Sovereign Debt / Municipal Debt',
    category: 'economics',
    shortDef: 'Money a government — national or city — borrows by issuing bonds, to be repaid with interest.',
    longDef:
      'Governments borrow when revenue does not cover spending or when they want to fund a big project today and pay it off over decades. Sovereign debt is national; municipal debt is what cities and states issue. Investors lend by buying bonds, betting the government will repay. If markets lose faith, interest rates spike or borrowing dries up entirely. Cities have actually defaulted: Detroit declared bankruptcy in 2013.',
    realWorldExample:
      'Greece\'s 2010-2012 debt crisis showed how quickly a government can lose access to bond markets when investors panic.',
    inGameRelevance:
      'Tracked as the debt stat ($M). Debt enables infrastructure spending today but costs you credit rating and interest payments over time. Excessive debt can trigger a fiscal-crisis game over.',
  },
  {
    id: 'creditRating',
    term: 'Credit Rating',
    category: 'economics',
    shortDef: 'A score from agencies like Moody\'s or S&P estimating how likely a borrower is to repay debt.',
    longDef:
      'Ratings run from AAA (essentially risk-free) down through junk territory like CCC. A higher rating means lower interest rates because lenders feel safe. Agencies weigh debt levels, growth, political stability, and tax base. Downgrades can spiral: higher interest costs strain budgets, which leads to more downgrades. Cities, states, and countries are all rated.',
    realWorldExample:
      'Standard & Poor\'s downgraded the U.S. from AAA to AA+ in 2011 amid debt-ceiling brinkmanship, briefly rattling global markets.',
    inGameRelevance:
      'Tracked as the creditRating stat (0-100). Determined by debt-to-GDP, political stability, and stat trends. Higher rating means cheaper future borrowing; downgrades make every existing bond more expensive.',
  },
  {
    id: 'giniCoefficient',
    term: 'Gini Coefficient (Inequality)',
    category: 'economics',
    shortDef: 'A 0-1 measure of income inequality, where 0 is perfect equality and 1 is one person owning everything.',
    longDef:
      'The Gini coefficient summarizes how evenly income or wealth is spread. A Gini of 0.25 (typical Scandinavia) means a fairly equal society; 0.60+ (some Latin American countries historically) means extreme concentration. High inequality is associated with lower social trust, higher crime, and weaker long-run growth — though there is real debate about how much inequality is too much. Welfare programs, progressive taxes, and broad education tend to lower it.',
    realWorldExample:
      'The United States has a Gini of around 0.41 after taxes and transfers; Sweden\'s is closer to 0.28.',
    inGameRelevance:
      'Tracked as the inequality stat (0-100, scaled like Gini × 100). Rises with low minimum wage, regressive taxes, and education cuts. High inequality raises crime, lowers happiness, and feeds populist factions.',
  },
  {
    id: 'supplyShock',
    term: 'Supply Shock',
    category: 'economics',
    shortDef: 'A sudden event that disrupts the production or delivery of important goods, usually raising prices.',
    longDef:
      'Supply shocks come from wars, natural disasters, pandemics, or sudden policy changes that cut off inputs like oil, food, or microchips. Because supply falls but demand does not adjust as fast, prices spike. Negative supply shocks are particularly tough on policymakers because the usual cure for inflation — slowing demand — also hurts growth, leading to stagflation. Positive supply shocks (like new oil discoveries) work in reverse, lowering prices.',
    realWorldExample:
      'The 1973 OPEC oil embargo quadrupled crude prices and pushed Western economies into a years-long stagflation.',
    inGameRelevance:
      'Triggered by macro and event cards — energy shocks, trade wars, drought events. They temporarily spike inflation, reduce sector growth, and force you to choose between subsidizing residents or holding the budget line.',
  },
  {
    id: 'monetaryVsFiscal',
    term: 'Monetary vs Fiscal Policy',
    category: 'economics',
    shortDef: 'Fiscal policy is government taxing and spending; monetary policy is central-bank control of money and interest rates.',
    longDef:
      'Fiscal policy is run by elected legislatures: how much to tax, how much to spend, and on what. Monetary policy is run by a central bank (like the Federal Reserve), which sets short-term interest rates and manages the money supply. They can pull in the same direction — both stimulating during a recession — or different directions, with the central bank tightening while the government spends. The two tools work on different timelines and have different political accountability.',
    realWorldExample:
      'During COVID-19, the U.S. Treasury (fiscal) sent stimulus checks while the Federal Reserve (monetary) cut rates to zero — a massive coordinated easing.',
    inGameRelevance:
      'As mayor you control fiscal policy directly via taxes, budget, and bonds. Monetary policy is set by macro events — the simulated central bank may raise rates and tighten your borrowing costs when national inflation runs hot.',
  },
  {
    id: 'stagflation',
    term: 'Stagflation',
    category: 'economics',
    shortDef: 'The painful combination of stagnant growth, high unemployment, and high inflation at the same time.',
    longDef:
      'For decades, economists assumed inflation and unemployment moved in opposite directions: when one was high, the other was low. Stagflation broke that idea. It typically comes from a supply shock that raises costs while also shrinking output — leaving policymakers stuck. Standard tools make one problem worse while easing the other. Breaking stagflation often requires painful, drawn-out policy moves.',
    realWorldExample:
      'The 1970s in the U.S. and U.K. featured double-digit inflation alongside high unemployment after the oil crises — the textbook case of stagflation.',
    inGameRelevance:
      'Possible mid-game state when energy shocks or trade crises hit hard. You will see inflation above 8% and unemployment above 10% simultaneously, with no easy lever to fix both at once.',
  },
  {
    id: 'quantitativeEasing',
    term: 'Quantitative Easing',
    category: 'economics',
    shortDef: 'When a central bank creates new money to buy bonds, pushing interest rates down and spending up.',
    longDef:
      'When normal interest-rate cuts hit zero and the economy still needs help, central banks can buy long-dated government and corporate bonds. This injects money into the financial system, lowers long-term borrowing costs, and is meant to encourage investment and lending. Critics argue it inflates asset prices, widening inequality between asset owners and others. It is widely used since 2008 but its long-term effects are still debated.',
    realWorldExample:
      'The Federal Reserve\'s balance sheet grew from under $1 trillion to nearly $9 trillion through rounds of QE after 2008 and during COVID-19.',
    inGameRelevance:
      'Appears as a macro/national event. When triggered, your credit costs fall and asset-heavy districts get richer, but inflation pressure builds and inequality climbs.',
  },
  {
    id: 'capitalFlight',
    term: 'Capital Flight',
    category: 'economics',
    shortDef: 'When investors and businesses pull money out of a city or country, usually because they fear losses.',
    longDef:
      'Capital flight is what happens when wealthy individuals, corporations, or foreign investors lose confidence. They sell off real estate, withdraw bank deposits, and shift assets abroad. This drains the tax base, weakens the currency, and can force emergency rate hikes. Common triggers include sudden tax increases, political instability, weak rule of law, or expectations of devaluation. Once it starts, it can be hard to reverse.',
    realWorldExample:
      'Argentina has experienced repeated waves of capital flight, with citizens converting pesos to dollars and moving money offshore during currency crises.',
    inGameRelevance:
      'Triggered when corporate tax climbs too high, instability spikes, or specific events fire. Effects include shrinking finance and tech sectors, lower GDP per capita, and a credit-rating hit.',
  },

  // ==========================================================================
  // POLITICS / GOVERNANCE
  // ==========================================================================
  {
    id: 'approvalRating',
    term: 'Approval Rating',
    category: 'politics',
    shortDef: 'The percentage of constituents who say they approve of an elected official\'s job performance.',
    longDef:
      'Approval is a snapshot of public opinion, usually from telephone or online polls. It rises and falls with events — a successful crisis response can boost it overnight, a scandal can crush it. Approval is not the same as vote share at election time, but it strongly predicts re-election odds. Most leaders see approval drift downward over time as decisions accumulate disappointed groups.',
    realWorldExample:
      'U.S. President George W. Bush hit 90% approval after September 11, 2001, then declined to 25% by the end of his second term.',
    inGameRelevance:
      'Tracked as the approval stat (0-100%). Drops below 20% and you risk recall; sustained high approval is required for re-election and unlocks higher offices.',
  },
  {
    id: 'termLimit',
    term: 'Term Limit',
    category: 'politics',
    shortDef: 'A legal cap on how many times the same person can hold a particular elected office.',
    longDef:
      'Term limits exist to prevent any single official from entrenching power. The U.S. president is capped at two four-year terms; many governors and mayors face similar limits, though some legislatures do not. Supporters argue limits keep politics fresh and reduce corruption; critics say they cost institutions experienced leaders and shift power to unelected staff. Limits vary widely worldwide — some countries have none, others enforce single-term rules strictly.',
    realWorldExample:
      'New York City had a two-term mayor limit until 2008, when Michael Bloomberg pushed through a one-time extension to seek a third term.',
    inGameRelevance:
      'Each country preset defines termLengthYears and an effective limit. Reaching the limit triggers a forced re-election or career endpoint event, regardless of approval.',
  },
  {
    id: 'recallElection',
    term: 'Recall Election',
    category: 'politics',
    shortDef: 'A special vote that lets citizens remove an elected official from office before their term ends.',
    longDef:
      'Recall procedures usually require collecting a large number of voter signatures within a window, then holding a yes/no vote on removing the official. They are common at the state and local level in the U.S. but rare nationally. Recalls are designed as a check on serious misconduct or unpopular policy, but critics argue they can be weaponized against any decision a vocal minority dislikes. Many recalls fail; the threat alone often shifts political behavior.',
    realWorldExample:
      'California Governor Gray Davis was recalled and replaced by Arnold Schwarzenegger in 2003, the second successful gubernatorial recall in U.S. history.',
    inGameRelevance:
      'If approval falls below ~20% for too many turns, a recall election event fires. Lose the vote and the game ends with a "recalled" outcome.',
  },
  {
    id: 'coalitionGovernment',
    term: 'Coalition Government',
    category: 'politics',
    shortDef: 'A government formed when multiple political parties agree to share power, usually because none won a majority.',
    longDef:
      'In parliamentary systems where many parties compete, no single party often wins outright. Parties negotiate coalition agreements covering cabinet posts and policy priorities. Coalitions can be stable for years or collapse within months if junior partners feel ignored. Critics say coalitions slow decision-making; supporters argue they force compromise and prevent extreme policy swings.',
    realWorldExample:
      'Germany is almost always run by a coalition; recent governments have included combinations like the Social Democrats, Greens, and Free Democrats together.',
    inGameRelevance:
      'Modeled through council factions in MayorSim. To pass big spending or policy shifts, you typically need favor with multiple factions. Lose too many at once and bills fail, regardless of how popular you are with voters.',
  },
  {
    id: 'lobbying',
    term: 'Lobbying',
    category: 'politics',
    shortDef: 'Organized efforts by industries, unions, or causes to influence government policy decisions.',
    longDef:
      'Lobbyists meet with officials, fund research, propose draft legislation, and sometimes contribute to campaigns. Most democracies treat lobbying as a legitimate part of representation — citizens have a right to petition government — but require registration and disclosure. Critics argue that well-funded interests have far more access than ordinary voters, distorting policy. The line between lobbying and corruption depends heavily on transparency rules.',
    realWorldExample:
      'In Washington, the pharmaceutical and finance industries each spend hundreds of millions of dollars per year on registered lobbying.',
    inGameRelevance:
      'Lobby-type factions (developer lobbies, energy lobbies, tech lobbies) push for favorable policy. Their favor affects which event choices unlock and how harshly they react to taxes or regulations.',
  },
  {
    id: 'whistleblowerProtection',
    term: 'Whistleblower Protection',
    category: 'governance',
    shortDef: 'Laws that shield employees from retaliation when they report wrongdoing inside a government or company.',
    longDef:
      'Whistleblowers often see misconduct from the inside that no audit could catch. But reporting it can cost them their job or worse. Strong whistleblower laws guarantee confidentiality, ban retaliation, and sometimes share recovered funds with the reporter. The trade-off is that weak rules let abuse fester; very loose rules might encourage frivolous claims. Most modern democracies have at least baseline protections.',
    realWorldExample:
      'The U.S. False Claims Act lets whistleblowers sue contractors who defraud the government and keep a share of recovered money.',
    inGameRelevance:
      'Appears in anti-corruption event chains. Choosing to enact strong protections boosts approval among reformist factions and lowers long-term corruption-style penalties — but business lobbies push back.',
  },
  {
    id: 'publicPrivatePartnership',
    term: 'Public-Private Partnership',
    category: 'governance',
    shortDef: 'A contract where a government partners with a private company to build or operate public infrastructure.',
    longDef:
      'In a typical PPP, the private partner finances, builds, and sometimes operates a project — a toll road, hospital, or transit line — for a contracted period, then turns it over. Governments use PPPs to shift upfront cost and construction risk off their books. Critics warn that long contracts can lock in high user fees or hidden subsidies and reduce public oversight. Quality depends heavily on contract design.',
    realWorldExample:
      'Many toll bridges and airport expansions worldwide are built through PPPs — the Sydney Harbour Tunnel and London\'s King\'s Cross station revamp are well-known examples.',
    inGameRelevance:
      'Some buildings and event choices let you fund with private partners — you pay less upfront but receive lower per-turn revenue and less stat benefit, plus a favor bump with business factions.',
  },
  {
    id: 'eminentDomain',
    term: 'Eminent Domain',
    category: 'governance',
    shortDef: 'A government\'s legal power to take private property for public use, with compensation.',
    longDef:
      'Most constitutions allow governments to acquire land they need for roads, schools, utilities, or pipelines — even if owners refuse to sell — provided owners are paid fair market value. Courts argue about what counts as "public use"; in the U.S. the famous Kelo v. New London case extended it to private redevelopment, sparking widespread backlash. Even where legal, eminent domain is politically explosive because it strikes at property rights.',
    realWorldExample:
      'Major U.S. interstate highways were built in the 1950s-60s in part by exercising eminent domain through urban neighborhoods, often poor and minority ones.',
    inGameRelevance:
      'Some district-redevelopment and infrastructure events offer eminent-domain options. They are fast and cheap but spike unrest, especially in conservative or low-trust districts, and may cost factional favor.',
  },
  {
    id: 'bondIssuance',
    term: 'Bond Issuance',
    category: 'governance',
    shortDef: 'When a government raises money by selling bonds — IOUs that promise to pay buyers back with interest.',
    longDef:
      'A bond is a contract: the city borrows from investors today and repays the principal plus periodic interest over a fixed term. General-obligation bonds are backed by the full taxing power of the city; revenue bonds repay only from a specific project, like a toll road. Bond markets price the city\'s risk through yield — riskier cities pay higher rates. Issuing bonds is the standard way to fund big infrastructure without raising taxes immediately.',
    realWorldExample:
      'New York City typically issues several billion dollars in municipal bonds each year to fund schools, transit, and utilities.',
    inGameRelevance:
      'The "issue bond" action lets you raise treasury cash now in exchange for higher debt and a small credit-rating hit. Your interest cost depends on current creditRating.',
  },
  {
    id: 'zoning',
    term: 'Zoning',
    category: 'governance',
    shortDef: 'Local rules that dictate what can be built where — housing, factories, shops, or parks.',
    longDef:
      'Zoning codes divide a city into districts and set rules: residential zones might ban factories, commercial zones limit housing, single-family zones bar apartments. Supporters say zoning protects neighborhoods and orderly growth. Critics argue strict zoning — especially single-family-only rules — drives up housing costs, blocks density, and locks in segregation patterns from the past. Reforming zoning is one of the most contested local-policy fights of the 2020s.',
    realWorldExample:
      'Minneapolis abolished single-family-only zoning citywide in 2020, allowing duplexes and triplexes by right — a model other cities have begun to copy.',
    inGameRelevance:
      'District-level housing policy in MayorSim. Loosening zoning raises housing supply (lowering rents and inequality) but may upset homeowner factions and slightly raise pollution; tightening does the reverse.',
  },

  // ==========================================================================
  // CIVICS / SOCIAL
  // ==========================================================================
  {
    id: 'socialMobility',
    term: 'Social Mobility',
    category: 'social',
    shortDef: 'The ability of individuals or families to move up (or down) the income ladder over a lifetime or generations.',
    longDef:
      'In a high-mobility society, a child born poor has a fair chance of becoming middle-class or rich based on talent and effort. In a low-mobility society, parents\' income strongly predicts children\'s. Education quality, healthcare, and access to housing in opportunity-rich areas are the biggest drivers. Mobility is widely valued across the political spectrum, though people disagree on how to improve it.',
    realWorldExample:
      'Denmark and Canada consistently rank among the most upwardly mobile countries; the U.S. ranks lower than its public mythology suggests.',
    inGameRelevance:
      'Influenced by education spending, welfare, and inequality. Higher mobility raises long-term innovation and approval. Brain-drain and low-education districts signal mobility breakdown.',
  },
  {
    id: 'publicGood',
    term: 'Public Good',
    category: 'civics',
    shortDef: 'A good or service that everyone can use without using it up, like clean air, streetlights, or national defense.',
    longDef:
      'Economists define a public good as non-rivalrous (your use doesn\'t reduce mine) and non-excludable (you can\'t easily charge for it). Private markets tend to under-supply public goods because no one company can capture the revenue. That is why governments traditionally fund them through taxes. Knowing what is and isn\'t a public good is essential to debating the role of government.',
    realWorldExample:
      'Streetlights are a classic public good — once installed, every passerby benefits, and no shopkeeper can rationally pay for them alone.',
    inGameRelevance:
      'Parks, public safety, basic education, and clean-air programs are modeled as public goods: cheap per-resident but only the city can fund them. They show up as infrastructure and welfare budget categories.',
  },
  {
    id: 'externalities',
    term: 'Externalities',
    category: 'economics',
    shortDef: 'Costs or benefits of an activity that fall on third parties who didn\'t choose to be involved.',
    longDef:
      'Pollution from a factory is a negative externality — neighbors pay the cost in health, but the factory does not. A new university produces positive externalities: the surrounding region benefits from skilled workers and ideas, even people who never attended. Standard markets ignore externalities, leading to too much pollution and too little innovation. Taxes, subsidies, and regulation are the usual policy fixes.',
    realWorldExample:
      'Carbon emissions warming the planet are arguably the largest negative externality in history — the cost falls on future generations and people far from the polluter.',
    inGameRelevance:
      'Industrial parks, polluting power plants, and lax emissions standards lower district health and city pollution without showing up directly on the factory\'s books. Carbon pricing internalizes the externality.',
  },
  {
    id: 'brainDrain',
    term: 'Brain Drain',
    category: 'social',
    shortDef: 'When a city or country loses educated, skilled workers who move elsewhere for better opportunities.',
    longDef:
      'Skilled workers — doctors, engineers, researchers — move toward places with higher wages, lower taxes, better quality of life, or stronger institutions. The places they leave suffer: hospitals lose staff, startups can\'t hire, tax revenue falls. The receiving cities gain. Brain drain is especially painful for places that invested public money in educating people who then leave. Reversing it requires fixing the underlying push factors.',
    realWorldExample:
      'Eastern European countries lost millions of skilled workers to Western Europe after joining the EU, draining health systems and prompting return-migration campaigns.',
    inGameRelevance:
      'Triggered by high taxes, low approval, high crime, or low GDP per capita. Education stat falls, innovation drops, and finance/tech sectors shrink. Hard to reverse quickly.',
  },
  {
    id: 'nimbyism',
    term: 'NIMBY-ism',
    category: 'social',
    shortDef: '"Not In My Back Yard" — when residents support a policy generally but oppose its specific impact on their neighborhood.',
    longDef:
      'Most people want more housing, cleaner energy, and good schools — but often oppose the apartment building, wind farm, or homeless shelter going in next to them. Concerns can be legitimate (traffic, property values, environmental impact) or thinly disguised resistance to change. NIMBY-ism blocks projects with broad public benefits and concentrated local costs. The opposite, YIMBY, has emerged as a counter-movement in housing-strapped cities.',
    realWorldExample:
      'Bay Area cities passed dozens of zoning rules that block apartment buildings even as housing prices skyrocketed — a textbook NIMBY pattern.',
    inGameRelevance:
      'Builds and policy changes can trigger NIMBY events in affected districts, costing approval there. Conservative-leaning, high-income districts are most likely to push back.',
  },
  {
    id: 'gentrification',
    term: 'Gentrification',
    category: 'social',
    shortDef: 'When wealthier residents move into a lower-income neighborhood, raising rents and changing the local character.',
    longDef:
      'Gentrification often begins with artists or young professionals attracted by cheap rent, followed by investment, renovation, and rising property values. Existing residents — especially renters — get priced out. Supporters note that reinvestment can lower crime, raise tax revenue, and improve services; critics highlight displacement and erasure of long-standing communities. Policy responses include rent control, affordable-housing mandates, and tenant protections.',
    realWorldExample:
      'Brooklyn neighborhoods like Williamsburg transformed from working-class areas in the 1990s into some of New York\'s most expensive zip codes within two decades.',
    inGameRelevance:
      'In MayorSim, sustained investment in a low-income district can trigger gentrification events — average income rises, but housing affordability falls and unrest may climb. Rent control softens both effects.',
  },
  {
    id: 'welfareState',
    term: 'Welfare State',
    category: 'civics',
    shortDef: 'A government system that uses taxes to provide a safety net of social services for residents.',
    longDef:
      'A welfare state typically includes unemployment insurance, public pensions, healthcare, family support, and disability benefits. Models vary widely: Nordic countries offer broad, universal programs funded by high taxes; the U.S. is more targeted and means-tested. Welfare states are credited with reducing poverty and stabilizing demand during recessions. Critics worry about cost, work incentives, and dependency. Almost every developed country has some form of welfare state.',
    realWorldExample:
      'Sweden\'s welfare state spends roughly half of GDP through government, providing universal healthcare, education, and generous parental leave funded by high taxes.',
    inGameRelevance:
      'Your welfare budget category and policy stances (universal vs. targeted) shape this. Bigger welfare state cuts inequality and crime, raises happiness, but costs treasury and may push inflation up.',
  },

  // ==========================================================================
  // ENVIRONMENT
  // ==========================================================================
  {
    id: 'carbonPricing',
    term: 'Carbon Pricing',
    category: 'environment',
    shortDef: 'A policy that puts a price on greenhouse-gas emissions to discourage them — usually a carbon tax.',
    longDef:
      'Burning fossil fuels imposes a cost on the climate that markets normally ignore. Carbon pricing tries to fix this by charging emitters per ton of CO2 they release, making clean alternatives more competitive. Most economists across the political spectrum support carbon pricing as the most efficient climate tool. The hard parts are setting the price high enough to matter, dealing with effects on poorer households, and preventing industries from simply moving abroad.',
    realWorldExample:
      'British Columbia has had a revenue-neutral carbon tax since 2008, currently around CAD $80 per ton, with the revenue returned through other tax cuts.',
    inGameRelevance:
      'Available as a policy lever and event option. Lowers pollution and improves health, but raises inflation and costs corporate-sector favor. Pairs well with renewable energy investment.',
  },
  {
    id: 'capAndTrade',
    term: 'Cap-and-Trade',
    category: 'environment',
    shortDef: 'A system where the government caps total pollution, issues permits, and lets companies trade them.',
    longDef:
      'Instead of taxing each ton of emissions, cap-and-trade sets a hard ceiling on total emissions. The government issues a fixed number of permits — by auction or free allocation — and companies trade them. Firms that can cut emissions cheaply sell their extra permits to firms for whom cutting is expensive, finding the lowest-cost path to the cap. The cap can be tightened over time to reduce pollution. The U.S. used cap-and-trade successfully for sulfur dioxide in the 1990s.',
    realWorldExample:
      'The European Union Emissions Trading System is the world\'s largest cap-and-trade program, covering roughly 40% of EU greenhouse-gas emissions.',
    inGameRelevance:
      'Alternative to a flat carbon tax. Slower to bite but more popular with industry; gives a clearer path to pollution targets. Unlocks finance-sector benefits because it creates a tradable market.',
  },
  {
    id: 'renewableEnergyMix',
    term: 'Renewable Energy Mix',
    category: 'environment',
    shortDef: 'The share of a city\'s electricity coming from renewable sources — solar, wind, hydro, geothermal.',
    longDef:
      'Most modern grids combine multiple sources: coal, natural gas, nuclear, hydro, solar, and wind. The renewable share has climbed sharply as solar and wind costs have collapsed. Shifting to renewables cuts emissions and air pollution but requires investment in storage and transmission, since wind and sun are variable. The economics now favor renewables in most regions, even before climate benefits are counted, but transition takes decades.',
    realWorldExample:
      'Iceland produces nearly 100% of its electricity from renewables (mostly geothermal and hydro), while many U.S. states sit at 20-40%.',
    inGameRelevance:
      'Determined by your mix of power-plant building variants. Higher renewable share lowers pollution and improves long-term health, but costs more upfront and may temporarily raise energy prices, feeding inflation.',
  },
]

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Case-insensitive substring lookup over both the human-readable term and
 * the canonical id. Returns the first matching entry, or null.
 */
export function findGlossaryEntry(query: string): GlossaryEntry | null {
  if (!query) return null
  const q = query.toLowerCase().trim()
  if (!q) return null
  for (const entry of GLOSSARY) {
    if (
      entry.term.toLowerCase().includes(q) ||
      entry.id.toLowerCase().includes(q)
    ) {
      return entry
    }
  }
  return null
}

/**
 * Filter the glossary to a specific category.
 */
export function glossaryByCategory(
  category: GlossaryEntry['category'],
): GlossaryEntry[] {
  return GLOSSARY.filter((entry) => entry.category === category)
}
