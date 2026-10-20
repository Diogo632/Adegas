/**
 * Cliente mínimo da API do Gemini (REST, generateContent), sem SDK: o mesmo
 * código roda no navegador, no React Native e no Node.
 */

export const URL_GEMINI = 'https://generativelanguage.googleapis.com/v1beta';
export const MODELO_PADRAO = 'gemini-3.8-flash';

export interface ChamadaFuncao {
  name: string;
  args?: Record<string, unknown>;
  id?: string;
}

export interface RespostaFuncao {
  name: string;
  response: Record<string, unknown>;
  id?: string;
}

/** Parte de uma mensagem. Campos que não usamos (ex.: thoughtSignature) são devolvidos como vieram. */
export interface ParteGemini {
  text?: string;
  thought?: boolean;
  /** Arquivo junto da mensagem (ex.: áudio), em base64. */
  inlineData?: { mimeType: string; data: string };
  functionCall?: ChamadaFuncao;
  functionResponse?: RespostaFuncao;
  [outro: string]: unknown;
}

export interface ConteudoGemini {
  role: 'user' | 'model';
  parts: ParteGemini[];
}

/** Subconjunto OpenAPI que o Gemini aceita para descrever parâmetros. */
export interface EsquemaGemini {
  type: 'STRING' | 'NUMBER' | 'INTEGER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';
  description?: string;
  enum?: string[];
  properties?: Record<string, EsquemaGemini>;
  required?: string[];
  items?: EsquemaGemini;
  nullable?: boolean;
}

export interface DeclaracaoFuncao {
  name: string;
  description?: string;
  parameters?: EsquemaGemini;
}

export interface PedidoGemini {
  systemInstruction?: { parts: { text: string }[] };
  contents: ConteudoGemini[];
  tools?: { functionDeclarations: DeclaracaoFuncao[] }[];
  toolConfig?: { functionCallingConfig: { mode: 'AUTO' | 'ANY' | 'NONE' } };
  generationConfig?: { temperature?: number; responseMimeType?: string; responseSchema?: EsquemaGemini };
}

export interface RespostaGemini {
  candidates?: { content?: Partial<ConteudoGemini>; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

export type Buscar = (url: string, init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

/** Erro já com a mensagem para mostrar à pessoa. */
export class ErroGemini extends Error {
  readonly status?: number;
  constructor(mensagem: string, status?: number) {
    super(mensagem);
    this.status = status;
  }
}

export interface OpcoesGemini {
  chave: string;
  modelo: string;
  buscar?: Buscar;
  sinal?: AbortSignal;
}

function buscarPadrao(): Buscar {
  if (typeof fetch !== 'function') throw new ErroGemini('Este ambiente não tem fetch.');
  return (url, init) => fetch(url, init);
}

async function lerErro(resposta: { status: number; text(): Promise<string> }): Promise<{ mensagem: string; status?: string }> {
  try {
    const corpo = JSON.parse(await resposta.text()) as { error?: { message?: string; status?: string } };
    return { mensagem: corpo.error?.message ?? '', status: corpo.error?.status };
  } catch {
    return { mensagem: '' };
  }
}

function explicar(status: number, detalhe: { mensagem: string; status?: string }, modelo: string): ErroGemini {
  const texto = detalhe.mensagem.toLowerCase();
  if (status === 400 && texto.includes('api key')) {
    return new ErroGemini('A chave do Gemini configurada no sistema não é válida. Avise o administrador.', status);
  }
  if (status === 400 && texto.includes('mime')) {
    return new ErroGemini('O Gemini não aceitou o formato desse áudio. Tente um áudio em MP3, WAV ou o áudio do WhatsApp.', status);
  }
  if (status === 400 && /too large|exceeds|payload/.test(texto)) {
    return new ErroGemini('Esse áudio é grande demais para o Gemini. Mande um áudio mais curto.', status);
  }
  if (status === 401 || status === 403) {
    return new ErroGemini('A chave do Gemini configurada no sistema não tem permissão. Avise o administrador.', status);
  }
  if (status === 404) return new ErroGemini(`O modelo "${modelo}" não está disponível para esta chave.`, status);
  if (status === 429) return new ErroGemini('Limite de uso do Gemini atingido. Espere um minuto e tente de novo.', status);
  if (status >= 500) return new ErroGemini('O Gemini está instável agora. Tente de novo em instantes.', status);
  return new ErroGemini(`O Gemini recusou o pedido (${status})${detalhe.mensagem ? `: ${detalhe.mensagem}` : '.'}`, status);
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function gerarConteudo(pedido: PedidoGemini, opcoes: OpcoesGemini): Promise<ConteudoGemini> {
  const buscar = opcoes.buscar ?? buscarPadrao();
  const url = `${URL_GEMINI}/models/${encodeURIComponent(opcoes.modelo)}:generateContent`;

  let resposta: Awaited<ReturnType<Buscar>> | undefined;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      resposta = await buscar(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': opcoes.chave },
        body: JSON.stringify(pedido),
        signal: opcoes.sinal,
      });
    } catch (erro) {
      if (opcoes.sinal?.aborted) throw erro;
      throw new ErroGemini('Sem conexão com o Gemini. Confira a internet e tente de novo.');
    }
    // Instabilidade passageira do servidor: uma segunda tentativa costuma resolver.
    if ((resposta.status === 500 || resposta.status === 503) && tentativa === 0) {
      await esperar(1200);
      continue;
    }
    break;
  }
  if (!resposta) throw new ErroGemini('Sem resposta do Gemini.');
  if (!resposta.ok) throw explicar(resposta.status, await lerErro(resposta), opcoes.modelo);

  const corpo = (await resposta.json()) as RespostaGemini;
  if (corpo.promptFeedback?.blockReason) {
    throw new ErroGemini(`O Gemini não respondeu esta mensagem (${corpo.promptFeedback.blockReason}).`);
  }
  const candidato = corpo.candidates?.[0];
  const partes = candidato?.content?.parts ?? [];
  if (!partes.length) {
    const motivo = candidato?.finishReason;
    if (motivo && motivo !== 'STOP') throw new ErroGemini(`O Gemini parou sem responder (${motivo}). Tente reformular.`);
  }
  return { role: 'model', parts: partes };
}

/**
 * Quando o modelo padrão não existe para a chave (mudou de nome, foi aposentado),
 * escolhe o Flash mais novo disponível.
 */
export async function escolherModeloFlash(opcoes: Omit<OpcoesGemini, 'modelo'>): Promise<string | null> {
  const buscar = opcoes.buscar ?? buscarPadrao();
  const resposta = await buscar(`${URL_GEMINI}/models?pageSize=200`, {
    method: 'GET',
    headers: { 'x-goog-api-key': opcoes.chave },
    signal: opcoes.sinal,
  });
  if (!resposta.ok) return null;
  const corpo = (await resposta.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
  const versao = (id: string) => Number(/^gemini-(\d+(?:\.\d+)?)/.exec(id)?.[1] ?? 0);
  const candidatos = (corpo.models ?? [])
    .map((m) => ({ id: m.name.replace(/^models\//, ''), metodos: m.supportedGenerationMethods }))
    // Só o Flash "normal": fora lite, imagem, voz etc.
    .filter((m) => /^gemini-\d+(\.\d+)?-flash(-preview[\w-]*|-\d{3})?$/.test(m.id))
    .filter((m) => !m.metodos || m.metodos.includes('generateContent'))
    .sort((a, b) => versao(b.id) - versao(a.id) || Number(a.id.includes('preview')) - Number(b.id.includes('preview')));
  return candidatos[0]?.id ?? null;
}

/** JSON Schema (o que o MCP publica) → esquema do Gemini. */
export function paraEsquemaGemini(esquema: unknown): EsquemaGemini {
  const s = (esquema ?? {}) as Record<string, unknown>;
  if (Array.isArray(s.anyOf)) {
    const opcoes = (s.anyOf as Record<string, unknown>[]).filter((o) => o.type !== 'null');
    const convertido = paraEsquemaGemini({ ...opcoes[0], description: s.description ?? opcoes[0]?.description });
    return opcoes.length < (s.anyOf as unknown[]).length ? { ...convertido, nullable: true } : convertido;
  }
  let tipo = s.type as string | string[] | undefined;
  let nullable = false;
  if (Array.isArray(tipo)) {
    nullable = tipo.includes('null');
    tipo = tipo.find((t) => t !== 'null');
  }
  if (!tipo) tipo = s.enum ? 'string' : s.properties ? 'object' : 'string';

  const saida: EsquemaGemini = { type: tipo.toUpperCase() as EsquemaGemini['type'] };
  if (typeof s.description === 'string') saida.description = s.description;
  if (Array.isArray(s.enum)) saida.enum = s.enum.map(String);
  if (nullable) saida.nullable = true;
  if (tipo === 'object') {
    const propriedades = (s.properties ?? {}) as Record<string, unknown>;
    saida.properties = Object.fromEntries(Object.entries(propriedades).map(([k, v]) => [k, paraEsquemaGemini(v)]));
    const obrigatorios = (Array.isArray(s.required) ? (s.required as string[]) : []).filter((k) => k in propriedades);
    if (obrigatorios.length) saida.required = obrigatorios;
  }
  if (tipo === 'array') saida.items = paraEsquemaGemini(s.items);
  return saida;
}
