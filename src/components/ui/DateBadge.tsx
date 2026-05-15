import React from 'react'
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native'
import { colors, fonts, sizes, radius, spacing, elevation, seasonForTurn } from '../../theme'

interface DateBadgeProps {
  turn: number
  startYear?: number       // default 2025
  termLengthYears: number
  termsServed: number
  onPress?: () => void
  style?: ViewStyle
  compact?: boolean
}

// GameDev-Tycoon-flavored date badge.
// Big quarter label, season icon, year, plus a progress bar showing time within term.
export function DateBadge({
  turn,
  startYear = 2025,
  termLengthYears,
  termsServed,
  onPress,
  style,
  compact = false,
}: DateBadgeProps) {
  const year = startYear + Math.floor(turn / 4)
  const quarter = (turn % 4) + 1
  const season = seasonForTurn(turn)

  const quartersPerTerm = termLengthYears * 4
  const turnInTerm = turn - termsServed * quartersPerTerm
  const termPct = Math.min(100, Math.max(0, (turnInTerm / quartersPerTerm) * 100))

  const Container: React.ComponentType<any> = onPress ? Pressable : View

  return (
    <Container
      onPress={onPress}
      style={[styles.badge, compact && styles.badgeCompact, { backgroundColor: season.tint }, style]}
    >
      <View style={styles.row}>
        <Text style={[styles.season, { color: season.text }]}>{season.icon}</Text>
        <View style={styles.dateText}>
          <Text style={[styles.seasonLabel, { color: season.text }]} numberOfLines={1}>
            {season.name.toUpperCase()} • Q{quarter}
          </Text>
          <Text style={[styles.year, compact && styles.yearCompact]}>{year}</Text>
        </View>
      </View>
      {!compact ? (
        <View style={styles.termRow}>
          <Text style={styles.termText}>
            Term {termsServed + 1} • Y{Math.floor(turnInTerm / 4) + 1}/{termLengthYears}
          </Text>
          <View style={styles.termTrack}>
            <View style={[styles.termFill, { width: `${termPct}%` }]} />
          </View>
        </View>
      ) : null}
    </Container>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 160,
    ...elevation.sm,
  },
  badgeCompact: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 110,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  season: { fontSize: 26 },
  dateText: { flex: 1 },
  seasonLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.caption,
    letterSpacing: 1,
  },
  year: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd + 4,
    color: colors.navy,
    lineHeight: sizes.monoMd + 8,
  },
  yearCompact: {
    fontSize: sizes.monoMd,
    lineHeight: sizes.monoMd + 2,
  },
  termRow: {
    marginTop: spacing.sm,
  },
  termText: {
    fontFamily: fonts.body,
    fontSize: sizes.caption,
    color: colors.textDim,
    marginBottom: 4,
  },
  termTrack: {
    height: 4,
    backgroundColor: 'rgba(28,43,62,0.08)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  termFill: {
    height: '100%',
    backgroundColor: colors.navy,
    borderRadius: 999,
  },
})
