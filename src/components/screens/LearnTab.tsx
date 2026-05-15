import React, { useMemo, useState } from 'react'
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native'
import { Panel } from '../ui/Panel'
import { PixelText } from '../ui/PixelText'
import { colors, fonts, sizes, spacing, radius } from '../../theme'
import type { GlossaryEntry } from '../../game/glossary'

// ============================================================================
// Defensive glossary import — module may not exist or may be empty.
// ============================================================================

let GLOSSARY: GlossaryEntry[] = []
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('../../game/glossary') as { GLOSSARY?: GlossaryEntry[] }
  GLOSSARY = (mod.GLOSSARY ?? []) as GlossaryEntry[]
} catch {
  GLOSSARY = [
    {
      id: 'placeholder',
      term: 'Coming soon',
      category: 'economics',
      shortDef: 'Glossary loading…',
      longDef: '',
      realWorldExample: '',
      inGameRelevance: '',
    },
  ]
}

// ============================================================================
// Types + constants
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
  economics: colors.govGold,
  politics: colors.govBlue,
  civics: colors.govGreen,
  governance: colors.text,
  environment: colors.good,
  social: colors.govRed,
}

// ============================================================================
// Filter chip
// ============================================================================

interface ChipProps {
  label: string
  active: boolean
  onPress: () => void
  accent?: string
}

function Chip({ label, active, onPress, accent }: ChipProps): JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        active && accent ? { borderColor: accent } : null,
        pressed && styles.chipPressed,
      ]}
    >
      <PixelText
        size="xs"
        color={active ? (accent ?? colors.text) : colors.textDim}
      >
        {label}
      </PixelText>
    </Pressable>
  )
}

// ============================================================================
// Entry card — collapsed (term + shortDef) or expanded (full detail)
// ============================================================================

interface EntryCardProps {
  entry: GlossaryEntry
  expanded: boolean
  onToggle: () => void
}

function EntryCard({ entry, expanded, onToggle }: EntryCardProps): JSX.Element {
  const accent = CATEGORY_COLOR[entry.category] ?? colors.text
  return (
    <Pressable onPress={onToggle} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
      <View style={[styles.entry, expanded && styles.entryExpanded]}>
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
                <PixelText size="xs" color={colors.textDim} style={styles.detailLabel}>
                  In Depth
                </PixelText>
                <Text style={styles.detailBody}>{entry.longDef}</Text>
              </View>
            ) : null}

            {entry.realWorldExample ? (
              <View style={styles.detailBlock}>
                <PixelText size="xs" color={colors.textDim} style={styles.detailLabel}>
                  Real World
                </PixelText>
                <Text style={styles.detailBody}>{entry.realWorldExample}</Text>
              </View>
            ) : null}

            {entry.inGameRelevance ? (
              <View style={styles.detailBlock}>
                <PixelText size="xs" color={accent} style={styles.detailLabel}>
                  In MayorSim
                </PixelText>
                <Text style={styles.detailBody}>{entry.inGameRelevance}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}

// ============================================================================
// Screen
// ============================================================================

export default function LearnTab(): JSX.Element {
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
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <PixelText size="lg" color={colors.text} style={styles.title}>
            Learn
          </PixelText>
          <Text style={styles.subtitle}>Civics and economics, briefly.</Text>
        </View>

        {/* Search input */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>{'⌕'}</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search terms…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Text style={styles.clearBtn}>{'✕'}</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
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
          <Panel
            key={group.category}
            title={CATEGORY_LABEL[group.category]}
          >
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
          </Panel>
        ))}

        {grouped.length === 0 ? (
          <Panel>
            <Text style={styles.emptyHint}>
              Try a different search term or clear filters.
            </Text>
          </Panel>
        ) : null}
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl + spacing.xxl,
    gap: spacing.sm,
  },
  header: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  title: {
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textDim,
  },
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
  },
  searchIcon: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    color: colors.textMuted,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  clearBtn: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.textDim,
    paddingHorizontal: spacing.xs,
  },
  chipsRow: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.bgPanel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  chipActive: {
    backgroundColor: colors.bgPanelAlt,
    borderColor: colors.borderStrong,
  },
  chipPressed: {
    opacity: 0.7,
  },
  countLine: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm - 2,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xs,
  },
  entryList: {
    gap: spacing.sm,
  },
  entry: {
    backgroundColor: colors.bgPanelAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  entryExpanded: {
    borderColor: colors.borderStrong,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    gap: spacing.sm,
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    marginRight: spacing.xs,
  },
  entryHeaderText: {
    flex: 1,
    gap: spacing.xs,
  },
  term: {
    fontFamily: fonts.bodyBold,
    fontSize: sizes.bodyLg,
    color: colors.text,
    lineHeight: 20,
  },
  shortDef: {
    fontFamily: fonts.body,
    fontSize: sizes.body - 1,
    color: colors.textDim,
    lineHeight: 18,
  },
  chevron: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    color: colors.textMuted,
    paddingTop: 2,
  },
  expandedBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    gap: spacing.md,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.xs,
  },
  detailBlock: {
    gap: spacing.xs,
  },
  detailLabel: {
    letterSpacing: 1,
  },
  detailBody: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.text,
    lineHeight: 19,
  },
  emptyHint: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
})
