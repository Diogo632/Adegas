import { formaPagamento } from './catalogos';
import type { EntradaEstoque, Estado, Lancamento, Produto, Venda } from './tipos';
import { novoCustoMedio } from './estoque';

export type Acao =
  | { tipo: 'registrar-venda'; venda: Venda }
  | { tipo: 'registrar-entrada'; entrada: EntradaEstoque; produtoNovo?: Produto };

export const ESTADO_VAZIO: Estado = { produtos: [], vendas: [], entradas: [], lancamentos: [] };

/**
 * Único lugar onde o estado muda. App e web usam o mesmo reducer, então
 * uma venda baixa o estoque e lança no financeiro do mesmo jeito nos dois.
 */
export function reducer(estado: Estado, acao: Acao): Estado {
  switch (acao.tipo) {
    case 'registrar-venda':
      return aplicarVenda(estado, acao.venda);
    case 'registrar-entrada':
      return aplicarEntrada(estado, acao.entrada, acao.produtoNovo);
  }
}

function aplicarVenda(estado: Estado, venda: Venda): Estado {
  const vendidos = new Map(venda.itens.map((i) => [i.produtoId, i.quantidade]));
  const qtdItens = venda.itens.reduce((s, i) => s + i.quantidade, 0);

  const lancamentos: Lancamento[] = venda.pagamentos.map((pagamento) => ({
    id: `${venda.id}-${pagamento.forma}`,
    data: venda.data,
    tipo: 'receita',
    origem: 'venda',
    descricao: `Venda · ${qtdItens} ${qtdItens === 1 ? 'item' : 'itens'} · ${formaPagamento(pagamento.forma).nome}`,
    valor: pagamento.valor,
    formaPagamento: pagamento.forma,
    referenciaId: venda.id,
  }));

  return {
    ...estado,
    produtos: estado.produtos.map((p) =>
      vendidos.has(p.id) ? { ...p, estoque: p.estoque - (vendidos.get(p.id) ?? 0) } : p,
    ),
    vendas: [venda, ...estado.vendas],
    lancamentos: [...lancamentos, ...estado.lancamentos],
  };
}

function aplicarEntrada(estado: Estado, entrada: EntradaEstoque, produtoNovo?: Produto): Estado {
  const produtos = produtoNovo ? [...estado.produtos, produtoNovo] : estado.produtos;

  const lancamento: Lancamento = {
    id: entrada.id,
    data: entrada.data,
    tipo: 'despesa',
    origem: 'compra',
    descricao: `Compra · ${entrada.produtoNome} (+${entrada.unidades} un)`,
    valor: entrada.custoTotal,
    formaPagamento: entrada.formaPagamento,
    referenciaId: entrada.id,
  };

  return {
    ...estado,
    produtos: produtos.map((p) =>
      p.id === entrada.produtoId
        ? {
            ...p,
            custoMedio: novoCustoMedio(p, entrada.unidades, entrada.custoTotal),
            estoque: p.estoque + entrada.unidades,
          }
        : p,
    ),
    entradas: [entrada, ...estado.entradas],
    lancamentos: [lancamento, ...estado.lancamentos],
  };
}
