/**
 * Conversa com o Pop AI pelo terminal. Ele sobe o servidor MCP da Adegas
 * como outro processo e fala com ele pelo protocolo MCP (stdio), usando o Gemini.
 * Uso: GEMINI_API_KEY=sua-chave npm run assistente
 * "/arquivo caminho" manda um arquivo: foto, PDF, planilha, documento, vídeo ou
 * áudio (ex.: o áudio do WhatsApp). "/audio caminho" faz o mesmo.
 */
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/client/stdio';
import type { AnexoLido } from '../agente';
import { AgenteAdega, NOME_DO_ASSISTENTE } from '../agente';
import type { AnexoParaEnviar } from '../anexos';
import { NOME_DO_TIPO, classificarArquivo, conferirTamanho, textoDoArquivo } from '../anexos';
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
console.log(`${NOME_DO_ASSISTENTE}, assistente da adega Pop (${tools.length} ferramentas via MCP · dados em ${CAMINHO_PADRAO})`);
console.log('Escreva sua pergunta. "/arquivo caminho" manda uma foto, PDF, planilha ou áudio, "nova" começa outra conversa, "sair" fecha.\n');

/** "/arquivo caminho" → o que o Pop AI leu no arquivo. */
async function lerArquivo(caminho: string): Promise<AnexoLido> {
  const nome = basename(caminho);
  const { tipo, mimeType } = classificarArquivo(nome);
  const bytes = await readFile(caminho);
  let anexo: AnexoParaEnviar;
  if (tipo === 'texto' || tipo === 'planilha' || tipo === 'documento') {
    anexo = { nome, tipo, mimeType, texto: textoDoArquivo(nome, tipo, new Uint8Array(bytes)) };
  } else {
    conferirTamanho(nome, bytes.length);
    anexo = { nome, tipo, mimeType, dados: bytes.toString('base64') };
  }
  const lido = await agente.ler(anexo);
  const previa = lido.conteudo.length > 400 ? `${lido.conteudo.slice(0, 400)}…` : lido.conteudo;
  console.log(`  📎 ${nome} (${NOME_DO_TIPO[tipo]}): ${lido.legivel ? previa : 'não deu para ler'}`);
  return lido;
}

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
      const comando = /^\/(?:arquivo|audio)\s+(.+)$/i.exec(pergunta);
      const anexos = comando ? [await lerArquivo(comando[1].trim().replace(/^["']|["']$/g, ''))] : undefined;
      let mostrados = 0;
      const resposta = await agente.enviar(comando ? '' : pergunta, {
        anexos,
        aoMudar: (passos) => {
          for (const passo of passos.slice(mostrados)) {
            if (passo.situacao === 'rodando') continue;
            console.log(`  · ${descreverPasso(passo)}${passo.situacao === 'erro' ? ` (não deu: ${passo.erro})` : ''}`);
            mostrados++;
          }
        },
      });
      console.log(`\n${NOME_DO_ASSISTENTE} › ${resposta.texto}\n`);
    } catch (erro) {
      console.log(`\n(erro) ${erro instanceof Error ? erro.message : String(erro)}\n`);
    }
  }
  leitor.prompt();
}
leitor.close();
await cliente.close();
