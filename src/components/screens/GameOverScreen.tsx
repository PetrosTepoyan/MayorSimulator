import React from 'react'
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
} from 'react-native'
import {
  useGameStore,
  useGameOver,
  useStats,
} from '../../store/gameStore'
import { Panel } from '../ui/Panel'
import { PixelText } from '../ui/PixelText'
import { Button } from '../ui/Button'
import { StatTile } from '../ui/StatTile'
import {
  formatMoney,
  formatPct,
  formatPop,
  quarterToDate,
} from '../../game/util'
import { colors, fonts, sizes, spacing, radius } from '../../theme'
import type {
  CityStats,
  Faction,
  GameOverReason,
  StatKey,
} from '../../game/types'

// ============================================================================
// Static maps — title + outcome blurb per game-over reason
// ============================================================================

const TITLE: Record<GameOverReason, string> = {
  recalled: 'RECALLED',
  bankrupt: 'BANKRUPT',
  termLimitWon: 'TERM COMPLETE — VICTORY',
  termLimitLost: 'TERM COMPLETE',
  civilUnrest: 'CIVIL UNREST',
  pandemicCollapse: 'COLLAPSE',
}

const titleColor = (reason: GameOverReason): string => {
  switch (reason) {
    case 'termLimitWon':
      return colors.govGold
    case 'recalled':
    case 'bankrupt':
    case 'civilUnrest':
    case 'pandemicCollapse':
      return colors.govRed
    case 'termLimitLost':
    default:
      return colors.text
  }
}

const outcomeBlurb = (
  reason: GameOverReason,
  ctx: { mayorName: string; turn: number; termsServed: number; cityName: string },
): string => {
  const { mayorName, turn, termsServed, cityName } = ctx
  const mayor = mayorName || 'The mayor'
  const city = cityName || 'the city'
  switch (reason) {
    case 'recalled':
      return `Voters lost faith. ${mayor} was recalled after ${turn} quarters in office.`
    case 'bankrupt':
      return `${city}'s finances collapsed under accumulated debt and falling tax revenue.`
    case 'termLimitWon':
      return `${mayor} completed ${termsServed} term${termsServed === 1 ? '' : 's'} with strong approval. Promotion to Governor unlocked.`
    case 'termLimitLost':
      return 'Term complete, but approval too low to advance. The next mayor inherits the keys.'
    case 'civilUnrest':
      return `Unrest spread across districts; ${city} became ungovernable.`
    case 'pandemicCollapse':
      return `A public health collapse overwhelmed ${city}. Hospitals, services, and trust failed in sequence.`
    default:
      return 'The game has ended.'
  }
}

// ============================================================================
// Highlight derivation — extract beloved faction + best/worst stat
// ============================================================================

interface Highlight {
  label: string
  value: string
}

// Stats we treat as "higher is better"
const POSITIVE_PCT_STATS: ReadonlyArray<StatKey> = [
  'education',
  'health',
  'happiness',
  'innovation',
]

// Stats we treat as "lower is better"
const NEGATIVE_PCT_STATS: ReadonlyArray<StatKey> = [
  'crime',
  'pollution',
  'inequality',
  'unemployment',
]

const STAT_NICE_NAME: Partial<Record<StatKey, string>> = {
  education: 'Education',
  health: 'Health',
  happiness: 'Happiness',
  innovation: 'Innovation',
  crime: 'Crime',
  pollution: 'Pollution',
  inequality: 'Inequality',
  unemployment: 'Unemployment',
}

const bestFaction = (factions: Faction[]): Faction | null => {
  if (!factions || factions.length === 0) return null
  let best: Faction | null = null
  for (const f of factions) {
    if (!best || f.favor > best.favor) best = f
  }
  return best && best.favor > 0 ? best : best
}

const bestStat = (stats: CityStats): { key: StatKey; value: number } | null => {
  let best: { key: StatKey; value: number } | null = null
  for (const key of POSITIVE_PCT_STATS) {
    const v = stats[key] as number
    if (best === null || v > best.value) best = { key, value: v }
  }
  return best
}

const worstStat = (stats: CityStats): { key: StatKey; value: number } | null => {
  let worst: { key: StatKey; value: number } | null = null
  for (const key of NEGATIVE_PCT_STATS) {
    const v = stats[key] as number
    if (worst === null || v > worst.value) worst = { key, value: v }
  }
  return worst
}

// ============================================================================
// Screen
// ============================================================================

export default function GameOverScreen(): JSX.Element {
  const reason = useGameOver()
  const stats = useStats()
  const turn = useGameStore((s) => s.turn)
  const termsServed = useGameStore((s) => s.termsServed)
  const mayorName = useGameStore((s) => s.mayorName)
  const cityName = useGameStore((s) => s.cityName)
  const factions = useGameStore((s) => s.factions)
  const resetGame = useGameStore((s) => s.resetGame)
  const setPhase = useGameStore((s) => s.setPhase)

  // Fall back if reason is somehow null (e.g. screen rendered defensively)
  const effectiveReason: GameOverReason = reason ?? 'termLimitLost'
  const heading = TITLE[effectiveReason] ?? 'GAME OVER'
  const blurb = outcomeBlurb(effectiveReason, {
    mayorName,
    turn,
    termsServed,
    cityName,
  })

  const beloved = bestFaction(factions)
  const high = bestStat(stats)
  const low = worstStat(stats)

  const highlights: Highlight[] = []
  if (beloved) {
    highlights.push({
      label: 'Most beloved by',
      value: `${beloved.name} (${beloved.favor >= 0 ? '+' : ''}${Math.round(beloved.favor)})`,
    })
  }
  if (high) {
    highlights.push({
      label: 'Best stat',
      value: `${STAT_NICE_NAME[high.key] ?? high.key} ${formatPct(high.value, 0)}`,
    })
  }
  if (low) {
    highlights.push({
      label: 'Worst stat',
      value: `${STAT_NICE_NAME[low.key] ?? low.key} ${formatPct(low.value, 0)}`,
    })
  }

  const handlePlayAgain = async (): Promise<void> => {
    await resetGame()
    setPhase('select')
  }

  const handleTitle = async (): Promise<void> => {
    await resetGame()
    setPhase('start')
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero title */}
        <View style={styles.hero}>
          <PixelText size="xs" color={colors.textMuted} style={styles.kicker}>
            {cityName ? `${cityName.toUpperCase()} • ${quarterToDate(turn)}` : quarterToDate(turn)}
          </PixelText>
          <PixelText size="lg" color={titleColor(effectiveReason)} style={styles.title}>
            {heading}
          </PixelText>
          <View style={styles.divider} />
          <Text style={styles.blurb}>{blurb}</Text>
        </View>

        {/* Stats panel */}
        <Panel title="Final Stats">
          <View style={styles.statGrid}>
            <View style={styles.statRow}>
              <StatTile
                label="Approval"
                value={formatPct(stats.approval, 0)}
                style={styles.tile}
              />
              <StatTile
                label="Treasury"
                value={formatMoney(stats.treasury)}
                style={styles.tile}
              />
            </View>
            <View style={styles.statRow}>
              <StatTile
                label="Population"
                value={formatPop(stats.population)}
                style={styles.tile}
              />
              <StatTile
                label="GDP/capita"
                value={`$${(stats.gdpPerCapita / 1000).toFixed(1)}k`}
                style={styles.tile}
              />
            </View>
            <View style={styles.statRow}>
              <StatTile
                label="Turns served"
                value={`${turn}`}
                unit="Q"
                style={styles.tile}
              />
              <StatTile
                label="Terms"
                value={`${termsServed}`}
                style={styles.tile}
              />
            </View>
          </View>
        </Panel>

        {/* Highlights */}
        {highlights.length > 0 ? (
          <Panel title="Highlights">
            <View style={styles.highlightList}>
              {highlights.map((h, idx) => (
                <View key={`${h.label}-${idx}`} style={styles.highlightCard}>
                  <PixelText size="xs" color={colors.textDim} style={styles.highlightLabel}>
                    {h.label}
                  </PixelText>
                  <Text style={styles.highlightValue}>{h.value}</Text>
                </View>
              ))}
            </View>
          </Panel>
        ) : null}

        {/* Action row */}
        <View style={styles.actions}>
          <Button
            label="Play Again"
            variant="primary"
            onPress={handlePlayAgain}
            full
          />
          <Button
            label="Title"
            variant="ghost"
            onPress={handleTitle}
            full
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  kicker: {
    letterSpacing: 1.5,
  },
  title: {
    textAlign: 'center',
    fontSize: sizes.pixelLg + 4,
    lineHeight: sizes.pixelLg + 12,
    marginTop: spacing.xs,
  },
  divider: {
    width: 64,
    height: 2,
    backgroundColor: colors.borderStrong,
    marginVertical: spacing.sm,
  },
  blurb: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyLg,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
  },
  statGrid: {
    gap: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    flexBasis: 0,
    flexGrow: 1,
  },
  highlightList: {
    gap: spacing.sm,
  },
  highlightCard: {
    backgroundColor: colors.bgPanelAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  highlightLabel: {
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  highlightValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    color: colors.text,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
})
