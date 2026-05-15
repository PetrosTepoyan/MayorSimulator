import React from 'react'
import { Text, StyleSheet, TextStyle, TextProps } from 'react-native'
import { colors, fonts, sizes } from '../../theme'

interface PixelTextProps extends TextProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  color?: string
  style?: TextStyle
}

// Tiny pixel-font label — used for small accent labels only.
// In v2 we keep these subtle (≤11px) so the main UI is modern body text.
export function PixelText({
  size = 'sm',
  color,
  style,
  children,
  ...rest
}: PixelTextProps & { children: React.ReactNode }) {
  const sizeMap: Record<NonNullable<PixelTextProps['size']>, number> = {
    xs: sizes.pixelXs,
    sm: sizes.pixelSm,
    md: sizes.pixelMd,
    lg: 14,
  }
  return (
    <Text
      {...rest}
      style={[styles.text, { fontSize: sizeMap[size], color: color ?? colors.textDim }, style]}
    >
      {children}
    </Text>
  )
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fonts.pixel,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
})
