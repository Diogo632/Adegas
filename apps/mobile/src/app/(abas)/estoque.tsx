import type { FiltroEstoque } from '@adegas/core';
import { filtrarEstoque, formatarDinheiro, resumoEstoque, statusEstoque, useAdega } from '@adegas/core';
import { router } from 'expo-router';
import { ChevronRight, Search } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Entrar, NumeroAnimado, Tocavel } from '../../components/animacoes';
import { ICONE_CATEGORIA } from '../../components/icones';
import { Campo, Chip, IconeQuadrado, Pilula, TituloAba } from '../../components/ui';
import { CORES, FONTE, RAIO, TEXTO } from '../../tema';

const FILTROS: { id: FiltroEstoque; nome: string }[] = [
  { id: 'todos', nome: 'Todos' },
  { id: 'baixo', nome: 'Precisa repor' },
  { id: 'zerado', nome: 'Sem estoque' },
];

export default function Estoque() {
  const { estado, pode } = useAdega();
  const verCustos = pode('financeiro');
  const insets = useSafeAreaInsets();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroEstoque>('todos');
  const resumo = resumoEstoque(estado.produtos);
  const lista = filtrarEstoque(estado.produtos, busca, filtro);
  const repor = resumo.baixo + resumo.zerado;

  return (
    <FlatList
      data={lista}
      keyExtractor={(p) => p.id}
      contentContainerStyle={estilos.tela}
      keyboardShouldPersistTaps="handled"
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      ListHeaderComponent={
        <View style={{ gap: 16, marginBottom: 16 }}>
          <TituloAba sobretitulo="Prateleira" titulo="Estoque" topo={insets.top} />
          <Entrar atraso={60} style={estilos.resumos}>
            {verCustos ? (
              <View style={[estilos.resumo, estilos.resumoDestaque]}>
                <Text style={estilos.resumoRotulo}>Valor em estoque</Text>
                <NumeroAnimado valor={resumo.valorCusto} formatar={formatarDinheiro} style={estilos.resumoValor} />
                <Text style={estilos.resumoDetalhe}>{resumo.unidades} unidades pelo custo</Text>
              </View>
            ) : (
              <View style={[estilos.resumo, estilos.resumoDestaque]}>
                <Text style={estilos.resumoRotulo}>Na prateleira</Text>
                <NumeroAnimado valor={resumo.unidades} formatar={String} style={estilos.resumoValor} />
                <Text style={estilos.resumoDetalhe}>unidades de {resumo.produtos} produtos</Text>
              </View>
            )}
            <Tocavel
              accessibilityRole="button"
              onPress={() => setFiltro('baixo')}
              style={[estilos.resumo, repor > 0 && estilos.resumoAlerta]}
            >
              <Text style={[estilos.resumoRotulo, repor > 0 && { color: CORES.alerta }]}>Precisa repor</Text>
              <NumeroAnimado
                valor={repor}
                formatar={String}
                style={[estilos.resumoValor, repor > 0 && { color: CORES.alerta }]}
              />
              <Text style={estilos.resumoDetalhe}>{resumo.zerado > 0 ? `${resumo.zerado} sem estoque` : 'toque para ver'}</Text>
            </Tocavel>
          </Entrar>
          <Campo icone={Search} value={busca} onChangeText={setBusca} placeholder="Buscar produto" />
          <View style={estilos.chips}>
            {FILTROS.map((f) => (
              <Chip key={f.id} rotulo={f.nome} ativo={filtro === f.id} onPress={() => setFiltro(f.id)} />
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={<Text style={[TEXTO.legenda, { textAlign: 'center', marginTop: 24 }]}>Nenhum produto com esse filtro.</Text>}
      renderItem={({ item, index }) => (
        <Entrar atraso={Math.min(index, 8) * 40}>
          <Tocavel
            accessibilityRole="button"
            escala={0.98}
            onPress={() => router.push({ pathname: '/produto/[id]', params: { id: item.id } })}
            style={estilos.linha}
          >
            <IconeQuadrado icone={ICONE_CATEGORIA[item.categoria]} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[TEXTO.corpoForte, { fontSize: 15 }]} numberOfLines={1}>
                {item.nome}
              </Text>
              <View style={estilos.linhaInfo}>
                <Text style={TEXTO.legenda}>
                  <Text style={{ color: CORES.texto, fontFamily: FONTE.semi }}>{item.estoque}</Text> un · mín {item.estoqueMinimo}
                </Text>
                <Pilula situacao={statusEstoque(item)} />
              </View>
            </View>
            <ChevronRight size={18} color={CORES.textoFraco} />
          </Tocavel>
        </Entrar>
      )}
    />
  );
}

const estilos = StyleSheet.create({
  tela: { paddingHorizontal: 20, paddingBottom: 32 },
  resumos: { flexDirection: 'row', gap: 10 },
  resumo: {
    flex: 1,
    padding: 16,
    borderRadius: RAIO.grande,
    borderWidth: 1,
    borderColor: CORES.borda,
    backgroundColor: CORES.superficie,
    gap: 2,
  },
  resumoDestaque: { flex: 1.4, backgroundColor: CORES.destaqueFundo, borderColor: CORES.destaqueBorda },
  resumoAlerta: { backgroundColor: CORES.alertaFundo, borderColor: '#5A4515' },
  resumoRotulo: { fontFamily: FONTE.media, fontSize: 13, color: CORES.primariaClara },
  resumoValor: { fontFamily: FONTE.semi, fontSize: 22, color: CORES.texto, fontVariant: ['tabular-nums'] },
  resumoDetalhe: { fontFamily: FONTE.regular, fontSize: 12, color: CORES.textoSuave },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: RAIO.medio,
    borderWidth: 1,
    borderColor: CORES.borda,
    backgroundColor: CORES.superficie,
  },
  linhaInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
