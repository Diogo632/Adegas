import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdega } from '@adegas/core';
import type { PassoAgente } from './agente';
import { AgenteAdega } from './agente';
import type { ConexaoMcp } from './local';
import { conectarNaMemoria } from './local';

export interface MensagemAssistente {
  id: string;
  autor: 'pessoa' | 'assistente';
  texto: string;
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

/**
 * Conversa com o assistente. As ferramentas agem nos mesmos dados das telas
 * (via MCP, na memória): uma entrada registrada pelo assistente já aparece no estoque.
 */
export function useAssistente({ chave, modelo }: ConfiguracaoAssistente) {
  const { loja } = useAdega();
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
    [loja],
  );

  const atualizar = (id: string, mudanca: Partial<MensagemAssistente>) =>
    setMensagens((lista) => lista.map((m) => (m.id === id ? { ...m, ...mudanca } : m)));

  const enviar = useCallback(
    async (texto: string) => {
      const pergunta = texto.trim();
      if (!pergunta || ocupado.current) return;
      const idResposta = novoId();
      setMensagens((lista) => [
        ...lista,
        { id: novoId(), autor: 'pessoa', texto: pergunta },
        { id: idResposta, autor: 'assistente', texto: '', passos: [], pensando: true },
      ]);
      if (!chave.trim()) {
        atualizar(idResposta, { pensando: false, erro: true, texto: 'Falta a chave do Gemini. Toque em "Configurar" para colar a sua.' });
        return;
      }

      ocupado.current = true;
      setEnviando(true);
      const controle = new AbortController();
      cancelar.current = controle;
      try {
        conexao.current ??= conectarNaMemoria(loja);
        const { cliente } = await conexao.current;
        if (!agente.current || agente.current.chave !== chave || agente.current.modelo !== modelo) {
          agente.current = { chave, modelo, agente: new AgenteAdega({ cliente, chave: chave.trim(), modelo }) };
        }
        const resposta = await agente.current.agente.enviar(pergunta, {
          sinal: controle.signal,
          aoMudar: (passos) => atualizar(idResposta, { passos }),
        });
        setModeloEmUso(agente.current.agente.modeloEmUso);
        atualizar(idResposta, { pensando: false, texto: resposta.texto, passos: resposta.passos });
      } catch (erro) {
        if (controle.signal.aborted) return;
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
    [chave, modelo, loja],
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

  return { mensagens, enviando, enviar, novaConversa, modeloEmUso };
}
