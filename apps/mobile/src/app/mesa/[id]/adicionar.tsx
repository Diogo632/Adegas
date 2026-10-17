import type { ItemCarrinho } from '@adegas/core';
import { alterarQuantidade, formatarDinheiro, nomeDaMesa, quantidadeNoCarrinho, totalCarrinho, totalItens, useAdega } from '@adegas/core';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NumeroAnimado } from '../../../components/animacoes';
import { ListaDeProdutos, estiloBarraRodape } from '../../../components/produtos';
import { Aviso, Botao } from '../../../components/ui';
import { TEXTO } from '../../../tema';

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
