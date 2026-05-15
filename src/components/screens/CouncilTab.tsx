import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useFactions } from '../../store/gameStore'
import { politicalCapital, getActiveDemands } from '../../game/factions'
import { Card } from '../ui/Card'
import { StatBar } from '../ui/StatBar'
import { colors, fonts, sizes, spacing, radius } from '../../theme'
import type { Faction, FactionType, PoliticalLeaning } from '../../game/types'

// ----------------------------------------------------------------------------
// Lookups
// ----------------------------------------------------------------------------

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

const IDEOLOGY_COLOR: Record<PoliticalLeaning, string> = {
  progressive: colors.lean_progressive,
  centrist: colors.lean_centrist,
  conservative: colors.lean_conservative,
}

function capitalMood(value: number): string {
  if (value > 80) return 'Triumphant'
  if (value > 65) return 'Strong'
  if (value > 50) return 'Stable'
  if (value > 35) return 'Strained'
  if (value > 20) return 'Hostile'
  return 'Collapsing'
}

function capitalTint(value: number): 'default' | 'primary' | 'gold' {
  if (value > 65) return 'primary'
  if (value < 35) return 'gold'
  return 'default'
}

// ----------------------------------------------------------------------------
// Signed favor bar (-100..+100)
// ----------------------------------------------------------------------------

interface SignedFavorBarProps {
  favor: number
  width?: number
}

function SignedFavorBar({
  favor,
  width = 160,
}: SignedFavorBarProps): React.JSX.Element {
  const clamped = Math.max(-100, Math.min(100, favor))
  const halfWidth = width / 2
  const fillWidth = Math.round((Math.abs(clamped) / 100) * halfWidth)
  const positive = clamped >= 0
  const fillColor = clamped > 0 ? colors.good : clamped < 0 ? colors.bad : colors.textMuted
  const sign = clamped > 0 ? '+' : ''

  return (
    <View>
      <View style={[styles.signedTrack, { width }]}>
        <View style={styles.signedHalfLeft}>
          {!positive && fillWidth > 0 ? (
            <View
              style={[
                styles.signedFillLeft,
                { width: fillWidth, backgroundColor: fillColor },
              ]}
            />
          ) : null}
        </View>
        <View style={styles.signedDivider} />
        <View style={styles.signedHalfRight}>
          {positive && fillWidth > 0 ? (
            <View
              style={[
                styles.signedFillRight,
                { width: fillWidth, backgroundColor: fillColor },
              ]}
            />
          ) : null}
        </View>
      </View>
      <View style={[styles.signedScaleRow, { width }]}>
        <Text style={styles.signedScaleText}>-100</Text>
        <Text style={[styles.signedScaleText, { color: fillColor }]}>
          {sign}
          {Math.round(clamped)}
        </Text>
        <Text style={styles.signedScaleText}>+100</Text>
      </View>
    </View>
  )
}

// ----------------------------------------------------------------------------
// Chip
// ----------------------------------------------------------------------------

interface ChipProps {
  label: string
  color: string
}

function Chip({ label, color }: ChipProps): React.JSX.Element {
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  )
}

// ----------------------------------------------------------------------------
// Faction row
// ----------------------------------------------------------------------------

interface FactionRowProps {
  faction: Faction
  expanded: boolean
  onToggle: () => void
}

function FactionRow({
  faction,
  expanded,
  onToggle,
}: FactionRowProps): React.JSX.Element {
  const ideoColor = IDEOLOGY_COLOR[faction.ideology]
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.factionRow,
        pressed && { opacity: 0.95 },
      ]}
    >
      <View style={styles.factionTop}>
        <View style={styles.factionTitleCol}>
          <Text style={styles.factionName} numberOfLines={1}>
            {faction.name}
          </Text>
          <View style={styles.factionChips}>
            <Chip label={IDEOLOGY_LABEL[faction.ideology]} color={ideoColor} />
            <Chip label={TYPE_LABEL[faction.type]} color={colors.textDim} />
          </View>
        </View>
        <Text style={styles.factionCaret}>{expanded ? '▾' : '▸'}</Text>
      </View>

      {/* Signed favor + power bar */}
      <View style={styles.factionBarRow}>
        <SignedFavorBar favor={faction.favor} />
        <View style={styles.powerBlock}>
          <StatBar
            label="Power"
            value={faction.power}
            color={colors.navy}
          />
        </View>
      </View>

      {expanded ? (
        <View style={styles.factionExpanded}>
          <Text style={styles.factionDescription}>{faction.description}</Text>
          {faction.demand ? (
            <View style={styles.demandBox}>
              <Text style={styles.demandLabel}>Top demand</Text>
              <Text style={styles.demandText}>{faction.demand}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  )
}

// ----------------------------------------------------------------------------
// CouncilTab
// ----------------------------------------------------------------------------

export default function CouncilTab(): React.JSX.Element {
  const factions = useFactions()
  const capital = politicalCapital(factions)
  const demands = getActiveDemands(factions)
  const council = factions.filter((f) => f.type === 'council')
  const lobbies = factions.filter((f) => f.type !== 'council')

  const [expanded, setExpanded] = useState<string | null>(null)

  const toggle = (id: string): void => {
    setExpanded(expanded === id ? null : id)
  }

  return (
    <View style={styles.root}>
      {/* Political Capital */}
      <Card
        title="Political Capital"
        subtitle="How much room you have to push policy."
        tint={capitalTint(capital)}
      >
        <View style={styles.capitalRow}>
          <Text style={styles.capitalValue}>{capital}</Text>
          <View style={styles.capitalMoodCol}>
            <Text style={styles.capitalMoodLabel}>STANDING</Text>
            <Text style={styles.capitalMood}>{capitalMood(capital)}</Text>
          </View>
        </View>
        <View style={styles.capitalBar}>
          <StatBar
            label="Standing across all factions"
            value={capital}
          />
        </View>
      </Card>

      {/* Active demands */}
      <Card title="Active Demands" subtitle="What the city is pressing for.">
        {demands.length === 0 ? (
          <Text style={styles.muted}>
            The room is, for now, quiet. No pressing demands.
          </Text>
        ) : (
          <View style={styles.demandsList}>
            {demands.map((d) => {
              const favorColor =
                d.favor > 0
                  ? colors.good
                  : d.favor < 0
                    ? colors.bad
                    : colors.textDim
              const sign = d.favor > 0 ? '+' : ''
              return (
                <View key={d.factionId} style={styles.demandRow}>
                  <View style={styles.demandHeaderRow}>
                    <Text style={styles.demandFactionName} numberOfLines={1}>
                      {d.faction}
                    </Text>
                    <Text style={[styles.demandFavor, { color: favorColor }]}>
                      {sign}
                      {Math.round(d.favor)}
                    </Text>
                  </View>
                  <Text style={styles.demandText}>{d.demand}</Text>
                </View>
              )
            })}
          </View>
        )}
      </Card>

      {/* City Council */}
      <Card title="City Council" subtitle="Sitting councilors who vote on motions.">
        {council.length === 0 ? (
          <Text style={styles.muted}>No councilors seated.</Text>
        ) : (
          <View style={styles.factionsBlock}>
            {council.map((f) => (
              <FactionRow
                key={f.id}
                faction={f}
                expanded={expanded === f.id}
                onToggle={() => toggle(f.id)}
              />
            ))}
          </View>
        )}
      </Card>

      {/* Lobbies & Civic Groups */}
      <Card
        title="Lobbies & Civic Groups"
        subtitle="Outside groups who lobby the room."
      >
        {lobbies.length === 0 ? (
          <Text style={styles.muted}>No civic groups registered.</Text>
        ) : (
          <View style={styles.factionsBlock}>
            {lobbies.map((f) => (
              <FactionRow
                key={f.id}
                faction={f}
                expanded={expanded === f.id}
                onToggle={() => toggle(f.id)}
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

  // Political capital
  capitalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  capitalValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoXl,
    color: colors.text,
    lineHeight: sizes.monoXl + 2,
  },
  capitalMoodCol: {
    alignItems: 'flex-end',
  },
  capitalMoodLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.pixelSm,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  capitalMood: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.title,
    color: colors.text,
    marginTop: 2,
  },
  capitalBar: {
    marginTop: spacing.xs,
  },

  // Demands list
  demandsList: {
    gap: spacing.xs,
  },
  demandRow: {
    paddingVertical: spacing.sm,
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
  },
  demandHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  demandFactionName: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.body,
    color: colors.text,
    flex: 1,
    paddingRight: spacing.sm,
  },
  demandFavor: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.body,
  },
  demandText: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.textDim,
    lineHeight: 18,
  },

  // Factions block
  factionsBlock: {
    gap: spacing.sm,
  },
  factionRow: {
    backgroundColor: colors.bgPanelAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  factionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  factionTitleCol: {
    flex: 1,
  },
  factionName: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyLg,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  factionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  factionCaret: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.title,
    color: colors.textDim,
  },

  factionBarRow: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  powerBlock: {},

  factionExpanded: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  factionDescription: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.textDim,
    lineHeight: 18,
  },
  demandBox: {
    backgroundColor: colors.bgPanel,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
  },
  demandLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.pixelSm,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },

  // Chip
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.bgPanel,
  },
  chipText: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.caption,
  },

  // Signed favor bar
  signedTrack: {
    height: 10,
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    borderColor: colors.border,
    borderWidth: 1,
    overflow: 'hidden',
  },
  signedHalfLeft: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  signedHalfRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  signedFillLeft: {
    height: '100%',
  },
  signedFillRight: {
    height: '100%',
  },
  signedDivider: {
    width: 2,
    height: '100%',
    backgroundColor: colors.borderStrong,
  },
  signedScaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  signedScaleText: {
    fontFamily: fonts.body,
    fontSize: sizes.caption,
    color: colors.textMuted,
  },

  // Common
  muted: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
})
