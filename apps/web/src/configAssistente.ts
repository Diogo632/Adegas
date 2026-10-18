/**
 * Configuração interna do Pop AI. Não aparece na tela: é feita aqui, no código,
 * por variáveis lidas na hora de montar o painel:
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
