import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { colors, fonts, sizes, spacing, radius, elevation } from '../../theme'

export interface TabDef<T extends string> {
  key: T
  label: string
  icon: string
}

interface TabBarProps<T extends string> {
  tabs: ReadonlyArray<TabDef<T>>
  active: T
  onChange: (k: T) => void
}

// Bottom tab bar — modern iOS-style. Icons + tiny labels. Active tab highlighted.
export function TabBar<T extends string>({ tabs, active, onChange }: TabBarProps<T>) {
  return (
    <View style={styles.root}>
      {tabs.map((t) => {
        const isActive = t.key === active
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={({ pressed }) => [
              styles.tab,
              isActive && styles.activeTab,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.icon, isActive && styles.activeIcon]}>{t.icon}</Text>
            <Text style={[styles.label, isActive && styles.activeLabel]} numberOfLines={1}>
              {t.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    backgroundColor: colors.bgPanel,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: 2,
    ...elevation.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: 4,
    borderRadius: radius.md,
  },
  activeTab: {
    backgroundColor: colors.primarySoft,
  },
  icon: {
    fontSize: 22,
    color: colors.textMuted,
    marginBottom: 2,
  },
  activeIcon: {},
  label: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  activeLabel: {
    color: colors.primary,
    fontFamily: fonts.bodyBold,
  },
})
