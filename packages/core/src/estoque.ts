import type { Centavos } from './dinheiro';
import type {
  CategoriaId,
  Embalagem,
  EntradaEstoque,
  Estado,
  FormaPagamento,
  Produto,
  Resultado,
} from './tipos';
import { gerarId, normalizar } from './util';

export interface DadosProdutoNovo {
  nome: string;
  categoria: CategoriaId;
  precoVenda: Centavos;
  estoqueMinimo: number;
}

/** O que a tela de entrada de produto coleta. */
export interface DadosEntrada {
  /** Produto já cadastrado... */
  produtoId?: string;
  /** ...ou um produto novo, cadastrado junto com a primeira entrada. */
  produtoNovo?: DadosProdutoNovo;
  embalagem: Embalagem;
  /** Quantos fardos (ou quantas unidades, se a embalagem for unidade). */
  quantidade: number;
  /** Só para fardo/caixa: quantas unidades vêm em cada um. */
  unidadesPorEmbalagem?: number;
  /** Quanto foi pago por fardo (ou por unidade). */
  custoPorEmbalagem: Centavos;
  fornecedor?: string;
  formaPagamento: FormaPagamento;
}

export interface PreviaEntrada {
  unidades: number;
  unidadesPorEmbalagem: number;
  custoUnitario: Centavos;
  custoTotal: Centavos;
}

/** Contas que a tela mostra enquanto a pessoa preenche. */
export function previaEntrada(
  dados: Pick<DadosEntrada, 'embalagem' | 'quantidade' | 'unidadesPorEmbalagem' | 'custoPorEmbalagem'>,
): PreviaEntrada {
  const porEmbalagem = dados.embalagem === 'fardo' ? Math.max(dados.unidadesPorEmbalagem ?? 0, 0) : 1;
  const quantidade = Math.max(dados.quantidade, 0);
  const unidades = quantidade * porEmbalagem;
  const custoTotal = quantidade * Math.max(dados.custoPorEmbalagem, 0);
  return {
    unidades,
    unidadesPorEmbalagem: porEmbalagem,
    custoUnitario: unidades > 0 ? Math.round(custoTotal / unidades) : 0,
    custoTotal,
  };
}

/** Margem sobre o preço de venda, em %: (preço - custo) / preço. */
export function margem(precoVenda: Centavos, custoUnitario: Centavos): number {
  if (precoVenda <= 0) return 0;
  return Math.round(((precoVenda - custoUnitario) / precoVenda) * 100);
}

/** Custo médio ponderado depois de uma compra. */
export function novoCustoMedio(produto: Produto, unidades: number, custoTotal: Centavos): Centavos {
  const estoqueAtual = Math.max(produto.estoque, 0);
  const totalUnidades = estoqueAtual + unidades;
  if (totalUnidades <= 0) return produto.custoMedio;
  return Math.round((estoqueAtual * produto.custoMedio + custoTotal) / totalUnidades);
}

/** Valida a entrada e devolve o que deve ser registrado. Não altera o estado. */
export function montarEntrada(
  estado: Estado,
  dados: DadosEntrada,
  agora: Date = new Date(),
): Resultado<{ entrada: EntradaEstoque; produtoNovo?: Produto }> {
  let produto: Produto | undefined;
  let produtoNovo: Produto | undefined;

  if (dados.produtoId) {
    produto = estado.produtos.find((p) => p.id === dados.produtoId);
    if (!produto) return { ok: false, erro: 'Produto não encontrado.' };
  } else if (dados.produtoNovo) {
    const novo = dados.produtoNovo;
    const nome = novo.nome.trim();
    if (!nome) return { ok: false, erro: 'Digite o nome do produto.' };
    if (estado.produtos.some((p) => normalizar(p.nome) === normalizar(nome))) {
      return { ok: false, erro: `"${nome}" já está cadastrado. Escolha ele na lista.` };
    }
    if (!(novo.precoVenda > 0)) return { ok: false, erro: 'Informe o preço de venda.' };
    if (!Number.isInteger(novo.estoqueMinimo) || novo.estoqueMinimo < 0) {
      return { ok: false, erro: 'Estoque mínimo inválido.' };
    }
    produtoNovo = {
      id: gerarId(),
      nome,
      categoria: novo.categoria,
      precoVenda: novo.precoVenda,
      custoMedio: 0,
      estoque: 0,
      estoqueMinimo: novo.estoqueMinimo,
    };
    produto = produtoNovo;
  } else {
    return { ok: false, erro: 'Escolha um produto ou cadastre um novo.' };
  }

  if (!Number.isInteger(dados.quantidade) || dados.quantidade < 1) {
    return { ok: false, erro: 'A quantidade precisa ser pelo menos 1.' };
  }
  if (
    dados.embalagem === 'fardo' &&
    (!Number.isInteger(dados.unidadesPorEmbalagem) || (dados.unidadesPorEmbalagem ?? 0) < 2)
  ) {
    return { ok: false, erro: 'Informe quantas unidades vêm no fardo/caixa.' };
  }
  if (!(dados.custoPorEmbalagem >= 0)) return { ok: false, erro: 'Informe o custo.' };

  const previa = previaEntrada(dados);
  const fornecedor = dados.fornecedor?.trim();

  return {
    ok: true,
    valor: {
      produtoNovo,
      entrada: {
        id: gerarId(),
        data: agora.toISOString(),
        produtoId: produto.id,
        produtoNome: produto.nome,
        embalagem: dados.embalagem,
        quantidadeEmbalagens: dados.quantidade,
        unidadesPorEmbalagem: previa.unidadesPorEmbalagem,
        unidades: previa.unidades,
        custoPorEmbalagem: dados.custoPorEmbalagem,
        custoUnitario: previa.custoUnitario,
        custoTotal: previa.custoTotal,
        fornecedor: fornecedor || undefined,
        formaPagamento: dados.formaPagamento,
      },
    },
  };
}

export function estoqueBaixo(produtos: Produto[]): Produto[] {
  return produtos
    .filter((p) => p.estoque <= p.estoqueMinimo)
    .sort((a, b) => a.estoque - a.estoqueMinimo - (b.estoque - b.estoqueMinimo));
}

export function buscarProdutos(
  produtos: Produto[],
  texto: string,
  categoria?: CategoriaId | null,
): Produto[] {
  const busca = normalizar(texto);
  return produtos
    .filter((p) => !categoria || p.categoria === categoria)
    .filter((p) => !busca || normalizar(p.nome).includes(busca) || p.codigoBarras === texto.trim())
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
