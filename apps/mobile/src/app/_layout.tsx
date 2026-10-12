import { AdegaProvider } from '@adegas/core';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ARQUIVOS_FONTE, CORES, FONTE } from '../tema';

SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const [fontesProntas, erroFontes] = useFonts(ARQUIVOS_FONTE);

  useEffect(() => {
    if (fontesProntas || erroFontes) SplashScreen.hideAsync();
  }, [fontesProntas, erroFontes]);

  if (!fontesProntas && !erroFontes) return null;

  return (
    <AdegaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: CORES.fundo },
          headerShadowVisible: false,
          headerTintColor: CORES.texto,
          headerTitleStyle: { fontFamily: FONTE.titulo, fontSize: 20 },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: CORES.fundo },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, title: 'Início' }} />
        <Stack.Screen name="venda" options={{ title: 'Nova venda' }} />
        <Stack.Screen name="pagamento" options={{ title: 'Pagamento' }} />
        <Stack.Screen name="entrada" options={{ title: 'Entrada de produto' }} />
      </Stack>
    </AdegaProvider>
  );
}
