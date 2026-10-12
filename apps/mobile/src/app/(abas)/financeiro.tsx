import type { FiltroLancamento, Periodo } from '@adegas/core';
import {
  FORMAS_PAGAMENTO,
  categoriaLancamento,
  formatarDataHora,
  formatarDinheiro,
  intervaloDoPeriodo,
  lancamentosDoPeriodo,
  resumoFinanceiro,
  useAdega,
} from '@adegas/core';
import { router } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Entrar, NumeroAnimado } from '../../components/animacoes';
import { BarraHorizontal, SeletorPeriodo } from '../../components/graficos';
import { ICONE_FORMA } from '../../components/icones';
import { Botao, Cartao, Chip, Divisor, Secao, TituloAba } from '../../components/ui';
import { CORES, FONTE, RAIO, TEXTO } from '../../tema';

const POR_PAGINA = 25;

export default function Financeiro() {
  const { estado, excluirLancamento } = useAdega();
  const insets = useSafeAreaInsets();
  const [periodo, setPeriodo] = useState<Periodo>('30d');
  const [filtro, setFiltro] = useState<FiltroLancamento>('todos');
  const [limite, setLimite] = useState(POR_PAGINA);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const intervalo = intervaloDoPeriodo(periodo);
  const resumo = resumoFinanceiro(estado, intervalo);
  const lancamentos = lancamentosDoPeriodo(estado, intervalo, filtro);
  const maiorForma = Math.max(...Object.values(resumo.recebidoPorForma), 1);
  const maiorDespesa = Math.max(...resumo.despesasPorCategoria.map((d) => d.valor), 1);

  return (
    <ScrollView contentContainerStyle={estilos.tela}>
      <TituloAba sobretitulo="Dinheiro da adega" titulo="Financeiro" topo={insets.top} />
      <SeletorPeriodo
        valor={periodo}
        onChange={(p) => {
          setPeriodo(p);
          setLimite(POR_PAGINA);
        }}
      />

      <Entrar key={periodo} style={estilos.resumo}>
        <Text style={estilos.resumoRotulo}>Saldo do período</Text>
        <NumeroAnimado
          valor={resumo.saldo}
          formatar={formatarDinheiro}
          style={[estilos.resumoValor, resumo.saldo < 0 && { color: CORES.despesa }]}
        />
        <Text style={estilos.resumoDetalhe}>entrou menos saiu</Text>
        <View style={estilos.resumoDivisor} />
        <View style={estilos.resumoLinha}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={estilos.resumoDetalhe}>Entradas</Text>
            <NumeroAnimado valor={resumo.receitas} formatar={formatarDinheiro} style={[estilos.resumoParte, { color: CORES.receita }]} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={estilos.resumoDetalhe}>Saídas</Text>
            <NumeroAnimado valor={resumo.despesas} formatar={formatarDinheiro} style={[estilos.resumoParte, { color: CORES.despesa }]} />
          </View>
        </View>
      </Entrar>

      <Botao titulo="Nova movimentação" icone={Plus} onPress={() => router.push('/lancamento')} />

      <Secao>Recebido por forma de pagamento</Secao>
      <Cartao>
        {FORMAS_PAGAMENTO.map((f) => {
          const Icone = ICONE_FORMA[f.id];
          const valor = resumo.recebidoPorForma[f.id];
          return (
            <BarraHorizontal
              key={f.id}
              rotulo={f.nome}
              icone={<Icone size={16} color={CORES.primariaClara} strokeWidth={1.75} />}
              valor={formatarDinheiro(valor)}
              fracao={valor / maiorForma}
            />
          );
        })}
      </Cartao>

      <Secao>Para onde foi o dinheiro</Secao>
      <Cartao>
        {resumo.despesasPorCategoria.length === 0 && <Text style={TEXTO.legenda}>Nenhuma saída no período.</Text>}
        {resumo.despesasPorCategoria.map((d) => (
          <BarraHorizontal key={d.categoria} rotulo={d.nome} valor={formatarDinheiro(d.valor)} fracao={d.valor / maiorDespesa} />
        ))}
        {resumo.perdas > 0 && (
          <Text style={TEXTO.legenda}>
            Perdas (quebras e consumo): <Text style={{ color: CORES.despesa }}>{formatarDinheiro(resumo.perdas)}</Text> pelo custo.
          </Text>
        )}
      </Cartao>

      <Secao>Movimentações</Secao>
      <View style={estilos.chips}>
        {(
          [
            ['todos', 'Todas'],
            ['receita', 'Entradas'],
            ['despesa', 'Saídas'],
          ] as const
        ).map(([id, nome]) => (
          <Chip
            key={id}
            rotulo={nome}
            ativo={filtro === id}
            onPress={() => {
              setFiltro(id);
              setLimite(POR_PAGINA);
            }}
          />
        ))}
      </View>
      <Cartao style={{ paddingVertical: 4, gap: 0 }}>
        {lancamentos.length === 0 && <Text style={[TEXTO.legenda, { paddingVertical: 14 }]}>Nada no período.</Text>}
        {lancamentos.slice(0, limite).map((l, i) => {
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
                  <Text style={TEXTO.legenda} numberOfLines={1}>
                    {formatarDataHora(l.data)} · {categoriaLancamento(l.categoria).nome}
                  </Text>
                  {l.origem === 'manual' &&
                    (excluindo === l.id ? (
                      <View style={estilos.confirmar}>
                        <Text style={TEXTO.legenda}>Excluir?</Text>
                        <Pressable
                          hitSlop={8}
                          onPress={() => {
                            excluirLancamento(l.id);
                            setExcluindo(null);
                          }}
                        >
                          <Text style={[estilos.acao, { color: CORES.despesa }]}>Sim</Text>
                        </Pressable>
                        <Pressable hitSlop={8} onPress={() => setExcluindo(null)}>
                          <Text style={estilos.acao}>Não</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable hitSlop={8} onPress={() => setExcluindo(l.id)}>
                        <Text style={[estilos.acao, { color: CORES.textoFraco }]}>excluir</Text>
                      </Pressable>
                    ))}
                </View>
                <Text style={[TEXTO.valor, { fontSize: 15, color: receita ? CORES.receita : CORES.despesa }]}>
                  {receita ? '+' : '−'} {formatarDinheiro(l.valor)}
                </Text>
              </View>
            </Fragment>
          );
        })}
      </Cartao>
      {lancamentos.length > limite && (
        <Botao
          titulo={`Mostrar mais (${lancamentos.length - limite})`}
          variante="contorno"
          onPress={() => setLimite((n) => n + POR_PAGINA)}
        />
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  resumo: {
    backgroundColor: CORES.destaqueFundo,
    borderRadius: RAIO.grande,
    borderWidth: 1,
    borderColor: CORES.destaqueBorda,
    padding: 20,
  },
  resumoRotulo: { fontFamily: FONTE.media, fontSize: 14, color: CORES.primariaClara },
  resumoValor: { fontFamily: FONTE.semi, fontSize: 38, color: '#FFFFFF', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  resumoDetalhe: { fontFamily: FONTE.regular, fontSize: 13, color: CORES.textoSuave },
  resumoDivisor: { height: StyleSheet.hairlineWidth, backgroundColor: CORES.destaqueBorda, marginVertical: 14 },
  resumoLinha: { flexDirection: 'row', gap: 12 },
  resumoParte: { fontFamily: FONTE.semi, fontSize: 18, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  marcador: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  confirmar: { flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: 4 },
  acao: { fontFamily: FONTE.semi, fontSize: 13, color: CORES.primariaClara, marginTop: 2 },
});
