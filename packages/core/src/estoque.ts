import type { Centavos } from './dinheiro';
import { motivoAjuste } from './catalogos';
import { nomeDaMesa } from './comandas';
import type {
  AjusteEstoque,
  CategoriaId,
  Embalagem,
  EntradaEstoque,
  Estado,
  FormaPagamento,
  MotivoAjuste,
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
  /** Valor exato pago no total, quando se sabe (ex.: o valor do item na nota). */
  custoTotal?: Centavos;
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
  dados: Pick<DadosEntrada, 'embalagem' | 'quantidade' | 'unidadesPorEmbalagem' | 'custoPorEmbalagem' | 'custoTotal'>,
): PreviaEntrada {
  const porEmbalagem = dados.embalagem === 'fardo' ? Math.max(dados.unidadesPorEmbalagem ?? 0, 0) : 1;
  const quantidade = Math.max(dados.quantidade, 0);
  const unidades = quantidade * porEmbalagem;
  const custoTotal = dados.custoTotal ?? quantidade * Math.max(dados.custoPorEmbalagem, 0);
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
    .filter(
      (p) =>
        !busca || normalizar(p.nome).includes(busca) || p.codigoBarras === texto.trim() || (p.codigosBarras ?? []).includes(texto.trim()),
    )
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

// ---------- Tela de estoque ----------

export type StatusEstoque = 'ok' | 'baixo' | 'zerado';

export function statusEstoque(produto: Produto): StatusEstoque {
  if (produto.estoque <= 0) return 'zerado';
  if (produto.estoque <= produto.estoqueMinimo) return 'baixo';
  return 'ok';
}

export interface ResumoEstoque {
  produtos: number;
  unidades: number;
  /** Quanto custou o que está na prateleira. */
  valorCusto: Centavos;
  /** Quanto entra se vender tudo pelo preço atual. */
  valorVenda: Centavos;
  baixo: number;
  zerado: number;
}

export function resumoEstoque(produtos: Produto[]): ResumoEstoque {
  return produtos.reduce<ResumoEstoque>(
    (r, p) => {
      const unidades = Math.max(p.estoque, 0);
      const status = statusEstoque(p);
      return {
        produtos: r.produtos + 1,
        unidades: r.unidades + unidades,
        valorCusto: r.valorCusto + unidades * p.custoMedio,
        valorVenda: r.valorVenda + unidades * p.precoVenda,
        baixo: r.baixo + (status === 'baixo' ? 1 : 0),
        zerado: r.zerado + (status === 'zerado' ? 1 : 0),
      };
    },
    { produtos: 0, unidades: 0, valorCusto: 0, valorVenda: 0, baixo: 0, zerado: 0 },
  );
}

/** "baixo" mostra também os zerados: os dois precisam de reposição. */
export type FiltroEstoque = 'todos' | 'baixo' | 'zerado';

export function filtrarEstoque(
  produtos: Produto[],
  busca: string,
  filtro: FiltroEstoque,
  categoria?: CategoriaId | null,
): Produto[] {
  return buscarProdutos(produtos, busca, categoria).filter((p) => {
    const status = statusEstoque(p);
    if (filtro === 'zerado') return status === 'zerado';
    if (filtro === 'baixo') return status !== 'ok';
    return true;
  });
}

export interface DadosEdicaoProduto {
  nome: string;
  categoria: CategoriaId;
  precoVenda: Centavos;
  estoqueMinimo: number;
}

/** Muda nome, categoria, preço e mínimo. A quantidade só muda por venda, entrada ou ajuste. */
export function montarEdicaoProduto(estado: Estado, produtoId: string, dados: DadosEdicaoProduto): Resultado<Produto> {
  const produto = estado.produtos.find((p) => p.id === produtoId);
  if (!produto) return { ok: false, erro: 'Produto não encontrado.' };
  const nome = dados.nome.trim();
  if (!nome) return { ok: false, erro: 'Digite o nome do produto.' };
  if (estado.produtos.some((p) => p.id !== produtoId && normalizar(p.nome) === normalizar(nome))) {
    return { ok: false, erro: `Já existe outro produto chamado "${nome}".` };
  }
  if (!(dados.precoVenda > 0)) return { ok: false, erro: 'Informe o preço de venda.' };
  if (!Number.isInteger(dados.estoqueMinimo) || dados.estoqueMinimo < 0) {
    return { ok: false, erro: 'Estoque mínimo inválido.' };
  }
  return {
    ok: true,
    valor: { ...produto, nome, categoria: dados.categoria, precoVenda: dados.precoVenda, estoqueMinimo: dados.estoqueMinimo },
  };
}

export interface DadosAjuste {
  produtoId: string;
  motivo: MotivoAjuste;
  /** Perda e consumo: quantas unidades saíram. Contagem: quantas unidades foram contadas. */
  quantidade: number;
  observacao?: string;
}

export function montarAjuste(estado: Estado, dados: DadosAjuste, agora: Date = new Date()): Resultado<AjusteEstoque> {
  const produto = estado.produtos.find((p) => p.id === dados.produtoId);
  if (!produto) return { ok: false, erro: 'Produto não encontrado.' };
  if (!Number.isInteger(dados.quantidade) || dados.quantidade < 0) {
    return { ok: false, erro: 'Quantidade inválida.' };
  }

  let depois: number;
  if (dados.motivo === 'contagem') {
    if (dados.quantidade === produto.estoque) {
      return { ok: false, erro: 'A contagem é igual ao estoque do sistema; não há o que ajustar.' };
    }
    depois = dados.quantidade;
  } else {
    if (dados.quantidade < 1) return { ok: false, erro: 'Informe quantas unidades saíram.' };
    if (dados.quantidade > produto.estoque) {
      return { ok: false, erro: `Só há ${produto.estoque} no estoque. Se a prateleira tem outro número, use Contagem.` };
    }
    depois = produto.estoque - dados.quantidade;
  }

  const observacao = dados.observacao?.trim();
  return {
    ok: true,
    valor: {
      id: gerarId(),
      data: agora.toISOString(),
      produtoId: produto.id,
      produtoNome: produto.nome,
      motivo: dados.motivo,
      quantidadeAntes: produto.estoque,
      quantidadeDepois: depois,
      custoUnitario: produto.custoMedio,
      observacao: observacao || undefined,
    },
  };
}

export interface MovimentoProduto {
  id: string;
  data: string;
  tipo: 'venda' | 'entrada' | 'ajuste' | 'mesa';
  /** Positivo entrou, negativo saiu. */
  quantidade: number;
  descricao: string;
}

/** Tudo que mexeu no estoque de um produto, do mais recente para o mais antigo. */
export function movimentosDoProduto(estado: Estado, produtoId: string, limite = 20): MovimentoProduto[] {
  const movimentos: MovimentoProduto[] = [];
  for (const venda of estado.vendas) {
    for (const item of venda.itens) {
      if (item.produtoId === produtoId) {
        movimentos.push({
          id: `${venda.id}-${produtoId}-${item.precoUnitario}`,
          data: venda.data,
          tipo: 'venda',
          quantidade: -item.quantidade,
          descricao: venda.mesa ? `Conta da ${nomeDaMesa(venda.mesa)}` : 'Venda',
        });
      }
    }
  }
  // Pedidos de mesas ainda abertas: já saíram do estoque, viram venda quando a conta fechar.
  for (const comanda of estado.comandas) {
    if (comanda.situacao !== 'aberta') continue;
    for (const item of comanda.itens) {
      if (item.produtoId === produtoId) {
        movimentos.push({
          id: item.id,
          data: item.lancadoEm,
          tipo: 'mesa',
          quantidade: -item.quantidade,
          descricao: `${nomeDaMesa(comanda.mesa)} (conta aberta)`,
        });
      }
    }
  }
  for (const entrada of estado.entradas) {
    if (entrada.produtoId === produtoId) {
      movimentos.push({
        id: entrada.id,
        data: entrada.data,
        tipo: 'entrada',
        quantidade: entrada.unidades,
        descricao: entrada.fornecedor ? `Entrada · ${entrada.fornecedor}` : 'Entrada',
      });
    }
  }
  for (const ajuste of estado.ajustes) {
    if (ajuste.produtoId === produtoId) {
      movimentos.push({
        id: ajuste.id,
        data: ajuste.data,
        tipo: 'ajuste',
        quantidade: ajuste.quantidadeDepois - ajuste.quantidadeAntes,
        descricao: motivoAjuste(ajuste.motivo).nome + (ajuste.observacao ? ` · ${ajuste.observacao}` : ''),
      });
    }
  }
  return movimentos.sort((a, b) => b.data.localeCompare(a.data)).slice(0, limite);
}
