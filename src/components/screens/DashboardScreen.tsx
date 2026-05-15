import React, { useState, useCallback } from 'react'
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
} from 'react-native'
import { useGameStore, useStats, useTurn } from '../../store/gameStore'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { PixelText } from '../ui/PixelText'
import { formatMoney, formatPct, quarterToDate } from '../../game/util'
import { getCountry } from '../../game/countries'
import { colors, fonts, sizes, spacing, radius } from '../../theme'
import OverviewTab from './OverviewTab'
import DistrictsTab from './DistrictsTab'
import CouncilTab from './CouncilTab'
import PolicyTab from './PolicyTab'
import BuildTab from './BuildTab'
import NewsTab from './NewsTab'

// ============================================================================
// Tabs
// ============================================================================

type TabKey = 'overview' | 'districts' | 'council' | 'policy' | 'build' | 'news'

interface TabSpec {
  key: TabKey
  label: string
  icon: string
}

const TABS: TabSpec[] = [
  { key: 'overview', label: 'Overview', icon: 'III' },
  { key: 'districts', label: 'Districts', icon: 'D' },
  { key: 'council', label: 'Council', icon: 'C' },
  { key: 'policy', label: 'Policy', icon: 'P' },
  { key: 'build', label: 'Build', icon: 'B' },
  { key: 'news', label: 'News', icon: 'N' },
]

// ============================================================================
// Component
// ============================================================================

export default function DashboardScreen(): JSX.Element {
  const [tab, setTab] = useState<TabKey>('overview')
  const [menuOpen, setMenuOpen] = useState<boolean>(false)

  const stats = useStats()
  const turn = useTurn()
  const cityName = useGameStore((s) => s.cityName)
  const mayorName = useGameStore((s) => s.mayorName)
  const countryId = useGameStore((s) => s.countryId)
  const termLengthYears = useGameStore((s) => s.termLengthYears)
  const endTurn = useGameStore((s) => s.endTurn)
  const setPhase = useGameStore((s) => s.setPhase)
  const saveCurrentGame = useGameStore((s) => s.saveCurrentGame)

  const country = countryId ? safeGetCountry(countryId) : null
  const termLen = (country?.termLengthYears ?? termLengthYears ?? 4)
  const termNumber = Math.floor(turn / (termLen * 4)) + 1

  const handleEndTurn = useCallback(() => {
    endTurn()
    // Fire-and-forget save
    void saveCurrentGame()
  }, [endTurn, saveCurrentGame])

  const handleSave = useCallback(() => {
    setMenuOpen(false)
    void saveCurrentGame()
  }, [saveCurrentGame])

  const handleQuit = useCallback(() => {
    setMenuOpen(false)
    setPhase('start')
  }, [setPhase])

  // Treasury chip color
  const treasuryTone =
    stats.treasury < 0
      ? colors.bad
      : stats.treasury > 100
      ? colors.good
      : colors.govGold

  // Approval chip color
  const approvalTone =
    stats.approval >= 55
      ? colors.good
      : stats.approval < 35
      ? colors.bad
      : colors.govGold

  return (
    <SafeAreaView style={styles.root}>
      {/* ============================================================== */}
      {/* HEADER (sticky)                                                */}
      {/* ============================================================== */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeft}>
            <View style={styles.cityRow}>
              <PixelText size="sm" color={colors.text}>
                {cityName || 'New City'}
              </PixelText>
              {country?.flag ? (
                <Text style={styles.flag}>{country.flag}</Text>
              ) : null}
            </View>
            <Text style={styles.subline} numberOfLines={1}>
              {(mayorName || 'Mayor') + ' • ' + quarterToDate(turn) + ' • Term ' + termNumber}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.chips}>
              <View
                style={[styles.chip, { borderColor: treasuryTone }]}
              >
                <Text style={styles.chipLabel}>TREASURY</Text>
                <Text style={[styles.chipValue, { color: treasuryTone }]}>
                  {formatMoney(stats.treasury)}
                </Text>
              </View>
              <View
                style={[styles.chip, { borderColor: approvalTone }]}
              >
                <Text style={styles.chipLabel}>APPROVAL</Text>
                <Text style={[styles.chipValue, { color: approvalTone }]}>
                  {formatPct(stats.approval, 0)}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => setMenuOpen(true)}
              style={({ pressed }) => [
                styles.menuButton,
                pressed && { opacity: 0.6 },
              ]}
              hitSlop={8}
              accessibilityLabel="Menu"
            >
              <Text style={styles.menuIcon}>{'≡'}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ============================================================== */}
      {/* BODY                                                           */}
      {/* ============================================================== */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {renderTab(tab)}
      </ScrollView>

      {/* ============================================================== */}
      {/* FLOATING END-TURN BUTTON                                       */}
      {/* ============================================================== */}
      <View style={styles.fab} pointerEvents="box-none">
        <Button
          label="END TURN ▶"
          variant="primary"
          onPress={handleEndTurn}
        />
      </View>

      {/* ============================================================== */}
      {/* TAB BAR                                                        */}
      {/* ============================================================== */}
      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const active = t.key === tab
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={({ pressed }) => [
                styles.tab,
                active && styles.tabActive,
                pressed && !active && styles.tabPressed,
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  active && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                {t.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* ============================================================== */}
      {/* MENU MODAL                                                     */}
      {/* ============================================================== */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setMenuOpen(false)}
        >
          <View style={styles.modalSheet}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <Panel title="Menu">
                <View style={styles.menuList}>
                  <Button
                    label="Save Game"
                    variant="secondary"
                    full
                    onPress={handleSave}
                  />
                  <Button
                    label="Quit to Title"
                    variant="danger"
                    full
                    onPress={handleQuit}
                  />
                  <Button
                    label="Close"
                    variant="ghost"
                    full
                    onPress={() => setMenuOpen(false)}
                  />
                </View>
              </Panel>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function safeGetCountry(id: string): ReturnType<typeof getCountry> | null {
  try {
    return getCountry(id)
  } catch {
    return null
  }
}

function renderTab(tab: TabKey): JSX.Element {
  switch (tab) {
    case 'overview':
      return <OverviewTab />
    case 'districts':
      return <DistrictsTab />
    case 'council':
      return <CouncilTab />
    case 'policy':
      return <PolicyTab />
    case 'build':
      return <BuildTab />
    case 'news':
      return <NewsTab />
    default:
      return <OverviewTab />
  }
}

interface ComingSoonProps {
  title: string
  hint: string
}

const ComingSoon = ({ title, hint }: ComingSoonProps): JSX.Element => (
  <View style={styles.placeholderWrap}>
    <Panel title={title}>
      <View style={styles.placeholderInner}>
        <PixelText size="md" color={colors.govGold}>
          Coming Soon
        </PixelText>
        <Text style={styles.placeholderHint}>{hint}</Text>
      </View>
    </Panel>
  </View>
)

// ============================================================================
// Styles
// ============================================================================

const TAB_BAR_HEIGHT = 56
const FAB_BOTTOM_OFFSET = TAB_BAR_HEIGHT + spacing.md

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Header
  header: {
    backgroundColor: colors.bgElev,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flag: {
    fontSize: 18,
  },
  subline: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.textDim,
    marginTop: 2,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.bgPanel,
    alignItems: 'flex-end',
    minWidth: 64,
  },
  chipLabel: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelXs,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  chipValue: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.text,
    marginTop: 1,
  },
  menuButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.bgPanel,
    borderColor: colors.border,
    borderWidth: 1,
  },
  menuIcon: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoLg,
    color: colors.text,
    lineHeight: sizes.monoLg,
  },

  // Body
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: TAB_BAR_HEIGHT + spacing.xxl,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: FAB_BOTTOM_OFFSET,
  },

  // Tab bar
  tabBar: {
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    backgroundColor: colors.bgElev,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: colors.govBlue,
  },
  tabPressed: {
    backgroundColor: colors.bgPanel,
  },
  tabLabel: {
    fontFamily: fonts.pixel,
    fontSize: sizes.pixelXs,
    color: colors.textDim,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  tabLabelActive: {
    color: colors.paper,
  },

  // Placeholder
  placeholderWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  placeholderInner: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  placeholderHint: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textDim,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 360,
  },
  menuList: {
    gap: spacing.sm,
  },
})
