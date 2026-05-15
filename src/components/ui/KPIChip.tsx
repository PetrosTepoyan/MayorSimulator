import React from 'react'
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native'
import { colors, fonts, sizes, radius, spacing, elevation } from '../../theme'

interface KPIChipProps {
  icon?: string
  label: string
  value: string
  tone?: 'gold' | 'good' | 'bad' | 'warn' | 'primary' | 'neutral'
  onPress?: () => void
  style?: ViewStyle
}

// Inline pill for the top HUD — shows a single KPI with icon and value.
export function KPIChip({ icon, label, value, tone = 'neutral', onPress, style }: KPIChipProps) {
  const palette = TONE_STYLES[tone]
  const Container: React.ComponentType<any> = onPress ? Pressable : View

  return (
    <Container
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean }) => [
        styles.chip,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.row}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <View>
          <Text style={[styles.label, { color: palette.label }]} numberOfLines={1}>
            {label.toUpperCase()}
          </Text>
          <Text style={[styles.value, { color: palette.value }]} numberOfLines={1}>
            {value}
          </Text>
        </View>
      </View>
    </Container>
  )
}

const TONE_STYLES = {
  gold: { bg: colors.goldSoft, border: colors.gold, label: '#8a6d28', value: '#5a4519' },
  good: { bg: colors.greenSoft, border: colors.good, label: '#155724', value: '#0c4019' },
  bad: { bg: colors.redSoft, border: colors.bad, label: '#7a1212', value: '#5b0d0d' },
  warn: { bg: colors.amberSoft, border: colors.warn, label: '#8a4a04', value: '#653505' },
  primary: { bg: colors.primarySoft, border: colors.primary, label: '#1e3a8a', value: '#162d6e' },
  neutral: { bg: colors.bgPanelAlt, border: colors.border, label: colors.textDim, value: colors.text },
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    ...elevation.sm,
  },
  pressed: { opacity: 0.85 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: { fontSize: 18 },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.pixelSm,
    letterSpacing: 0.6,
  },
  value: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    lineHeight: sizes.monoMd + 2,
  },
})
