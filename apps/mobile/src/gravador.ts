import type { AudioParaEnviar } from '@adegas/ia';
import { DURACAO_MAXIMA_GRAVACAO, TAXA_GRAVACAO, tipoDoAudio } from '@adegas/ia';
import type { RecordingOptions } from 'expo-audio';
import {
  AudioQuality,
  IOSOutputFormat,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { getDocumentAsync } from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';

/**
 * Gravação no celular. Formatos que o Gemini aceita direto: WAV no iPhone e
 * AAC no Android, mono, 16 kHz (o Gemini reduz para isso de qualquer forma).
 * Na versão web do app, quem grava é o gravador.web.ts.
 */
const GRAVACAO: RecordingOptions = {
  extension: '.wav',
  sampleRate: TAXA_GRAVACAO,
  numberOfChannels: 1,
  bitRate: 48000,
  android: { extension: '.aac', outputFormat: 'aac_adts', audioEncoder: 'aac' },
  ios: {
    extension: '.wav',
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {},
};

/** Arquivos maiores que isso passam do limite do Gemini (20 MB por pedido, já em base64). */
const TAMANHO_MAXIMO_ARQUIVO = 10 * 1024 * 1024;

export interface Gravador {
  /** O aparelho consegue gravar. */
  disponivel: boolean;
  gravando: boolean;
  segundos: number;
  /** Começa a gravar. Devolve o motivo, se não deu. */
  iniciar(): Promise<string | null>;
  parar(): Promise<AudioParaEnviar | null>;
  cancelar(): void;
}

async function lerEApagar(uri: string): Promise<string> {
  const arquivo = new File(uri);
  try {
    return await arquivo.base64();
  } finally {
    try {
      arquivo.delete();
    } catch {
      // Arquivo temporário: se não der para apagar, o sistema limpa depois.
    }
  }
}

/** `aoLimite` é chamado quando a gravação chega ao tempo máximo. */
export function useGravador(aoLimite: () => void): Gravador {
  const gravador = useAudioRecorder(GRAVACAO);
  const estado = useAudioRecorderState(gravador, 250);
  const [gravando, setGravando] = useState(false);
  const limite = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const chamarLimite = useRef(aoLimite);
  useEffect(() => {
    chamarLimite.current = aoLimite;
  });
  useEffect(() => () => clearTimeout(limite.current), []);

  async function encerrar(): Promise<{ uri: string | null; segundos: number }> {
    clearTimeout(limite.current);
    const segundos = gravador.getStatus().durationMillis / 1000;
    setGravando(false);
    await gravador.stop();
    await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    return { uri: gravador.uri, segundos };
  }

  return {
    disponivel: true,
    gravando,
    segundos: gravando ? estado.durationMillis / 1000 : 0,
    async iniciar() {
      const permissao = await requestRecordingPermissionsAsync();
      if (!permissao.granted) return 'Libere o microfone para o app nas configurações do celular.';
      try {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await gravador.prepareToRecordAsync();
        gravador.record();
        setGravando(true);
        limite.current = setTimeout(() => chamarLimite.current(), DURACAO_MAXIMA_GRAVACAO * 1000);
        return null;
      } catch {
        return 'Não consegui usar o microfone agora.';
      }
    },
    async parar() {
      const { uri, segundos } = await encerrar();
      if (!uri) return null;
      const mimeType = tipoDoAudio(uri) ?? 'audio/aac';
      return { dados: await lerEApagar(uri), mimeType, duracao: segundos };
    },
    cancelar() {
      void encerrar().then(({ uri }) => {
        if (uri) void lerEApagar(uri).catch(() => undefined);
      });
    },
  };
}

/** Escolhe um áudio salvo no celular (ex.: áudio do WhatsApp). null = desistiu. */
export async function escolherArquivoDeAudio(): Promise<AudioParaEnviar | null> {
  const r = await getDocumentAsync({ type: ['audio/*', 'application/ogg'], copyToCacheDirectory: true });
  if (r.canceled || !r.assets[0]) return null;
  const { uri, name, mimeType, size } = r.assets[0];
  const tipo = tipoDoAudio(name, mimeType);
  if (!tipo) throw new Error('Esse formato de áudio não serve. Mande MP3, WAV, M4A, AAC ou o áudio do WhatsApp.');
  if (size && size > TAMANHO_MAXIMO_ARQUIVO) throw new Error('Esse áudio é grande demais. Mande um áudio de até uns 10 minutos.');
  return { dados: await lerEApagar(uri), mimeType: tipo, nome: name };
}
