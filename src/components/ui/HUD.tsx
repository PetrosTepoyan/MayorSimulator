import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { DateBadge } from './DateBadge'
import { KPIChip } from './KPIChip'
import { colors, fonts, sizes, spacing, radius, elevation } from '../../theme'
import { formatMoney, formatPop, formatPct } from '../../game/util'

interface HUDProps {
  cityName: string
  mayorName: string
  flag: string
  turn: number
  termLengthYears: number
  termsServed: number
  treasury: number
  approval: number
  population: number
  inflation: number
  onDatePress?: () => void
  onTreasuryPress?: () => void
  onApprovalPress?: () => void
}

// Sticky top HUD — city identity + date badge + KPI chips.
// Inspired by GameDev Tycoon's top status bar.
export function HUD({
  cityName,
  mayorName,
  flag,
  turn,
  termLengthYears,
  termsServed,
  treasury,
  approval,
  population,
  inflation,
  onDatePress,
  onTreasuryPress,
  onApprovalPress,
}: HUDProps) {
  const approvalTone: 'good' | 'bad' | 'warn' | 'neutral' =
    approval >= 60 ? 'good' : approval < 30 ? 'bad' : approval < 45 ? 'warn' : 'neutral'

  return (
    <View style={styles.root}>
      {/* Top row: identity + date */}
      <View style={styles.topRow}>
        <View style={styles.identity}>
          <Text style={styles.flag}>{flag}</Text>
          <View style={styles.idText}>
            <Text style={styles.city} numberOfLines={1}>
              {cityName}
            </Text>
            <Text style={styles.mayor} numberOfLines={1}>
              {mayorName}
            </Text>
          </View>
        </View>
        <DateBadge
          turn={turn}
          termLengthYears={termLengthYears}
          termsServed={termsServed}
          onPress={onDatePress}
          compact
        />
      </View>

      {/* KPI strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kpiRow}
      >
        <KPIChip
          icon="💰"
          label="Treasury"
          value={formatMoney(treasury)}
          tone={treasury < 0 ? 'bad' : treasury < 50 ? 'warn' : 'gold'}
          onPress={onTreasuryPress}
        />
        <KPIChip
          icon={approval >= 60 ? '😊' : approval < 30 ? '😡' : '😐'}
          label="Approval"
          value={`${approval.toFixed(0)}%`}
          tone={approvalTone}
          onPress={onApprovalPress}
        />
        <KPIChip
          icon="👥"
          label="Population"
          value={formatPop(population)}
          tone="primary"
        />
        <KPIChip
          icon="📈"
          label="Inflation"
          value={formatPct(inflation)}
          tone={inflation > 6 ? 'warn' : inflation > 10 ? 'bad' : 'neutral'}
        />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.bgElev,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...elevation.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  flag: { fontSize: 28 },
  idText: { flex: 1 },
  city: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyLg,
    color: colors.text,
  },
  mayor: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.textDim,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 2,
  },
})
