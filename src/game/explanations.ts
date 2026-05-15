import type { StatKey, StatExplanation } from './types'

// Each stat has a short label (UI), a one-liner, and a longer educational explanation.
export const STAT_INFO: Record<StatKey, StatExplanation> = {
  treasury: {
    label: 'Treasury',
    unit: '$M',
    short: 'Cash on hand the city government can spend immediately.',
    long: 'Treasury is what the city has available to spend right now, after collecting taxes and paying bills. If it goes deeply negative for too long, the city becomes insolvent and you lose office. Big projects draw from it directly, so balance growth with reserves.',
  },
  gdpPerCapita: {
    label: 'GDP/capita',
    unit: '$',
    short: 'Economic output per resident — wealth of the average citizen.',
    long: 'GDP per capita is the total value of goods and services produced in your city divided by population. It grows when residents have jobs, education, and infrastructure to be productive. Higher GDP per capita means a richer tax base and more political room to maneuver.',
  },
  unemployment: {
    label: 'Unemployment',
    unit: '%',
    short: 'Share of working-age residents without a job.',
    long: 'Unemployment falls when businesses invest, the city builds infrastructure, and education levels match available jobs. Sustained high unemployment drags down GDP, depresses happiness, and raises crime. Low unemployment may push wages and inflation up.',
  },
  inflation: {
    label: 'Inflation',
    unit: '%',
    short: 'Rate at which prices are rising for residents.',
    long: 'Inflation rises when there is more money chasing the same goods — caused by big deficit spending, supply shocks, or rapid wage growth without productivity. Low taxes and high government spending can fuel it. Mild inflation (~2%) is healthy; high inflation erodes savings and crushes approval.',
  },
  debt: {
    label: 'Debt',
    unit: '$M',
    short: 'Money the city owes to bondholders.',
    long: 'Debt lets you spend beyond current tax revenue but must be serviced with interest. The cost of new debt depends on your credit rating — a weak rating makes borrowing punishing. Sustained high debt-to-GDP ratios cause investor panic.',
  },
  creditRating: {
    label: 'Credit',
    unit: '/100',
    short: 'How safe lenders consider the city to be.',
    long: 'Higher credit means lower interest rates on borrowing. Rating agencies look at debt levels, growth, political stability, and reserves. A downgrade raises the cost of every existing bond and can spiral into a debt crisis.',
  },
  population: {
    label: 'Population',
    unit: '',
    short: 'Number of residents in the city.',
    long: 'Population grows from births and migration in (good schools, jobs, housing) and shrinks from emigration (high crime, pollution, taxes, low approval). More people means more tax revenue but also more service demand.',
  },
  education: {
    label: 'Education',
    unit: '/100',
    short: 'Average educational attainment of residents.',
    long: 'Education compounds: skilled workers drive innovation, attract investment, and raise GDP per capita. Underfunded schools take years to repair. Universities have outsized effects but cost more.',
  },
  health: {
    label: 'Health',
    unit: '/100',
    short: 'General health of the population.',
    long: 'Healthier populations live longer, work more, and need fewer emergency services. Hospitals, clean air (low pollution), and welfare support raise it. Pandemics and pollution lower it sharply.',
  },
  happiness: {
    label: 'Happiness',
    unit: '/100',
    short: 'How content residents feel day-to-day.',
    long: 'Happiness blends health, parks, employment, low crime, low inflation, and quality services. Unlike approval, it tracks lived experience rather than political popularity — though the two are linked.',
  },
  approval: {
    label: 'Approval',
    unit: '%',
    short: 'How much voters back you, the mayor.',
    long: 'Approval drifts toward happiness over time but spikes or drops based on specific decisions (e.g. tax hikes, controversial buildings, handling of events). Fall below 20% and you may be recalled; stay high to get re-elected and unlock promotions.',
  },
  crime: {
    label: 'Crime',
    unit: '/100',
    short: 'Frequency of property and violent crime.',
    long: 'Crime rises with unemployment, inequality, and underfunded education and policing. Pure security spending suppresses it short-term, but addressing root causes is more durable. High crime drives residents and businesses away.',
  },
  pollution: {
    label: 'Pollution',
    unit: '/100',
    short: 'Air and water quality problems.',
    long: 'Industrial activity and dirty power plants raise pollution. Parks, renewable energy, and environmental policy reduce it. Pollution silently kills health and happiness — and once high, costs a lot to clean up.',
  },
  innovation: {
    label: 'Innovation',
    unit: '/100',
    short: 'Pace of new business, patents, and ideas.',
    long: 'Innovation thrives where education, research funding, and universities meet. It accelerates GDP growth and unlocks new event opportunities. Strong innovation is the long game.',
  },
  inequality: {
    label: 'Inequality',
    unit: '/100',
    short: 'Gap between richest and poorest residents.',
    long: 'High inequality (Gini-like) corrodes social trust, raises crime, and depresses overall happiness. Welfare spending, progressive taxes, and education reduce it. Letting it climb shortens your political life.',
  },
}
