import type { CategoriaId, FormaPagamento } from './tipos';

export interface Categoria {
  id: CategoriaId;
  nome: string;
}

export const CATEGORIAS: Categoria[] = [
  { id: 'cerveja', nome: 'Cervejas' },
  { id: 'destilado', nome: 'Destilados' },
  { id: 'vinho', nome: 'Vinhos' },
  { id: 'refrigerante', nome: 'Refri e água' },
  { id: 'energetico', nome: 'Energéticos' },
  { id: 'cigarro', nome: 'Cigarros' },
  { id: 'gelo', nome: 'Gelo e carvão' },
  { id: 'petisco', nome: 'Petiscos' },
  { id: 'outros', nome: 'Outros' },
];

export function categoria(id: CategoriaId): Categoria {
  return CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[CATEGORIAS.length - 1];
}

export interface InfoFormaPagamento {
  id: FormaPagamento;
  nome: string;
  /** Lembrete mostrado na tela de pagamento. */
  dica: string;
}

export const FORMAS_PAGAMENTO: InfoFormaPagamento[] = [
  { id: 'pix', nome: 'Pix', dica: 'Confira o Pix no app do banco antes de confirmar.' },
  { id: 'credito', nome: 'Crédito', dica: 'Passe o cartão na maquininha e confirme quando aprovar.' },
  { id: 'debito', nome: 'Débito', dica: 'Passe o cartão na maquininha e confirme quando aprovar.' },
  { id: 'dinheiro', nome: 'Dinheiro', dica: 'Digite quanto o cliente entregou para calcular o troco.' },
];

export function formaPagamento(id: FormaPagamento): InfoFormaPagamento {
  return FORMAS_PAGAMENTO.find((f) => f.id === id) ?? FORMAS_PAGAMENTO[0];
}

/**
 * Cores da marca, iguais no app e no web. Base neutra (off-white e grafite);
 * o vinho fica reservado para a ação principal de cada tela.
 */
export const CORES = {
  fundo: '#F7F5F2',
  superficie: '#FFFFFF',
  superficieSuave: '#F1EDE8',
  borda: '#E8E2DB',
  texto: '#1C1917',
  textoSuave: '#6F6863',
  textoFraco: '#A39B94',
  /** Grafite: cartão de resumo e item selecionado. */
  tinta: '#1C1917',
  tintaTexto: '#C9C2BB',
  primaria: '#6B1D33',
  primariaEscura: '#541628',
  primariaSuave: '#F4EAED',
  receita: '#2F7D4F',
  receitaFundo: '#EAF4EE',
  despesa: '#B4362E',
  despesaFundo: '#FBECEA',
  alerta: '#9A5B0F',
  alertaFundo: '#FAF3E6',
};
