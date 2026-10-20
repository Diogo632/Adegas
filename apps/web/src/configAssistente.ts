import { useCallback, useState } from 'react';

/**
 * Configuração interna do Pop AI, feita no código por variáveis lidas na hora de
 * montar o painel:
 *
 *   VITE_GEMINI_API_KEY   chave da API do Gemini
 *   VITE_GEMINI_MODELO    modelo (opcional; sem ele vale o padrão do @adegas/ia)
 *
 * No computador, ficam no arquivo apps/web/.env.local (que não vai para o GitHub;
 * veja apps/web/.env.example). Na prévia do GitHub Pages, a chave vem do segredo
 * GEMINI_API_KEY do repositório.
 */
export const CONFIG_POP_AI = {
  chave: String(import.meta.env.VITE_GEMINI_API_KEY ?? '').trim(),
  modelo: String(import.meta.env.VITE_GEMINI_MODELO ?? '').trim(),
};

const CHAVE_DE_TESTE = 'pop-ai.chave-de-teste';

function lerChaveDeTeste(): string {
  try {
    return localStorage.getItem(CHAVE_DE_TESTE) ?? '';
  } catch {
    return '';
  }
}

/**
 * Enquanto a chave não está no código, dá para testar colando uma chave na tela
 * do Pop AI. Ela fica salva só neste navegador. Com chave no código, a da tela
 * é ignorada e o campo some.
 */
export function useConfigAssistente() {
  const [chaveDeTeste, setChaveDeTeste] = useState(lerChaveDeTeste);
  const salvarChaveDeTeste = useCallback((chave: string) => {
    const limpa = chave.trim();
    setChaveDeTeste(limpa);
    try {
      if (limpa) localStorage.setItem(CHAVE_DE_TESTE, limpa);
      else localStorage.removeItem(CHAVE_DE_TESTE);
    } catch {
      // Navegador sem armazenamento (aba anônima bloqueada): vale só até fechar a página.
    }
  }, []);
  const chaveNoCodigo = CONFIG_POP_AI.chave.length > 0;
  return {
    config: { chave: CONFIG_POP_AI.chave || chaveDeTeste, modelo: CONFIG_POP_AI.modelo },
    chaveNoCodigo,
    chaveDeTeste,
    salvarChaveDeTeste,
  };
}
