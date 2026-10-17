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
  /** Venda que veio do fechamento da conta de uma mesa. */
  comandaId?: string;
  mesa?: string;
}

export type TipoLancamento = 'receita' | 'despesa';

export type CategoriaLancamento =
  | 'vendas'
  | 'outras-receitas'
  | 'mercadoria'
  | 'aluguel'
  | 'contas'
  | 'salarios'
  | 'impostos'
  | 'manutencao'
  | 'outras-despesas';

/**
 * Linha do financeiro. Toda venda e toda entrada de mercadoria geram uma
 * automaticamente; as demais (aluguel, luz, salário...) são lançadas à mão.
 */
export interface Lancamento {
  id: string;
  data: string;
  tipo: TipoLancamento;
  origem: 'venda' | 'compra' | 'manual';
  categoria: CategoriaLancamento;
  descricao: string;
  valor: Centavos;
  formaPagamento: FormaPagamento;
  /** id da venda ou da entrada que gerou o lançamento (não existe nos manuais). */
  referenciaId?: string;
}

/** Por que o estoque foi corrigido à mão. */
export type MotivoAjuste = 'perda' | 'consumo' | 'contagem';

/** Correção de estoque sem venda nem compra: quebra, consumo próprio ou contagem. */
export interface AjusteEstoque {
  id: string;
  data: string;
  produtoId: string;
  produtoNome: string;
  motivo: MotivoAjuste;
  quantidadeAntes: number;
  quantidadeDepois: number;
  /** Custo médio na hora do ajuste, para saber quanto foi perdido. */
  custoUnitario: Centavos;
  observacao?: string;
}

/** Algo para não esquecer: pagar boleto, pedir gelo, conferir validade... */
export interface Lembrete {
  id: string;
  texto: string;
  /** Quando avisar, em ISO 8601. */
  quando: string;
  criadoEm: string;
  concluido: boolean;
  concluidoEm?: string;
  /** Lembrete ligado a um produto (ex.: "repor Skol"). */
  produtoId?: string;
  produtoNome?: string;
}

/** Um pedido lançado na conta da mesa. Sai do estoque na hora em que é lançado. */
export interface ItemComanda {
  id: string;
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  /** Preço na hora do pedido (se o preço mudar depois, a conta não muda). */
  precoUnitario: Centavos;
  custoUnitario: Centavos;
  lancadoEm: string;
}

/**
 * Conta de uma mesa (comanda): o cliente senta, os pedidos vão sendo lançados
 * e, no fim, a conta é fechada de uma vez com a forma de pagamento.
 */
export interface Comanda {
  id: string;
  /** "10", "Balcão", "João"... */
  mesa: string;
  abertaEm: string;
  situacao: 'aberta' | 'fechada' | 'cancelada';
  itens: ItemComanda[];
  fechadaEm?: string;
  /** Venda gerada ao fechar. */
  vendaId?: string;
}

export interface Estado {
  produtos: Produto[];
  vendas: Venda[];
  entradas: EntradaEstoque[];
  lancamentos: Lancamento[];
  ajustes: AjusteEstoque[];
  lembretes: Lembrete[];
  comandas: Comanda[];
}

export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string };
