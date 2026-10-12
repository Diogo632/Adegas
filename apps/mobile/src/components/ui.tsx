import type { LucideIcon } from 'lucide-react-native';
import { Minus, Plus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { KeyboardTypeOptions, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CORES, FONTE, RAIO, TEXTO } from '../tema';

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
  /** primario = vinho (a ação principal da tela); escuro = grafite; contorno = secundário. */
  variante?: 'primario' | 'escuro' | 'contorno';
  icone?: LucideIcon;
  desabilitado?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Botao({ titulo, onPress, variante = 'primario', icone: Icone, desabilitado, style }: BotaoProps) {
  const corTexto = variante === 'contorno' ? CORES.texto : '#FFFFFF';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={desabilitado}
      style={({ pressed }) => [
        estilos.botao,
        variante === 'primario' && { backgroundColor: pressed ? CORES.primariaEscura : CORES.primaria },
        variante === 'escuro' && { backgroundColor: CORES.tinta },
        variante === 'contorno' && estilos.botaoContorno,
        desabilitado && { opacity: 0.35 },
        pressed && variante !== 'primario' && { opacity: 0.85 },
        style,
      ]}
    >
      {Icone ? <Icone size={20} color={corTexto} strokeWidth={2} /> : null}
      <Text style={[estilos.botaoTexto, { color: corTexto }]}>{titulo}</Text>
    </Pressable>
  );
}

export function Chip({ rotulo, ativo, onPress }: { rotulo: string; ativo: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      onPress={onPress}
      style={[estilos.chip, ativo && estilos.chipAtivo]}
    >
      <Text style={[estilos.chipTexto, ativo && { color: '#FFFFFF' }]}>{rotulo}</Text>
    </Pressable>
  );
}

export function Segmentado<T extends string>({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: { id: T; rotulo: string }[];
  valor: T;
  onChange: (id: T) => void;
}) {
  return (
    <View style={estilos.segmentado}>
      {opcoes.map((o) => {
        const ativo = o.id === valor;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="button"
            accessibilityState={{ selected: ativo }}
            onPress={() => onChange(o.id)}
            style={[estilos.segmento, ativo && estilos.segmentoAtivo]}
          >
            <Text style={[estilos.segmentoTexto, ativo && { color: CORES.texto }]}>{o.rotulo}</Text>
          </Pressable>
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
      <View style={[estilos.campo, foco && { borderColor: CORES.tinta }]}>
        {Icone ? <Icone size={20} color={CORES.textoSuave} strokeWidth={1.75} /> : null}
        {prefixo ? <Text style={estilos.prefixo}>{prefixo}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={CORES.textoFraco}
          keyboardType={teclado}
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
      <Pressable
        accessibilityLabel="Diminuir"
        onPress={() => onChange(valor - 1)}
        disabled={!podeMenos}
        style={[estilos.contadorBotao, { width: tamanho, height: tamanho }, !podeMenos && { opacity: 0.3 }]}
      >
        <Minus size={18} color={CORES.texto} strokeWidth={2} />
      </Pressable>
      <Text style={[estilos.contadorValor, compacto && { fontSize: 16, minWidth: 24 }]}>{valor}</Text>
      <Pressable
        accessibilityLabel="Aumentar"
        onPress={() => onChange(valor + 1)}
        disabled={!podeMais}
        style={[
          estilos.contadorBotao,
          { width: tamanho, height: tamanho, backgroundColor: CORES.tinta, borderColor: CORES.tinta },
          !podeMais && { opacity: 0.3 },
        ]}
      >
        <Plus size={18} color="#FFFFFF" strokeWidth={2} />
      </Pressable>
    </View>
  );
}

/** Ícone de categoria dentro de um quadrado suave. */
export function IconeQuadrado({ icone: Icone, tamanho = 44 }: { icone: LucideIcon; tamanho?: number }) {
  return (
    <View style={[estilos.iconeQuadrado, { width: tamanho, height: tamanho }]}>
      <Icone size={tamanho * 0.48} color={CORES.texto} strokeWidth={1.6} />
    </View>
  );
}

export function LinhaValor({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <View style={estilos.linhaValor}>
      <Text style={[TEXTO.legenda, { fontSize: 15 }, destaque && { color: CORES.texto, fontFamily: FONTE.semi }]}>
        {rotulo}
      </Text>
      <Text style={[TEXTO.valor, { fontSize: 15 }, destaque && { fontSize: 20, fontFamily: FONTE.negrito }]}>
        {valor}
      </Text>
    </View>
  );
}

export function Aviso({ texto }: { texto: string }) {
  return (
    <View style={estilos.aviso}>
      <Text style={{ color: CORES.despesa, fontFamily: FONTE.media, fontSize: 15 }}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: CORES.superficie,
    borderRadius: RAIO.grande,
    padding: 18,
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CORES.borda,
  },
  secao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  divisor: { height: StyleSheet.hairlineWidth, backgroundColor: CORES.borda },
  botao: {
    minHeight: 56,
    borderRadius: RAIO.medio,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  botaoContorno: { backgroundColor: CORES.superficie, borderWidth: 1, borderColor: CORES.borda },
  botaoTexto: { fontFamily: FONTE.semi, fontSize: 16 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CORES.borda,
    backgroundColor: CORES.superficie,
  },
  chipAtivo: { backgroundColor: CORES.tinta, borderColor: CORES.tinta },
  chipTexto: { fontFamily: FONTE.media, fontSize: 14, color: CORES.texto },
  segmentado: { flexDirection: 'row', backgroundColor: CORES.superficieSuave, borderRadius: RAIO.medio, padding: 4 },
  segmento: { flex: 1, paddingVertical: 11, borderRadius: RAIO.pequeno, alignItems: 'center' },
  segmentoAtivo: {
    backgroundColor: CORES.superficie,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentoTexto: { fontFamily: FONTE.media, fontSize: 15, color: CORES.textoSuave },
  rotulo: { fontFamily: FONTE.media, fontSize: 14, color: CORES.textoSuave },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: CORES.superficie,
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
    borderColor: CORES.borda,
    backgroundColor: CORES.superficie,
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
    backgroundColor: CORES.superficieSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linhaValor: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aviso: {
    borderRadius: RAIO.medio,
    padding: 14,
    backgroundColor: CORES.despesaFundo,
  },
});
