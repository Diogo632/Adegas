import type { Periodo } from '@adegas/core';
import { PERIODOS } from '@adegas/core';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CORES, FONTE, TEXTO } from '../tema';
import { useMovimentoReduzido } from './animacoes';
import { Segmentado } from './ui';

const NATIVO = Platform.OS !== 'web';
const SAIDA = Easing.out(Easing.cubic);

export interface Coluna {
  chave: string;
  valor: number;
  rotulo: string;
  detalhe?: string;
  destaque?: boolean;
}

function topoRedondo(maximo: number): number {
  if (maximo <= 0) return 1;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  for (const passo of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (passo * potencia >= maximo) return passo * potencia;
  }
  return 10 * potencia;
}

/**
 * Gráfico de colunas: um eixo, uma cor, colunas crescendo com animação.
 * Toque numa coluna para ver o valor dela na linha de cima.
 */
export function GraficoColunas({
  colunas,
  formatarValor,
  formatarEixo,
  altura = 160,
}: {
  colunas: Coluna[];
  formatarValor: (valor: number) => string;
  formatarEixo: (valor: number) => string;
  altura?: number;
}) {
  const reduzido = useMovimentoReduzido();
  const [ativa, setAtiva] = useState<number | null>(null);
  const progresso = useRef(new Animated.Value(0)).current;
  const topo = topoRedondo(Math.max(...colunas.map((c) => c.valor), 0));
  const temEnfase = colunas.some((c) => c.destaque);
  const maior = colunas.reduce((m, c, i) => (c.valor > colunas[m].valor ? i : m), 0);
  const indice = ativa !== null && ativa < colunas.length ? ativa : maior;
  const escolhida = colunas[indice];
  const passoRotulo = Math.max(1, Math.ceil(colunas.length / 6));
  const assinatura = colunas.map((c) => `${c.chave}:${c.valor}`).join('|');

  useEffect(() => {
    setAtiva(null);
    progresso.setValue(reduzido ? 1 : 0);
    if (!reduzido) {
      Animated.timing(progresso, { toValue: 1, duration: 700, easing: SAIDA, useNativeDriver: NATIVO }).start();
    }
  }, [assinatura, progresso, reduzido]);

  if (!escolhida) return null;

  return (
    <View style={{ gap: 12 }}>
      <View>
        <Text style={estilos.valorEscolhido}>{formatarValor(escolhida.valor)}</Text>
        <Text style={TEXTO.legenda}>
          {escolhida.rotulo}
          {escolhida.detalhe ? ` · ${escolhida.detalhe}` : ''}
          {ativa === null ? ' · o maior do período' : ''}
        </Text>
      </View>
      <View style={estilos.linha}>
        <View style={[estilos.eixo, { height: altura }]}>
          <Text style={[estilos.eixoTexto, { top: -7 }]} numberOfLines={1}>
            {formatarEixo(topo)}
          </Text>
          <Text style={[estilos.eixoTexto, { top: altura / 2 - 7 }]} numberOfLines={1}>
            {formatarEixo(topo / 2)}
          </Text>
          <Text style={[estilos.eixoTexto, { top: altura - 7 }]} numberOfLines={1}>
            {formatarEixo(0)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={[estilos.area, { height: altura }]}>
            <View style={[estilos.grade, { top: 0 }]} />
            <View style={[estilos.grade, { top: altura / 2 }]} />
            {colunas.map((c, i) => {
              const cor =
                i === indice ? CORES.texto : temEnfase && !c.destaque ? CORES.bordaForte : CORES.grafico;
              return (
                <Pressable
                  key={c.chave}
                  accessibilityLabel={`${c.rotulo}: ${formatarValor(c.valor)}`}
                  onPress={() => setAtiva(i)}
                  style={estilos.coluna}
                >
                  <Animated.View
                    style={[
                      estilos.barra,
                      {
                        height: `${(c.valor / topo) * 100}%`,
                        backgroundColor: cor,
                        transform: [{ scaleY: progresso }],
                        transformOrigin: 'bottom',
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
          <View style={estilos.rotulos}>
            {colunas.map((c, i) =>
              i % passoRotulo === 0 ? (
                <Text
                  key={c.chave}
                  style={[estilos.rotulo, { left: `${((i + 0.5) / colunas.length) * 100}%` }]}
                  numberOfLines={1}
                >
                  {c.rotulo}
                </Text>
              ) : null,
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

/** Barra horizontal fina com rótulo e valor em cima; cresce com animação. `fracao` vai de 0 a 1. */
export function BarraHorizontal({
  rotulo,
  valor,
  fracao,
  icone,
}: {
  rotulo: string;
  valor: ReactNode;
  fracao: number;
  icone?: ReactNode;
}) {
  const largura = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(largura, { toValue: fracao, duration: 800, easing: SAIDA, useNativeDriver: false }).start();
  }, [fracao, largura]);
  return (
    <View style={{ gap: 6 }}>
      <View style={estilos.barraTopo}>
        <View style={estilos.barraRotulo}>
          {icone}
          <Text style={[TEXTO.corpo, { fontSize: 15 }]} numberOfLines={1}>
            {rotulo}
          </Text>
        </View>
        {typeof valor === 'string' ? <Text style={estilos.barraValor}>{valor}</Text> : valor}
      </View>
      <View style={estilos.trilho}>
        <Animated.View
          style={[
            estilos.preenchimento,
            { width: largura.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        />
      </View>
    </View>
  );
}

export function SeletorPeriodo({ valor, onChange }: { valor: Periodo; onChange: (periodo: Periodo) => void }) {
  return (
    <Segmentado opcoes={PERIODOS.map((p) => ({ id: p.id, rotulo: p.nome }))} valor={valor} onChange={onChange} compacto />
  );
}

const estilos = StyleSheet.create({
  valorEscolhido: { fontFamily: FONTE.semi, fontSize: 22, color: CORES.texto, fontVariant: ['tabular-nums'] },
  linha: { flexDirection: 'row', gap: 8 },
  eixo: { width: 58, position: 'relative' },
  eixoTexto: {
    position: 'absolute',
    right: 0,
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: CORES.textoFraco,
    fontVariant: ['tabular-nums'],
  },
  area: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: CORES.bordaForte,
  },
  grade: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: CORES.borda },
  coluna: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  barra: { width: '68%', maxWidth: 16, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  rotulos: { height: 18, marginTop: 6, position: 'relative' },
  rotulo: {
    position: 'absolute',
    width: 44,
    marginLeft: -22,
    textAlign: 'center',
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: CORES.textoFraco,
  },
  barraTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  barraRotulo: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  barraValor: { fontFamily: FONTE.semi, fontSize: 15, color: CORES.texto, fontVariant: ['tabular-nums'] },
  trilho: { height: 8, borderRadius: 4, backgroundColor: CORES.superficieAlta, overflow: 'hidden' },
  preenchimento: { height: 8, borderRadius: 4, backgroundColor: CORES.grafico },
});
