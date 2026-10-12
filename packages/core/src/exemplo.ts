import { ESTADO_VAZIO, reducer } from './estado';
import { montarEntrada } from './estoque';
import type { Estado, FormaPagamento, Produto } from './tipos';
import { montarVenda } from './vendas';

const PRODUTOS: Produto[] = [
  { id: 'heineken-ln', nome: 'Heineken Long Neck 330ml', categoria: 'cerveja', precoVenda: 800, custoMedio: 490, estoque: 48, estoqueMinimo: 24 },
  { id: 'brahma-lata', nome: 'Brahma Lata 350ml', categoria: 'cerveja', precoVenda: 500, custoMedio: 299, estoque: 120, estoqueMinimo: 48 },
  { id: 'skol-lata', nome: 'Skol Lata 350ml', categoria: 'cerveja', precoVenda: 450, custoMedio: 279, estoque: 30, estoqueMinimo: 48 },
  { id: 'smirnoff', nome: 'Vodka Smirnoff 998ml', categoria: 'destilado', precoVenda: 4500, custoMedio: 2990, estoque: 6, estoqueMinimo: 3 },
  { id: 'red-label', nome: 'Whisky Red Label 1L', categoria: 'destilado', precoVenda: 12990, custoMedio: 8900, estoque: 3, estoqueMinimo: 2 },
  { id: 'vinho-tinto', nome: 'Vinho Tinto Suave 750ml', categoria: 'vinho', precoVenda: 2500, custoMedio: 1450, estoque: 12, estoqueMinimo: 4 },
  { id: 'coca-2l', nome: 'Coca-Cola 2L', categoria: 'refrigerante', precoVenda: 1300, custoMedio: 850, estoque: 10, estoqueMinimo: 6 },
  { id: 'agua-500', nome: 'Água Mineral 500ml', categoria: 'refrigerante', precoVenda: 300, custoMedio: 110, estoque: 36, estoqueMinimo: 12 },
  { id: 'red-bull', nome: 'Red Bull 250ml', categoria: 'energetico', precoVenda: 1200, custoMedio: 720, estoque: 24, estoqueMinimo: 12 },
  { id: 'marlboro', nome: 'Marlboro Box (maço)', categoria: 'cigarro', precoVenda: 1350, custoMedio: 1100, estoque: 40, estoqueMinimo: 20 },
  { id: 'gelo-5kg', nome: 'Gelo 5kg', categoria: 'gelo', precoVenda: 1500, custoMedio: 700, estoque: 6, estoqueMinimo: 10 },
  { id: 'carvao-3kg', nome: 'Carvão 3kg', categoria: 'gelo', precoVenda: 1800, custoMedio: 900, estoque: 8, estoqueMinimo: 5 },
  { id: 'amendoim', nome: 'Amendoim Japonês 150g', categoria: 'petisco', precoVenda: 600, custoMedio: 280, estoque: 15, estoqueMinimo: 10 },
];

const VENDAS_DE_HOJE: { horasAtras: number; itens: [string, number][]; forma: FormaPagamento; recebido?: number }[] = [
  { horasAtras: 5, itens: [['brahma-lata', 12], ['gelo-5kg', 1]], forma: 'pix' },
  { horasAtras: 4, itens: [['marlboro', 1]], forma: 'dinheiro', recebido: 2000 },
  { horasAtras: 3, itens: [['heineken-ln', 6], ['amendoim', 2]], forma: 'credito' },
  { horasAtras: 2, itens: [['smirnoff', 1], ['red-bull', 4], ['gelo-5kg', 1]], forma: 'debito' },
  { horasAtras: 1, itens: [['skol-lata', 18]], forma: 'pix' },
  { horasAtras: 0.5, itens: [['coca-2l', 1], ['carvao-3kg', 1]], forma: 'dinheiro', recebido: 5000 },
];

/**
 * Estado de demonstração: produtos típicos de adega e algumas vendas de hoje,
 * para as telas não começarem vazias. Some quando entrar o banco de dados.
 */
export function estadoDeExemplo(agora: Date = new Date()): Estado {
  let estado: Estado = { ...ESTADO_VAZIO, produtos: PRODUTOS.map((p) => ({ ...p })) };
  const horasAtras = (h: number) => new Date(agora.getTime() - h * 3_600_000);

  const compra = montarEntrada(
    estado,
    {
      produtoId: 'brahma-lata',
      embalagem: 'fardo',
      quantidade: 4,
      unidadesPorEmbalagem: 12,
      custoPorEmbalagem: 3588,
      fornecedor: 'Distribuidora Central',
      formaPagamento: 'pix',
    },
    horasAtras(6),
  );
  if (compra.ok) estado = reducer(estado, { tipo: 'registrar-entrada', ...compra.valor });

  for (const v of VENDAS_DE_HOJE) {
    const carrinho = v.itens.map(([produtoId, quantidade]) => ({ produtoId, quantidade }));
    const venda = montarVenda(estado, carrinho, { forma: v.forma, valorRecebido: v.recebido }, horasAtras(v.horasAtras));
    if (venda.ok) estado = reducer(estado, { tipo: 'registrar-venda', venda: venda.valor });
  }
  return estado;
}
