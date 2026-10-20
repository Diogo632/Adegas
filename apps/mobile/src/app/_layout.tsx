import { AdegaProvider, useAdega } from '@adegas/core';
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
      <StatusBar style="light" />
      <Navegacao />
    </AdegaProvider>
  );
}

/** Cada tela só existe para quem pode usá-la; sem ninguém logado, só a tela de entrada. */
function Navegacao() {
  const { usuario, pode } = useAdega();
  const logado = usuario !== null;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: CORES.fundo },
        headerShadowVisible: false,
        headerTintColor: CORES.texto,
        headerTitleStyle: { fontFamily: FONTE.titulo, fontSize: 18 },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: CORES.fundo },
        // Troca de tela deslizando (no celular); o conteúdo também entra em cascata.
        animation: 'slide_from_right',
      }}
    >
      <Stack.Protected guard={!logado}>
        <Stack.Screen name="entrar" options={{ headerShown: false, animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={logado}>
        <Stack.Screen name="(abas)" options={{ headerShown: false, title: 'Início', animation: 'fade' }} />
        <Stack.Screen name="conta" options={{ title: 'Minha conta' }} />
        <Stack.Protected guard={pode('vender')}>
          <Stack.Screen name="venda" options={{ title: 'Nova venda' }} />
          <Stack.Screen name="pagamento" options={{ title: 'Pagamento' }} />
        </Stack.Protected>
        <Stack.Protected guard={pode('entrada')}>
          <Stack.Screen name="entrada" options={{ title: 'Entrada de produto' }} />
          <Stack.Screen name="nota" options={{ title: 'Entrada pela nota' }} />
        </Stack.Protected>
        <Stack.Protected guard={pode('estoque')}>
          <Stack.Screen name="produto/[id]" options={{ title: 'Produto' }} />
        </Stack.Protected>
        <Stack.Protected guard={pode('financeiro')}>
          <Stack.Screen name="lancamento" options={{ title: 'Nova movimentação' }} />
        </Stack.Protected>
        <Stack.Protected guard={pode('mesas')}>
          <Stack.Screen name="mesas" options={{ title: 'Mesas' }} />
          <Stack.Screen name="mesa/[id]/index" options={{ title: 'Conta da mesa' }} />
          <Stack.Screen name="mesa/[id]/adicionar" options={{ title: 'Pedido' }} />
          <Stack.Screen name="mesa/[id]/fechar" options={{ title: 'Fechar conta' }} />
        </Stack.Protected>
        <Stack.Protected guard={pode('usuarios')}>
          <Stack.Screen name="usuarios/index" options={{ title: 'Usuários e acessos' }} />
          <Stack.Screen name="usuarios/[id]" options={{ title: 'Usuário' }} />
        </Stack.Protected>
      </Stack.Protected>
    </Stack>
  );
}
