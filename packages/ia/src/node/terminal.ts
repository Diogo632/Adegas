/**
 * Conversa com o assistente pelo terminal. Ele sobe o servidor MCP da Adegas
 * como outro processo e fala com ele pelo protocolo MCP (stdio), usando o Gemini.
 * Uso: GEMINI_API_KEY=sua-chave npm run assistente
 */
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/client/stdio';
import { AgenteAdega } from '../agente';
import { descreverPasso } from '../apresentacao';
import { CAMINHO_PADRAO } from './arquivo';

const chave = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
if (!chave) {
  console.error('Defina a chave do Gemini: GEMINI_API_KEY=sua-chave npm run assistente');
  console.error('Crie uma chave grátis em https://aistudio.google.com/apikey');
  process.exit(1);
}

const transporte = new StdioClientTransport({
  command: process.execPath,
  args: ['--import', 'tsx', fileURLToPath(new URL('./servidor-stdio.ts', import.meta.url))],
  env: { ...getDefaultEnvironment(), ADEGAS_DADOS: CAMINHO_PADRAO },
  stderr: 'ignore',
});
const cliente = new Client({ name: 'assistente-adegas-terminal', version: '0.1.0' });
await cliente.connect(transporte);

const agente = new AgenteAdega({ cliente, chave, modelo: process.env.GEMINI_MODELO });
const { tools } = await cliente.listTools();
console.log(`Assistente da Adega (${tools.length} ferramentas via MCP · dados em ${CAMINHO_PADRAO})`);
console.log('Escreva sua pergunta. "nova" começa outra conversa, "sair" fecha.\n');

const leitor = createInterface({ input: process.stdin, output: process.stdout });
leitor.setPrompt('você › ');
leitor.prompt();
// Lê linha a linha; o que for digitado enquanto o assistente responde fica na fila.
for await (const linha of leitor) {
  const pergunta = linha.trim();
  if (['sair', 'exit', 'quit'].includes(pergunta.toLowerCase())) break;
  if (pergunta.toLowerCase() === 'nova') {
    agente.limpar();
    console.log('(conversa nova)\n');
  } else if (pergunta) {
    try {
      let mostrados = 0;
      const resposta = await agente.enviar(pergunta, {
        aoMudar: (passos) => {
          for (const passo of passos.slice(mostrados)) {
            if (passo.situacao === 'rodando') continue;
            console.log(`  · ${descreverPasso(passo)}${passo.situacao === 'erro' ? ` (não deu: ${passo.erro})` : ''}`);
            mostrados++;
          }
        },
      });
      console.log(`\nassistente › ${resposta.texto}\n`);
    } catch (erro) {
      console.log(`\n(erro) ${erro instanceof Error ? erro.message : String(erro)}\n`);
    }
  }
  leitor.prompt();
}
leitor.close();
await cliente.close();
