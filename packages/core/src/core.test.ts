import { describe, expect, it } from 'vitest';
import type { DadosEntradaNota } from './index';
import {
  ESTADO_VAZIO,
  biparNaConferencia,
  casarItem,
  categoriaSugerida,
  conferenciaDaNota,
  itensDaConferencia,
  ligarCodigo,
  mudarCustoDaLinha,
  nomeSugerido,
  totaisDaConferencia,
  digitoDaChave,
  entenderCodigo,
  entradasDaNota,
  formatarChave,
  formatarCnpj,
  gtinValido,
  lerChaveDeAcesso,
  lerXmlNFe,
  montarEntradaDaNota,
  produtoPorCodigo,
  semelhanca,
  unidadesPorEmbalagemDaNota,
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
  montarAjuste,
  montarEdicaoProduto,
  movimentosDoProduto,
  resumoEstoque,
  filtrarEstoque,
  statusEstoque,
  intervaloDoPeriodo,
  resumoFinanceiro,
  lancamentosDoPeriodo,
  montarLancamento,
  relatorioVendas,
  montarLembrete,
  lembretesPendentes,
  situacaoLembrete,
  formatarQuando,
  criarLojaNaMemoria,
  montarComanda,
  montarItensComanda,
  montarRemocaoComanda,
  montarFechamento,
  comandaDaMesa,
  comandasAbertas,
  linhasDaComanda,
  totalComanda,
  resumoMesas,
  valorPorPessoa,
  tempoAberta,
  nomeDaMesa,
  sha256,
  montarUsuario,
  entrar,
  pode,
  permissoesDe,
  usuarioInicial,
  comOperador,
  iniciais,
  PERMISSOES_PADRAO,
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
    expect(resumoDoDia(exemplo, new Date(2026, 9, 12, 20, 0)).quantidadeVendas).toBe(6);
  });

  it('mostra os mais vendidos e a saudação da hora', () => {
    const exemplo = estadoDeExemplo(new Date(2026, 9, 12, 20, 0));
    expect(maisVendidos(exemplo, 2).map((p) => p.id)).toEqual(['brahma-lata', 'skol-lata']);
    expect(saudacao(new Date(2026, 9, 12, 9))).toBe('Bom dia');
    expect(saudacao(new Date(2026, 9, 12, 15))).toBe('Boa tarde');
    expect(saudacao(new Date(2026, 9, 12, 23))).toBe('Boa noite');
  });
});

describe('estoque', () => {
  it('classifica, resume e filtra', () => {
    const produtos: Produto[] = [
      { ...cerveja, id: 'a', estoque: 0 },
      { ...cerveja, id: 'b', nome: 'Gelo', estoque: 5, estoqueMinimo: 10 },
      { ...cerveja, id: 'c', nome: 'Vinho', estoque: 20, estoqueMinimo: 2 },
    ];
    expect(produtos.map(statusEstoque)).toEqual(['zerado', 'baixo', 'ok']);
    expect(resumoEstoque(produtos)).toMatchObject({ unidades: 25, valorCusto: 7500, valorVenda: 12500, baixo: 1, zerado: 1 });
    expect(filtrarEstoque(produtos, '', 'baixo').map((p) => p.id).sort()).toEqual(['a', 'b']);
    expect(filtrarEstoque(produtos, '', 'zerado').map((p) => p.id)).toEqual(['a']);
  });

  it('edita o produto sem mexer na quantidade', () => {
    const r = montarEdicaoProduto(estadoBase(), 'c1', { nome: 'Cerveja Lata Gelada', categoria: 'cerveja', precoVenda: 550, estoqueMinimo: 6 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const estado = reducer(estadoBase(), { tipo: 'editar-produto', produto: r.valor });
    expect(estado.produtos[0]).toMatchObject({ nome: 'Cerveja Lata Gelada', precoVenda: 550, estoqueMinimo: 6, estoque: 10 });
    expect(montarEdicaoProduto(estadoBase(), 'c1', { nome: '', categoria: 'cerveja', precoVenda: 550, estoqueMinimo: 6 }).ok).toBe(false);
  });

  it('ajusta por perda e por contagem, e guarda no histórico', () => {
    const perda = montarAjuste(estadoBase(), { produtoId: 'c1', motivo: 'perda', quantidade: 2, observacao: 'quebrou' });
    expect(perda.ok).toBe(true);
    if (!perda.ok) return;
    let estado = reducer(estadoBase(), { tipo: 'ajustar-estoque', ajuste: perda.valor });
    expect(estado.produtos[0].estoque).toBe(8);

    const contagem = montarAjuste(estado, { produtoId: 'c1', motivo: 'contagem', quantidade: 11 });
    expect(contagem.ok).toBe(true);
    if (!contagem.ok) return;
    estado = reducer(estado, { tipo: 'ajustar-estoque', ajuste: contagem.valor });
    expect(estado.produtos[0].estoque).toBe(11);
    expect(movimentosDoProduto(estado, 'c1').map((m) => m.quantidade).sort()).toEqual([-2, 3]);

    expect(montarAjuste(estado, { produtoId: 'c1', motivo: 'perda', quantidade: 50 }).ok).toBe(false);
    expect(montarAjuste(estado, { produtoId: 'c1', motivo: 'contagem', quantidade: 11 }).ok).toBe(false);
  });
});

describe('financeiro e relatórios', () => {
  const agora = new Date(2026, 9, 12, 20, 0);

  it('lança despesa à mão e soma no período', () => {
    const r = montarLancamento(
      { tipo: 'despesa', categoria: 'aluguel', descricao: '', valor: 180000, formaPagamento: 'pix' },
      agora,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor).toMatchObject({ origem: 'manual', descricao: 'Aluguel' });
    const estado = reducer(estadoBase(), { tipo: 'registrar-lancamento', lancamento: r.valor });
    const hoje = intervaloDoPeriodo('hoje', agora);
    expect(resumoFinanceiro(estado, hoje)).toMatchObject({ despesas: 180000, saldo: -180000 });
    expect(lancamentosDoPeriodo(estado, hoje, 'despesa')).toHaveLength(1);
    expect(reducer(estado, { tipo: 'excluir-lancamento', id: r.valor.id }).lancamentos).toHaveLength(0);
    expect(
      montarLancamento({ tipo: 'despesa', categoria: 'mercadoria', descricao: 'x', valor: 100, formaPagamento: 'pix' }).ok,
    ).toBe(false);
  });

  it('monta períodos com o dia de hoje no fim', () => {
    const sete = intervaloDoPeriodo('7d', agora);
    expect(sete.inicio).toEqual(new Date(2026, 9, 6));
    expect(sete.fim).toEqual(new Date(2026, 9, 13));
    expect(intervaloDoPeriodo('mes', agora).inicio).toEqual(new Date(2026, 9, 1));
  });

  it('relatório bate com as vendas do período', () => {
    const exemplo = estadoDeExemplo(agora);
    const intervalo = intervaloDoPeriodo('30d', agora);
    const r = relatorioVendas(exemplo, intervalo);
    expect(r.porDia).toHaveLength(30);
    expect(r.porDia.reduce((s, d) => s + d.faturamento, 0)).toBe(r.faturamento);
    expect(r.porHora.reduce((s, h) => s + h.vendas, 0)).toBe(r.quantidadeVendas);
    expect(r.produtos.reduce((s, p) => s + p.faturamento, 0)).toBe(r.faturamento);
    expect(Object.values(r.porForma).reduce((s, v) => s + v, 0)).toBe(r.faturamento);
    expect(r.picos).toHaveLength(3);
    expect(resumoFinanceiro(exemplo, intervalo).faturamento).toBe(r.faturamento);
  });
});

describe('lembretes', () => {
  const agora = new Date(2026, 9, 12, 14, 0);

  it('cria, ordena e conclui', () => {
    const loja = criarLojaNaMemoria(estadoBase());
    const daqui = (horas: number) => new Date(agora.getTime() + horas * 3_600_000);
    for (const [texto, horas] of [['Pagar boleto', 20], ['Pedir gelo', 2], ['Ligar fornecedor', -1]] as const) {
      const r = montarLembrete(loja.estado(), { texto, quando: daqui(horas) }, agora);
      if (!r.ok) throw new Error(r.erro);
      loja.despachar({ tipo: 'criar-lembrete', lembrete: r.valor });
    }
    const pendentes = lembretesPendentes(loja.estado());
    expect(pendentes.map((l) => l.texto)).toEqual(['Ligar fornecedor', 'Pedir gelo', 'Pagar boleto']);
    expect(pendentes.map((l) => situacaoLembrete(l, agora))).toEqual(['atrasado', 'hoje', 'proximo']);
    expect(formatarQuando(pendentes[1].quando, agora)).toBe('hoje, 16:00');
    expect(formatarQuando(pendentes[2].quando, agora)).toBe('amanhã, 10:00');

    loja.despachar({ tipo: 'concluir-lembrete', id: pendentes[0].id, data: agora.toISOString() });
    expect(lembretesPendentes(loja.estado())).toHaveLength(2);
    loja.despachar({ tipo: 'excluir-lembrete', id: pendentes[1].id });
    expect(loja.estado().lembretes).toHaveLength(2);
  });

  it('valida texto, data e produto', () => {
    expect(montarLembrete(estadoBase(), { texto: '  ', quando: agora }).ok).toBe(false);
    expect(montarLembrete(estadoBase(), { texto: 'x', quando: new Date('nada') }).ok).toBe(false);
    expect(montarLembrete(estadoBase(), { texto: 'x', quando: agora, produtoId: 'nao-existe' }).ok).toBe(false);
    const r = montarLembrete(estadoBase(), { texto: 'Repor', quando: agora, produtoId: 'c1' });
    expect(r.ok && r.valor.produtoNome).toBe('Cerveja Lata');
  });

  it('exemplo já vem com lembretes', () => {
    expect(lembretesPendentes(estadoDeExemplo(agora)).length).toBeGreaterThan(0);
  });
});

describe('contas por mesa', () => {
  const agora = new Date(2026, 9, 12, 20, 0);
  const coca: Produto = { id: 'coca', nome: 'Coca-Cola 2L', categoria: 'refrigerante', precoVenda: 1300, custoMedio: 850, estoque: 5, estoqueMinimo: 2 };
  const agua: Produto = { id: 'agua', nome: 'Água 500ml', categoria: 'refrigerante', precoVenda: 300, custoMedio: 110, estoque: 10, estoqueMinimo: 2 };
  const skol: Produto = { id: 'skol', nome: 'Skol Lata', categoria: 'cerveja', precoVenda: 450, custoMedio: 279, estoque: 12, estoqueMinimo: 24 };
  const base = (): Estado => ({ ...ESTADO_VAZIO, produtos: [{ ...coca }, { ...agua }, { ...skol }] });
  const ok = <T,>(r: { ok: true; valor: T } | { ok: false; erro: string }): T => {
    if (!r.ok) throw new Error(r.erro);
    return r.valor;
  };
  const estoque = (loja: ReturnType<typeof criarLojaNaMemoria>, id: string) => loja.estado().produtos.find((p) => p.id === id)!.estoque;

  function mesa10() {
    const loja = criarLojaNaMemoria(base());
    const comanda = ok(montarComanda(loja.estado(), { mesa: 'Mesa 10' }, agora));
    loja.despachar({ tipo: 'abrir-comanda', comanda });
    const pedido = [
      { produtoId: 'coca', quantidade: 1 },
      { produtoId: 'agua', quantidade: 1 },
      { produtoId: 'skol', quantidade: 1 },
    ];
    loja.despachar({ tipo: 'lancar-na-comanda', comandaId: comanda.id, itens: ok(montarItensComanda(loja.estado(), comanda.id, pedido, agora)) });
    return { loja, comanda };
  }

  it('abre a mesa 10, lança coca, água e skol e tira do estoque na hora', () => {
    const { loja, comanda } = mesa10();
    expect(comanda.mesa).toBe('10');
    expect(nomeDaMesa(comanda.mesa)).toBe('Mesa 10');
    expect([estoque(loja, 'coca'), estoque(loja, 'agua'), estoque(loja, 'skol')]).toEqual([4, 9, 11]);
    const conta = comandaDaMesa(loja.estado(), '10')!;
    expect(totalComanda(conta)).toBe(2050);
    expect(loja.estado().vendas).toHaveLength(0); // ainda não é venda

    // Mais duas Skol depois: a conta agrupa por produto.
    loja.despachar({ tipo: 'lancar-na-comanda', comandaId: conta.id, itens: ok(montarItensComanda(loja.estado(), conta.id, [{ produtoId: 'skol', quantidade: 2 }], agora)) });
    const atual = comandaDaMesa(loja.estado(), 'mesa 10')!;
    expect(linhasDaComanda(atual).map((l) => [l.produtoNome, l.quantidade, l.subtotal])).toEqual([
      ['Coca-Cola 2L', 1, 1300],
      ['Água 500ml', 1, 300],
      ['Skol Lata', 3, 1350],
    ]);
    expect(resumoMesas(loja.estado())).toEqual({ abertas: 1, emAberto: 2950, itens: 5 });
  });

  it('não abre a mesma mesa duas vezes nem lança sem estoque', () => {
    const { loja, comanda } = mesa10();
    expect(montarComanda(loja.estado(), { mesa: '10' }).ok).toBe(false);
    expect(montarComanda(loja.estado(), { mesa: '  ' }).ok).toBe(false);
    const semEstoque = montarItensComanda(loja.estado(), comanda.id, [{ produtoId: 'coca', quantidade: 5 }]);
    expect(semEstoque.ok).toBe(false);
    if (!semEstoque.ok) expect(semEstoque.erro).toContain('restam 4');
  });

  it('tira da conta e devolve ao estoque', () => {
    const { loja, comanda } = mesa10();
    expect(montarRemocaoComanda(loja.estado(), comanda.id, 'skol', 2).ok).toBe(false);
    loja.despachar({ tipo: 'remover-da-comanda', comandaId: comanda.id, ...ok(montarRemocaoComanda(loja.estado(), comanda.id, 'agua', 1)) });
    expect(estoque(loja, 'agua')).toBe(10);
    expect(totalComanda(comandaDaMesa(loja.estado(), '10')!)).toBe(1750);
  });

  it('fecha a conta: vira venda e entra no financeiro, sem tirar do estoque de novo', () => {
    const { loja, comanda } = mesa10();
    const venda = ok(montarFechamento(loja.estado(), comanda.id, { forma: 'dinheiro', valorRecebido: 5000 }, agora));
    loja.despachar({ tipo: 'fechar-comanda', comandaId: comanda.id, venda });
    expect(venda).toMatchObject({ total: 2050, troco: 2950, mesa: '10', comandaId: comanda.id, custoTotal: 1239 });
    expect([estoque(loja, 'coca'), estoque(loja, 'agua'), estoque(loja, 'skol')]).toEqual([4, 9, 11]);
    expect(loja.estado().lancamentos[0]).toMatchObject({ tipo: 'receita', valor: 2050, descricao: 'Mesa 10 · 3 itens · Dinheiro' });
    expect(comandasAbertas(loja.estado())).toHaveLength(0);
    expect(resumoDoDia(loja.estado(), agora).faturamento).toBe(2050);
    expect(movimentosDoProduto(loja.estado(), 'skol')[0]).toMatchObject({ tipo: 'venda', quantidade: -1, descricao: 'Conta da Mesa 10' });
    // A mesa pode ser aberta de novo para os próximos clientes.
    expect(montarComanda(loja.estado(), { mesa: '10' }).ok).toBe(true);
    // E a conta fechada não aceita mais pedidos.
    expect(montarItensComanda(loja.estado(), comanda.id, [{ produtoId: 'agua', quantidade: 1 }]).ok).toBe(false);
  });

  it('não fecha conta vazia nem com dinheiro a menos', () => {
    const { loja, comanda } = mesa10();
    expect(montarFechamento(loja.estado(), comanda.id, { forma: 'dinheiro', valorRecebido: 1000 }).ok).toBe(false);
    const vazia = ok(montarComanda(loja.estado(), { mesa: 'Balcão' }));
    loja.despachar({ tipo: 'abrir-comanda', comanda: vazia });
    expect(montarFechamento(loja.estado(), vazia.id, { forma: 'pix' }).ok).toBe(false);
  });

  it('cancelar devolve tudo ao estoque', () => {
    const { loja, comanda } = mesa10();
    loja.despachar({ tipo: 'cancelar-comanda', comandaId: comanda.id, data: agora.toISOString() });
    expect([estoque(loja, 'coca'), estoque(loja, 'agua'), estoque(loja, 'skol')]).toEqual([5, 10, 12]);
    expect(comandasAbertas(loja.estado())).toHaveLength(0);
    expect(loja.estado().vendas).toHaveLength(0);
  });

  it('mostra a mesa aberta no histórico do produto, divide a conta e conta o tempo', () => {
    const { loja, comanda } = mesa10();
    expect(movimentosDoProduto(loja.estado(), 'coca')[0]).toMatchObject({ tipo: 'mesa', quantidade: -1, descricao: 'Mesa 10 (conta aberta)' });
    expect(valorPorPessoa(2050, 3)).toBe(684);
    expect(valorPorPessoa(2050, 1)).toBe(2050);
    expect(tempoAberta(comanda, new Date(agora.getTime() + 25 * 60000))).toBe('há 25 min');
    expect(tempoAberta(comanda, new Date(agora.getTime() + 65 * 60000))).toBe('há 1h 05');
  });

  it('exemplo já vem com mesas abertas', () => {
    const exemplo = estadoDeExemplo(agora);
    expect(comandasAbertas(exemplo).map((c) => c.mesa)).toEqual(['4', '10']);
    expect(resumoMesas(exemplo).emAberto).toBeGreaterThan(0);
  });
});

describe('usuários e acesso', () => {
  const dono = usuarioInicial('u1', 'Dono', 'admin', '1234');
  const base = (): Estado => ({ ...ESTADO_VAZIO, produtos: [{ ...cerveja }], usuarios: [dono] });
  const ok = <T,>(r: { ok: true; valor: T } | { ok: false; erro: string }): T => {
    if (!r.ok) throw new Error(r.erro);
    return r.valor;
  };

  it('calcula SHA-256 certo e não guarda o PIN', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256('ação')).toBe('0664077f33cc3ebbaa4bbdacac0eb70e740983080f01dce29929e73b7785a7ad');
    expect(sha256('x'.repeat(1000))).toBe('44f8354494a5ba03ba1792a8d3e9c534c47a9181980fde7a3f44b06ef2ae7c7f');
    expect(JSON.stringify(dono)).not.toContain('1234');
  });

  it('entra só com o PIN certo', () => {
    const estado = base();
    expect(entrar(estado, 'u1', '1234').ok).toBe(true);
    expect(entrar(estado, 'u1', '4321').ok).toBe(false);
    expect(entrar(estado, 'nao-existe', '1234').ok).toBe(false);
  });

  it('cadastra funcionário com permissões e o administrador pode tudo', () => {
    let estado = base();
    const ana = ok(montarUsuario(estado, { nome: ' Ana  Paula ', papel: 'funcionario', permissoes: [...PERMISSOES_PADRAO, 'mesas'], pin: '1111', ativo: true }));
    estado = reducer(estado, { tipo: 'salvar-usuario', usuario: ana });
    expect(ana.nome).toBe('Ana Paula');
    expect(ana.permissoes).toEqual(['vender', 'mesas', 'estoque', 'assistente']);
    expect(iniciais(ana.nome)).toBe('AP');
    expect(pode(ana, 'mesas')).toBe(true);
    expect(pode(ana, 'financeiro')).toBe(false);
    expect(pode(ana, 'usuarios')).toBe(false);
    expect(pode(dono, 'financeiro')).toBe(true);
    expect(pode(dono, 'usuarios')).toBe(true);
    expect(pode(null, 'vender')).toBe(false);
    expect(permissoesDe(ana)).toEqual(['vender', 'mesas', 'estoque', 'assistente']);
    expect(entrar(estado, ana.id, '1111').ok).toBe(true);

    // Editar sem PIN mantém o PIN; desativar tira o acesso.
    const editada = ok(montarUsuario(estado, { id: ana.id, nome: 'Ana Paula', papel: 'funcionario', permissoes: ['vender'], ativo: false }));
    estado = reducer(estado, { tipo: 'salvar-usuario', usuario: editada });
    expect(estado.usuarios).toHaveLength(2);
    expect(entrar(estado, ana.id, '1111').ok).toBe(false);
    expect(pode(editada, 'vender')).toBe(false);
  });

  it('valida nome, PIN e não deixa ficar sem administrador', () => {
    const estado = base();
    expect(montarUsuario(estado, { nome: 'dono', papel: 'funcionario', permissoes: [], pin: '1111', ativo: true }).ok).toBe(false);
    expect(montarUsuario(estado, { nome: 'Ana', papel: 'funcionario', permissoes: [], ativo: true }).ok).toBe(false);
    expect(montarUsuario(estado, { nome: 'Ana', papel: 'funcionario', permissoes: [], pin: '12a4', ativo: true }).ok).toBe(false);
    expect(montarUsuario(estado, { nome: 'Ana', papel: 'funcionario', permissoes: [], pin: '123', ativo: true }).ok).toBe(false);
    expect(montarUsuario(estado, { nome: 'Ana', papel: 'funcionario', permissoes: [], pin: '12345', ativo: true }).ok).toBe(false);
    const semAdmin = montarUsuario(estado, { id: 'u1', nome: 'Dono', papel: 'funcionario', permissoes: [], ativo: true });
    expect(semAdmin.ok).toBe(false);
    if (!semAdmin.ok) expect(semAdmin.erro).toContain('administrador');
    expect(montarUsuario(estado, { id: 'u1', nome: 'Dono', papel: 'admin', permissoes: [], ativo: false }).ok).toBe(false);
  });

  it('anota quem fez cada registro', () => {
    const agora = new Date(2026, 9, 12, 20, 0);
    const venda = ok(montarVenda(base(), [{ produtoId: 'c1', quantidade: 1 }], { forma: 'pix' }, agora));
    const estado = reducer(base(), comOperador({ tipo: 'registrar-venda', venda }, 'Ana'));
    expect(estado.vendas[0].operador).toBe('Ana');
    expect(estado.lancamentos[0].operador).toBe('Ana');
  });

  it('exemplo vem com o Admin e dois funcionários', () => {
    const exemplo = estadoDeExemplo(new Date(2026, 9, 12, 20, 0));
    expect(exemplo.usuarios.map((u) => [u.nome, u.papel])).toEqual([
      ['Admin', 'admin'],
      ['Ana', 'funcionario'],
      ['Bruno', 'funcionario'],
    ]);
    expect(entrar(exemplo, 'u-ana', '1111').ok).toBe(true);
    expect(exemplo.comandas[0].abertaPor).toBe('Ana');
  });
});

describe('nota fiscal', () => {
  const base = '35' + '2610' + '12345678000190' + '55' + '001' + '000012345' + '1' + '12345678';
  const chave = base + digitoDaChave(base);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe${chave}" versao="4.00">
<ide><serie>1</serie><nNF>12345</nNF><dhEmi>2026-10-15T09:30:00-03:00</dhEmi></ide>
<emit><CNPJ>12345678000190</CNPJ><xNome>DISTRIBUIDORA CENTRAL DE BEBIDAS LTDA</xNome><xFant>Distribuidora Central</xFant></emit>
<det nItem="1"><prod><cProd>1020</cProd><cEAN>4006381333931</cEAN><xProd>CERV SKOL LT 350ML CX C/12</xProd><uCom>CX</uCom><qCom>2.0000</qCom><vUnCom>33.0000</vUnCom><vProd>66.00</vProd><cEANTrib>96385074</cEANTrib><uTrib>UN</uTrib><qTrib>24.0000</qTrib></prod></det>
<det nItem="2"><prod><cProd>2001</cProd><cEAN>SEM GTIN</cEAN><xProd>AGUA MIN CRYSTAL S/GAS 500ML FD 12</xProd><uCom>FD</uCom><qCom>1</qCom><vUnCom>13.20</vUnCom><vProd>13.20</vProd></prod></det>
<det nItem="3"><prod><cProd>3005</cProd><cEAN>SEM GTIN</cEAN><xProd>GIN TANQUERAY 750ML</xProd><uCom>UN</uCom><qCom>3</qCom><vUnCom>99.90</vUnCom><vProd>299.70</vProd></prod></det>
<total><ICMSTot><vNF>378.90</vNF></ICMSTot></total></infNFe></NFe></nfeProc>`;

  it('lê a chave do código de barras do DANFE e do QR Code da NFC-e', () => {
    const lida = lerChaveDeAcesso(chave)!;
    expect(lida).toMatchObject({ uf: 'SP', ano: 2026, mes: 10, cnpj: '12345678000190', modelo: '55', serie: 1, numero: 12345 });
    expect(lerChaveDeAcesso(formatarChave(chave))?.chave).toBe(chave);
    expect(lerChaveDeAcesso(`https://www.fazenda.sp.gov.br/nfce/qrcode?p=${chave}|2|1|1|ABC`)?.chave).toBe(chave);
    expect(lerChaveDeAcesso(chave.slice(0, 43) + ((Number(chave[43]) + 1) % 10))).toBeNull();
    expect(formatarChave(chave).split(' ')).toHaveLength(11);
    expect(formatarCnpj('12345678000190')).toBe('12.345.678/0001-90');
    expect(entenderCodigo('4006381333931')).toEqual({ tipo: 'produto', codigo: '4006381333931' });
    expect(entenderCodigo('4006381333932').tipo).toBe('outro');
    expect(entenderCodigo(chave).tipo).toBe('nota');
    expect(gtinValido('96385074')).toBe(true);
  });

  it('lê o XML da NF-e com os itens, os códigos e os totais', () => {
    const r = lerXmlNFe(xml);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor).toMatchObject({ chave, numero: '12345', serie: '1', emissao: '2026-10-15', valorTotal: 37890, origem: 'xml' });
    expect(r.valor.emitente).toEqual({ nome: 'Distribuidora Central', cnpj: '12345678000190' });
    expect(r.valor.itens[0]).toMatchObject({ ean: '4006381333931', eanUnidade: '96385074', unidade: 'CX', quantidade: 2, valorUnitario: 3300, valorTotal: 6600, quantidadeTributavel: 24 });
    expect(r.valor.itens[1].ean).toBeUndefined();
    expect(lerXmlNFe('<html>não é nota</html>').ok).toBe(false);
  });

  it('descobre quantas unidades vêm em cada caixa ou fardo', () => {
    const r = lerXmlNFe(xml);
    if (!r.ok) throw new Error(r.erro);
    expect(r.valor.itens.map((i) => unidadesPorEmbalagemDaNota(i))).toEqual([12, 12, 1]);
    const item = (descricao: string, unidade = 'CX') => unidadesPorEmbalagemDaNota({ descricao, unidade, quantidade: 1 });
    expect(item('CERVEJA BRAHMA 12X350ML')).toBe(12);
    expect(item('REFRIGERANTE COCA COLA 2L PACK 6 UN', 'PCT')).toBe(6);
    expect(item('GELO EM CUBOS 5KG', 'PCT')).toBeNull();
  });

  it('reconhece os produtos do estoque pelo código, pelo nome salvo ou pelo nome parecido', () => {
    const estado = estadoDeExemplo(new Date(2026, 9, 12, 20, 0));
    const r = lerXmlNFe(xml);
    if (!r.ok) throw new Error(r.erro);
    const [skol, agua, gin] = r.valor.itens;
    expect(casarItem(skol, estado.produtos)).toMatchObject({ produto: { id: 'skol-lata' }, como: 'parecido' });
    expect(casarItem(agua, estado.produtos)).toMatchObject({ produto: { id: 'agua-500' }, como: 'parecido' });
    expect(casarItem(gin, estado.produtos)).toBeNull();
    expect(casarItem({ descricao: 'CERV BRAHMA LT 473ML' }, estado.produtos)).toBeNull();
    expect(semelhanca('HEINEKEN LONG NECK 330ML', 'Heineken Long Neck 330ml')).toBe(1);

    const aprendido = reducer(estado, { tipo: 'aprender-produto', produtoId: 'skol-lata', codigosBarras: ['4006381333931'], nomesNaNota: ['CERV SKOL LT 350ML CX C/12'] });
    expect(casarItem(skol, aprendido.produtos)).toMatchObject({ produto: { id: 'skol-lata' }, como: 'codigo' });
    expect(casarItem({ descricao: 'CERV SKOL LT 350ML CX C/12' }, aprendido.produtos)).toMatchObject({ como: 'nome-da-nota' });
    expect(produtoPorCodigo(aprendido.produtos, '4006381333931')?.id).toBe('skol-lata');
    expect(buscarProdutos(aprendido.produtos, '4006381333931').map((p) => p.id)).toEqual(['skol-lata']);
  });

  it('dá entrada na nota inteira, aprende os códigos e não deixa repetir a nota', () => {
    const estado = estadoDeExemplo(new Date(2026, 9, 12, 20, 0));
    const antes = (id: string) => estado.produtos.find((p) => p.id === id)!.estoque;
    const dados: DadosEntradaNota = {
      fornecedor: 'Distribuidora Central',
      formaPagamento: 'pix',
      nota: { chave, numero: '12345', serie: '1' },
      itens: [
        { produtoId: 'skol-lata', quantidade: 2, unidadesPorEmbalagem: 12, custoTotal: 6600, ean: '4006381333931', descricaoNaNota: 'CERV SKOL LT 350ML CX C/12' },
        { produtoId: 'agua-500', quantidade: 1.5, unidadesPorEmbalagem: 12, custoTotal: 1980 },
        { produtoNovo: { nome: 'Gin Tanqueray 750ml', categoria: 'destilado', precoVenda: 15990, estoqueMinimo: 2 }, quantidade: 3, unidadesPorEmbalagem: 1, custoTotal: 29970 },
      ],
    };
    const r = montarEntradaDaNota(estado, dados);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    let depois = estado;
    for (const acao of r.valor.acoes) depois = reducer(depois, acao);
    const produto = (id: string) => depois.produtos.find((p) => p.id === id)!;
    expect(produto('skol-lata').estoque).toBe(antes('skol-lata') + 24);
    expect(produto('agua-500').estoque).toBe(antes('agua-500') + 18);
    const gin = depois.produtos.find((p) => p.nome === 'Gin Tanqueray 750ml')!;
    expect(gin.estoque).toBe(3);
    expect(r.valor.entradas.map((e) => e.custoTotal)).toEqual([6600, 1980, 29970]);
    expect(r.valor.entradas.every((e) => e.notaFiscal?.chave === chave)).toBe(true);
    expect(produto('skol-lata').codigosBarras).toEqual(['4006381333931']);
    expect(produto('skol-lata').nomesNaNota).toEqual(['CERV SKOL LT 350ML CX C/12']);
    expect(depois.lancamentos[0].descricao).toContain('NF 12345');
    expect(entradasDaNota(depois, chave)).toHaveLength(3);

    const deNovo = montarEntradaDaNota(depois, dados);
    expect(deNovo.ok).toBe(false);
    if (!deNovo.ok) expect(deNovo.erro).toContain('já deu entrada');
    const ruim = montarEntradaDaNota(estado, { ...dados, nota: undefined, itens: [dados.itens[0], { ...dados.itens[1], produtoId: 'nao-existe' }] });
    expect(ruim.ok).toBe(false);
    if (!ruim.ok) expect(ruim.erro).toContain('Item 2');
  });
  it('confere a nota bipando os produtos e monta a entrada', () => {
    const estado = estadoDeExemplo(new Date(2026, 9, 12, 20, 0));
    const r = lerXmlNFe(xml);
    if (!r.ok) throw new Error(r.erro);
    let linhas = conferenciaDaNota(r.valor, estado.produtos);
    expect(linhas.map((l) => [l.acao, l.produtoId, l.unidadesPorEmbalagem])).toEqual([
      ['produto', 'skol-lata', 12],
      ['produto', 'agua-500', 12],
      ['novo', undefined, 1],
    ]);
    expect(linhas[2].novo).toMatchObject({ nome: 'Gin Tanqueray 750ml', categoria: 'destilado' });

    // Código da caixa da Skol (está na nota): conta 1 de 2.
    let bipe = biparNaConferencia(linhas, '4006381333931', estado.produtos);
    expect(bipe).toMatchObject({ ok: true, indice: 0 });
    expect(bipe.texto).toContain('1 de 2 CX');
    linhas = bipe.linhas;
    // Produto do estoque que não veio na nota.
    const heineken = estado.produtos.find((p) => p.nome.includes('Heineken'))!;
    const comCodigo = estado.produtos.map((p) => (p.id === heineken.id ? { ...p, codigoBarras: '7896045506088' } : p));
    bipe = biparNaConferencia(linhas, '7896045506088', comCodigo);
    expect(bipe.ok).toBe(false);
    expect(bipe.texto).toContain('não está nesta nota');
    // Código que ninguém conhece: a pessoa liga ao item do gin.
    bipe = biparNaConferencia(linhas, '7891234567895', estado.produtos);
    expect(bipe).toMatchObject({ ok: false, codigoSemDono: '7891234567895' });
    linhas = ligarCodigo(linhas, 2, '7891234567895');
    expect(linhas[2]).toMatchObject({ bipados: 1, item: { ean: '7891234567895' } });
    expect(biparNaConferencia(linhas, '7891234567895', estado.produtos)).toMatchObject({ ok: true, indice: 2 });

    linhas = linhas.map((l, i) => (i === 2 ? { ...l, novo: { ...l.novo, precoVenda: 15990 } } : i === 1 ? { ...l, acao: 'ignorar' as const } : l));
    expect(totaisDaConferencia(linhas)).toEqual({ itens: 2, unidades: 27, valor: 36570 });
    const itens = itensDaConferencia(linhas);
    expect(itens[0]).toMatchObject({ produtoId: 'skol-lata', quantidade: 2, unidadesPorEmbalagem: 12, custoTotal: 6600, ean: '4006381333931', eanUnidade: '96385074' });
    expect(itens[1]).toMatchObject({ produtoNovo: { nome: 'Gin Tanqueray 750ml', precoVenda: 15990 }, ean: '7891234567895' });
    const entrada = montarEntradaDaNota(estado, { itens, formaPagamento: 'pix' });
    expect(entrada.ok).toBe(true);
  });

  it('monta a entrada só com os bipes quando não há os itens da nota', () => {
    const estado = estadoDeExemplo(new Date(2026, 9, 12, 20, 0));
    const produtos = estado.produtos.map((p) => (p.id === 'skol-lata' ? { ...p, codigoBarras: '7891149101900' } : p));
    let bipe = biparNaConferencia([], '7891149101900', produtos, true);
    bipe = biparNaConferencia(bipe.linhas, '7891149101900', produtos, true);
    expect(bipe.linhas).toHaveLength(1);
    expect(bipe.linhas[0]).toMatchObject({ produtoId: 'skol-lata', bipados: 2, foraDaNota: true, item: { quantidade: 2 } });
    bipe = biparNaConferencia(bipe.linhas, '7891234567895', produtos, true);
    expect(bipe.linhas[1]).toMatchObject({ acao: 'novo', item: { ean: '7891234567895' } });
    const linha = mudarCustoDaLinha(bipe.linhas[0], 700);
    expect(linha.item).toMatchObject({ valorTotal: 700, valorUnitario: 350 });
    expect(biparNaConferencia([linha], '7891149101900', produtos, true).linhas[0].item).toMatchObject({ quantidade: 3, valorTotal: 1050 });
  });

  it('sugere nome e categoria para cadastrar o que veio na nota', () => {
    expect(nomeSugerido('CERV SKOL LT 350ML C/12')).toBe('Cerveja Skol Lata 350ml');
    expect(nomeSugerido('REFRIG COCA COLA PET 2L PACK 6 UN')).toBe('Refrigerante Coca Cola PET 2L');
    expect(nomeSugerido('VODKA SMIRNOFF 998ML')).toBe('Vodka Smirnoff 998ml');
    expect(categoriaSugerida('CERV SKOL LT 350ML C/12')).toBe('cerveja');
    expect(categoriaSugerida('ENERG RED BULL 250ML')).toBe('energetico');
    expect(categoriaSugerida('AGUA MIN CRYSTAL 500ML')).toBe('refrigerante');
    expect(categoriaSugerida('CIG MARLBORO RED BOX')).toBe('cigarro');
    expect(categoriaSugerida('PARAFUSO 3MM')).toBe('outros');
  });
});
