/**
 * Áudio no navegador (painel e app aberto no navegador): grava o microfone e
 * converte qualquer áudio que o navegador saiba tocar para WAV mono de 16 kHz,
 * um formato que o Gemini sempre aceita. Não usar no app nativo.
 */
import type { AudioParaEnviar } from './audio';
import { DURACAO_MAXIMA_GRAVACAO, TAXA_GRAVACAO, codificarWav, misturarEReamostrar, paraBase64, tipoDoAudio } from './audio';

/** O navegador deixa gravar? (pede HTTPS ou localhost, e um navegador recente) */
export function microfoneDisponivel(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

async function decodificar(bytes: ArrayBuffer): Promise<AudioBuffer> {
  // Decodificar num contexto de 16 kHz já devolve o áudio nessa taxa. Se o navegador
  // não aceitar essa taxa, decodifica na taxa dele e a conversão é feita à mão.
  try {
    return await new OfflineAudioContext(1, 1, TAXA_GRAVACAO).decodeAudioData(bytes.slice(0));
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === 'EncodingError') throw erro;
    const contexto = new AudioContext();
    try {
      return await contexto.decodeAudioData(bytes.slice(0));
    } finally {
      void contexto.close();
    }
  }
}

/** Qualquer áudio que o navegador toca (webm, ogg do WhatsApp, m4a, mp3...) → WAV mono 16 kHz. */
export async function paraWav(bytes: ArrayBuffer): Promise<{ dados: string; duracao: number }> {
  const audio = await decodificar(bytes);
  const canais = Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i));
  const amostras = misturarEReamostrar(canais, audio.sampleRate, TAXA_GRAVACAO);
  return { dados: paraBase64(codificarWav(amostras, TAXA_GRAVACAO)), duracao: audio.duration };
}

/** Arquivo escolhido pela pessoa → áudio para o Gemini. */
export async function arquivoParaAudio(arquivo: File): Promise<AudioParaEnviar> {
  const bytes = await arquivo.arrayBuffer();
  try {
    const { dados, duracao } = await paraWav(bytes);
    return { dados, mimeType: 'audio/wav', duracao, nome: arquivo.name };
  } catch {
    // O navegador não sabe abrir: manda como veio, se for um formato que o Gemini aceita.
    const tipo = tipoDoAudio(arquivo.name, arquivo.type);
    if (!tipo) throw new Error('Não consegui abrir esse arquivo. Mande um áudio em MP3, WAV, M4A ou o áudio do WhatsApp.');
    return { dados: paraBase64(new Uint8Array(bytes)), mimeType: tipo, nome: arquivo.name };
  }
}

function tipoDeGravacao(): string | undefined {
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported(t));
}

/** Explica por que o microfone não abriu. */
export function erroDeMicrofone(erro: unknown): string {
  const nome = erro instanceof DOMException ? erro.name : '';
  if (nome === 'NotAllowedError' || nome === 'SecurityError') {
    return 'O navegador não liberou o microfone. Clique no cadeado ao lado do endereço e permita o microfone.';
  }
  if (nome === 'NotFoundError') return 'Nenhum microfone encontrado neste aparelho.';
  return 'Não consegui usar o microfone agora.';
}

/**
 * Grava o microfone. `iniciar()` pede permissão e começa; `parar()` devolve o
 * áudio pronto; `cancelar()` descarta. Para sozinho em 5 minutos.
 */
export class GravadorNavegador {
  private gravador?: MediaRecorder;
  private fluxo?: MediaStream;
  private pedacos: Blob[] = [];
  private inicio = 0;
  private limite?: ReturnType<typeof setTimeout>;
  private aoLimite?: () => void;

  /** Chamado quando a gravação chega ao tempo máximo (a tela deve chamar parar()). */
  constructor(aoLimite?: () => void) {
    this.aoLimite = aoLimite;
  }

  get gravando(): boolean {
    return this.gravador?.state === 'recording';
  }

  get segundos(): number {
    return this.inicio ? (Date.now() - this.inicio) / 1000 : 0;
  }

  async iniciar(): Promise<void> {
    if (this.gravando) return;
    this.fluxo = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const tipo = tipoDeGravacao();
    this.gravador = new MediaRecorder(this.fluxo, tipo ? { mimeType: tipo, audioBitsPerSecond: 64000 } : undefined);
    this.pedacos = [];
    this.gravador.ondataavailable = (e) => {
      if (e.data.size) this.pedacos.push(e.data);
    };
    this.gravador.start(250);
    this.inicio = Date.now();
    this.limite = setTimeout(() => this.aoLimite?.(), DURACAO_MAXIMA_GRAVACAO * 1000);
  }

  private async encerrar(): Promise<Blob | null> {
    clearTimeout(this.limite);
    const gravador = this.gravador;
    this.gravador = undefined;
    this.inicio = 0;
    if (!gravador) return null;
    if (gravador.state !== 'inactive') {
      await new Promise<void>((pronto) => {
        gravador.addEventListener('stop', () => pronto(), { once: true });
        gravador.stop();
      });
    }
    this.fluxo?.getTracks().forEach((t) => t.stop());
    this.fluxo = undefined;
    return new Blob(this.pedacos, { type: gravador.mimeType });
  }

  async parar(): Promise<AudioParaEnviar | null> {
    const blob = await this.encerrar();
    if (!blob?.size) return null;
    const bytes = await blob.arrayBuffer();
    try {
      const { dados, duracao } = await paraWav(bytes);
      return { dados, mimeType: 'audio/wav', duracao };
    } catch {
      return { dados: paraBase64(new Uint8Array(bytes)), mimeType: tipoDoAudio(undefined, blob.type) ?? 'audio/webm' };
    }
  }

  cancelar(): void {
    void this.encerrar();
  }
}
