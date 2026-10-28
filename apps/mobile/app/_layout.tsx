import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SessionGate } from '../src/features/auth/SessionGate';
import { restoreSession, startSessionSync } from '../src/features/auth/sessionManager';

//Keep the native splash screen up until the Inter fonts are ready.
void SplashScreen.preventAutoHideAsync();

//Root layout: loads fonts, restores the saved session once, then hands navigation to the gate
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold });

  useEffect(() => {
    const stopSync = startSessionSync();
    void restoreSession();
    return stopSync;
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <SessionGate />
    </>
  );
}
