import React from 'react'
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
} from 'react-native'
import { useGameStore } from '../../store/gameStore'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { DateBadge } from '../ui/DateBadge'
import { PixelText } from '../ui/PixelText'
import { STAT_INFO } from '../../game/explanations'
import { formatMoney, quarterToDate } from '../../game/util'
import {
  colors,
  fonts,
  sizes,
  spacing,
  radius,
  toneColor,
  toneSoftBg,
} from '../../theme'
import type {
  MediaBias,
  NewsItem,
  StatChange,
  StatKey,
} from '../../game/types'

// ============================================================================
// TurnSummaryScreen — after the player ends a turn.
// Hero: big DateBadge for the quarter that just resolved.
// Then three cards: treasury delta, stat changes, headlines.
// ============================================================================

// Stat semantics: what counts as a "good" or "bad" delta direction.
const GOOD_IF_UP: ReadonlySet<StatKey> = new Set<StatKey>([
  'gdpPerCapita',
  'education',
  'health',
  'happiness',
  'approval',
  'innovation',
  'creditRating',
  'population',
  'treasury',
])

const BAD_IF_UP: ReadonlySet<StatKey> = new Set<StatKey>([
  'unemployment',
  'inflation',
  'debt',
  'crime',
  'pollution',
  'inequality',
])

type Tone = 'good' | 'bad' | 'neutral'

const tonalize = (stat: StatKey, delta: number): Tone => {
  if (delta === 0) return 'neutral'
  if (GOOD_IF_UP.has(stat)) return delta > 0 ? 'good' : 'bad'
  if (BAD_IF_UP.has(stat)) return delta > 0 ? 'bad' : 'good'
  return 'neutral'
}

const arrowFor = (delta: number): string =>
  delta > 0 ? '▲' : delta < 0 ? '▼' : '•'

const STAT_ICON: Partial<Record<StatKey, string>> = {
  treasury: '💰',
  gdpPerCapita: '📈',
  unemployment: '💼',
  inflation: '🛒',
  debt: '💳',
  creditRating: '🏆',
  population: '👥',
  education: '📚',
  health: '🏥',
  happiness: '😊',
  approval: '⭐',
  crime: '🚓',
  pollution: '🏭',
  innovation: '💡',
  inequality: '⚖️',
}

// Format a delta value for display next to the stat name.
const formatDelta = (stat: StatKey, delta: number): string => {
  if (stat === 'treasury' || stat === 'debt') {
    return `${delta >= 0 ? '+' : '-'}${formatMoney(Math.abs(delta))}`
  }
  const sign = delta > 0 ? '+' : ''
  if (stat === 'population') {
    return `${sign}${Math.round(delta).toLocaleString()}`
  }
  if (stat === 'gdpPerCapita') {
    return `${sign}${delta.toFixed(0)}`
  }
  return `${sign}${delta.toFixed(1)}`
}

// Aggregated change collapsed across reasons.
interface AggregatedChange {
  stat: StatKey
  delta: number
  reasons: string[]
}

const aggregateChanges = (changes: StatChange[]): AggregatedChange[] => {
  const byStat = new Map<StatKey, AggregatedChange>()
  for (const c of changes) {
    const existing = byStat.get(c.stat)
    if (existing) {
      existing.delta += c.delta
      if (c.reason && !existing.reasons.includes(c.reason)) {
        existing.reasons.push(c.reason)
      }
    } else {
      byStat.set(c.stat, {
        stat: c.stat,
        delta: c.delta,
        reasons: c.reason ? [c.reason] : [],
      })
    }
  }
  return Array.from(byStat.values()).sort(
    (a, b) => Math.abs(b.delta) - Math.abs(a.delta),
  )
}

const BIAS_COLOR: Record<MediaBias, string> = {
  left: colors.bias_left,
  center: colors.bias_center,
  right: colors.bias_right,
  tabloid: colors.bias_tabloid,
}

const BIAS_LABEL: Record<MediaBias, string> = {
  left: 'L',
  center: 'C',
  right: 'R',
  tabloid: 'T',
}

interface OutletInfo {
  name: string
  bias: MediaBias
}

// ============================================================================
// Stat change row
// ============================================================================
function StatChangeRow({ change }: { change: AggregatedChange }): React.JSX.Element {
  const info = STAT_INFO[change.stat]
  const tone = tonalize(change.stat, change.delta)
  const color = toneColor(tone)
  const icon = STAT_ICON[change.stat] ?? '•'
  const unit =
    info.unit && info.unit !== '$M' && info.unit !== '$' ? info.unit : ''

  return (
    <View style={styles.changeRow}>
      <View style={[styles.changeIconWrap, { backgroundColor: toneSoftBg(tone) }]}>
        <Text style={styles.changeIcon}>{icon}</Text>
      </View>
      <View style={styles.changeBody}>
        <View style={styles.changeTopLine}>
          <Text style={styles.changeLabel} numberOfLines={1}>
            {info.label}
          </Text>
          <Text style={[styles.changeDelta, { color }]}>
            {arrowFor(change.delta)} {formatDelta(change.stat, change.delta)}
            {unit}
          </Text>
        </View>
        {change.reasons.length > 0 ? (
          <Text style={styles.changeReason} numberOfLines={2}>
            {change.reasons.join(' • ')}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

// ============================================================================
// Headline row
// ============================================================================
function NewsRow({
  item,
  outlet,
}: {
  item: NewsItem
  outlet: OutletInfo | null
}): React.JSX.Element {
  const tone: Tone = item.tone === 'good' ? 'good' : item.tone === 'bad' ? 'bad' : 'neutral'
  const bias = outlet?.bias ?? 'center'
  const turnLabel = quarterToDate(item.turn)

  return (
    <View style={styles.newsRow}>
      <View
        style={[
          styles.newsBadge,
          { backgroundColor: BIAS_COLOR[bias], borderColor: BIAS_COLOR[bias] },
        ]}
      >
        <Text style={styles.newsBadgeText}>{BIAS_LABEL[bias]}</Text>
      </View>
      <View style={styles.newsBody}>
        <View style={styles.newsTopRow}>
          {outlet ? (
            <Text style={styles.newsOutlet} numberOfLines={1}>
              {outlet.name}
            </Text>
          ) : (
            <Text style={styles.newsOutlet}>—</Text>
          )}
          <Text style={styles.newsTurn}>{turnLabel}</Text>
        </View>
        <Text style={styles.newsHeadline} numberOfLines={3}>
          {item.headline}
        </Text>
      </View>
      <View style={[styles.newsToneBar, { backgroundColor: toneColor(tone) }]} />
    </View>
  )
}

// ============================================================================
// Screen
// ============================================================================
export default function TurnSummaryScreen(): React.JSX.Element {
  const changes = useGameStore((s) => s.lastTurnChanges)
  const news = useGameStore((s) => s.news)
  const turn = useGameStore((s) => s.turn)
  const termLengthYears = useGameStore((s) => s.termLengthYears)
  const termsServed = useGameStore((s) => s.termsServed)
  const outlets = useGameStore((s) => s.outlets)
  const dismiss = useGameStore((s) => s.dismissTurnSummary)

  // Quick lookup table for outlets
  const outletMap = React.useMemo<Map<string, OutletInfo>>(() => {
    const m = new Map<string, OutletInfo>()
    for (const o of outlets) m.set(o.id, { name: o.name, bias: o.bias })
    return m
  }, [outlets])

  // Aggregate stat changes; filter near-zero noise.
  const aggregated = React.useMemo(() => {
    return aggregateChanges(changes).filter((c) => {
      if (c.stat === 'treasury' || c.stat === 'debt' || c.stat === 'population') {
        return Math.abs(c.delta) >= 0.5
      }
      return Math.abs(c.delta) >= 0.05
    })
  }, [changes])

  // Treasury isolated for hero card
  const treasuryAgg = aggregated.find((c) => c.stat === 'treasury')
  const treasuryDelta = treasuryAgg?.delta ?? 0
  const treasuryTone: Tone =
    treasuryDelta === 0 ? 'neutral' : treasuryDelta > 0 ? 'good' : 'bad'

  // Other stat changes (excluding treasury since it's in its own card)
  const otherChanges = aggregated.filter((c) => c.stat !== 'treasury')

  // The just-resolved turn is turn-1 since `endTurn` advances first.
  const reportTurn = Math.max(0, turn - 1)

  // Latest news first — show up to 5
  const recentNews = React.useMemo(() => [...news].slice(-5).reverse(), [news])

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — date badge */}
        <View style={styles.heroWrap}>
          <PixelText size="sm" color={colors.textMuted} style={styles.eyebrow}>
            END OF QUARTER
          </PixelText>
          <DateBadge
            turn={reportTurn}
            termLengthYears={termLengthYears}
            termsServed={termsServed}
            style={styles.dateBadge}
          />
        </View>

        <Text style={styles.sectionHeading}>What changed this quarter</Text>

        {/* Treasury card */}
        <Card title="Treasury">
          <View style={styles.treasuryRow}>
            <View>
              <PixelText size="xs" color={colors.textMuted}>
                NET THIS QUARTER
              </PixelText>
              <Text
                style={[
                  styles.treasuryValue,
                  { color: toneColor(treasuryTone) },
                ]}
              >
                {treasuryDelta === 0
                  ? 'No change'
                  : `${treasuryDelta > 0 ? '+' : '-'}${formatMoney(Math.abs(treasuryDelta))}`}
              </Text>
            </View>
            <View
              style={[
                styles.treasuryArrowWrap,
                { backgroundColor: toneSoftBg(treasuryTone) },
              ]}
            >
              <Text
                style={[styles.treasuryArrow, { color: toneColor(treasuryTone) }]}
              >
                {treasuryDelta === 0 ? '•' : treasuryDelta > 0 ? '▲' : '▼'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Stat changes */}
        <Card title="Stat changes">
          {otherChanges.length === 0 ? (
            <Text style={styles.emptyText}>
              A quiet quarter — no significant movement.
            </Text>
          ) : (
            <View style={styles.changesStack}>
              {otherChanges.map((c) => (
                <StatChangeRow key={c.stat} change={c} />
              ))}
            </View>
          )}
        </Card>

        {/* Headlines */}
        <Card title="Headlines">
          {recentNews.length === 0 ? (
            <Text style={styles.emptyText}>No headlines yet.</Text>
          ) : (
            <View style={styles.newsStack}>
              {recentNews.map((n, idx) => (
                <NewsRow
                  key={`${n.turn}-${idx}-${n.headline.slice(0, 12)}`}
                  item={n}
                  outlet={n.outletId ? outletMap.get(n.outletId) ?? null : null}
                />
              ))}
            </View>
          )}
        </Card>

        <View style={styles.footer}>
          <Button label="CONTINUE" variant="primary" full onPress={dismiss} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  heroWrap: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  eyebrow: {
    letterSpacing: 2,
  },
  dateBadge: {
    alignSelf: 'stretch',
  },
  sectionHeading: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.title,
    color: colors.text,
    marginTop: spacing.xs,
  },

  // Treasury
  treasuryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  treasuryValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoXl,
    lineHeight: sizes.monoXl + 4,
    marginTop: spacing.xs,
  },
  treasuryArrowWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  treasuryArrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 28,
    lineHeight: 30,
  },

  // Stat changes
  changesStack: {
    gap: spacing.sm + 2,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  changeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeIcon: {
    fontSize: 18,
  },
  changeBody: {
    flex: 1,
  },
  changeTopLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  changeLabel: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: sizes.body,
    color: colors.text,
  },
  changeDelta: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    letterSpacing: 0.5,
  },
  changeReason: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: sizes.bodyXs + 4,
  },

  // News
  newsStack: {
    gap: spacing.sm,
  },
  newsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.bgPanelAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  newsBadge: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newsBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyLg,
    color: '#ffffff',
    letterSpacing: 1,
  },
  newsBody: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: 2,
  },
  newsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsOutlet: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyXs,
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },
  newsTurn: {
    fontFamily: fonts.mono,
    fontSize: sizes.bodyXs,
    color: colors.textMuted,
  },
  newsHeadline: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.text,
    lineHeight: sizes.body + 6,
  },
  newsToneBar: {
    width: 4,
  },

  emptyText: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: spacing.xs,
  },

  footer: {
    marginTop: spacing.md,
  },
})
