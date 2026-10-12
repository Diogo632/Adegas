import { formaPagamento } from './catalogos';
import type { AjusteEstoque, EntradaEstoque, Estado, Lancamento, Produto, Venda } from './tipos';
import { novoCustoMedio } from './estoque';

export type Acao =
  | { tipo: 'registrar-venda'; venda: Venda }
  | { tipo: 'registrar-entrada'; entrada: EntradaEstoque; produtoNovo?: Produto }
  | { tipo: 'editar-produto'; produto: Produto }
  | { tipo: 'ajustar-estoque'; ajuste: AjusteEstoque }
  | { tipo: 'registrar-lancamento'; lancamento: Lancamento }
  | { tipo: 'excluir-lancamento'; id: string };

export const ESTADO_VAZIO: Estado = { produtos: [], vendas: [], entradas: [], lancamentos: [], ajustes: [] };

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
    case 'editar-produto':
      return {
        ...estado,
        produtos: estado.produtos.map((p) => (p.id === acao.produto.id ? acao.produto : p)),
      };
    case 'ajustar-estoque':
      return {
        ...estado,
        produtos: estado.produtos.map((p) =>
          p.id === acao.ajuste.produtoId ? { ...p, estoque: acao.ajuste.quantidadeDepois } : p,
        ),
        ajustes: [acao.ajuste, ...estado.ajustes],
      };
    case 'registrar-lancamento':
      return { ...estado, lancamentos: [acao.lancamento, ...estado.lancamentos] };
    case 'excluir-lancamento':
      // Só os lançados à mão podem sair; vendas e compras têm estoque ligado a elas.
      return {
        ...estado,
        lancamentos: estado.lancamentos.filter((l) => !(l.id === acao.id && l.origem === 'manual')),
      };
  }
}

function aplicarVenda(estado: Estado, venda: Venda): Estado {
  const vendidos = new Map(venda.itens.map((i) => [i.produtoId, i.quantidade]));
  const lancamentos = lancamentosDaVenda(venda);

  return {
    ...estado,
    produtos: estado.produtos.map((p) =>
      vendidos.has(p.id) ? { ...p, estoque: p.estoque - (vendidos.get(p.id) ?? 0) } : p,
    ),
    vendas: [venda, ...estado.vendas],
    lancamentos: [...lancamentos, ...estado.lancamentos],
  };
}

export function lancamentosDaVenda(venda: Venda): Lancamento[] {
  const qtdItens = venda.itens.reduce((s, i) => s + i.quantidade, 0);
  return venda.pagamentos.map((pagamento) => ({
    id: `${venda.id}-${pagamento.forma}`,
    data: venda.data,
    tipo: 'receita',
    origem: 'venda',
    categoria: 'vendas',
    descricao: `Venda · ${qtdItens} ${qtdItens === 1 ? 'item' : 'itens'} · ${formaPagamento(pagamento.forma).nome}`,
    valor: pagamento.valor,
    formaPagamento: pagamento.forma,
    referenciaId: venda.id,
  }));
}

export function lancamentoDaEntrada(entrada: EntradaEstoque): Lancamento {
  return {
    id: entrada.id,
    data: entrada.data,
    tipo: 'despesa',
    origem: 'compra',
    categoria: 'mercadoria',
    descricao: `Compra · ${entrada.produtoNome} (+${entrada.unidades} un)`,
    valor: entrada.custoTotal,
    formaPagamento: entrada.formaPagamento,
    referenciaId: entrada.id,
  };
}

function aplicarEntrada(estado: Estado, entrada: EntradaEstoque, produtoNovo?: Produto): Estado {
  const produtos = produtoNovo ? [...estado.produtos, produtoNovo] : estado.produtos;
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
    lancamentos: [lancamentoDaEntrada(entrada), ...estado.lancamentos],
  };
}
