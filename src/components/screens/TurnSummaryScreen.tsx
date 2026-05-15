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
import { Panel } from '../ui/Panel'
import { PixelText } from '../ui/PixelText'
import { STAT_INFO } from '../../game/explanations'
import { formatMoney, quarterToDate } from '../../game/util'
import { colors, fonts, sizes, spacing, radius } from '../../theme'
import type { MediaBias, NewsItem, StatChange, StatKey } from '../../game/types'

// Stats whose direction-of-good is "up" (more is better).
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

// Stats whose direction-of-good is "down" (less is better).
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

const toneColor = (tone: Tone): string =>
  tone === 'good' ? colors.good : tone === 'bad' ? colors.bad : colors.textDim

const arrowFor = (delta: number): string =>
  delta > 0 ? '▲' : delta < 0 ? '▼' : '•'

// Format delta: money for treasury/debt, otherwise one decimal.
const formatDelta = (stat: StatKey, delta: number): string => {
  const sign = delta > 0 ? '+' : ''
  if (stat === 'treasury' || stat === 'debt') {
    const money = formatMoney(Math.abs(delta))
    return `${delta >= 0 ? '+' : '-'}${money}`
  }
  if (stat === 'population') {
    return `${sign}${Math.round(delta).toLocaleString()}`
  }
  if (stat === 'gdpPerCapita') {
    return `${sign}${delta.toFixed(0)}`
  }
  return `${sign}${delta.toFixed(1)}`
}

// Aggregate stat changes by stat — sum deltas, keep top reason.
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
  const list = Array.from(byStat.values())
  list.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  return list
}

const BIAS_LABEL: Record<MediaBias, string> = {
  left: 'L',
  center: 'C',
  right: 'R',
  tabloid: 'T',
}

const BIAS_COLOR: Record<MediaBias, string> = {
  left: colors.govBlue,
  center: colors.textDim,
  right: colors.govRed,
  tabloid: colors.govGold,
}

interface OutletInfo {
  name: string
  bias: MediaBias
}

interface StatChangeRowProps {
  change: AggregatedChange
}

function StatChangeRow({ change }: StatChangeRowProps): JSX.Element {
  const info = STAT_INFO[change.stat]
  const tone = tonalize(change.stat, change.delta)
  const color = toneColor(tone)
  const reason = change.reasons.length > 0 ? change.reasons.join(' • ') : null
  return (
    <View style={styles.changeRow}>
      <Text style={[styles.changeArrow, { color }]}>
        {arrowFor(change.delta)}
      </Text>
      <View style={styles.changeBody}>
        <View style={styles.changeTopLine}>
          <Text style={styles.changeLabel}>{info.label}</Text>
          <Text style={[styles.changeDelta, { color }]}>
            {formatDelta(change.stat, change.delta)}
            {info.unit && info.unit !== '$M' && info.unit !== '$'
              ? info.unit
              : ''}
          </Text>
        </View>
        {reason ? (
          <Text style={styles.changeReason} numberOfLines={2}>
            {reason}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

interface NewsRowProps {
  item: NewsItem
  outlet: OutletInfo | null
}

function NewsRow({ item, outlet }: NewsRowProps): JSX.Element {
  const toneAccent =
    item.tone === 'good'
      ? colors.good
      : item.tone === 'bad'
      ? colors.bad
      : colors.textDim
  const bias = outlet?.bias ?? 'center'
  return (
    <View style={styles.newsRow}>
      <View
        style={[
          styles.newsBadge,
          { backgroundColor: BIAS_COLOR[bias] + '22', borderColor: BIAS_COLOR[bias] },
        ]}
      >
        <PixelText size="xs" color={BIAS_COLOR[bias]}>
          {BIAS_LABEL[bias]}
        </PixelText>
      </View>
      <View style={styles.newsBody}>
        {outlet ? (
          <Text style={styles.newsOutlet}>{outlet.name.toUpperCase()}</Text>
        ) : null}
        <Text style={styles.newsHeadline} numberOfLines={3}>
          {item.headline}
        </Text>
      </View>
      <View style={[styles.newsToneBar, { backgroundColor: toneAccent }]} />
    </View>
  )
}

export default function TurnSummaryScreen(): JSX.Element {
  const changes = useGameStore((s) => s.lastTurnChanges)
  const news = useGameStore((s) => s.news)
  const turn = useGameStore((s) => s.turn)
  const outlets = useGameStore((s) => s.outlets)
  const dismiss = useGameStore((s) => s.dismissTurnSummary)

  // Quick lookup table for news outlets.
  const outletMap = React.useMemo<Map<string, OutletInfo>>(() => {
    const m = new Map<string, OutletInfo>()
    for (const o of outlets) m.set(o.id, { name: o.name, bias: o.bias })
    return m
  }, [outlets])

  // Quarter/Year header. turn 0 means the just-finished setup; report shows the
  // quarter that just concluded — i.e. previous turn label.
  const reportTurn = Math.max(0, turn - 1)
  const header = quarterToDate(reportTurn).toUpperCase() + ' REPORT'

  // Aggregate & filter changes — drop near-zero noise.
  const aggregated = React.useMemo(
    () =>
      aggregateChanges(changes).filter(
        (c) =>
          (c.stat === 'treasury' || c.stat === 'debt' || c.stat === 'population'
            ? Math.abs(c.delta) >= 0.5
            : Math.abs(c.delta) >= 0.05),
      ),
    [changes],
  )

  const treasuryAgg = aggregated.find((c) => c.stat === 'treasury')
  const treasuryDelta = treasuryAgg?.delta ?? 0
  const treasuryTone: Tone =
    treasuryDelta === 0 ? 'neutral' : treasuryDelta > 0 ? 'good' : 'bad'

  // Latest news first — show up to 6.
  const recentNews = React.useMemo(
    () => [...news].slice(-6).reverse(),
    [news],
  )

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerWrap}>
          <PixelText size="xs" color={colors.textMuted} style={styles.eyebrow}>
            END OF TURN
          </PixelText>
          <PixelText size="md" color={colors.text} style={styles.title}>
            {header}
          </PixelText>
          <View style={styles.titleRule} />
        </View>

        <Panel title="Treasury">
          <View style={styles.treasuryRow}>
            <View style={styles.treasuryCol}>
              <Text style={styles.treasuryLabel}>NET THIS QUARTER</Text>
              <Text
                style={[
                  styles.treasuryValue,
                  { color: toneColor(treasuryTone) },
                ]}
              >
                {treasuryDelta === 0
                  ? 'NO CHANGE'
                  : `${treasuryDelta > 0 ? '+' : '-'}${formatMoney(Math.abs(treasuryDelta))}`}
              </Text>
            </View>
            <View style={styles.treasurySpark}>
              <Text
                style={[
                  styles.treasurySparkArrow,
                  { color: toneColor(treasuryTone) },
                ]}
              >
                {treasuryDelta === 0 ? '•' : treasuryDelta > 0 ? '▲' : '▼'}
              </Text>
            </View>
          </View>
        </Panel>

        <Panel title="Stat Changes">
          {aggregated.length === 0 ? (
            <Text style={styles.emptyText}>
              A quiet quarter — no significant movement.
            </Text>
          ) : (
            <View style={styles.changesStack}>
              {aggregated.map((c) => (
                <StatChangeRow key={c.stat} change={c} />
              ))}
            </View>
          )}
        </Panel>

        <Panel title="Headlines">
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
        </Panel>

        <View style={styles.footer}>
          <Button
            label="CONTINUE"
            variant="primary"
            full
            onPress={dismiss}
          />
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
  },
  headerWrap: {
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  eyebrow: {
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  title: {
    letterSpacing: 2,
    textShadowColor: colors.govGold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  titleRule: {
    marginTop: spacing.sm,
    height: 2,
    width: 64,
    backgroundColor: colors.govGold,
    opacity: 0.7,
  },
  treasuryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  treasuryCol: {
    flex: 1,
  },
  treasuryLabel: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelXs,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  treasuryValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoLg,
    letterSpacing: 1,
  },
  treasurySpark: {
    paddingHorizontal: spacing.md,
  },
  treasurySparkArrow: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoXl,
  },
  changesStack: {
    gap: spacing.sm + 2,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  changeArrow: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    width: 14,
    textAlign: 'center',
    lineHeight: sizes.monoMd + 4,
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
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    color: colors.text,
  },
  changeDelta: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    letterSpacing: 1,
  },
  changeReason: {
    marginTop: 2,
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: sizes.monoSm + 4,
  },
  newsStack: {
    gap: spacing.sm + 2,
  },
  newsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.bgPanelAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  newsBadge: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
  },
  newsBody: {
    flex: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  newsOutlet: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelXs,
    color: colors.textDim,
    letterSpacing: 1,
    marginBottom: 2,
  },
  newsHeadline: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    color: colors.text,
    lineHeight: sizes.monoMd + 4,
  },
  newsToneBar: {
    width: 3,
  },
  emptyText: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: spacing.xs,
  },
  footer: {
    marginTop: spacing.lg,
  },
})
