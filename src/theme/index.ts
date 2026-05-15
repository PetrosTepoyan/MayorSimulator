// Centralized theme — colors, spacing, typography.
// Inspired by clean civic dashboards (NYT/Bloomberg style) with retro accents.

export const colors = {
  // Backgrounds — deep navy gradient feel
  bg: '#0a0e1a',
  bgElev: '#121826',
  bgPanel: '#1c2333',
  bgPanelAlt: '#222b40',
  border: '#2a3346',
  borderStrong: '#3a4660',

  // Text
  text: '#f6f1e0',
  textDim: '#a8a89a',
  textMuted: '#6f7585',

  // Brand / civic
  govBlue: '#1d4f91',
  govNavy: '#0b2545',
  govRed: '#a3262d',
  govGold: '#c39432',
  govGreen: '#356b3b',

  // Semantic
  good: '#2e8b57',
  warn: '#d97706',
  bad: '#b91c1c',

  // Paper accents for retro card surfaces
  paper: '#f6f1e0',
  paperDark: '#d8c89c',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
} as const

export const fonts = {
  // These keys must match keys we register with expo-font loader in App.tsx
  pixel: 'PressStart2P_400Regular',
  mono: 'VT323_400Regular',
  body: 'Inter_400Regular',
  bodyBold: 'Inter_700Bold',
} as const

export const sizes = {
  pixelXs: 8,
  pixelSm: 10,
  pixelMd: 12,
  pixelLg: 14,
  monoSm: 14,
  monoMd: 18,
  monoLg: 24,
  monoXl: 32,
  body: 14,
  bodyLg: 16,
  title: 22,
} as const

export type Tone = 'good' | 'bad' | 'neutral'

export const toneColor = (tone: Tone): string =>
  tone === 'good' ? colors.good : tone === 'bad' ? colors.bad : colors.textDim
