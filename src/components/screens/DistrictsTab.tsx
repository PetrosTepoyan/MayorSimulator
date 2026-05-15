import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useDistricts } from '../../store/gameStore'
import { Card } from '../ui/Card'
import { StatBar } from '../ui/StatBar'
import { formatMoney, formatPop } from '../../game/util'
import { colors, fonts, sizes, spacing, radius } from '../../theme'
import type { District, IndustryType, PoliticalLeaning } from '../../game/types'

// ----------------------------------------------------------------------------
// Industry + leaning lookups
// ----------------------------------------------------------------------------

const INDUSTRY_COLORS: Record<IndustryType, string> = {
  tech: colors.ind_tech,
  finance: colors.ind_finance,
  industrial: colors.ind_industrial,
  services: colors.ind_services,
  agriculture: colors.ind_agriculture,
  residential: colors.ind_residential,
  tourism: colors.ind_tourism,
  energy: colors.ind_energy,
  university: colors.ind_university,
  mixed: colors.ind_mixed,
}

const INDUSTRY_ICONS: Record<IndustryType, string> = {
  tech: '💻',
  finance: '🏦',
  industrial: '🏭',
  services: '🛎️',
  agriculture: '🌾',
  residential: '🏘️',
  tourism: '🏖️',
  energy: '⚡',
  university: '🎓',
  mixed: '🌐',
}

const INDUSTRY_LABEL: Record<IndustryType, string> = {
  tech: 'Tech',
  finance: 'Finance',
  industrial: 'Industrial',
  services: 'Services',
  agriculture: 'Agriculture',
  residential: 'Residential',
  tourism: 'Tourism',
  energy: 'Energy',
  university: 'University',
  mixed: 'Mixed',
}

const LEAN_COLORS: Record<PoliticalLeaning, string> = {
  progressive: colors.lean_progressive,
  centrist: colors.lean_centrist,
  conservative: colors.lean_conservative,
}

const LEAN_LABEL: Record<PoliticalLeaning, string> = {
  progressive: 'Progressive',
  centrist: 'Centrist',
  conservative: 'Conservative',
}

// ----------------------------------------------------------------------------
// Chip
// ----------------------------------------------------------------------------

interface ChipProps {
  icon?: string
  label: string
  color: string
}

function Chip({ icon, label, color }: ChipProps): React.JSX.Element {
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      {icon ? <Text style={styles.chipIcon}>{icon}</Text> : null}
      <Text style={[styles.chipLabel, { color }]}>{label}</Text>
    </View>
  )
}

// ----------------------------------------------------------------------------
// Approval color
// ----------------------------------------------------------------------------

function approvalColor(approval: number): string {
  if (approval >= 60) return colors.good
  if (approval < 30) return colors.bad
  return colors.warn
}

// ----------------------------------------------------------------------------
// DistrictCard
// ----------------------------------------------------------------------------

interface DistrictCardProps {
  district: District
  expanded: boolean
  onToggle: () => void
}

function DistrictCard({
  district,
  expanded,
  onToggle,
}: DistrictCardProps): React.JSX.Element {
  const industryColor = INDUSTRY_COLORS[district.primaryIndustry]
  const industryIcon = INDUSTRY_ICONS[district.primaryIndustry]
  const leanColor = LEAN_COLORS[district.leaning]
  const approvalCol = approvalColor(district.stats.approval)

  // For "avg income" — district.stats.avgIncome is $/year; show as $K/yr.
  const incomeK = district.stats.avgIncome / 1000

  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [styles.cardWrap, pressed && styles.cardPressed]}
    >
      <Card>
        {/* Top row: name + chips */}
        <View style={styles.topRow}>
          <View style={styles.titleCol}>
            <Text style={styles.districtName} numberOfLines={1}>
              {district.name}
            </Text>
            <View style={styles.chipsRow}>
              <Chip
                icon={industryIcon}
                label={INDUSTRY_LABEL[district.primaryIndustry]}
                color={industryColor}
              />
              <Chip label={LEAN_LABEL[district.leaning]} color={leanColor} />
            </View>
          </View>
          <Text style={styles.caret}>{expanded ? '▾' : '▸'}</Text>
        </View>

        {/* Quick stat row */}
        <View style={styles.quickRow}>
          <View style={styles.quickStat}>
            <Text style={styles.quickIcon}>👥</Text>
            <Text style={styles.quickValue}>
              {formatPop(district.stats.population)}
            </Text>
          </View>
          <View style={styles.quickStat}>
            <Text style={styles.quickIcon}>💰</Text>
            <Text style={styles.quickValue}>
              ${incomeK.toFixed(0)}K
              <Text style={styles.quickSuffix}>/yr</Text>
            </Text>
          </View>
          <View style={styles.quickStat}>
            <Text style={styles.quickIcon}>⭐</Text>
            <Text style={[styles.quickValue, { color: approvalCol }]}>
              {district.stats.approval.toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* Expanded detail */}
        {expanded ? (
          <View style={styles.expanded}>
            <View style={styles.barsBlock}>
              <StatBar icon="📚" label="Education" value={district.stats.education} />
              <StatBar
                icon="🚓"
                label="Crime"
                value={district.stats.crime}
                inverted
              />
              <StatBar
                icon="🏭"
                label="Pollution"
                value={district.stats.pollution}
                inverted
              />
              <StatBar
                icon="🔥"
                label="Unrest"
                value={district.stats.unrest}
                inverted
              />
              <StatBar icon="🏠" label="Housing" value={district.stats.housing} />
            </View>

            {district.flavor ? (
              <Text style={styles.flavor}>{district.flavor}</Text>
            ) : null}
          </View>
        ) : null}
      </Card>
    </Pressable>
  )
}

// ----------------------------------------------------------------------------
// DistrictsTab
// ----------------------------------------------------------------------------

export default function DistrictsTab(): React.JSX.Element {
  const districts = useDistricts()
  const [expandedId, setExpandedId] = useState<string | null>(
    districts[0]?.id ?? null,
  )

  const totalPopulation = districts.reduce(
    (s, d) => s + d.stats.population,
    0,
  )

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Districts</Text>
        <Text style={styles.totalText}>
          {districts.length} areas · {formatPop(totalPopulation)} residents
        </Text>
      </View>

      {districts.length === 0 ? (
        <Card>
          <Text style={styles.muted}>No districts yet.</Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {districts.map((d) => (
            <DistrictCard
              key={d.id}
              district={d}
              expanded={expandedId === d.id}
              onToggle={() =>
                setExpandedId(expandedId === d.id ? null : d.id)
              }
            />
          ))}
        </View>
      )}
    </View>
  )
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.titleLg,
    color: colors.text,
  },
  totalText: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.textDim,
  },

  // List
  list: {
    gap: spacing.sm,
  },
  cardWrap: {},
  cardPressed: {
    opacity: 0.95,
  },

  // Card content
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titleCol: {
    flex: 1,
  },
  districtName: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.title,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  caret: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.title,
    color: colors.textDim,
    paddingTop: spacing.xs,
  },

  // Chip
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.bgPanel,
  },
  chipIcon: {
    fontSize: 12,
  },
  chipLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.caption,
    letterSpacing: 0.3,
  },

  // Quick stat row
  quickRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  quickStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickIcon: {
    fontSize: 16,
  },
  quickValue: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.body,
    color: colors.text,
  },
  quickSuffix: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.textMuted,
  },

  // Expanded
  expanded: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  barsBlock: {
    gap: 2,
  },
  flavor: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.textDim,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: spacing.xs,
  },

  // Empty
  muted: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
})
