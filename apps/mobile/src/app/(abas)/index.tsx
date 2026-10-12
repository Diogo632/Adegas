import {
  FORMAS_PAGAMENTO,
  estoqueBaixo,
  formatarDataHora,
  formatarDiaExtenso,
  formatarDinheiro,
  formatarQuando,
  lembretesPendentes,
  resumoDoDia,
  situacaoLembrete,
  saudacao,
  ultimosLancamentos,
  useAdega,
} from '@adegas/core';
import { router } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, Bell, Check, ChevronRight, PackagePlus, ShoppingBag, Sparkles, TriangleAlert } from 'lucide-react-native';
import { Fragment } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Entrar, NumeroAnimado, Tocavel } from '../../components/animacoes';
import { ICONE_FORMA } from '../../components/icones';
import { Botao, Cartao, Divisor, Secao } from '../../components/ui';
import { CORES, FONTE, RAIO, TEXTO } from '../../tema';

export default function Inicio() {
  const { estado, concluirLembrete } = useAdega();
  const insets = useSafeAreaInsets();
  const hoje = new Date();
  const resumo = resumoDoDia(estado, hoje);
  const alertas = estoqueBaixo(estado.produtos);
  const movimentos = ultimosLancamentos(estado, 5);
  const lembretes = lembretesPendentes(estado).slice(0, 4);

  return (
    <ScrollView contentContainerStyle={[estilos.tela, { paddingTop: insets.top + 20 }]}>
      <Entrar style={{ gap: 2 }}>
        <Text style={TEXTO.legenda}>{formatarDiaExtenso(hoje)}</Text>
        <Text style={TEXTO.tituloTela}>{saudacao(hoje)}</Text>
      </Entrar>

      <Entrar atraso={80} style={estilos.resumo}>
        <Text style={estilos.resumoRotulo}>Vendido hoje</Text>
        <NumeroAnimado valor={resumo.faturamento} formatar={formatarDinheiro} style={estilos.resumoValor} />
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
                  <Icone size={14} color={CORES.primariaClara} strokeWidth={1.75} />
                  <Text style={estilos.formaNome}>{f.nome}</Text>
                </View>
                <NumeroAnimado
                  valor={resumo.porFormaPagamento[f.id]}
                  formatar={formatarDinheiro}
                  style={estilos.formaValor}
                />
              </View>
            );
          })}
        </View>
      </Entrar>

      <Entrar atraso={160} style={{ gap: 10 }}>
        <Botao titulo="Nova venda" icone={ShoppingBag} onPress={() => router.push('/venda')} />
        <Botao titulo="Entrada de produto" icone={PackagePlus} variante="contorno" onPress={() => router.push('/entrada')} />
      </Entrar>

      <Entrar atraso={200} style={{ gap: 16 }}>
        <Secao
          acao={
            <Tocavel accessibilityRole="button" onPress={() => router.navigate('/assistente')} style={estilos.secaoAcao}>
              <Sparkles size={14} color={CORES.primariaClara} strokeWidth={1.8} />
              <Text style={estilos.repor}>Criar</Text>
            </Tocavel>
          }
        >
          Lembretes
        </Secao>
        <Cartao style={{ paddingVertical: 6, gap: 0 }}>
          {lembretes.length === 0 && (
            <Text style={[TEXTO.legenda, { paddingVertical: 14 }]}>
              Nada pendente. Peça ao assistente: “me lembre de pagar o fornecedor sexta às 10h”.
            </Text>
          )}
          {lembretes.map((l, i) => {
            const situacao = situacaoLembrete(l, hoje);
            const urgente = situacao !== 'proximo';
            return (
              <Fragment key={l.id}>
                {i > 0 && <Divisor />}
                <View style={estilos.linha}>
                  <View style={[estilos.marcador, { backgroundColor: urgente ? CORES.alertaFundo : CORES.primariaSuave }]}>
                    <Bell size={16} color={urgente ? CORES.alerta : CORES.primariaClara} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={TEXTO.corpoForte} numberOfLines={2}>
                      {l.texto}
                    </Text>
                    <Text style={[TEXTO.legenda, situacao === 'atrasado' && { color: CORES.alerta }]} numberOfLines={1}>
                      {situacao === 'atrasado' ? 'Atrasado · ' : ''}
                      {formatarQuando(l.quando, hoje)}
                      {l.produtoNome ? ` · ${l.produtoNome}` : ''}
                    </Text>
                  </View>
                  <Tocavel
                    accessibilityRole="button"
                    accessibilityLabel={`Marcar "${l.texto}" como feito`}
                    escala={0.85}
                    onPress={() => concluirLembrete(l.id)}
                    style={estilos.feito}
                  >
                    <Check size={17} color={CORES.textoSuave} strokeWidth={2.2} />
                  </Tocavel>
                </View>
              </Fragment>
            );
          })}
        </Cartao>
      </Entrar>

      {alertas.length > 0 && (
        <Entrar atraso={240} style={{ gap: 16 }}>
          <Secao>Repor estoque</Secao>
          <Cartao style={{ paddingVertical: 6, gap: 0 }}>
            {alertas.slice(0, 4).map((p, i) => (
              <Fragment key={p.id}>
                {i > 0 && <Divisor />}
                <Tocavel
                  accessibilityRole="button"
                  escala={0.98}
                  onPress={() => router.push({ pathname: '/entrada', params: { produtoId: p.id } })}
                  style={estilos.linha}
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
                  <ChevronRight size={18} color={CORES.primariaClara} />
                </Tocavel>
              </Fragment>
            ))}
          </Cartao>
        </Entrar>
      )}

      <Entrar atraso={320} style={{ gap: 16 }}>
        <Secao>Movimentações</Secao>
        <Cartao style={{ paddingVertical: 6, gap: 0 }}>
          {movimentos.length === 0 && (
            <Text style={[TEXTO.legenda, { paddingVertical: 14 }]}>Nada registrado ainda.</Text>
          )}
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
                  <Text style={[TEXTO.valor, { fontSize: 15, color: receita ? CORES.receita : CORES.despesa }]}>
                    {receita ? '+' : '−'} {formatarDinheiro(l.valor)}
                  </Text>
                </View>
              </Fragment>
            );
          })}
        </Cartao>
      </Entrar>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { paddingHorizontal: 20, paddingBottom: 48, gap: 16 },
  resumo: {
    backgroundColor: CORES.destaqueFundo,
    borderRadius: RAIO.grande,
    borderWidth: 1,
    borderColor: CORES.destaqueBorda,
    padding: 22,
  },
  resumoRotulo: { fontFamily: FONTE.media, fontSize: 14, color: CORES.primariaClara },
  resumoValor: {
    fontFamily: FONTE.semi,
    fontSize: 44,
    color: '#FFFFFF',
    letterSpacing: -1,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  resumoDetalhe: { fontFamily: FONTE.regular, fontSize: 14, color: CORES.textoSuave, marginTop: 2 },
  resumoDivisor: { height: StyleSheet.hairlineWidth, backgroundColor: CORES.destaqueBorda, marginVertical: 18 },
  formas: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  forma: { width: '50%', gap: 4 },
  formaTopo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  formaNome: { fontFamily: FONTE.regular, fontSize: 13, color: CORES.textoSuave },
  formaValor: { fontFamily: FONTE.semi, fontSize: 17, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  marcador: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  repor: { fontFamily: FONTE.semi, fontSize: 14, color: CORES.primariaClara },
  secaoAcao: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  feito: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CORES.bordaForte,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
