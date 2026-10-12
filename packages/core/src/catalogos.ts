import type { CategoriaId, FormaPagamento } from './tipos';

export interface Categoria {
  id: CategoriaId;
  nome: string;
  icone: string;
}

export const CATEGORIAS: Categoria[] = [
  { id: 'cerveja', nome: 'Cervejas', icone: '🍺' },
  { id: 'destilado', nome: 'Destilados', icone: '🥃' },
  { id: 'vinho', nome: 'Vinhos', icone: '🍷' },
  { id: 'refrigerante', nome: 'Refri e água', icone: '🥤' },
  { id: 'energetico', nome: 'Energéticos', icone: '⚡' },
  { id: 'cigarro', nome: 'Cigarros', icone: '🚬' },
  { id: 'gelo', nome: 'Gelo e carvão', icone: '🧊' },
  { id: 'petisco', nome: 'Petiscos', icone: '🥜' },
  { id: 'outros', nome: 'Outros', icone: '📦' },
];

export function categoria(id: CategoriaId): Categoria {
  return CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[CATEGORIAS.length - 1];
}

export interface InfoFormaPagamento {
  id: FormaPagamento;
  nome: string;
  icone: string;
  cor: string;
  /** Lembrete mostrado na tela de pagamento. */
  dica: string;
}

export const FORMAS_PAGAMENTO: InfoFormaPagamento[] = [
  {
    id: 'pix',
    nome: 'Pix',
    icone: '⚡',
    cor: '#0F9D8A',
    dica: 'Confira o Pix no app do banco antes de confirmar.',
  },
  {
    id: 'credito',
    nome: 'Crédito',
    icone: '💳',
    cor: '#2F5BD3',
    dica: 'Passe o cartão na maquininha e confirme quando aprovar.',
  },
  {
    id: 'debito',
    nome: 'Débito',
    icone: '💳',
    cor: '#7A3FC4',
    dica: 'Passe o cartão na maquininha e confirme quando aprovar.',
  },
  {
    id: 'dinheiro',
    nome: 'Dinheiro',
    icone: '💵',
    cor: '#2E8B3E',
    dica: 'Digite quanto o cliente entregou para calcular o troco.',
  },
];

export function formaPagamento(id: FormaPagamento): InfoFormaPagamento {
  return FORMAS_PAGAMENTO.find((f) => f.id === id) ?? FORMAS_PAGAMENTO[0];
}

/** Cores da marca, usadas igual no app e no web. */
export const CORES = {
  primaria: '#7A1F3D',
  primariaEscura: '#5C1530',
  destaque: '#E8A33D',
  fundo: '#F6F3EF',
  superficie: '#FFFFFF',
  texto: '#1F1A17',
  textoSuave: '#6B625C',
  borda: '#E4DDD5',
  receita: '#2E8B3E',
  despesa: '#C0392B',
  alerta: '#B7791F',
  alertaFundo: '#FDF3E1',
};
