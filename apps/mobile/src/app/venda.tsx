import type { CategoriaId, Produto } from '@adegas/core';
import {
  CATEGORIAS,
  buscarProdutos,
  formatarDinheiro,
  maisVendidos,
  quantidadeNoCarrinho,
  totalCarrinho,
  totalItens,
  useAdega,
} from '@adegas/core';
import { router } from 'expo-router';
import { Plus, Search } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Entrar, NumeroAnimado, Tocavel } from '../components/animacoes';
import { ICONE_CATEGORIA } from '../components/icones';
import { Botao, Campo, Chip, Contador, IconeQuadrado } from '../components/ui';
import { CORES, FONTE, RAIO, TEXTO } from '../tema';

export default function Venda() {
  const { estado, carrinho, definirQuantidade } = useAdega();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<CategoriaId | null>(null);
  const insets = useSafeAreaInsets();

  const produtos = buscarProdutos(estado.produtos, busca, filtro);
  const destaques = !busca && !filtro ? maisVendidos(estado, 4) : [];
  const secoes = [
    ...(destaques.length ? [{ titulo: 'Mais vendidos', data: destaques }] : []),
    { titulo: destaques.length ? 'Todos os produtos' : `${produtos.length} produtos`, data: produtos },
  ];
  const total = totalCarrinho(estado.produtos, carrinho);
  const itens = totalItens(carrinho);

  return (
    <View style={{ flex: 1 }}>
      <View style={estilos.topo}>
        <Campo icone={Search} value={busca} onChangeText={setBusca} placeholder="Buscar produto" />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={estilos.chipsRolagem}
        contentContainerStyle={estilos.chips}
      >
        <Chip rotulo="Todos" ativo={filtro === null} onPress={() => setFiltro(null)} />
        {CATEGORIAS.map((c) => (
          <Chip key={c.id} rotulo={c.nome} ativo={filtro === c.id} onPress={() => setFiltro(c.id)} />
        ))}
      </ScrollView>

      <SectionList
        sections={secoes}
        keyExtractor={(p, i) => `${p.id}-${i}`}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => <Text style={[TEXTO.secao, estilos.secao]}>{section.titulo}</Text>}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<Text style={[TEXTO.legenda, { textAlign: 'center', marginTop: 40 }]}>Nenhum produto encontrado.</Text>}
        renderItem={({ item, index }) => (
          <Entrar atraso={Math.min(index, 8) * 45}>
            <LinhaProduto
              produto={item}
              quantidade={quantidadeNoCarrinho(carrinho, item.id)}
              onQuantidade={(v) => definirQuantidade(item.id, v)}
            />
          </Entrar>
        )}
      />

      <View style={[estilos.barra, { paddingBottom: insets.bottom + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={TEXTO.legenda}>
            {itens} {itens === 1 ? 'item' : 'itens'}
          </Text>
          <NumeroAnimado valor={total} formatar={formatarDinheiro} style={estilos.barraTotal} />
        </View>
        <Botao titulo="Pagamento" desabilitado={itens === 0} onPress={() => router.push('/pagamento')} style={{ paddingHorizontal: 28 }} />
      </View>
    </View>
  );
}

function LinhaProduto({
  produto,
  quantidade,
  onQuantidade,
}: {
  produto: Produto;
  quantidade: number;
  onQuantidade: (valor: number) => void;
}) {
  const semEstoque = produto.estoque === 0;
  const noCarrinho = quantidade > 0;
  return (
    <Tocavel
      onPress={() => onQuantidade(quantidade + 1)}
      disabled={semEstoque || quantidade >= produto.estoque}
      escala={0.98}
      style={[estilos.produto, noCarrinho && estilos.produtoNoCarrinho]}
    >
      <IconeQuadrado icone={ICONE_CATEGORIA[produto.categoria]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[TEXTO.corpoForte, { fontSize: 15 }]} numberOfLines={2}>
          {produto.nome}
        </Text>
        <Text style={TEXTO.legenda}>
          <Text style={estilos.preco}>{formatarDinheiro(produto.precoVenda)}</Text>
          {semEstoque ? (
            <Text style={{ color: CORES.despesa }}> · sem estoque</Text>
          ) : (
            ` · ${produto.estoque} un`
          )}
        </Text>
      </View>
      {noCarrinho ? (
        <Contador compacto valor={quantidade} maximo={produto.estoque} onChange={onQuantidade} />
      ) : (
        <View style={[estilos.mais, semEstoque && { opacity: 0.3 }]}>
          <Plus size={18} color={CORES.primariaClara} strokeWidth={2} />
        </View>
      )}
    </Tocavel>
  );
}

const estilos = StyleSheet.create({
  topo: { paddingHorizontal: 20, paddingTop: 8 },
  chipsRolagem: { flexGrow: 0, flexShrink: 0 },
  chips: { gap: 8, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center' },
  secao: { marginTop: 10, marginBottom: 10 },
  produto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: CORES.superficie,
    borderRadius: RAIO.medio,
    borderWidth: 1,
    borderColor: CORES.borda,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  produtoNoCarrinho: { borderColor: CORES.primaria, backgroundColor: CORES.primariaSuave },
  preco: { fontFamily: FONTE.semi, color: CORES.texto },
  mais: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CORES.bordaForte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: CORES.superficie,
    borderTopWidth: 1,
    borderTopColor: CORES.borda,
  },
  barraTotal: { fontFamily: FONTE.semi, fontSize: 24, color: CORES.texto, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
});
