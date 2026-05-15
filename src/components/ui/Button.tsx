import React from 'react'
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, View } from 'react-native'
import { colors, fonts, sizes, radius, spacing, elevation } from '../../theme'

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

// Modern button — rounded, soft shadow, springs slightly on press.
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
            small && { fontSize: sizes.body },
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignSelf: 'flex-start',
    ...elevation.sm,
  },
  small: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  full: {
    alignSelf: 'stretch',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    shadowOpacity: 0,
    elevation: 0,
  },
  disabled: {
    opacity: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyLg,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
})

const VARIANT_STYLES: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  danger: { backgroundColor: colors.red },
  gold: { backgroundColor: colors.gold },
  ghost: { backgroundColor: 'transparent' },
}

const VARIANT_TEXT_STYLES: Record<ButtonVariant, TextStyle> = {
  primary: { color: '#ffffff' },
  secondary: { color: colors.text },
  danger: { color: '#ffffff' },
  gold: { color: colors.navy },
  ghost: { color: colors.primary },
}
