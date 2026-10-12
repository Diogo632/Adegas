import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import type { LojaAdega } from '@adegas/core';
import type { OpcoesServidor } from './servidor';
import { criarServidorMcp } from './servidor';

export interface ConexaoMcp {
  cliente: Client;
  fechar(): Promise<void>;
}

/**
 * Liga um cliente MCP ao servidor da adega dentro do próprio app/navegador,
 * pela memória (sem rede). É o mesmo protocolo de um servidor MCP remoto.
 */
export async function conectarNaMemoria(loja: LojaAdega, opcoes: OpcoesServidor = {}): Promise<ConexaoMcp> {
  const servidor = criarServidorMcp(loja, opcoes);
  const [ladoCliente, ladoServidor] = InMemoryTransport.createLinkedPair();
  await servidor.connect(ladoServidor);
  const cliente = new Client({ name: 'assistente-adegas', version: '0.1.0' });
  await cliente.connect(ladoCliente);
  return {
    cliente,
    async fechar() {
      await cliente.close();
      await servidor.close();
    },
  };
}
