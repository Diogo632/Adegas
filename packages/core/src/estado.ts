import { formaPagamento } from './catalogos';
import { nomeDaMesa } from './comandas';
import type { AjusteEstoque, Comanda, EntradaEstoque, Estado, ItemComanda, Lancamento, Lembrete, Produto, Usuario, Venda } from './tipos';
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
  | { tipo: 'excluir-lembrete'; id: string }
  | { tipo: 'abrir-comanda'; comanda: Comanda }
  | { tipo: 'lancar-na-comanda'; comandaId: string; itens: ItemComanda[] }
  | { tipo: 'remover-da-comanda'; comandaId: string; produtoId: string; quantidade: number }
  | { tipo: 'fechar-comanda'; comandaId: string; venda: Venda }
  | { tipo: 'cancelar-comanda'; comandaId: string; data: string; operador?: string }
  | { tipo: 'salvar-usuario'; usuario: Usuario };

export const ESTADO_VAZIO: Estado = {
  produtos: [],
  vendas: [],
  entradas: [],
  lancamentos: [],
  ajustes: [],
  lembretes: [],
  comandas: [],
  usuarios: [],
};

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
    case 'abrir-comanda':
      return { ...estado, comandas: [...estado.comandas, acao.comanda] };
    case 'lancar-na-comanda':
      // O pedido sai do estoque na hora: a bebida já está na mesa.
      return {
        ...mudarEstoque(estado, acao.itens.map((i) => [i.produtoId, -i.quantidade])),
        comandas: estado.comandas.map((c) => (c.id === acao.comandaId ? { ...c, itens: [...c.itens, ...acao.itens] } : c)),
      };
    case 'remover-da-comanda':
      return {
        ...mudarEstoque(estado, [[acao.produtoId, acao.quantidade]]),
        comandas: estado.comandas.map((c) =>
          c.id === acao.comandaId ? { ...c, itens: tirarDosItens(c.itens, acao.produtoId, acao.quantidade) } : c,
        ),
      };
    case 'fechar-comanda':
      // Vira venda (receita no financeiro), sem mexer no estoque de novo.
      return {
        ...estado,
        vendas: [acao.venda, ...estado.vendas],
        lancamentos: [...lancamentosDaVenda(acao.venda), ...estado.lancamentos],
        comandas: estado.comandas.map((c) =>
          c.id === acao.comandaId
            ? { ...c, situacao: 'fechada', fechadaEm: acao.venda.data, vendaId: acao.venda.id, fechadaPor: acao.venda.operador }
            : c,
        ),
      };
    case 'cancelar-comanda': {
      const comanda = estado.comandas.find((c) => c.id === acao.comandaId && c.situacao === 'aberta');
      if (!comanda) return estado;
      return {
        ...mudarEstoque(estado, comanda.itens.map((i) => [i.produtoId, i.quantidade])),
        comandas: estado.comandas.map((c) =>
          c.id === comanda.id ? { ...c, situacao: 'cancelada', fechadaEm: acao.data, fechadaPor: acao.operador } : c,
        ),
      };
    }
    case 'salvar-usuario': {
      const existe = estado.usuarios.some((u) => u.id === acao.usuario.id);
      return {
        ...estado,
        usuarios: existe ? estado.usuarios.map((u) => (u.id === acao.usuario.id ? acao.usuario : u)) : [...estado.usuarios, acao.usuario],
      };
    }
  }
}

/** Soma (ou tira) unidades do estoque de vários produtos. */
function mudarEstoque(estado: Estado, mudancas: [string, number][]): Estado {
  const porProduto = new Map<string, number>();
  for (const [id, qtd] of mudancas) porProduto.set(id, (porProduto.get(id) ?? 0) + qtd);
  return {
    ...estado,
    produtos: estado.produtos.map((p) => (porProduto.has(p.id) ? { ...p, estoque: p.estoque + (porProduto.get(p.id) ?? 0) } : p)),
  };
}

/** Tira unidades de um produto da conta, começando pelo pedido mais recente. */
function tirarDosItens(itens: ItemComanda[], produtoId: string, quantidade: number): ItemComanda[] {
  let falta = quantidade;
  const resultado = [...itens];
  for (let i = resultado.length - 1; i >= 0 && falta > 0; i--) {
    const item = resultado[i];
    if (item.produtoId !== produtoId) continue;
    const tirar = Math.min(item.quantidade, falta);
    falta -= tirar;
    if (tirar === item.quantidade) resultado.splice(i, 1);
    else resultado[i] = { ...item, quantidade: item.quantidade - tirar };
  }
  return resultado;
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
    descricao: `${venda.mesa ? nomeDaMesa(venda.mesa) : 'Venda'} · ${qtdItens} ${qtdItens === 1 ? 'item' : 'itens'} · ${formaPagamento(pagamento.forma).nome}`,
    valor: pagamento.valor,
    formaPagamento: pagamento.forma,
    referenciaId: venda.id,
    operador: venda.operador,
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
    operador: entrada.operador,
  };
}

/**
 * Marca quem fez a ação (vendas, entradas, pedidos de mesa, ajustes...). As telas e
 * o assistente despacham sem se preocupar com isso; o provedor carimba o nome.
 */
export function comOperador(acao: Acao, operador: string | undefined): Acao {
  if (!operador) return acao;
  switch (acao.tipo) {
    case 'registrar-venda':
      return { ...acao, venda: { ...acao.venda, operador } };
    case 'registrar-entrada':
      return { ...acao, entrada: { ...acao.entrada, operador } };
    case 'ajustar-estoque':
      return { ...acao, ajuste: { ...acao.ajuste, operador } };
    case 'registrar-lancamento':
      return { ...acao, lancamento: { ...acao.lancamento, operador } };
    case 'abrir-comanda':
      return { ...acao, comanda: { ...acao.comanda, abertaPor: operador } };
    case 'lancar-na-comanda':
      return { ...acao, itens: acao.itens.map((i) => ({ ...i, operador })) };
    case 'fechar-comanda':
      return { ...acao, venda: { ...acao.venda, operador } };
    case 'cancelar-comanda':
      return { ...acao, operador };
    default:
      return acao;
  }
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
