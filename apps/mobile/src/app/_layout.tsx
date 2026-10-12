import { AdegaProvider, CORES } from '@adegas/core';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function Layout() {
  return (
    <AdegaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: CORES.primaria },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: CORES.fundo },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Minha Adega' }} />
        <Stack.Screen name="venda" options={{ title: 'Nova venda' }} />
        <Stack.Screen name="pagamento" options={{ title: 'Pagamento' }} />
        <Stack.Screen name="entrada" options={{ title: 'Entrada de produto' }} />
      </Stack>
    </AdegaProvider>
  );
}
