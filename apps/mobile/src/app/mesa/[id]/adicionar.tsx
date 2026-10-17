import type { ItemCarrinho } from '@adegas/core';
import { alterarQuantidade, formatarDinheiro, nomeDaMesa, quantidadeNoCarrinho, totalCarrinho, totalItens, useAdega } from '@adegas/core';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NumeroAnimado } from '../../../components/animacoes';
import { SeloMesa } from '../../../components/mesas';
import { ListaDeProdutos, estiloBarraRodape } from '../../../components/produtos';
import { Aviso, Botao } from '../../../components/ui';
import { CORES, FONTE, TEXTO } from '../../../tema';

/** Escolhe o que a mesa pediu e lança tudo de uma vez na conta. */
export default function AdicionarPedido() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { estado, lancarNaComanda } = useAdega();
  const [pedido, setPedido] = useState<ItemCarrinho[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const comanda = estado.comandas.find((c) => c.id === id);
  const nome = comanda ? nomeDaMesa(comanda.mesa) : 'mesa';

  const itens = totalItens(pedido);
  const total = totalCarrinho(estado.produtos, pedido);

  function lancar() {
    const r = lancarNaComanda(id, pedido);
    if (r.ok) router.back();
    else setErro(r.erro);
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: `Pedido · ${nome}` }} />
      {/* A mesa fica escrita em destaque o tempo todo: difícil lançar na mesa errada. */}
      <View style={estilos.faixa}>
        <SeloMesa mesa={comanda?.mesa ?? '?'} />
        <View style={{ flex: 1 }}>
          <Text style={estilos.faixaRotulo}>Pedido para a</Text>
          <Text style={estilos.faixaMesa}>{nome}</Text>
        </View>
        <Text style={TEXTO.legenda}>Escolha e toque em Lançar</Text>
      </View>
      <ListaDeProdutos
        quantidade={(produtoId) => quantidadeNoCarrinho(pedido, produtoId)}
        onQuantidade={(produto, v) => {
          setPedido((p) => alterarQuantidade(p, produto, v));
          setErro(null);
        }}
      />
      {erro && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
          <Aviso texto={erro} />
        </View>
      )}
      <View style={[estiloBarraRodape.barra, { paddingBottom: insets.bottom + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={TEXTO.legenda}>
            {itens} {itens === 1 ? 'item' : 'itens'}
          </Text>
          <NumeroAnimado valor={total} formatar={formatarDinheiro} style={estiloBarraRodape.total} />
        </View>
        <Botao titulo={`Lançar na ${nome}`} desabilitado={itens === 0} onPress={lancar} style={{ paddingHorizontal: 18 }} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  faixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CORES.primaria,
    backgroundColor: CORES.primariaSuave,
  },
  faixaRotulo: { fontFamily: FONTE.media, fontSize: 12, color: CORES.primariaClara },
  faixaMesa: { fontFamily: FONTE.negrito, fontSize: 20, color: CORES.texto },
});
