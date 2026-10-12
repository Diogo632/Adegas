import {
  FORMAS_PAGAMENTO,
  estoqueBaixo,
  formatarDataHora,
  formatarDiaExtenso,
  formatarDinheiro,
  resumoDoDia,
  ultimosLancamentos,
  useAdega,
} from '@adegas/core';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CORES, Cartao, TituloSecao } from '../components/ui';

export default function Inicio() {
  const { estado } = useAdega();
  const hoje = new Date();
  const resumo = resumoDoDia(estado, hoje);
  const alertas = estoqueBaixo(estado.produtos);
  const movimentos = ultimosLancamentos(estado, 6);

  return (
    <ScrollView contentContainerStyle={estilos.tela}>
      <View style={estilos.resumo}>
        <Text style={estilos.resumoData}>{formatarDiaExtenso(hoje)}</Text>
        <Text style={estilos.resumoRotulo}>Vendido hoje</Text>
        <Text style={estilos.resumoValor}>{formatarDinheiro(resumo.faturamento)}</Text>
        <Text style={estilos.resumoDetalhe}>
          {resumo.quantidadeVendas} vendas · lucro bruto {formatarDinheiro(resumo.lucroBruto)}
        </Text>
        <View style={estilos.formas}>
          {FORMAS_PAGAMENTO.map((f) => (
            <View key={f.id} style={estilos.forma}>
              <Text style={estilos.formaNome}>{f.nome}</Text>
              <Text style={estilos.formaValor}>{formatarDinheiro(resumo.porFormaPagamento[f.id])}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={estilos.acoes}>
        <BotaoAcao icone="🛒" titulo="Vender" subtitulo="Registrar venda" primario onPress={() => router.push('/venda')} />
        <BotaoAcao icone="📦" titulo="Entrada" subtitulo="Chegou mercadoria" onPress={() => router.push('/entrada')} />
      </View>

      {alertas.length > 0 && (
        <Cartao style={{ backgroundColor: CORES.alertaFundo, borderColor: '#F1D9AE' }}>
          <TituloSecao>⚠️ Estoque baixo ({alertas.length})</TituloSecao>
          {alertas.slice(0, 5).map((p) => (
            <View key={p.id} style={estilos.linha}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.linhaTitulo}>{p.nome}</Text>
                <Text style={estilos.linhaSub}>
                  restam {p.estoque} · mínimo {p.estoqueMinimo}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/entrada', params: { produtoId: p.id } })}
                style={estilos.repor}
              >
                <Text style={estilos.reporTexto}>Repor</Text>
              </Pressable>
            </View>
          ))}
        </Cartao>
      )}

      <Cartao>
        <TituloSecao>Últimas movimentações</TituloSecao>
        {movimentos.length === 0 && <Text style={estilos.linhaSub}>Nada registrado ainda.</Text>}
        {movimentos.map((l) => (
          <View key={l.id} style={estilos.linha}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.linhaTitulo} numberOfLines={1}>
                {l.descricao}
              </Text>
              <Text style={estilos.linhaSub}>{formatarDataHora(l.data)}</Text>
            </View>
            <Text style={[estilos.valor, { color: l.tipo === 'receita' ? CORES.receita : CORES.despesa }]}>
              {l.tipo === 'receita' ? '+' : '−'} {formatarDinheiro(l.valor)}
            </Text>
          </View>
        ))}
      </Cartao>
    </ScrollView>
  );
}

function BotaoAcao({
  icone,
  titulo,
  subtitulo,
  primario,
  onPress,
}: {
  icone: string;
  titulo: string;
  subtitulo: string;
  primario?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        estilos.acao,
        primario ? { backgroundColor: CORES.destaque, borderColor: CORES.destaque } : null,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={estilos.acaoIcone}>{icone}</Text>
      <Text style={estilos.acaoTitulo}>{titulo}</Text>
      <Text style={estilos.acaoSub}>{subtitulo}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tela: { padding: 16, gap: 16, paddingBottom: 40 },
  resumo: { backgroundColor: CORES.primaria, borderRadius: 20, padding: 20, gap: 4 },
  resumoData: { color: '#F3D9E1', fontSize: 14 },
  resumoRotulo: { color: '#F3D9E1', fontSize: 15, marginTop: 8 },
  resumoValor: { color: '#fff', fontSize: 36, fontWeight: '800' },
  resumoDetalhe: { color: '#F3D9E1', fontSize: 14 },
  formas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  forma: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: CORES.primariaEscura,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  formaNome: { color: '#F3D9E1', fontSize: 13 },
  formaValor: { color: '#fff', fontSize: 16, fontWeight: '700' },
  acoes: { flexDirection: 'row', gap: 12 },
  acao: {
    flex: 1,
    backgroundColor: CORES.superficie,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CORES.borda,
    padding: 18,
    gap: 2,
  },
  acaoIcone: { fontSize: 30 },
  acaoTitulo: { fontSize: 20, fontWeight: '800', color: CORES.texto, marginTop: 6 },
  acaoSub: { fontSize: 14, color: CORES.texto, opacity: 0.75 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linhaTitulo: { fontSize: 15, fontWeight: '600', color: CORES.texto },
  linhaSub: { fontSize: 13, color: CORES.textoSuave },
  valor: { fontSize: 15, fontWeight: '700' },
  repor: { backgroundColor: CORES.primaria, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  reporTexto: { color: '#fff', fontWeight: '700' },
});
