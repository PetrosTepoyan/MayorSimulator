import React from 'react'
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native'
import { colors, fonts, sizes, radius, spacing, toneColor, Tone } from '../../theme'

interface StatTileProps {
  label: string
  value: string
  delta?: number       // pass for ▲/▼ indicator
  unit?: string
  tone?: Tone          // override tone for the value
  onPress?: () => void
  small?: boolean
  style?: ViewStyle
}

// A single stat readout with optional delta arrow. Tap to learn more.
export function StatTile({
  label,
  value,
  delta,
  unit,
  tone = 'neutral',
  onPress,
  small,
  style,
}: StatTileProps) {
  const deltaText =
    delta !== undefined && Math.abs(delta) > 0.05
      ? `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(Math.abs(delta) >= 10 ? 0 : 1)}`
      : null
  const deltaTone: Tone =
    delta === undefined ? 'neutral' : delta > 0 ? 'good' : delta < 0 ? 'bad' : 'neutral'

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.tile,
        small && styles.tileSmall,
        pressed && onPress ? styles.pressed : null,
        style,
      ]}
    >
      <Text style={[styles.label, small && { fontSize: sizes.pixelXs }]}>{label}</Text>
      <View style={styles.row}>
        <Text style={[styles.value, small && { fontSize: sizes.monoMd }, { color: toneColor(tone) }]}>
          {value}
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        </Text>
      </View>
      {deltaText ? (
        <Text style={[styles.delta, { color: toneColor(deltaTone) }]}>{deltaText}</Text>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.bgPanelAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minWidth: 100,
    flexGrow: 1,
    flexBasis: 0,
  },
  tileSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  pressed: {
    backgroundColor: colors.bgPanel,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  label: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelSm - 1,
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  value: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoLg,
    color: colors.text,
    lineHeight: sizes.monoLg + 2,
  },
  unit: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.textMuted,
    marginLeft: 2,
  },
  delta: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    marginTop: 2,
  },
})
