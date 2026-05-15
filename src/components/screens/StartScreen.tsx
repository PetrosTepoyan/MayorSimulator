import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Modal,
  Pressable,
} from 'react-native'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { PixelText } from '../ui/PixelText'
import { useGameStore } from '../../store/gameStore'
import { colors, fonts, sizes, spacing, radius } from '../../theme'
import { hasSave } from '../../game/saveLoad'

// ============================================================================
// StartScreen — title / boot screen.
// A clean, GameDev-Tycoon-flavored landing: warm paper background, a big mono
// game title, three small feature chips, and a stack of chunky buttons.
// ============================================================================

const FEATURE_BULLETS: ReadonlyArray<{ icon: string; text: string }> = [
  { icon: '📊', text: 'Manage taxes, budget, and 60+ events' },
  { icon: '🏗️', text: 'Build, hire, and grow your influence' },
  { icon: '📰', text: 'Every decision changes the city\'s story' },
]

const ABOUT_TEXT =
  'MayorSim is a turn-based political simulator. You inherit a city — its books, factions, neighborhoods, and grievances — and govern through budgets, taxes, policies, and the events history throws at you. Every lever pulls another. Every choice cascades.'

const CREDITS_LINE = 'Design & code: a single mayor, several sleepless nights.'

export default function StartScreen(): React.JSX.Element {
  const setPhase = useGameStore((s) => s.setPhase)
  const loadSavedGame = useGameStore((s) => s.loadSavedGame)

  const [saveExists, setSaveExists] = useState<boolean>(false)
  const [aboutVisible, setAboutVisible] = useState<boolean>(false)
  const [loadingContinue, setLoadingContinue] = useState<boolean>(false)

  useEffect(() => {
    let mounted = true
    void (async () => {
      const exists = await hasSave()
      if (mounted) setSaveExists(exists)
    })()
    return () => {
      mounted = false
    }
  }, [])

  const handleNewGame = (): void => {
    setPhase('select')
  }

  const handleContinue = async (): Promise<void> => {
    if (loadingContinue) return
    setLoadingContinue(true)
    try {
      const ok = await loadSavedGame()
      if (ok) setPhase('plan')
    } finally {
      setLoadingContinue(false)
    }
  }

  const handleAboutOpen = (): void => setAboutVisible(true)
  const handleAboutClose = (): void => setAboutVisible(false)

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero block */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🏛️</Text>
          <View style={styles.titleWrap}>
            <PixelText size="md" color={colors.textDim} style={styles.eyebrow}>
              GOVERN A CITY
            </PixelText>
            <Text style={styles.titleBig}>MAYORSIM</Text>
            <View style={styles.titleUnderline} />
          </View>
          <Text style={styles.tagline}>
            Govern the city. Shape the country.
          </Text>
        </View>

        {/* Feature chips */}
        <View style={styles.featureStack}>
          {FEATURE_BULLETS.map((b) => (
            <Card key={b.text} tint="soft" flat style={styles.featureCard}>
              <View style={styles.featureRow}>
                <Text style={styles.featureIcon}>{b.icon}</Text>
                <Text style={styles.featureText}>{b.text}</Text>
              </View>
            </Card>
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonStack}>
          <Button
            label="NEW GAME"
            variant="primary"
            full
            onPress={handleNewGame}
          />
          {saveExists ? (
            <Button
              label={loadingContinue ? 'LOADING…' : 'CONTINUE'}
              variant="gold"
              full
              disabled={loadingContinue}
              onPress={() => {
                void handleContinue()
              }}
            />
          ) : null}
          <Button
            label="ABOUT"
            variant="ghost"
            full
            onPress={handleAboutOpen}
          />
        </View>

        <View style={styles.footer}>
          <PixelText size="xs" color={colors.textMuted}>
            v0.2 · prototype
          </PixelText>
        </View>
      </ScrollView>

      <Modal
        visible={aboutVisible}
        transparent
        animationType="fade"
        onRequestClose={handleAboutClose}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleAboutClose}>
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <Card title="About MayorSim">
              <Text style={styles.aboutBody}>{ABOUT_TEXT}</Text>
              <View style={styles.aboutDivider} />
              <PixelText size="xs" color={colors.textMuted}>
                {CREDITS_LINE}
              </PixelText>
              <View style={styles.modalActions}>
                <Button
                  label="CLOSE"
                  variant="secondary"
                  small
                  onPress={handleAboutClose}
                />
              </View>
            </Card>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.huge,
    paddingBottom: spacing.xl,
  },
  heroIcon: {
    fontSize: 72,
    lineHeight: 80,
    marginBottom: spacing.md,
  },
  titleWrap: {
    alignItems: 'center',
  },
  eyebrow: {
    marginBottom: spacing.sm,
    letterSpacing: 3,
  },
  titleBig: {
    fontFamily: fonts.mono,
    fontSize: 52,
    lineHeight: 56,
    color: colors.navy,
    letterSpacing: 2,
  },
  titleUnderline: {
    marginTop: spacing.sm,
    height: 3,
    width: 80,
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
  },
  tagline: {
    marginTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: sizes.bodyLg,
    color: colors.textDim,
    textAlign: 'center',
  },

  featureStack: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  featureCard: {
    marginVertical: 0,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIcon: {
    fontSize: 22,
  },
  featureText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.text,
    lineHeight: sizes.body + 6,
  },

  buttonStack: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  footer: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28,43,62,0.45)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: '100%',
  },
  aboutBody: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.text,
    lineHeight: sizes.body + 8,
  },
  aboutDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
  },
})
