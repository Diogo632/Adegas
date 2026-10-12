import type { Periodo } from '@adegas/core';
import {
  FORMAS_PAGAMENTO,
  formatarDinheiro,
  formatarDinheiroCurto,
  intervaloDoPeriodo,
  relatorioVendas,
  useAdega,
} from '@adegas/core';
import { Clock } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Entrar, NumeroAnimado } from '../../components/animacoes';
import { BarraHorizontal, GraficoColunas, SeletorPeriodo } from '../../components/graficos';
import { ICONE_CATEGORIA, ICONE_FORMA } from '../../components/icones';
import { Cartao, Divisor, IconeQuadrado, Secao, TituloAba } from '../../components/ui';
import { CORES, FONTE, RAIO, TEXTO } from '../../tema';

const POSICAO = ['Pico', '2º', '3º'];

export default function Relatorios() {
  const { estado } = useAdega();
  const insets = useSafeAreaInsets();
  const [periodo, setPeriodo] = useState<Periodo>('30d');
  const r = relatorioVendas(estado, intervaloDoPeriodo(periodo));
  const picos = new Set(r.picos.map((p) => p.hora));
  const maiorCategoria = Math.max(...r.categorias.map((c) => c.faturamento), 1);
  const maiorForma = Math.max(...Object.values(r.porForma), 1);
  const horas = r.porHora.filter((h) => h.hora >= 10 || h.vendas > 0);

  return (
    <ScrollView contentContainerStyle={estilos.tela}>
      <TituloAba sobretitulo="Como a adega está indo" titulo="Relatórios" topo={insets.top} />
      <SeletorPeriodo valor={periodo} onChange={setPeriodo} />

      <Entrar key={periodo} style={estilos.resumo}>
        <Text style={estilos.resumoRotulo}>Faturamento</Text>
        <NumeroAnimado valor={r.faturamento} formatar={formatarDinheiro} style={estilos.resumoValor} />
        <Text style={estilos.resumoDetalhe}>
          {r.quantidadeVendas} vendas · {r.itensVendidos} itens
        </Text>
        <View style={estilos.resumoDivisor} />
        <View style={estilos.resumoLinha}>
          <Indicador rotulo="Ticket médio" valor={r.ticketMedio} formatar={formatarDinheiro} />
          <Indicador rotulo="Lucro bruto" valor={r.lucroBruto} formatar={formatarDinheiroCurto} />
          <Indicador rotulo="Margem" valor={r.margem} formatar={(v) => `${v}%`} />
        </View>
      </Entrar>

      <Secao>Vendas por dia</Secao>
      <Cartao>
        <GraficoColunas
          colunas={r.porDia.map((d) => ({
            chave: d.dia.toISOString(),
            valor: d.faturamento,
            rotulo: d.rotulo,
            detalhe: `${d.diaSemana} · ${d.vendas} ${d.vendas === 1 ? 'venda' : 'vendas'}`,
          }))}
          formatarValor={formatarDinheiro}
          formatarEixo={formatarDinheiroCurto}
        />
      </Cartao>

      <Secao>Horários de pico</Secao>
      <View style={estilos.picos}>
        {r.picos.map((p, i) => (
          <View key={p.hora} style={[estilos.pico, i === 0 && estilos.picoPrimeiro]}>
            <View style={estilos.picoTopo}>
              <Clock size={12} color={i === 0 ? CORES.primariaClara : CORES.textoSuave} strokeWidth={2} />
              <Text style={[estilos.picoRotulo, i === 0 && { color: CORES.primariaClara }]}>{POSICAO[i]}</Text>
            </View>
            <Text style={[estilos.picoHora, i === 0 && { color: CORES.primariaClara }]}>{String(p.hora).padStart(2, '0')}:00</Text>
            <Text style={estilos.picoVendas}>{p.vendas} vendas</Text>
          </View>
        ))}
      </View>
      <Cartao>
        <GraficoColunas
          colunas={horas.map((h) => ({
            chave: String(h.hora),
            valor: h.vendas,
            rotulo: `${h.hora}h`,
            detalhe: formatarDinheiro(h.faturamento),
            destaque: picos.has(h.hora),
          }))}
          formatarValor={(v) => `${v} ${v === 1 ? 'venda' : 'vendas'}`}
          formatarEixo={(v) => String(Math.round(v))}
          altura={130}
        />
      </Cartao>

      <Secao>Mais vendidos</Secao>
      <Cartao style={{ paddingVertical: 4, gap: 0 }}>
        {r.produtos.length === 0 && <Text style={[TEXTO.legenda, { paddingVertical: 14 }]}>Nenhuma venda no período.</Text>}
        {r.produtos.slice(0, 5).map((p, i) => (
          <Fragment key={p.produtoId}>
            {i > 0 && <Divisor />}
            <View style={estilos.produto}>
              <Text style={estilos.posicao}>{i + 1}</Text>
              <IconeQuadrado icone={ICONE_CATEGORIA[p.categoria]} tamanho={36} />
              <View style={{ flex: 1 }}>
                <Text style={[TEXTO.corpo, { fontSize: 15 }]} numberOfLines={1}>
                  {p.nome}
                </Text>
                <Text style={TEXTO.legenda}>
                  {p.quantidade} un · lucro <Text style={{ color: CORES.receita }}>{formatarDinheiroCurto(p.lucro)}</Text>
                </Text>
              </View>
              <Text style={TEXTO.valor}>{formatarDinheiroCurto(p.faturamento)}</Text>
            </View>
          </Fragment>
        ))}
      </Cartao>

      <Secao>Por categoria</Secao>
      <Cartao>
        {r.categorias.map((c) => (
          <BarraHorizontal
            key={c.categoria.id}
            rotulo={c.categoria.nome}
            valor={`${Math.round(c.parte * 100)}% · ${formatarDinheiroCurto(c.faturamento)}`}
            fracao={c.faturamento / maiorCategoria}
          />
        ))}
      </Cartao>

      <Secao>Formas de pagamento</Secao>
      <Cartao>
        {FORMAS_PAGAMENTO.map((f) => {
          const Icone = ICONE_FORMA[f.id];
          const valor = r.porForma[f.id];
          const parte = r.faturamento ? Math.round((valor / r.faturamento) * 100) : 0;
          return (
            <BarraHorizontal
              key={f.id}
              rotulo={f.nome}
              icone={<Icone size={16} color={CORES.primariaClara} strokeWidth={1.75} />}
              valor={`${parte}% · ${formatarDinheiroCurto(valor)}`}
              fracao={valor / maiorForma}
            />
          );
        })}
      </Cartao>
    </ScrollView>
  );
}

function Indicador({ rotulo, valor, formatar }: { rotulo: string; valor: number; formatar: (v: number) => string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={estilos.resumoDetalhe}>{rotulo}</Text>
      <NumeroAnimado valor={valor} formatar={formatar} style={estilos.resumoParte} />
    </View>
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
  resumoLinha: { flexDirection: 'row', gap: 10 },
  resumoParte: { fontFamily: FONTE.semi, fontSize: 16, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  picos: { flexDirection: 'row', gap: 10 },
  pico: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 12,
    borderRadius: RAIO.medio,
    borderWidth: 1,
    borderColor: CORES.borda,
    backgroundColor: CORES.superficie,
  },
  picoPrimeiro: { borderColor: CORES.grafico, backgroundColor: CORES.primariaSuave },
  picoTopo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  picoRotulo: { fontFamily: FONTE.media, fontSize: 12, color: CORES.textoSuave },
  picoHora: { fontFamily: FONTE.semi, fontSize: 20, color: CORES.texto, fontVariant: ['tabular-nums'] },
  picoVendas: { fontFamily: FONTE.regular, fontSize: 12, color: CORES.textoFraco },
  produto: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  posicao: { width: 16, fontFamily: FONTE.semi, fontSize: 14, color: CORES.textoFraco },
});
