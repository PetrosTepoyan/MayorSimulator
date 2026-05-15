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
import { COUNTRIES, getCountry } from '../../game/countries'
import { useGameStore } from '../../store/gameStore'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { PixelText } from '../ui/PixelText'
import { StatBar } from '../ui/StatBar'
import { StatTile } from '../ui/StatTile'
import { formatMoney, formatPop } from '../../game/util'
import { colors, fonts, sizes, spacing, radius, elevation } from '../../theme'

// ============================================================================
// CountrySelectScreen — pick a country preset + mayor name.
// Horizontally scrollable country chips, a detail card with stat tiles + bars,
// and a name input. One big primary action at the bottom.
// ============================================================================

interface CountryChipProps {
  country: Country
  selected: boolean
  onPress: () => void
}

function CountryChip({ country, selected, onPress }: CountryChipProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${country.name}, ${country.cityName}`}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && !selected && styles.chipPressed,
      ]}
    >
      <Text style={styles.chipFlag}>{country.flag}</Text>
      <Text style={[styles.chipName, selected && styles.chipNameSelected]} numberOfLines={1}>
        {country.name}
      </Text>
      <Text style={styles.chipCity} numberOfLines={1}>
        {country.cityName}
      </Text>
    </Pressable>
  )
}

export default function CountrySelectScreen(): React.JSX.Element {
  const [selectedId, setSelectedId] = useState<string>(COUNTRIES[0].id)
  const [mayorName, setMayorName] = useState<string>('Mayor Chen')

  const setPhase = useGameStore((s) => s.setPhase)
  const startNewGame = useGameStore((s) => s.startNewGame)

  const selected: Country = useMemo(() => {
    try {
      return getCountry(selectedId)
    } catch {
      return COUNTRIES[0]
    }
  }, [selectedId])

  const trimmedName = mayorName.trim()
  const canStart = trimmedName.length > 0

  const handleStart = (): void => {
    if (!canStart) return
    startNewGame(selected.id, trimmedName)
  }

  const handleBack = (): void => {
    setPhase('start')
  }

  const s = selected.startingStats

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header bar */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back to start"
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
        >
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Choose Your City</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Country chip carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {COUNTRIES.map((country) => (
            <CountryChip
              key={country.id}
              country={country}
              selected={country.id === selectedId}
              onPress={() => setSelectedId(country.id)}
            />
          ))}
        </ScrollView>

        {/* Detail card */}
        <Card style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailFlag}>{selected.flag}</Text>
            <View style={styles.detailHeaderText}>
              <Text style={styles.countryName}>{selected.name}</Text>
              <Text style={styles.cityName}>{selected.cityName}</Text>
            </View>
          </View>

          <Text style={styles.description}>{selected.description}</Text>

          {/* Stat tile grid */}
          <View style={styles.tileGrid}>
            <View style={styles.tileRow}>
              <StatTile
                icon="👥"
                label="Population"
                value={formatPop(s.population)}
              />
              <StatTile
                icon="📈"
                label="GDP/cap"
                value={`$${(s.gdpPerCapita / 1000).toFixed(0)}k`}
              />
            </View>
            <View style={styles.tileRow}>
              <StatTile
                icon="📚"
                label="Education"
                value={`${s.education.toFixed(0)}`}
                unit="/100"
              />
              <StatTile
                icon="🚓"
                label="Crime"
                value={`${s.crime.toFixed(0)}`}
                unit="/100"
              />
            </View>
          </View>

          {/* Quick financial summary */}
          <View style={styles.miniRow}>
            <View style={styles.miniCell}>
              <PixelText size="xs" color={colors.textMuted}>
                TREASURY
              </PixelText>
              <Text style={styles.miniValue}>{formatMoney(s.treasury)}</Text>
            </View>
            <View style={styles.miniCell}>
              <PixelText size="xs" color={colors.textMuted}>
                DEBT
              </PixelText>
              <Text style={styles.miniValue}>{formatMoney(s.debt)}</Text>
            </View>
            <View style={styles.miniCell}>
              <PixelText size="xs" color={colors.textMuted}>
                TERM
              </PixelText>
              <Text style={styles.miniValue}>{selected.termLengthYears}y</Text>
            </View>
          </View>

          {/* Stat bars */}
          <View style={styles.barsBlock}>
            <PixelText size="xs" color={colors.textMuted} style={styles.sectionLabel}>
              CITY VITALS
            </PixelText>
            <StatBar icon="🏥" label="Health" value={s.health} />
            <StatBar icon="😊" label="Happiness" value={s.happiness} />
            <StatBar icon="💡" label="Innovation" value={s.innovation} />
            <StatBar icon="🏭" label="Pollution" value={s.pollution} inverted />
            <StatBar icon="⚖️" label="Inequality" value={s.inequality} inverted />
            <StatBar icon="💼" label="Unemployment" value={s.unemployment} inverted />
          </View>

          {/* Cultural notes */}
          <View style={styles.notesBlock}>
            <PixelText size="xs" color={colors.textMuted} style={styles.sectionLabel}>
              CULTURAL NOTES
            </PixelText>
            <View style={styles.notesList}>
              {selected.culturalNotes.map((note, idx) => (
                <View key={idx} style={styles.noteRow}>
                  <Text style={styles.noteBullet}>•</Text>
                  <Text style={styles.noteText}>{note}</Text>
                </View>
              ))}
            </View>
          </View>
        </Card>

        {/* Mayor name input */}
        <Card title="Your name" subtitle="Pick something memorable. The press will use it.">
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
            selectionColor={colors.primary}
          />
        </Card>

        {/* Start button */}
        <View style={styles.startWrap}>
          <Button
            label={`BECOME MAYOR OF ${selected.cityName.toUpperCase()}`}
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgElev,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    fontSize: sizes.title,
    color: colors.text,
  },
  headerSpacer: {
    width: 60,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  backBtnPressed: { opacity: 0.55 },
  backArrow: {
    fontSize: 24,
    lineHeight: 26,
    color: colors.primary,
    fontFamily: fonts.bodyBold,
  },
  backLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.body,
    color: colors.primary,
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + spacing.lg,
    gap: spacing.md,
  },

  // Chip row
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
  },
  chip: {
    width: 132,
    backgroundColor: colors.bgPanelAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...elevation.sm,
  },
  chipSelected: {
    backgroundColor: colors.bgPanel,
    borderColor: colors.primary,
    borderWidth: 2,
    ...elevation.md,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipFlag: {
    fontSize: 40,
    lineHeight: 44,
  },
  chipName: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.body,
    color: colors.text,
    textAlign: 'center',
  },
  chipNameSelected: {
    color: colors.primary,
  },
  chipCity: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.textDim,
    textAlign: 'center',
  },

  // Detail card
  detailCard: {
    marginVertical: 0,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  detailFlag: {
    fontSize: 48,
    lineHeight: 52,
  },
  detailHeaderText: {
    flex: 1,
  },
  countryName: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.titleLg,
    color: colors.text,
  },
  cityName: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    color: colors.textDim,
    marginTop: 2,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.text,
    lineHeight: sizes.body + 6,
    marginBottom: spacing.md,
  },

  tileGrid: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tileRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  miniRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgPanelAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  miniCell: {
    flex: 1,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  miniValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    color: colors.text,
  },

  barsBlock: {
    marginTop: spacing.sm,
  },
  notesBlock: {
    marginTop: spacing.lg,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  notesList: {
    gap: spacing.xs,
  },
  noteRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  noteBullet: {
    fontFamily: fonts.bodyBold,
    color: colors.gold,
    fontSize: sizes.body,
    lineHeight: sizes.body + 6,
  },
  noteText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textDim,
    lineHeight: sizes.body + 6,
  },

  // Input
  input: {
    backgroundColor: colors.bgPanel,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: fonts.body,
    fontSize: sizes.bodyLg,
    color: colors.text,
  },

  // Start button
  startWrap: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  startWarning: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.warn,
    textAlign: 'center',
  },
})
