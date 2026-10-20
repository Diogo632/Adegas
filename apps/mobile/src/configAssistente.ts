import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Configuração interna do Pop AI, feita no código por variáveis lidas na hora de
 * montar o app:
 *
 *   EXPO_PUBLIC_GEMINI_API_KEY   chave da API do Gemini
 *   EXPO_PUBLIC_GEMINI_MODELO    modelo (opcional; sem ele vale o padrão do @adegas/ia)
 *
 * No computador, ficam no arquivo apps/mobile/.env.local (que não vai para o GitHub;
 * veja apps/mobile/.env.example). Na prévia do GitHub Pages, a chave vem do segredo
 * GEMINI_API_KEY do repositório.
 */
export const CONFIG_POP_AI = {
  chave: (process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '').trim(),
  modelo: (process.env.EXPO_PUBLIC_GEMINI_MODELO ?? '').trim(),
};

const CHAVE_DE_TESTE = 'pop-ai.chave-de-teste';

// Chave de teste: no celular fica no cofre do aparelho (SecureStore); na versão web, no navegador.
async function ler(): Promise<string> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(CHAVE_DE_TESTE) ?? '';
  return (await SecureStore.getItemAsync(CHAVE_DE_TESTE)) ?? '';
}

async function gravar(valor: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (valor) globalThis.localStorage?.setItem(CHAVE_DE_TESTE, valor);
    else globalThis.localStorage?.removeItem(CHAVE_DE_TESTE);
    return;
  }
  if (valor) await SecureStore.setItemAsync(CHAVE_DE_TESTE, valor);
  else await SecureStore.deleteItemAsync(CHAVE_DE_TESTE);
}

/**
 * Enquanto a chave não está no código, dá para testar colando uma chave na tela
 * do Pop AI. Ela fica salva só neste aparelho. Com chave no código, a da tela é
 * ignorada e o campo some.
 */
export function useConfigAssistente() {
  const [chaveDeTeste, setChaveDeTeste] = useState('');
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    ler()
      .then(setChaveDeTeste)
      .catch(() => undefined)
      .finally(() => setCarregado(true));
  }, []);

  const salvarChaveDeTeste = useCallback((chave: string) => {
    const limpa = chave.trim();
    setChaveDeTeste(limpa);
    gravar(limpa).catch(() => undefined);
  }, []);

  const chaveNoCodigo = CONFIG_POP_AI.chave.length > 0;
  return {
    config: { chave: CONFIG_POP_AI.chave || chaveDeTeste, modelo: CONFIG_POP_AI.modelo },
    chaveNoCodigo,
    chaveDeTeste,
    salvarChaveDeTeste,
    carregado,
  };
}
