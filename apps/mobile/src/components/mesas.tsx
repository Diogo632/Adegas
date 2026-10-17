import type { Comanda } from '@adegas/core';
import { formatarDinheiro, nomeDaMesa, quantidadeNaComanda, tempoAberta, totalComanda } from '@adegas/core';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { CORES, FONTE, TEXTO } from '../tema';
import { Tocavel } from './animacoes';

/** Linha de uma conta aberta: mesa, itens, tempo e total. Usada aqui e no Início. */
export function LinhaMesa({ comanda, agora }: { comanda: Comanda; agora: Date }) {
  const itens = quantidadeNaComanda(comanda);
  return (
    <Tocavel accessibilityRole="button" escala={0.98} onPress={() => router.push(`/mesa/${comanda.id}`)} style={estilos.linha}>
      <SeloMesa mesa={comanda.mesa} />
      <View style={{ flex: 1 }}>
        <Text style={TEXTO.corpoForte} numberOfLines={1}>
          {nomeDaMesa(comanda.mesa)}
        </Text>
        <Text style={TEXTO.legenda} numberOfLines={1}>
          {itens} {itens === 1 ? 'item' : 'itens'} · {tempoAberta(comanda, agora)}
        </Text>
      </View>
      <Text style={TEXTO.valor}>{formatarDinheiro(totalComanda(comanda))}</Text>
      <ChevronRight size={18} color={CORES.primariaClara} />
    </Tocavel>
  );
}

/** Número da mesa (ou as iniciais do nome) num quadradinho amarelo. */
export function SeloMesa({ mesa }: { mesa: string }) {
  return (
    <View style={estilos.selo}>
      <Text style={estilos.seloTexto} numberOfLines={1}>
        {/^\d+$/.test(mesa) ? mesa : mesa.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  selo: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: CORES.primariaSuave,
    borderWidth: 1,
    borderColor: CORES.destaqueBorda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seloTexto: { fontFamily: FONTE.semi, fontSize: 15, color: CORES.primariaClara, fontVariant: ['tabular-nums'] },
});
