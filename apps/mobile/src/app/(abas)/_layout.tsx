import { Tabs } from 'expo-router/tabs';
import { Boxes, ChartColumn, House, Sparkles, Wallet } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CORES, FONTE } from '../../tema';

export default function Abas() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: CORES.primariaClara,
        tabBarInactiveTintColor: CORES.textoFraco,
        tabBarStyle: {
          backgroundColor: CORES.lateral,
          borderTopColor: CORES.borda,
          height: 70 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
        },
        tabBarLabelStyle: { fontFamily: FONTE.media, fontSize: 11, lineHeight: 14 },
        sceneStyle: { backgroundColor: CORES.fundo },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Início', tabBarIcon: ({ color, size }) => <House color={color} size={size} strokeWidth={1.75} /> }}
      />
      <Tabs.Screen
        name="estoque"
        options={{ title: 'Estoque', tabBarIcon: ({ color, size }) => <Boxes color={color} size={size} strokeWidth={1.75} /> }}
      />
      <Tabs.Screen
        name="financeiro"
        options={{ title: 'Financeiro', tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} strokeWidth={1.75} /> }}
      />
      <Tabs.Screen
        name="relatorios"
        options={{
          title: 'Relatórios',
          tabBarIcon: ({ color, size }) => <ChartColumn color={color} size={size} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="assistente"
        options={{
          title: 'Assistente',
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} strokeWidth={1.75} />,
        }}
      />
    </Tabs>
  );
}
