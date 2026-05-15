import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  SafeAreaView,
  StyleSheet,
  Pressable,
} from 'react-native'
import type { Country } from '../../game/types'
import { COUNTRIES } from '../../game/countries'
import { useGameStore } from '../../store/gameStore'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { PixelText } from '../ui/PixelText'
import { StatBar } from '../ui/StatBar'
import { formatMoney } from '../../game/util'
import { colors, fonts, sizes, spacing, radius } from '../../theme'

// ============================================================================
// Country Select Screen
// Player picks one of the 6 country presets and a mayor name to start a game.
// ============================================================================

interface DetailRow {
  label: string
  value: string
}

const formatPopulation = (n: number): string =>
  n.toLocaleString('en-US')

const formatPercent = (n: number, digits = 1): string =>
  `${n.toFixed(digits)}%`

export default function CountrySelectScreen(): JSX.Element {
  const [selectedId, setSelectedId] = useState<string>(COUNTRIES[0].id)
  const [mayorName, setMayorName] = useState<string>('Mayor Chen')

  const setPhase = useGameStore((s) => s.setPhase)

  const selected: Country = useMemo(
    () => COUNTRIES.find((c) => c.id === selectedId) ?? COUNTRIES[0],
    [selectedId],
  )

  const trimmedName = mayorName.trim()
  const canStart = trimmedName.length > 0

  const handleStart = (): void => {
    if (!canStart) return
    useGameStore.getState().startNewGame(selected.id, trimmedName)
  }

  const handleBack = (): void => {
    setPhase('start')
  }

  // Non-bar stats rendered as label/value rows
  const detailRows: DetailRow[] = useMemo(() => {
    const s = selected.startingStats
    return [
      { label: 'Treasury', value: formatMoney(s.treasury) },
      { label: 'Debt', value: formatMoney(s.debt) },
      { label: 'GDP / Capita', value: `$${s.gdpPerCapita.toLocaleString('en-US')}` },
      { label: 'Population', value: formatPopulation(s.population) },
      { label: 'Unemployment', value: formatPercent(s.unemployment) },
      { label: 'Inflation', value: formatPercent(s.inflation) },
      { label: 'Credit Rating', value: `${s.creditRating.toFixed(0)} / 100` },
      { label: 'Happiness', value: `${s.happiness.toFixed(0)} / 100` },
      { label: 'Approval', value: `${s.approval.toFixed(0)} / 100` },
      { label: 'Term Length', value: `${selected.termLengthYears} years` },
    ]
  }, [selected])

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back to start"
        >
          <Text style={styles.backArrow}>{'‹'}</Text>
          <PixelText size="xs" color={colors.textDim}>
            BACK
          </PixelText>
        </Pressable>
        <PixelText size="md" style={styles.headerTitle}>
          CHOOSE YOUR CITY
        </PixelText>
        {/* Spacer to balance the back button */}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Country chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {COUNTRIES.map((country) => {
            const isSelected = country.id === selectedId
            return (
              <Pressable
                key={country.id}
                onPress={() => setSelectedId(country.id)}
                style={({ pressed }) => [
                  styles.chip,
                  isSelected && styles.chipSelected,
                  pressed && !isSelected && styles.chipPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${country.name}, ${country.cityName}`}
              >
                <Text style={styles.chipFlag}>{country.flag}</Text>
                <PixelText
                  size="xs"
                  color={isSelected ? colors.paper : colors.text}
                  style={styles.chipName}
                >
                  {country.name}
                </PixelText>
                <Text
                  style={[
                    styles.chipCity,
                    isSelected && { color: colors.paperDark },
                  ]}
                  numberOfLines={1}
                >
                  {country.cityName}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {/* Detail panel */}
        <Panel title="Country Briefing">
          {/* Title row: flag + name + city */}
          <View style={styles.titleRow}>
            <Text style={styles.titleFlag}>{selected.flag}</Text>
            <View style={styles.titleTextCol}>
              <PixelText size="md">{selected.name}</PixelText>
              <Text style={styles.cityName}>{selected.cityName}</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description}>{selected.description}</Text>

          {/* Stat bars (0-100 metrics) */}
          <View style={styles.section}>
            <PixelText size="xs" color={colors.textDim} style={styles.sectionLabel}>
              CITY VITALS
            </PixelText>
            <StatBar label="Education" value={selected.startingStats.education} />
            <StatBar label="Health" value={selected.startingStats.health} />
            <StatBar label="Crime" value={selected.startingStats.crime} inverted />
            <StatBar label="Pollution" value={selected.startingStats.pollution} inverted />
            <StatBar label="Innovation" value={selected.startingStats.innovation} />
            <StatBar label="Inequality" value={selected.startingStats.inequality} inverted />
          </View>

          {/* Numeric stat rows */}
          <View style={styles.section}>
            <PixelText size="xs" color={colors.textDim} style={styles.sectionLabel}>
              ECONOMY & PEOPLE
            </PixelText>
            <View style={styles.rowList}>
              {detailRows.map((row) => (
                <View key={row.label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{row.label}</Text>
                  <Text style={styles.detailValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Cultural notes */}
          <View style={styles.section}>
            <PixelText size="xs" color={colors.textDim} style={styles.sectionLabel}>
              CULTURAL NOTES
            </PixelText>
            <View style={styles.notesList}>
              {selected.culturalNotes.map((note, idx) => (
                <Text key={idx} style={styles.note}>
                  {`• ${note}`}
                </Text>
              ))}
            </View>
          </View>
        </Panel>

        {/* Mayor name input */}
        <Panel title="Your Identity">
          <Text style={styles.inputLabel}>Your name</Text>
          <TextInput
            value={mayorName}
            onChangeText={setMayorName}
            placeholder="Mayor ___"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            maxLength={32}
            selectionColor={colors.govGold}
          />
          <Text style={styles.inputHint}>
            This is how the press, citizens, and council will address you.
          </Text>
        </Panel>

        {/* Start button */}
        <View style={styles.startWrap}>
          <Button
            label={`START AS MAYOR OF ${selected.cityName.toUpperCase()}`}
            variant="primary"
            full
            disabled={!canStart}
            onPress={handleStart}
          />
          {!canStart ? (
            <Text style={styles.startWarning}>Enter a name to continue.</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    backgroundColor: colors.bgElev,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 64,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 64,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  backBtnPressed: {
    opacity: 0.6,
  },
  backArrow: {
    color: colors.textDim,
    fontFamily: fonts.mono,
    fontSize: sizes.monoLg,
    lineHeight: sizes.monoLg,
    marginRight: 2,
  },

  // Chip row
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
  },
  chip: {
    backgroundColor: colors.bgPanel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 108,
    gap: spacing.xs,
  },
  chipSelected: {
    backgroundColor: colors.govBlue,
    borderColor: colors.govGold,
    borderWidth: 2,
    shadowColor: colors.govGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  chipPressed: {
    backgroundColor: colors.bgPanelAlt,
  },
  chipFlag: {
    fontSize: 28,
    lineHeight: 32,
    marginBottom: 2,
  },
  chipName: {
    textAlign: 'center',
  },
  chipCity: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.textDim,
    textAlign: 'center',
    maxWidth: 96,
  },

  // Title row inside detail panel
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  titleFlag: {
    fontSize: 40,
    lineHeight: 44,
  },
  titleTextCol: {
    flex: 1,
    gap: spacing.xs,
  },
  cityName: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoLg,
    color: colors.paperDark,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    lineHeight: sizes.body + 6,
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Sections
  section: {
    marginTop: spacing.md,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },

  // Detail rows
  rowList: {
    backgroundColor: colors.bgPanelAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textDim,
  },
  detailValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    color: colors.text,
  },

  // Cultural notes
  notesList: {
    gap: spacing.xs,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textDim,
    lineHeight: sizes.body + 6,
  },

  // Mayor input
  inputLabel: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelXs,
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontFamily: fonts.mono,
    fontSize: sizes.monoLg,
    color: colors.paper,
  },
  inputHint: {
    fontFamily: fonts.body,
    fontSize: sizes.body - 1,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  // Start button
  startWrap: {
    marginTop: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  startWarning: {
    fontFamily: fonts.body,
    fontSize: sizes.body - 1,
    color: colors.warn,
    textAlign: 'center',
  },
})
