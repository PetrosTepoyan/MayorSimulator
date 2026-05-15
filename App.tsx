import React from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p'
import { VT323_400Regular } from '@expo-google-fonts/vt323'
import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter'

import { usePhase, useGameOver } from './src/store/gameStore'
import { colors, fonts } from './src/theme'

import StartScreen from './src/components/screens/StartScreen'
import CountrySelectScreen from './src/components/screens/CountrySelectScreen'
import DashboardScreen from './src/components/screens/DashboardScreen'
import EventCardScreen from './src/components/screens/EventCardScreen'
import TurnSummaryScreen from './src/components/screens/TurnSummaryScreen'
import GameOverScreen from './src/components/screens/GameOverScreen'

export default function App() {
  const [loaded] = useFonts({
    PressStart2P_400Regular,
    VT323_400Regular,
    Inter_400Regular,
    Inter_700Bold,
  })

  const phase = usePhase()
  const gameOver = useGameOver()

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Booting MayorSim…</Text>
      </View>
    )
  }

  let body: React.ReactNode
  if (gameOver) {
    body = <GameOverScreen />
  } else {
    switch (phase) {
      case 'start':
        body = <StartScreen />
        break
      case 'select':
        body = <CountrySelectScreen />
        break
      case 'plan':
        body = <DashboardScreen />
        break
      case 'event':
        body = <EventCardScreen />
        break
      case 'turnSummary':
        body = <TurnSummaryScreen />
        break
      case 'gameOver':
        body = <GameOverScreen />
        break
      default:
        body = <StartScreen />
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {body}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    gap: 16,
  },
  loadingText: {
    color: colors.textDim,
    fontSize: 14,
  },
})
