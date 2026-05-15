import React from 'react'
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native'
import { useGameStore, usePendingEvent } from '../../store/gameStore'
import { Panel } from '../ui/Panel'
import { PixelText } from '../ui/PixelText'
import { STAT_INFO } from '../../game/explanations'
import { formatMoney } from '../../game/util'
import { colors, fonts, sizes, spacing, radius } from '../../theme'
import type {
  CityStats,
  EventChoice,
  EventCategory,
  StatKey,
} from '../../game/types'

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

// Map an event category to a short pixel-chip label.
const CATEGORY_LABEL: Record<EventCategory, string> = {
  economic: 'ECONOMIC',
  social: 'SOCIAL',
  environmental: 'ENVIRONMENT',
  crisis: 'CRISIS',
  opportunity: 'OPPORTUNITY',
  political: 'POLITICAL',
  foreign: 'FOREIGN',
  tech: 'TECH',
  health: 'HEALTH',
}

// Map an event category to an accent color used on the chip and title underline.
const CATEGORY_COLOR: Record<EventCategory, string> = {
  economic: colors.govGold,
  social: colors.govBlue,
  environmental: colors.govGreen,
  crisis: colors.govRed,
  opportunity: colors.good,
  political: colors.govNavy,
  foreign: colors.borderStrong,
  tech: colors.govBlue,
  health: colors.govGreen,
}

interface PreviewChip {
  stat: StatKey
  delta: number
  tone: 'good' | 'bad' | 'neutral'
  arrow: '▲' | '▼' | '•'
}

// Determine if a delta on a given stat is good (green), bad (red) or neutral.
const tonalize = (stat: StatKey, delta: number): PreviewChip['tone'] => {
  if (delta === 0) return 'neutral'
  if (GOOD_IF_UP.has(stat)) return delta > 0 ? 'good' : 'bad'
  if (BAD_IF_UP.has(stat)) return delta > 0 ? 'bad' : 'good'
  return 'neutral'
}

const arrowFor = (delta: number): PreviewChip['arrow'] =>
  delta > 0 ? '▲' : delta < 0 ? '▼' : '•'

// Sort effects by magnitude and pick top N to preview.
const topEffects = (effects: Partial<CityStats>, n: number): PreviewChip[] => {
  const entries: PreviewChip[] = (
    Object.keys(effects) as StatKey[]
  )
    .filter((k) => effects[k] !== undefined && effects[k] !== 0)
    .map((k) => {
      const delta = effects[k] as number
      return {
        stat: k,
        delta,
        tone: tonalize(k, delta),
        arrow: arrowFor(delta),
      }
    })
  entries.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  return entries.slice(0, n)
}

const toneColor = (tone: PreviewChip['tone']): string =>
  tone === 'good' ? colors.good : tone === 'bad' ? colors.bad : colors.textDim

interface ChoiceCardProps {
  choice: EventChoice
  index: number
  onPress: (idx: number) => void
}

function ChoiceCard({ choice, index, onPress }: ChoiceCardProps): JSX.Element {
  const previews = topEffects(choice.effects, 3)
  const cost = choice.cost ?? 0
  return (
    <Pressable
      onPress={() => onPress(index)}
      style={({ pressed }) => [
        styles.choiceCard,
        pressed && styles.choiceCardPressed,
      ]}
    >
      <View style={styles.choiceTopRow}>
        <Text style={styles.choiceLabel} numberOfLines={2}>
          {choice.label}
        </Text>
        {cost > 0 ? (
          <View style={styles.costChip}>
            <PixelText size="xs" color={colors.govGold}>
              {`-${formatMoney(cost)}`}
            </PixelText>
          </View>
        ) : null}
      </View>

      {previews.length > 0 ? (
        <View style={styles.previewRow}>
          {previews.map((p) => (
            <View
              key={p.stat}
              style={[
                styles.previewChip,
                { borderColor: toneColor(p.tone) + '55' },
              ]}
            >
              <Text style={[styles.previewArrow, { color: toneColor(p.tone) }]}>
                {p.arrow}
              </Text>
              <Text style={styles.previewStat}>
                {STAT_INFO[p.stat].label}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.noEffect}>No measurable impact.</Text>
      )}
    </Pressable>
  )
}

export default function EventCardScreen(): JSX.Element {
  const event = usePendingEvent()
  const choose = useGameStore((s) => s.chooseEventOption)

  if (!event) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.emptyWrap}>
          <PixelText size="md" color={colors.textDim}>
            No event
          </PixelText>
        </View>
      </SafeAreaView>
    )
  }

  const accent = CATEGORY_COLOR[event.category]
  const handleChoose = (idx: number): void => {
    choose(idx)
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={[styles.categoryChip, { borderColor: accent }]}>
            <View style={[styles.categoryDot, { backgroundColor: accent }]} />
            <PixelText size="xs" color={accent} style={styles.categoryLabel}>
              {CATEGORY_LABEL[event.category]}
            </PixelText>
          </View>
          <PixelText size="xs" color={colors.textMuted}>
            INCIDENT
          </PixelText>
        </View>

        <Panel style={styles.card}>
          <PixelText
            size="md"
            color={colors.text}
            style={{ ...styles.title, textShadowColor: accent }}
          >
            {event.title}
          </PixelText>
          <View
            style={[styles.titleUnderline, { backgroundColor: accent }]}
          />

          <Text style={styles.description}>{event.description}</Text>

          {event.flavor ? (
            <View style={styles.flavorWrap}>
              <Text style={styles.flavorQuoteMark}>“</Text>
              <Text style={styles.flavor}>{event.flavor}</Text>
            </View>
          ) : null}

          <View style={styles.choicesHeader}>
            <View style={styles.choicesHeaderRule} />
            <PixelText size="xs" color={colors.textMuted}>
              YOUR MOVE
            </PixelText>
            <View style={styles.choicesHeaderRule} />
          </View>

          <View style={styles.choicesStack}>
            {event.choices.map((choice, i) => (
              <ChoiceCard
                key={`${event.id}-${i}`}
                choice={choice}
                index={i}
                onPress={handleChoose}
              />
            ))}
          </View>
        </Panel>

        <View style={styles.footer}>
          <PixelText size="xs" color={colors.textMuted} style={styles.footerText}>
            Each decision shapes your city.
          </PixelText>
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
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.bgElev,
    gap: spacing.xs + 2,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 1,
  },
  categoryLabel: {
    letterSpacing: 2,
  },
  card: {
    marginTop: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 6,
  },
  title: {
    textAlign: 'left',
    lineHeight: sizes.pixelMd + 8,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  titleUnderline: {
    marginTop: spacing.sm + 2,
    height: 2,
    width: 64,
    opacity: 0.8,
    marginBottom: spacing.md,
  },
  description: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    color: colors.text,
    lineHeight: sizes.monoMd + 6,
    paddingVertical: spacing.xs,
  },
  flavorWrap: {
    marginTop: spacing.md,
    flexDirection: 'row',
    backgroundColor: colors.bgElev,
    borderLeftWidth: 2,
    borderLeftColor: colors.borderStrong,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  flavorQuoteMark: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoLg,
    color: colors.textMuted,
    marginRight: spacing.sm,
    lineHeight: sizes.monoLg,
  },
  flavor: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.textDim,
    fontStyle: 'italic',
    lineHeight: sizes.monoSm + 6,
  },
  choicesHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  choicesHeaderRule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  choicesStack: {
    gap: spacing.sm + 2,
  },
  choiceCard: {
    backgroundColor: colors.bgPanelAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 3,
  },
  choiceCardPressed: {
    transform: [{ translateY: 1 }],
    shadowOpacity: 0,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgPanel,
  },
  choiceTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  choiceLabel: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    color: colors.text,
    lineHeight: sizes.monoMd + 4,
  },
  costChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    borderColor: colors.govGold,
    borderWidth: 1,
  },
  previewRow: {
    marginTop: spacing.sm + 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: colors.bg,
    gap: spacing.xs,
  },
  previewArrow: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
  },
  previewStat: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.text,
  },
  noEffect: {
    marginTop: spacing.sm,
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    letterSpacing: 2,
    textAlign: 'center',
  },
})
