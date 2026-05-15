import React from 'react'
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native'
import {
  useStats,
  useMacro,
  useNews,
  useOutlets,
  useTurn,
  useGameStore,
} from '../../store/gameStore'
import { getCountry } from '../../game/countries'
import { Card } from '../ui/Card'
import { StatTile } from '../ui/StatTile'
import { StatBar } from '../ui/StatBar'
import { KPIChip } from '../ui/KPIChip'
import { DateBadge } from '../ui/DateBadge'
import { STAT_INFO } from '../../game/explanations'
import {
  formatMoney,
  formatPct,
  formatPop,
  quarterToDate,
} from '../../game/util'
import {
  colors,
  fonts,
  sizes,
  spacing,
  radius,
  Tone,
  toneColor,
  toneSoftBg,
} from '../../theme'
import type {
  StatKey,
  MacroState,
  NewsItem,
  NewsOutlet,
  MediaBias,
} from '../../game/types'

// ----------------------------------------------------------------------------
// Tone helpers
// ----------------------------------------------------------------------------

const toneFor = (key: StatKey, value: number): Tone => {
  switch (key) {
    case 'treasury':
      if (value < 0) return 'bad'
      if (value > 100) return 'good'
      return 'neutral'
    case 'population':
      return 'neutral'
    case 'gdpPerCapita':
      if (value >= 40000) return 'good'
      if (value < 15000) return 'bad'
      return 'neutral'
    case 'inflation':
      if (value > 8 || value < 0) return 'bad'
      if (value > 5) return 'warn'
      if (value >= 1.5 && value <= 3.5) return 'good'
      return 'neutral'
    default:
      return 'neutral'
  }
}

const BIAS_COLOR: Record<MediaBias, string> = {
  left: colors.bias_left,
  center: colors.bias_center,
  right: colors.bias_right,
  tabloid: colors.bias_tabloid,
}

const newsTone = (t: NewsItem['tone']): Tone =>
  t === 'good' ? 'good' : t === 'bad' ? 'bad' : 'neutral'

const geoTone = (g: MacroState['geopolitical']): Tone =>
  g === 'crisis' ? 'bad' : g === 'tense' ? 'warn' : 'good'

// ----------------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------------

interface AdvisorTip {
  text: string
  tone: Tone
}

function buildAdvisorTips(args: {
  treasury: number
  inflation: number
  crime: number
  approval: number
  pollution: number
}): AdvisorTip[] {
  const tips: AdvisorTip[] = []
  if (args.treasury < 30) {
    tips.push({
      tone: 'warn',
      text: 'Treasury low — consider raising taxes or cutting spending.',
    })
  }
  if (args.inflation > 6) {
    tips.push({
      tone: 'warn',
      text: 'High inflation — tight budget may help cool prices.',
    })
  }
  if (args.crime > 60) {
    tips.push({
      tone: 'warn',
      text: 'Crime is high — invest in policing or address root causes.',
    })
  }
  if (args.approval < 30) {
    tips.push({
      tone: 'bad',
      text: 'Approval critical — you are at risk of recall.',
    })
  }
  if (args.pollution > 60) {
    tips.push({
      tone: 'warn',
      text: 'Pollution is harming public health long-term.',
    })
  }
  if (tips.length === 0) {
    tips.push({
      tone: 'good',
      text: 'City is stable. Now is the time to build long-term assets.',
    })
  }
  return tips
}

interface HeadlineLineProps {
  item: NewsItem
  outlet?: NewsOutlet
}

function HeadlineLine({ item, outlet }: HeadlineLineProps): React.JSX.Element {
  const biasColor = outlet ? BIAS_COLOR[outlet.bias] : colors.textMuted
  const dotColor = toneColor(newsTone(item.tone))
  return (
    <View style={styles.headlineRow}>
      <View style={[styles.headlineDot, { backgroundColor: dotColor }]} />
      <View style={styles.headlineBody}>
        <View style={styles.headlineMeta}>
          <View style={[styles.biasPill, { borderColor: biasColor }]}>
            <Text style={[styles.biasPillText, { color: biasColor }]}>
              {(outlet?.bias ?? 'wire').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.outletName} numberOfLines={1}>
            {outlet?.name ?? 'City Wire'}
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.dateStamp}>{quarterToDate(item.turn)}</Text>
        </View>
        <Text style={styles.headlineText} numberOfLines={2}>
          {item.headline}
        </Text>
      </View>
    </View>
  )
}

interface AdvisorRowProps {
  tip: AdvisorTip
}

function AdvisorRow({ tip }: AdvisorRowProps): React.JSX.Element {
  return (
    <View
      style={[
        styles.advisorRow,
        {
          backgroundColor: toneSoftBg(tip.tone),
          borderLeftColor: toneColor(tip.tone),
        },
      ]}
    >
      <Text style={styles.advisorIcon}>
        {tip.tone === 'good' ? '✓' : tip.tone === 'bad' ? '!' : '⚠'}
      </Text>
      <Text style={styles.advisorText}>{tip.text}</Text>
    </View>
  )
}

// ----------------------------------------------------------------------------
// OverviewTab
// ----------------------------------------------------------------------------

export default function OverviewTab(): React.JSX.Element {
  const stats = useStats()
  const macro = useMacro()
  const news = useNews()
  const outlets = useOutlets()
  const turn = useTurn()
  const countryId = useGameStore((s) => s.countryId)
  const cityName = useGameStore((s) => s.cityName)
  const termLengthYears = useGameStore((s) => s.termLengthYears)
  const termsServed = useGameStore((s) => s.termsServed)

  let country: ReturnType<typeof getCountry> | null = null
  try {
    if (countryId) country = getCountry(countryId)
  } catch {
    country = null
  }

  const onTapStat = (key: StatKey): void => {
    const info = STAT_INFO[key]
    if (!info) return
    Alert.alert(`${info.label}${info.unit ? ` (${info.unit})` : ''}`, info.long)
  }

  // Outlet lookup
  const outletById = React.useMemo<Record<string, NewsOutlet>>(() => {
    const map: Record<string, NewsOutlet> = {}
    for (const o of outlets) map[o.id] = o
    return map
  }, [outlets])

  const recentNews: NewsItem[] = news.slice(-4).reverse()

  const tips = buildAdvisorTips({
    treasury: stats.treasury,
    inflation: stats.inflation,
    crime: stats.crime,
    approval: stats.approval,
    pollution: stats.pollution,
  })

  return (
    <View style={styles.root}>
      {/* Hero — big date / season + city name */}
      <View style={styles.hero}>
        <DateBadge
          turn={turn}
          termLengthYears={country?.termLengthYears ?? termLengthYears ?? 4}
          termsServed={termsServed}
          style={styles.dateBadge}
        />
        <View style={styles.heroIdentity}>
          <Text style={styles.heroLabel}>YOUR CITY</Text>
          <Text style={styles.heroCity} numberOfLines={1}>
            {cityName || 'New City'}
          </Text>
          {country ? (
            <Text style={styles.heroCountry} numberOfLines={1}>
              {country.flag} {country.name}
            </Text>
          ) : null}
        </View>
      </View>

      {/* City Pulse — 4 big tiles */}
      <Card title="City Pulse" subtitle="The numbers that decide your political life.">
        <View style={styles.tilesGrid}>
          <View style={styles.tilesRow}>
            <StatTile
              icon="💰"
              label="Treasury"
              value={formatMoney(stats.treasury)}
              tone={toneFor('treasury', stats.treasury)}
              onPress={() => onTapStat('treasury')}
              style={styles.tile}
            />
            <StatTile
              icon="👥"
              label="Population"
              value={formatPop(stats.population)}
              tone={toneFor('population', stats.population)}
              onPress={() => onTapStat('population')}
              style={styles.tile}
            />
          </View>
          <View style={styles.tilesRow}>
            <StatTile
              icon="📊"
              label="GDP/capita"
              value={`$${(stats.gdpPerCapita / 1000).toFixed(1)}k`}
              tone={toneFor('gdpPerCapita', stats.gdpPerCapita)}
              onPress={() => onTapStat('gdpPerCapita')}
              style={styles.tile}
            />
            <StatTile
              icon="📈"
              label="Inflation"
              value={formatPct(stats.inflation, 1)}
              tone={toneFor('inflation', stats.inflation)}
              onPress={() => onTapStat('inflation')}
              style={styles.tile}
            />
          </View>
        </View>
      </Card>

      {/* Quality of Life — bars */}
      <Card title="Quality of Life" subtitle="How life actually feels for residents.">
        <View style={styles.barsBlock}>
          <Pressable onPress={() => onTapStat('education')} hitSlop={2}>
            <StatBar icon="📚" label="Education" value={stats.education} />
          </Pressable>
          <Pressable onPress={() => onTapStat('health')} hitSlop={2}>
            <StatBar icon="🏥" label="Health" value={stats.health} />
          </Pressable>
          <Pressable onPress={() => onTapStat('happiness')} hitSlop={2}>
            <StatBar icon="😊" label="Happiness" value={stats.happiness} />
          </Pressable>
          <Pressable onPress={() => onTapStat('innovation')} hitSlop={2}>
            <StatBar icon="💡" label="Innovation" value={stats.innovation} />
          </Pressable>
          <Pressable onPress={() => onTapStat('crime')} hitSlop={2}>
            <StatBar icon="🚓" label="Crime" value={stats.crime} inverted />
          </Pressable>
          <Pressable onPress={() => onTapStat('pollution')} hitSlop={2}>
            <StatBar icon="🏭" label="Pollution" value={stats.pollution} inverted />
          </Pressable>
        </View>
      </Card>

      {/* Macro Environment */}
      <Card
        title="Macro Environment"
        subtitle="Forces above City Hall."
        tint={macro.geopolitical === 'crisis' ? 'primary' : 'default'}
      >
        <View style={styles.chipsGrid}>
          <KPIChip
            icon="🌐"
            label="Nat. growth"
            value={`${macro.nationalGdpGrowth.toFixed(1)}%`}
            tone={macro.nationalGdpGrowth >= 2 ? 'good' : 'warn'}
          />
          <KPIChip
            icon="🪙"
            label="Nat. inflation"
            value={`${macro.nationalInflation.toFixed(1)}%`}
            tone={macro.nationalInflation > 5 ? 'bad' : 'neutral'}
          />
          <KPIChip
            icon="🏛️"
            label="Fed. funding"
            value={formatMoney(macro.federalFunding)}
            tone="gold"
          />
          <KPIChip
            icon="🌍"
            label="Geopolitics"
            value={macro.geopolitical}
            tone={geoTone(macro.geopolitical)}
          />
          <KPIChip
            icon="🤖"
            label="Tech wave"
            value={`${Math.round(macro.techWave)}`}
            tone={macro.techWave > 65 ? 'primary' : 'neutral'}
          />
          <KPIChip
            icon="🌧️"
            label="Climate risk"
            value={`${Math.round(macro.climateRisk)}`}
            tone={macro.climateRisk > 60 ? 'warn' : 'neutral'}
          />
        </View>

        {macro.activeTrends.length > 0 ? (
          <View style={styles.trendsBlock}>
            <Text style={styles.subsectionLabel}>Active trends</Text>
            <View style={styles.trendChips}>
              {macro.activeTrends.map((t) => (
                <View key={t.id} style={styles.trendChip}>
                  <Text style={styles.trendName}>{t.name}</Text>
                  <Text style={styles.trendMeta}>
                    Intensity {Math.round(t.intensity)} · {t.turnsRemaining}Q left
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </Card>

      {/* Latest Headlines */}
      <Card title="Latest Headlines" subtitle="What the press is saying about you.">
        {recentNews.length === 0 ? (
          <Text style={styles.muted}>No news yet. End a turn to see headlines.</Text>
        ) : (
          <View style={styles.headlineList}>
            {recentNews.map((n, i) => (
              <HeadlineLine
                key={`${n.turn}-${i}`}
                item={n}
                outlet={n.outletId ? outletById[n.outletId] : undefined}
              />
            ))}
          </View>
        )}
      </Card>

      {/* Advisor — what to focus on */}
      <Card title="What to focus on" subtitle="Your senior advisor's view.">
        <View style={styles.advisorBlock}>
          {tips.map((tip, i) => (
            <AdvisorRow key={i} tip={tip} />
          ))}
        </View>
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },

  // Hero
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  dateBadge: {
    flexShrink: 0,
  },
  heroIdentity: {
    flex: 1,
  },
  heroLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.pixelSm,
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  heroCity: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.titleLg,
    color: colors.text,
    lineHeight: sizes.titleLg + 4,
    marginTop: 2,
  },
  heroCountry: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.textDim,
    marginTop: 2,
  },

  // Tile grid
  tilesGrid: {
    gap: spacing.sm,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    flexGrow: 1,
    flexBasis: 0,
  },

  // Bars
  barsBlock: {
    gap: spacing.xs,
  },

  // Macro chip grid
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  trendsBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
  },
  subsectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.pixelSm,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  trendChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  trendChip: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  trendName: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyXs,
    color: colors.navy,
  },
  trendMeta: {
    fontFamily: fonts.body,
    fontSize: sizes.caption,
    color: colors.textDim,
    marginTop: 2,
  },

  // News
  headlineList: {
    gap: spacing.md,
  },
  headlineRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  headlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  headlineBody: {
    flex: 1,
  },
  headlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  biasPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  biasPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  outletName: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyXs,
    color: colors.textDim,
    maxWidth: 110,
  },
  dateStamp: {
    fontFamily: fonts.body,
    fontSize: sizes.caption,
    color: colors.textMuted,
  },
  headlineText: {
    fontFamily: fonts.body,
    fontSize: sizes.body + 1,
    color: colors.text,
    lineHeight: 20,
  },

  // Advisor
  advisorBlock: {
    gap: spacing.sm,
  },
  advisorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderLeftWidth: 3,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  advisorIcon: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.text,
    marginTop: 1,
  },
  advisorText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.text,
    lineHeight: 19,
  },

  // Common
  muted: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
})
