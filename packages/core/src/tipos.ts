import type { Centavos } from './dinheiro';

export type CategoriaId =
  | 'cerveja'
  | 'destilado'
  | 'vinho'
  | 'refrigerante'
  | 'energetico'
  | 'cigarro'
  | 'gelo'
  | 'petisco'
  | 'outros';

export type FormaPagamento = 'pix' | 'credito' | 'debito' | 'dinheiro';

/** Como o produto chegou do fornecedor. */
export type Embalagem = 'unidade' | 'fardo';

export interface Produto {
  id: string;
  nome: string;
  categoria: CategoriaId;
  /** Preço de venda de UMA unidade. */
  precoVenda: Centavos;
  /** Custo médio de UMA unidade, recalculado a cada entrada. */
  custoMedio: Centavos;
  /** Quantidade em unidades (lata, garrafa, maço...). */
  estoque: number;
  /** Abaixo ou igual a isso o produto aparece no alerta de estoque baixo. */
  estoqueMinimo: number;
  codigoBarras?: string;
}

/** Compra de mercadoria: aumenta o estoque e gera uma despesa. */
export interface EntradaEstoque {
  id: string;
  /** Data e hora em ISO 8601. */
  data: string;
  produtoId: string;
  produtoNome: string;
  embalagem: Embalagem;
  quantidadeEmbalagens: number;
  unidadesPorEmbalagem: number;
  /** Total que entra no estoque (embalagens x unidades por embalagem). */
  unidades: number;
  custoPorEmbalagem: Centavos;
  custoUnitario: Centavos;
  custoTotal: Centavos;
  fornecedor?: string;
  formaPagamento: FormaPagamento;
}

export interface ItemVenda {
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  precoUnitario: Centavos;
  /** Custo médio no momento da venda, para calcular o lucro. */
  custoUnitario: Centavos;
}

export interface Pagamento {
  forma: FormaPagamento;
  valor: Centavos;
}

/** Venda: baixa o estoque e gera uma receita. */
export interface Venda {
  id: string;
  data: string;
  itens: ItemVenda[];
  total: Centavos;
  custoTotal: Centavos;
  /** Hoje é sempre uma forma só; a lista já deixa pronto o pagamento dividido. */
  pagamentos: Pagamento[];
  /** Só no dinheiro: quanto o cliente entregou e quanto voltou de troco. */
  valorRecebido?: Centavos;
  troco?: Centavos;
}

/** Linha do financeiro. Toda venda e toda entrada geram um lançamento. */
export interface Lancamento {
  id: string;
  data: string;
  tipo: 'receita' | 'despesa';
  origem: 'venda' | 'compra';
  descricao: string;
  valor: Centavos;
  formaPagamento: FormaPagamento;
  /** id da venda ou da entrada que gerou o lançamento. */
  referenciaId: string;
}

export interface Estado {
  produtos: Produto[];
  vendas: Venda[];
  entradas: EntradaEstoque[];
  lancamentos: Lancamento[];
}

export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string };
