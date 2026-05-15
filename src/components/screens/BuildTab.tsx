import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import {
  useBuildings,
  useQueuedBuilds,
  useStats,
  useGameStore,
} from '../../store/gameStore'
import { ALL_BUILDING_LIST, ALL_BUILDINGS } from '../../game/allBuildings'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { formatMoney } from '../../game/util'
import { colors, fonts, sizes, spacing, radius } from '../../theme'
import type {
  Building,
  BuildingDef,
  BuildingType,
  CityStats,
  QueuedBuild,
} from '../../game/types'

// ----------------------------------------------------------------------------
// Stat label/inversion lookups for effect chips
// ----------------------------------------------------------------------------

const STAT_LABELS: Partial<Record<keyof CityStats, string>> = {
  treasury: 'Treasury',
  gdpPerCapita: 'GDP/cap',
  unemployment: 'Unemploy',
  inflation: 'Inflation',
  debt: 'Debt',
  creditRating: 'Credit',
  population: 'Pop',
  education: 'Education',
  health: 'Health',
  happiness: 'Happiness',
  approval: 'Approval',
  crime: 'Crime',
  pollution: 'Pollution',
  innovation: 'Innovation',
  inequality: 'Inequality',
}

const INVERTED_STATS: Array<keyof CityStats> = [
  'unemployment',
  'inflation',
  'debt',
  'crime',
  'pollution',
  'inequality',
]

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function formatDelta(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 10) return n > 0 ? `+${Math.round(n)}` : `${Math.round(n)}`
  return n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2)
}

function effectTone(key: keyof CityStats, delta: number): 'good' | 'bad' {
  const inverted = INVERTED_STATS.includes(key)
  const positive = delta > 0
  return positive !== inverted ? 'good' : 'bad'
}

function topEffects(
  effect: Partial<CityStats>,
  n = 3,
): Array<{ key: keyof CityStats; delta: number }> {
  const entries = Object.entries(effect)
    .filter(([, v]) => typeof v === 'number' && v !== 0)
    .map(([k, v]) => ({ key: k as keyof CityStats, delta: v as number }))
  entries.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  return entries.slice(0, n)
}

function computeVariantCost(
  def: BuildingDef,
  variantId?: string,
): { cost: number; upkeep: number; perTurnEffect: Partial<CityStats> } {
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
    perTurnEffect: { ...def.perTurnEffect, ...v.perTurnEffect },
  }
}

// ----------------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------------

interface EffectChipProps {
  statKey: keyof CityStats
  delta: number
}

function EffectChip({ statKey, delta }: EffectChipProps): React.JSX.Element {
  const tone = effectTone(statKey, delta)
  const color = tone === 'good' ? colors.good : colors.bad
  const bg = tone === 'good' ? colors.greenSoft : colors.redSoft
  const arrow = delta > 0 ? '▲' : '▼'
  const label = STAT_LABELS[statKey] ?? statKey
  return (
    <View
      style={[
        styles.effectChip,
        { borderColor: color, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.effectChipText, { color }]}>
        {arrow} {label} {formatDelta(delta)}
      </Text>
    </View>
  )
}

interface QueuedItemProps {
  q: QueuedBuild
  onCancel: (id: string) => void
}

function QueuedItem({ q, onCancel }: QueuedItemProps): React.JSX.Element {
  const def = ALL_BUILDINGS[q.type]
  const variantName =
    q.variant && def?.variants
      ? def.variants.find((v) => v.id === q.variant)?.name
      : undefined
  const progressed = q.totalTurns - q.turnsLeft
  const pct = Math.max(4, (progressed / q.totalTurns) * 100)

  return (
    <View style={styles.queuedItem}>
      <View style={styles.queuedTop}>
        <Text style={styles.queuedIcon}>{def?.icon ?? '🏗️'}</Text>
        <View style={styles.queuedTitleCol}>
          <Text style={styles.queuedName}>
            {def?.name ?? q.type}
            {variantName ? ` · ${variantName}` : ''}
          </Text>
          <Text style={styles.queuedMeta}>
            Q{progressed}/{q.totalTurns} · spent {formatMoney(q.cost)}
          </Text>
        </View>
        <Button
          label="Cancel"
          variant="ghost"
          small
          onPress={() => onCancel(q.id)}
        />
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
    </View>
  )
}

interface ExistingChipProps {
  icon: string
  name: string
  count: number
}

function ExistingChip({
  icon,
  name,
  count,
}: ExistingChipProps): React.JSX.Element {
  return (
    <View style={styles.existingChip}>
      <Text style={styles.existingIcon}>{icon}</Text>
      <Text style={styles.existingCount}>×{count}</Text>
      <Text style={styles.existingName}>{name}</Text>
    </View>
  )
}

interface VariantPickerProps {
  def: BuildingDef
  selectedId?: string
  onSelect: (id: string) => void
}

function VariantPicker({
  def,
  selectedId,
  onSelect,
}: VariantPickerProps): React.JSX.Element | null {
  if (!def.variants || def.variants.length === 0) return null
  return (
    <View style={styles.variantsRow}>
      {def.variants.map((v) => {
        const isActive = v.id === selectedId
        return (
          <Button
            key={v.id}
            label={v.name}
            variant={isActive ? 'primary' : 'secondary'}
            small
            onPress={() => onSelect(v.id)}
            style={styles.variantBtn}
          />
        )
      })}
    </View>
  )
}

interface BuildOptionProps {
  def: BuildingDef
  treasury: number
  selectedVariant?: string
  onSelectVariant: (id: string) => void
  onBuild: () => void
}

function BuildOption({
  def,
  treasury,
  selectedVariant,
  onSelectVariant,
  onBuild,
}: BuildOptionProps): React.JSX.Element {
  const computed = computeVariantCost(def, selectedVariant)
  const effects = topEffects(computed.perTurnEffect, 3)
  const canAfford = treasury >= computed.cost

  return (
    <Card flat tint="soft" style={styles.buildOption}>
      <View style={styles.buildOptionTop}>
        <Text style={styles.buildIcon}>{def.icon}</Text>
        <View style={styles.buildBody}>
          <Text style={styles.buildName}>{def.name}</Text>
          <Text style={styles.buildDescription} numberOfLines={2}>
            {def.description}
          </Text>

          <View style={styles.buildMetaRow}>
            <Text style={styles.buildMetaText}>
              Cost <Text style={styles.buildMetaValue}>{formatMoney(computed.cost)}</Text>
            </Text>
            <Text style={styles.buildMetaText}>
              Upkeep{' '}
              <Text style={styles.buildMetaValue}>
                {formatMoney(computed.upkeep)}/t
              </Text>
            </Text>
            <Text style={styles.buildMetaText}>
              Build <Text style={styles.buildMetaValue}>{def.buildTurns}Q</Text>
            </Text>
          </View>

          {effects.length > 0 ? (
            <View style={styles.effectsRow}>
              {effects.map((e) => (
                <EffectChip
                  key={String(e.key)}
                  statKey={e.key}
                  delta={e.delta}
                />
              ))}
            </View>
          ) : null}

          <VariantPicker
            def={def}
            selectedId={selectedVariant}
            onSelect={onSelectVariant}
          />
        </View>
      </View>

      <View style={styles.buildFooter}>
        <Button
          label={canAfford ? 'BUILD' : 'TOO COSTLY'}
          variant={canAfford ? 'primary' : 'secondary'}
          small
          disabled={!canAfford}
          onPress={onBuild}
        />
      </View>
    </Card>
  )
}

// ----------------------------------------------------------------------------
// BuildTab
// ----------------------------------------------------------------------------

export default function BuildTab(): React.JSX.Element {
  const stats = useStats()
  const buildings = useBuildings()
  const queue = useQueuedBuilds()
  const queueBuild = useGameStore((s) => s.queueBuild)
  const cancelQueuedBuild = useGameStore((s) => s.cancelQueuedBuild)

  // Per-row variant selection
  const [variantByType, setVariantByType] = useState<
    Partial<Record<BuildingType, string>>
  >({})

  // Group existing buildings by type
  const groupedExisting = useMemo<Record<BuildingType, Building[]>>(() => {
    const map = {} as Record<BuildingType, Building[]>
    for (const b of buildings) {
      if (!map[b.type]) map[b.type] = []
      map[b.type].push(b)
    }
    return map
  }, [buildings])

  const handleSelectVariant = (type: BuildingType, id: string): void => {
    setVariantByType((prev) => ({ ...prev, [type]: id }))
  }

  const handleBuild = (def: BuildingDef): void => {
    // For buildings with variants, default to the first if none picked.
    const variant =
      variantByType[def.type] ?? def.variants?.[0]?.id ?? undefined
    queueBuild(def.type, variant)
  }

  const treasuryTint = stats.treasury > 100 ? 'gold' : 'default'

  return (
    <View style={styles.root}>
      {/* Treasury */}
      <Card title="Treasury" subtitle="Cash on hand for building." tint={treasuryTint}>
        <View style={styles.treasuryRow}>
          <Text style={styles.treasuryValue}>{formatMoney(stats.treasury)}</Text>
          <View style={styles.treasuryMetaCol}>
            <Text style={styles.treasuryMetaLabel}>UNDER CONSTRUCTION</Text>
            <Text style={styles.treasuryMetaValue}>{queue.length}</Text>
          </View>
        </View>
      </Card>

      {/* Under construction */}
      {queue.length > 0 ? (
        <Card title="Under Construction" subtitle="Cancel refunds 70% of cost.">
          <View style={styles.queuedList}>
            {queue.map((q) => (
              <QueuedItem key={q.id} q={q} onCancel={cancelQueuedBuild} />
            ))}
          </View>
        </Card>
      ) : null}

      {/* Existing buildings */}
      <Card title="Existing buildings" subtitle="Already standing across the city.">
        {Object.keys(groupedExisting).length === 0 ? (
          <Text style={styles.muted}>Nothing built yet.</Text>
        ) : (
          <View style={styles.existingGrid}>
            {(Object.keys(groupedExisting) as BuildingType[]).map((type) => {
              const def = ALL_BUILDINGS[type]
              if (!def) return null
              return (
                <ExistingChip
                  key={type}
                  icon={def.icon}
                  name={def.name}
                  count={groupedExisting[type].length}
                />
              )
            })}
          </View>
        )}
      </Card>

      {/* Build menu */}
      <Card title="Build Menu" subtitle="Queue construction for next quarter.">
        <View style={styles.buildList}>
          {ALL_BUILDING_LIST.map((def) => (
            <BuildOption
              key={def.type}
              def={def}
              treasury={stats.treasury}
              selectedVariant={variantByType[def.type]}
              onSelectVariant={(id) => handleSelectVariant(def.type, id)}
              onBuild={() => handleBuild(def)}
            />
          ))}
        </View>
      </Card>
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

  // Treasury
  treasuryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  treasuryValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoXl,
    color: colors.text,
    lineHeight: sizes.monoXl + 2,
  },
  treasuryMetaCol: {
    alignItems: 'flex-end',
  },
  treasuryMetaLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.pixelSm,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  treasuryMetaValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoLg,
    color: colors.text,
    marginTop: 2,
  },

  // Queue
  queuedList: {
    gap: spacing.md,
  },
  queuedItem: {
    gap: spacing.sm,
  },
  queuedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  queuedIcon: {
    fontSize: 28,
  },
  queuedTitleCol: {
    flex: 1,
  },
  queuedName: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.body,
    color: colors.text,
  },
  queuedMeta: {
    fontFamily: fonts.body,
    fontSize: sizes.caption,
    color: colors.textDim,
    marginTop: 2,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.divider,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },

  // Existing
  existingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  existingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgPanelAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  existingIcon: {
    fontSize: 16,
  },
  existingCount: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.body,
    color: colors.text,
  },
  existingName: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.textDim,
  },

  // Build list
  buildList: {
    gap: spacing.sm,
  },
  buildOption: {
    marginVertical: 0,
  },
  buildOptionTop: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  buildIcon: {
    fontSize: 32,
  },
  buildBody: {
    flex: 1,
    gap: spacing.xs,
  },
  buildName: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyLg,
    color: colors.text,
  },
  buildDescription: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.textDim,
    lineHeight: 18,
  },
  buildMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  buildMetaText: {
    fontFamily: fonts.body,
    fontSize: sizes.caption,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  buildMetaValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.bodyXs,
    color: colors.text,
  },
  effectsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  effectChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  effectChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.caption,
  },
  variantsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  variantBtn: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 60,
  },
  buildFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },

  // Common
  muted: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
})
