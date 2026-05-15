import React, { useState } from 'react'
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native'
import { useDistricts } from '../../store/gameStore'
import { PixelText } from '../ui/PixelText'
import { StatBar } from '../ui/StatBar'
import { StatTile } from '../ui/StatTile'
import { formatMoney, formatPop } from '../../game/util'
import { colors, fonts, sizes, spacing, radius } from '../../theme'
import type { District, IndustryType, PoliticalLeaning } from '../../game/types'

// ----------------------------------------------------------------------------
// Color helpers — chips and stripes
// ----------------------------------------------------------------------------

const INDUSTRY_COLORS: Record<IndustryType, string> = {
  tech: '#3b82f6',          // blue
  finance: '#c39432',       // gold (govGold)
  industrial: '#a3262d',    // red (govRed)
  services: '#14b8a6',      // teal
  agriculture: '#356b3b',   // green (govGreen)
  residential: '#8b5cf6',   // purple
  tourism: '#ec4899',       // pink
  energy: '#f59e0b',        // amber
  university: '#1d4f91',    // gov blue
  mixed: '#6b7280',         // slate
}

const LEANING_COLORS: Record<PoliticalLeaning, string> = {
  progressive: '#3b82f6',
  centrist: '#9ca3af',
  conservative: '#a3262d',
}

const LEANING_LABELS: Record<PoliticalLeaning, string> = {
  progressive: 'PROG',
  centrist: 'CTR',
  conservative: 'CONS',
}

// Compose a 0-100 health score from the district's stat profile.
// Higher is better. Good signals - bad signals.
function districtHealth(d: District): number {
  const s = d.stats
  const safety = 100 - s.crime
  const cleanliness = 100 - s.pollution
  const calm = 100 - s.unrest
  // Mean of positives (education, approval, housing, safety, cleanliness, calm)
  const score =
    (s.education + s.approval + s.housing + safety + cleanliness + calm) / 6
  return Math.max(0, Math.min(100, score))
}

function healthColor(health: number): string {
  if (health >= 65) return colors.good
  if (health >= 40) return colors.govGold
  return colors.bad
}

function approvalColor(approval: number): string {
  if (approval < 30) return colors.bad
  if (approval > 65) return colors.good
  return colors.text
}

function unrestColor(unrest: number): string {
  if (unrest >= 75) return colors.bad
  if (unrest >= 50) return colors.warn
  return colors.textDim
}

// ----------------------------------------------------------------------------
// Chip — a small pill-shaped tag with an optional color square
// ----------------------------------------------------------------------------

interface ChipProps {
  label: string
  color: string
}

function Chip({ label, color }: ChipProps): JSX.Element {
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <Text style={[styles.chipLabel, { color }]}>{label}</Text>
    </View>
  )
}

// ----------------------------------------------------------------------------
// PopShareBar — tiny horizontal bar showing this district's pop share
// ----------------------------------------------------------------------------

interface PopShareBarProps {
  share: number // 0-1
}

function PopShareBar({ share }: PopShareBarProps): JSX.Element {
  const pct = Math.max(0, Math.min(1, share)) * 100
  return (
    <View style={styles.popBarTrack}>
      <View style={[styles.popBarFill, { width: `${pct}%` }]} />
    </View>
  )
}

// ----------------------------------------------------------------------------
// DistrictCard
// ----------------------------------------------------------------------------

interface DistrictCardProps {
  district: District
  totalPopulation: number
  expanded: boolean
  onToggle: () => void
}

function DistrictCard({
  district,
  totalPopulation,
  expanded,
  onToggle,
}: DistrictCardProps): JSX.Element {
  const health = districtHealth(district)
  const stripe = healthColor(health)
  const industryColor = INDUSTRY_COLORS[district.primaryIndustry] ?? colors.textDim
  const leaningColor = LEANING_COLORS[district.leaning]
  const popShare = totalPopulation > 0 ? district.stats.population / totalPopulation : 0

  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={[styles.healthStripe, { backgroundColor: stripe }]} />
      <View style={styles.cardBody}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.districtName}>{district.name}</Text>
            <View style={styles.chipsRow}>
              <Chip
                label={district.primaryIndustry.toUpperCase()}
                color={industryColor}
              />
              <Chip
                label={LEANING_LABELS[district.leaning]}
                color={leaningColor}
              />
            </View>
          </View>
          <Text style={styles.caret}>{expanded ? '▾' : '▸'}</Text>
        </View>

        {/* Pop share bar — always visible */}
        <View style={styles.popRow}>
          <Text style={styles.popLabel}>POP</Text>
          <Text style={styles.popValue}>{formatPop(district.stats.population)}</Text>
          <View style={styles.popBarWrap}>
            <PopShareBar share={popShare} />
          </View>
          <Text style={styles.popShareText}>
            {(popShare * 100).toFixed(0)}%
          </Text>
        </View>

        {expanded ? (
          <View style={styles.expandedSection}>
            {/* Mini stat tiles */}
            <View style={styles.tilesRow}>
              <StatTile
                label="POP"
                value={formatPop(district.stats.population)}
                small
                style={styles.tile}
              />
              <StatTile
                label="AVG INCOME"
                value={formatMoney(district.stats.avgIncome / 1_000_000)}
                small
                style={styles.tile}
              />
              <StatTile
                label="APPROVAL"
                value={`${district.stats.approval.toFixed(0)}%`}
                tone={
                  district.stats.approval < 30
                    ? 'bad'
                    : district.stats.approval > 65
                      ? 'good'
                      : 'neutral'
                }
                small
                style={styles.tile}
              />
            </View>

            {/* Stat bars */}
            <View style={styles.statsBlock}>
              <StatBar label="EDUCATION" value={district.stats.education} />
              <StatBar label="CRIME" value={district.stats.crime} inverted />
              <StatBar label="POLLUTION" value={district.stats.pollution} inverted />
              <StatBar
                label="UNREST"
                value={district.stats.unrest}
                inverted
                color={unrestColor(district.stats.unrest)}
              />
              <StatBar label="HOUSING" value={district.stats.housing} />
            </View>

            {/* Flavor */}
            {district.flavor ? (
              <Text style={styles.flavor}>{district.flavor}</Text>
            ) : null}

            {/* Health readout */}
            <View style={styles.healthRow}>
              <Text style={styles.healthLabel}>OVERALL HEALTH</Text>
              <Text style={[styles.healthValue, { color: stripe }]}>
                {health.toFixed(0)}
              </Text>
            </View>
          </View>
        ) : (
          // Collapsed: show approval as a quick read
          <View style={styles.collapsedStatRow}>
            <Text style={styles.collapsedStatLabel}>APPROVAL</Text>
            <Text
              style={[
                styles.collapsedStatValue,
                { color: approvalColor(district.stats.approval) },
              ]}
            >
              {district.stats.approval.toFixed(0)}%
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  )
}

// ----------------------------------------------------------------------------
// DistrictsTab
// ----------------------------------------------------------------------------

export default function DistrictsTab(): JSX.Element {
  const districts = useDistricts()
  const [expanded, setExpanded] = useState<string | null>(districts[0]?.id ?? null)

  const totalPopulation = districts.reduce(
    (sum, d) => sum + d.stats.population,
    0,
  )

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleRow}>
        <PixelText size="sm" color={colors.textDim}>
          {`DISTRICTS — ${districts.length}`}
        </PixelText>
        <Text style={styles.totalPopText}>{formatPop(totalPopulation)} TOTAL</Text>
      </View>

      {districts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No districts yet.</Text>
        </View>
      ) : (
        districts.map((d) => (
          <DistrictCard
            key={d.id}
            district={d}
            totalPopulation={totalPopulation}
            expanded={expanded === d.id}
            onToggle={() => setExpanded(expanded === d.id ? null : d.id)}
          />
        ))
      )}
    </ScrollView>
  )
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  totalPopText: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  // Card
  card: {
    backgroundColor: colors.bgPanel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginVertical: spacing.xs,
    flexDirection: 'row',
  },
  cardPressed: {
    backgroundColor: colors.bgPanelAlt,
  },
  healthStripe: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  districtName: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoLg,
    color: colors.text,
    lineHeight: sizes.monoLg + 2,
    marginBottom: spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  caret: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    color: colors.textDim,
    marginTop: 2,
  },
  // Chip
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginRight: spacing.xs,
    backgroundColor: colors.bgPanelAlt,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  chipLabel: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelXs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  // Pop row
  popRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  popLabel: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelXs,
    color: colors.textDim,
    letterSpacing: 0.8,
    marginRight: spacing.xs,
  },
  popValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.text,
    marginRight: spacing.sm,
    minWidth: 48,
  },
  popBarWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  popBarTrack: {
    height: 4,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  popBarFill: {
    height: '100%',
    backgroundColor: colors.govBlue,
  },
  popShareText: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.textMuted,
    minWidth: 32,
    textAlign: 'right',
  },
  // Collapsed view
  collapsedStatRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  collapsedStatLabel: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelXs,
    color: colors.textDim,
    letterSpacing: 0.8,
  },
  collapsedStatValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
  },
  // Expanded
  expandedSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tile: {
    minWidth: 80,
  },
  statsBlock: {
    marginBottom: spacing.sm,
  },
  flavor: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textDim,
    fontStyle: 'italic',
    lineHeight: sizes.body + 4,
    marginTop: spacing.sm,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  healthLabel: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelXs,
    color: colors.textDim,
    letterSpacing: 0.8,
  },
  healthValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
  },
  // Empty
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.textMuted,
  },
})
