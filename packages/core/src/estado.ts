import { formaPagamento } from './catalogos';
import type { AjusteEstoque, EntradaEstoque, Estado, Lancamento, Lembrete, Produto, Venda } from './tipos';
import { novoCustoMedio } from './estoque';

export type Acao =
  | { tipo: 'registrar-venda'; venda: Venda }
  | { tipo: 'registrar-entrada'; entrada: EntradaEstoque; produtoNovo?: Produto }
  | { tipo: 'editar-produto'; produto: Produto }
  | { tipo: 'ajustar-estoque'; ajuste: AjusteEstoque }
  | { tipo: 'registrar-lancamento'; lancamento: Lancamento }
  | { tipo: 'excluir-lancamento'; id: string }
  | { tipo: 'criar-lembrete'; lembrete: Lembrete }
  | { tipo: 'concluir-lembrete'; id: string; data: string }
  | { tipo: 'excluir-lembrete'; id: string };

export const ESTADO_VAZIO: Estado = { produtos: [], vendas: [], entradas: [], lancamentos: [], ajustes: [], lembretes: [] };

/**
 * Onde os dados da adega moram. Hoje é a memória do aparelho (React) ou um
 * arquivo (servidor MCP no computador); depois será o banco na nuvem. Tudo que
 * lê ou muda dados — telas e assistente — passa por aqui.
 */
export interface LojaAdega {
  /** Sempre o estado mais recente, já com as ações despachadas. */
  estado(): Estado;
  despachar(acao: Acao): void;
}

/** Loja simples na memória, para testes e para o servidor MCP. */
export function criarLojaNaMemoria(inicial: Estado, aoMudar?: (estado: Estado) => void): LojaAdega {
  let atual = inicial;
  return {
    estado: () => atual,
    despachar(acao) {
      atual = reducer(atual, acao);
      aoMudar?.(atual);
    },
  };
}

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
    case 'criar-lembrete':
      return { ...estado, lembretes: [...estado.lembretes, acao.lembrete] };
    case 'concluir-lembrete':
      return {
        ...estado,
        lembretes: estado.lembretes.map((l) => (l.id === acao.id ? { ...l, concluido: true, concluidoEm: acao.data } : l)),
      };
    case 'excluir-lembrete':
      return { ...estado, lembretes: estado.lembretes.filter((l) => l.id !== acao.id) };
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
