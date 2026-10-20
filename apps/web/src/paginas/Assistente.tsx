import { useAdega } from '@adegas/core';
import {
  GravadorNavegador,
  MAXIMO_ANEXOS,
  NOME_DO_ASSISTENTE,
  NOME_DO_TIPO,
  SUGESTOES,
  blocosDeTexto,
  descreverPasso,
  erroDeMicrofone,
  formatarDuracao,
  microfoneDisponivel,
  prepararArquivos,
  useAssistente,
} from '@adegas/ia';
import type { AnexoNaConversa, AnexoParaEnviar, MensagemAssistente, PassoAgente, TipoAnexo } from '@adegas/ia';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUp,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  File as IconeArquivo,
  FileText,
  Film,
  Image,
  KeyRound,
  LoaderCircle,
  Mic,
  Paperclip,
  PencilLine,
  RotateCcw,
  Sheet,
  Sparkles,
  X,
} from 'lucide-react';
import type { ChangeEvent, ClipboardEvent, DragEvent, FormEvent, KeyboardEvent, ReactNode } from 'react';
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
  'Lê fotos, PDFs, planilhas e documentos: nota fiscal, boleto, lista de preços',
  'Entende áudio: grave sua voz ou mande o áudio do WhatsApp',
  'Consulta o estoque de qualquer produto',
  'Registra entrada de mercadoria e vendas',
  'Lança pedidos nas mesas e fecha a conta',
  'Lança despesas e ajusta o estoque',
  'Busca o financeiro e os relatórios de qualquer período',
  'Cria e conclui lembretes',
];

const ICONE_ANEXO: Record<TipoAnexo, LucideIcon> = {
  audio: Mic,
  imagem: Image,
  pdf: FileText,
  video: Film,
  texto: FileText,
  planilha: Sheet,
  documento: IconeArquivo,
};

export function Assistente() {
  const { config, chaveNoCodigo, chaveDeTeste, salvarChaveDeTeste } = useConfigAssistente();
  const { mensagens, enviando, enviar, enviarAudio, enviarComAnexos, novaConversa, configurado } = useAssistente(config);
  const { usuario } = useAdega();
  // Só para testes, enquanto a chave não vai para o código: o administrador cola uma chave aqui.
  const podeTestar = !chaveNoCodigo && usuario?.papel === 'admin';
  const [configurando, setConfigurando] = useState(podeTestar && !config.chave);
  const [texto, setTexto] = useState('');
  const [anexos, setAnexos] = useState<AnexoParaEnviar[]>([]);
  const [preparando, setPreparando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const conversa = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const audio = useAudio(enviarAudio, setAviso);
  const ocupado = enviando || preparando || audio.preparando;
  const temConteudo = texto.trim().length > 0 || anexos.length > 0;

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
    if ((!mensagem.trim() && !anexos.length) || ocupado) return;
    if (anexos.length) void enviarComAnexos(mensagem, anexos);
    else void enviar(mensagem);
    setTexto('');
    setAnexos([]);
    setAviso(null);
    campo.current?.focus();
  };

  async function anexar(arquivos: File[]) {
    if (!arquivos.length) return;
    setAviso(null);
    setPreparando(true);
    try {
      const r = await prepararArquivos(arquivos, anexos.length);
      setAnexos((atuais) => [...atuais, ...r.anexos].slice(0, MAXIMO_ANEXOS));
      if (r.erros.length) setAviso(r.erros.join(' '));
    } finally {
      setPreparando(false);
    }
  }

  const aoEscolher = (e: ChangeEvent<HTMLInputElement>) => {
    const arquivos = [...(e.target.files ?? [])];
    e.target.value = '';
    void anexar(arquivos);
  };

  // Ctrl+V de um print ou de um arquivo copiado também anexa.
  const aoColar = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const arquivos = [...e.clipboardData.files];
    if (!arquivos.length) return;
    e.preventDefault();
    void anexar(arquivos);
  };

  const aoSoltar = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setArrastando(false);
    void anexar([...e.dataTransfer.files]);
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
        {(mensagens.length > 0 || podeTestar) && (
          <div className="acoes">
            {mensagens.length > 0 && (
              <button type="button" className="botao contorno" onClick={novaConversa}>
                <RotateCcw size={17} strokeWidth={1.75} /> Nova conversa
              </button>
            )}
            {podeTestar && (
              <button type="button" className="botao contorno" onClick={() => setConfigurando((v) => !v)} aria-expanded={configurando}>
                <KeyRound size={17} strokeWidth={1.75} /> Chave de teste
              </button>
            )}
          </div>
        )}
      </header>

      {podeTestar && configurando && (
        <ChaveDeTeste
          inicial={chaveDeTeste}
          aoSalvar={(chave) => {
            salvarChaveDeTeste(chave);
            if (chave.trim()) setConfigurando(false);
          }}
          aoFechar={chaveDeTeste ? () => setConfigurando(false) : undefined}
        />
      )}

      {SEM_INTERNET ? (
        <p className="aviso-previa" role="note">
          <CircleAlert size={17} strokeWidth={2} />
          <span>
            Esta prévia não pode acessar a internet, então o {NOME_DO_ASSISTENTE} não alcança o Gemini aqui. Para conversar com ele, abra a
            prévia do GitHub Pages ou rode o projeto no computador.
          </span>
        </p>
      ) : (
        !configurado &&
        !podeTestar && (
          <p className="aviso-previa" role="note">
            <CircleAlert size={17} strokeWidth={2} />
            <span>O {NOME_DO_ASSISTENTE} ainda não foi configurado neste sistema. Avise o administrador.</span>
          </p>
        )
      )}

      <div className="assistente-grade">
        <section
          className={`cartao chat ${arrastando ? 'arrastando' : ''}`}
          data-entrada
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes('Files')) return;
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setArrastando(false);
          }}
          onDrop={aoSoltar}
        >
          <div className="chat-conversa" ref={conversa} aria-live="polite">
            {mensagens.length === 0 ? (
              <div className="chat-vazio">
                <IconeQuadrado icone={Sparkles} tamanho={52} />
                <h2>Pergunte ao {NOME_DO_ASSISTENTE}</h2>
                <p className="suave">
                  Ele consulta e registra no estoque, no financeiro e nos relatórios, e cria lembretes. Escreva, mande um áudio, uma foto ou
                  um documento (pode arrastar o arquivo para cá).
                </p>
                <div className="chips sugestoes">
                  {SUGESTOES.map((s) => (
                    <button key={s} type="button" className="chip" onClick={() => mandar(s)} disabled={ocupado}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              mensagens.map((m) => <Mensagem key={m.id} mensagem={m} />)
            )}
          </div>

          {(aviso || audio.aviso) && (
            <p className="chat-aviso" role="alert">
              <CircleAlert size={16} strokeWidth={2} /> {aviso ?? audio.aviso}
            </p>
          )}
          {anexos.length > 0 && (
            <ul className="anexos-pendentes" aria-label="Arquivos para mandar">
              {anexos.map((a, i) => {
                const Icone = ICONE_ANEXO[a.tipo];
                return (
                  <li key={`${a.nome}-${i}`} className="anexo-chip">
                    {a.miniatura ? <img src={a.miniatura} alt="" /> : <Icone size={16} strokeWidth={1.9} />}
                    <span className="anexo-chip-nome">{a.nome}</span>
                    <button
                      type="button"
                      onClick={() => setAnexos((lista) => lista.filter((_, j) => j !== i))}
                      aria-label={`Tirar ${a.nome}`}
                      title="Tirar"
                    >
                      <X size={14} strokeWidth={2.2} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <form className={`chat-entrada ${audio.gravando ? 'gravando' : ''}`} onSubmit={aoEnviar}>
            {audio.gravando ? (
              <div className="gravacao" role="status" aria-label={`Gravando áudio, ${formatarDuracao(audio.segundos)}`}>
                <button
                  type="button"
                  className="botao contorno quadrado"
                  onClick={audio.cancelar}
                  aria-label="Cancelar gravação"
                  title="Cancelar"
                >
                  <X size={18} strokeWidth={2} />
                </button>
                <span className="gravacao-ponto" aria-hidden />
                <strong className="num">{formatarDuracao(audio.segundos)}</strong>
                <span className="suave gravacao-dica">Fale o pedido e toque em enviar</span>
              </div>
            ) : (
              <>
                <label
                  className={`botao contorno quadrado ${ocupado || anexos.length >= MAXIMO_ANEXOS ? 'desligado' : ''}`}
                  title="Mandar arquivo: foto, PDF, planilha, documento, vídeo ou áudio"
                >
                  {preparando ? <LoaderCircle size={18} className="girando" /> : <Paperclip size={18} strokeWidth={1.9} />}
                  <input
                    type="file"
                    multiple
                    className="so-leitor"
                    disabled={ocupado || anexos.length >= MAXIMO_ANEXOS}
                    onChange={aoEscolher}
                    aria-label="Mandar arquivo"
                  />
                </label>
                <textarea
                  ref={campo}
                  className="campo"
                  rows={1}
                  placeholder={
                    anexos.length ? 'Escreva o que fazer com o arquivo (opcional)' : 'Ex.: chegaram 3 fardos de Skol por R$ 33 cada'
                  }
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={aoTeclar}
                  onPaste={aoColar}
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
            ) : temConteudo || !audio.microfone ? (
              <button type="submit" className="botao enviar" disabled={!temConteudo || preparando} aria-label="Enviar">
                <ArrowUp size={19} strokeWidth={2.2} />
              </button>
            ) : (
              <button
                type="button"
                className="botao enviar"
                onClick={audio.iniciar}
                disabled={preparando}
                aria-label="Gravar áudio"
                title="Gravar áudio"
              >
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
          <p className="suave pequeno">
            O que ele registra entra na hora no estoque, no financeiro e nos relatórios. Confira sempre a resposta antes de seguir.
          </p>
        </aside>
      </div>
    </div>
  );
}

/** Gravar o microfone e mandar como mensagem de voz. */
function useAudio(enviarAudio: ReturnType<typeof useAssistente>['enviarAudio'], limparOutroAviso: (aviso: null) => void) {
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
    limparOutroAviso(null);
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

  return { microfone, gravando, segundos, preparando, aviso, iniciar, cancelar, enviarGravacao };
}

function Mensagem({ mensagem }: { mensagem: MensagemAssistente }) {
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
      <div ref={ref} className={`msg pessoa ${mensagem.anexos ? 'com-anexos' : ''}`}>
        {mensagem.anexos?.map((a, i) => (
          <AnexoNaMensagem key={i} anexo={a} />
        ))}
        {mensagem.texto && <p>{mensagem.texto}</p>}
      </div>
    );
  }

  const passos = mensagem.passos ?? [];
  const atalhos = [
    ...new Map(
      passos.filter((p) => p.alterouDados && ONDE_VER[p.ferramenta]).map((p) => [ONDE_VER[p.ferramenta].para, ONDE_VER[p.ferramenta]]),
    ).values(),
  ];

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

/** Um arquivo no balão da pessoa, com o que o Pop AI leu nele. */
function AnexoNaMensagem({ anexo }: { anexo: AnexoNaConversa }) {
  const Icone = ICONE_ANEXO[anexo.tipo];
  const audio = anexo.tipo === 'audio';
  return (
    <div className="anexo-msg">
      <div className="anexo-cabeca">
        {anexo.miniatura ? (
          <img className="anexo-mini" src={anexo.miniatura} alt="" />
        ) : (
          <span className="anexo-icone">
            <Icone size={16} strokeWidth={1.9} />
          </span>
        )}
        <span className="lista-texto">
          <strong>{anexo.nome}</strong>
          <small>
            {NOME_DO_TIPO[anexo.tipo]}
            {anexo.duracao ? ` · ${formatarDuracao(anexo.duracao)}` : ''}
          </small>
        </span>
      </div>
      {anexo.lendo ? (
        <p className="ouvindo">
          <LoaderCircle size={15} className="girando" /> {audio ? 'Ouvindo o áudio…' : 'Lendo o arquivo…'}
        </p>
      ) : anexo.legivel === false ? (
        <p className="suave">{audio ? 'Não deu para ouvir fala nesse áudio.' : 'Não deu para ler esse arquivo.'}</p>
      ) : anexo.lido ? (
        audio ? (
          <p>“{anexo.lido}”</p>
        ) : (
          <details className="anexo-lido">
            <summary>O que o {NOME_DO_ASSISTENTE} leu</summary>
            <p>{anexo.lido}</p>
          </details>
        )
      ) : null}
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

/** Chave do Gemini colada na tela, só para testes (fica neste navegador). */
function ChaveDeTeste({ inicial, aoSalvar, aoFechar }: { inicial: string; aoSalvar: (chave: string) => void; aoFechar?: () => void }) {
  const [chave, setChave] = useState(inicial);
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
        aoSalvar(chave);
      }}
    >
      <div className="config-ia-topo">
        <IconeQuadrado icone={KeyRound} />
        <div>
          <h2>Chave do Gemini para testes</h2>
          <p className="suave">
            Enquanto a chave não está no código do sistema, cole aqui uma chave para testar o {NOME_DO_ASSISTENTE}. Ela fica salva só neste
            navegador. Crie uma grátis em{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
              aistudio.google.com/apikey
            </a>
            .
          </p>
        </div>
        {aoFechar && (
          <button type="button" className="link fechar" onClick={aoFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        )}
      </div>
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
          <button
            type="button"
            className="link"
            onClick={() => setMostrar((v) => !v)}
            aria-label={mostrar ? 'Esconder chave' : 'Mostrar chave'}
          >
            {mostrar ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </span>
      </label>
      <div className="acoes">
        <button type="submit" className="botao" disabled={!chave.trim()}>
          Salvar
        </button>
        {inicial && (
          <button type="button" className="botao contorno" onClick={() => aoSalvar('')}>
            Remover chave
          </button>
        )}
      </div>
    </form>
  );
}
