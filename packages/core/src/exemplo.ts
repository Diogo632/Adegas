import { lancamentoDaEntrada, lancamentosDaVenda, reducer } from './estado';
import { montarEntrada } from './estoque';
import type {
  AjusteEstoque,
  CategoriaLancamento,
  EntradaEstoque,
  Estado,
  FormaPagamento,
  ItemVenda,
  Lancamento,
  Produto,
  Venda,
} from './tipos';
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
 * Estado de demonstração: produtos típicos de adega, 30 dias de histórico
 * (vendas, compras, contas da loja) e algumas vendas de hoje, para as telas
 * não começarem vazias. Some quando entrar o banco de dados.
 */
export function estadoDeExemplo(agora: Date = new Date()): Estado {
  let estado: Estado = { ...historicoDeExemplo(agora), produtos: PRODUTOS.map((p) => ({ ...p })) };
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

// ---------- Histórico dos últimos 29 dias ----------

/** Gerador de números "aleatórios" sempre igual (mulberry32), para o exemplo não mudar a cada abertura. */
function sorteador(semente: number) {
  let a = semente;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function escolher<T>(sortear: () => number, opcoes: [T, number][]): T {
  const total = opcoes.reduce((s, [, peso]) => s + peso, 0);
  let alvo = sortear() * total;
  for (const [valor, peso] of opcoes) {
    alvo -= peso;
    if (alvo <= 0) return valor;
  }
  return opcoes[opcoes.length - 1][0];
}

/** Produto, peso (quanto sai) e quantidade máxima por venda. */
const SAIDA: [string, number, number][] = [
  ['brahma-lata', 10, 12],
  ['skol-lata', 9, 12],
  ['heineken-ln', 7, 6],
  ['gelo-5kg', 6, 2],
  ['marlboro', 6, 2],
  ['red-bull', 4, 4],
  ['coca-2l', 4, 2],
  ['agua-500', 3, 3],
  ['carvao-3kg', 3, 1],
  ['amendoim', 3, 2],
  ['smirnoff', 2, 1],
  ['vinho-tinto', 2, 1],
  ['red-label', 1, 1],
];

/** Movimento por hora: adega vende mais no fim da tarde e à noite. */
const HORAS: [number, number][] = [
  [10, 1], [11, 2], [12, 3], [13, 2], [14, 1], [15, 1], [16, 2],
  [17, 4], [18, 6], [19, 8], [20, 9], [21, 10], [22, 8], [23, 4],
];

const FORMAS: [FormaPagamento, number][] = [['pix', 45], ['debito', 20], ['dinheiro', 20], ['credito', 15]];

/** Compras semanais: produto, embalagens, unidades por embalagem, custo por embalagem. */
const REPOSICAO: [string, number, number, number][] = [
  ['brahma-lata', 8, 12, 3588],
  ['skol-lata', 8, 12, 3348],
  ['heineken-ln', 2, 24, 11760],
  ['gelo-5kg', 25, 1, 700],
  ['marlboro', 4, 10, 11000],
  ['red-bull', 2, 24, 17280],
];

/** Contas da loja no mês: dias atrás, categoria, descrição, valor, forma. */
const CONTAS: [number, CategoriaLancamento, string, number, FormaPagamento][] = [
  [26, 'impostos', 'Simples Nacional', 31200, 'pix'],
  [20, 'aluguel', 'Aluguel do ponto', 180000, 'pix'],
  [18, 'contas', 'Conta de luz', 38640, 'pix'],
  [17, 'contas', 'Internet', 9990, 'debito'],
  [15, 'salarios', 'Salário do balconista', 165000, 'pix'],
  [11, 'contas', 'Conta de água', 9230, 'pix'],
  [9, 'manutencao', 'Conserto da geladeira', 25000, 'dinheiro'],
  [4, 'outras-despesas', 'Sacolas e copos descartáveis', 6800, 'dinheiro'],
];

function historicoDeExemplo(agora: Date): Omit<Estado, 'produtos'> {
  const sortear = sorteador(20261012);
  const produtos = new Map(PRODUTOS.map((p) => [p.id, p]));
  const vendas: Venda[] = [];
  const entradas: EntradaEstoque[] = [];
  const lancamentos: Lancamento[] = [];
  const ajustes: AjusteEstoque[] = [];
  const naData = (diasAtras: number, hora: number, minuto: number) =>
    new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - diasAtras, hora, minuto);

  for (let diasAtras = 29; diasAtras >= 1; diasAtras--) {
    const diaSemana = naData(diasAtras, 12, 0).getDay();
    const movimento = diaSemana === 5 || diaSemana === 6 ? 1.6 : diaSemana === 0 ? 1.2 : 1;
    const quantidadeVendas = Math.round((8 + sortear() * 8) * movimento);

    // Reposição semanal, de manhã, antes das vendas.
    if (diasAtras % 7 === 0) {
      REPOSICAO.forEach(([produtoId, embalagens, porEmbalagem, custoEmbalagem], i) => {
        const produto = produtos.get(produtoId);
        if (!produto) return;
        const entrada: EntradaEstoque = {
          id: `h-e-${diasAtras}-${i}`,
          data: naData(diasAtras, 9, 10 + i * 5).toISOString(),
          produtoId,
          produtoNome: produto.nome,
          embalagem: porEmbalagem > 1 ? 'fardo' : 'unidade',
          quantidadeEmbalagens: embalagens,
          unidadesPorEmbalagem: porEmbalagem,
          unidades: embalagens * porEmbalagem,
          custoPorEmbalagem: custoEmbalagem,
          custoUnitario: Math.round(custoEmbalagem / porEmbalagem),
          custoTotal: embalagens * custoEmbalagem,
          fornecedor: produtoId === 'gelo-5kg' ? 'Gelo Polar' : 'Distribuidora Central',
          formaPagamento: produtoId === 'gelo-5kg' ? 'dinheiro' : 'pix',
        };
        entradas.push(entrada);
        lancamentos.push(lancamentoDaEntrada(entrada));
      });
    }

    const horarios = Array.from({ length: quantidadeVendas }, () => [escolher(sortear, HORAS), Math.floor(sortear() * 60)] as const).sort(
      (a, b) => a[0] - b[0] || a[1] - b[1],
    );
    horarios.forEach(([hora, minuto], i) => {
      const quantosProdutos = escolher(sortear, [[1, 6], [2, 3], [3, 1]]);
      const itens: ItemVenda[] = [];
      for (let n = 0; n < quantosProdutos; n++) {
        const id = escolher(sortear, SAIDA.map(([pid, peso]) => [pid, peso] as [string, number]));
        if (itens.some((item) => item.produtoId === id)) continue;
        const produto = produtos.get(id);
        const maximo = SAIDA.find(([pid]) => pid === id)?.[2] ?? 1;
        if (!produto) continue;
        itens.push({
          produtoId: id,
          produtoNome: produto.nome,
          quantidade: 1 + Math.floor(sortear() * maximo),
          precoUnitario: produto.precoVenda,
          custoUnitario: produto.custoMedio,
        });
      }
      const total = itens.reduce((s, item) => s + item.precoUnitario * item.quantidade, 0);
      const forma = escolher(sortear, FORMAS);
      const recebido = forma === 'dinheiro' ? Math.ceil(total / 1000) * 1000 : undefined;
      const venda: Venda = {
        id: `h-v-${diasAtras}-${i}`,
        data: naData(diasAtras, hora, minuto).toISOString(),
        itens,
        total,
        custoTotal: itens.reduce((s, item) => s + item.custoUnitario * item.quantidade, 0),
        pagamentos: [{ forma, valor: total }],
        valorRecebido: recebido,
        troco: recebido !== undefined ? recebido - total : undefined,
      };
      vendas.push(venda);
      lancamentos.push(...lancamentosDaVenda(venda));
    });
  }

  CONTAS.forEach(([diasAtras, categoria, descricao, valor, forma], i) => {
    lancamentos.push({
      id: `h-c-${i}`,
      data: naData(diasAtras, 10, 30).toISOString(),
      tipo: 'despesa',
      origem: 'manual',
      categoria,
      descricao,
      valor,
      formaPagamento: forma,
    });
  });

  ajustes.push(
    {
      id: 'h-a-1',
      data: naData(3, 22, 15).toISOString(),
      produtoId: 'heineken-ln',
      produtoNome: 'Heineken Long Neck 330ml',
      motivo: 'perda',
      quantidadeAntes: 60,
      quantidadeDepois: 58,
      custoUnitario: 490,
      observacao: 'Garrafas quebradas',
    },
    {
      id: 'h-a-2',
      data: naData(6, 8, 40).toISOString(),
      produtoId: 'gelo-5kg',
      produtoNome: 'Gelo 5kg',
      motivo: 'perda',
      quantidadeAntes: 12,
      quantidadeDepois: 9,
      custoUnitario: 700,
      observacao: 'Derreteu (freezer desligado)',
    },
  );

  const recentesPrimeiro = <T extends { data: string }>(lista: T[]) => lista.sort((a, b) => b.data.localeCompare(a.data));
  return {
    vendas: recentesPrimeiro(vendas),
    entradas: recentesPrimeiro(entradas),
    lancamentos: recentesPrimeiro(lancamentos),
    ajustes: recentesPrimeiro(ajustes),
  };
}

