import { describe, expect, it } from 'vitest';
import {
  ESTADO_VAZIO,
  estadoDeExemplo,
  estoqueBaixo,
  formatarDinheiro,
  montarEntrada,
  montarVenda,
  paraCentavos,
  previaEntrada,
  reducer,
  resumoDoDia,
  sugestoesDeValorRecebido,
  alterarQuantidade,
  buscarProdutos,
  maisVendidos,
  saudacao,
} from './index';
import type { Estado, Produto } from './index';

const cerveja: Produto = {
  id: 'c1',
  nome: 'Cerveja Lata',
  categoria: 'cerveja',
  precoVenda: 500,
  custoMedio: 300,
  estoque: 10,
  estoqueMinimo: 12,
};
const estadoBase = (): Estado => ({ ...ESTADO_VAZIO, produtos: [{ ...cerveja }] });

describe('dinheiro', () => {
  it('formata em reais', () => {
    expect(formatarDinheiro(1250)).toBe('R$ 12,50');
    expect(formatarDinheiro(123456)).toBe('R$ 1.234,56');
    expect(formatarDinheiro(5)).toBe('R$ 0,05');
    expect(formatarDinheiro(-990)).toBe('-R$ 9,90');
  });

  it('entende o que a pessoa digita', () => {
    expect(paraCentavos('12')).toBe(1200);
    expect(paraCentavos('12,5')).toBe(1250);
    expect(paraCentavos('R$ 1.234,56')).toBe(123456);
    expect(paraCentavos('12.50')).toBe(1250);
    expect(paraCentavos('1.234')).toBe(123400);
    expect(paraCentavos('')).toBeNull();
    expect(paraCentavos('abc')).toBeNull();
  });
});

describe('entrada de produto', () => {
  it('calcula fardo: unidades, custo por unidade e total', () => {
    expect(
      previaEntrada({ embalagem: 'fardo', quantidade: 2, unidadesPorEmbalagem: 12, custoPorEmbalagem: 3600 }),
    ).toEqual({ unidades: 24, unidadesPorEmbalagem: 12, custoUnitario: 300, custoTotal: 7200 });
  });

  it('soma no estoque, recalcula o custo médio e lança a despesa', () => {
    const r = montarEntrada(estadoBase(), {
      produtoId: 'c1',
      embalagem: 'fardo',
      quantidade: 1,
      unidadesPorEmbalagem: 10,
      custoPorEmbalagem: 4000,
      formaPagamento: 'pix',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const estado = reducer(estadoBase(), { tipo: 'registrar-entrada', ...r.valor });
    // 10 un a R$ 3,00 + 10 un a R$ 4,00 => 20 un a R$ 3,50
    expect(estado.produtos[0]).toMatchObject({ estoque: 20, custoMedio: 350 });
    expect(estado.lancamentos[0]).toMatchObject({ tipo: 'despesa', valor: 4000, formaPagamento: 'pix' });
  });

  it('cadastra produto novo junto com a primeira entrada', () => {
    const r = montarEntrada(estadoBase(), {
      produtoNovo: { nome: 'Gelo 5kg', categoria: 'gelo', precoVenda: 1500, estoqueMinimo: 5 },
      embalagem: 'unidade',
      quantidade: 8,
      custoPorEmbalagem: 700,
      formaPagamento: 'dinheiro',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const estado = reducer(estadoBase(), { tipo: 'registrar-entrada', ...r.valor });
    expect(estado.produtos).toHaveLength(2);
    expect(estado.produtos[1]).toMatchObject({ nome: 'Gelo 5kg', estoque: 8, custoMedio: 700 });
  });

  it('recusa dados incompletos', () => {
    const base = { embalagem: 'unidade' as const, quantidade: 1, custoPorEmbalagem: 100, formaPagamento: 'pix' as const };
    expect(montarEntrada(estadoBase(), base).ok).toBe(false);
    expect(montarEntrada(estadoBase(), { ...base, produtoId: 'c1', quantidade: 0 }).ok).toBe(false);
    expect(montarEntrada(estadoBase(), { ...base, produtoId: 'c1', embalagem: 'fardo' }).ok).toBe(false);
    expect(
      montarEntrada(estadoBase(), {
        ...base,
        produtoNovo: { nome: 'cerveja lata', categoria: 'cerveja', precoVenda: 500, estoqueMinimo: 1 },
      }).ok,
    ).toBe(false);
  });
});

describe('venda e pagamento', () => {
  it('não deixa o carrinho passar do estoque', () => {
    expect(alterarQuantidade([], cerveja, 50)).toEqual([{ produtoId: 'c1', quantidade: 10 }]);
    expect(alterarQuantidade([{ produtoId: 'c1', quantidade: 3 }], cerveja, 0)).toEqual([]);
  });

  it('dinheiro calcula troco; baixa estoque e lança receita', () => {
    const r = montarVenda(estadoBase(), [{ produtoId: 'c1', quantidade: 3 }], {
      forma: 'dinheiro',
      valorRecebido: 2000,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor).toMatchObject({ total: 1500, custoTotal: 900, valorRecebido: 2000, troco: 500 });
    const estado = reducer(estadoBase(), { tipo: 'registrar-venda', venda: r.valor });
    expect(estado.produtos[0].estoque).toBe(7);
    expect(estado.lancamentos[0]).toMatchObject({ tipo: 'receita', valor: 1500, formaPagamento: 'dinheiro' });
  });

  it('recusa valor recebido menor que o total e estoque insuficiente', () => {
    expect(
      montarVenda(estadoBase(), [{ produtoId: 'c1', quantidade: 3 }], { forma: 'dinheiro', valorRecebido: 1000 }).ok,
    ).toBe(false);
    expect(montarVenda(estadoBase(), [{ produtoId: 'c1', quantidade: 11 }], { forma: 'pix' }).ok).toBe(false);
    expect(montarVenda(estadoBase(), [], { forma: 'pix' }).ok).toBe(false);
  });

  it('sugere notas para o troco', () => {
    expect(sugestoesDeValorRecebido(1350)).toEqual([1350, 1500, 2000, 5000]);
  });
});

describe('resumo e alertas', () => {
  it('separa o faturamento do dia por forma de pagamento', () => {
    const agora = new Date(2026, 9, 12, 20, 0);
    let estado = estadoBase();
    for (const forma of ['pix', 'credito'] as const) {
      const r = montarVenda(estado, [{ produtoId: 'c1', quantidade: 2 }], { forma }, agora);
      if (r.ok) estado = reducer(estado, { tipo: 'registrar-venda', venda: r.valor });
    }
    const resumo = resumoDoDia(estado, agora);
    expect(resumo).toMatchObject({ quantidadeVendas: 2, faturamento: 2000, lucroBruto: 800, ticketMedio: 1000 });
    expect(resumo.porFormaPagamento).toEqual({ pix: 1000, credito: 1000, debito: 0, dinheiro: 0 });
    expect(resumoDoDia(estado, new Date(2026, 9, 13)).quantidadeVendas).toBe(0);
  });

  it('avisa estoque baixo e busca sem acento', () => {
    expect(estoqueBaixo(estadoBase().produtos).map((p) => p.id)).toEqual(['c1']);
    const exemplo = estadoDeExemplo(new Date(2026, 9, 12, 20, 0));
    expect(buscarProdutos(exemplo.produtos, 'agua').map((p) => p.nome)).toEqual(['Água Mineral 500ml']);
    expect(exemplo.vendas.length).toBe(6);
  });

  it('mostra os mais vendidos e a saudação da hora', () => {
    const exemplo = estadoDeExemplo(new Date(2026, 9, 12, 20, 0));
    expect(maisVendidos(exemplo, 2).map((p) => p.id)).toEqual(['skol-lata', 'brahma-lata']);
    expect(saudacao(new Date(2026, 9, 12, 9))).toBe('Bom dia');
    expect(saudacao(new Date(2026, 9, 12, 15))).toBe('Boa tarde');
    expect(saudacao(new Date(2026, 9, 12, 23))).toBe('Boa noite');
  });
});
