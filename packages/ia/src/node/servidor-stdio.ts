/**
 * Servidor MCP da Adegas pelo terminal (stdio), para qualquer cliente MCP:
 * Gemini CLI, Claude, editores... Uso: npm run mcp
 */
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { criarServidorMcp } from '../servidor';
import { CAMINHO_PADRAO, criarLojaEmArquivo } from './arquivo';

const servidor = criarServidorMcp(criarLojaEmArquivo(CAMINHO_PADRAO));
await servidor.connect(new StdioServerTransport());
// stdout é do protocolo; avisos vão para o stderr.
console.error(`Servidor MCP da Adegas no ar. Dados em ${CAMINHO_PADRAO}`);
