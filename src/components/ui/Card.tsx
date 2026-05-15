import React from 'react'
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native'
import { colors, fonts, sizes, radius, spacing, elevation } from '../../theme'

interface CardProps {
  title?: string
  subtitle?: string
  rightAccessory?: React.ReactNode
  children?: React.ReactNode
  style?: ViewStyle
  flat?: boolean
  onPress?: () => void
  tint?: 'default' | 'gold' | 'primary' | 'soft'
}

// Modern card surface — white, soft shadow, rounded corners.
// Optional title bar with light gray background.
export function Card({
  title,
  subtitle,
  rightAccessory,
  children,
  style,
  flat,
  onPress,
  tint = 'default',
}: CardProps) {
  const Container: React.ComponentType<any> = onPress ? Pressable : View
  return (
    <Container
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean }) => [
        styles.card,
        flat && styles.flat,
        tint === 'gold' && styles.tintGold,
        tint === 'primary' && styles.tintPrimary,
        tint === 'soft' && styles.tintSoft,
        pressed && styles.pressed,
        style,
      ]}
    >
      {title || rightAccessory ? (
        <View style={styles.titleBar}>
          <View style={{ flex: 1 }}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {rightAccessory ? <View>{rightAccessory}</View> : null}
        </View>
      ) : null}
      <View style={styles.body}>{children}</View>
    </Container>
  )
}

// Re-export Panel under same API so existing code keeps working.
export const Panel = Card

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgPanel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginVertical: spacing.xs,
    ...elevation.sm,
  },
  flat: {
    ...elevation.sm,
    shadowOpacity: 0,
    elevation: 0,
  },
  tintGold: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  tintPrimary: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  tintSoft: { backgroundColor: colors.bgPanelAlt },
  pressed: { opacity: 0.92 },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyLg,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.textDim,
    marginTop: 2,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
})
