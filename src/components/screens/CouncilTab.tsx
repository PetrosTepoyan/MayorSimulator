import React from 'react'
import { ScrollView, View, Text, StyleSheet } from 'react-native'
import { useFactions } from '../../store/gameStore'
import { politicalCapital, getActiveDemands } from '../../game/factions'
import { Panel } from '../ui/Panel'
import { PixelText } from '../ui/PixelText'
import { StatBar } from '../ui/StatBar'
import { colors, fonts, sizes, spacing, radius } from '../../theme'
import type { Faction, FactionType, PoliticalLeaning } from '../../game/types'

// ============================================================================
// Helpers
// ============================================================================

function capitalGaugeColor(value: number): string {
  if (value > 65) return colors.good
  if (value < 35) return colors.bad
  return colors.govGold
}

function capitalMood(value: number): string {
  if (value > 80) return 'Triumphant'
  if (value > 65) return 'Strong'
  if (value > 50) return 'Stable'
  if (value > 35) return 'Strained'
  if (value > 20) return 'Hostile'
  return 'Collapsing'
}

const TYPE_LABEL: Record<FactionType, string> = {
  council: 'Council',
  lobby: 'Lobby',
  union: 'Union',
  civic: 'Civic',
  business: 'Business',
}

const IDEOLOGY_LABEL: Record<PoliticalLeaning, string> = {
  progressive: 'Progressive',
  centrist: 'Centrist',
  conservative: 'Conservative',
}

function ideologyColor(ideo: PoliticalLeaning): string {
  switch (ideo) {
    case 'progressive':
      return colors.govBlue
    case 'conservative':
      return colors.govRed
    case 'centrist':
    default:
      return colors.govGold
  }
}

// ============================================================================
// Signed favor bar — center is 0, fills left (red) for negative, right (green) for positive.
// ============================================================================

interface FavorBarProps {
  value: number // -100..+100
}

function FavorBar({ value }: FavorBarProps): JSX.Element {
  const clamped = Math.max(-100, Math.min(100, value))
  const pct = Math.abs(clamped) // 0..100, half-width %
  const positive = clamped >= 0
  const fillColor = clamped > 0 ? colors.good : clamped < 0 ? colors.bad : colors.textMuted
  const sign = clamped > 0 ? '+' : ''

  return (
    <View style={styles.favorRow}>
      <View style={styles.favorLabelRow}>
        <Text style={styles.miniLabel}>Favor</Text>
        <Text style={[styles.miniValue, { color: fillColor }]}>
          {sign}
          {Math.round(clamped)}
        </Text>
      </View>
      <View style={styles.favorTrack}>
        {/* Left half (negative range) */}
        <View style={styles.favorHalfLeft}>
          {!positive ? (
            <View
              style={[
                styles.favorFillLeft,
                { width: `${pct}%`, backgroundColor: fillColor },
              ]}
            />
          ) : null}
        </View>
        {/* Center divider */}
        <View style={styles.favorCenter} />
        {/* Right half (positive range) */}
        <View style={styles.favorHalfRight}>
          {positive ? (
            <View
              style={[
                styles.favorFillRight,
                { width: `${pct}%`, backgroundColor: fillColor },
              ]}
            />
          ) : null}
        </View>
      </View>
      <View style={styles.favorScaleRow}>
        <Text style={styles.favorScaleLabel}>-100</Text>
        <Text style={styles.favorScaleLabel}>0</Text>
        <Text style={styles.favorScaleLabel}>+100</Text>
      </View>
    </View>
  )
}

// ============================================================================
// Chip
// ============================================================================

interface ChipProps {
  label: string
  color?: string
  bg?: string
}

function Chip({ label, color, bg }: ChipProps): JSX.Element {
  return (
    <View
      style={[
        styles.chip,
        bg ? { backgroundColor: bg } : null,
        color ? { borderColor: color } : null,
      ]}
    >
      <Text
        style={[styles.chipText, color ? { color } : null]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  )
}

// ============================================================================
// Faction card
// ============================================================================

interface FactionCardProps {
  faction: Faction
}

function FactionCard({ faction }: FactionCardProps): JSX.Element {
  const ideoColor = ideologyColor(faction.ideology)
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName} numberOfLines={1}>
          {faction.name}
        </Text>
        <View style={styles.chipRow}>
          <Chip label={TYPE_LABEL[faction.type]} color={colors.textDim} />
          <Chip label={IDEOLOGY_LABEL[faction.ideology]} color={ideoColor} />
        </View>
      </View>

      <Text style={styles.cardDescription} numberOfLines={2}>
        {faction.description}
      </Text>

      <FavorBar value={faction.favor} />

      <View style={styles.powerRow}>
        <StatBar label="Power" value={faction.power} />
      </View>

      {faction.demand ? (
        <View style={styles.demandBox}>
          <Text style={styles.demandLabel}>Top Demand</Text>
          <Text style={styles.demandText}>{faction.demand}</Text>
        </View>
      ) : null}
    </View>
  )
}

// ============================================================================
// CouncilTab — main export
// ============================================================================

export default function CouncilTab(): JSX.Element {
  const factions = useFactions()
  const capital = politicalCapital(factions)
  const demands = getActiveDemands(factions)
  const capitalColor = capitalGaugeColor(capital)

  const council = factions.filter((f) => f.type === 'council')
  const lobbies = factions.filter((f) => f.type !== 'council')

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Political Capital gauge */}
      <Panel title="Political Capital">
        <View style={styles.capitalHeader}>
          <View>
            <Text style={styles.capitalValue}>{capital}</Text>
            <Text style={styles.capitalMood}>{capitalMood(capital)}</Text>
          </View>
          <View style={styles.capitalLegend}>
            <PixelText size="xs" color={colors.textMuted}>
              Weighted Mood
            </PixelText>
            <Text style={styles.capitalHelp}>
              Aggregate of faction favor, weighted by power.
            </Text>
          </View>
        </View>
        <View style={styles.capitalBarWrap}>
          <StatBar label="Standing" value={capital} color={capitalColor} />
        </View>
      </Panel>

      {/* Active demands */}
      <Panel title="Active Demands">
        {demands.length === 0 ? (
          <Text style={styles.emptyText}>
            No active demands. The room is, for now, quiet.
          </Text>
        ) : (
          <View>
            {demands.map((d) => {
              const sign = d.favor > 0 ? '+' : ''
              const favorColor =
                d.favor > 0 ? colors.good : d.favor < 0 ? colors.bad : colors.textDim
              return (
                <View key={d.factionId} style={styles.demandRow}>
                  <View style={styles.demandHeaderRow}>
                    <Text style={styles.demandFaction} numberOfLines={1}>
                      {d.faction}
                    </Text>
                    <Text style={[styles.demandFavor, { color: favorColor }]}>
                      {sign}
                      {Math.round(d.favor)}
                    </Text>
                  </View>
                  <Text style={styles.demandRowText}>{d.demand}</Text>
                </View>
              )
            })}
          </View>
        )}
      </Panel>

      {/* City Council */}
      <Panel title="City Council">
        {council.length === 0 ? (
          <Text style={styles.emptyText}>No councilors seated.</Text>
        ) : (
          council.map((f) => <FactionCard key={f.id} faction={f} />)
        )}
      </Panel>

      {/* Lobbies & Civic Groups */}
      <Panel title="Lobbies & Civic Groups">
        {lobbies.length === 0 ? (
          <Text style={styles.emptyText}>No civic groups registered.</Text>
        ) : (
          lobbies.map((f) => <FactionCard key={f.id} faction={f} />)
        )}
      </Panel>
    </ScrollView>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // Political capital header
  capitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  capitalValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoXl,
    color: colors.text,
    lineHeight: sizes.monoXl + 2,
  },
  capitalMood: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelSm,
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  capitalLegend: {
    alignItems: 'flex-end',
    flexShrink: 1,
    marginLeft: spacing.md,
  },
  capitalHelp: {
    fontFamily: fonts.body,
    fontSize: sizes.body - 2,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
    maxWidth: 180,
  },
  capitalBarWrap: {
    marginTop: spacing.xs,
  },

  // Demands list
  emptyText: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  demandRow: {
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  demandHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  demandFaction: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.body,
    color: colors.text,
    flexShrink: 1,
    paddingRight: spacing.sm,
  },
  demandFavor: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
  },
  demandRowText: {
    fontFamily: fonts.body,
    fontSize: sizes.body - 1,
    color: colors.textDim,
  },

  // Faction card
  card: {
    backgroundColor: colors.bgPanelAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  cardName: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    color: colors.text,
    flexShrink: 1,
    paddingRight: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cardDescription: {
    fontFamily: fonts.body,
    fontSize: sizes.body - 1,
    color: colors.textDim,
    marginBottom: spacing.sm,
  },

  // Chip
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginLeft: spacing.xs,
  },
  chipText: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelXs,
    color: colors.textDim,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Favor bar (signed)
  favorRow: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  favorLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  miniLabel: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelXs,
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  miniValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
  },
  favorTrack: {
    height: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  favorHalfLeft: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  favorHalfRight: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  favorFillLeft: {
    height: '100%',
  },
  favorFillRight: {
    height: '100%',
  },
  favorCenter: {
    width: 2,
    height: '100%',
    backgroundColor: colors.borderStrong,
  },
  favorScaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  favorScaleLabel: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm - 4,
    color: colors.textMuted,
  },

  // Power row spacing
  powerRow: {
    marginTop: spacing.xs,
  },

  // Demand box on card
  demandBox: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  demandLabel: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelXs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  demandText: {
    fontFamily: fonts.body,
    fontSize: sizes.body - 1,
    color: colors.textDim,
    fontStyle: 'italic',
  },
})
