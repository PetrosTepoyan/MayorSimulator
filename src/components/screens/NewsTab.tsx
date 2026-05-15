import React from 'react'
import { ScrollView, View, Text, StyleSheet } from 'react-native'
import { useNews, useOutlets } from '../../store/gameStore'
import { Panel } from '../ui/Panel'
import { PixelText } from '../ui/PixelText'
import { quarterToDate } from '../../game/util'
import { colors, fonts, sizes, spacing, radius } from '../../theme'
import type { NewsItem, NewsOutlet, MediaBias } from '../../game/types'

// ----------------------------------------------------------------------------
// Constants — bias chip colors, tone borders
// ----------------------------------------------------------------------------

const BIAS_COLOR: Record<MediaBias, string> = {
  left: '#3b82f6', // blue
  center: '#71717a', // gray
  right: '#dc2626', // red
  tabloid: '#a855f7', // purple
}

const BIAS_LABEL: Record<MediaBias, string> = {
  left: 'LEFT',
  center: 'CENTER',
  right: 'RIGHT',
  tabloid: 'TABLOID',
}

const toneColor = (tone: NewsItem['tone']): string =>
  tone === 'good' ? colors.good : tone === 'bad' ? colors.bad : colors.textDim

// ----------------------------------------------------------------------------
// BiasChip — color-coded pill for media bias
// ----------------------------------------------------------------------------

interface BiasChipProps {
  bias: MediaBias
  size?: 'sm' | 'md'
}

function BiasChip({ bias, size = 'sm' }: BiasChipProps): JSX.Element {
  const color = BIAS_COLOR[bias]
  const label = BIAS_LABEL[bias]
  const isSm = size === 'sm'
  return (
    <View
      style={[
        styles.chip,
        { borderColor: color },
        isSm ? styles.chipSm : styles.chipMd,
      ]}
    >
      <View
        style={[
          styles.chipDot,
          { backgroundColor: color },
          isSm && styles.chipDotSm,
        ]}
      />
      <Text
        style={[
          styles.chipLabel,
          { color },
          isSm && styles.chipLabelSm,
        ]}
      >
        {label}
      </Text>
    </View>
  )
}

// ----------------------------------------------------------------------------
// FavorBar — signed horizontal mini bar (max 80px wide)
// ----------------------------------------------------------------------------

const FAVOR_BAR_MAX = 80

interface FavorBarProps {
  favor: number // -100..100
}

function FavorBar({ favor }: FavorBarProps): JSX.Element {
  const clamped = Math.max(-100, Math.min(100, favor))
  const width = Math.round((Math.abs(clamped) / 100) * FAVOR_BAR_MAX)
  const fill = clamped >= 0 ? colors.good : colors.bad
  const sign = clamped > 0 ? '+' : ''
  return (
    <View style={styles.favorWrap}>
      <View style={styles.favorTrack}>
        <View
          style={[
            styles.favorFill,
            { width, backgroundColor: fill },
          ]}
        />
      </View>
      <Text style={[styles.favorValue, { color: fill }]}>
        {sign}
        {Math.round(clamped)}
      </Text>
    </View>
  )
}

// ----------------------------------------------------------------------------
// OutletCard — horizontal-scroll item summarizing one outlet
// ----------------------------------------------------------------------------

interface OutletCardProps {
  outlet: NewsOutlet
}

function OutletCard({ outlet }: OutletCardProps): JSX.Element {
  return (
    <View style={styles.outletCard}>
      <Text style={styles.outletName} numberOfLines={1}>
        {outlet.name}
      </Text>
      <View style={styles.outletChipRow}>
        <BiasChip bias={outlet.bias} size="sm" />
      </View>
      <Text style={styles.outletFavorLabel}>FAVOR</Text>
      <FavorBar favor={outlet.favor} />
    </View>
  )
}

// ----------------------------------------------------------------------------
// HeadlineCard — newspaper-style row with tone left border
// ----------------------------------------------------------------------------

interface HeadlineCardProps {
  item: NewsItem
  outlet?: NewsOutlet
}

function HeadlineCard({ item, outlet }: HeadlineCardProps): JSX.Element {
  const border = toneColor(item.tone)
  const outletName = outlet?.name ?? 'CITY WIRE'
  return (
    <View style={styles.headlineCard}>
      <View style={[styles.toneBorder, { backgroundColor: border }]} />
      <View style={styles.headlineBody}>
        <View style={styles.metaRow}>
          <Text style={styles.outletInline} numberOfLines={1}>
            {outletName}
          </Text>
          {outlet ? <BiasChip bias={outlet.bias} size="sm" /> : null}
          <View style={styles.metaSpacer} />
          <Text style={styles.turnText}>{quarterToDate(item.turn)}</Text>
        </View>
        <Text style={styles.headlineText}>{item.headline}</Text>
        {item.body ? (
          <Text style={styles.bodyText} numberOfLines={3}>
            {item.body}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

// ----------------------------------------------------------------------------
// Main tab
// ----------------------------------------------------------------------------

export default function NewsTab(): JSX.Element {
  const news = useNews()
  const outlets = useOutlets()

  // Index outlets by id for O(1) lookup when rendering headlines
  const outletById: Record<string, NewsOutlet> = React.useMemo(() => {
    const map: Record<string, NewsOutlet> = {}
    for (const o of outlets) map[o.id] = o
    return map
  }, [outlets])

  // Newest first
  const headlines: NewsItem[] = React.useMemo(
    () => [...news].reverse(),
    [news],
  )

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Outlets panel */}
      <Panel title="Media Outlets">
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
      </Panel>

      {/* Headlines panel */}
      <Panel
        title="Headlines"
        rightAccessory={
          headlines.length > 0 ? (
            <PixelText size="xs" color={colors.textMuted}>
              {`${headlines.length}`}
            </PixelText>
          ) : null
        }
      >
        {headlines.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No headlines yet.</Text>
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
      </Panel>
    </ScrollView>
  )
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + spacing.xxl,
    gap: spacing.sm,
  },

  // Chip — bias pill
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.bgPanelAlt,
  },
  chipSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  chipMd: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  chipDotSm: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  chipLabel: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelXs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chipLabelSm: {
    fontSize: sizes.pixelXs,
  },

  // Outlet horizontal row
  outletsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  outletCard: {
    width: 140,
    backgroundColor: colors.bgPanelAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  outletName: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.text,
    lineHeight: sizes.monoSm + 2,
  },
  outletChipRow: {
    flexDirection: 'row',
  },
  outletFavorLabel: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelXs,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginTop: spacing.xs,
  },

  // Favor bar
  favorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  favorTrack: {
    width: FAVOR_BAR_MAX,
    height: 6,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  favorFill: {
    height: '100%',
  },
  favorValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm - 2,
    minWidth: 28,
    textAlign: 'right',
  },

  // Headline list
  headlineList: {
    gap: spacing.sm,
  },
  headlineCard: {
    flexDirection: 'row',
    backgroundColor: colors.bgPanelAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  toneBorder: {
    width: 4,
  },
  headlineBody: {
    flex: 1,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  outletInline: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.textDim,
    maxWidth: 130,
  },
  metaSpacer: {
    flex: 1,
  },
  turnText: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelXs,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  headlineText: {
    fontFamily: fonts.mono,
    fontSize: 16,
    color: colors.text,
    lineHeight: 20,
    marginTop: 2,
  },
  bodyText: {
    fontFamily: fonts.body,
    fontSize: sizes.body - 1,
    color: colors.textDim,
    lineHeight: 16,
    marginTop: 2,
  },

  // Empty / muted
  emptyWrap: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyText: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    color: colors.textDim,
  },
  emptyHint: {
    fontFamily: fonts.body,
    fontSize: sizes.body - 1,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  muted: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
})
