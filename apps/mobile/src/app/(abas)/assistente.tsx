import { NOME_DO_ASSISTENTE, SUGESTOES, blocosDeTexto, descreverPasso, formatarDuracao, useAssistente } from '@adegas/ia';
import type { MensagemAssistente, PassoAgente } from '@adegas/ia';
import { router } from 'expo-router';
import {
  ArrowUp,
  Check,
  CircleAlert,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  Mic,
  Paperclip,
  PencilLine,
  RotateCcw,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Entrar, Tocavel, useMovimentoReduzido } from '../../components/animacoes';
import { Botao, Cartao, IconeQuadrado, TituloAba } from '../../components/ui';
import { useConfigAssistente } from '../../configAssistente';
import { escolherArquivoDeAudio, useGravador } from '../../gravador';
import { CORES, FONTE, RAIO, TEXTO } from '../../tema';

const NATIVO = Platform.OS !== 'web';
/** Prévias que rodam numa página sem acesso à internet avisam isso (ver docs/ASSISTENTE.md). */
const SEM_INTERNET = Boolean((globalThis as { ADEGAS_PREVIA_SEM_INTERNET?: boolean }).ADEGAS_PREVIA_SEM_INTERNET);

/** Depois que o assistente muda algo, um atalho para conferir na aba certa. */
const ONDE_VER: Record<string, { rota: '/estoque' | '/financeiro' | '/' | '/mesas'; rotulo: string }> = {
  registrar_entrada: { rota: '/estoque', rotulo: 'Ver estoque' },
  ajustar_estoque: { rota: '/estoque', rotulo: 'Ver estoque' },
  editar_produto: { rota: '/estoque', rotulo: 'Ver estoque' },
  registrar_venda: { rota: '/financeiro', rotulo: 'Ver financeiro' },
  registrar_lancamento: { rota: '/financeiro', rotulo: 'Ver financeiro' },
  excluir_lancamento: { rota: '/financeiro', rotulo: 'Ver financeiro' },
  abrir_mesa: { rota: '/mesas', rotulo: 'Ver mesas' },
  lancar_na_mesa: { rota: '/mesas', rotulo: 'Ver mesas' },
  remover_da_mesa: { rota: '/mesas', rotulo: 'Ver mesas' },
  fechar_mesa: { rota: '/mesas', rotulo: 'Ver mesas' },
  cancelar_mesa: { rota: '/mesas', rotulo: 'Ver mesas' },
  criar_lembrete: { rota: '/', rotulo: 'Ver lembretes' },
  concluir_lembrete: { rota: '/', rotulo: 'Ver lembretes' },
  excluir_lembrete: { rota: '/', rotulo: 'Ver lembretes' },
};

export default function Assistente() {
  const insets = useSafeAreaInsets();
  const { config, salvar, carregado } = useConfigAssistente();
  const { mensagens, enviando, enviar, enviarAudio, novaConversa } = useAssistente(config);
  const [configurando, setConfigurando] = useState(false);
  const [texto, setTexto] = useState('');
  const [preparando, setPreparando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const gravador = useGravador(() => void enviarGravacao());
  const lista = useRef<ScrollView>(null);
  const semChave = carregado && !config.chave;
  const mostrarConfig = configurando || semChave;

  const mandar = (mensagem: string) => {
    if (!mensagem.trim() || enviando) return;
    void enviar(mensagem);
    setTexto('');
  };

  async function iniciarGravacao() {
    setAviso(null);
    const erro = await gravador.iniciar();
    if (erro) setAviso(erro);
  }

  async function enviarGravacao() {
    if (!gravador.gravando) return;
    setPreparando(true);
    try {
      const audio = await gravador.parar();
      if (!audio || (audio.duracao !== undefined && audio.duracao < 0.6)) {
        setAviso('Áudio curto demais. Toque no microfone, fale e depois toque em enviar.');
        return;
      }
      void enviarAudio(audio);
    } catch {
      setAviso('Não consegui preparar o áudio. Tente de novo.');
    } finally {
      setPreparando(false);
    }
  }

  async function mandarArquivo() {
    setAviso(null);
    try {
      setPreparando(true);
      const audio = await escolherArquivoDeAudio();
      if (audio) void enviarAudio(audio);
    } catch (erro) {
      setAviso(erro instanceof Error ? erro.message : 'Não consegui abrir esse áudio.');
    } finally {
      setPreparando(false);
    }
  }

  const ocupado = enviando || preparando;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={lista}
        style={{ flex: 1 }}
        contentContainerStyle={estilos.tela}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          // Acompanha a conversa; sem mensagens, a tela fica no topo (configuração e sugestões).
          if (mensagens.length > 0) lista.current?.scrollToEnd({ animated: true });
        }}
      >
        <View style={estilos.topo}>
          <TituloAba sobretitulo="Assistente com IA" titulo={NOME_DO_ASSISTENTE} topo={insets.top} />
          <View style={estilos.topoAcoes}>
            {mensagens.length > 0 && (
              <Tocavel accessibilityRole="button" accessibilityLabel="Nova conversa" onPress={novaConversa} style={estilos.iconeBotao}>
                <RotateCcw size={19} color={CORES.texto} strokeWidth={1.8} />
              </Tocavel>
            )}
            <Tocavel
              accessibilityRole="button"
              accessibilityLabel="Configurar"
              onPress={() => setConfigurando((v) => !v)}
              style={[estilos.iconeBotao, mostrarConfig && { borderColor: CORES.primariaClara }]}
            >
              <Settings2 size={19} color={CORES.texto} strokeWidth={1.8} />
            </Tocavel>
          </View>
        </View>

        {SEM_INTERNET && (
          <View style={estilos.avisoPrevia}>
            <CircleAlert size={18} color={CORES.alerta} strokeWidth={2} />
            <Text style={[TEXTO.legenda, { flex: 1, color: CORES.texto }]}>
              Esta prévia não pode acessar a internet, então o {NOME_DO_ASSISTENTE} não alcança o Gemini aqui. Para conversar com ele, use a
              prévia do GitHub Pages ou o app no celular.
            </Text>
          </View>
        )}

        {mostrarConfig && (
          <Configuracao
            inicial={config}
            aoSalvar={(nova) => {
              salvar(nova);
              if (nova.chave.trim()) setConfigurando(false);
            }}
            aoFechar={config.chave ? () => setConfigurando(false) : undefined}
          />
        )}

        {mensagens.length === 0 ? (
          <Entrar atraso={80} style={estilos.vazio}>
            <IconeQuadrado icone={Sparkles} tamanho={52} />
            <Text style={[TEXTO.titulo, { textAlign: 'center' }]}>Pergunte ao {NOME_DO_ASSISTENTE}</Text>
            <Text style={[TEXTO.legenda, { textAlign: 'center' }]}>
              Ele consulta e registra no estoque, no financeiro e nos relatórios, e cria lembretes. Escreva do seu jeito ou toque no
              microfone e fale.
            </Text>
            <View style={estilos.sugestoes}>
              {SUGESTOES.map((s) => (
                <Tocavel
                  key={s}
                  accessibilityRole="button"
                  escala={0.97}
                  onPress={() => mandar(s)}
                  disabled={enviando}
                  style={estilos.sugestao}
                >
                  <Text style={estilos.sugestaoTexto}>{s}</Text>
                </Tocavel>
              ))}
            </View>
          </Entrar>
        ) : (
          mensagens.map((m) => <Mensagem key={m.id} mensagem={m} aoConfigurar={() => setConfigurando(true)} />)
        )}
      </ScrollView>

      {aviso && (
        <View style={estilos.avisoAudio}>
          <CircleAlert size={16} color={CORES.alerta} strokeWidth={2} />
          <Text style={[TEXTO.legenda, { flex: 1, color: CORES.texto }]}>{aviso}</Text>
          <Tocavel accessibilityLabel="Fechar aviso" onPress={() => setAviso(null)} style={{ padding: 2 }}>
            <X size={16} color={CORES.textoSuave} />
          </Tocavel>
        </View>
      )}
      <View style={[estilos.entrada, gravador.gravando && estilos.entradaGravando]}>
        {gravador.gravando ? (
          <>
            <Tocavel
              accessibilityRole="button"
              accessibilityLabel="Cancelar gravação"
              onPress={gravador.cancelar}
              escala={0.9}
              style={estilos.botaoQuadrado}
            >
              <X size={20} color={CORES.texto} strokeWidth={2} />
            </Tocavel>
            <View style={estilos.gravacao} accessibilityLabel={`Gravando áudio, ${formatarDuracao(gravador.segundos)}`}>
              <PontoGravando />
              <Text style={estilos.gravacaoTempo}>{formatarDuracao(gravador.segundos)}</Text>
              <Text style={[TEXTO.legenda, { flex: 1 }]} numberOfLines={1}>
                Fale o pedido
              </Text>
            </View>
            <Tocavel
              accessibilityRole="button"
              accessibilityLabel="Enviar áudio"
              onPress={() => void enviarGravacao()}
              escala={0.9}
              style={estilos.enviar}
            >
              <ArrowUp size={20} color={CORES.sobrePrimaria} strokeWidth={2.4} />
            </Tocavel>
          </>
        ) : (
          <>
            <Tocavel
              accessibilityRole="button"
              accessibilityLabel="Mandar arquivo de áudio"
              onPress={() => void mandarArquivo()}
              disabled={ocupado}
              escala={0.9}
              style={[estilos.botaoQuadrado, ocupado && { opacity: 0.4 }]}
            >
              <Paperclip size={19} color={CORES.texto} strokeWidth={1.9} />
            </Tocavel>
            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder="Ex.: chegaram 3 fardos de Skol"
              placeholderTextColor={CORES.textoFraco}
              keyboardAppearance="dark"
              selectionColor={CORES.primariaClara}
              multiline
              style={estilos.entradaCampo}
              accessibilityLabel={`Mensagem para o ${NOME_DO_ASSISTENTE}`}
              onSubmitEditing={() => mandar(texto)}
              submitBehavior="submit"
              returnKeyType="send"
              onKeyPress={(e) => {
                // Na versão web, Enter envia e Shift+Enter quebra a linha (no celular, a tecla "enviar" do teclado).
                const tecla = e.nativeEvent as { key: string; shiftKey?: boolean };
                if (Platform.OS === 'web' && tecla.key === 'Enter' && !tecla.shiftKey) {
                  e.preventDefault();
                  mandar(texto);
                }
              }}
            />
            {ocupado ? (
              <View style={[estilos.enviar, { opacity: 0.4 }]} accessibilityLabel="Aguarde">
                <Girando />
              </View>
            ) : texto.trim() || !gravador.disponivel ? (
              <Tocavel
                accessibilityRole="button"
                accessibilityLabel="Enviar"
                onPress={() => mandar(texto)}
                disabled={!texto.trim()}
                escala={0.9}
                style={[estilos.enviar, !texto.trim() && { opacity: 0.4 }]}
              >
                <ArrowUp size={20} color={CORES.sobrePrimaria} strokeWidth={2.4} />
              </Tocavel>
            ) : (
              <Tocavel
                accessibilityRole="button"
                accessibilityLabel="Gravar áudio"
                onPress={() => void iniciarGravacao()}
                escala={0.9}
                style={estilos.enviar}
              >
                <Mic size={20} color={CORES.sobrePrimaria} strokeWidth={2.2} />
              </Tocavel>
            )}
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function Mensagem({ mensagem, aoConfigurar }: { mensagem: MensagemAssistente; aoConfigurar: () => void }) {
  if (mensagem.autor === 'pessoa' && mensagem.audio) {
    const { duracao, nome } = mensagem.audio;
    return (
      <Entrar style={[estilos.balaoPessoa, { gap: 4 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Mic size={13} color={CORES.primariaClara} strokeWidth={2.2} />
          <Text style={estilos.audioRotulo} numberOfLines={1}>
            {nome ?? 'Áudio'}
            {duracao ? ` · ${formatarDuracao(duracao)}` : ''}
          </Text>
        </View>
        {mensagem.ouvindo ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Girando cor={CORES.textoSuave} tamanho={14} />
            <Text style={TEXTO.legenda}>Ouvindo o áudio…</Text>
          </View>
        ) : (
          <Text style={[TEXTO.corpo, { fontSize: 15 }, !mensagem.texto && { color: CORES.textoSuave }]}>
            {mensagem.texto ? `“${mensagem.texto}”` : 'Sem fala'}
          </Text>
        )}
      </Entrar>
    );
  }
  if (mensagem.autor === 'pessoa') {
    return (
      <Entrar style={estilos.balaoPessoa}>
        <Text style={[TEXTO.corpo, { fontSize: 15 }]}>{mensagem.texto}</Text>
      </Entrar>
    );
  }
  const passos = mensagem.passos ?? [];
  const atalhos = [
    ...new Map(
      passos.filter((p) => p.alterouDados && ONDE_VER[p.ferramenta]).map((p) => [ONDE_VER[p.ferramenta].rota, ONDE_VER[p.ferramenta]]),
    ).values(),
  ];
  return (
    <Entrar style={estilos.respostaAssistente}>
      {passos.length > 0 && (
        <View style={estilos.passos}>
          {passos.map((p) => (
            <Passo key={p.id} passo={p} />
          ))}
        </View>
      )}
      {mensagem.pensando ? (
        <Pensando />
      ) : mensagem.erro ? (
        <View style={estilos.erro}>
          <CircleAlert size={18} color={CORES.despesa} strokeWidth={2} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[TEXTO.corpo, { fontSize: 15 }]}>{mensagem.texto}</Text>
            {/chave|Configurar/i.test(mensagem.texto) && (
              <Text style={estilos.link} onPress={aoConfigurar}>
                Configurar
              </Text>
            )}
          </View>
        </View>
      ) : (
        <TextoFormatado texto={mensagem.texto} />
      )}
      {!mensagem.pensando && atalhos.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 18 }}>
          {atalhos.map((a) => (
            <Text key={a.rota} style={estilos.link} onPress={() => (a.rota === '/mesas' ? router.push(a.rota) : router.navigate(a.rota))}>
              {a.rotulo} →
            </Text>
          ))}
        </View>
      )}
    </Entrar>
  );
}

function Passo({ passo }: { passo: PassoAgente }) {
  const alterou = passo.alterouDados;
  const erro = passo.situacao === 'erro';
  const cor = erro ? CORES.despesa : alterou ? CORES.receita : CORES.primariaClara;
  return (
    <View
      style={[
        estilos.passo,
        alterou && { backgroundColor: CORES.receitaFundo, borderColor: '#1F5A45' },
        erro && { backgroundColor: CORES.despesaFundo, borderColor: '#5A2A2E' },
      ]}
    >
      {passo.situacao === 'rodando' ? (
        <Girando cor={CORES.textoSuave} tamanho={13} />
      ) : erro ? (
        <X size={13} color={cor} strokeWidth={2.6} />
      ) : alterou ? (
        <PencilLine size={13} color={cor} strokeWidth={2.2} />
      ) : (
        <Check size={13} color={cor} strokeWidth={2.6} />
      )}
      <Text style={[estilos.passoTexto, alterou && { color: CORES.texto }]} numberOfLines={1}>
        {descreverPasso(passo)}
      </Text>
    </View>
  );
}

function TextoFormatado({ texto }: { texto: string }) {
  return (
    <View style={{ gap: 6 }}>
      {blocosDeTexto(texto).map((b, i) => {
        const conteudo = b.trechos.map((t, j) => (
          <Text key={j} style={t.negrito ? { fontFamily: FONTE.semi } : undefined}>
            {t.texto}
          </Text>
        ));
        return b.tipo === 'item' ? (
          <View key={i} style={{ flexDirection: 'row', gap: 8, paddingLeft: 4 }}>
            <Text style={[TEXTO.corpo, { color: CORES.primariaClara, fontSize: 15 }]}>•</Text>
            <Text style={[TEXTO.corpo, { flex: 1, fontSize: 15, lineHeight: 22 }]}>{conteudo}</Text>
          </View>
        ) : (
          <Text key={i} style={[TEXTO.corpo, { fontSize: 15, lineHeight: 22 }]}>
            {conteudo}
          </Text>
        );
      })}
    </View>
  );
}

/** Bolinha vermelha piscando enquanto grava. */
function PontoGravando() {
  const reduzido = useMovimentoReduzido();
  const valor = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduzido) return;
    const animacao = Animated.loop(
      Animated.sequence([
        Animated.timing(valor, { toValue: 0.3, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVO }),
        Animated.timing(valor, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVO }),
      ]),
    );
    animacao.start();
    return () => animacao.stop();
  }, [valor, reduzido]);
  return <Animated.View style={[estilos.pontoGravando, { opacity: valor }]} />;
}

/** Três pontinhos pulando enquanto o Gemini pensa. */
function Pensando() {
  const reduzido = useMovimentoReduzido();
  const valores = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;
  useEffect(() => {
    if (reduzido) return;
    const animacoes = valores.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(v, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: NATIVO }),
          Animated.timing(v, { toValue: 0.3, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: NATIVO }),
          Animated.delay((2 - i) * 150 + 200),
        ]),
      ),
    );
    animacoes.forEach((a) => a.start());
    return () => animacoes.forEach((a) => a.stop());
  }, [valores, reduzido]);
  return (
    <View style={estilos.pensando} accessibilityLabel="Pensando">
      {valores.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            estilos.ponto,
            { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0.3, 1], outputRange: [0, -4] }) }] },
          ]}
        />
      ))}
    </View>
  );
}

function Girando({ cor = CORES.sobrePrimaria, tamanho = 20 }: { cor?: string; tamanho?: number }) {
  const giro = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animacao = Animated.loop(Animated.timing(giro, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: NATIVO }));
    animacao.start();
    return () => animacao.stop();
  }, [giro]);
  return (
    <Animated.View style={{ transform: [{ rotate: giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
      <LoaderCircle size={tamanho} color={cor} strokeWidth={2.2} />
    </Animated.View>
  );
}

function Configuracao({
  inicial,
  aoSalvar,
  aoFechar,
}: {
  inicial: { chave: string; modelo: string };
  aoSalvar: (config: { chave: string; modelo: string }) => void;
  aoFechar?: () => void;
}) {
  const [chave, setChave] = useState(inicial.chave);
  const [modelo, setModelo] = useState(inicial.modelo);
  return (
    <Entrar>
      <Cartao style={{ borderColor: CORES.destaqueBorda, gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <IconeQuadrado icone={KeyRound} tamanho={40} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={TEXTO.titulo}>Chave do Gemini</Text>
            <Text style={TEXTO.legenda}>
              O {NOME_DO_ASSISTENTE} usa a API do Gemini, do Google. Crie uma chave grátis e cole aqui. Ela fica guardada só neste aparelho.
            </Text>
          </View>
          {aoFechar && (
            <Tocavel accessibilityLabel="Fechar" onPress={aoFechar} style={{ padding: 4 }}>
              <X size={20} color={CORES.textoSuave} />
            </Tocavel>
          )}
        </View>
        <Tocavel accessibilityRole="link" onPress={() => Linking.openURL('https://aistudio.google.com/apikey')} style={estilos.linkLinha}>
          <ExternalLink size={16} color={CORES.primariaClara} strokeWidth={2} />
          <Text style={estilos.link}>Criar chave no Google AI Studio</Text>
        </Tocavel>
        <View style={{ gap: 8 }}>
          <Text style={estilos.rotulo}>Chave da API</Text>
          <TextInput
            value={chave}
            onChangeText={setChave}
            placeholder="Cole a chave aqui (começa com AIza…)"
            placeholderTextColor={CORES.textoFraco}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            keyboardAppearance="dark"
            selectionColor={CORES.primariaClara}
            style={estilos.campo}
            accessibilityLabel="Chave da API"
          />
        </View>
        <View style={{ gap: 8 }}>
          <Text style={estilos.rotulo}>Modelo (opcional)</Text>
          <TextInput
            value={modelo}
            onChangeText={setModelo}
            placeholder="gemini-3.8-flash"
            placeholderTextColor={CORES.textoFraco}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardAppearance="dark"
            selectionColor={CORES.primariaClara}
            style={estilos.campo}
          />
        </View>
        <Botao titulo="Salvar" onPress={() => aoSalvar({ chave, modelo })} desabilitado={!chave.trim()} />
        {inicial.chave ? <Botao titulo="Remover chave" variante="contorno" onPress={() => aoSalvar({ chave: '', modelo: '' })} /> : null}
      </Cartao>
    </Entrar>
  );
}

const estilos = StyleSheet.create({
  tela: { paddingHorizontal: 20, paddingBottom: 24, gap: 16, flexGrow: 1 },
  topo: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  topoAcoes: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  iconeBotao: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CORES.bordaForte,
    backgroundColor: CORES.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 20 },
  sugestoes: { alignSelf: 'stretch', gap: 8, marginTop: 10 },
  sugestao: {
    borderWidth: 1,
    borderColor: CORES.borda,
    backgroundColor: CORES.superficie,
    borderRadius: RAIO.medio,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  sugestaoTexto: { fontFamily: FONTE.media, fontSize: 15, color: CORES.texto },
  balaoPessoa: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    backgroundColor: CORES.primariaSuave,
    borderWidth: 1,
    borderColor: CORES.destaqueBorda,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  respostaAssistente: { gap: 10, paddingRight: 8 },
  passos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  passo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingVertical: 5,
    paddingLeft: 8,
    paddingRight: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CORES.borda,
    backgroundColor: CORES.superficieAlta,
  },
  passoTexto: { fontFamily: FONTE.regular, fontSize: 12.5, color: CORES.textoSuave, flexShrink: 1 },
  erro: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  link: { fontFamily: FONTE.semi, fontSize: 15, color: CORES.primariaClara },
  linkLinha: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  pensando: { flexDirection: 'row', gap: 5, paddingVertical: 8 },
  ponto: { width: 7, height: 7, borderRadius: 99, backgroundColor: CORES.primariaClara },
  entrada: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CORES.borda,
    backgroundColor: CORES.fundo,
  },
  entradaCampo: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: RAIO.medio,
    backgroundColor: CORES.superficieAlta,
    color: CORES.texto,
    fontFamily: FONTE.regular,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
  },
  entradaGravando: { backgroundColor: CORES.despesaFundo },
  botaoQuadrado: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CORES.bordaForte,
    backgroundColor: CORES.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gravacao: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  gravacaoTempo: { fontFamily: FONTE.semi, fontSize: 18, color: CORES.texto, fontVariant: ['tabular-nums'] },
  pontoGravando: { width: 12, height: 12, borderRadius: 99, backgroundColor: CORES.despesa },
  audioRotulo: { fontFamily: FONTE.semi, fontSize: 12, color: CORES.primariaClara, flexShrink: 1 },
  avisoAudio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: CORES.alertaFundo,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CORES.borda,
  },
  enviar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: CORES.primaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotulo: { fontFamily: FONTE.media, fontSize: 13, color: CORES.textoSuave },
  avisoPrevia: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: RAIO.medio,
    backgroundColor: CORES.alertaFundo,
    borderWidth: 1,
    borderColor: '#5C4716',
  },
  campo: {
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 12,
    backgroundColor: CORES.superficieAlta,
    color: CORES.texto,
    fontFamily: FONTE.regular,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
