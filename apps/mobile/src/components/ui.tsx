import { CORES } from '@adegas/core';
import type { ReactNode } from 'react';
import type { KeyboardTypeOptions, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export { CORES };

export function Cartao({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[estilos.cartao, style]}>{children}</View>;
}

export function TituloSecao({ children }: { children: ReactNode }) {
  return <Text style={estilos.tituloSecao}>{children}</Text>;
}

interface BotaoProps {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'contorno';
  desabilitado?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Botao({ titulo, onPress, variante = 'primario', desabilitado, style }: BotaoProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={desabilitado}
      style={({ pressed }) => [
        estilos.botao,
        variante === 'primario' && { backgroundColor: CORES.primaria },
        variante === 'secundario' && { backgroundColor: CORES.destaque },
        variante === 'contorno' && estilos.botaoContorno,
        desabilitado && { opacity: 0.4 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      <Text style={[estilos.botaoTexto, variante === 'contorno' && { color: CORES.primaria }]}>{titulo}</Text>
    </Pressable>
  );
}

export function Chip({
  rotulo,
  ativo,
  onPress,
  cor = CORES.primaria,
}: {
  rotulo: string;
  ativo: boolean;
  onPress: () => void;
  cor?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      onPress={onPress}
      style={[estilos.chip, ativo && { backgroundColor: cor, borderColor: cor }]}
    >
      <Text style={[estilos.chipTexto, ativo && { color: '#fff' }]}>{rotulo}</Text>
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
      {opcoes.map((o) => (
        <Pressable
          key={o.id}
          accessibilityRole="button"
          accessibilityState={{ selected: o.id === valor }}
          onPress={() => onChange(o.id)}
          style={[estilos.segmento, o.id === valor && estilos.segmentoAtivo]}
        >
          <Text style={[estilos.segmentoTexto, o.id === valor && { color: CORES.primaria }]}>{o.rotulo}</Text>
        </Pressable>
      ))}
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
}: {
  rotulo: string;
  value: string;
  onChangeText: (texto: string) => void;
  placeholder?: string;
  teclado?: KeyboardTypeOptions;
  prefixo?: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <View style={estilos.campo}>
        {prefixo ? <Text style={estilos.prefixo}>{prefixo}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A39A93"
          keyboardType={teclado}
          style={estilos.campoTexto}
        />
      </View>
    </View>
  );
}

/** Botões grandes de − e + para quantidade (mais fácil que digitar). */
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
  const tamanho = compacto ? 34 : 48;
  const podeMais = maximo === undefined || valor < maximo;
  return (
    <View style={estilos.contador}>
      <Pressable
        accessibilityLabel="Diminuir"
        onPress={() => onChange(Math.max(minimo, valor - 1))}
        disabled={valor <= minimo}
        style={[estilos.contadorBotao, { width: tamanho, height: tamanho }, valor <= minimo && { opacity: 0.35 }]}
      >
        <Text style={estilos.contadorSinal}>−</Text>
      </Pressable>
      <Text style={[estilos.contadorValor, compacto && { fontSize: 16, minWidth: 28 }]}>{valor}</Text>
      <Pressable
        accessibilityLabel="Aumentar"
        onPress={() => onChange(valor + 1)}
        disabled={!podeMais}
        style={[
          estilos.contadorBotao,
          { width: tamanho, height: tamanho, backgroundColor: CORES.primaria },
          !podeMais && { opacity: 0.35 },
        ]}
      >
        <Text style={[estilos.contadorSinal, { color: '#fff' }]}>+</Text>
      </Pressable>
    </View>
  );
}

export function LinhaValor({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <View style={estilos.linhaValor}>
      <Text style={[estilos.linhaRotulo, destaque && { color: CORES.texto, fontWeight: '700' }]}>{rotulo}</Text>
      <Text style={[estilos.linhaNumero, destaque && { fontSize: 18 }]}>{valor}</Text>
    </View>
  );
}

export function Aviso({ texto, tipo }: { texto: string; tipo: 'erro' | 'sucesso' }) {
  const cor = tipo === 'erro' ? CORES.despesa : CORES.receita;
  return (
    <View style={[estilos.aviso, { borderColor: cor, backgroundColor: tipo === 'erro' ? '#FDECEA' : '#E8F5EA' }]}>
      <Text style={{ color: cor, fontWeight: '600', fontSize: 15 }}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: CORES.superficie,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: CORES.borda,
  },
  tituloSecao: { fontSize: 17, fontWeight: '700', color: CORES.texto },
  botao: {
    minHeight: 54,
    borderRadius: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoContorno: { backgroundColor: 'transparent', borderWidth: 2, borderColor: CORES.primaria },
  botaoTexto: { color: '#fff', fontSize: 17, fontWeight: '700' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CORES.borda,
    backgroundColor: CORES.superficie,
  },
  chipTexto: { fontSize: 14, fontWeight: '600', color: CORES.texto },
  segmentado: { flexDirection: 'row', backgroundColor: '#EBE5DE', borderRadius: 12, padding: 4 },
  segmento: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  segmentoAtivo: { backgroundColor: CORES.superficie },
  segmentoTexto: { fontSize: 15, fontWeight: '600', color: CORES.textoSuave },
  rotulo: { fontSize: 14, fontWeight: '600', color: CORES.textoSuave },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CORES.superficie,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  prefixo: { fontSize: 17, color: CORES.textoSuave, marginRight: 6 },
  campoTexto: { flex: 1, fontSize: 17, paddingVertical: 13, color: CORES.texto, outlineWidth: 0 },
  contador: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contadorBotao: {
    borderRadius: 12,
    backgroundColor: '#EBE5DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorSinal: { fontSize: 24, fontWeight: '700', color: CORES.texto, lineHeight: 28 },
  contadorValor: { fontSize: 22, fontWeight: '700', minWidth: 40, textAlign: 'center', color: CORES.texto },
  linhaValor: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linhaRotulo: { fontSize: 15, color: CORES.textoSuave },
  linhaNumero: { fontSize: 15, fontWeight: '700', color: CORES.texto },
  aviso: { borderWidth: 1, borderRadius: 12, padding: 14 },
});
