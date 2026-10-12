import {
  FORMAS_PAGAMENTO,
  estoqueBaixo,
  formatarDataHora,
  formatarDiaExtenso,
  formatarDinheiro,
  resumoDoDia,
  saudacao,
  ultimosLancamentos,
  useAdega,
} from '@adegas/core';
import { router } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, PackagePlus, ShoppingBag, TriangleAlert } from 'lucide-react-native';
import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ICONE_FORMA } from '../components/icones';
import { Botao, Cartao, Divisor, Secao } from '../components/ui';
import { CORES, FONTE, RAIO, TEXTO } from '../tema';

export default function Inicio() {
  const { estado } = useAdega();
  const insets = useSafeAreaInsets();
  const hoje = new Date();
  const resumo = resumoDoDia(estado, hoje);
  const alertas = estoqueBaixo(estado.produtos);
  const movimentos = ultimosLancamentos(estado, 5);

  return (
    <ScrollView contentContainerStyle={[estilos.tela, { paddingTop: insets.top + 20 }]}>
      <View style={{ gap: 2 }}>
        <Text style={TEXTO.legenda}>{formatarDiaExtenso(hoje)}</Text>
        <Text style={TEXTO.tituloTela}>{saudacao(hoje)}</Text>
      </View>

      <View style={estilos.resumo}>
        <Text style={estilos.resumoRotulo}>Vendido hoje</Text>
        <Text style={estilos.resumoValor}>{formatarDinheiro(resumo.faturamento)}</Text>
        <Text style={estilos.resumoDetalhe}>
          {resumo.quantidadeVendas} vendas · lucro bruto {formatarDinheiro(resumo.lucroBruto)}
        </Text>
        <View style={estilos.resumoDivisor} />
        <View style={estilos.formas}>
          {FORMAS_PAGAMENTO.map((f) => {
            const Icone = ICONE_FORMA[f.id];
            return (
              <View key={f.id} style={estilos.forma}>
                <View style={estilos.formaTopo}>
                  <Icone size={14} color={CORES.tintaTexto} strokeWidth={1.75} />
                  <Text style={estilos.formaNome}>{f.nome}</Text>
                </View>
                <Text style={estilos.formaValor}>{formatarDinheiro(resumo.porFormaPagamento[f.id])}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <Botao titulo="Nova venda" icone={ShoppingBag} onPress={() => router.push('/venda')} />
        <Botao titulo="Entrada de produto" icone={PackagePlus} variante="contorno" onPress={() => router.push('/entrada')} />
      </View>

      {alertas.length > 0 && (
        <>
          <Secao>Repor estoque</Secao>
          <Cartao style={{ paddingVertical: 6, gap: 0 }}>
            {alertas.slice(0, 4).map((p, i) => (
              <Fragment key={p.id}>
                {i > 0 && <Divisor />}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/entrada', params: { produtoId: p.id } })}
                  style={({ pressed }) => [estilos.linha, pressed && { opacity: 0.6 }]}
                >
                  <View style={[estilos.marcador, { backgroundColor: CORES.alertaFundo }]}>
                    <TriangleAlert size={16} color={CORES.alerta} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={TEXTO.corpoForte} numberOfLines={1}>
                      {p.nome}
                    </Text>
                    <Text style={TEXTO.legenda}>
                      {p.estoque} em estoque · mínimo {p.estoqueMinimo}
                    </Text>
                  </View>
                  <Text style={estilos.repor}>Repor</Text>
                  <ChevronRight size={18} color={CORES.textoFraco} />
                </Pressable>
              </Fragment>
            ))}
          </Cartao>
        </>
      )}

      <Secao>Movimentações</Secao>
      <Cartao style={{ paddingVertical: 6, gap: 0 }}>
        {movimentos.length === 0 && <Text style={[TEXTO.legenda, { paddingVertical: 14 }]}>Nada registrado ainda.</Text>}
        {movimentos.map((l, i) => {
          const receita = l.tipo === 'receita';
          const Seta = receita ? ArrowUpRight : ArrowDownLeft;
          return (
            <Fragment key={l.id}>
              {i > 0 && <Divisor />}
              <View style={estilos.linha}>
                <View style={[estilos.marcador, { backgroundColor: receita ? CORES.receitaFundo : CORES.despesaFundo }]}>
                  <Seta size={16} color={receita ? CORES.receita : CORES.despesa} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[TEXTO.corpo, { fontSize: 15 }]} numberOfLines={1}>
                    {l.descricao}
                  </Text>
                  <Text style={TEXTO.legenda}>{formatarDataHora(l.data)}</Text>
                </View>
                <Text style={[TEXTO.valor, { fontSize: 15 }]}>
                  {receita ? '+' : '−'} {formatarDinheiro(l.valor)}
                </Text>
              </View>
            </Fragment>
          );
        })}
      </Cartao>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { paddingHorizontal: 20, paddingBottom: 48, gap: 16 },
  resumo: { backgroundColor: CORES.tinta, borderRadius: RAIO.grande, padding: 22 },
  resumoRotulo: { fontFamily: FONTE.media, fontSize: 14, color: CORES.tintaTexto },
  resumoValor: {
    fontFamily: FONTE.semi,
    fontSize: 44,
    color: '#FFFFFF',
    letterSpacing: -1,
    marginTop: 4,
  },
  resumoDetalhe: { fontFamily: FONTE.regular, fontSize: 14, color: CORES.tintaTexto, marginTop: 2 },
  resumoDivisor: { height: StyleSheet.hairlineWidth, backgroundColor: '#3A3431', marginVertical: 18 },
  formas: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  forma: { width: '50%', gap: 4 },
  formaTopo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  formaNome: { fontFamily: FONTE.regular, fontSize: 13, color: CORES.tintaTexto },
  formaValor: { fontFamily: FONTE.semi, fontSize: 17, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  marcador: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  repor: { fontFamily: FONTE.semi, fontSize: 14, color: CORES.primaria },
});
