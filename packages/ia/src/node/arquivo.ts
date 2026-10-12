import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { ESTADO_VAZIO, estadoDeExemplo, reducer } from '@adegas/core';
import type { Estado, LojaAdega } from '@adegas/core';

/** Onde o servidor MCP guarda os dados no computador (até existir o banco na nuvem). */
export const CAMINHO_PADRAO = process.env.ADEGAS_DADOS || join(homedir(), '.adegas', 'dados.json');

/**
 * Loja guardada num arquivo JSON. Começa com os dados de exemplo. Relê o arquivo
 * quando outro processo (o assistente no terminal, outro cliente MCP) mexeu nele.
 */
export function criarLojaEmArquivo(caminho: string = CAMINHO_PADRAO): LojaAdega {
  let estado: Estado;
  let versaoLida = 0;

  const salvar = () => {
    const temporario = `${caminho}.tmp`;
    writeFileSync(temporario, JSON.stringify(estado));
    renameSync(temporario, caminho);
    versaoLida = statSync(caminho).mtimeMs;
  };
  const ler = () => {
    const versao = statSync(caminho).mtimeMs;
    if (versao === versaoLida) return;
    estado = { ...ESTADO_VAZIO, ...(JSON.parse(readFileSync(caminho, 'utf8')) as Partial<Estado>) };
    versaoLida = versao;
  };

  if (existsSync(caminho)) {
    ler();
  } else {
    mkdirSync(dirname(caminho), { recursive: true });
    estado = estadoDeExemplo();
    salvar();
  }

  return {
    estado() {
      ler();
      return estado;
    },
    despachar(acao) {
      ler();
      estado = reducer(estado, acao);
      salvar();
    },
  };
}
