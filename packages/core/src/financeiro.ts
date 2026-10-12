import { CATEGORIAS_LANCAMENTO, categoriaLancamento } from './catalogos';
import type { Centavos } from './dinheiro';
import type {
  CategoriaLancamento,
  Estado,
  FormaPagamento,
  Lancamento,
  Resultado,
  TipoLancamento,
} from './tipos';
import { gerarId, mesmoDia } from './util';

export interface ResumoDoDia {
  quantidadeVendas: number;
  /** Tudo que entrou com vendas. */
  faturamento: Centavos;
  /** Faturamento menos o custo do que foi vendido. */
  lucroBruto: Centavos;
  ticketMedio: Centavos;
  /** Tudo que saiu (compras de mercadoria e outras despesas). */
  despesas: Centavos;
  /** Entrou menos saiu. */
  saldo: Centavos;
  porFormaPagamento: Record<FormaPagamento, Centavos>;
}

export function resumoDoDia(estado: Estado, dia: Date = new Date()): ResumoDoDia {
  const vendas = estado.vendas.filter((v) => mesmoDia(new Date(v.data), dia));
  const lancamentos = estado.lancamentos.filter((l) => mesmoDia(new Date(l.data), dia));

  const porFormaPagamento = formasZeradas();
  for (const venda of vendas) {
    for (const pagamento of venda.pagamentos) porFormaPagamento[pagamento.forma] += pagamento.valor;
  }

  const faturamento = vendas.reduce((s, v) => s + v.total, 0);
  const custoVendido = vendas.reduce((s, v) => s + v.custoTotal, 0);
  const despesas = lancamentos.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);

  return {
    quantidadeVendas: vendas.length,
    faturamento,
    lucroBruto: faturamento - custoVendido,
    ticketMedio: vendas.length ? Math.round(faturamento / vendas.length) : 0,
    despesas,
    saldo: faturamento - despesas,
    porFormaPagamento,
  };
}

export function ultimosLancamentos(estado: Estado, quantidade = 8): Lancamento[] {
  return [...estado.lancamentos].sort((a, b) => b.data.localeCompare(a.data)).slice(0, quantidade);
}

function formasZeradas(): Record<FormaPagamento, Centavos> {
  return { pix: 0, credito: 0, debito: 0, dinheiro: 0 };
}

// ---------- Períodos ----------

export type Periodo = 'hoje' | '7d' | '30d' | 'mes';

export const PERIODOS: { id: Periodo; nome: string }[] = [
  { id: 'hoje', nome: 'Hoje' },
  { id: '7d', nome: '7 dias' },
  { id: '30d', nome: '30 dias' },
  { id: 'mes', nome: 'Este mês' },
];

/** Do começo do primeiro dia até o fim de hoje (fim não incluso). */
export interface Intervalo {
  inicio: Date;
  fim: Date;
}

export function intervaloDoPeriodo(periodo: Periodo, agora: Date = new Date()): Intervalo {
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
  const diasAtras = (n: number) => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - n);
  switch (periodo) {
    case 'hoje':
      return { inicio: hoje, fim };
    case '7d':
      return { inicio: diasAtras(6), fim };
    case '30d':
      return { inicio: diasAtras(29), fim };
    case 'mes':
      return { inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1), fim };
  }
}

export function noIntervalo(iso: string, intervalo: Intervalo): boolean {
  const t = new Date(iso).getTime();
  return t >= intervalo.inicio.getTime() && t < intervalo.fim.getTime();
}

// ---------- Tela de financeiro ----------

export interface ResumoFinanceiro {
  /** Tudo que entrou (vendas + outras entradas). */
  receitas: Centavos;
  /** Tudo que saiu (mercadoria + contas da loja). */
  despesas: Centavos;
  saldo: Centavos;
  faturamento: Centavos;
  custoVendido: Centavos;
  lucroBruto: Centavos;
  quantidadeVendas: number;
  /** Entradas de dinheiro por forma de pagamento (para conferir caixa e maquininha). */
  recebidoPorForma: Record<FormaPagamento, Centavos>;
  /** Saídas agrupadas por categoria, da maior para a menor. */
  despesasPorCategoria: { categoria: CategoriaLancamento; nome: string; valor: Centavos }[];
  /** Custo do que se perdeu em quebras, vencidos e consumo próprio (não é saída de caixa). */
  perdas: Centavos;
}

export function resumoFinanceiro(estado: Estado, intervalo: Intervalo): ResumoFinanceiro {
  const lancamentos = estado.lancamentos.filter((l) => noIntervalo(l.data, intervalo));
  const vendas = estado.vendas.filter((v) => noIntervalo(v.data, intervalo));

  const recebidoPorForma = formasZeradas();
  const porCategoria = new Map<CategoriaLancamento, Centavos>();
  let receitas = 0;
  let despesas = 0;
  for (const l of lancamentos) {
    if (l.tipo === 'receita') {
      receitas += l.valor;
      recebidoPorForma[l.formaPagamento] += l.valor;
    } else {
      despesas += l.valor;
      porCategoria.set(l.categoria, (porCategoria.get(l.categoria) ?? 0) + l.valor);
    }
  }

  const faturamento = vendas.reduce((s, v) => s + v.total, 0);
  const custoVendido = vendas.reduce((s, v) => s + v.custoTotal, 0);
  const perdas = estado.ajustes
    .filter((a) => noIntervalo(a.data, intervalo) && a.motivo !== 'contagem')
    .reduce((s, a) => s + (a.quantidadeAntes - a.quantidadeDepois) * a.custoUnitario, 0);

  return {
    receitas,
    despesas,
    saldo: receitas - despesas,
    faturamento,
    custoVendido,
    lucroBruto: faturamento - custoVendido,
    quantidadeVendas: vendas.length,
    recebidoPorForma,
    despesasPorCategoria: [...porCategoria.entries()]
      .map(([categoria, valor]) => ({ categoria, nome: categoriaLancamento(categoria).nome, valor }))
      .sort((a, b) => b.valor - a.valor),
    perdas,
  };
}

export type FiltroLancamento = 'todos' | TipoLancamento;

export function lancamentosDoPeriodo(estado: Estado, intervalo: Intervalo, filtro: FiltroLancamento = 'todos'): Lancamento[] {
  return estado.lancamentos
    .filter((l) => noIntervalo(l.data, intervalo) && (filtro === 'todos' || l.tipo === filtro))
    .sort((a, b) => b.data.localeCompare(a.data));
}

export interface DadosLancamento {
  tipo: TipoLancamento;
  categoria: CategoriaLancamento;
  descricao: string;
  valor: Centavos;
  formaPagamento: FormaPagamento;
}

/** Despesa ou entrada lançada à mão (aluguel, luz, salário, outra entrada...). */
export function montarLancamento(dados: DadosLancamento, agora: Date = new Date()): Resultado<Lancamento> {
  const categoria = CATEGORIAS_LANCAMENTO.find((c) => c.id === dados.categoria);
  if (!categoria || categoria.automatica || categoria.tipo !== dados.tipo) {
    return { ok: false, erro: 'Escolha uma categoria.' };
  }
  if (!(dados.valor > 0)) return { ok: false, erro: 'Informe o valor.' };
  const descricao = dados.descricao.trim() || categoria.nome;
  return {
    ok: true,
    valor: {
      id: gerarId(),
      data: agora.toISOString(),
      tipo: dados.tipo,
      origem: 'manual',
      categoria: dados.categoria,
      descricao,
      valor: dados.valor,
      formaPagamento: dados.formaPagamento,
    },
  };
}
