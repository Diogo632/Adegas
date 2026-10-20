import type { AudioPlayer } from 'expo-audio';
import { createAudioPlayer } from 'expo-audio';
import { Vibration } from 'react-native';

const sons: { ok?: AudioPlayer; erro?: AudioPlayer } = {};

/** "Bip" e vibração, como num leitor de supermercado: agudo deu certo, grave precisa de atenção. */
export function bipar(ok = true): void {
  try {
    const som = ok
      ? (sons.ok ??= createAudioPlayer(require('../assets/bip-ok.wav')))
      : (sons.erro ??= createAudioPlayer(require('../assets/bip-erro.wav')));
    void som.seekTo(0);
    som.play();
  } catch {
    // Sem som: a vibração já avisa.
  }
  Vibration.vibrate(ok ? 60 : [0, 60, 60, 60]);
}
