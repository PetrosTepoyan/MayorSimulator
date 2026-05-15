import React, { useCallback, useState } from 'react'
import {
  SafeAreaView,
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native'
import { useGameStore, useStats, useTurn } from '../../store/gameStore'
import { getCountry } from '../../game/countries'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { HUD } from '../ui/HUD'
import { TabBar, TabDef } from '../ui/TabBar'
import { STAT_INFO } from '../../game/explanations'
import { colors, spacing, radius, fonts, sizes, elevation } from '../../theme'
import OverviewTab from './OverviewTab'
import DistrictsTab from './DistrictsTab'
import CouncilTab from './CouncilTab'
import PolicyTab from './PolicyTab'
import BuildTab from './BuildTab'
import NewsTab from './NewsTab'

// ----------------------------------------------------------------------------
// Tab definition
// ----------------------------------------------------------------------------

type TabKey = 'overview' | 'districts' | 'council' | 'policy' | 'build' | 'news'

const TABS: ReadonlyArray<TabDef<TabKey>> = [
  { key: 'overview', label: 'Home', icon: '🏛️' },
  { key: 'districts', label: 'Districts', icon: '🗺️' },
  { key: 'council', label: 'Council', icon: '⚖️' },
  { key: 'policy', label: 'Policy', icon: '📜' },
  { key: 'build', label: 'Build', icon: '🏗️' },
  { key: 'news', label: 'News', icon: '📰' },
]

const TAB_BAR_HEIGHT = 64
const FAB_BOTTOM_OFFSET = TAB_BAR_HEIGHT + spacing.lg

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function safeGetCountry(id: string): ReturnType<typeof getCountry> | null {
  try {
    return getCountry(id)
  } catch {
    return null
  }
}

function renderTab(tab: TabKey): React.JSX.Element {
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

// ----------------------------------------------------------------------------
// DashboardScreen
// ----------------------------------------------------------------------------

export default function DashboardScreen(): React.JSX.Element {
  const [tab, setTab] = useState<TabKey>('overview')
  const [menuOpen, setMenuOpen] = useState<boolean>(false)

  const stats = useStats()
  const turn = useTurn()
  const cityName = useGameStore((s) => s.cityName)
  const mayorName = useGameStore((s) => s.mayorName)
  const countryId = useGameStore((s) => s.countryId)
  const termLengthYears = useGameStore((s) => s.termLengthYears)
  const termsServed = useGameStore((s) => s.termsServed)
  const endTurn = useGameStore((s) => s.endTurn)
  const setPhase = useGameStore((s) => s.setPhase)
  const saveCurrentGame = useGameStore((s) => s.saveCurrentGame)

  const country = countryId ? safeGetCountry(countryId) : null
  const flag = country?.flag ?? '🏛️'
  const termLen = country?.termLengthYears ?? termLengthYears ?? 4

  const handleEndTurn = useCallback((): void => {
    endTurn()
    void saveCurrentGame()
  }, [endTurn, saveCurrentGame])

  const handleSave = useCallback((): void => {
    setMenuOpen(false)
    void saveCurrentGame()
  }, [saveCurrentGame])

  const handleQuit = useCallback((): void => {
    setMenuOpen(false)
    setPhase('start')
  }, [setPhase])

  const handleTreasuryPress = useCallback((): void => {
    const info = STAT_INFO.treasury
    Alert.alert(`${info.label} (${info.unit})`, info.long)
  }, [])

  const handleApprovalPress = useCallback((): void => {
    const info = STAT_INFO.approval
    Alert.alert(`${info.label} (${info.unit})`, info.long)
  }, [])

  return (
    <SafeAreaView style={styles.root}>
      {/* Sticky HUD with optional menu button on the side */}
      <View style={styles.hudWrap}>
        <HUD
          cityName={cityName || 'New City'}
          mayorName={mayorName || 'Mayor'}
          flag={flag}
          turn={turn}
          termLengthYears={termLen}
          termsServed={termsServed}
          treasury={stats.treasury}
          approval={stats.approval}
          population={stats.population}
          inflation={stats.inflation}
          onTreasuryPress={handleTreasuryPress}
          onApprovalPress={handleApprovalPress}
        />
        <Pressable
          onPress={() => setMenuOpen(true)}
          style={({ pressed }) => [
            styles.menuButton,
            pressed && styles.menuButtonPressed,
          ]}
          hitSlop={8}
          accessibilityLabel="Menu"
        >
          <Text style={styles.menuIcon}>≡</Text>
        </Pressable>
      </View>

      {/* Body — active tab */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {renderTab(tab)}
      </ScrollView>

      {/* Floating END TURN button */}
      <View style={styles.fab} pointerEvents="box-none">
        <Button
          label="END TURN ▶"
          variant="gold"
          onPress={handleEndTurn}
          style={styles.fabButton}
        />
      </View>

      {/* Bottom tab bar */}
      <View style={styles.tabBarWrap}>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
      </View>

      {/* Overflow menu modal */}
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
              <Card title="Menu" subtitle="Pause the city for a moment.">
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
              </Card>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // HUD wrap — overlay the menu button at top-right corner
  hudWrap: {
    position: 'relative',
  },
  menuButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.sm,
  },
  menuButtonPressed: {
    opacity: 0.6,
  },
  menuIcon: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    color: colors.text,
    lineHeight: 22,
  },

  // Body
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: TAB_BAR_HEIGHT + spacing.huge + spacing.lg,
  },

  // FAB (END TURN)
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: FAB_BOTTOM_OFFSET,
  },
  fabButton: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    ...elevation.lg,
  },

  // Tab bar wrap
  tabBarWrap: {
    // Allow shadow to lift the bar slightly above the body
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28,43,62,0.55)',
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

// Silence unused imports that get tree-shaken in production but help editors.
void sizes
