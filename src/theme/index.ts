// Theme — MayorSim v2: GameDev-Tycoon-inspired, warm paper background,
// clean cards with soft shadows, cobalt blue + gold accents.

export const colors = {
  // Backgrounds — light warm paper, like an open notebook
  bg: '#f4ecdc',            // base — warm cream paper
  bgElev: '#fbf6e9',        // elevated paper surface
  bgPanel: '#ffffff',       // card surface (clean white)
  bgPanelAlt: '#f8f3e2',    // alt card (cream tint)
  bgInverse: '#1c2b3e',     // for dark contrasting strips (HUD bg etc.)

  // Borders & dividers — warm cream-gray, low contrast
  border: '#e6dec7',
  borderStrong: '#cdbf9b',
  divider: '#efe7d0',

  // Text — readable on cream
  text: '#1c2b3e',          // deep navy ink
  textDim: '#5b6b80',       // cool gray-blue (secondary)
  textMuted: '#8b95a4',     // tertiary, hint text
  textInverse: '#fbf6e9',   // text on dark inverse surfaces

  // Brand / civic accents — bright but mature
  primary: '#2563eb',       // cobalt blue (primary action)
  primaryHover: '#1d4ed8',
  primarySoft: '#dbeafe',
  gold: '#d4a44c',          // GameDev Tycoon money gold
  goldSoft: '#fdf3d8',
  navy: '#1c2b3e',
  red: '#dc2626',
  redSoft: '#fde2e2',
  green: '#16a34a',
  greenSoft: '#d8f0d8',
  amber: '#d97706',
  amberSoft: '#fdebcb',
  teal: '#0891b2',
  tealSoft: '#cde9f0',

  // Semantic tones
  good: '#16a34a',
  warn: '#d97706',
  bad: '#dc2626',
  neutral: '#5b6b80',

  // Industry / leaning chips
  ind_tech: '#06b6d4',
  ind_finance: '#d4a44c',
  ind_industrial: '#64748b',
  ind_services: '#0891b2',
  ind_agriculture: '#65a30d',
  ind_residential: '#a855f7',
  ind_tourism: '#f97316',
  ind_energy: '#dc2626',
  ind_university: '#2563eb',
  ind_mixed: '#5b6b80',

  lean_progressive: '#2563eb',
  lean_centrist: '#5b6b80',
  lean_conservative: '#dc2626',

  // Media bias chips
  bias_left: '#2563eb',
  bias_center: '#5b6b80',
  bias_right: '#dc2626',
  bias_tabloid: '#a855f7',

  // Legacy aliases — old v1 names map to the closest v2 token.
  // Kept so existing screens don't break while the redesign agents rewrite them.
  govBlue: '#2563eb',
  govNavy: '#1c2b3e',
  govRed: '#dc2626',
  govGold: '#d4a44c',
  govGreen: '#16a34a',
  paper: '#fbf6e9',
  paperDark: '#e6dec7',
  bgElev2: '#fbf6e9',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const

export const fonts = {
  pixel: 'PressStart2P_400Regular',  // tiny accent labels only
  mono: 'VT323_400Regular',          // big numbers (date, treasury)
  body: 'Inter_400Regular',
  bodyBold: 'Inter_700Bold',
} as const

export const sizes = {
  pixelXs: 8,
  pixelSm: 9,
  pixelMd: 11,
  pixelLg: 14,  // legacy
  monoSm: 16,
  monoMd: 22,
  monoLg: 32,
  monoXl: 44,
  monoHuge: 64,
  caption: 11,
  bodyXs: 12,
  body: 14,
  bodyLg: 16,
  title: 20,
  titleLg: 28,
  display: 36,
} as const

export const elevation = {
  sm: {
    shadowColor: '#1c2b3e',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#1c2b3e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1c2b3e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
} as const

export type Tone = 'good' | 'bad' | 'neutral' | 'warn'

export const toneColor = (tone: Tone): string => {
  switch (tone) {
    case 'good': return colors.good
    case 'bad': return colors.bad
    case 'warn': return colors.warn
    default: return colors.textDim
  }
}

export const toneSoftBg = (tone: Tone): string => {
  switch (tone) {
    case 'good': return colors.greenSoft
    case 'bad': return colors.redSoft
    case 'warn': return colors.amberSoft
    default: return colors.bgPanelAlt
  }
}

// Season helper — turn % 4 → season label + emoji + tint
export interface SeasonInfo {
  index: number          // 0..3
  name: string           // 'Spring', 'Summer', 'Autumn', 'Winter'
  icon: string           // emoji
  tint: string           // soft bg tint
  text: string           // text color
}

export const SEASONS: SeasonInfo[] = [
  { index: 0, name: 'Winter', icon: '❄️', tint: '#e0effa', text: '#1e40af' },
  { index: 1, name: 'Spring', icon: '🌸', tint: '#fce7f3', text: '#9f1239' },
  { index: 2, name: 'Summer', icon: '☀️', tint: '#fef3c7', text: '#92400e' },
  { index: 3, name: 'Autumn', icon: '🍂', tint: '#fee4cc', text: '#9a3412' },
]

export const seasonForTurn = (turn: number): SeasonInfo => SEASONS[turn % 4]
