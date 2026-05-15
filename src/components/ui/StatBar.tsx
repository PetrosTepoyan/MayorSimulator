import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, fonts, sizes, radius, spacing } from '../../theme'

interface StatBarProps {
  label: string
  value: number              // 0-100
  max?: number
  color?: string
  inverted?: boolean
  showValue?: boolean
  icon?: string
}

// Horizontal progress bar — clean modern style.
export function StatBar({
  label,
  value,
  max = 100,
  color,
  inverted = false,
  showValue = true,
  icon,
}: StatBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))

  let barColor = color
  if (!barColor) {
    const score = inverted ? 100 - value : value
    if (score >= 65) barColor = colors.good
    else if (score >= 35) barColor = colors.gold
    else barColor = colors.bad
  }

  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <View style={styles.labelLeft}>
          {icon ? <Text style={styles.icon}>{icon}</Text> : null}
          <Text style={styles.label}>{label}</Text>
        </View>
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
    marginVertical: spacing.xs + 1,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  labelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: { fontSize: 12 },
  label: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.textDim,
    letterSpacing: 0.2,
  },
  value: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyXs,
    color: colors.text,
  },
  track: {
    height: 8,
    backgroundColor: colors.divider,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.sm,
  },
})
