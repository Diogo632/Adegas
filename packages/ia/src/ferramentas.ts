import { z } from 'zod';
import {
  CATEGORIAS,
  CATEGORIAS_LANCAMENTO,
  categoria,
  categoriaLancamento,
  estoqueBaixo,
  filtrarEstoque,
  formaPagamento,
  formatarDataHora,
  formatarDinheiro,
  formatarQuando,
  intervaloDoPeriodo,
  lancamentosDoPeriodo,
  lembretesPendentes,
  margem,
  montarAjuste,
  montarEdicaoProduto,
  montarEntrada,
  montarLancamento,
  montarLembrete,
  montarVenda,
  motivoAjuste,
  movimentosDoProduto,
  noIntervalo,
  normalizar,
  relatorioVendas,
  resumoDoDia,
  resumoEstoque,
  resumoFinanceiro,
  situacaoLembrete,
  statusEstoque,
} from '@adegas/core';
import type {
  CategoriaId,
  CategoriaLancamento,
  Centavos,
  Estado,
  FormaPagamento,
  Intervalo,
  Lembrete,
  LojaAdega,
  Produto,
} from '@adegas/core';

/** Erro que vai de volta para o modelo como resposta da ferramenta (ele explica para a pessoa). */
export class ErroFerramenta extends Error {}

export interface ContextoFerramenta {
  loja: LojaAdega;
  agora: () => Date;
}

/** Uma ação da plataforma que o assistente (ou qualquer cliente MCP) pode usar. */
export interface FerramentaAdega {
  nome: string;
  titulo: string;
  descricao: string;
  entrada: z.ZodObject;
  /** Só lê dados; não muda nada. */
  somenteLeitura: boolean;
  executar(args: unknown, contexto: ContextoFerramenta): Record<string, unknown>;
}

function definir<S extends z.ZodObject>(f: {
  nome: string;
  titulo: string;
  descricao: string;
  entrada: S;
  somenteLeitura: boolean;
  executar(args: z.output<S>, contexto: ContextoFerramenta): Record<string, unknown>;
}): FerramentaAdega {
  return f as unknown as FerramentaAdega;
}

// ---------- Esquemas reaproveitados ----------

const IDS_CATEGORIA = CATEGORIAS.map((c) => c.id) as [CategoriaId, ...CategoriaId[]];
const CATEGORIAS_MANUAIS = CATEGORIAS_LANCAMENTO.filter((c) => !c.automatica);
const IDS_CATEGORIA_LANCAMENTO = CATEGORIAS_MANUAIS.map((c) => c.id) as [CategoriaLancamento, ...CategoriaLancamento[]];
const IDS_FORMA = ['pix', 'credito', 'debito', 'dinheiro'] as const;

const listar = (itens: { id: string; nome: string }[]) => itens.map((i) => `${i.id} = ${i.nome}`).join('; ');

const esquemaProduto = z
  .string()
  .min(1)
  .describe('Nome do produto (pode ser parte do nome, ex.: "skol", "heineken") ou o id.');
const esquemaCategoria = z.enum(IDS_CATEGORIA).describe(`Categoria do produto: ${listar(CATEGORIAS)}.`);
const esquemaForma = z.enum(IDS_FORMA).describe('Forma de pagamento: pix, credito, debito ou dinheiro.');
const esquemaReais = (descricao: string) => z.number().positive().describe(`${descricao} Em reais, ex.: 38.9`);

const esquemaPeriodo = {
  periodo: z
    .enum(['hoje', '7d', '30d', 'mes'])
    .optional()
    .describe('Período: hoje, 7d (últimos 7 dias), 30d (últimos 30 dias) ou mes (este mês). Padrão: mes.'),
  inicio: z
    .string()
    .optional()
    .describe('Para um período específico: primeiro dia, no formato AAAA-MM-DD. Tem prioridade sobre "periodo".'),
  fim: z.string().optional().describe('Último dia (incluso), no formato AAAA-MM-DD. Padrão: hoje.'),
};

// ---------- Ajudantes ----------

const reais = (valor: Centavos) => formatarDinheiro(valor);
const paraCentavos = (valor: number) => Math.round(valor * 100);

const SITUACAO = { ok: 'em dia', baixo: 'abaixo do mínimo', zerado: 'sem estoque' } as const;

function resumoProduto(p: Produto) {
  return {
    id: p.id,
    nome: p.nome,
    categoria: categoria(p.categoria).nome,
    estoque: p.estoque,
    estoque_minimo: p.estoqueMinimo,
    situacao: SITUACAO[statusEstoque(p)],
    preco_venda: reais(p.precoVenda),
    custo_medio: reais(p.custoMedio),
    margem: `${margem(p.precoVenda, p.custoMedio)}%`,
  };
}

/**
 * Busca tolerante: "skol" acha "Skol Lata 350ml" e "brahma 350" acha "Brahma Lata 350ml".
 * Com "aproximado", também acha quem tem só alguma das palavras ("heineken 600" → Heineken Long Neck):
 * bom para listar, perigoso para registrar.
 */
function buscarPorNome(produtos: Produto[], termo: string, aproximado = false): Produto[] {
  const busca = normalizar(termo);
  if (!busca) return produtos;
  const contem = produtos.filter((p) => normalizar(p.nome).includes(busca) || p.codigoBarras === termo.trim());
  if (contem.length) return contem;
  const palavras = busca.split(/\s+/).filter((w) => w.length >= 2);
  const todas = produtos.filter((p) => palavras.every((w) => normalizar(p.nome).includes(w)));
  if (todas.length || !aproximado) return todas;
  return produtos.filter((p) => palavras.some((w) => w.length >= 3 && normalizar(p.nome).includes(w)));
}

function acharProduto(estado: Estado, termo: string): Produto {
  const texto = termo.trim();
  const porId = estado.produtos.find((p) => p.id === texto);
  if (porId) return porId;
  const exato = estado.produtos.find((p) => normalizar(p.nome) === normalizar(texto));
  if (exato) return exato;
  const achados = buscarPorNome(estado.produtos, texto);
  if (achados.length === 1) return achados[0];
  if (achados.length === 0) {
    const parecidos = buscarPorNome(estado.produtos, texto, true).slice(0, 5);
    throw new ErroFerramenta(
      `Nenhum produto cadastrado se chama "${texto}".` +
        (parecidos.length ? ` Parecidos: ${parecidos.map((p) => `${p.nome} (id ${p.id})`).join('; ')}.` : ''),
    );
  }
  throw new ErroFerramenta(
    `Mais de um produto combina com "${texto}": ${achados
      .slice(0, 8)
      .map((p) => `${p.nome} (id ${p.id})`)
      .join('; ')}. Pergunte à pessoa qual é e use o id.`,
  );
}

/** "menos de 1 dia", "cerca de 6 dias" ou "sem vendas nos últimos 30 dias". */
function duracaoDoEstoque(estoque: number, mediaDia: number): string {
  if (estoque <= 0) return 'acabou';
  if (mediaDia <= 0) return 'sem vendas nos últimos 30 dias';
  const dias = estoque / mediaDia;
  if (dias < 1) return 'menos de 1 dia';
  const inteiro = Math.floor(dias);
  return `cerca de ${inteiro} ${inteiro === 1 ? 'dia' : 'dias'}`;
}

function dataLocal(texto: string, campo: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto.trim());
  const data = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(NaN);
  if (!m || Number.isNaN(data.getTime()) || data.getDate() !== Number(m[3])) {
    throw new ErroFerramenta(`"${campo}" precisa estar no formato AAAA-MM-DD.`);
  }
  return data;
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');
const diaCurto = (d: Date) => `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()}`;

function intervaloDosArgs(
  args: { periodo?: 'hoje' | '7d' | '30d' | 'mes'; inicio?: string; fim?: string },
  agora: Date,
): { intervalo: Intervalo; descricao: string } {
  if (args.inicio) {
    const inicio = dataLocal(args.inicio, 'inicio');
    const ultimo = args.fim ? dataLocal(args.fim, 'fim') : new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    if (ultimo < inicio) throw new ErroFerramenta('"fim" não pode ser antes de "inicio".');
    const fim = new Date(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate() + 1);
    return { intervalo: { inicio, fim }, descricao: `de ${diaCurto(inicio)} a ${diaCurto(ultimo)}` };
  }
  const periodo = args.periodo ?? 'mes';
  const nomes = { hoje: 'hoje', '7d': 'últimos 7 dias', '30d': 'últimos 30 dias', mes: 'este mês' };
  return { intervalo: intervaloDoPeriodo(periodo, agora), descricao: nomes[periodo] };
}

function porForma(valores: Record<FormaPagamento, Centavos>) {
  return Object.fromEntries(IDS_FORMA.map((f) => [formaPagamento(f).nome, reais(valores[f])]));
}

function resumoLembrete(l: Lembrete, agora: Date) {
  const situacao = situacaoLembrete(l, agora);
  return {
    id: l.id,
    texto: l.texto,
    quando: formatarQuando(l.quando, agora),
    situacao: { atrasado: 'atrasado', hoje: 'hoje', proximo: 'próximo', concluido: 'concluído' }[situacao],
    produto: l.produtoNome,
  };
}

function acharLembrete(estado: Estado, termo: string): Lembrete {
  const texto = termo.trim();
  const porId = estado.lembretes.find((l) => l.id === texto);
  if (porId) return porId;
  const achados = estado.lembretes.filter((l) => !l.concluido && normalizar(l.texto).includes(normalizar(texto)));
  if (achados.length === 1) return achados[0];
  if (achados.length === 0) throw new ErroFerramenta(`Nenhum lembrete pendente combina com "${texto}".`);
  throw new ErroFerramenta(
    `Mais de um lembrete combina com "${texto}": ${achados.map((l) => `${l.texto} (id ${l.id})`).join('; ')}. Use o id.`,
  );
}

/** "2026-10-13T10:00" no horário do aparelho. */
function dataHoraLocal(texto: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(texto.trim());
  if (!m) throw new ErroFerramenta('"quando" precisa estar no formato AAAA-MM-DDTHH:MM.');
  const data = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 9), Number(m[5] ?? 0));
  if (Number.isNaN(data.getTime()) || data.getDate() !== Number(m[3])) {
    throw new ErroFerramenta('Data do lembrete inválida.');
  }
  return data;
}

function confirmar<T>(resultado: { ok: true; valor: T } | { ok: false; erro: string }): T {
  if (!resultado.ok) throw new ErroFerramenta(resultado.erro);
  return resultado.valor;
}

// ---------- Ferramentas ----------

export const FERRAMENTAS: FerramentaAdega[] = [
  // ----- Estoque -----
  definir({
    nome: 'buscar_produtos',
    titulo: 'Buscar produtos',
    descricao:
      'Lista produtos do estoque com quantidade, mínimo, situação, preço e custo. Filtra por nome, categoria e situação (baixo inclui os sem estoque).',
    somenteLeitura: true,
    entrada: z.object({
      busca: z.string().optional().describe('Parte do nome. Vazio lista todos.'),
      categoria: esquemaCategoria.optional(),
      situacao: z.enum(['todos', 'baixo', 'zerado']).optional().describe('todos (padrão), baixo ou zerado.'),
    }),
    executar(args, { loja }) {
      const estado = loja.estado();
      const porNome = args.busca ? buscarPorNome(estado.produtos, args.busca, true) : estado.produtos;
      const lista = filtrarEstoque(porNome, '', args.situacao ?? 'todos', args.categoria);
      return {
        total: lista.length,
        produtos: lista.slice(0, 40).map(resumoProduto),
        ...(lista.length > 40 ? { observacao: 'Mostrando 40. Refine a busca.' } : {}),
      };
    },
  }),

  definir({
    nome: 'consultar_produto',
    titulo: 'Consultar produto',
    descricao:
      'Tudo sobre um produto: estoque atual, mínimo, preço, custo, quanto vendeu nos últimos 30 dias, para quantos dias o estoque dá e as últimas movimentações.',
    somenteLeitura: true,
    entrada: z.object({ produto: esquemaProduto }),
    executar(args, { loja, agora }) {
      const estado = loja.estado();
      const p = acharProduto(estado, args.produto);
      const ultimos30 = intervaloDoPeriodo('30d', agora());
      const vendidos = estado.vendas
        .filter((v) => noIntervalo(v.data, ultimos30))
        .reduce((s, v) => s + v.itens.filter((i) => i.produtoId === p.id).reduce((t, i) => t + i.quantidade, 0), 0);
      const mediaDia = vendidos / 30;
      return {
        ...resumoProduto(p),
        valor_em_estoque_pelo_custo: reais(Math.max(p.estoque, 0) * p.custoMedio),
        vendidos_ultimos_30_dias: vendidos,
        media_vendida_por_dia: Math.round(mediaDia * 10) / 10,
        estoque_dura: duracaoDoEstoque(p.estoque, mediaDia),
        ultimas_movimentacoes: movimentosDoProduto(estado, p.id, 8).map((m) => ({
          quando: formatarDataHora(m.data, agora()),
          tipo: m.tipo,
          quantidade: m.quantidade,
          descricao: m.descricao,
        })),
        lembretes: lembretesPendentes(estado)
          .filter((l) => l.produtoId === p.id)
          .map((l) => resumoLembrete(l, agora())),
      };
    },
  }),

  definir({
    nome: 'resumo_estoque',
    titulo: 'Resumo do estoque',
    descricao: 'Visão geral do estoque: total de produtos e unidades, valor parado em estoque e o que precisa repor.',
    somenteLeitura: true,
    entrada: z.object({}),
    executar(_args, { loja }) {
      const estado = loja.estado();
      const r = resumoEstoque(estado.produtos);
      return {
        produtos: r.produtos,
        unidades: r.unidades,
        valor_pelo_custo: reais(r.valorCusto),
        valor_pelo_preco_de_venda: reais(r.valorVenda),
        abaixo_do_minimo: r.baixo,
        sem_estoque: r.zerado,
        precisam_repor: estoqueBaixo(estado.produtos).map((p) => ({
          nome: p.nome,
          estoque: p.estoque,
          minimo: p.estoqueMinimo,
          situacao: SITUACAO[statusEstoque(p)],
        })),
      };
    },
  }),

  definir({
    nome: 'registrar_entrada',
    titulo: 'Registrar entrada',
    descricao:
      'Registra a chegada de mercadoria (compra): soma no estoque, recalcula o custo médio e lança a despesa no financeiro. ' +
      'Se o custo não for informado, usa o custo médio atual do produto. Se o produto não existir, só cadastra se vier "novo_produto".',
    somenteLeitura: false,
    entrada: z.object({
      produto: esquemaProduto,
      embalagem: z.enum(['unidade', 'fardo']).describe('unidade (avulso) ou fardo (fardo, caixa, pacote).'),
      quantidade: z.number().int().min(1).describe('Quantos fardos ou quantas unidades chegaram.'),
      unidades_por_fardo: z
        .number()
        .int()
        .min(2)
        .optional()
        .describe('Só para fardo: unidades em cada fardo. Se faltar, usa o da última entrada em fardo do produto.'),
      custo: esquemaReais('Quanto custou CADA fardo (se embalagem=fardo) ou CADA unidade (se embalagem=unidade).').optional(),
      fornecedor: z.string().optional(),
      forma_pagamento: esquemaForma.optional().describe('Como a compra foi paga. Padrão: pix.'),
      novo_produto: z
        .object({
          categoria: esquemaCategoria,
          preco_venda: esquemaReais('Preço de venda de UMA unidade.'),
          estoque_minimo: z.number().int().min(0).optional().describe('Abaixo disso avisa para repor. Padrão: 0.'),
        })
        .optional()
        .describe('Só quando o produto ainda não está cadastrado: dados para cadastrar junto com a entrada.'),
    }),
    executar(args, { loja, agora }) {
      const estado = loja.estado();
      const observacoes: string[] = [];
      let produto: Produto | undefined;
      try {
        produto = acharProduto(estado, args.produto);
      } catch (erro) {
        const naoAchou = buscarPorNome(estado.produtos, args.produto).length === 0;
        if (!naoAchou) throw erro;
        if (!args.novo_produto) {
          throw new ErroFerramenta(
            `${(erro as Error).message} Se for um desses, use o id. Se for um produto novo, pergunte a categoria e o preço de venda ` +
              'e chame de novo com "novo_produto".',
          );
        }
      }

      let unidadesPorFardo = args.unidades_por_fardo;
      if (args.embalagem === 'fardo' && !unidadesPorFardo && produto) {
        unidadesPorFardo = estado.entradas.find((e) => e.produtoId === produto.id && e.embalagem === 'fardo')?.unidadesPorEmbalagem;
        if (unidadesPorFardo) observacoes.push(`Fardo com ${unidadesPorFardo} unidades, como na última compra.`);
      }
      if (args.embalagem === 'fardo' && !unidadesPorFardo) {
        throw new ErroFerramenta('Quantas unidades vêm em cada fardo? Pergunte e chame de novo com "unidades_por_fardo".');
      }

      let custo = args.custo !== undefined ? paraCentavos(args.custo) : undefined;
      if (custo === undefined) {
        if (!produto || produto.custoMedio <= 0) throw new ErroFerramenta('Informe o custo da compra.');
        custo = produto.custoMedio * (args.embalagem === 'fardo' ? (unidadesPorFardo ?? 1) : 1);
        observacoes.push(`Custo não informado: usei o custo médio atual (${reais(produto.custoMedio)} a unidade).`);
      }

      const { entrada, produtoNovo } = confirmar(
        montarEntrada(
          estado,
          {
            produtoId: produto?.id,
            produtoNovo:
              !produto && args.novo_produto
                ? {
                    nome: args.produto.trim(),
                    categoria: args.novo_produto.categoria,
                    precoVenda: paraCentavos(args.novo_produto.preco_venda),
                    estoqueMinimo: args.novo_produto.estoque_minimo ?? 0,
                  }
                : undefined,
            embalagem: args.embalagem,
            quantidade: args.quantidade,
            unidadesPorEmbalagem: unidadesPorFardo,
            custoPorEmbalagem: custo,
            fornecedor: args.fornecedor,
            formaPagamento: args.forma_pagamento ?? 'pix',
          },
          agora(),
        ),
      );
      const antes = produto?.estoque ?? 0;
      loja.despachar({ tipo: 'registrar-entrada', entrada, produtoNovo });
      const depois = loja.estado().produtos.find((p) => p.id === entrada.produtoId);
      if (produtoNovo) observacoes.push('Produto cadastrado agora.');

      return {
        registrado: true,
        produto: entrada.produtoNome,
        entrou_unidades: entrada.unidades,
        embalagem:
          entrada.embalagem === 'fardo'
            ? `${entrada.quantidadeEmbalagens} fardo(s) de ${entrada.unidadesPorEmbalagem}`
            : `${entrada.quantidadeEmbalagens} unidade(s)`,
        custo_total: reais(entrada.custoTotal),
        custo_por_unidade: reais(entrada.custoUnitario),
        estoque_antes: antes,
        estoque_agora: depois?.estoque,
        custo_medio_agora: depois ? reais(depois.custoMedio) : undefined,
        forma_pagamento: formaPagamento(entrada.formaPagamento).nome,
        fornecedor: entrada.fornecedor,
        despesa_lancada_no_financeiro: reais(entrada.custoTotal),
        observacoes,
      };
    },
  }),

  definir({
    nome: 'ajustar_estoque',
    titulo: 'Ajustar estoque',
    descricao:
      'Corrige o estoque sem venda nem compra. motivo=perda (quebra, vencido) ou consumo (uso da casa): "quantidade" é quanto SAIU. ' +
      'motivo=contagem: "quantidade" é o total contado na prateleira.',
    somenteLeitura: false,
    entrada: z.object({
      produto: esquemaProduto,
      motivo: z.enum(['perda', 'consumo', 'contagem']),
      quantidade: z.number().int().min(0),
      observacao: z.string().optional().describe('Ex.: "garrafa quebrou no balcão".'),
    }),
    executar(args, { loja, agora }) {
      const estado = loja.estado();
      const produto = acharProduto(estado, args.produto);
      const ajuste = confirmar(
        montarAjuste(estado, { produtoId: produto.id, motivo: args.motivo, quantidade: args.quantidade, observacao: args.observacao }, agora()),
      );
      loja.despachar({ tipo: 'ajustar-estoque', ajuste });
      const saiu = ajuste.quantidadeAntes - ajuste.quantidadeDepois;
      return {
        registrado: true,
        produto: produto.nome,
        motivo: motivoAjuste(ajuste.motivo).nome,
        estoque_antes: ajuste.quantidadeAntes,
        estoque_agora: ajuste.quantidadeDepois,
        ...(args.motivo !== 'contagem' ? { prejuizo_pelo_custo: reais(saiu * ajuste.custoUnitario) } : {}),
      };
    },
  }),

  definir({
    nome: 'editar_produto',
    titulo: 'Editar produto',
    descricao: 'Muda nome, categoria, preço de venda ou estoque mínimo de um produto. A quantidade muda só por entrada, venda ou ajuste.',
    somenteLeitura: false,
    entrada: z.object({
      produto: esquemaProduto,
      novo_nome: z.string().optional(),
      categoria: esquemaCategoria.optional(),
      preco_venda: esquemaReais('Novo preço de venda de uma unidade.').optional(),
      estoque_minimo: z.number().int().min(0).optional(),
    }),
    executar(args, { loja }) {
      const estado = loja.estado();
      const p = acharProduto(estado, args.produto);
      const editado = confirmar(
        montarEdicaoProduto(estado, p.id, {
          nome: args.novo_nome ?? p.nome,
          categoria: args.categoria ?? p.categoria,
          precoVenda: args.preco_venda !== undefined ? paraCentavos(args.preco_venda) : p.precoVenda,
          estoqueMinimo: args.estoque_minimo ?? p.estoqueMinimo,
        }),
      );
      loja.despachar({ tipo: 'editar-produto', produto: editado });
      return { registrado: true, antes: resumoProduto(p), agora: resumoProduto(editado) };
    },
  }),

  // ----- Vendas -----
  definir({
    nome: 'registrar_venda',
    titulo: 'Registrar venda',
    descricao: 'Registra uma venda pelo preço de cadastro: baixa o estoque e lança a receita no financeiro.',
    somenteLeitura: false,
    entrada: z.object({
      itens: z
        .array(z.object({ produto: esquemaProduto, quantidade: z.number().int().min(1) }))
        .min(1)
        .describe('Produtos vendidos.'),
      forma_pagamento: esquemaForma,
      valor_recebido: esquemaReais('Só no dinheiro: quanto o cliente entregou, para calcular o troco.').optional(),
    }),
    executar(args, { loja, agora }) {
      const estado = loja.estado();
      const carrinho = new Map<string, number>();
      for (const item of args.itens) {
        const p = acharProduto(estado, item.produto);
        carrinho.set(p.id, (carrinho.get(p.id) ?? 0) + item.quantidade);
      }
      const venda = confirmar(
        montarVenda(
          estado,
          [...carrinho].map(([produtoId, quantidade]) => ({ produtoId, quantidade })),
          {
            forma: args.forma_pagamento,
            valorRecebido: args.valor_recebido !== undefined ? paraCentavos(args.valor_recebido) : undefined,
          },
          agora(),
        ),
      );
      loja.despachar({ tipo: 'registrar-venda', venda });
      return {
        registrado: true,
        total: reais(venda.total),
        itens: venda.itens.map((i) => ({ produto: i.produtoNome, quantidade: i.quantidade, subtotal: reais(i.precoUnitario * i.quantidade) })),
        forma_pagamento: formaPagamento(args.forma_pagamento).nome,
        ...(venda.troco !== undefined ? { troco: reais(venda.troco) } : {}),
      };
    },
  }),

  // ----- Financeiro -----
  definir({
    nome: 'resumo_do_dia',
    titulo: 'Resumo do dia',
    descricao: 'Como está o dia de hoje: vendas, faturamento, lucro, despesas, recebido por forma de pagamento, estoque baixo e lembretes.',
    somenteLeitura: true,
    entrada: z.object({}),
    executar(_args, { loja, agora }) {
      const estado = loja.estado();
      const r = resumoDoDia(estado, agora());
      return {
        vendas: r.quantidadeVendas,
        faturamento: reais(r.faturamento),
        lucro_bruto: reais(r.lucroBruto),
        ticket_medio: reais(r.ticketMedio),
        despesas: reais(r.despesas),
        saldo: reais(r.saldo),
        recebido_por_forma: porForma(r.porFormaPagamento),
        produtos_abaixo_do_minimo: estoqueBaixo(estado.produtos).length,
        lembretes_pendentes: lembretesPendentes(estado)
          .filter((l) => situacaoLembrete(l, agora()) !== 'proximo')
          .map((l) => resumoLembrete(l, agora())),
      };
    },
  }),

  definir({
    nome: 'resumo_financeiro',
    titulo: 'Resumo financeiro',
    descricao:
      'Entradas, saídas e saldo de um período, com faturamento, custo do que foi vendido, lucro bruto, recebido por forma de pagamento, saídas por categoria e perdas.',
    somenteLeitura: true,
    entrada: z.object(esquemaPeriodo),
    executar(args, { loja, agora }) {
      const { intervalo, descricao } = intervaloDosArgs(args, agora());
      const r = resumoFinanceiro(loja.estado(), intervalo);
      return {
        periodo: descricao,
        entradas: reais(r.receitas),
        saidas: reais(r.despesas),
        saldo: reais(r.saldo),
        faturamento_com_vendas: reais(r.faturamento),
        custo_do_que_foi_vendido: reais(r.custoVendido),
        lucro_bruto: reais(r.lucroBruto),
        quantidade_de_vendas: r.quantidadeVendas,
        recebido_por_forma: porForma(r.recebidoPorForma),
        saidas_por_categoria: r.despesasPorCategoria.map((d) => ({ categoria: d.nome, valor: reais(d.valor) })),
        perdas_de_estoque: reais(r.perdas),
      };
    },
  }),

  definir({
    nome: 'listar_lancamentos',
    titulo: 'Listar movimentações',
    descricao: 'Lista as movimentações do financeiro (vendas, compras, contas) de um período, da mais recente para a mais antiga.',
    somenteLeitura: true,
    entrada: z.object({
      ...esquemaPeriodo,
      tipo: z.enum(['todos', 'receita', 'despesa']).optional().describe('receita = entrada de dinheiro; despesa = saída. Padrão: todos.'),
      categoria: z
        .enum(CATEGORIAS_LANCAMENTO.map((c) => c.id) as [CategoriaLancamento, ...CategoriaLancamento[]])
        .optional()
        .describe(`Categoria: ${listar(CATEGORIAS_LANCAMENTO)}.`),
      busca: z.string().optional().describe('Parte da descrição, ex.: "luz".'),
      limite: z.number().int().min(1).max(100).optional().describe('Quantas mostrar. Padrão: 20.'),
    }),
    executar(args, { loja, agora }) {
      const { intervalo, descricao } = intervaloDosArgs(args, agora());
      const busca = normalizar(args.busca ?? '');
      const lista = lancamentosDoPeriodo(loja.estado(), intervalo, args.tipo ?? 'todos').filter(
        (l) => (!args.categoria || l.categoria === args.categoria) && (!busca || normalizar(l.descricao).includes(busca)),
      );
      const soma = lista.reduce((s, l) => s + (l.tipo === 'receita' ? l.valor : -l.valor), 0);
      return {
        periodo: descricao,
        encontradas: lista.length,
        saldo_das_encontradas: reais(soma),
        movimentacoes: lista.slice(0, args.limite ?? 20).map((l) => ({
          id: l.id,
          quando: formatarDataHora(l.data, agora()),
          tipo: l.tipo === 'receita' ? 'entrada' : 'saída',
          categoria: categoriaLancamento(l.categoria).nome,
          descricao: l.descricao,
          valor: reais(l.valor),
          forma_pagamento: formaPagamento(l.formaPagamento).nome,
          pode_excluir: l.origem === 'manual',
        })),
      };
    },
  }),

  definir({
    nome: 'registrar_lancamento',
    titulo: 'Registrar movimentação',
    descricao:
      'Lança no financeiro uma despesa da loja (aluguel, luz, salário, imposto, manutenção...) ou uma entrada de dinheiro que não é venda. ' +
      'Vendas e compras de mercadoria NÃO entram aqui: use registrar_venda e registrar_entrada.',
    somenteLeitura: false,
    entrada: z.object({
      tipo: z.enum(['receita', 'despesa']).describe('despesa = saiu dinheiro; receita = entrou dinheiro.'),
      categoria: z.enum(IDS_CATEGORIA_LANCAMENTO).describe(`Categoria: ${listar(CATEGORIAS_MANUAIS)}.`),
      valor: esquemaReais('Valor.'),
      descricao: z.string().optional().describe('Ex.: "Conta de luz de outubro".'),
      forma_pagamento: esquemaForma.optional().describe('Padrão: pix.'),
    }),
    executar(args, { loja, agora }) {
      const lancamento = confirmar(
        montarLancamento(
          {
            tipo: args.tipo,
            categoria: args.categoria,
            descricao: args.descricao ?? '',
            valor: paraCentavos(args.valor),
            formaPagamento: args.forma_pagamento ?? 'pix',
          },
          agora(),
        ),
      );
      loja.despachar({ tipo: 'registrar-lancamento', lancamento });
      return {
        registrado: true,
        id: lancamento.id,
        tipo: lancamento.tipo === 'receita' ? 'entrada' : 'saída',
        categoria: categoriaLancamento(lancamento.categoria).nome,
        descricao: lancamento.descricao,
        valor: reais(lancamento.valor),
        forma_pagamento: formaPagamento(lancamento.formaPagamento).nome,
      };
    },
  }),

  definir({
    nome: 'excluir_lancamento',
    titulo: 'Excluir movimentação',
    descricao: 'Apaga uma movimentação lançada à mão (use o id de listar_lancamentos). Vendas e compras não podem ser apagadas.',
    somenteLeitura: false,
    entrada: z.object({ id: z.string().min(1) }),
    executar(args, { loja }) {
      const lancamento = loja.estado().lancamentos.find((l) => l.id === args.id);
      if (!lancamento) throw new ErroFerramenta('Movimentação não encontrada.');
      if (lancamento.origem !== 'manual') {
        throw new ErroFerramenta('Essa movimentação veio de uma venda ou compra e não pode ser apagada (ela mexeu no estoque).');
      }
      loja.despachar({ tipo: 'excluir-lancamento', id: lancamento.id });
      return { excluido: true, descricao: lancamento.descricao, valor: reais(lancamento.valor) };
    },
  }),

  // ----- Relatórios -----
  definir({
    nome: 'relatorio_vendas',
    titulo: 'Relatório de vendas',
    descricao:
      'Relatório de vendas de um período: faturamento, número de vendas, ticket médio, lucro e margem, melhores dias, horários de pico, ' +
      'produtos que mais venderam, produtos parados, categorias e formas de pagamento.',
    somenteLeitura: true,
    entrada: z.object(esquemaPeriodo),
    executar(args, { loja, agora }) {
      const estado = loja.estado();
      const { intervalo, descricao } = intervaloDosArgs(args, agora());
      const r = relatorioVendas(estado, intervalo);
      const vendidos = new Set(r.produtos.map((p) => p.produtoId));
      return {
        periodo: descricao,
        faturamento: reais(r.faturamento),
        vendas: r.quantidadeVendas,
        itens_vendidos: r.itensVendidos,
        ticket_medio: reais(r.ticketMedio),
        lucro_bruto: reais(r.lucroBruto),
        margem: `${r.margem}%`,
        melhores_dias: [...r.porDia]
          .filter((d) => d.vendas > 0)
          .sort((a, b) => b.faturamento - a.faturamento)
          .slice(0, 3)
          .map((d) => ({ dia: `${d.diaSemana} ${d.rotulo}`, faturamento: reais(d.faturamento), vendas: d.vendas })),
        dias_sem_venda: r.porDia.filter((d) => d.vendas === 0).length,
        horarios_de_pico: r.picos
          .filter((h) => h.vendas > 0)
          .map((h) => ({ hora: `${h.hora}h`, vendas: h.vendas, faturamento: reais(h.faturamento) })),
        produtos_mais_vendidos: r.produtos.slice(0, 10).map((p) => ({
          produto: p.nome,
          quantidade: p.quantidade,
          faturamento: reais(p.faturamento),
          lucro: reais(p.lucro),
        })),
        produtos_sem_venda_no_periodo: estado.produtos.filter((p) => !vendidos.has(p.id)).map((p) => p.nome),
        categorias: r.categorias.map((c) => ({
          categoria: c.categoria.nome,
          faturamento: reais(c.faturamento),
          parte: `${Math.round(c.parte * 100)}%`,
        })),
        por_forma_de_pagamento: porForma(r.porForma),
      };
    },
  }),

  // ----- Lembretes -----
  definir({
    nome: 'criar_lembrete',
    titulo: 'Criar lembrete',
    descricao: 'Cria um lembrete que aparece na tela inicial do app e do painel. Pode ser ligado a um produto.',
    somenteLeitura: false,
    entrada: z.object({
      texto: z.string().min(1).describe('Do que lembrar, curto. Ex.: "Pagar boleto da distribuidora".'),
      quando: z
        .string()
        .describe('Data e hora no horário local, formato AAAA-MM-DDTHH:MM. Sem hora combinada, use 09:00.'),
      produto: esquemaProduto.optional().describe('Produto relacionado, se houver.'),
    }),
    executar(args, { loja, agora }) {
      const estado = loja.estado();
      const quando = dataHoraLocal(args.quando);
      const produto = args.produto ? acharProduto(estado, args.produto) : undefined;
      const lembrete = confirmar(montarLembrete(estado, { texto: args.texto, quando, produtoId: produto?.id }, agora()));
      loja.despachar({ tipo: 'criar-lembrete', lembrete });
      return {
        registrado: true,
        ...resumoLembrete(lembrete, agora()),
        ...(quando.getTime() < agora().getTime() ? { observacao: 'A data já passou; o lembrete aparece como atrasado.' } : {}),
      };
    },
  }),

  definir({
    nome: 'listar_lembretes',
    titulo: 'Listar lembretes',
    descricao: 'Lista os lembretes pendentes (atrasados primeiro). Pode incluir os já concluídos.',
    somenteLeitura: true,
    entrada: z.object({ incluir_concluidos: z.boolean().optional() }),
    executar(args, { loja, agora }) {
      const estado = loja.estado();
      const pendentes = lembretesPendentes(estado).map((l) => resumoLembrete(l, agora()));
      const concluidos = args.incluir_concluidos
        ? estado.lembretes.filter((l) => l.concluido).map((l) => resumoLembrete(l, agora()))
        : undefined;
      return { pendentes, ...(concluidos ? { concluidos } : {}) };
    },
  }),

  definir({
    nome: 'concluir_lembrete',
    titulo: 'Concluir lembrete',
    descricao: 'Marca um lembrete como feito.',
    somenteLeitura: false,
    entrada: z.object({ lembrete: z.string().min(1).describe('id do lembrete ou parte do texto.') }),
    executar(args, { loja, agora }) {
      const lembrete = acharLembrete(loja.estado(), args.lembrete);
      loja.despachar({ tipo: 'concluir-lembrete', id: lembrete.id, data: agora().toISOString() });
      return { concluido: true, texto: lembrete.texto };
    },
  }),

  definir({
    nome: 'excluir_lembrete',
    titulo: 'Excluir lembrete',
    descricao: 'Apaga um lembrete.',
    somenteLeitura: false,
    entrada: z.object({ lembrete: z.string().min(1).describe('id do lembrete ou parte do texto.') }),
    executar(args, { loja }) {
      const lembrete = acharLembrete(loja.estado(), args.lembrete);
      loja.despachar({ tipo: 'excluir-lembrete', id: lembrete.id });
      return { excluido: true, texto: lembrete.texto };
    },
  }),
];
