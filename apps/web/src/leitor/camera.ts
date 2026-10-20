/**
 * Leitor de código de barras pela câmera do navegador (computador ou celular).
 * Lê o código de barras do DANFE (chave de acesso da nota), o QR Code da NFC-e e
 * o código de barras dos produtos. Usa o leitor do próprio navegador quando existe
 * (Chrome no Android) e, nos outros (iPhone, computador), o ZXing em WebAssembly,
 * servido junto com o painel.
 */
import { BarcodeDetector as LeitorZxing, setZXingModuleOverrides } from 'barcode-detector/ponyfill';
import enderecoDoWasm from 'zxing-wasm/reader/zxing_reader.wasm?url';

setZXingModuleOverrides({
  locateFile: (caminho: string, prefixo: string) => (caminho.endsWith('.wasm') ? enderecoDoWasm : prefixo + caminho),
});

const FORMATOS = ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf', 'qr_code'];

interface Detector {
  detect(fonte: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

async function criarDetector(): Promise<Detector> {
  const Nativo = (globalThis as { BarcodeDetector?: { new (o: { formats: string[] }): Detector; getSupportedFormats(): Promise<string[]> } })
    .BarcodeDetector;
  if (Nativo) {
    try {
      const suportados = await Nativo.getSupportedFormats();
      if (suportados.includes('code_128') && suportados.includes('ean_13')) {
        return new Nativo({ formats: FORMATOS.filter((f) => suportados.includes(f)) });
      }
    } catch {
      // Sem o leitor do navegador: vai o ZXing.
    }
  }
  return new LeitorZxing({ formats: FORMATOS as never });
}

/** Navegador com câmera (precisa de HTTPS, como na prévia do GitHub Pages). */
export function cameraDisponivel(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/** Explica por que a câmera não abriu. */
export function erroDeCamera(erro: unknown): string {
  const nome = erro instanceof DOMException ? erro.name : '';
  if (nome === 'NotAllowedError' || nome === 'SecurityError') {
    return 'O navegador não liberou a câmera. Toque no cadeado ao lado do endereço e permita a câmera.';
  }
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError') return 'Nenhuma câmera encontrada neste aparelho.';
  if (!cameraDisponivel()) return 'Este navegador não deixa usar a câmera aqui (o endereço precisa ser https).';
  return 'Não consegui abrir a câmera.';
}

let contextoDeSom: AudioContext | undefined;

/** "Bip" e vibração, como num leitor de supermercado. */
export function bipar(ok = true): void {
  try {
    contextoDeSom ??= new AudioContext();
    const osc = contextoDeSom.createOscillator();
    const volume = contextoDeSom.createGain();
    osc.frequency.value = ok ? 1760 : 440;
    volume.gain.value = 0.08;
    osc.connect(volume).connect(contextoDeSom.destination);
    osc.start();
    osc.stop(contextoDeSom.currentTime + (ok ? 0.09 : 0.25));
  } catch {
    // Sem som: tudo bem.
  }
  navigator.vibrate?.(ok ? 60 : [60, 60, 60]);
}

/**
 * Liga a câmera num <video> e chama `aoLer` a cada código novo. O mesmo código
 * só é lido de novo depois de 2,5 segundos (para não bipar 20 vezes a mesma nota).
 */
export class LeitorDeCamera {
  private fluxo?: MediaStream;
  private parado = true;
  private ultimo = { valor: '', quando: 0 };
  private detector?: Promise<Detector>;
  private aoLer: (valor: string) => void;

  constructor(aoLer: (valor: string) => void) {
    this.aoLer = aoLer;
  }

  async iniciar(video: HTMLVideoElement): Promise<void> {
    this.detector ??= criarDetector();
    this.fluxo = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    });
    video.srcObject = this.fluxo;
    video.setAttribute('playsinline', 'true');
    video.muted = true;
    await video.play();
    this.parado = false;
    void this.procurar(video);
  }

  private async procurar(video: HTMLVideoElement): Promise<void> {
    const detector = await this.detector!;
    while (!this.parado) {
      if (video.readyState >= 2) {
        try {
          for (const { rawValue } of await detector.detect(video)) {
            const valor = rawValue.trim();
            const agora = Date.now();
            if (!valor || (valor === this.ultimo.valor && agora - this.ultimo.quando < 2500)) continue;
            this.ultimo = { valor, quando: agora };
            this.aoLer(valor);
          }
        } catch {
          // Quadro ruim: tenta o próximo.
        }
      }
      await new Promise((r) => setTimeout(r, 180));
    }
  }

  /** Lanterna do celular (nem todo aparelho deixa). Devolve se ligou. */
  async lanterna(ligar: boolean): Promise<boolean> {
    const trilha = this.fluxo?.getVideoTracks()[0];
    try {
      await trilha?.applyConstraints({ advanced: [{ torch: ligar } as MediaTrackConstraintSet] });
      return ligar;
    } catch {
      return false;
    }
  }

  parar(): void {
    this.parado = true;
    this.fluxo?.getTracks().forEach((t) => t.stop());
    this.fluxo = undefined;
  }
}
