import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, fonts, sizes, radius, spacing } from '../../theme'

interface StatBarProps {
  label: string
  value: number              // 0-100
  max?: number
  color?: string
  inverted?: boolean         // true if lower is better (crime, pollution, inequality, unemployment)
  showValue?: boolean
}

// Horizontal bar with pixel-styled fill, used for 0-100 stats.
export function StatBar({
  label,
  value,
  max = 100,
  color,
  inverted = false,
  showValue = true,
}: StatBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))

  // Auto-color: high = good unless inverted
  let barColor = color
  if (!barColor) {
    const score = inverted ? 100 - value : value
    if (score >= 65) barColor = colors.good
    else if (score >= 35) barColor = colors.govGold
    else barColor = colors.bad
  }

  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {showValue ? <Text style={styles.value}>{value.toFixed(0)}</Text> : null}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    marginVertical: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  label: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelXs,
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.text,
  },
  track: {
    height: 6,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  fill: {
    height: '100%',
    borderRadius: 0,
  },
})
