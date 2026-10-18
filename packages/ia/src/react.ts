import { useCallback, useEffect, useRef, useState } from 'react';
import { PERMISSOES, permissoesDe, useAdega } from '@adegas/core';
import type { PassoAgente } from './agente';
import { AgenteAdega } from './agente';
import type { AudioParaEnviar } from './audio';
import { SEM_FALA, TAMANHO_MAXIMO_AUDIO } from './audio';
import type { ConexaoMcp } from './local';
import { conectarNaMemoria } from './local';

export interface MensagemAssistente {
  id: string;
  autor: 'pessoa' | 'assistente';
  /** Na mensagem de áudio, a transcrição (vazia enquanto o áudio é ouvido). */
  texto: string;
  /** A mensagem foi um áudio (gravado ou arquivo). */
  audio?: { duracao?: number; nome?: string };
  /** Áudio sendo transcrito. */
  ouvindo?: boolean;
  passos?: PassoAgente[];
  /** Ainda esperando o Gemini. */
  pensando?: boolean;
  erro?: boolean;
}

export interface ConfiguracaoAssistente {
  /** Chave da API do Gemini. Vazia = assistente desligado. */
  chave: string;
  modelo?: string;
}

let contador = 0;
const novoId = () => `m${Date.now().toString(36)}${(contador++).toString(36)}`;

const FALTA_CHAVE = 'Falta a chave do Gemini. Toque em "Configurar" para colar a sua.';

/**
 * Conversa com o assistente. As ferramentas agem nos mesmos dados das telas
 * (via MCP, na memória): uma entrada registrada pelo assistente já aparece no estoque.
 */
export function useAssistente({ chave, modelo }: ConfiguracaoAssistente) {
  const { loja, usuario } = useAdega();
  // O assistente age como quem está logado: só as ferramentas que a pessoa pode usar.
  const permissoes = usuario?.papel === 'admin' ? undefined : permissoesDe(usuario);
  const chaveDoUsuario = usuario ? `${usuario.id}:${usuario.papel}:${permissoesDe(usuario).join(',')}` : '';
  const [mensagens, setMensagens] = useState<MensagemAssistente[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [modeloEmUso, setModeloEmUso] = useState<string | null>(null);

  const conexao = useRef<Promise<ConexaoMcp> | null>(null);
  const agente = useRef<{ chave: string; modelo?: string; agente: AgenteAdega } | null>(null);
  const ocupado = useRef(false);
  const cancelar = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      cancelar.current?.abort();
      void conexao.current?.then((c) => c.fechar()).catch(() => undefined);
      conexao.current = null;
      agente.current = null;
    },
    [loja, chaveDoUsuario],
  );

  const atualizar = (id: string, mudanca: Partial<MensagemAssistente>) =>
    setMensagens((lista) => lista.map((m) => (m.id === id ? { ...m, ...mudanca } : m)));

  /** Põe a pergunta e a resposta "pensando" na conversa e roda o trabalho com o agente. */
  const conversar = useCallback(
    async (pergunta: MensagemAssistente, trabalho: (agente: AgenteAdega, sinal: AbortSignal, idResposta: string) => Promise<void>) => {
      const idResposta = novoId();
      setMensagens((lista) => [...lista, pergunta, { id: idResposta, autor: 'assistente', texto: '', passos: [], pensando: true }]);
      if (!chave.trim()) {
        atualizar(pergunta.id, { ouvindo: false });
        atualizar(idResposta, { pensando: false, erro: true, texto: FALTA_CHAVE });
        return;
      }

      ocupado.current = true;
      setEnviando(true);
      const controle = new AbortController();
      cancelar.current = controle;
      try {
        conexao.current ??= conectarNaMemoria(loja, { permissoes });
        const { cliente } = await conexao.current;
        if (!agente.current || agente.current.chave !== chave || agente.current.modelo !== modelo) {
          const quemUsa = usuario
            ? {
                nome: usuario.nome,
                papel: usuario.papel,
                permissoes: PERMISSOES.filter((p) => permissoesDe(usuario).includes(p.id)).map((p) => p.nome),
              }
            : undefined;
          agente.current = { chave, modelo, agente: new AgenteAdega({ cliente, chave: chave.trim(), modelo, quemUsa }) };
        }
        await trabalho(agente.current.agente, controle.signal, idResposta);
        setModeloEmUso(agente.current.agente.modeloEmUso);
      } catch (erro) {
        if (controle.signal.aborted) return;
        atualizar(pergunta.id, { ouvindo: false });
        atualizar(idResposta, {
          pensando: false,
          erro: true,
          texto: erro instanceof Error ? erro.message : 'Algo deu errado. Tente de novo.',
        });
      } finally {
        if (cancelar.current === controle) {
          ocupado.current = false;
          cancelar.current = null;
          setEnviando(false);
        }
      }
    },
    [chave, modelo, loja, permissoes?.join(','), usuario],
  );

  const enviar = useCallback(
    async (texto: string) => {
      const pergunta = texto.trim();
      if (!pergunta || ocupado.current) return;
      await conversar({ id: novoId(), autor: 'pessoa', texto: pergunta }, async (agente, sinal, idResposta) => {
        const resposta = await agente.enviar(pergunta, { sinal, aoMudar: (passos) => atualizar(idResposta, { passos }) });
        atualizar(idResposta, { pensando: false, texto: resposta.texto, passos: resposta.passos });
      });
    },
    [conversar],
  );

  /** Mensagem de voz ou áudio recebido: o Pop AI transcreve, mostra o que entendeu e responde. */
  const enviarAudio = useCallback(
    async (audio: AudioParaEnviar) => {
      if (ocupado.current) return;
      const idPessoa = novoId();
      const pergunta: MensagemAssistente = {
        id: idPessoa,
        autor: 'pessoa',
        texto: '',
        audio: { duracao: audio.duracao, nome: audio.nome },
        ouvindo: true,
      };
      if (audio.dados.length > TAMANHO_MAXIMO_AUDIO) {
        const id = novoId();
        setMensagens((lista) => [
          ...lista,
          { ...pergunta, ouvindo: false },
          { id, autor: 'assistente', texto: 'Esse áudio é grande demais. Mande um áudio de até uns 10 minutos.', erro: true },
        ]);
        return;
      }
      await conversar(pergunta, async (agente, sinal, idResposta) => {
        const transcricao = await agente.ouvir(audio, { sinal });
        if (transcricao === SEM_FALA) {
          atualizar(idPessoa, { ouvindo: false });
          atualizar(idResposta, {
            pensando: false,
            texto: 'Não consegui ouvir nenhuma fala nesse áudio. Tente gravar de novo, mais perto do microfone.',
          });
          return;
        }
        atualizar(idPessoa, { ouvindo: false, texto: transcricao });
        const resposta = await agente.enviar(transcricao, {
          deAudio: true,
          sinal,
          aoMudar: (passos) => atualizar(idResposta, { passos }),
        });
        atualizar(idResposta, { pensando: false, texto: resposta.texto, passos: resposta.passos });
      });
    },
    [conversar],
  );

  const novaConversa = useCallback(() => {
    cancelar.current?.abort();
    cancelar.current = null;
    ocupado.current = false;
    setEnviando(false);
    // Um agente novo: o antigo pode ainda estar terminando a resposta cancelada.
    agente.current = null;
    setMensagens([]);
  }, []);

  return { mensagens, enviando, enviar, enviarAudio, novaConversa, modeloEmUso };
}
