import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Animated,
  Easing,
  Modal,
  Pressable,
} from 'react-native'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { PixelText } from '../ui/PixelText'
import { useGameStore } from '../../store/gameStore'
import { colors, fonts, sizes, spacing, radius } from '../../theme'
import { hasSave } from '../../game/saveLoad'

const TAGLINES: ReadonlyArray<string> = [
  '▸ Every decision cascades through systems.',
  '▸ Build coalitions or burn them down.',
  '▸ Survive elections, crises, and history.',
]

const ABOUT_PARAGRAPH =
  'MayorSim is a turn-based political simulator. You inherit a city — its books, factions, neighborhoods, and grievances — and govern through budgets, taxes, policies, and the events history throws at you. Every lever pulls another. Every choice cascades.'

const CREDITS_LINE = 'Design & code: a single mayor, several sleepless nights.'

export default function StartScreen(): JSX.Element {
  const setPhase = useGameStore((s) => s.setPhase)
  const loadSavedGame = useGameStore((s) => s.loadSavedGame)

  const [saveExists, setSaveExists] = useState<boolean>(false)
  const [aboutVisible, setAboutVisible] = useState<boolean>(false)
  const [loadingContinue, setLoadingContinue] = useState<boolean>(false)

  const glow = useRef(new Animated.Value(0)).current

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

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    )
    loop.start()
    return () => {
      loop.stop()
    }
  }, [glow])

  const titleOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  })
  const titleScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.015],
  })

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
        <View style={styles.heroSpacer} />

        <View style={styles.titleWrap}>
          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ scale: titleScale }],
            }}
          >
            <PixelText size="lg" style={styles.title}>
              MAYORSIM
            </PixelText>
          </Animated.View>
          <View style={styles.titleUnderline} />
          <Text style={styles.tagline}>Govern. Decide. Cascade.</Text>
        </View>

        <View style={styles.crtBlock}>
          {TAGLINES.map((line) => (
            <Text key={line} style={styles.crtLine}>
              {line}
            </Text>
          ))}
          <View style={styles.cursorRow}>
            <Text style={styles.crtLine}>{'▸ '}</Text>
            <Animated.View
              style={[
                styles.cursor,
                { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
              ]}
            />
          </View>
        </View>

        <View style={styles.buttonStack}>
          <Button
            label="NEW GAME"
            variant="primary"
            full
            onPress={handleNewGame}
          />
          {saveExists ? (
            <Button
              label={loadingContinue ? 'LOADING...' : 'CONTINUE'}
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
          <PixelText size="xs" color={colors.textMuted} style={styles.footerText}>
            v0.1 prototype
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
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Panel title="About MayorSim">
              <Text style={styles.aboutBody}>{ABOUT_PARAGRAPH}</Text>
              <View style={styles.aboutDivider} />
              <PixelText size="xs" color={colors.textMuted} style={styles.aboutCredits}>
                {CREDITS_LINE}
              </PixelText>
              <View style={styles.modalActions}>
                <Button label="CLOSE" variant="secondary" small onPress={handleAboutClose} />
              </View>
            </Panel>
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
    alignItems: 'center',
  },
  heroSpacer: {
    height: spacing.xxl,
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: sizes.pixelLg + 6,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 3,
    textShadowColor: colors.govGold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  titleUnderline: {
    marginTop: spacing.md,
    height: 2,
    width: 96,
    backgroundColor: colors.govGold,
    opacity: 0.7,
  },
  tagline: {
    marginTop: spacing.md,
    fontFamily: fonts.mono,
    fontSize: sizes.monoMd,
    color: colors.textDim,
    letterSpacing: 2,
    textAlign: 'center',
  },
  crtBlock: {
    alignSelf: 'stretch',
    backgroundColor: colors.bgElev,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  crtLine: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.good,
    lineHeight: sizes.monoSm + 8,
    letterSpacing: 1,
  },
  cursorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cursor: {
    width: 8,
    height: sizes.monoSm,
    backgroundColor: colors.good,
  },
  buttonStack: {
    alignSelf: 'stretch',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    letterSpacing: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: '100%',
  },
  aboutBody: {
    fontFamily: fonts.mono,
    fontSize: sizes.monoSm,
    color: colors.text,
    lineHeight: sizes.monoSm + 8,
  },
  aboutDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  aboutCredits: {
    textAlign: 'left',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
  },
})
