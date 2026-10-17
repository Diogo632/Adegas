import type { CategoriaId, Produto } from '@adegas/core';
import { CATEGORIAS, buscarProdutos, formatarDinheiro, maisVendidos, useAdega } from '@adegas/core';
import { Plus, Search } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { CORES, FONTE, RAIO, TEXTO } from '../tema';
import { Entrar, Tocavel } from './animacoes';
import { ICONE_CATEGORIA } from './icones';
import { Campo, Chip, Contador, IconeQuadrado } from './ui';

/**
 * Busca, categorias e lista de produtos com + e −. Usada na venda do balcão
 * e no pedido de mesa; quem usa decide onde a quantidade fica guardada.
 */
export function ListaDeProdutos({
  quantidade,
  onQuantidade,
}: {
  quantidade: (produtoId: string) => number;
  onQuantidade: (produto: Produto, valor: number) => void;
}) {
  const { estado } = useAdega();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<CategoriaId | null>(null);

  const produtos = buscarProdutos(estado.produtos, busca, filtro);
  const destaques = !busca && !filtro ? maisVendidos(estado, 4) : [];
  const secoes = [
    ...(destaques.length ? [{ titulo: 'Mais vendidos', data: destaques }] : []),
    { titulo: destaques.length ? 'Todos os produtos' : `${produtos.length} produtos`, data: produtos },
  ];

  return (
    <View style={{ flex: 1 }}>
      <View style={estilos.topo}>
        <Campo icone={Search} value={busca} onChangeText={setBusca} placeholder="Buscar produto" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.chipsRolagem} contentContainerStyle={estilos.chips}>
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
            <LinhaProduto produto={item} quantidade={quantidade(item.id)} onQuantidade={(v) => onQuantidade(item, v)} />
          </Entrar>
        )}
      />
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
  const semEstoque = produto.estoque <= 0;
  const escolhido = quantidade > 0;
  return (
    <Tocavel
      onPress={() => onQuantidade(quantidade + 1)}
      disabled={semEstoque || quantidade >= produto.estoque}
      escala={0.98}
      style={[estilos.produto, escolhido && estilos.produtoEscolhido]}
    >
      <IconeQuadrado icone={ICONE_CATEGORIA[produto.categoria]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[TEXTO.corpoForte, { fontSize: 15 }]} numberOfLines={2}>
          {produto.nome}
        </Text>
        <Text style={TEXTO.legenda}>
          <Text style={estilos.preco}>{formatarDinheiro(produto.precoVenda)}</Text>
          {semEstoque ? <Text style={{ color: CORES.despesa }}> · sem estoque</Text> : ` · ${produto.estoque} un`}
        </Text>
      </View>
      {escolhido ? (
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
  produtoEscolhido: { borderColor: CORES.primaria, backgroundColor: CORES.primariaSuave },
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
});

/** Barra fixa no rodapé com o total e o botão da próxima etapa. */
export const estiloBarraRodape = StyleSheet.create({
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
  total: { fontFamily: FONTE.semi, fontSize: 24, color: CORES.texto, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
});
