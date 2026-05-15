import React from 'react'
import { Text, StyleSheet, TextStyle, TextProps } from 'react-native'
import { colors, fonts, sizes } from '../../theme'

interface PixelTextProps extends TextProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  color?: string
  style?: TextStyle
}

// Press Start 2P display text for retro headings and chips.
export function PixelText({ size = 'sm', color, style, children, ...rest }: PixelTextProps & { children: React.ReactNode }) {
  const sizeMap: Record<NonNullable<PixelTextProps['size']>, number> = {
    xs: sizes.pixelXs,
    sm: sizes.pixelSm,
    md: sizes.pixelMd,
    lg: sizes.pixelLg,
  }
  return (
    <Text
      {...rest}
      style={[
        styles.text,
        { fontSize: sizeMap[size], color: color ?? colors.text },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fonts.pixel,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.text,
  },
})
