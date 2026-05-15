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
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { PixelText } from '../ui/PixelText'
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
// GameOverScreen — end of game.
// Hero icon + big title, a narrative outcome card, the final-stats grid,
// short highlights, and two action buttons.
// ============================================================================

const TITLE: Record<GameOverReason, string> = {
  recalled: 'RECALLED',
  bankrupt: 'BANKRUPT',
  termLimitWon: 'VICTORY',
  termLimitLost: 'TERM COMPLETE',
  civilUnrest: 'CIVIL UNREST',
  pandemicCollapse: 'COLLAPSE',
}

const ICON: Record<GameOverReason, string> = {
  recalled: '📉',
  bankrupt: '💸',
  termLimitWon: '🏆',
  termLimitLost: '🗳️',
  civilUnrest: '🌪️',
  pandemicCollapse: '🦠',
}

const titleColor = (reason: GameOverReason): string => {
  switch (reason) {
    case 'termLimitWon':
      return colors.gold
    case 'recalled':
    case 'bankrupt':
    case 'civilUnrest':
    case 'pandemicCollapse':
      return colors.bad
    case 'termLimitLost':
    default:
      return colors.text
  }
}

const outcomeBlurb = (
  reason: GameOverReason,
  ctx: {
    mayorName: string
    cityName: string
    turn: number
    termsServed: number
  },
): string => {
  const { mayorName, turn, termsServed, cityName } = ctx
  const mayor = mayorName || 'The mayor'
  const city = cityName || 'the city'
  const quarter = quarterToDate(turn)
  const termsLabel = `${termsServed} term${termsServed === 1 ? '' : 's'}`

  switch (reason) {
    case 'recalled':
      return `Voters lost faith. ${mayor} was recalled after ${turn} quarters in office. The next mayor inherits ${city} in ${quarter}, with the books and the blame.`
    case 'bankrupt':
      return `${city}'s finances collapsed under accumulated debt and falling tax revenue. The bond markets stopped lending. ${mayor}'s administration ended in ${quarter} after ${termsLabel}.`
    case 'termLimitWon':
      return `${mayor} completed ${termsLabel} with strong approval and a city in better shape than they found it. Promotion to Governor unlocked — ${city} sends them off in ${quarter}.`
    case 'termLimitLost':
      return `${termsLabel} done, but approval was too low to advance. ${mayor} departs in ${quarter}, leaving ${city} to the next mayor to steer onward.`
    case 'civilUnrest':
      return `Unrest spread across districts and ${city} became ungovernable. ${mayor} stepped down in ${quarter} after ${turn} quarters — the streets had already decided.`
    case 'pandemicCollapse':
      return `A public health collapse overwhelmed ${city}. Hospitals, services, and trust failed in sequence. ${mayor}'s government fell in ${quarter}, ${termsLabel} into the job.`
    default:
      return 'The game has ended.'
  }
}

// ============================================================================
// Highlight helpers
// ============================================================================

const POSITIVE_STATS: ReadonlyArray<StatKey> = [
  'education',
  'health',
  'happiness',
  'innovation',
]

const NEGATIVE_STATS: ReadonlyArray<StatKey> = [
  'crime',
  'pollution',
  'inequality',
  'unemployment',
]

const NICE_NAME: Partial<Record<StatKey, string>> = {
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
  return best
}

const bestStat = (stats: CityStats): { key: StatKey; value: number } | null => {
  let top: { key: StatKey; value: number } | null = null
  for (const key of POSITIVE_STATS) {
    const v = stats[key] as number
    if (top === null || v > top.value) top = { key, value: v }
  }
  return top
}

const worstStat = (stats: CityStats): { key: StatKey; value: number } | null => {
  let bottom: { key: StatKey; value: number } | null = null
  for (const key of NEGATIVE_STATS) {
    const v = stats[key] as number
    if (bottom === null || v > bottom.value) bottom = { key, value: v }
  }
  return bottom
}

interface Highlight {
  icon: string
  label: string
  value: string
}

// ============================================================================
// Screen
// ============================================================================

export default function GameOverScreen(): React.JSX.Element {
  const reason = useGameOver()
  const stats = useStats()
  const turn = useGameStore((s) => s.turn)
  const termsServed = useGameStore((s) => s.termsServed)
  const mayorName = useGameStore((s) => s.mayorName)
  const cityName = useGameStore((s) => s.cityName)
  const factions = useGameStore((s) => s.factions)
  const resetGame = useGameStore((s) => s.resetGame)
  const setPhase = useGameStore((s) => s.setPhase)

  const effectiveReason: GameOverReason = reason ?? 'termLimitLost'
  const heading = TITLE[effectiveReason]
  const heroIcon = ICON[effectiveReason]
  const blurb = outcomeBlurb(effectiveReason, {
    mayorName,
    cityName,
    turn,
    termsServed,
  })

  const beloved = bestFaction(factions)
  const high = bestStat(stats)
  const low = worstStat(stats)

  const highlights: Highlight[] = []
  if (beloved) {
    highlights.push({
      icon: '🤝',
      label: 'Most loyal',
      value: `${beloved.name} (${beloved.favor >= 0 ? '+' : ''}${Math.round(beloved.favor)})`,
    })
  }
  if (high) {
    highlights.push({
      icon: '⭐',
      label: 'City\'s strength',
      value: `${NICE_NAME[high.key] ?? high.key} ${formatPct(high.value, 0)}`,
    })
  }
  if (low) {
    highlights.push({
      icon: '⚠️',
      label: 'City\'s struggle',
      value: `${NICE_NAME[low.key] ?? low.key} ${formatPct(low.value, 0)}`,
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

  const subtitle = mayorName && cityName ? `${mayorName} — ${cityName}` : cityName || mayorName || ''

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>{heroIcon}</Text>
          <Text style={[styles.heroTitle, { color: titleColor(effectiveReason) }]}>
            {heading}
          </Text>
          <View
            style={[
              styles.titleUnderline,
              { backgroundColor: titleColor(effectiveReason) },
            ]}
          />
          {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
          <PixelText size="xs" color={colors.textMuted} style={styles.heroTimestamp}>
            {quarterToDate(turn).toUpperCase()}
          </PixelText>
        </View>

        {/* Outcome blurb */}
        <Card title="Outcome">
          <Text style={styles.blurb}>{blurb}</Text>
        </Card>

        {/* Final stats */}
        <Card title="Final stats">
          <View style={styles.statGrid}>
            <View style={styles.statRow}>
              <StatTile
                icon="💰"
                label="Treasury"
                value={formatMoney(stats.treasury)}
              />
              <StatTile
                icon="⭐"
                label="Approval"
                value={formatPct(stats.approval, 0)}
              />
            </View>
            <View style={styles.statRow}>
              <StatTile
                icon="👥"
                label="Population"
                value={formatPop(stats.population)}
              />
              <StatTile
                icon="📈"
                label="GDP/cap"
                value={`$${(stats.gdpPerCapita / 1000).toFixed(1)}k`}
              />
            </View>
            <View style={styles.statRow}>
              <StatTile
                icon="📅"
                label="Turns"
                value={`${turn}`}
                unit="Q"
              />
              <StatTile
                icon="🗳️"
                label="Terms"
                value={`${termsServed}`}
              />
            </View>
            <View style={styles.statRow}>
              <StatTile
                icon="📚"
                label="Education"
                value={`${stats.education.toFixed(0)}`}
                unit="/100"
              />
              <StatTile
                icon="🚓"
                label="Crime"
                value={`${stats.crime.toFixed(0)}`}
                unit="/100"
              />
            </View>
          </View>
        </Card>

        {/* Highlights */}
        {highlights.length > 0 ? (
          <Card title="Highlights">
            <View style={styles.highlightList}>
              {highlights.map((h, idx) => (
                <View key={`${h.label}-${idx}`} style={styles.highlightRow}>
                  <View style={styles.highlightIconWrap}>
                    <Text style={styles.highlightIcon}>{h.icon}</Text>
                  </View>
                  <View style={styles.highlightBody}>
                    <PixelText size="xs" color={colors.textMuted}>
                      {h.label.toUpperCase()}
                    </PixelText>
                    <Text style={styles.highlightValue}>{h.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            label="PLAY AGAIN"
            variant="primary"
            full
            onPress={() => {
              void handlePlayAgain()
            }}
          />
          <Button
            label="BACK TO TITLE"
            variant="ghost"
            full
            onPress={() => {
              void handleTitle()
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

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
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  heroIcon: {
    fontSize: 72,
    lineHeight: 80,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    fontFamily: fonts.mono,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: 2,
    textAlign: 'center',
  },
  titleUnderline: {
    width: 72,
    height: 3,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
    opacity: 0.75,
  },
  heroSubtitle: {
    marginTop: spacing.sm,
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyLg,
    color: colors.text,
    textAlign: 'center',
  },
  heroTimestamp: {
    marginTop: spacing.xs,
    letterSpacing: 2,
  },

  blurb: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyLg,
    color: colors.text,
    lineHeight: sizes.bodyLg + 8,
  },

  statGrid: {
    gap: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  highlightList: {
    gap: spacing.sm + 2,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  highlightIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.bgPanelAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightIcon: {
    fontSize: 20,
  },
  highlightBody: {
    flex: 1,
    gap: 2,
  },
  highlightValue: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyLg,
    color: colors.text,
  },

  actions: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
})
