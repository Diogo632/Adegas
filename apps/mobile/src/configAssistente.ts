import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface ConfigAssistente {
  chave: string;
  modelo: string;
}

const CHAVE_ARMAZENAMENTO = 'adegas.assistente';
const PADRAO: ConfigAssistente = { chave: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '', modelo: '' };

// No celular a chave fica no cofre do aparelho (SecureStore); na versão web, no navegador.
async function ler(): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(CHAVE_ARMAZENAMENTO) ?? null;
  return SecureStore.getItemAsync(CHAVE_ARMAZENAMENTO);
}

async function gravar(valor: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (valor) globalThis.localStorage?.setItem(CHAVE_ARMAZENAMENTO, valor);
    else globalThis.localStorage?.removeItem(CHAVE_ARMAZENAMENTO);
    return;
  }
  if (valor) await SecureStore.setItemAsync(CHAVE_ARMAZENAMENTO, valor);
  else await SecureStore.deleteItemAsync(CHAVE_ARMAZENAMENTO);
}

/** Chave do Gemini e modelo, guardados só neste aparelho. */
export function useConfigAssistente() {
  const [config, setConfig] = useState<ConfigAssistente>(PADRAO);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    ler()
      .then((texto) => {
        const salvo = texto ? (JSON.parse(texto) as Partial<ConfigAssistente>) : null;
        if (salvo) setConfig({ chave: salvo.chave || PADRAO.chave, modelo: salvo.modelo ?? '' });
      })
      .catch(() => undefined)
      .finally(() => setCarregado(true));
  }, []);

  const salvar = useCallback((nova: ConfigAssistente) => {
    const limpa = { chave: nova.chave.trim(), modelo: nova.modelo.trim() };
    setConfig(limpa);
    gravar(limpa.chave || limpa.modelo ? JSON.stringify(limpa) : null).catch(() => undefined);
  }, []);

  return { config, salvar, carregado };
}
