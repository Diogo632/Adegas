import type { Centavos } from './dinheiro';
import { formatarDinheiro } from './dinheiro';
import type { Estado, FormaPagamento, ItemVenda, Produto, Resultado, Venda } from './tipos';
import { gerarId } from './util';

export interface ItemCarrinho {
  produtoId: string;
  quantidade: number;
}

export interface DadosPagamento {
  forma: FormaPagamento;
  /** Só no dinheiro. Se ficar vazio, considera que o cliente pagou o valor exato. */
  valorRecebido?: Centavos | null;
}

export function quantidadeNoCarrinho(carrinho: ItemCarrinho[], produtoId: string): number {
  return carrinho.find((i) => i.produtoId === produtoId)?.quantidade ?? 0;
}

export function totalItens(carrinho: ItemCarrinho[]): number {
  return carrinho.reduce((soma, i) => soma + i.quantidade, 0);
}

/** Itens do carrinho com nome, preço e subtotal, prontos para mostrar na tela. */
export function itensDoCarrinho(produtos: Produto[], carrinho: ItemCarrinho[]) {
  return carrinho.flatMap((item) => {
    const produto = produtos.find((p) => p.id === item.produtoId);
    if (!produto) return [];
    return [{ produto, quantidade: item.quantidade, subtotal: produto.precoVenda * item.quantidade }];
  });
}

export function totalCarrinho(produtos: Produto[], carrinho: ItemCarrinho[]): Centavos {
  return itensDoCarrinho(produtos, carrinho).reduce((soma, i) => soma + i.subtotal, 0);
}

/** Muda a quantidade de um item sem passar do estoque. Quantidade 0 tira o item. */
export function alterarQuantidade(
  carrinho: ItemCarrinho[],
  produto: Produto,
  quantidade: number,
): ItemCarrinho[] {
  const nova = Math.max(0, Math.min(Math.floor(quantidade), produto.estoque));
  const resto = carrinho.filter((i) => i.produtoId !== produto.id);
  if (nova === 0) return resto;
  const existente = carrinho.findIndex((i) => i.produtoId === produto.id);
  const item = { produtoId: produto.id, quantidade: nova };
  if (existente === -1) return [...carrinho, item];
  return carrinho.map((i) => (i.produtoId === produto.id ? item : i));
}

/** Produtos que mais saíram (em unidades), para ficarem no topo da tela de venda. */
export function maisVendidos(estado: Estado, quantidade = 4): Produto[] {
  const vendidos = new Map<string, number>();
  for (const venda of estado.vendas) {
    for (const item of venda.itens) {
      vendidos.set(item.produtoId, (vendidos.get(item.produtoId) ?? 0) + item.quantidade);
    }
  }
  return estado.produtos
    .filter((p) => (vendidos.get(p.id) ?? 0) > 0)
    .sort((a, b) => (vendidos.get(b.id) ?? 0) - (vendidos.get(a.id) ?? 0))
    .slice(0, quantidade);
}

/** Notas que o cliente costuma entregar: valor exato e as próximas notas redondas. */
export function sugestoesDeValorRecebido(total: Centavos): Centavos[] {
  if (total <= 0) return [];
  const sugestoes = new Set<Centavos>([total]);
  for (const nota of [500, 1000, 2000, 5000, 10000, 20000]) {
    const arredondado = Math.ceil(total / nota) * nota;
    if (arredondado > total) sugestoes.add(arredondado);
    if (sugestoes.size >= 4) break;
  }
  return [...sugestoes].sort((a, b) => a - b);
}

/** Valida o carrinho e o pagamento e devolve a venda pronta. Não altera o estado. */
export function montarVenda(
  estado: Estado,
  carrinho: ItemCarrinho[],
  pagamento: DadosPagamento,
  agora: Date = new Date(),
): Resultado<Venda> {
  if (carrinho.length === 0) return { ok: false, erro: 'O carrinho está vazio.' };

  const itens: ItemVenda[] = [];
  for (const item of carrinho) {
    const produto = estado.produtos.find((p) => p.id === item.produtoId);
    if (!produto) return { ok: false, erro: 'Um produto do carrinho não existe mais.' };
    if (item.quantidade > produto.estoque) {
      return {
        ok: false,
        erro: `Estoque insuficiente de ${produto.nome}: restam ${produto.estoque}.`,
      };
    }
    itens.push({
      produtoId: produto.id,
      produtoNome: produto.nome,
      quantidade: item.quantidade,
      precoUnitario: produto.precoVenda,
      custoUnitario: produto.custoMedio,
    });
  }

  const total = itens.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0);
  const custoTotal = itens.reduce((s, i) => s + i.custoUnitario * i.quantidade, 0);

  let valorRecebido: Centavos | undefined;
  let troco: Centavos | undefined;
  if (pagamento.forma === 'dinheiro') {
    valorRecebido = pagamento.valorRecebido ?? total;
    if (valorRecebido < total) {
      return {
        ok: false,
        erro: `Valor recebido menor que o total. Faltam ${formatarDinheiro(total - valorRecebido)}.`,
      };
    }
    troco = valorRecebido - total;
  }

  return {
    ok: true,
    valor: {
      id: gerarId(),
      data: agora.toISOString(),
      itens,
      total,
      custoTotal,
      pagamentos: [{ forma: pagamento.forma, valor: total }],
      valorRecebido,
      troco,
    },
  };
}
