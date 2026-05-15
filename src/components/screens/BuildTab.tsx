import React, { useMemo, useState } from 'react'
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native'
import {
  useBuildings,
  useQueuedBuilds,
  useStats,
  useGameStore,
} from '../../store/gameStore'
import { ALL_BUILDING_LIST, ALL_BUILDINGS } from '../../game/allBuildings'
import { Panel } from '../ui/Panel'
import { PixelText } from '../ui/PixelText'
import { Button } from '../ui/Button'
import { formatMoney } from '../../game/util'
import { colors, fonts, sizes, spacing, radius } from '../../theme'
import type {
  BuildingDef,
  BuildingType,
  CityStats,
  QueuedBuild,
  Building,
} from '../../game/types'

// ============================================================================
// Constants — friendly labels for stat keys when shown in effect chips
// ============================================================================

const STAT_LABELS: Partial<Record<keyof CityStats, string>> = {
  treasury: 'Treasury',
  gdpPerCapita: 'GDP/cap',
  unemployment: 'Unemploy',
  inflation: 'Inflation',
  debt: 'Debt',
  creditRating: 'Credit',
  population: 'Population',
  education: 'Education',
  health: 'Health',
  happiness: 'Happiness',
  approval: 'Approval',
  crime: 'Crime',
  pollution: 'Pollution',
  innovation: 'Innovation',
  inequality: 'Inequality',
}

// Stats where a positive delta is BAD (e.g. crime going up is bad).
const INVERTED_STATS: Array<keyof CityStats> = [
  'unemployment',
  'inflation',
  'debt',
  'crime',
  'pollution',
  'inequality',
]

// ============================================================================
// Helpers
// ============================================================================

const formatDelta = (n: number): string => {
  const abs = Math.abs(n)
  // Big absolute values (e.g. gdpPerCapita 50) — show as int
  if (abs >= 10) return n > 0 ? `+${Math.round(n)}` : `${Math.round(n)}`
  return n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2)
}

const effectTone = (key: keyof CityStats, delta: number): 'good' | 'bad' => {
  const inverted = INVERTED_STATS.includes(key)
  const positive = delta > 0
  return positive !== inverted ? 'good' : 'bad'
}

const computeVariantCost = (def: BuildingDef, variantId?: string): {
  cost: number
  upkeep: number
  perTurnEffect: Partial<CityStats>
} => {
  if (!variantId || !def.variants) {
    return {
      cost: def.cost,
      upkeep: def.upkeep,
      perTurnEffect: def.perTurnEffect,
    }
  }
  const v = def.variants.find((x) => x.id === variantId)
  if (!v) {
    return {
      cost: def.cost,
      upkeep: def.upkeep,
      perTurnEffect: def.perTurnEffect,
    }
  }
  return {
    cost: def.cost + (v.costDelta ?? 0),
    upkeep: def.upkeep + (v.upkeepDelta ?? 0),
    // Merge variant effects on top of base
    perTurnEffect: { ...def.perTurnEffect, ...v.perTurnEffect },
  }
}

// Take the top-N most impactful per-turn effects for a compact preview
const topEffects = (
  effect: Partial<CityStats>,
  n = 3,
): Array<{ key: keyof CityStats; delta: number }> => {
  const entries = Object.entries(effect)
    .filter(([, v]) => typeof v === 'number' && v !== 0)
    .map(([k, v]) => ({ key: k as keyof CityStats, delta: v as number }))
  entries.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  return entries.slice(0, n)
}

// ============================================================================
// Sub-components
// ============================================================================

interface EffectChipProps {
  statKey: keyof CityStats
  delta: number
}

const EffectChip = ({ statKey, delta }: EffectChipProps): JSX.Element => {
  const tone = effectTone(statKey, delta)
  const color = tone === 'good' ? colors.good : colors.bad
  const arrow = delta > 0 ? '▲' : '▼'
  const label = STAT_LABELS[statKey] ?? statKey
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <Text style={[styles.chipText, { color }]}>
        {arrow} {label} {formatDelta(delta)}/t
      </Text>
    </View>
  )
}

interface QueuedCardProps {
  q: QueuedBuild
  onCancel: (id: string) => void
}

const QueuedCard = ({ q, onCancel }: QueuedCardProps): JSX.Element => {
  const def = ALL_BUILDINGS[q.type]
  const variantName =
    q.variant && def?.variants
      ? def.variants.find((v) => v.id === q.variant)?.name
      : undefined
  const progressed = q.totalTurns - q.turnsLeft
  const refund = Math.round(q.cost * 0.7)
  return (
    <View style={styles.queuedCard}>
      <View style={styles.queuedHeader}>
        <Text style={styles.iconLg}>{def?.icon ?? '🏗️'}</Text>
        <View style={styles.queuedTitleCol}>
          <Text style={styles.cardName}>
            {def?.name ?? q.type}
            {variantName ? ` · ${variantName}` : ''}
          </Text>
          <Text style={styles.queuedMeta}>
            {'▸ '}
            {progressed}/{q.totalTurns} turns
            {'  ·  Spent '}
            {formatMoney(q.cost)}
          </Text>
        </View>
      </View>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.max(4, (progressed / q.totalTurns) * 100)}%` },
          ]}
        />
      </View>
      <View style={styles.queuedFooter}>
        <Text style={styles.queuedRefund}>
          Cancel refunds {formatMoney(refund)} (70%)
        </Text>
        <Button
          label="Cancel"
          variant="danger"
          small
          onPress={() => onCancel(q.id)}
        />
      </View>
    </View>
  )
}

interface VariantPickerProps {
  def: BuildingDef
  selectedId?: string
  onSelect: (id: string) => void
}

const VariantPicker = ({
  def,
  selectedId,
  onSelect,
}: VariantPickerProps): JSX.Element | null => {
  if (!def.variants || def.variants.length === 0) return null
  return (
    <View style={styles.variantRow}>
      {def.variants.map((v) => {
        const active = v.id === selectedId
        return (
          <Pressable
            key={v.id}
            onPress={() => onSelect(v.id)}
            style={({ pressed }) => [
              styles.variantBtn,
              active && styles.variantBtnActive,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text
              style={[
                styles.variantText,
                active && styles.variantTextActive,
              ]}
            >
              {v.name}
            </Text>
            {v.costDelta !== undefined && v.costDelta !== 0 ? (
              <Text
                style={[
                  styles.variantDelta,
                  active && styles.variantTextActive,
                ]}
              >
                {v.costDelta > 0 ? '+' : ''}
                {formatMoney(v.costDelta)}
              </Text>
            ) : null}
          </Pressable>
        )
      })}
    </View>
  )
}

interface BuildingCardProps {
  def: BuildingDef
  treasury: number
  selectedVariant?: string
  onSelectVariant: (variantId: string) => void
  onBuild: () => void
}

const BuildingCard = React.memo(function BuildingCard({
  def,
  treasury,
  selectedVariant,
  onSelectVariant,
  onBuild,
}: BuildingCardProps): JSX.Element {
  const { cost, upkeep, perTurnEffect } = computeVariantCost(
    def,
    selectedVariant,
  )
  const canAfford = treasury >= cost
  const effects = topEffects(perTurnEffect, 3)
  const costColor = canAfford ? colors.text : colors.bad

  return (
    <Panel style={styles.buildCard}>
      <View style={styles.buildRow}>
        <Text style={styles.iconXl}>{def.icon}</Text>
        <View style={styles.buildBody}>
          <Text style={styles.cardName}>{def.name}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {def.description}
          </Text>

          <View style={styles.statRow}>
            <Text style={[styles.statTxt, { color: costColor }]}>
              Cost {formatMoney(cost)}
            </Text>
            <Text style={styles.statSep}>{'·'}</Text>
            <Text style={styles.statTxt}>
              Upkeep {formatMoney(upkeep)}/t
            </Text>
            <Text style={styles.statSep}>{'·'}</Text>
            <Text style={styles.statTxt}>{def.buildTurns}t build</Text>
          </View>

          {effects.length > 0 ? (
            <View style={styles.chipRow}>
              {effects.map((e) => (
                <EffectChip
                  key={String(e.key)}
                  statKey={e.key}
                  delta={e.delta}
                />
              ))}
            </View>
          ) : null}

          {def.variants && def.variants.length > 0 ? (
            <VariantPicker
              def={def}
              selectedId={selectedVariant}
              onSelect={onSelectVariant}
            />
          ) : null}

          <View style={styles.buildActionRow}>
            <Button
              label={canAfford ? 'Build' : 'Insufficient'}
              variant={canAfford ? 'primary' : 'secondary'}
              disabled={!canAfford}
              onPress={onBuild}
              small
            />
          </View>
        </View>
      </View>
    </Panel>
  )
})

// ============================================================================
// Main tab
// ============================================================================

export default function BuildTab(): JSX.Element {
  const buildings = useBuildings()
  const queue = useQueuedBuilds()
  const stats = useStats()
  const queueBuild = useGameStore((s) => s.queueBuild)
  const cancel = useGameStore((s) => s.cancelQueuedBuild)

  // Tracks which variant is chosen per building type. Default: first variant.
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>(
    () => {
      const init: Record<string, string> = {}
      for (const def of ALL_BUILDING_LIST) {
        if (def.variants && def.variants.length > 0) {
          init[def.type] = def.variants[0].id
        }
      }
      return init
    },
  )

  // Group existing buildings by type for the compact roster
  const buildingCounts = useMemo(() => {
    const counts: Partial<Record<BuildingType, number>> = {}
    for (const b of buildings as Building[]) {
      counts[b.type] = (counts[b.type] ?? 0) + 1
    }
    return counts
  }, [buildings])

  const existingEntries = useMemo(
    () =>
      (Object.entries(buildingCounts) as Array<[BuildingType, number]>).sort(
        (a, b) => b[1] - a[1],
      ),
    [buildingCounts],
  )

  const onPickVariant = (type: BuildingType, variantId: string): void => {
    setSelectedVariant((prev) => ({ ...prev, [type]: variantId }))
  }

  const onBuild = (def: BuildingDef): void => {
    const variant = def.variants ? selectedVariant[def.type] : undefined
    queueBuild(def.type, variant)
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Treasury + queued count */}
      <Panel title="Treasury">
        <View style={styles.treasuryRow}>
          <Text style={styles.treasuryVal}>{formatMoney(stats.treasury)}</Text>
          <View
            style={[
              styles.queueChip,
              {
                borderColor:
                  queue.length > 0 ? colors.govGold : colors.border,
              },
            ]}
          >
            <PixelText
              size="xs"
              color={queue.length > 0 ? colors.govGold : colors.textDim}
            >
              {queue.length} Queued
            </PixelText>
          </View>
        </View>
      </Panel>

      {/* Under construction */}
      {queue.length > 0 ? (
        <Panel title="Under Construction">
          <View style={styles.colGap}>
            {queue.map((q) => (
              <QueuedCard key={q.id} q={q} onCancel={cancel} />
            ))}
          </View>
        </Panel>
      ) : null}

      {/* Existing buildings, compact */}
      <Panel title="Existing Buildings">
        {existingEntries.length === 0 ? (
          <Text style={styles.muted}>No buildings yet. Start construction below.</Text>
        ) : (
          <View style={styles.existingWrap}>
            {existingEntries.map(([type, n]) => {
              const def = ALL_BUILDINGS[type]
              return (
                <View key={type} style={styles.existingChip}>
                  <Text style={styles.existingIcon}>
                    {def?.icon ?? '🏗️'}
                  </Text>
                  <Text style={styles.existingName}>
                    {def?.name ?? type}
                  </Text>
                  <Text style={styles.existingCount}>{'×'}{n}</Text>
                </View>
              )
            })}
          </View>
        )}
      </Panel>

      {/* Build menu */}
      <Panel title="Build Menu">
        <View style={styles.colGap}>
          {ALL_BUILDING_LIST.map((def) => (
            <BuildingCard
              key={def.type}
              def={def}
              treasury={stats.treasury}
              selectedVariant={
                def.variants ? selectedVariant[def.type] : undefined
              }
              onSelectVariant={(id) => onPickVariant(def.type, id)}
              onBuild={() => onBuild(def)}
            />
          ))}
        </View>
      </Panel>
    </ScrollView>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl + spacing.xxl,
    gap: spacing.sm,
  },
  colGap: {
    gap: spacing.sm,
  },

  // Treasury header
  treasuryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  treasuryVal: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoLg,
    color: colors.govGold,
  },
  queueChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.bgPanelAlt,
  },

  // Queued card
  queuedCard: {
    backgroundColor: colors.bgPanelAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  queuedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  queuedTitleCol: {
    flex: 1,
    gap: 2,
  },
  queuedMeta: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.textDim,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.govGold,
  },
  queuedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  queuedRefund: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm - 2,
    color: colors.textMuted,
  },

  // Existing buildings
  existingWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  existingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bgPanelAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  existingIcon: {
    fontSize: 16,
  },
  existingName: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.text,
  },
  existingCount: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.govGold,
    marginLeft: 2,
  },

  // Build menu cards
  buildCard: {
    backgroundColor: colors.bgPanel,
    marginVertical: 0,
  },
  buildRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  buildBody: {
    flex: 1,
    gap: spacing.xs,
  },
  iconXl: {
    fontSize: 32,
    width: 40,
    textAlign: 'center',
  },
  iconLg: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  cardName: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoLg,
    color: colors.text,
    lineHeight: sizes.monoLg + 2,
  },
  cardDesc: {
    fontFamily: fonts.body,
    fontSize: sizes.body - 1,
    color: colors.textDim,
    lineHeight: 16,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  statTxt: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.text,
  },
  statSep: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.textMuted,
  },

  // Effect chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.bg,
  },
  chipText: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm - 2,
  },

  // Variant picker
  variantRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  variantBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.bgPanelAlt,
    alignItems: 'center',
    gap: 2,
  },
  variantBtnActive: {
    backgroundColor: colors.govBlue,
    borderColor: colors.govBlue,
  },
  variantText: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.text,
  },
  variantTextActive: {
    color: colors.paper,
  },
  variantDelta: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm - 2,
    color: colors.textMuted,
  },

  buildActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },

  muted: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
})
