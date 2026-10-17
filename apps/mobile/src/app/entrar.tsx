import type { Usuario } from '@adegas/core';
import { NOME_PAPEL, PINS_DE_EXEMPLO, TAMANHO_PIN, useAdega, usuariosAtivos } from '@adegas/core';
import { Beer, ChevronLeft, Delete } from 'lucide-react-native';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Animated, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Entrar, Tocavel } from '../components/animacoes';
import { Avatar } from '../components/pessoas';
import { CORES, FONTE, RAIO, TEXTO } from '../tema';

const NATIVO = Platform.OS !== 'web';
const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'apagar'];

/** Quem está usando? Escolhe a pessoa e digita o PIN de 4 números. */
export default function TelaEntrar() {
  const { estado, entrar } = useAdega();
  const insets = useSafeAreaInsets();
  const [escolhido, setEscolhido] = useState<Usuario | null>(null);
  const usuarios = usuariosAtivos(estado);
  const exemplo = estado.usuarios.some((u) => u.id === 'u-dono');

  return (
    <ScrollView contentContainerStyle={[estilos.tela, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
      <Entrar style={estilos.marca}>
        <View style={estilos.logo}>
          <Beer size={30} color={CORES.sobrePrimaria} strokeWidth={2} />
        </View>
        <Text style={TEXTO.tituloTela}>Minha Adega</Text>
        <Text style={TEXTO.legenda}>{escolhido ? `Olá, ${escolhido.nome}. Digite seu PIN.` : 'Quem está usando?'}</Text>
      </Entrar>

      {escolhido ? (
        <TecladoPin key={escolhido.id} usuario={escolhido} aoVoltar={() => setEscolhido(null)} aoDigitar={(pin) => entrar(escolhido.id, pin)} />
      ) : (
        <Entrar atraso={80} style={estilos.lista}>
          {usuarios.map((u) => (
            <Tocavel key={u.id} accessibilityRole="button" accessibilityLabel={`Entrar como ${u.nome}`} onPress={() => setEscolhido(u)} style={estilos.pessoa}>
              <Avatar nome={u.nome} admin={u.papel === 'admin'} />
              <View style={{ flex: 1 }}>
                <Text style={TEXTO.corpoForte}>{u.nome}</Text>
                <Text style={TEXTO.legenda}>{NOME_PAPEL[u.papel]}</Text>
              </View>
            </Tocavel>
          ))}
        </Entrar>
      )}

      {exemplo && (
        <Text style={estilos.dica}>
          Dados de exemplo · PINs: {PINS_DE_EXEMPLO.map((p) => `${p.nome} ${p.pin}`).join(' · ')}
        </Text>
      )}
    </ScrollView>
  );
}

function TecladoPin({
  usuario,
  aoVoltar,
  aoDigitar,
}: {
  usuario: Usuario;
  aoVoltar: () => void;
  aoDigitar: (pin: string) => { ok: boolean; erro?: string };
}) {
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const tremor = useRef(new Animated.Value(0)).current;
  const tentar = useEffectEvent((pin: string) => aoDigitar(pin));

  // PIN completo: tenta entrar. Errado: a fileira de bolinhas treme e limpa.
  useEffect(() => {
    if (pin.length < TAMANHO_PIN) return;
    const r = tentar(pin);
    if (r.ok) return;
    setErro(r.erro ?? 'PIN errado.');
    Animated.sequence(
      [10, -10, 8, -8, 4, 0].map((x) => Animated.timing(tremor, { toValue: x, duration: 50, useNativeDriver: NATIVO })),
    ).start(() => setPin(''));
  }, [pin, tremor]);

  function tecla(t: string) {
    setErro(null);
    if (t === 'apagar') setPin((p) => p.slice(0, -1));
    else if (t) setPin((p) => (p.length < TAMANHO_PIN ? p + t : p));
  }

  return (
    <Entrar style={{ gap: 26, alignItems: 'center' }}>
      <Avatar nome={usuario.nome} admin={usuario.papel === 'admin'} grande />
      <Animated.View style={[estilos.pontos, { transform: [{ translateX: tremor }] }]} accessibilityLabel={`${pin.length} de ${TAMANHO_PIN} números`}>
        {Array.from({ length: TAMANHO_PIN }, (_, i) => (
          <View key={i} style={[estilos.ponto, i < pin.length && estilos.pontoCheio, erro && { borderColor: CORES.despesa }]} />
        ))}
      </Animated.View>
      <Text style={[TEXTO.legenda, { color: erro ? CORES.despesa : CORES.textoSuave, minHeight: 20 }]}>{erro ?? ' '}</Text>
      <View style={estilos.teclado}>
        {TECLAS.map((t, i) =>
          t ? (
            <Tocavel
              key={i}
              accessibilityRole="button"
              accessibilityLabel={t === 'apagar' ? 'Apagar' : t}
              onPress={() => tecla(t)}
              escala={0.9}
              style={[estilos.tecla, t === 'apagar' && { backgroundColor: 'transparent', borderColor: 'transparent' }]}
            >
              {t === 'apagar' ? <Delete size={24} color={CORES.textoSuave} /> : <Text style={estilos.teclaTexto}>{t}</Text>}
            </Tocavel>
          ) : (
            <View key={i} style={[estilos.tecla, { opacity: 0 }]} />
          ),
        )}
      </View>
      <Tocavel accessibilityRole="button" onPress={aoVoltar} style={estilos.voltar}>
        <ChevronLeft size={18} color={CORES.primariaClara} />
        <Text style={estilos.voltarTexto}>Trocar usuário</Text>
      </Tocavel>
    </Entrar>
  );
}

const estilos = StyleSheet.create({
  tela: { flexGrow: 1, paddingHorizontal: 24, gap: 28, alignItems: 'stretch' },
  marca: { alignItems: 'center', gap: 8 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: CORES.primaria,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  lista: { gap: 10 },
  pessoa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: RAIO.grande,
    borderWidth: 1,
    borderColor: CORES.borda,
    backgroundColor: CORES.superficie,
  },
  pontos: { flexDirection: 'row', gap: 16 },
  ponto: { width: 16, height: 16, borderRadius: 999, borderWidth: 2, borderColor: CORES.bordaForte },
  pontoCheio: { backgroundColor: CORES.primaria, borderColor: CORES.primaria },
  teclado: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, maxWidth: 300 },
  tecla: {
    width: 76,
    height: 76,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CORES.borda,
    backgroundColor: CORES.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teclaTexto: { fontFamily: FONTE.semi, fontSize: 28, color: CORES.texto },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  voltarTexto: { fontFamily: FONTE.semi, fontSize: 15, color: CORES.primariaClara },
  dica: { fontFamily: FONTE.regular, fontSize: 13, color: CORES.textoFraco, textAlign: 'center', marginTop: 'auto' },
});
