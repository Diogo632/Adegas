// Configuração do Metro (o empacotador do app). Igual à padrão do Expo, com um ajuste:
// o SDK do MCP (usado pelo assistente) tem uma versão para Node e outra para navegador.
// O React Native não é nenhum dos dois; no celular ele usa a do navegador, que não
// depende de módulos do Node (node:process, validador ajv).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const SHIMS_DO_NAVEGADOR = {
  '@modelcontextprotocol/server/_shims': path.join(path.dirname(require.resolve('@modelcontextprotocol/server')), 'shimsBrowser.mjs'),
  '@modelcontextprotocol/client/_shims': path.join(path.dirname(require.resolve('@modelcontextprotocol/client')), 'shimsBrowser.mjs'),
};

// Só servem para falar com servidores MCP pela rede (SSE, login OAuth). No celular o
// assistente fala com o servidor pela memória, e essas bibliotecas quebram ao abrir
// (usam Event e TransformStream, que o React Native não tem).
const SO_PARA_REDE = new Set(['eventsource', 'eventsource-parser/stream', 'pkce-challenge']);

const resolverPadrao = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, nome, plataforma) => {
  if (SHIMS_DO_NAVEGADOR[nome]) return { type: 'sourceFile', filePath: SHIMS_DO_NAVEGADOR[nome] };
  if (plataforma !== 'web' && SO_PARA_REDE.has(nome)) return { type: 'empty' };
  return (resolverPadrao ?? context.resolveRequest)(context, nome, plataforma);
};

module.exports = config;
