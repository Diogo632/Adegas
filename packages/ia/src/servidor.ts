import { McpServer } from '@modelcontextprotocol/server';
import type { LojaAdega, Permissao } from '@adegas/core';
import { ErroFerramenta, ferramentasPermitidas } from './ferramentas';

export const INSTRUCOES_SERVIDOR =
  'Servidor da plataforma Adegas (controle de adega: estoque, vendas, financeiro, relatórios e lembretes). ' +
  'Valores em reais (R$). Produtos podem ser indicados pelo nome ou por parte dele. ' +
  'Ferramentas que registram algo mudam os dados de verdade: use só quando a pessoa pedir.';

export interface OpcoesServidor {
  /** Relógio usado nas ferramentas (testes fixam a data). */
  agora?: () => Date;
  /**
   * O que a pessoa que está usando pode fazer. O servidor só publica as ferramentas
   * permitidas e esconde custos de quem não vê o financeiro. Sem isso: tudo (administrador).
   */
  permissoes?: Permissao[];
}

/**
 * Servidor MCP com tudo que a plataforma faz. O assistente do app/painel se conecta
 * a ele na memória; outros clientes MCP (Gemini CLI, Claude...) pelo terminal.
 */
export function criarServidorMcp(loja: LojaAdega, opcoes: OpcoesServidor = {}): McpServer {
  const agora = opcoes.agora ?? (() => new Date());
  const verCustos = !opcoes.permissoes || opcoes.permissoes.includes('financeiro');
  const servidor = new McpServer({ name: 'adegas', version: '0.1.0' }, { instructions: INSTRUCOES_SERVIDOR });

  for (const f of ferramentasPermitidas(opcoes.permissoes)) {
    servidor.registerTool(
      f.nome,
      {
        title: f.titulo,
        description: f.descricao,
        inputSchema: f.entrada,
        annotations: { title: f.titulo, readOnlyHint: f.somenteLeitura, destructiveHint: false, openWorldHint: false },
      },
      async (args: unknown) => {
        try {
          const resultado = f.executar(args, { loja, agora, verCustos });
          return { content: [{ type: 'text' as const, text: JSON.stringify(resultado) }] };
        } catch (erro) {
          if (erro instanceof ErroFerramenta) {
            return { isError: true, content: [{ type: 'text' as const, text: erro.message }] };
          }
          throw erro;
        }
      },
    );
  }
  return servidor;
}
