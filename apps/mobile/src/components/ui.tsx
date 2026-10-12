import type { LucideIcon } from 'lucide-react-native';
import { Minus, Plus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardTypeOptions, StyleProp, ViewStyle } from 'react-native';
import { Animated, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { CORES, FONTE, RAIO, TEXTO } from '../tema';
import { Tocavel } from './animacoes';

export function Cartao({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[estilos.cartao, style]}>{children}</View>;
}

export function Secao({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <View style={estilos.secao}>
      <Text style={TEXTO.secao}>{children}</Text>
      {acao}
    </View>
  );
}

/** Linha fina entre itens de uma lista. */
export function Divisor() {
  return <View style={estilos.divisor} />;
}

interface BotaoProps {
  titulo: string;
  onPress: () => void;
  /** primario = roxo (a ação principal da tela); contorno = secundário. */
  variante?: 'primario' | 'contorno';
  icone?: LucideIcon;
  desabilitado?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Botao({ titulo, onPress, variante = 'primario', icone: Icone, desabilitado, style }: BotaoProps) {
  const corTexto = variante === 'contorno' ? CORES.texto : '#FFFFFF';
  return (
    <Tocavel
      accessibilityRole="button"
      onPress={onPress}
      disabled={desabilitado}
      style={[
        estilos.botao,
        variante === 'primario' ? estilos.botaoPrimario : estilos.botaoContorno,
        desabilitado && { opacity: 0.35 },
        style,
      ]}
    >
      {Icone ? <Icone size={20} color={corTexto} strokeWidth={2} /> : null}
      <Text style={[estilos.botaoTexto, { color: corTexto }]}>{titulo}</Text>
    </Tocavel>
  );
}

export function Chip({ rotulo, ativo, onPress }: { rotulo: string; ativo: boolean; onPress: () => void }) {
  return (
    <Tocavel
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      onPress={onPress}
      escala={0.92}
      style={[estilos.chip, ativo && estilos.chipAtivo]}
    >
      <Text style={[estilos.chipTexto, ativo && { color: '#FFFFFF' }]}>{rotulo}</Text>
    </Tocavel>
  );
}

/** Escolha entre 2 ou 3 opções; o destaque roxo desliza até a opção tocada. */
export function Segmentado<T extends string>({
  opcoes,
  valor,
  onChange,
  compacto,
}: {
  opcoes: { id: T; rotulo: string }[];
  valor: T;
  onChange: (id: T) => void;
  compacto?: boolean;
}) {
  const [largura, setLargura] = useState(0);
  const indice = Math.max(0, opcoes.findIndex((o) => o.id === valor));
  const posicao = useRef(new Animated.Value(indice)).current;
  const larguraOpcao = largura / opcoes.length;

  useEffect(() => {
    Animated.spring(posicao, {
      toValue: indice,
      friction: 8,
      tension: 140,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [indice, posicao]);

  return (
    <View style={estilos.segmentado} onLayout={(e) => setLargura(e.nativeEvent.layout.width - 8)}>
      {largura > 0 && (
        <Animated.View
          style={[
            estilos.segmentoIndicador,
            {
              width: larguraOpcao,
              transform: [
                {
                  translateX: posicao.interpolate({
                    inputRange: [0, Math.max(1, opcoes.length - 1)],
                    outputRange: [0, larguraOpcao * Math.max(1, opcoes.length - 1)],
                  }),
                },
              ],
            },
          ]}
        />
      )}
      {opcoes.map((o) => {
        const ativo = o.id === valor;
        return (
          <Tocavel
            key={o.id}
            accessibilityRole="button"
            accessibilityState={{ selected: ativo }}
            onPress={() => onChange(o.id)}
            escala={0.97}
            style={[estilos.segmento, compacto && { paddingVertical: 9 }]}
          >
            <Text
              style={[estilos.segmentoTexto, compacto && { fontSize: 13 }, ativo && { color: '#FFFFFF' }]}
              numberOfLines={1}
            >
              {o.rotulo}
            </Text>
          </Tocavel>
        );
      })}
    </View>
  );
}

export function Campo({
  rotulo,
  value,
  onChangeText,
  placeholder,
  teclado = 'default',
  prefixo,
  icone: Icone,
}: {
  rotulo?: string;
  value: string;
  onChangeText: (texto: string) => void;
  placeholder?: string;
  teclado?: KeyboardTypeOptions;
  prefixo?: string;
  icone?: LucideIcon;
}) {
  const [foco, setFoco] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      {rotulo ? <Text style={estilos.rotulo}>{rotulo}</Text> : null}
      <View style={[estilos.campo, foco && { borderColor: CORES.primariaClara }]}>
        {Icone ? <Icone size={20} color={foco ? CORES.primariaClara : CORES.textoSuave} strokeWidth={1.75} /> : null}
        {prefixo ? <Text style={estilos.prefixo}>{prefixo}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={CORES.textoFraco}
          keyboardType={teclado}
          keyboardAppearance="dark"
          selectionColor={CORES.primariaClara}
          onFocus={() => setFoco(true)}
          onBlur={() => setFoco(false)}
          style={estilos.campoTexto}
        />
      </View>
    </View>
  );
}

/** Botões de − e + (mais fácil que digitar a quantidade). */
export function Contador({
  valor,
  onChange,
  minimo = 0,
  maximo,
  compacto,
}: {
  valor: number;
  onChange: (valor: number) => void;
  minimo?: number;
  maximo?: number;
  compacto?: boolean;
}) {
  const tamanho = compacto ? 34 : 44;
  const podeMenos = valor > minimo;
  const podeMais = maximo === undefined || valor < maximo;
  return (
    <View style={estilos.contador}>
      <Tocavel
        accessibilityLabel="Diminuir"
        onPress={() => onChange(valor - 1)}
        disabled={!podeMenos}
        escala={0.85}
        style={[estilos.contadorBotao, { width: tamanho, height: tamanho }, !podeMenos && { opacity: 0.3 }]}
      >
        <Minus size={18} color={CORES.texto} strokeWidth={2} />
      </Tocavel>
      <Text style={[estilos.contadorValor, compacto && { fontSize: 16, minWidth: 24 }]}>{valor}</Text>
      <Tocavel
        accessibilityLabel="Aumentar"
        onPress={() => onChange(valor + 1)}
        disabled={!podeMais}
        escala={0.85}
        style={[
          estilos.contadorBotao,
          { width: tamanho, height: tamanho, backgroundColor: CORES.primaria, borderColor: CORES.primaria },
          !podeMais && { opacity: 0.3 },
        ]}
      >
        <Plus size={18} color="#FFFFFF" strokeWidth={2} />
      </Tocavel>
    </View>
  );
}

/** Ícone de categoria dentro de um quadrado escuro, com o traço em roxo. */
export function IconeQuadrado({ icone: Icone, tamanho = 44 }: { icone: LucideIcon; tamanho?: number }) {
  return (
    <View style={[estilos.iconeQuadrado, { width: tamanho, height: tamanho }]}>
      <Icone size={tamanho * 0.48} color={CORES.primariaClara} strokeWidth={1.6} />
    </View>
  );
}

export function LinhaValor({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: ReactNode;
  destaque?: boolean;
}) {
  return (
    <View style={estilos.linhaValor}>
      <Text style={[TEXTO.legenda, { fontSize: 15 }, destaque && { color: CORES.texto, fontFamily: FONTE.semi }]}>
        {rotulo}
      </Text>
      {typeof valor === 'string' ? (
        <Text style={[TEXTO.valor, { fontSize: 15 }, destaque && estilos.valorDestaque]}>{valor}</Text>
      ) : (
        valor
      )}
    </View>
  );
}

export function Aviso({ texto, tipo = 'erro' }: { texto: string; tipo?: 'erro' | 'sucesso' }) {
  const erro = tipo === 'erro';
  return (
    <View style={[estilos.aviso, !erro && { backgroundColor: CORES.receitaFundo }]}>
      <Text style={{ color: erro ? CORES.despesa : CORES.receita, fontFamily: FONTE.media, fontSize: 15 }}>{texto}</Text>
    </View>
  );
}

export type Situacao = 'ok' | 'baixo' | 'zerado';
const NOME_SITUACAO: Record<Situacao, string> = { ok: 'Em dia', baixo: 'Baixo', zerado: 'Sem estoque' };

/** Pílula colorida com a situação do estoque. */
export function Pilula({ situacao }: { situacao: Situacao }) {
  const cor = situacao === 'ok' ? CORES.receita : situacao === 'baixo' ? CORES.alerta : CORES.despesa;
  const fundo = situacao === 'ok' ? CORES.receitaFundo : situacao === 'baixo' ? CORES.alertaFundo : CORES.despesaFundo;
  return (
    <View style={[estilos.pilula, { backgroundColor: fundo }]}>
      <View style={[estilos.pilulaPonto, { backgroundColor: cor }]} />
      <Text style={[estilos.pilulaTexto, { color: cor }]}>{NOME_SITUACAO[situacao]}</Text>
    </View>
  );
}

/** Título grande das abas (Início, Estoque, Financeiro, Relatórios). */
export function TituloAba({ sobretitulo, titulo, topo }: { sobretitulo: string; titulo: string; topo: number }) {
  return (
    <View style={{ paddingTop: topo + 20, gap: 2 }}>
      <Text style={[TEXTO.legenda, { color: CORES.primariaClara }]}>{sobretitulo}</Text>
      <Text style={TEXTO.tituloTela}>{titulo}</Text>
    </View>
  );
}

export const estiloValorDestaque = { fontSize: 20, fontFamily: FONTE.negrito, color: CORES.texto };

const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: CORES.superficie,
    borderRadius: RAIO.grande,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  secao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  divisor: { height: StyleSheet.hairlineWidth, backgroundColor: CORES.bordaForte },
  botao: {
    minHeight: 56,
    borderRadius: RAIO.medio,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  botaoPrimario: {
    backgroundColor: CORES.primaria,
    shadowColor: CORES.primaria,
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  botaoContorno: { backgroundColor: CORES.superficie, borderWidth: 1, borderColor: CORES.bordaForte },
  botaoTexto: { fontFamily: FONTE.semi, fontSize: 16 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CORES.borda,
    backgroundColor: CORES.superficie,
  },
  chipAtivo: { backgroundColor: CORES.primaria, borderColor: CORES.primaria },
  chipTexto: { fontFamily: FONTE.media, fontSize: 14, color: CORES.textoSuave },
  segmentado: {
    flexDirection: 'row',
    backgroundColor: CORES.superficie,
    borderRadius: RAIO.medio,
    borderWidth: 1,
    borderColor: CORES.borda,
    padding: 4,
  },
  segmentoIndicador: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: RAIO.pequeno,
    backgroundColor: CORES.primaria,
  },
  segmento: { flex: 1, paddingVertical: 11, borderRadius: RAIO.pequeno, alignItems: 'center' },
  segmentoTexto: { fontFamily: FONTE.media, fontSize: 15, color: CORES.textoSuave },
  rotulo: { fontFamily: FONTE.media, fontSize: 14, color: CORES.textoSuave },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: CORES.superficieAlta,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: RAIO.medio,
    paddingHorizontal: 14,
  },
  prefixo: { fontFamily: FONTE.media, fontSize: 17, color: CORES.textoSuave },
  campoTexto: {
    flex: 1,
    fontFamily: FONTE.regular,
    fontSize: 17,
    paddingVertical: 14,
    color: CORES.texto,
    outlineWidth: 0,
  },
  contador: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contadorBotao: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CORES.bordaForte,
    backgroundColor: CORES.superficieAlta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorValor: {
    fontFamily: FONTE.semi,
    fontSize: 20,
    minWidth: 32,
    textAlign: 'center',
    color: CORES.texto,
    fontVariant: ['tabular-nums'],
  },
  iconeQuadrado: {
    borderRadius: 12,
    backgroundColor: CORES.primariaSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linhaValor: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  valorDestaque: estiloValorDestaque,
  aviso: {
    borderRadius: RAIO.medio,
    padding: 14,
    backgroundColor: CORES.despesaFundo,
  },
  pilula: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pilulaPonto: { width: 6, height: 6, borderRadius: 3 },
  pilulaTexto: { fontFamily: FONTE.semi, fontSize: 12 },
});
