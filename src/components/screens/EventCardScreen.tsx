import React from 'react'
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { useGameStore, usePendingEvent } from '../../store/gameStore'
import { Card } from '../ui/Card'
import { PixelText } from '../ui/PixelText'
import { STAT_INFO } from '../../game/explanations'
import { formatMoney } from '../../game/util'
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
  CityStats,
  EventChoice,
  EventCategory,
  StatKey,
} from '../../game/types'

// ============================================================================
// EventCardScreen — modal-style event presenter.
// Hero card with the event title + description, optional flavor quote, then
// each choice as its own tappable card with effect preview chips.
// ============================================================================

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

type ChipTone = 'good' | 'bad' | 'neutral'

const tonalize = (stat: StatKey, delta: number): ChipTone => {
  if (delta === 0) return 'neutral'
  if (GOOD_IF_UP.has(stat)) return delta > 0 ? 'good' : 'bad'
  if (BAD_IF_UP.has(stat)) return delta > 0 ? 'bad' : 'good'
  return 'neutral'
}

const arrowFor = (delta: number): string =>
  delta > 0 ? '▲' : delta < 0 ? '▼' : '•'

interface PreviewChip {
  stat: StatKey
  delta: number
  tone: ChipTone
}

const topEffects = (effects: Partial<CityStats>, n: number): PreviewChip[] => {
  const entries: PreviewChip[] = (Object.keys(effects) as StatKey[])
    .filter((k) => effects[k] !== undefined && effects[k] !== 0)
    .map((k) => {
      const delta = effects[k] as number
      return { stat: k, delta, tone: tonalize(k, delta) }
    })
  entries.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  return entries.slice(0, n)
}

// Category-to-tint mapping for the hero card
const heroTint = (cat: EventCategory): 'default' | 'gold' | 'primary' | 'soft' => {
  if (cat === 'crisis') return 'gold'
  if (cat === 'opportunity') return 'primary'
  return 'default'
}

// Category-to-chip-tone mapping for the eyebrow chip
const categoryToneColor = (cat: EventCategory): string => {
  switch (cat) {
    case 'crisis':
      return colors.bad
    case 'opportunity':
      return colors.good
    case 'economic':
      return colors.gold
    case 'environmental':
      return colors.good
    case 'health':
      return colors.teal
    case 'social':
    case 'political':
      return colors.primary
    case 'foreign':
    case 'tech':
    default:
      return colors.textDim
  }
}

const categoryToneBg = (cat: EventCategory): string => {
  switch (cat) {
    case 'crisis':
      return colors.redSoft
    case 'opportunity':
      return colors.greenSoft
    case 'economic':
      return colors.goldSoft
    case 'environmental':
      return colors.greenSoft
    case 'health':
      return colors.tealSoft
    case 'social':
    case 'political':
      return colors.primarySoft
    case 'foreign':
    case 'tech':
    default:
      return colors.bgPanelAlt
  }
}

interface ChoiceCardProps {
  choice: EventChoice
  index: number
  onPress: (idx: number) => void
}

function ChoiceCard({ choice, index, onPress }: ChoiceCardProps): React.JSX.Element {
  const previews = topEffects(choice.effects, 4)
  const cost = choice.cost ?? 0
  return (
    <Card
      tint="soft"
      onPress={() => onPress(index)}
      style={styles.choiceCard}
    >
      <View style={styles.choiceTopRow}>
        <Text style={styles.choiceLabel} numberOfLines={3}>
          {choice.label}
        </Text>
        {cost > 0 ? (
          <View style={styles.costChip}>
            <Text style={styles.costChipText}>-{formatMoney(cost)}</Text>
          </View>
        ) : null}
      </View>

      {previews.length > 0 ? (
        <View style={styles.previewRow}>
          {previews.map((p) => (
            <View
              key={p.stat}
              style={[
                styles.previewPill,
                {
                  backgroundColor: toneSoftBg(p.tone),
                  borderColor: toneColor(p.tone),
                },
              ]}
            >
              <Text style={[styles.previewArrow, { color: toneColor(p.tone) }]}>
                {arrowFor(p.delta)}
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
    </Card>
  )
}

export default function EventCardScreen(): React.JSX.Element {
  const event = usePendingEvent()
  const choose = useGameStore((s) => s.chooseEventOption)

  if (!event) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No event</Text>
        </View>
      </SafeAreaView>
    )
  }

  const handleChoose = (idx: number): void => {
    choose(idx)
  }

  const chipColor = categoryToneColor(event.category)
  const chipBg = categoryToneBg(event.category)
  const tint = heroTint(event.category)

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Eyebrow chip */}
        <View style={styles.eyebrowRow}>
          <View
            style={[
              styles.categoryChip,
              { backgroundColor: chipBg, borderColor: chipColor },
            ]}
          >
            <PixelText size="sm" color={chipColor}>
              {CATEGORY_LABEL[event.category]}
            </PixelText>
          </View>
        </View>

        {/* Hero event card */}
        <Card tint={tint} style={styles.heroCard}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventDescription}>{event.description}</Text>

          {event.flavor ? (
            <Card tint="soft" flat style={styles.flavorCard}>
              <View style={styles.flavorRow}>
                <Text style={styles.flavorQuote}>“</Text>
                <Text style={styles.flavorText}>{event.flavor}</Text>
              </View>
            </Card>
          ) : null}
        </Card>

        {/* Choices */}
        <View style={styles.choicesHeader}>
          <Text style={styles.choicesTitle}>Your decision</Text>
          <PixelText size="xs" color={colors.textMuted}>
            {event.choices.length} OPTION{event.choices.length === 1 ? '' : 'S'}
          </PixelText>
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

        <Text style={styles.footerHint}>Decisions cascade. No going back.</Text>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textDim,
  },

  // Eyebrow
  eyebrowRow: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },

  // Hero card
  heroCard: {
    marginVertical: 0,
  },
  eventTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.titleLg,
    color: colors.text,
    lineHeight: sizes.titleLg + 6,
    marginBottom: spacing.sm,
  },
  eventDescription: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyLg,
    color: colors.text,
    lineHeight: sizes.bodyLg + 8,
  },
  flavorCard: {
    marginTop: spacing.md,
    marginVertical: 0,
  },
  flavorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  flavorQuote: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoLg,
    color: colors.textMuted,
    lineHeight: sizes.monoLg,
  },
  flavorText: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.textDim,
    fontStyle: 'italic',
    lineHeight: sizes.monoSm + 6,
  },

  // Choices
  choicesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  choicesTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.title,
    color: colors.text,
  },
  choicesStack: {
    gap: spacing.sm,
  },
  choiceCard: {
    marginVertical: 0,
  },
  choiceTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  choiceLabel: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyLg,
    color: colors.text,
    lineHeight: sizes.bodyLg + 6,
  },
  costChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.goldSoft,
    borderColor: colors.gold,
    borderWidth: 1,
  },
  costChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyXs,
    color: colors.navy,
    letterSpacing: 0.3,
  },
  previewRow: {
    marginTop: spacing.sm + 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: spacing.xs,
  },
  previewArrow: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyXs,
  },
  previewStat: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.text,
  },
  noEffect: {
    marginTop: spacing.sm,
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  footerHint: {
    marginTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
})
