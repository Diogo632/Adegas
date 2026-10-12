import type { CategoriaId } from '@adegas/core';
import {
  CATEGORIAS,
  buscarProdutos,
  categoria,
  formatarDinheiro,
  quantidadeNoCarrinho,
  totalCarrinho,
  totalItens,
  useAdega,
} from '@adegas/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Botao, CORES, Chip, Contador } from '../components/ui';

export default function Venda() {
  const { estado, carrinho, definirQuantidade } = useAdega();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<CategoriaId | null>(null);
  const insets = useSafeAreaInsets();

  const produtos = buscarProdutos(estado.produtos, busca, filtro);
  const total = totalCarrinho(estado.produtos, carrinho);
  const itens = totalItens(carrinho);

  return (
    <View style={{ flex: 1 }}>
      <View style={estilos.topo}>
        <TextInput
          value={busca}
          onChangeText={setBusca}
          placeholder="🔍  Buscar produto"
          placeholderTextColor="#A39A93"
          style={estilos.busca}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.chipsRolagem} contentContainerStyle={estilos.chips}>
        <Chip rotulo="Todos" ativo={filtro === null} onPress={() => setFiltro(null)} />
        {CATEGORIAS.map((c) => (
          <Chip key={c.id} rotulo={`${c.icone} ${c.nome}`} ativo={filtro === c.id} onPress={() => setFiltro(c.id)} />
        ))}
      </ScrollView>

      <FlatList
        data={produtos}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={estilos.vazio}>Nenhum produto encontrado.</Text>}
        renderItem={({ item }) => {
          const qtd = quantidadeNoCarrinho(carrinho, item.id);
          const semEstoque = item.estoque === 0;
          return (
            <Pressable
              onPress={() => definirQuantidade(item.id, qtd + 1)}
              disabled={semEstoque || qtd >= item.estoque}
              style={[estilos.produto, qtd > 0 && estilos.produtoNoCarrinho]}
            >
              <Text style={estilos.icone}>{categoria(item.categoria).icone}</Text>
              <View style={{ flex: 1 }}>
                <Text style={estilos.nome} numberOfLines={2}>
                  {item.nome}
                </Text>
                <Text style={estilos.detalhe}>
                  <Text style={estilos.preco}>{formatarDinheiro(item.precoVenda)}</Text>
                  {semEstoque ? (
                    <Text style={{ color: CORES.despesa }}> · sem estoque</Text>
                  ) : (
                    ` · ${item.estoque} em estoque`
                  )}
                </Text>
              </View>
              {qtd > 0 ? (
                <Contador compacto valor={qtd} maximo={item.estoque} onChange={(v) => definirQuantidade(item.id, v)} />
              ) : (
                <View style={[estilos.mais, semEstoque && { opacity: 0.3 }]}>
                  <Text style={estilos.maisTexto}>+</Text>
                </View>
              )}
            </Pressable>
          );
        }}
      />

      <View style={[estilos.barra, { paddingBottom: insets.bottom + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={estilos.barraItens}>
            {itens} {itens === 1 ? 'item' : 'itens'}
          </Text>
          <Text style={estilos.barraTotal}>{formatarDinheiro(total)}</Text>
        </View>
        <Botao titulo="Pagamento →" desabilitado={itens === 0} onPress={() => router.push('/pagamento')} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  topo: { paddingHorizontal: 16, paddingTop: 16 },
  busca: {
    backgroundColor: CORES.superficie,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    color: CORES.texto,
    outlineWidth: 0,
  },
  chipsRolagem: { flexGrow: 0, flexShrink: 0 },
  chips: { gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 2, alignItems: 'center' },
  produto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CORES.superficie,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CORES.borda,
    padding: 12,
  },
  produtoNoCarrinho: { borderColor: CORES.primaria, borderWidth: 2, padding: 11 },
  icone: { fontSize: 26 },
  nome: { fontSize: 16, fontWeight: '600', color: CORES.texto },
  detalhe: { fontSize: 14, color: CORES.textoSuave, marginTop: 2 },
  preco: { fontWeight: '700', color: CORES.texto },
  mais: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: CORES.primaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maisTexto: { color: '#fff', fontSize: 26, fontWeight: '700', lineHeight: 30 },
  vazio: { textAlign: 'center', color: CORES.textoSuave, marginTop: 40, fontSize: 15 },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: CORES.superficie,
    borderTopWidth: 1,
    borderTopColor: CORES.borda,
  },
  barraItens: { fontSize: 14, color: CORES.textoSuave },
  barraTotal: { fontSize: 24, fontWeight: '800', color: CORES.texto },
});
