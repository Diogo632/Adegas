import { useCallback, useState } from 'react';

export interface ConfigAssistente {
  chave: string;
  modelo: string;
}

const CHAVE_ARMAZENAMENTO = 'adegas.assistente';

function ler(): ConfigAssistente {
  const padrao = { chave: import.meta.env.VITE_GEMINI_API_KEY ?? '', modelo: '' };
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_ARMAZENAMENTO) ?? 'null') as Partial<ConfigAssistente> | null;
    return { chave: salvo?.chave || padrao.chave, modelo: salvo?.modelo ?? '' };
  } catch {
    return padrao;
  }
}

/** Chave do Gemini e modelo, guardados só neste navegador. */
export function useConfigAssistente() {
  const [config, setConfig] = useState(ler);
  const salvar = useCallback((nova: ConfigAssistente) => {
    const limpa = { chave: nova.chave.trim(), modelo: nova.modelo.trim() };
    setConfig(limpa);
    try {
      if (limpa.chave || limpa.modelo) localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(limpa));
      else localStorage.removeItem(CHAVE_ARMAZENAMENTO);
    } catch {
      // Navegador sem armazenamento (aba anônima bloqueada): vale só até fechar a página.
    }
  }, []);
  return [config, salvar] as const;
}
