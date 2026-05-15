import React, { useMemo, useState } from 'react'
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native'
import { Card } from '../ui/Card'
import { PixelText } from '../ui/PixelText'
import { colors, fonts, sizes, spacing, radius, elevation } from '../../theme'
import type { GlossaryEntry } from '../../game/glossary'

// ============================================================================
// LearnTab — civics & economics glossary browser.
// Inside the Dashboard tab system; no SafeAreaView (HUD already handles it).
// ============================================================================

// Defensive import — module may not exist or be empty.
let GLOSSARY: GlossaryEntry[] = []
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  GLOSSARY = require('../../game/glossary').GLOSSARY ?? []
} catch {
  GLOSSARY = []
}

// ============================================================================
// Types & constants
// ============================================================================

type Category = GlossaryEntry['category']

const ALL_CATEGORIES: ReadonlyArray<Category> = [
  'economics',
  'politics',
  'civics',
  'governance',
  'environment',
  'social',
]

const CATEGORY_LABEL: Record<Category, string> = {
  economics: 'Economics',
  politics: 'Politics',
  civics: 'Civics',
  governance: 'Governance',
  environment: 'Environment',
  social: 'Social',
}

const CATEGORY_COLOR: Record<Category, string> = {
  economics: colors.gold,
  politics: colors.primary,
  civics: colors.teal,
  governance: colors.navy,
  environment: colors.good,
  social: colors.red,
}

// ============================================================================
// Category chip
// ============================================================================

interface ChipProps {
  label: string
  active: boolean
  onPress: () => void
  accent?: string
}

function Chip({ label, active, onPress, accent }: ChipProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && {
          backgroundColor: accent ?? colors.primary,
          borderColor: accent ?? colors.primary,
        },
        pressed && styles.chipPressed,
      ]}
    >
      <Text
        style={[
          styles.chipLabel,
          { color: active ? '#ffffff' : colors.textDim },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

// ============================================================================
// Entry card — collapsed shows term + shortDef. Tap to expand for full detail.
// ============================================================================

interface EntryCardProps {
  entry: GlossaryEntry
  expanded: boolean
  onToggle: () => void
}

function EntryCard({ entry, expanded, onToggle }: EntryCardProps): React.JSX.Element {
  const accent = CATEGORY_COLOR[entry.category] ?? colors.primary
  const cardStyle = expanded
    ? { ...styles.entryCard, ...styles.entryCardExpanded }
    : styles.entryCard
  return (
    <Card onPress={onToggle} style={cardStyle}>
      <View style={styles.entryHeader}>
        <View style={[styles.accentBar, { backgroundColor: accent }]} />
        <View style={styles.entryHeaderText}>
          <Text style={styles.term}>{entry.term}</Text>
          <Text style={styles.shortDef}>{entry.shortDef}</Text>
        </View>
        <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
      </View>

      {expanded ? (
        <View style={styles.expandedBody}>
          {entry.longDef ? (
            <View style={styles.detailBlock}>
              <PixelText size="xs" color={colors.textMuted}>
                IN DEPTH
              </PixelText>
              <Text style={styles.detailBody}>{entry.longDef}</Text>
            </View>
          ) : null}

          {entry.realWorldExample ? (
            <View style={styles.detailBlock}>
              <PixelText size="xs" color={colors.textMuted}>
                REAL WORLD
              </PixelText>
              <Text style={styles.detailBody}>{entry.realWorldExample}</Text>
            </View>
          ) : null}

          {entry.inGameRelevance ? (
            <View style={styles.detailBlock}>
              <PixelText size="xs" color={accent}>
                IN MAYORSIM
              </PixelText>
              <Text style={styles.detailBody}>{entry.inGameRelevance}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  )
}

// ============================================================================
// Screen
// ============================================================================

export default function LearnTab(): React.JSX.Element {
  const [query, setQuery] = useState<string>('')
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filter + group entries by category
  const grouped: Array<{ category: Category; entries: GlossaryEntry[] }> = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = GLOSSARY.filter((e) => {
      if (activeCategory !== 'all' && e.category !== activeCategory) return false
      if (!q) return true
      return (
        e.term.toLowerCase().includes(q) ||
        e.shortDef.toLowerCase().includes(q) ||
        (e.longDef ?? '').toLowerCase().includes(q)
      )
    })

    const map: Partial<Record<Category, GlossaryEntry[]>> = {}
    for (const entry of filtered) {
      const cat = entry.category
      if (!map[cat]) map[cat] = []
      map[cat]!.push(entry)
    }
    return ALL_CATEGORIES.filter((c) => (map[c]?.length ?? 0) > 0).map((c) => ({
      category: c,
      entries: map[c] as GlossaryEntry[],
    }))
  }, [query, activeCategory])

  const totalShown = grouped.reduce((s, g) => s + g.entries.length, 0)

  const toggle = (id: string): void => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Learn</Text>
        <Text style={styles.subtitle}>Civics & economics, briefly.</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search terms…"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          selectionColor={colors.primary}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Text style={styles.clearBtn}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        <Chip
          label="All"
          active={activeCategory === 'all'}
          onPress={() => setActiveCategory('all')}
        />
        {ALL_CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            label={CATEGORY_LABEL[cat]}
            active={activeCategory === cat}
            onPress={() => setActiveCategory(cat)}
            accent={CATEGORY_COLOR[cat]}
          />
        ))}
      </ScrollView>

      {/* Results count */}
      <Text style={styles.countLine}>
        {totalShown === 0
          ? 'No entries match your search.'
          : `${totalShown} ${totalShown === 1 ? 'entry' : 'entries'}`}
      </Text>

      {/* Grouped sections */}
      {grouped.map((group) => (
        <View key={group.category} style={styles.groupBlock}>
          <View style={styles.groupHeader}>
            <View
              style={[
                styles.groupDot,
                { backgroundColor: CATEGORY_COLOR[group.category] },
              ]}
            />
            <Text style={styles.groupTitle}>
              {CATEGORY_LABEL[group.category]}
            </Text>
            <Text style={styles.groupCount}>{group.entries.length}</Text>
          </View>
          <View style={styles.entryList}>
            {group.entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                expanded={expandedId === entry.id}
                onToggle={() => toggle(entry.id)}
              />
            ))}
          </View>
        </View>
      ))}

      {grouped.length === 0 ? (
        <Card>
          <Text style={styles.emptyHint}>
            Try a different search term or clear filters.
          </Text>
        </Card>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.huge + spacing.xxl,
    gap: spacing.md,
  },

  header: {
    gap: spacing.xs,
  },
  title: {
    fontFamily: fonts.mono,
    fontSize: 28,
    lineHeight: 32,
    color: colors.navy,
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textDim,
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgPanel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
    ...elevation.sm,
  },
  searchIcon: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.textMuted,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: sizes.bodyLg,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  clearBtn: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.body,
    color: colors.textDim,
    paddingHorizontal: spacing.xs,
  },

  // Chip row
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgPanelAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  chipPressed: {
    opacity: 0.75,
  },
  chipLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyXs,
    letterSpacing: 0.4,
  },

  countLine: {
    fontFamily: fonts.body,
    fontSize: sizes.bodyXs,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },

  // Group section
  groupBlock: {
    gap: spacing.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  groupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  groupTitle: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: sizes.title,
    color: colors.text,
  },
  groupCount: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.textMuted,
  },

  entryList: {
    gap: spacing.sm,
  },
  entryCard: {
    marginVertical: 0,
  },
  entryCardExpanded: {
    borderColor: colors.borderStrong,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: radius.pill,
  },
  entryHeaderText: {
    flex: 1,
    gap: spacing.xs,
  },
  term: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyLg,
    color: colors.text,
    lineHeight: sizes.bodyLg + 4,
  },
  shortDef: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textDim,
    lineHeight: sizes.body + 6,
  },
  chevron: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.textMuted,
    paddingTop: 2,
  },
  expandedBody: {
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  detailBlock: {
    gap: spacing.xs,
  },
  detailBody: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.text,
    lineHeight: sizes.body + 7,
  },

  emptyHint: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
})
