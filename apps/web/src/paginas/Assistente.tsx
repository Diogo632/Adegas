import { FERRAMENTAS, MODELO_PADRAO, SUGESTOES, blocosDeTexto, descreverPasso, useAssistente } from '@adegas/ia';
import type { MensagemAssistente, PassoAgente } from '@adegas/ia';
import {
  ArrowUp,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  PencilLine,
  Plug,
  RotateCcw,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react';
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
  'Consulta o estoque de qualquer produto',
  'Registra entrada de mercadoria e vendas',
  'Lança pedidos nas mesas e fecha a conta',
  'Lança despesas e ajusta o estoque',
  'Busca o financeiro e os relatórios de qualquer período',
  'Cria e conclui lembretes',
];

export function Assistente() {
  const [config, salvarConfig] = useConfigAssistente();
  const { mensagens, enviando, enviar, novaConversa, modeloEmUso } = useAssistente(config);
  const [configurando, setConfigurando] = useState(!config.chave);
  const [texto, setTexto] = useState('');
  const conversa = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

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
          <p className="sobretitulo">Inteligência artificial</p>
          <h1>Assistente</h1>
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
            Esta prévia não pode acessar a internet, então o assistente não alcança o Gemini aqui. Para conversar com ele, abra a
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
                <h2>Pergunte sobre a sua adega</h2>
                <p className="suave">
                  Ele consulta e registra no estoque, no financeiro e nos relatórios, e cria lembretes. Escreva do seu jeito.
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

          <form className="chat-entrada" onSubmit={aoEnviar}>
            <textarea
              ref={campo}
              className="campo"
              rows={1}
              placeholder="Ex.: chegaram 3 fardos de Skol por R$ 33 cada"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={aoTeclar}
              aria-label="Mensagem para o assistente"
            />
            <button type="submit" className="botao enviar" disabled={!texto.trim() || enviando} aria-label="Enviar">
              {enviando ? <LoaderCircle size={19} className="girando" /> : <ArrowUp size={19} strokeWidth={2.2} />}
            </button>
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

function Mensagem({ mensagem, aoConfigurar }: { mensagem: MensagemAssistente; aoConfigurar: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current) surgir(ref.current);
  }, []);

  if (mensagem.autor === 'pessoa') {
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
          <ul className="passos" aria-label="O que o assistente fez">
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
            O assistente usa a API do Gemini, do Google. Crie uma chave grátis em{' '}
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
