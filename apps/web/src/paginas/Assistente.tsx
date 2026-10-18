import {
  FERRAMENTAS,
  GravadorNavegador,
  MODELO_PADRAO,
  NOME_DO_ASSISTENTE,
  SUGESTOES,
  arquivoParaAudio,
  blocosDeTexto,
  descreverPasso,
  erroDeMicrofone,
  formatarDuracao,
  microfoneDisponivel,
  useAssistente,
} from '@adegas/ia';
import type { MensagemAssistente, PassoAgente } from '@adegas/ia';
import {
  ArrowUp,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Mic,
  Paperclip,
  PencilLine,
  Plug,
  RotateCcw,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react';
import type { ChangeEvent } from 'react';
import type { FormEvent, KeyboardEvent, ReactNode } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { surgir } from '../animacoes';
import { IconeQuadrado } from '../componentes/IconeQuadrado';
import { useConfigAssistente } from '../configAssistente';

/** Depois que o assistente muda algo, um atalho para conferir na tela certa. */
const ONDE_VER: Record<string, { para: string; rotulo: string }> = {
  registrar_entrada: { para: '/estoque', rotulo: 'Ver estoque' },
  ajustar_estoque: { para: '/estoque', rotulo: 'Ver estoque' },
  editar_produto: { para: '/estoque', rotulo: 'Ver estoque' },
  registrar_venda: { para: '/financeiro', rotulo: 'Ver financeiro' },
  registrar_lancamento: { para: '/financeiro', rotulo: 'Ver financeiro' },
  excluir_lancamento: { para: '/financeiro', rotulo: 'Ver financeiro' },
  abrir_mesa: { para: '/mesas', rotulo: 'Ver mesas' },
  lancar_na_mesa: { para: '/mesas', rotulo: 'Ver mesas' },
  remover_da_mesa: { para: '/mesas', rotulo: 'Ver mesas' },
  fechar_mesa: { para: '/mesas', rotulo: 'Ver mesas' },
  cancelar_mesa: { para: '/mesas', rotulo: 'Ver mesas' },
  criar_lembrete: { para: '/', rotulo: 'Ver lembretes' },
  concluir_lembrete: { para: '/', rotulo: 'Ver lembretes' },
  excluir_lembrete: { para: '/', rotulo: 'Ver lembretes' },
};

/** Prévias que rodam numa página sem acesso à internet avisam isso (ver docs/ASSISTENTE.md). */
const SEM_INTERNET = Boolean((globalThis as { ADEGAS_PREVIA_SEM_INTERNET?: boolean }).ADEGAS_PREVIA_SEM_INTERNET);

const CAPACIDADES = [
  'Entende áudio: grave sua voz ou mande o áudio do WhatsApp',
  'Consulta o estoque de qualquer produto',
  'Registra entrada de mercadoria e vendas',
  'Lança pedidos nas mesas e fecha a conta',
  'Lança despesas e ajusta o estoque',
  'Busca o financeiro e os relatórios de qualquer período',
  'Cria e conclui lembretes',
];

export function Assistente() {
  const [config, salvarConfig] = useConfigAssistente();
  const { mensagens, enviando, enviar, enviarAudio, novaConversa, modeloEmUso } = useAssistente(config);
  const [configurando, setConfigurando] = useState(!config.chave);
  const [texto, setTexto] = useState('');
  const conversa = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const audio = useAudio(enviarAudio);

  // Rola até a mensagem nova (e acompanha os passos enquanto o assistente trabalha).
  useEffect(() => {
    const el = conversa.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [mensagens]);

  // O campo cresce com o texto, até umas 5 linhas.
  useLayoutEffect(() => {
    const el = campo.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [texto]);

  const mandar = (mensagem: string) => {
    if (!mensagem.trim() || enviando) return;
    void enviar(mensagem);
    setTexto('');
    campo.current?.focus();
  };

  const aoEnviar = (e: FormEvent) => {
    e.preventDefault();
    mandar(texto);
  };

  const aoTeclar = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      mandar(texto);
    }
  };

  return (
    <div className="pagina assistente-pagina">
      <header className="cabecalho">
        <div>
          <p className="sobretitulo">Assistente com inteligência artificial</p>
          <h1>{NOME_DO_ASSISTENTE}</h1>
        </div>
        <div className="acoes">
          {mensagens.length > 0 && (
            <button type="button" className="botao contorno" onClick={novaConversa}>
              <RotateCcw size={17} strokeWidth={1.75} /> Nova conversa
            </button>
          )}
          <button type="button" className="botao contorno" onClick={() => setConfigurando((v) => !v)} aria-expanded={configurando}>
            <Settings2 size={17} strokeWidth={1.75} /> Configurar
          </button>
        </div>
      </header>

      {configurando && (
        <Configuracao
          inicial={config}
          aoSalvar={(nova) => {
            salvarConfig(nova);
            if (nova.chave.trim()) setConfigurando(false);
          }}
          aoFechar={config.chave ? () => setConfigurando(false) : undefined}
        />
      )}

      {SEM_INTERNET && (
        <p className="aviso-previa" role="note">
          <CircleAlert size={17} strokeWidth={2} />
          <span>
            Esta prévia não pode acessar a internet, então o {NOME_DO_ASSISTENTE} não alcança o Gemini aqui. Para conversar com ele, abra a
            prévia do GitHub Pages ou rode o projeto no computador.
          </span>
        </p>
      )}

      <div className="assistente-grade">
        <section className="cartao chat" data-entrada>
          <div className="chat-conversa" ref={conversa} aria-live="polite">
            {mensagens.length === 0 ? (
              <div className="chat-vazio">
                <IconeQuadrado icone={Sparkles} tamanho={52} />
                <h2>Pergunte ao {NOME_DO_ASSISTENTE}</h2>
                <p className="suave">
                  Ele consulta e registra no estoque, no financeiro e nos relatórios, e cria lembretes. Escreva do seu jeito ou mande um
                  áudio.
                </p>
                <div className="chips sugestoes">
                  {SUGESTOES.map((s) => (
                    <button key={s} type="button" className="chip" onClick={() => mandar(s)} disabled={enviando}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              mensagens.map((m) => <Mensagem key={m.id} mensagem={m} aoConfigurar={() => setConfigurando(true)} />)
            )}
          </div>

          {audio.aviso && (
            <p className="chat-aviso" role="alert">
              <CircleAlert size={16} strokeWidth={2} /> {audio.aviso}
            </p>
          )}
          <form className={`chat-entrada ${audio.gravando ? 'gravando' : ''}`} onSubmit={aoEnviar}>
            {audio.gravando ? (
              <div className="gravacao" role="status" aria-label={`Gravando áudio, ${formatarDuracao(audio.segundos)}`}>
                <button type="button" className="botao contorno quadrado" onClick={audio.cancelar} aria-label="Cancelar gravação" title="Cancelar">
                  <X size={18} strokeWidth={2} />
                </button>
                <span className="gravacao-ponto" aria-hidden />
                <strong className="num">{formatarDuracao(audio.segundos)}</strong>
                <span className="suave gravacao-dica">Fale o pedido e toque em enviar</span>
              </div>
            ) : (
              <>
                <label
                  className={`botao contorno quadrado ${enviando || audio.preparando ? 'desligado' : ''}`}
                  title="Mandar arquivo de áudio (ex.: áudio do WhatsApp)"
                >
                  <Paperclip size={18} strokeWidth={1.9} />
                  <input
                    type="file"
                    accept="audio/*,.opus,.ogg,.m4a,.mp3,.wav,.aac,.flac"
                    className="so-leitor"
                    disabled={enviando || audio.preparando}
                    onChange={audio.aoEscolherArquivo}
                    aria-label="Mandar arquivo de áudio"
                  />
                </label>
                <textarea
                  ref={campo}
                  className="campo"
                  rows={1}
                  placeholder="Ex.: chegaram 3 fardos de Skol por R$ 33 cada"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={aoTeclar}
                  aria-label={`Mensagem para o ${NOME_DO_ASSISTENTE}`}
                />
              </>
            )}
            {audio.gravando ? (
              <button type="button" className="botao enviar" onClick={audio.enviarGravacao} aria-label="Enviar áudio">
                <ArrowUp size={19} strokeWidth={2.2} />
              </button>
            ) : enviando || audio.preparando ? (
              <button type="button" className="botao enviar" disabled aria-label="Aguarde">
                <LoaderCircle size={19} className="girando" />
              </button>
            ) : texto.trim() || !audio.microfone ? (
              <button type="submit" className="botao enviar" disabled={!texto.trim()} aria-label="Enviar">
                <ArrowUp size={19} strokeWidth={2.2} />
              </button>
            ) : (
              <button type="button" className="botao enviar" onClick={audio.iniciar} aria-label="Gravar áudio" title="Gravar áudio">
                <Mic size={19} strokeWidth={2.1} />
              </button>
            )}
          </form>
        </section>

        <aside className="cartao assistente-info" data-entrada>
          <h2>O que ele faz</h2>
          <ul className="lista-check">
            {CAPACIDADES.map((c) => (
              <li key={c}>
                <Check size={16} strokeWidth={2.2} /> {c}
              </li>
            ))}
          </ul>
          <div className="assistente-tecnico">
            <span>
              <Plug size={15} strokeWidth={1.8} /> {FERRAMENTAS.length} ferramentas via MCP
            </span>
            <span>
              <Sparkles size={15} strokeWidth={1.8} /> {modeloEmUso ?? (config.modelo || MODELO_PADRAO)}
            </span>
          </div>
          <p className="suave pequeno">
            O que ele registra entra na hora no estoque, no financeiro e nos relatórios. Confira sempre a resposta antes de seguir.
          </p>
        </aside>
      </div>
    </div>
  );
}

/** Gravar o microfone e mandar arquivos de áudio para o Pop AI. */
function useAudio(enviarAudio: ReturnType<typeof useAssistente>['enviarAudio']) {
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [preparando, setPreparando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const gravador = useRef<GravadorNavegador | null>(null);
  const [microfone] = useState(microfoneDisponivel);

  async function enviarGravacao() {
    const g = gravador.current;
    if (!g?.gravando) return;
    setGravando(false);
    setPreparando(true);
    try {
      const audio = await g.parar();
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
  const enviarAoLimite = useRef(enviarGravacao);
  useEffect(() => {
    enviarAoLimite.current = enviarGravacao;
  });

  // Relógio da gravação; ao sair da tela, a gravação é descartada.
  useEffect(() => {
    if (!gravando) return;
    const relogio = setInterval(() => setSegundos(gravador.current?.segundos ?? 0), 250);
    return () => clearInterval(relogio);
  }, [gravando]);
  useEffect(() => () => gravador.current?.cancelar(), []);

  async function iniciar() {
    setAviso(null);
    gravador.current ??= new GravadorNavegador(() => void enviarAoLimite.current());
    try {
      await gravador.current.iniciar();
      setSegundos(0);
      setGravando(true);
    } catch (erro) {
      setAviso(erroDeMicrofone(erro));
    }
  }

  function cancelar() {
    gravador.current?.cancelar();
    setGravando(false);
  }

  async function aoEscolherArquivo(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setAviso(null);
    setPreparando(true);
    try {
      void enviarAudio(await arquivoParaAudio(arquivo));
    } catch (erro) {
      setAviso(erro instanceof Error ? erro.message : 'Não consegui abrir esse áudio.');
    } finally {
      setPreparando(false);
    }
  }

  return {
    microfone,
    gravando,
    segundos,
    preparando,
    aviso,
    iniciar,
    cancelar,
    enviarGravacao,
    aoEscolherArquivo,
  };
}

function Mensagem({ mensagem, aoConfigurar }: { mensagem: MensagemAssistente; aoConfigurar: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current) surgir(ref.current);
  }, []);

  if (mensagem.autor === 'pessoa') {
    if (mensagem.audio) {
      const { duracao, nome } = mensagem.audio;
      return (
        <div ref={ref} className="msg pessoa com-audio">
          <span className="msg-audio">
            <Mic size={14} strokeWidth={2.1} />
            {nome ?? 'Áudio'}
            {duracao ? ` · ${formatarDuracao(duracao)}` : ''}
          </span>
          {mensagem.ouvindo ? (
            <p className="ouvindo">
              <LoaderCircle size={15} className="girando" /> Ouvindo o áudio…
            </p>
          ) : mensagem.texto ? (
            <p>“{mensagem.texto}”</p>
          ) : (
            <p className="suave">Sem fala</p>
          )}
        </div>
      );
    }
    return (
      <div ref={ref} className="msg pessoa">
        <p>{mensagem.texto}</p>
      </div>
    );
  }

  const passos = mensagem.passos ?? [];
  const atalhos = [...new Map(passos.filter((p) => p.alterouDados && ONDE_VER[p.ferramenta]).map((p) => [ONDE_VER[p.ferramenta].para, ONDE_VER[p.ferramenta]])).values()];

  return (
    <div ref={ref} className="msg assistente">
      <span className="msg-avatar" aria-hidden>
        <Sparkles size={16} strokeWidth={1.8} />
      </span>
      <div className="msg-corpo">
        {passos.length > 0 && (
          <ul className="passos" aria-label={`O que o ${NOME_DO_ASSISTENTE} fez`}>
            {passos.map((p) => (
              <Passo key={p.id} passo={p} />
            ))}
          </ul>
        )}
        {mensagem.pensando ? (
          <p className="pensando" aria-label="Pensando">
            <span />
            <span />
            <span />
          </p>
        ) : mensagem.erro ? (
          <div className="msg-erro">
            <CircleAlert size={17} strokeWidth={2} />
            <p>{mensagem.texto}</p>
            {/chave|Configurar/i.test(mensagem.texto) && (
              <button type="button" className="link" onClick={aoConfigurar}>
                Configurar
              </button>
            )}
          </div>
        ) : (
          <TextoFormatado texto={mensagem.texto} />
        )}
        {!mensagem.pensando && atalhos.length > 0 && (
          <div className="msg-atalhos">
            {atalhos.map((a) => (
              <Link key={a.para} to={a.para} className="link">
                {a.rotulo} →
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Passo({ passo }: { passo: PassoAgente }) {
  const icone =
    passo.situacao === 'rodando' ? (
      <LoaderCircle size={14} className="girando" />
    ) : passo.situacao === 'erro' ? (
      <X size={14} strokeWidth={2.4} />
    ) : passo.alterouDados ? (
      <PencilLine size={14} strokeWidth={2} />
    ) : (
      <Check size={14} strokeWidth={2.4} />
    );
  return (
    <li className={`passo-ia ${passo.situacao} ${passo.alterouDados ? 'alterou' : ''}`} title={passo.erro}>
      {icone}
      <span>{descreverPasso(passo)}</span>
    </li>
  );
}

function TextoFormatado({ texto }: { texto: string }) {
  const blocos = blocosDeTexto(texto);
  const itens: ReactNode[] = [];
  let lista: ReactNode[] = [];
  const fecharLista = () => {
    if (lista.length) itens.push(<ul key={`l${itens.length}`}>{lista}</ul>);
    lista = [];
  };
  blocos.forEach((b, i) => {
    const conteudo = b.trechos.map((t, j) => (t.negrito ? <strong key={j}>{t.texto}</strong> : <span key={j}>{t.texto}</span>));
    if (b.tipo === 'item') {
      lista.push(<li key={i}>{conteudo}</li>);
    } else {
      fecharLista();
      itens.push(<p key={i}>{conteudo}</p>);
    }
  });
  fecharLista();
  return <div className="msg-texto">{itens}</div>;
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
  const [mostrar, setMostrar] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  useLayoutEffect(() => {
    if (ref.current) surgir(ref.current);
  }, []);

  return (
    <form
      ref={ref}
      className="cartao config-ia"
      onSubmit={(e) => {
        e.preventDefault();
        aoSalvar({ chave, modelo });
      }}
    >
      <div className="config-ia-topo">
        <IconeQuadrado icone={KeyRound} />
        <div>
          <h2>Chave do Gemini</h2>
          <p className="suave">
            O {NOME_DO_ASSISTENTE} usa a API do Gemini, do Google. Crie uma chave grátis em{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
              aistudio.google.com/apikey
            </a>{' '}
            e cole aqui. Ela fica salva só neste navegador.
          </p>
        </div>
        {aoFechar && (
          <button type="button" className="link fechar" onClick={aoFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        )}
      </div>
      <div className="config-ia-campos">
        <label className="rotulo">
          Chave da API
          <span className="campo-senha">
            <input
              className="campo"
              type={mostrar ? 'text' : 'password'}
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              placeholder="Cole a chave aqui (começa com AIza…)"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" className="link" onClick={() => setMostrar((v) => !v)} aria-label={mostrar ? 'Esconder chave' : 'Mostrar chave'}>
              {mostrar ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>
        <label className="rotulo">
          Modelo (opcional)
          <input className="campo" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder={MODELO_PADRAO} spellCheck={false} />
        </label>
      </div>
      <div className="acoes">
        <button type="submit" className="botao">
          Salvar
        </button>
        {inicial.chave && (
          <button type="button" className="botao contorno" onClick={() => aoSalvar({ chave: '', modelo: '' })}>
            Remover chave
          </button>
        )}
      </div>
    </form>
  );
}
