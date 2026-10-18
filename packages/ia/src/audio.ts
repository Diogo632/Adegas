/**
 * Áudio para o Pop AI: o que o app e o painel mandam para o Gemini transcrever.
 * Só código puro aqui (roda no navegador, no React Native e no Node).
 */

/** Áudio pronto para mandar ao Gemini. */
export interface AudioParaEnviar {
  /** Conteúdo do arquivo em base64. */
  dados: string;
  /** Tipo do arquivo, num dos formatos que o Gemini aceita (audio/wav, audio/ogg...). */
  mimeType: string;
  /** Duração em segundos, quando se sabe. */
  duracao?: number;
  /** Nome do arquivo, quando o áudio veio de um arquivo (ex.: áudio do WhatsApp). */
  nome?: string;
}

/** Gravação para no máximo em 5 minutos. */
export const DURACAO_MAXIMA_GRAVACAO = 5 * 60;

/** O Gemini aceita até 20 MB por pedido; em base64 o arquivo cresce 1/3. Dá uns 10 MB de áudio. */
export const TAMANHO_MAXIMO_AUDIO = 14 * 1024 * 1024;

/** Resposta da transcrição quando o áudio não tem fala. */
export const SEM_FALA = '[sem fala]';

/** Taxa de amostragem das gravações: o Gemini reduz o áudio a 16 kHz de qualquer forma. */
export const TAXA_GRAVACAO = 16000;

const POR_EXTENSAO: Record<string, string> = {
  wav: 'audio/wav',
  mp3: 'audio/mp3',
  aif: 'audio/aiff',
  aiff: 'audio/aiff',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  webm: 'audio/webm',
  weba: 'audio/webm',
};

const POR_TIPO: Record<string, string> = {
  'audio/wav': 'audio/wav',
  'audio/wave': 'audio/wav',
  'audio/x-wav': 'audio/wav',
  'audio/mp3': 'audio/mp3',
  'audio/mpeg': 'audio/mp3',
  'audio/aiff': 'audio/aiff',
  'audio/x-aiff': 'audio/aiff',
  'audio/aac': 'audio/aac',
  'audio/x-aac': 'audio/aac',
  'audio/ogg': 'audio/ogg',
  'audio/opus': 'audio/ogg',
  'audio/flac': 'audio/flac',
  'audio/x-flac': 'audio/flac',
  'audio/mp4': 'audio/mp4',
  'audio/m4a': 'audio/mp4',
  'audio/x-m4a': 'audio/mp4',
  'audio/webm': 'audio/webm',
};

/**
 * Tipo do áudio para o Gemini, pela extensão do arquivo (ou pelo tipo informado).
 * Ex.: "PTT-20261012.opus" (WhatsApp) → audio/ogg. Formato desconhecido → null.
 */
export function tipoDoAudio(nome?: string, mimeType?: string): string | null {
  const extensao = /\.([a-z0-9]+)$/i.exec(nome ?? '')?.[1]?.toLowerCase();
  if (extensao && POR_EXTENSAO[extensao]) return POR_EXTENSAO[extensao];
  const tipo = mimeType?.split(';')[0].trim().toLowerCase();
  return (tipo && POR_TIPO[tipo]) || null;
}

/** "0:07", "1:42" */
export function formatarDuracao(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function paraBase64(bytes: Uint8Array): string {
  const partes: string[] = [];
  let pedaco = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    pedaco +=
      LETRAS[(n >> 18) & 63] +
      LETRAS[(n >> 12) & 63] +
      (i + 1 < bytes.length ? LETRAS[(n >> 6) & 63] : '=') +
      (i + 2 < bytes.length ? LETRAS[n & 63] : '=');
    // Junta em pedaços para não montar uma string enorme letra a letra.
    if (pedaco.length >= 8192) {
      partes.push(pedaco);
      pedaco = '';
    }
  }
  partes.push(pedaco);
  return partes.join('');
}

/** Amostras de um canal (de −1 a 1) → arquivo WAV de 16 bits. */
export function codificarWav(amostras: Float32Array, taxa: number): Uint8Array {
  const bytesDados = amostras.length * 2;
  const saida = new Uint8Array(44 + bytesDados);
  const v = new DataView(saida.buffer);
  const texto = (posicao: number, s: string) => [...s].forEach((c, i) => v.setUint8(posicao + i, c.charCodeAt(0)));
  texto(0, 'RIFF');
  v.setUint32(4, 36 + bytesDados, true);
  texto(8, 'WAVE');
  texto(12, 'fmt ');
  v.setUint32(16, 16, true); // tamanho do bloco fmt
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, taxa, true);
  v.setUint32(28, taxa * 2, true); // bytes por segundo
  v.setUint16(32, 2, true); // bytes por amostra
  v.setUint16(34, 16, true); // bits por amostra
  texto(36, 'data');
  v.setUint32(40, bytesDados, true);
  for (let i = 0; i < amostras.length; i++) {
    const x = Math.max(-1, Math.min(1, amostras[i]));
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
  }
  return saida;
}

/** Junta os canais num só (média) e muda a taxa de amostragem (interpolação linear). */
export function misturarEReamostrar(canais: Float32Array[], taxaOrigem: number, taxaDestino: number): Float32Array {
  const tamanho = canais[0]?.length ?? 0;
  const mono = new Float32Array(tamanho);
  for (const canal of canais) for (let i = 0; i < tamanho; i++) mono[i] += canal[i] / canais.length;
  if (taxaOrigem === taxaDestino || tamanho === 0) return mono;
  const razao = taxaOrigem / taxaDestino;
  const saida = new Float32Array(Math.floor(tamanho / razao));
  for (let i = 0; i < saida.length; i++) {
    const posicao = i * razao;
    const j = Math.floor(posicao);
    const fracao = posicao - j;
    saida[i] = mono[j] * (1 - fracao) + (mono[Math.min(j + 1, tamanho - 1)] ?? 0) * fracao;
  }
  return saida;
}
