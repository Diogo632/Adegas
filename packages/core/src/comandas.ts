import type { Centavos } from './dinheiro';
import { formatarDinheiro } from './dinheiro';
import type { Comanda, Estado, ItemComanda, ItemVenda, Resultado, Venda } from './tipos';
import { gerarId, mesmoDia, normalizar } from './util';
import type { DadosPagamento, ItemCarrinho } from './vendas';

// ---------- Mesas ----------

/** "mesa 10" → "10"; "  Balcão  " → "Balcão". */
export function normalizarMesa(texto: string): string {
  return texto
    .trim()
    .replace(/^mesa\s*/i, '')
    .replace(/\s+/g, ' ');
}

/** "10" → "Mesa 10"; "Balcão" → "Balcão". */
export function nomeDaMesa(mesa: string): string {
  return /^\d+$/.test(mesa) ? `Mesa ${mesa}` : mesa;
}

const mesmaMesa = (a: string, b: string) => normalizar(normalizarMesa(a)) === normalizar(normalizarMesa(b));

/** Mesas numeradas primeiro (1, 2, 10...), depois as com nome. */
function ordemDaMesa(a: Comanda, b: Comanda): number {
  const na = /^\d+$/.test(a.mesa) ? Number(a.mesa) : Number.POSITIVE_INFINITY;
  const nb = /^\d+$/.test(b.mesa) ? Number(b.mesa) : Number.POSITIVE_INFINITY;
  return na - nb || a.mesa.localeCompare(b.mesa, 'pt-BR');
}

export function comandasAbertas(estado: Estado): Comanda[] {
  return estado.comandas.filter((c) => c.situacao === 'aberta').sort(ordemDaMesa);
}

/** A conta aberta de uma mesa, se houver. */
export function comandaDaMesa(estado: Estado, mesa: string): Comanda | undefined {
  return estado.comandas.find((c) => c.situacao === 'aberta' && mesmaMesa(c.mesa, mesa));
}

export function comandasFechadasNoDia(estado: Estado, dia: Date = new Date()): Comanda[] {
  return estado.comandas
    .filter((c) => c.situacao === 'fechada' && c.fechadaEm && mesmoDia(new Date(c.fechadaEm), dia))
    .sort((a, b) => (b.fechadaEm ?? '').localeCompare(a.fechadaEm ?? ''));
}

// ---------- Contas ----------

export interface LinhaComanda {
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  precoUnitario: Centavos;
  subtotal: Centavos;
}

/** Pedidos agrupados por produto (e preço), na ordem em que foram pedidos. */
export function linhasDaComanda(comanda: Comanda): LinhaComanda[] {
  const linhas = new Map<string, LinhaComanda>();
  for (const item of comanda.itens) {
    const chave = `${item.produtoId}|${item.precoUnitario}`;
    const linha = linhas.get(chave);
    if (linha) {
      linha.quantidade += item.quantidade;
      linha.subtotal += item.quantidade * item.precoUnitario;
    } else {
      linhas.set(chave, {
        produtoId: item.produtoId,
        produtoNome: item.produtoNome,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        subtotal: item.quantidade * item.precoUnitario,
      });
    }
  }
  return [...linhas.values()];
}

export function totalComanda(comanda: Comanda): Centavos {
  return comanda.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);
}

export function quantidadeNaComanda(comanda: Comanda, produtoId?: string): number {
  return comanda.itens.filter((i) => !produtoId || i.produtoId === produtoId).reduce((s, i) => s + i.quantidade, 0);
}

export interface ResumoMesas {
  abertas: number;
  /** Quanto as mesas abertas já consumiram e ainda não pagaram. */
  emAberto: Centavos;
  itens: number;
}

export function resumoMesas(estado: Estado): ResumoMesas {
  const abertas = comandasAbertas(estado);
  return {
    abertas: abertas.length,
    emAberto: abertas.reduce((s, c) => s + totalComanda(c), 0),
    itens: abertas.reduce((s, c) => s + quantidadeNaComanda(c), 0),
  };
}

/** Valor por pessoa ao dividir a conta (arredonda para cima no centavo). */
export function valorPorPessoa(total: Centavos, pessoas: number): Centavos {
  return pessoas > 1 ? Math.ceil(total / pessoas) : total;
}

/** "agora", "há 25 min", "há 1h 05" */
export function tempoAberta(comanda: Comanda, agora: Date = new Date()): string {
  const minutos = Math.max(0, Math.floor((agora.getTime() - new Date(comanda.abertaEm).getTime()) / 60000));
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  return `há ${Math.floor(minutos / 60)}h ${String(minutos % 60).padStart(2, '0')}`;
}

// ---------- Validações (não mudam o estado) ----------

export function montarComanda(estado: Estado, dados: { mesa: string }, agora: Date = new Date()): Resultado<Comanda> {
  const mesa = normalizarMesa(dados.mesa);
  if (!mesa) return { ok: false, erro: 'Digite o número da mesa ou um nome.' };
  if (comandaDaMesa(estado, mesa)) return { ok: false, erro: `${nomeDaMesa(mesa)} já está aberta.` };
  return {
    ok: true,
    valor: { id: gerarId(), mesa, abertaEm: agora.toISOString(), situacao: 'aberta', itens: [] },
  };
}

function comandaAberta(estado: Estado, comandaId: string): Resultado<Comanda> {
  const comanda = estado.comandas.find((c) => c.id === comandaId);
  if (!comanda) return { ok: false, erro: 'Conta não encontrada.' };
  if (comanda.situacao !== 'aberta') return { ok: false, erro: `A conta da ${nomeDaMesa(comanda.mesa)} já foi fechada.` };
  return { ok: true, valor: comanda };
}

/** Pedidos para lançar na conta. Confere o estoque de cada produto. */
export function montarItensComanda(
  estado: Estado,
  comandaId: string,
  pedidos: ItemCarrinho[],
  agora: Date = new Date(),
): Resultado<ItemComanda[]> {
  const conta = comandaAberta(estado, comandaId);
  if (!conta.ok) return conta;
  const porProduto = new Map<string, number>();
  for (const p of pedidos) {
    if (!Number.isInteger(p.quantidade) || p.quantidade < 1) return { ok: false, erro: 'A quantidade precisa ser pelo menos 1.' };
    porProduto.set(p.produtoId, (porProduto.get(p.produtoId) ?? 0) + p.quantidade);
  }
  if (porProduto.size === 0) return { ok: false, erro: 'Escolha pelo menos um produto.' };

  const itens: ItemComanda[] = [];
  for (const [produtoId, quantidade] of porProduto) {
    const produto = estado.produtos.find((p) => p.id === produtoId);
    if (!produto) return { ok: false, erro: 'Produto não encontrado.' };
    if (quantidade > produto.estoque) {
      return { ok: false, erro: `Estoque insuficiente de ${produto.nome}: restam ${Math.max(produto.estoque, 0)}.` };
    }
    itens.push({
      id: gerarId(),
      produtoId,
      produtoNome: produto.nome,
      quantidade,
      precoUnitario: produto.precoVenda,
      custoUnitario: produto.custoMedio,
      lancadoEm: agora.toISOString(),
    });
  }
  return { ok: true, valor: itens };
}

/** Tirar da conta (pedido errado, desistiu): volta para o estoque. */
export function montarRemocaoComanda(
  estado: Estado,
  comandaId: string,
  produtoId: string,
  quantidade: number,
): Resultado<{ produtoId: string; quantidade: number }> {
  const conta = comandaAberta(estado, comandaId);
  if (!conta.ok) return conta;
  if (!Number.isInteger(quantidade) || quantidade < 1) return { ok: false, erro: 'A quantidade precisa ser pelo menos 1.' };
  const naConta = quantidadeNaComanda(conta.valor, produtoId);
  if (naConta === 0) return { ok: false, erro: 'Esse produto não está na conta.' };
  if (quantidade > naConta) return { ok: false, erro: `Só há ${naConta} desse produto na conta.` };
  return { ok: true, valor: { produtoId, quantidade } };
}

/** Fecha a conta: vira uma venda (o estoque já saiu quando os pedidos foram lançados). */
export function montarFechamento(
  estado: Estado,
  comandaId: string,
  pagamento: DadosPagamento,
  agora: Date = new Date(),
): Resultado<Venda> {
  const conta = comandaAberta(estado, comandaId);
  if (!conta.ok) return conta;
  const comanda = conta.valor;
  if (comanda.itens.length === 0) return { ok: false, erro: 'A conta está vazia. Se ninguém pediu nada, cancele a mesa.' };

  const porProduto = new Map<string, ItemVenda>();
  for (const i of comanda.itens) {
    const chave = `${i.produtoId}|${i.precoUnitario}|${i.custoUnitario}`;
    const atual = porProduto.get(chave);
    if (atual) atual.quantidade += i.quantidade;
    else {
      porProduto.set(chave, {
        produtoId: i.produtoId,
        produtoNome: i.produtoNome,
        quantidade: i.quantidade,
        precoUnitario: i.precoUnitario,
        custoUnitario: i.custoUnitario,
      });
    }
  }
  const itens = [...porProduto.values()];
  const total = totalComanda(comanda);
  const custoTotal = comanda.itens.reduce((s, i) => s + i.quantidade * i.custoUnitario, 0);

  let valorRecebido: Centavos | undefined;
  let troco: Centavos | undefined;
  if (pagamento.forma === 'dinheiro') {
    valorRecebido = pagamento.valorRecebido ?? total;
    if (valorRecebido < total) {
      return { ok: false, erro: `Valor recebido menor que o total. Faltam ${formatarDinheiro(total - valorRecebido)}.` };
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
      comandaId: comanda.id,
      mesa: comanda.mesa,
    },
  };
}
