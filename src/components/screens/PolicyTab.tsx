import React, { useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import {
  useTax,
  useBudget,
  usePolicy,
  useGameStore,
} from '../../store/gameStore'
import { POLICY_INFO, previewPolicyChange } from '../../game/policies'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { StatBar } from '../ui/StatBar'
import { colors, fonts, sizes, spacing, radius } from '../../theme'
import type {
  PolicyState,
  TaxPolicy,
  BudgetAllocation,
  BudgetCategory,
} from '../../game/types'

// ----------------------------------------------------------------------------
// Specs
// ----------------------------------------------------------------------------

interface TaxSpec {
  key: keyof TaxPolicy
  label: string
  min: number
  max: number
  step: number
  unit: string
  hint: string
}

const TAX_SPECS: readonly TaxSpec[] = [
  {
    key: 'income',
    label: 'Income Tax',
    min: 0,
    max: 50,
    step: 0.5,
    unit: '%',
    hint: 'Above 30% may slow growth and prompt flight.',
  },
  {
    key: 'sales',
    label: 'Sales Tax',
    min: 0,
    max: 25,
    step: 0.5,
    unit: '%',
    hint: 'Regressive — hits low-income households hardest.',
  },
  {
    key: 'property',
    label: 'Property Tax',
    min: 0,
    max: 10,
    step: 0.1,
    unit: '%',
    hint: 'Stable revenue. High rates depress home values.',
  },
  {
    key: 'corporate',
    label: 'Corporate Tax',
    min: 0,
    max: 40,
    step: 0.5,
    unit: '%',
    hint: 'Above ~30%, businesses may relocate.',
  },
] as const

const BUDGET_SPECS: ReadonlyArray<{ key: BudgetCategory; label: string; icon: string }> = [
  { key: 'education', label: 'Education', icon: '📚' },
  { key: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { key: 'security', label: 'Security', icon: '🚓' },
  { key: 'infrastructure', label: 'Infrastructure', icon: '🛣️' },
  { key: 'welfare', label: 'Welfare', icon: '🤝' },
  { key: 'research', label: 'Research', icon: '🔬' },
  { key: 'environment', label: 'Environment', icon: '🌳' },
] as const

type DiscretePolicyKey = Exclude<keyof PolicyState, 'minimumWage'>

const DISCRETE_POLICY_KEYS: readonly DiscretePolicyKey[] = [
  'rentControl',
  'emissionStandards',
  'immigration',
  'drugPolicy',
  'transit',
  'education',
  'healthcare',
] as const

const POLICY_ICONS: Record<DiscretePolicyKey, string> = {
  rentControl: '🏠',
  emissionStandards: '🏭',
  immigration: '🛂',
  drugPolicy: '💊',
  transit: '🚆',
  education: '🎓',
  healthcare: '⚕️',
}

const MIN_WAGE_MIN = 0
const MIN_WAGE_MAX = 50
const MIN_WAGE_STEP = 0.5

// ----------------------------------------------------------------------------
// Pure helpers
// ----------------------------------------------------------------------------

function clampStep(
  value: number,
  min: number,
  max: number,
  step: number,
): number {
  const clamped = Math.max(min, Math.min(max, value))
  const precision = step < 1 ? 10 : 1
  return Math.round(clamped * precision) / precision
}

function formatNumber(value: number, step: number): string {
  return step < 1 ? value.toFixed(1) : value.toFixed(0)
}

function hintForMinimumWage(value: number): string {
  if (value < 5) return 'Below subsistence — working poor will struggle.'
  if (value <= 15) return 'Within the typical "neutral" band.'
  if (value <= 25) return 'Workers gain real income; hiring slows somewhat.'
  return 'Very high — low-margin employers will cut staff.'
}

// ----------------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------------

interface StepperRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  hint?: string
  onChange: (next: number) => void
}

function StepperRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  hint,
  onChange,
}: StepperRowProps): React.JSX.Element {
  const dec = (): void => onChange(clampStep(value - step, min, max, step))
  const inc = (): void => onChange(clampStep(value + step, min, max, step))
  const atMin = value <= min + 1e-6
  const atMax = value >= max - 1e-6

  return (
    <View style={styles.stepperRow}>
      <View style={styles.stepperHeader}>
        <Text style={styles.stepperLabel}>{label}</Text>
        <View style={styles.stepperControls}>
          <Button
            label="−"
            variant="secondary"
            small
            disabled={atMin}
            onPress={dec}
            style={styles.stepperBtn}
          />
          <Text style={styles.stepperValue}>
            {formatNumber(value, step)}
            {unit ? unit : ''}
          </Text>
          <Button
            label="+"
            variant="secondary"
            small
            disabled={atMax}
            onPress={inc}
            style={styles.stepperBtn}
          />
        </View>
      </View>
      {hint ? <Text style={styles.stepperHint}>{hint}</Text> : null}
    </View>
  )
}

interface BudgetRowProps {
  icon: string
  label: string
  value: number
  onDelta: (delta: number) => void
}

function BudgetRow({
  icon,
  label,
  value,
  onDelta,
}: BudgetRowProps): React.JSX.Element {
  return (
    <View style={styles.budgetRow}>
      <View style={styles.budgetHeader}>
        <View style={styles.budgetLabelRow}>
          <Text style={styles.budgetIcon}>{icon}</Text>
          <Text style={styles.budgetLabel}>{label}</Text>
        </View>
        <View style={styles.budgetControls}>
          <Button
            label="−"
            variant="secondary"
            small
            disabled={value <= 0}
            onPress={() => onDelta(-1)}
            style={styles.stepperBtn}
          />
          <Text style={styles.budgetValue}>{value.toFixed(0)}%</Text>
          <Button
            label="+"
            variant="secondary"
            small
            disabled={value >= 100}
            onPress={() => onDelta(1)}
            style={styles.stepperBtn}
          />
        </View>
      </View>
      <StatBar label="" value={value} showValue={false} color={colors.primary} />
    </View>
  )
}

interface OptionPillsProps<T extends string> {
  options: ReadonlyArray<{ value: string; label: string; effects: string[] }>
  active: T
  onPick: (value: T) => void
}

function OptionPills<T extends string>({
  options,
  active,
  onPick,
}: OptionPillsProps<T>): React.JSX.Element {
  return (
    <View style={styles.pillsRow}>
      {options.map((opt) => {
        const isActive = opt.value === active
        return (
          <Pressable
            key={opt.value}
            onPress={() => onPick(opt.value as T)}
            style={({ pressed }) => [
              styles.pill,
              isActive && styles.pillActive,
              pressed && styles.pillPressed,
            ]}
          >
            <Text
              style={[
                styles.pillLabel,
                isActive && styles.pillLabelActive,
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

interface AdvisorToastProps {
  notes: string[]
  onDismiss: () => void
}

function AdvisorToast({
  notes,
  onDismiss,
}: AdvisorToastProps): React.JSX.Element {
  return (
    <Card title="Advisors say" tint="gold">
      <View style={styles.toastHeader}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Text style={styles.toastClose}>×</Text>
        </Pressable>
      </View>
      <View>
        {notes.map((note, i) => (
          <Text key={i} style={styles.toastNote}>
            • {note}
          </Text>
        ))}
      </View>
    </Card>
  )
}

// ----------------------------------------------------------------------------
// PolicyTab
// ----------------------------------------------------------------------------

export default function PolicyTab(): React.JSX.Element {
  const tax = useTax()
  const budget = useBudget()
  const policy = usePolicy()
  const setTax = useGameStore((s) => s.setTax)
  const setBudget = useGameStore((s) => s.setBudget)
  const setPolicy = useGameStore((s) => s.setPolicy)

  const [previewNotes, setPreviewNotes] = useState<string[]>([])

  const budgetSum = useMemo<number>(
    () => BUDGET_SPECS.reduce((acc, s) => acc + (budget[s.key] ?? 0), 0),
    [budget],
  )

  const budgetGood = Math.abs(budgetSum - 100) < 0.5

  const handleTaxChange = (key: keyof TaxPolicy, next: number): void => {
    setTax({ [key]: next } as Partial<TaxPolicy>)
  }

  const handleBudgetDelta = (key: BudgetCategory, delta: number): void => {
    const current = budget[key] ?? 0
    const next = Math.max(0, Math.min(100, current + delta))
    if (next === current) return
    setBudget({ [key]: next } as Partial<BudgetAllocation>)
  }

  const applyPolicyChange = (change: Partial<PolicyState>): void => {
    const notes = previewPolicyChange(policy, change)
    if (notes.length > 0) setPreviewNotes(notes)
    setPolicy(change)
  }

  const handleMinWageChange = (next: number): void => {
    if (next === policy.minimumWage) return
    applyPolicyChange({ minimumWage: next })
  }

  return (
    <View style={styles.root}>
      {previewNotes.length > 0 ? (
        <AdvisorToast
          notes={previewNotes}
          onDismiss={() => setPreviewNotes([])}
        />
      ) : null}

      {/* Taxes */}
      <Card
        title="Taxes"
        subtitle="Set the rates that fund the city."
      >
        <View style={styles.steppersBlock}>
          {TAX_SPECS.map((spec) => (
            <StepperRow
              key={spec.key}
              label={spec.label}
              value={tax[spec.key]}
              min={spec.min}
              max={spec.max}
              step={spec.step}
              unit={spec.unit}
              hint={spec.hint}
              onChange={(next) => handleTaxChange(spec.key, next)}
            />
          ))}
        </View>
      </Card>

      {/* Budget */}
      <Card
        title="Budget Allocation"
        subtitle="Must sum to 100%."
        rightAccessory={
          <Text
            style={[
              styles.budgetTotal,
              { color: budgetGood ? colors.good : colors.warn },
            ]}
          >
            {budgetSum.toFixed(1)}%
          </Text>
        }
      >
        <View style={styles.budgetBlock}>
          {BUDGET_SPECS.map((spec) => (
            <BudgetRow
              key={spec.key}
              icon={spec.icon}
              label={spec.label}
              value={budget[spec.key] ?? 0}
              onDelta={(d) => handleBudgetDelta(spec.key, d)}
            />
          ))}
        </View>
        <Text style={styles.budgetFooter}>
          Increments of 1%; the city auto-renormalizes to 100%.
        </Text>
      </Card>

      {/* Policies */}
      <Card
        title="Policies"
        subtitle="Structural levers that compound over many turns."
      >
        {/* Minimum wage */}
        <View style={styles.policyBlock}>
          <View style={styles.policyHeader}>
            <Text style={styles.policyIcon}>💵</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.policyName}>
                {POLICY_INFO.minimumWage.label}
              </Text>
              <Text style={styles.policyHint}>
                {POLICY_INFO.minimumWage.short}
              </Text>
            </View>
          </View>
          <StepperRow
            label="Wage floor"
            value={policy.minimumWage}
            min={MIN_WAGE_MIN}
            max={MIN_WAGE_MAX}
            step={MIN_WAGE_STEP}
            unit=" $/hr"
            hint={hintForMinimumWage(policy.minimumWage)}
            onChange={handleMinWageChange}
          />
        </View>

        {/* Discrete policies */}
        {DISCRETE_POLICY_KEYS.map((key) => {
          const info = POLICY_INFO[key]
          if (!info || !info.options) return null
          const active = policy[key] as string
          const activeOpt = info.options.find((o) => o.value === active)
          return (
            <View key={key} style={styles.policyBlock}>
              <View style={styles.policyHeader}>
                <Text style={styles.policyIcon}>{POLICY_ICONS[key]}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.policyName}>{info.label}</Text>
                  <Text style={styles.policyHint}>{info.short}</Text>
                </View>
              </View>
              <OptionPills
                options={info.options}
                active={active}
                onPick={(v: string) =>
                  applyPolicyChange({ [key]: v } as Partial<PolicyState>)
                }
              />
              {activeOpt ? (
                <View style={styles.effectsBlock}>
                  {activeOpt.effects.slice(0, 2).map((e, i) => (
                    <Text key={i} style={styles.effectText}>
                      • {e}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          )
        })}
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

  // Stepper
  steppersBlock: {
    gap: spacing.md,
  },
  stepperRow: {
    gap: spacing.xs,
  },
  stepperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.body,
    color: colors.text,
    flex: 1,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperBtn: {
    minWidth: 36,
    paddingHorizontal: spacing.sm,
  },
  stepperValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    color: colors.text,
    minWidth: 56,
    textAlign: 'center',
  },
  stepperHint: {
    fontFamily: fonts.body,
    fontSize: sizes.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  // Budget
  budgetTotal: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
  },
  budgetBlock: {
    gap: spacing.md,
  },
  budgetRow: {
    gap: spacing.xs,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  budgetIcon: {
    fontSize: 16,
  },
  budgetLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.body,
    color: colors.text,
  },
  budgetControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  budgetValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    color: colors.text,
    minWidth: 56,
    textAlign: 'center',
  },
  budgetFooter: {
    fontFamily: fonts.body,
    fontSize: sizes.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },

  // Policy block
  policyBlock: {
    paddingVertical: spacing.md,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  policyIcon: {
    fontSize: 24,
  },
  policyName: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyLg,
    color: colors.text,
  },
  policyHint: {
    fontFamily: fonts.body,
    fontSize: sizes.caption,
    color: colors.textDim,
    marginTop: 2,
    lineHeight: 16,
  },

  // Pills
  pillsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pill: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.bgPanelAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillPressed: {
    opacity: 0.85,
  },
  pillLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyXs,
    color: colors.textDim,
  },
  pillLabelActive: {
    color: '#ffffff',
  },

  effectsBlock: {
    gap: 2,
    marginTop: spacing.xs,
  },
  effectText: {
    fontFamily: fonts.body,
    fontSize: sizes.caption,
    color: colors.textDim,
    lineHeight: 16,
  },

  // Toast
  toastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -spacing.sm,
  },
  toastClose: {
    fontFamily: fonts.bodyBold,
    fontSize: 24,
    color: colors.textDim,
    lineHeight: 24,
    paddingHorizontal: spacing.xs,
  },
  toastNote: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.text,
    lineHeight: 18,
    marginVertical: 2,
  },
})
