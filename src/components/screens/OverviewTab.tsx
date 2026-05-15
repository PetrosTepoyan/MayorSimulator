import React from 'react'
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native'
import { useStats, useMacro, useNews } from '../../store/gameStore'
import { Panel } from '../ui/Panel'
import { PixelText } from '../ui/PixelText'
import { StatTile } from '../ui/StatTile'
import { StatBar } from '../ui/StatBar'
import { STAT_INFO } from '../../game/explanations'
import { formatMoney, formatPct, formatPop, quarterToDate } from '../../game/util'
import { colors, spacing, fonts, sizes, radius } from '../../theme'
import type { StatKey, MacroState, NewsItem } from '../../game/types'

// ============================================================================
// Helpers — tone derivation for KPI tiles based on value bands
// ============================================================================

type Tone = 'good' | 'bad' | 'neutral'

const toneFor = (key: StatKey, value: number): Tone => {
  switch (key) {
    case 'treasury':
      if (value < 0) return 'bad'
      if (value > 100) return 'good'
      return 'neutral'
    case 'approval':
      if (value >= 55) return 'good'
      if (value < 35) return 'bad'
      return 'neutral'
    case 'unemployment':
      if (value < 5) return 'good'
      if (value > 10) return 'bad'
      return 'neutral'
    case 'inflation':
      if (value < 0 || value > 8) return 'bad'
      if (value >= 1.5 && value <= 3.5) return 'good'
      return 'neutral'
    case 'gdpPerCapita':
      if (value >= 40000) return 'good'
      if (value < 15000) return 'bad'
      return 'neutral'
    case 'population':
      return 'neutral'
    default:
      return 'neutral'
  }
}

// ============================================================================
// Macro descriptor — inline summary, modeled on describeMacroEnvironment
// ============================================================================

const describeGeo = (g: MacroState['geopolitical']): string =>
  g === 'calm' ? 'calm' : g === 'tense' ? 'tense' : 'in crisis'

const describeMacroEnvironment = (m: MacroState): string => {
  const growth = m.nationalGdpGrowth.toFixed(1)
  const infl = m.nationalInflation.toFixed(1)
  const cc = Math.round(m.consumerConfidence)
  return `National growth ${growth}% • Inflation ${infl}% • Geopolitics ${describeGeo(m.geopolitical)} • Consumer confidence ${cc}/100`
}

// ============================================================================
// News card
// ============================================================================

interface NewsCardProps {
  item: NewsItem
}

const toneToColor = (tone: NewsItem['tone']): string =>
  tone === 'good' ? colors.good : tone === 'bad' ? colors.bad : colors.textDim

const NewsCard = ({ item }: NewsCardProps): JSX.Element => {
  const dot = toneToColor(item.tone)
  const meta = `${item.outletId ?? 'CITY WIRE'} • ${quarterToDate(item.turn)}`
  return (
    <View style={styles.newsCard}>
      <View style={styles.newsHeader}>
        <View style={[styles.toneDot, { backgroundColor: dot }]} />
        <Text style={styles.newsHeadline} numberOfLines={2}>
          {item.headline}
        </Text>
      </View>
      <Text style={styles.newsMeta}>{meta.toUpperCase()}</Text>
      {item.body ? (
        <Text style={styles.newsBody} numberOfLines={3}>
          {item.body}
        </Text>
      ) : null}
    </View>
  )
}

// ============================================================================
// Main tab
// ============================================================================

export default function OverviewTab(): JSX.Element {
  const stats = useStats()
  const macro = useMacro()
  const news = useNews()

  const onTap = (statKey: StatKey): void => {
    const info = STAT_INFO[statKey]
    if (!info) return
    Alert.alert(`${info.label}${info.unit ? ` (${info.unit})` : ''}`, info.long)
  }

  const recentNews: NewsItem[] = news.slice(-4).reverse()

  // 2x3 grid of KPI tiles in rows of two
  const kpis: Array<{
    key: StatKey
    label: string
    value: string
    unit?: string
  }> = [
    { key: 'treasury', label: 'Treasury', value: formatMoney(stats.treasury) },
    { key: 'approval', label: 'Approval', value: formatPct(stats.approval, 0) },
    { key: 'population', label: 'Population', value: formatPop(stats.population) },
    { key: 'gdpPerCapita', label: 'GDP/capita', value: `$${(stats.gdpPerCapita / 1000).toFixed(1)}k` },
    { key: 'inflation', label: 'Inflation', value: formatPct(stats.inflation, 1) },
    { key: 'unemployment', label: 'Unemployment', value: formatPct(stats.unemployment, 1) },
  ]

  // Render KPI rows (two-per-row layout)
  const rows: Array<typeof kpis> = []
  for (let i = 0; i < kpis.length; i += 2) {
    rows.push(kpis.slice(i, i + 2))
  }

  // Health bars
  const bars: Array<{ key: StatKey; label: string; inverted?: boolean }> = [
    { key: 'education', label: 'Education' },
    { key: 'health', label: 'Health' },
    { key: 'happiness', label: 'Happiness' },
    { key: 'innovation', label: 'Innovation' },
    { key: 'crime', label: 'Crime', inverted: true },
    { key: 'pollution', label: 'Pollution', inverted: true },
    { key: 'inequality', label: 'Inequality', inverted: true },
  ]

  return (
    <View style={styles.root}>
      {/* KPI grid */}
      <Panel title="City At A Glance">
        <View style={styles.grid}>
          {rows.map((row, idx) => (
            <View key={`row-${idx}`} style={styles.gridRow}>
              {row.map((k) => (
                <StatTile
                  key={k.key}
                  label={k.label}
                  value={k.value}
                  tone={toneFor(k.key, stats[k.key] as number)}
                  onPress={() => onTap(k.key)}
                  style={styles.tile}
                />
              ))}
            </View>
          ))}
        </View>
      </Panel>

      {/* Health bars */}
      <Panel title="Quality of Life">
        <View style={styles.bars}>
          {bars.map((b) => (
            <RowTap key={b.key} onPress={() => onTap(b.key)}>
              <StatBar
                label={b.label}
                value={stats[b.key] as number}
                inverted={b.inverted}
              />
            </RowTap>
          ))}
        </View>
      </Panel>

      {/* Macro */}
      {macro ? (
        <Panel title="Macro Environment">
          <Text style={styles.macroLine}>{describeMacroEnvironment(macro)}</Text>
          {macro.activeTrends && macro.activeTrends.length > 0 ? (
            <View style={styles.trends}>
              {macro.activeTrends.map((t) => (
                <View key={t.id} style={styles.trendChip}>
                  <PixelText size="xs" color={colors.govGold}>
                    {t.name}
                  </PixelText>
                  <Text style={styles.trendMeta}>
                    intensity {Math.round(t.intensity)} • {t.turnsRemaining}Q left
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </Panel>
      ) : null}

      {/* News flash */}
      <Panel title="News Flash">
        {recentNews.length === 0 ? (
          <Text style={styles.muted}>No news yet. End a turn to see headlines.</Text>
        ) : (
          <View style={styles.newsList}>
            {recentNews.map((n, i) => (
              <NewsCard key={`${n.turn}-${i}`} item={n} />
            ))}
          </View>
        )}
      </Panel>
    </View>
  )
}

// Small wrapper around children to make a row tappable without disrupting StatBar's layout.
interface RowTapProps {
  onPress: () => void
  children: React.ReactNode
}

const RowTap = ({ onPress, children }: RowTapProps): JSX.Element => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    hitSlop={4}
  >
    {children}
  </Pressable>
)

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl + spacing.xxl, // room for end-turn FAB + tab bar
    gap: spacing.sm,
  },
  grid: {
    gap: spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    flexBasis: 0,
    flexGrow: 1,
  },
  bars: {
    gap: spacing.xs,
  },
  macroLine: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.text,
    lineHeight: 20,
  },
  trends: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  trendChip: {
    backgroundColor: colors.bgPanelAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  trendMeta: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm - 2,
    color: colors.textMuted,
    marginTop: 2,
  },
  newsList: {
    gap: spacing.sm,
  },
  newsCard: {
    backgroundColor: colors.bgPanelAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  toneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  newsHeadline: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: sizes.body,
    color: colors.text,
    lineHeight: 18,
  },
  newsMeta: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelXs,
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginTop: spacing.xs,
    marginLeft: 16,
  },
  newsBody: {
    fontFamily: fonts.body,
    fontSize: sizes.body - 1,
    color: colors.textDim,
    marginTop: spacing.xs,
    marginLeft: 16,
    lineHeight: 16,
  },
  muted: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
})
