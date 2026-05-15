import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useNews, useOutlets } from '../../store/gameStore'
import { Card } from '../ui/Card'
import { quarterToDate } from '../../game/util'
import { colors, fonts, sizes, spacing, radius, toneColor } from '../../theme'
import type {
  NewsItem,
  NewsOutlet,
  MediaBias,
} from '../../game/types'

// ----------------------------------------------------------------------------
// Bias lookups
// ----------------------------------------------------------------------------

const BIAS_COLOR: Record<MediaBias, string> = {
  left: colors.bias_left,
  center: colors.bias_center,
  right: colors.bias_right,
  tabloid: colors.bias_tabloid,
}

const BIAS_LABEL: Record<MediaBias, string> = {
  left: 'Left',
  center: 'Center',
  right: 'Right',
  tabloid: 'Tabloid',
}

function newsToneColor(t: NewsItem['tone']): string {
  if (t === 'good') return toneColor('good')
  if (t === 'bad') return toneColor('bad')
  return colors.textMuted
}

// ----------------------------------------------------------------------------
// Bias chip
// ----------------------------------------------------------------------------

interface BiasChipProps {
  bias: MediaBias
}

function BiasChip({ bias }: BiasChipProps): React.JSX.Element {
  const color = BIAS_COLOR[bias]
  return (
    <View style={[styles.biasChip, { borderColor: color }]}>
      <View style={[styles.biasDot, { backgroundColor: color }]} />
      <Text style={[styles.biasLabel, { color }]}>{BIAS_LABEL[bias]}</Text>
    </View>
  )
}

// ----------------------------------------------------------------------------
// Signed mini-favor bar (-100..+100)
// ----------------------------------------------------------------------------

const FAVOR_BAR_WIDTH = 96

interface MiniFavorBarProps {
  favor: number
}

function MiniFavorBar({ favor }: MiniFavorBarProps): React.JSX.Element {
  const clamped = Math.max(-100, Math.min(100, favor))
  const half = FAVOR_BAR_WIDTH / 2
  const fillWidth = Math.round((Math.abs(clamped) / 100) * half)
  const positive = clamped >= 0
  const fillColor =
    clamped > 0 ? colors.good : clamped < 0 ? colors.bad : colors.textMuted
  const sign = clamped > 0 ? '+' : ''
  return (
    <View>
      <View style={[styles.miniTrack, { width: FAVOR_BAR_WIDTH }]}>
        <View style={styles.miniHalfLeft}>
          {!positive && fillWidth > 0 ? (
            <View
              style={[
                styles.miniFillLeft,
                { width: fillWidth, backgroundColor: fillColor },
              ]}
            />
          ) : null}
        </View>
        <View style={styles.miniDivider} />
        <View style={styles.miniHalfRight}>
          {positive && fillWidth > 0 ? (
            <View
              style={[
                styles.miniFillRight,
                { width: fillWidth, backgroundColor: fillColor },
              ]}
            />
          ) : null}
        </View>
      </View>
      <Text style={[styles.miniFavorText, { color: fillColor }]}>
        {sign}
        {Math.round(clamped)}
      </Text>
    </View>
  )
}

// ----------------------------------------------------------------------------
// Outlet card (horizontal scroll)
// ----------------------------------------------------------------------------

interface OutletCardProps {
  outlet: NewsOutlet
}

function OutletCard({ outlet }: OutletCardProps): React.JSX.Element {
  return (
    <View style={styles.outletCard}>
      <Text style={styles.outletName} numberOfLines={1}>
        {outlet.name}
      </Text>
      <BiasChip bias={outlet.bias} />
      <View style={styles.outletFavorBlock}>
        <Text style={styles.outletFavorLabel}>FAVOR</Text>
        <MiniFavorBar favor={outlet.favor} />
      </View>
    </View>
  )
}

// ----------------------------------------------------------------------------
// Headline card
// ----------------------------------------------------------------------------

interface HeadlineCardProps {
  item: NewsItem
  outlet?: NewsOutlet
}

function HeadlineCard({
  item,
  outlet,
}: HeadlineCardProps): React.JSX.Element {
  const tone = newsToneColor(item.tone)
  const outletName = outlet?.name ?? 'City Wire'
  return (
    <View style={[styles.headlineCard, { borderLeftColor: tone }]}>
      <View style={styles.headlineMeta}>
        {outlet ? <BiasChip bias={outlet.bias} /> : null}
        <Text style={styles.headlineOutlet} numberOfLines={1}>
          {outletName}
        </Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.headlineDate}>{quarterToDate(item.turn)}</Text>
      </View>
      <Text style={styles.headlineText}>{item.headline}</Text>
      {item.body ? (
        <Text style={styles.headlineBody} numberOfLines={3}>
          {item.body}
        </Text>
      ) : null}
    </View>
  )
}

// ----------------------------------------------------------------------------
// NewsTab
// ----------------------------------------------------------------------------

export default function NewsTab(): React.JSX.Element {
  const news = useNews()
  const outlets = useOutlets()

  const outletById = React.useMemo<Record<string, NewsOutlet>>(() => {
    const map: Record<string, NewsOutlet> = {}
    for (const o of outlets) map[o.id] = o
    return map
  }, [outlets])

  const headlines: NewsItem[] = React.useMemo(
    () => [...news].reverse(),
    [news],
  )

  return (
    <View style={styles.root}>
      {/* Outlets */}
      <Card title="Media Outlets" subtitle="Who controls the narrative.">
        {outlets.length === 0 ? (
          <Text style={styles.muted}>No outlets tracked yet.</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.outletsRow}
          >
            {outlets.map((o) => (
              <OutletCard key={o.id} outlet={o} />
            ))}
          </ScrollView>
        )}
      </Card>

      {/* Headlines */}
      <Card
        title="Headlines"
        subtitle="Newest first."
        rightAccessory={
          headlines.length > 0 ? (
            <Text style={styles.countBadge}>{headlines.length}</Text>
          ) : null
        }
      >
        {headlines.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyHeadline}>No headlines yet.</Text>
            <Text style={styles.emptyHint}>
              End a turn to see what the press is saying.
            </Text>
          </View>
        ) : (
          <View style={styles.headlineList}>
            {headlines.map((n, i) => (
              <HeadlineCard
                key={`${n.turn}-${i}`}
                item={n}
                outlet={n.outletId ? outletById[n.outletId] : undefined}
              />
            ))}
          </View>
        )}
      </Card>
    </View>
  )
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },

  // Bias chip
  biasChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.bgPanel,
    alignSelf: 'flex-start',
  },
  biasDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  biasLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.caption,
    letterSpacing: 0.3,
  },

  // Outlets
  outletsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  outletCard: {
    width: 160,
    backgroundColor: colors.bgPanelAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  outletName: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.body,
    color: colors.text,
  },
  outletFavorBlock: {
    marginTop: spacing.xs,
  },
  outletFavorLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.pixelSm,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },

  // Mini favor bar
  miniTrack: {
    height: 6,
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  miniHalfLeft: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  miniHalfRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  miniFillLeft: { height: '100%' },
  miniFillRight: { height: '100%' },
  miniDivider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.borderStrong,
  },
  miniFavorText: {
    fontFamily: fonts.mono,
    fontSize: sizes.bodyXs,
    marginTop: 2,
  },

  // Headlines
  headlineList: {
    gap: spacing.md,
  },
  headlineCard: {
    backgroundColor: colors.bgPanelAlt,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  headlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headlineOutlet: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyXs,
    color: colors.textDim,
    maxWidth: 140,
  },
  headlineDate: {
    fontFamily: fonts.body,
    fontSize: sizes.caption,
    color: colors.textMuted,
  },
  headlineText: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyLg,
    color: colors.text,
    lineHeight: 22,
  },
  headlineBody: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.textDim,
    lineHeight: 18,
  },

  // Empty / count
  emptyWrap: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyHeadline: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyLg,
    color: colors.text,
  },
  emptyHint: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  countBadge: {
    fontFamily: fonts.mono,
    fontSize: sizes.bodyLg,
    color: colors.textDim,
  },
  muted: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
})
