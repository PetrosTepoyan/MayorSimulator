import React, { useState, useMemo } from 'react'
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native'
import { useTax, useBudget, usePolicy, useGameStore } from '../../store/gameStore'
import { POLICY_INFO, previewPolicyChange } from '../../game/policies'
import { Panel } from '../ui/Panel'
import { PixelText } from '../ui/PixelText'
import { Button } from '../ui/Button'
import { StatBar } from '../ui/StatBar'
import { colors, fonts, sizes, spacing, radius } from '../../theme'
import type {
  PolicyState,
  TaxPolicy,
  BudgetAllocation,
  BudgetCategory,
} from '../../game/types'

// ============================================================================
// Local helper types
// ============================================================================

interface TaxSpec {
  key: keyof TaxPolicy
  label: string
  min: number
  max: number
  step: number
  unit: string
  hint: string
}

interface BudgetSpec {
  key: BudgetCategory
  label: string
}

// Keys for the qualitative (option-based) policies. minimumWage is handled
// separately with its own numeric stepper row.
type DiscretePolicyKey = Exclude<keyof PolicyState, 'minimumWage'>

const TAX_SPECS: readonly TaxSpec[] = [
  {
    key: 'income',
    label: 'Income Tax',
    min: 0,
    max: 50,
    step: 0.5,
    unit: '%',
    hint: 'Income > 30% may slow growth and prompt flight.',
  },
  {
    key: 'sales',
    label: 'Sales Tax',
    min: 0,
    max: 25,
    step: 0.5,
    unit: '%',
    hint: 'Sales tax is regressive — it hits the poor hardest.',
  },
  {
    key: 'property',
    label: 'Property Tax',
    min: 0,
    max: 10,
    step: 0.1,
    unit: '%',
    hint: 'Stable revenue, but high rates depress home values.',
  },
  {
    key: 'corporate',
    label: 'Corporate Tax',
    min: 0,
    max: 40,
    step: 0.5,
    unit: '%',
    hint: 'Above ~30% businesses may relocate to friendlier cities.',
  },
] as const

const BUDGET_SPECS: readonly BudgetSpec[] = [
  { key: 'education', label: 'Education' },
  { key: 'healthcare', label: 'Healthcare' },
  { key: 'security', label: 'Security' },
  { key: 'infrastructure', label: 'Infrastructure' },
  { key: 'welfare', label: 'Welfare' },
  { key: 'research', label: 'Research' },
  { key: 'environment', label: 'Environment' },
] as const

const DISCRETE_POLICY_KEYS: readonly DiscretePolicyKey[] = [
  'rentControl',
  'emissionStandards',
  'immigration',
  'drugPolicy',
  'transit',
  'education',
  'healthcare',
] as const

const MIN_WAGE_MIN = 0
const MIN_WAGE_MAX = 50
const MIN_WAGE_STEP = 0.5

// ============================================================================
// Pure helpers
// ============================================================================

/** Clamp a number to [min,max] and round to the precision implied by `step`. */
function clampStep(value: number, min: number, max: number, step: number): number {
  const clamped = Math.max(min, Math.min(max, value))
  // Avoid drifting floats like 2.499999 by snapping to multiples of step.
  const precision = step < 1 ? 10 : 1
  return Math.round(clamped * precision) / precision
}

function formatNumber(value: number, step: number): string {
  // If step is whole, show integer; otherwise show one decimal.
  return step < 1 ? value.toFixed(1) : value.toFixed(0)
}

function hintForMinimumWage(value: number): string {
  if (value < 5) return 'Below subsistence — working poor will struggle.'
  if (value <= 15) return 'Within the typical "neutral" band.'
  if (value <= 25) return 'Workers gain real income; some hiring slows.'
  return 'Very high — low-margin employers will cut staff.'
}

// ============================================================================
// Sub-components
// ============================================================================

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
}: StepperRowProps): JSX.Element {
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
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

interface BudgetRowProps {
  label: string
  value: number
  onDelta: (delta: number) => void
}

function BudgetRow({ label, value, onDelta }: BudgetRowProps): JSX.Element {
  return (
    <View style={styles.budgetRow}>
      <View style={styles.budgetHeader}>
        <Text style={styles.budgetLabel}>{label}</Text>
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
      <StatBar label="" value={value} showValue={false} color={colors.govBlue} />
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
}: OptionPillsProps<T>): JSX.Element {
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
            <Text style={[styles.pillLabel, isActive && styles.pillLabelActive]}>
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

// ============================================================================
// Main screen
// ============================================================================

export default function PolicyTab(): JSX.Element {
  const tax = useTax()
  const budget = useBudget()
  const policy = usePolicy()
  const setTax = useGameStore((s) => s.setTax)
  const setBudget = useGameStore((s) => s.setBudget)
  const setPolicy = useGameStore((s) => s.setPolicy)

  // Toast-style preview of the most recent policy change.
  const [previewNotes, setPreviewNotes] = useState<string[]>([])

  const budgetSum = useMemo<number>(
    () =>
      BUDGET_SPECS.reduce(
        (acc, spec) => acc + (budget[spec.key] ?? 0),
        0,
      ),
    [budget],
  )

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
    setPreviewNotes(notes)
    setPolicy(change)
  }

  const handleMinWageChange = (next: number): void => {
    if (next === policy.minimumWage) return
    applyPolicyChange({ minimumWage: next })
  }

  const dismissPreview = (): void => setPreviewNotes([])

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {previewNotes.length > 0 ? (
        <Panel style={styles.toast}>
          <View style={styles.toastHeader}>
            <PixelText size="xs" color={colors.govGold}>
              Advisors say
            </PixelText>
            <Pressable onPress={dismissPreview} hitSlop={8}>
              <Text style={styles.toastClose}>×</Text>
            </Pressable>
          </View>
          {previewNotes.map((note, idx) => (
            <Text key={idx} style={styles.toastNote}>
              • {note}
            </Text>
          ))}
        </Panel>
      ) : null}

      {/* SECTION 1: TAXES =================================================== */}
      <Panel title="Taxes">
        <Text style={styles.sectionIntro}>
          Set the rates that fund the city. Higher rates raise revenue but can
          slow growth and push residents or businesses elsewhere.
        </Text>
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
      </Panel>

      {/* SECTION 2: BUDGET ================================================= */}
      <Panel title="Budget Allocation (must sum to 100%)">
        <View style={styles.budgetTotalRow}>
          <Text style={styles.budgetTotalLabel}>Current total</Text>
          <Text
            style={[
              styles.budgetTotalValue,
              Math.abs(budgetSum - 100) < 0.5
                ? { color: colors.good }
                : { color: colors.warn },
            ]}
          >
            {budgetSum.toFixed(1)}%
          </Text>
        </View>
        <Text style={styles.sectionIntro}>
          Adjust by 1%; the store will renormalize automatically so the total
          stays at 100%.
        </Text>
        {BUDGET_SPECS.map((spec) => (
          <BudgetRow
            key={spec.key}
            label={spec.label}
            value={budget[spec.key] ?? 0}
            onDelta={(delta) => handleBudgetDelta(spec.key, delta)}
          />
        ))}
      </Panel>

      {/* SECTION 3: POLICIES =============================================== */}
      <Panel title="Policies">
        <Text style={styles.sectionIntro}>
          Structural levers that compound over many turns. Tap an option to
          switch.
        </Text>

        {/* Minimum wage stepper — separate row */}
        <View style={styles.policyBlock}>
          <PixelText size="sm" color={colors.text}>
            {POLICY_INFO.minimumWage.label}
          </PixelText>
          <Text style={styles.policyShort}>{POLICY_INFO.minimumWage.short}</Text>
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

        {/* Qualitative policies */}
        {DISCRETE_POLICY_KEYS.map((key) => {
          const info = POLICY_INFO[key]
          const options = info.options ?? []
          const activeValue = policy[key] as string
          const activeOption = options.find((o) => o.value === activeValue)
          return (
            <View key={key} style={styles.policyBlock}>
              <PixelText size="sm" color={colors.text}>
                {info.label}
              </PixelText>
              <Text style={styles.policyShort}>{info.short}</Text>
              <OptionPills
                options={options}
                active={activeValue}
                onPick={(value) =>
                  applyPolicyChange({ [key]: value } as Partial<PolicyState>)
                }
              />
              {activeOption ? (
                <View style={styles.effectsBox}>
                  {activeOption.effects.slice(0, 2).map((eff, idx) => (
                    <Text key={idx} style={styles.effectLine}>
                      • {eff}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          )
        })}
      </Panel>
    </ScrollView>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionIntro: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textDim,
    marginBottom: spacing.sm,
  },

  // Stepper row (taxes + min wage)
  stepperRow: {
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  stepperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.body,
    color: colors.text,
    flexShrink: 1,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperBtn: {
    minWidth: 40,
  },
  stepperValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    color: colors.text,
    minWidth: 64,
    textAlign: 'center',
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: sizes.body - 2,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  // Budget rows
  budgetTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.bgPanelAlt,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  budgetTotalLabel: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelXs,
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  budgetTotalValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoLg,
    color: colors.text,
  },
  budgetRow: {
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
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
    minWidth: 48,
    textAlign: 'center',
  },

  // Policy blocks
  policyBlock: {
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  policyShort: {
    fontFamily: fonts.body,
    fontSize: sizes.body - 1,
    color: colors.textDim,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanelAlt,
    minWidth: 88,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: colors.govBlue,
    borderColor: colors.govNavy,
  },
  pillPressed: {
    opacity: 0.85,
  },
  pillLabel: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.textDim,
  },
  pillLabelActive: {
    color: colors.paper,
  },
  effectsBox: {
    marginTop: spacing.sm,
    paddingLeft: spacing.sm,
    borderLeftColor: colors.govGold,
    borderLeftWidth: 2,
  },
  effectLine: {
    fontFamily: fonts.body,
    fontSize: sizes.body - 1,
    color: colors.textDim,
    marginVertical: 1,
  },

  // Preview toast
  toast: {
    backgroundColor: colors.bgPanelAlt,
    borderColor: colors.govGold,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  toastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  toastClose: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoLg,
    color: colors.textDim,
    paddingHorizontal: spacing.sm,
  },
  toastNote: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.text,
    marginVertical: 1,
  },
})
