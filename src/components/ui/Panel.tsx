import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { colors, fonts, sizes, radius, spacing } from '../../theme'

interface PanelProps {
  title?: string
  rightAccessory?: React.ReactNode
  children?: React.ReactNode
  style?: ViewStyle
  flat?: boolean
}

// Standard surface for grouping content. Pixel-font title bar above content.
export function Panel({ title, rightAccessory, children, style, flat }: PanelProps) {
  return (
    <View style={[styles.panel, flat && styles.flat, style]}>
      {title ? (
        <View style={styles.titleBar}>
          <Text style={styles.title}>{title}</Text>
          {rightAccessory ? <View>{rightAccessory}</View> : null}
        </View>
      ) : null}
      <View style={styles.body}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.bgPanel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginVertical: spacing.xs,
  },
  flat: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    backgroundColor: colors.bgPanelAlt,
  },
  title: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelSm,
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  body: {
    padding: spacing.md,
  },
})
