import type { Centavos } from './dinheiro';
import type { Estado, FormaPagamento, Lancamento } from './tipos';
import { mesmoDia } from './util';

export interface ResumoDoDia {
  quantidadeVendas: number;
  /** Tudo que entrou com vendas. */
  faturamento: Centavos;
  /** Faturamento menos o custo do que foi vendido. */
  lucroBruto: Centavos;
  ticketMedio: Centavos;
  /** Tudo que saiu (compras de mercadoria). */
  despesas: Centavos;
  /** Entrou menos saiu. */
  saldo: Centavos;
  porFormaPagamento: Record<FormaPagamento, Centavos>;
}

export function resumoDoDia(estado: Estado, dia: Date = new Date()): ResumoDoDia {
  const vendas = estado.vendas.filter((v) => mesmoDia(new Date(v.data), dia));
  const lancamentos = estado.lancamentos.filter((l) => mesmoDia(new Date(l.data), dia));

  const porFormaPagamento: Record<FormaPagamento, Centavos> = { pix: 0, credito: 0, debito: 0, dinheiro: 0 };
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
