import React from 'react'
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native'
import { colors, fonts, sizes, radius, spacing, elevation, toneColor, toneSoftBg, Tone } from '../../theme'

interface StatTileProps {
  label: string
  value: string
  delta?: number
  unit?: string
  tone?: Tone
  onPress?: () => void
  small?: boolean
  icon?: string
  style?: ViewStyle
}

// Clean modern stat tile — white card, big value, small label.
export function StatTile({
  label,
  value,
  delta,
  unit,
  tone = 'neutral',
  onPress,
  small,
  icon,
  style,
}: StatTileProps) {
  const deltaText =
    delta !== undefined && Math.abs(delta) > 0.05
      ? `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(Math.abs(delta) >= 10 ? 0 : 1)}`
      : null
  const deltaTone: Tone =
    delta === undefined ? 'neutral' : delta > 0 ? 'good' : delta < 0 ? 'bad' : 'neutral'

  const inner = (
    <>
      <View style={styles.labelRow}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text style={[styles.label, small && { fontSize: sizes.caption - 1 }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={styles.valueRow}>
        <Text
          style={[
            styles.value,
            small && { fontSize: sizes.monoMd },
            { color: tone === 'neutral' ? colors.text : toneColor(tone) },
          ]}
          numberOfLines={1}
        >
          {value}
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        </Text>
      </View>
      {deltaText ? (
        <Text style={[styles.delta, { color: toneColor(deltaTone) }]}>{deltaText}</Text>
      ) : null}
    </>
  )

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.tile, small && styles.tileSmall, pressed && styles.pressed, style]}
      >
        {inner}
      </Pressable>
    )
  }

  return <View style={[styles.tile, small && styles.tileSmall, style]}>{inner}</View>
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.bgPanel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minWidth: 100,
    flexGrow: 1,
    flexBasis: 0,
    ...elevation.sm,
  },
  tileSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  icon: {
    fontSize: 14,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: sizes.caption,
    color: colors.textDim,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoLg,
    color: colors.text,
    lineHeight: sizes.monoLg + 2,
  },
  unit: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.textMuted,
    marginLeft: 4,
    fontWeight: '500',
  },
  delta: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyXs,
    marginTop: 4,
  },
})
