import React from 'react'
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, View } from 'react-native'
import { colors, fonts, sizes, radius, spacing } from '../../theme'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'gold' | 'ghost'

interface ButtonProps {
  label: string
  onPress?: () => void
  variant?: ButtonVariant
  disabled?: boolean
  small?: boolean
  full?: boolean
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
  style?: ViewStyle
}

// Game-flavored button with retro press-down on tap.
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  small,
  full,
  iconLeft,
  iconRight,
  style,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        VARIANT_STYLES[variant],
        small && styles.small,
        full && styles.full,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.row}>
        {iconLeft}
        <Text
          style={[
            styles.label,
            VARIANT_TEXT_STYLES[variant],
            small && { fontSize: sizes.monoSm },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {iconRight}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 2,
  },
  small: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  full: {
    alignSelf: 'stretch',
  },
  pressed: {
    transform: [{ translateY: 1 }],
    shadowOpacity: 0,
  },
  disabled: {
    opacity: 0.45,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    textAlign: 'center',
  },
})

const VARIANT_STYLES: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.govBlue },
  secondary: { backgroundColor: colors.bgPanelAlt, borderColor: colors.borderStrong },
  danger: { backgroundColor: colors.govRed },
  gold: { backgroundColor: colors.govGold },
  ghost: { backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 1 },
}

const VARIANT_TEXT_STYLES: Record<ButtonVariant, TextStyle> = {
  primary: { color: colors.paper },
  secondary: { color: colors.text },
  danger: { color: colors.paper },
  gold: { color: colors.bg },
  ghost: { color: colors.text },
}
