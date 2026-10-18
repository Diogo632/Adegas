/**
 * Arquivos que a pessoa manda para o Pop AI: fotos, PDFs, planilhas, documentos,
 * vídeos e áudios. Só código puro aqui (roda no navegador, no React Native e no Node).
 *
 * - Foto, PDF, vídeo e áudio vão para o Gemini ler (ou transcrever).
 * - Texto, CSV e arquivos do Office (Word, Excel, PowerPoint, LibreOffice) têm o
 *   texto tirado aqui mesmo, no aparelho, porque o Gemini não abre esses formatos.
 */
import { strFromU8, unzipSync } from 'fflate';
import { tipoDoAudio } from './audio';

export type TipoAnexo = 'audio' | 'imagem' | 'pdf' | 'video' | 'texto' | 'planilha' | 'documento';

/** Arquivo pronto para mandar. */
export interface AnexoParaEnviar {
  nome: string;
  tipo: TipoAnexo;
  mimeType: string;
  /** Conteúdo em base64, para o que o Gemini lê (foto, PDF, vídeo, áudio). */
  dados?: string;
  /** Texto já tirado do arquivo (texto, planilha, documento). */
  texto?: string;
  /** Duração do áudio, em segundos. */
  duracao?: number;
  /** Miniatura para mostrar na conversa (endereço da imagem). */
  miniatura?: string;
}

/** Até quantos arquivos numa mensagem. */
export const MAXIMO_ANEXOS = 4;

/** Arquivos lidos pelo Gemini: até uns 10 MB (o pedido todo aceita 20 MB, e base64 cresce 1/3). */
export const TAMANHO_MAXIMO_ARQUIVO = 10 * 1024 * 1024;

/** Texto tirado de um arquivo que vai para a conversa (o resto é cortado). */
export const LIMITE_TEXTO_ANEXO = 40_000;

/** Resposta da leitura quando não deu para ler nada. */
export const ILEGIVEL = '[ilegível]';

export const NOME_DO_TIPO: Record<TipoAnexo, string> = {
  audio: 'áudio',
  imagem: 'imagem',
  pdf: 'PDF',
  video: 'vídeo',
  texto: 'texto',
  planilha: 'planilha',
  documento: 'documento',
};

const IMAGENS: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jfif: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  gif: 'image/gif',
  bmp: 'image/bmp',
};

const VIDEOS: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/mov',
  webm: 'video/webm',
  '3gp': 'video/3gpp',
  avi: 'video/avi',
  mpeg: 'video/mpeg',
  mpg: 'video/mpg',
  wmv: 'video/wmv',
  flv: 'video/x-flv',
};

const TEXTOS: Record<string, TipoAnexo> = {
  txt: 'texto',
  md: 'texto',
  log: 'texto',
  json: 'texto',
  xml: 'texto',
  html: 'texto',
  htm: 'texto',
  rtf: 'texto',
  csv: 'planilha',
  tsv: 'planilha',
};

const OFFICE: Record<string, TipoAnexo> = {
  docx: 'documento',
  odt: 'documento',
  pptx: 'documento',
  odp: 'documento',
  xlsx: 'planilha',
  ods: 'planilha',
};

/** Formatos antigos do Office: são binários, não dá para tirar o texto aqui. */
const ANTIGOS = new Set(['doc', 'xls', 'ppt']);

export class ErroAnexo extends Error {}

const extensaoDe = (nome: string) => /\.([a-z0-9]+)$/i.exec(nome)?.[1]?.toLowerCase() ?? '';

/** Que tipo de arquivo é, pelo nome (ou pelo tipo informado pelo aparelho). */
export function classificarArquivo(nome: string, mimeType?: string): { tipo: TipoAnexo; mimeType: string } {
  const ext = extensaoDe(nome);
  const tipoInformado = (mimeType ?? '').split(';')[0].trim().toLowerCase();
  if (ANTIGOS.has(ext)) {
    throw new ErroAnexo(`Arquivo .${ext} antigo não dá para ler. Salve como PDF ou no formato novo (.${ext}x) e mande de novo.`);
  }
  if (IMAGENS[ext]) return { tipo: 'imagem', mimeType: IMAGENS[ext] };
  if (ext === 'pdf' || tipoInformado === 'application/pdf') return { tipo: 'pdf', mimeType: 'application/pdf' };
  if (VIDEOS[ext]) return { tipo: 'video', mimeType: VIDEOS[ext] };
  if (OFFICE[ext]) return { tipo: OFFICE[ext], mimeType: tipoInformado || 'application/octet-stream' };
  if (TEXTOS[ext]) return { tipo: TEXTOS[ext], mimeType: 'text/plain' };
  const audio = tipoDoAudio(nome, mimeType);
  if (audio) return { tipo: 'audio', mimeType: audio };
  if (tipoInformado.startsWith('image/')) return { tipo: 'imagem', mimeType: tipoInformado };
  if (tipoInformado.startsWith('video/')) return { tipo: 'video', mimeType: tipoInformado };
  if (tipoInformado.startsWith('text/')) return { tipo: 'texto', mimeType: 'text/plain' };
  throw new ErroAnexo(
    `Ainda não sei ler arquivos ${ext ? `.${ext}` : 'desse tipo'}. Mande como foto, PDF, planilha (XLSX ou CSV), documento (DOCX), texto, vídeo ou áudio.`,
  );
}

// ---------- Bytes e texto ----------

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const VALOR_LETRA = new Map([...LETRAS].map((l, i) => [l, i]));

export function deBase64(texto: string): Uint8Array {
  const limpo = texto.replace(/[^A-Za-z0-9+/]/g, '');
  const saida = new Uint8Array(Math.floor((limpo.length * 3) / 4));
  let j = 0;
  for (let i = 0; i < limpo.length; i += 4) {
    const n =
      ((VALOR_LETRA.get(limpo[i]) ?? 0) << 18) |
      ((VALOR_LETRA.get(limpo[i + 1]) ?? 0) << 12) |
      ((VALOR_LETRA.get(limpo[i + 2]) ?? 0) << 6) |
      (VALOR_LETRA.get(limpo[i + 3]) ?? 0);
    saida[j++] = (n >> 16) & 255;
    if (i + 2 < limpo.length) saida[j++] = (n >> 8) & 255;
    if (i + 3 < limpo.length) saida[j++] = n & 255;
  }
  return saida.subarray(0, j);
}

/** Bytes → texto. Tenta UTF-8; se não for (CSV salvo pelo Excel no Brasil costuma ser Windows-1252), lê como Latin-1. */
export function deTexto(bytes: Uint8Array): string {
  let inicio = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  const partes: number[] = [];
  let valido = true;
  while (inicio < bytes.length) {
    const b = bytes[inicio];
    let n = 0;
    let codigo = 0;
    if (b < 0x80) {
      codigo = b;
    } else if (b >> 5 === 0x6) {
      n = 1;
      codigo = b & 0x1f;
    } else if (b >> 4 === 0xe) {
      n = 2;
      codigo = b & 0x0f;
    } else if (b >> 3 === 0x1e) {
      n = 3;
      codigo = b & 0x07;
    } else {
      valido = false;
      break;
    }
    for (let k = 1; k <= n; k++) {
      const c = bytes[inicio + k];
      if (c === undefined || c >> 6 !== 0x2) {
        valido = false;
        break;
      }
      codigo = (codigo << 6) | (c & 0x3f);
    }
    if (!valido) break;
    partes.push(codigo);
    inicio += n + 1;
  }
  if (valido) {
    let saida = '';
    for (let i = 0; i < partes.length; i += 8192) saida += String.fromCodePoint(...partes.slice(i, i + 8192));
    return saida;
  }
  // Windows-1252 nos acentos comuns é igual ao Latin-1.
  let saida = '';
  for (let i = 0; i < bytes.length; i += 8192) saida += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return saida;
}

// ---------- Office ----------

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodificarXml(texto: string): string {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (inteiro, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
    return ENTIDADES[e] ?? inteiro;
  });
}

/** Tira as marcas do XML, com quebra de linha onde o documento quebra parágrafo. */
function textoDoXml(xml: string, quebras: RegExp, tabs?: RegExp): string {
  let t = xml.replace(quebras, '\n');
  if (tabs) t = t.replace(tabs, '\t');
  t = decodificarXml(t.replace(/<[^>]+>/g, ''));
  return t
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const numeroDaParte = (caminho: string) => Number(/(\d+)\.xml$/.exec(caminho)?.[1] ?? 0);

/** "B12" → 1 (coluna B) */
function colunaDe(ref: string): number {
  const letras = /^[A-Z]+/.exec(ref)?.[0] ?? 'A';
  return [...letras].reduce((n, l) => n * 26 + l.charCodeAt(0) - 64, 0) - 1;
}

function planilhaXlsx(arquivos: Record<string, Uint8Array>): string {
  const ler = (caminho: string) => (arquivos[caminho] ? strFromU8(arquivos[caminho]) : '');
  const compartilhados = [...ler('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    decodificarXml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')),
  );
  const nomes = [...ler('xl/workbook.xml').matchAll(/<sheet\b[^>]*\bname="([^"]*)"/g)].map((m) => decodificarXml(m[1]));
  const folhas = Object.keys(arquivos)
    .filter((c) => /^xl\/worksheets\/sheet\d+\.xml$/.test(c))
    .sort((a, b) => numeroDaParte(a) - numeroDaParte(b));
  return folhas
    .map((caminho, i) => {
      const linhas = [...ler(caminho).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((linha) => {
        const celulas: string[] = [];
        for (const c of linha[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
          const atributos = c[1];
          const corpo = c[2] ?? '';
          const ref = /\br="([A-Z]+)\d+"/.exec(atributos)?.[1] ?? '';
          const tipo = /\bt="(\w+)"/.exec(atributos)?.[1];
          let valor = '';
          if (tipo === 'inlineStr') valor = decodificarXml([...corpo.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''));
          else {
            const v = /<v>([\s\S]*?)<\/v>/.exec(corpo)?.[1] ?? '';
            valor = tipo === 's' ? (compartilhados[Number(v)] ?? '') : decodificarXml(v);
          }
          celulas[ref ? colunaDe(ref) : celulas.length] = valor.replace(/\s+/g, ' ').trim();
        }
        return Array.from(celulas, (x) => x ?? '').join(' ; ');
      });
      const conteudo = linhas.filter((l) => l.replace(/[ ;]/g, '')).join('\n');
      return `Aba "${nomes[i] ?? `Planilha ${i + 1}`}":\n${conteudo || '(vazia)'}`;
    })
    .join('\n\n');
}

/** Texto de um arquivo do Office (DOCX, XLSX, PPTX) ou do LibreOffice (ODT, ODS, ODP). */
export function textoDoOffice(nome: string, bytes: Uint8Array): string {
  let arquivos: Record<string, Uint8Array>;
  try {
    arquivos = unzipSync(bytes);
  } catch {
    throw new ErroAnexo(`Não consegui abrir "${nome}". O arquivo pode estar corrompido ou protegido por senha.`);
  }
  const ler = (caminho: string) => (arquivos[caminho] ? strFromU8(arquivos[caminho]) : '');
  const ext = extensaoDe(nome);
  if (ext === 'docx') return textoDoXml(ler('word/document.xml'), /<\/w:p>|<w:br\/>/g, /<w:tab\/>/g);
  if (ext === 'xlsx') return planilhaXlsx(arquivos);
  if (ext === 'pptx') {
    return Object.keys(arquivos)
      .filter((c) => /^ppt\/slides\/slide\d+\.xml$/.test(c))
      .sort((a, b) => numeroDaParte(a) - numeroDaParte(b))
      .map((c, i) => `Slide ${i + 1}:\n${textoDoXml(ler(c), /<\/a:p>/g)}`)
      .join('\n\n');
  }
  // LibreOffice: tudo fica em content.xml
  const conteudo = ler('content.xml');
  if (ext === 'ods') {
    return textoDoXml(conteudo.replace(/<\/table:table-cell>/g, ' ; '), /<\/table:table-row>|<\/table:table>/g)
      .split('\n')
      .map((l) => l.replace(/(\s*;)+\s*$/, ''))
      .join('\n');
  }
  return textoDoXml(conteudo, /<\/text:p>|<\/text:h>|<text:line-break\/>/g, /<text:tab\/>/g);
}

/** Texto de um arquivo de texto, CSV ou Office, já cortado no limite. */
export function textoDoArquivo(nome: string, tipo: TipoAnexo, bytes: Uint8Array): string {
  const ext = extensaoDe(nome);
  let texto = OFFICE[ext] ? textoDoOffice(nome, bytes) : deTexto(bytes);
  if (ext === 'html' || ext === 'htm') texto = textoDoXml(texto.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ''), /<\/p>|<br\s*\/?>|<\/tr>|<\/li>|<\/h\d>/gi);
  texto = texto.replace(/\r\n?/g, '\n').trim();
  if (!texto) throw new ErroAnexo(`"${nome}" está vazio${tipo === 'documento' ? ' ou só tem imagens' : ''}.`);
  return texto.length > LIMITE_TEXTO_ANEXO ? `${texto.slice(0, LIMITE_TEXTO_ANEXO)}\n[... o arquivo continua, cortado aqui por ser muito grande]` : texto;
}

/** Confere o tamanho antes de mandar para o Gemini. */
export function conferirTamanho(nome: string, bytes: number): void {
  if (bytes > TAMANHO_MAXIMO_ARQUIVO) {
    const mb = (bytes / 1024 / 1024).toFixed(0);
    throw new ErroAnexo(`"${nome}" tem ${mb} MB. O limite é 10 MB: mande um arquivo menor (ou um vídeo mais curto).`);
  }
}
