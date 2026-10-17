import { formatarDinheiro, quantidadeNoCarrinho, totalCarrinho, totalItens, useAdega } from '@adegas/core';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NumeroAnimado } from '../components/animacoes';
import { ListaDeProdutos, estiloBarraRodape } from '../components/produtos';
import { Botao } from '../components/ui';
import { TEXTO } from '../tema';

export default function Venda() {
  const { estado, carrinho, definirQuantidade } = useAdega();
  const insets = useSafeAreaInsets();
  const total = totalCarrinho(estado.produtos, carrinho);
  const itens = totalItens(carrinho);

  return (
    <View style={{ flex: 1 }}>
      <ListaDeProdutos
        quantidade={(id) => quantidadeNoCarrinho(carrinho, id)}
        onQuantidade={(produto, v) => definirQuantidade(produto.id, v)}
      />
      <View style={[estiloBarraRodape.barra, { paddingBottom: insets.bottom + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={TEXTO.legenda}>
            {itens} {itens === 1 ? 'item' : 'itens'}
          </Text>
          <NumeroAnimado valor={total} formatar={formatarDinheiro} style={estiloBarraRodape.total} />
        </View>
        <Botao titulo="Pagamento" desabilitado={itens === 0} onPress={() => router.push('/pagamento')} style={{ paddingHorizontal: 28 }} />
      </View>
    </View>
  );
}
