import type { CategoriaId, CategoriaLancamento, FormaPagamento, MotivoAjuste, TipoLancamento } from './tipos';

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

export interface InfoCategoriaLancamento {
  id: CategoriaLancamento;
  nome: string;
  tipo: TipoLancamento;
  /** Lançada sozinha pelo sistema (venda e compra de mercadoria); não aparece no formulário. */
  automatica?: boolean;
}

export const CATEGORIAS_LANCAMENTO: InfoCategoriaLancamento[] = [
  { id: 'vendas', nome: 'Vendas', tipo: 'receita', automatica: true },
  { id: 'outras-receitas', nome: 'Outras entradas', tipo: 'receita' },
  { id: 'mercadoria', nome: 'Compra de mercadoria', tipo: 'despesa', automatica: true },
  { id: 'aluguel', nome: 'Aluguel', tipo: 'despesa' },
  { id: 'contas', nome: 'Luz, água e internet', tipo: 'despesa' },
  { id: 'salarios', nome: 'Funcionários', tipo: 'despesa' },
  { id: 'impostos', nome: 'Impostos e taxas', tipo: 'despesa' },
  { id: 'manutencao', nome: 'Manutenção', tipo: 'despesa' },
  { id: 'outras-despesas', nome: 'Outras despesas', tipo: 'despesa' },
];

export function categoriaLancamento(id: CategoriaLancamento): InfoCategoriaLancamento {
  return CATEGORIAS_LANCAMENTO.find((c) => c.id === id) ?? CATEGORIAS_LANCAMENTO[CATEGORIAS_LANCAMENTO.length - 1];
}

export interface InfoMotivoAjuste {
  id: MotivoAjuste;
  nome: string;
  dica: string;
}

export const MOTIVOS_AJUSTE: InfoMotivoAjuste[] = [
  { id: 'perda', nome: 'Perda ou quebra', dica: 'Garrafa quebrada, produto vencido ou estragado.' },
  { id: 'consumo', nome: 'Consumo próprio', dica: 'Saiu do estoque sem venda (uso da casa, brinde).' },
  { id: 'contagem', nome: 'Contagem', dica: 'Contou a prateleira e o número é diferente do sistema.' },
];

export function motivoAjuste(id: MotivoAjuste): InfoMotivoAjuste {
  return MOTIVOS_AJUSTE.find((m) => m.id === id) ?? MOTIVOS_AJUSTE[0];
}

/**
 * Cores da marca, iguais no app e no web. Tema escuro: base quase preta,
 * cartões um tom acima e roxo escuro nos detalhes e na ação principal.
 */
export const CORES = {
  fundo: '#0B0A10',
  /** Menu lateral do web. */
  lateral: '#100E17',
  superficie: '#15131D',
  /** Campos, ícones e controles dentro dos cartões. */
  superficieAlta: '#1D1A28',
  /** Cartão de resumo (preto arroxeado). */
  destaqueFundo: '#1B1330',
  destaqueBorda: '#3A2766',
  borda: '#26222F',
  bordaForte: '#3B3548',
  texto: '#F5F3FA',
  textoSuave: '#A7A1B7',
  textoFraco: '#7A748C',
  /** Roxo escuro: ação principal e item selecionado. */
  primaria: '#6D28D9',
  primariaHover: '#7C3AED',
  /** Roxo claro para texto e ícones sobre o preto. */
  primariaClara: '#A78BFA',
  primariaSuave: '#231A38',
  grafico: '#8B5CF6',
  receita: '#34D399',
  receitaFundo: '#0E2A21',
  despesa: '#F87171',
  despesaFundo: '#2E1517',
  alerta: '#FBBF24',
  alertaFundo: '#2B2110',
};
