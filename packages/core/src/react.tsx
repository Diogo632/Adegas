import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { montarComanda, montarFechamento, montarItensComanda, montarRemocaoComanda } from './comandas';
import type { Acao, LojaAdega } from './estado';
import { comOperador, reducer } from './estado';
import type { DadosAjuste, DadosEdicaoProduto, DadosEntrada } from './estoque';
import { montarAjuste, montarEdicaoProduto, montarEntrada } from './estoque';
import type { DadosLancamento } from './financeiro';
import { montarLancamento } from './financeiro';
import type { DadosLembrete } from './lembretes';
import { montarLembrete } from './lembretes';
import { estadoDeExemplo } from './exemplo';
import type {
  AjusteEstoque,
  Comanda,
  EntradaEstoque,
  Estado,
  ItemComanda,
  Lancamento,
  Lembrete,
  Permissao,
  Produto,
  Resultado,
  Usuario,
  Venda,
} from './tipos';
import type { DadosUsuario } from './usuarios';
import { entrar as conferirEntrada, montarUsuario, pode as usuarioPode } from './usuarios';
import type { DadosPagamento, ItemCarrinho } from './vendas';
import { alterarQuantidade, montarVenda, quantidadeNoCarrinho } from './vendas';

interface ContextoAdega {
  estado: Estado;
  /** Quem está usando agora (null = tela de entrada). */
  usuario: Usuario | null;
  entrar(usuarioId: string, pin: string): Resultado<Usuario>;
  sair(): void;
  /** Quem está usando pode fazer isso? */
  pode(permissao: Permissao | 'usuarios'): boolean;
  /** Cadastrar ou editar usuário (só administrador). */
  salvarUsuario(dados: DadosUsuario): Resultado<Usuario>;
  carrinho: ItemCarrinho[];
  definirQuantidade(produtoId: string, quantidade: number): void;
  limparCarrinho(): void;
  registrarEntrada(dados: DadosEntrada): Resultado<EntradaEstoque>;
  /** Fecha a venda com o que está no carrinho e esvazia o carrinho. */
  finalizarVenda(pagamento: DadosPagamento): Resultado<Venda>;
  editarProduto(produtoId: string, dados: DadosEdicaoProduto): Resultado<Produto>;
  ajustarEstoque(dados: DadosAjuste): Resultado<AjusteEstoque>;
  registrarLancamento(dados: DadosLancamento): Resultado<Lancamento>;
  /** Só apaga lançamentos feitos à mão. */
  excluirLancamento(id: string): void;
  criarLembrete(dados: DadosLembrete): Resultado<Lembrete>;
  concluirLembrete(id: string): void;
  excluirLembrete(id: string): void;
  /** Abre a conta de uma mesa ("10", "Balcão"...). */
  abrirComanda(mesa: string): Resultado<Comanda>;
  /** Lança pedidos na conta; saem do estoque na hora. */
  lancarNaComanda(comandaId: string, pedidos: ItemCarrinho[]): Resultado<ItemComanda[]>;
  /** Tira da conta e devolve ao estoque. */
  removerDaComanda(comandaId: string, produtoId: string, quantidade: number): Resultado<{ produtoId: string; quantidade: number }>;
  fecharComanda(comandaId: string, pagamento: DadosPagamento): Resultado<Venda>;
  /** Mesa que foi embora sem consumir (ou aberta por engano): tudo volta ao estoque. */
  cancelarComanda(comandaId: string): Resultado<Comanda>;
  /** Acesso direto aos dados, para quem não é tela (o assistente, via MCP). */
  loja: LojaAdega;
}

const Contexto = createContext<ContextoAdega | null>(null);

/**
 * Guarda os dados da adega na memória do aparelho/navegador.
 * Próximo passo: trocar por um banco na nuvem para app e web verem os mesmos dados.
 */
export function AdegaProvider({ children, estadoInicial }: { children: ReactNode; estadoInicial?: Estado }) {
  const [estado, despacharNoReact] = useReducer(reducer, estadoInicial ?? null, (inicial) => inicial ?? estadoDeExemplo());
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);

  // As validações precisam do estado mais recente, mesmo dentro de callbacks antigos.
  const estadoAtual = useRef(estado);
  estadoAtual.current = estado;
  const carrinhoAtual = useRef(carrinho);
  carrinhoAtual.current = carrinho;

  // Quem está logado (some se o administrador desativar a pessoa).
  const usuario = estado.usuarios.find((u) => u.id === usuarioId && u.ativo) ?? null;
  const usuarioAtual = useRef(usuario);
  usuarioAtual.current = usuario;
  const permitido = useCallback((permissao: Permissao | 'usuarios') => usuarioPode(usuarioAtual.current, permissao), []);
  const semPermissao = <T,>(oQue: string): Resultado<T> => ({ ok: false, erro: `Seu usuário não tem permissão para ${oQue}.` });

  // A referência anda junto com cada ação, sem esperar a tela redesenhar: o assistente
  // registra uma entrada e, logo em seguida, já consulta o estoque novo.
  // Cada ação sai com o nome de quem fez.
  const despachar = useCallback((acao: Acao) => {
    const carimbada = comOperador(acao, usuarioAtual.current?.nome);
    estadoAtual.current = reducer(estadoAtual.current, carimbada);
    despacharNoReact(carimbada);
  }, []);

  const entrar = useCallback((id: string, pin: string): Resultado<Usuario> => {
    const resultado = conferirEntrada(estadoAtual.current, id, pin);
    if (resultado.ok) {
      usuarioAtual.current = resultado.valor;
      setUsuarioId(resultado.valor.id);
      setCarrinho([]);
    }
    return resultado;
  }, []);

  const sair = useCallback(() => {
    usuarioAtual.current = null;
    setUsuarioId(null);
    setCarrinho([]);
  }, []);

  const salvarUsuario = useCallback(
    (dados: DadosUsuario): Resultado<Usuario> => {
      if (!permitido('usuarios')) return semPermissao('cadastrar usuários');
      const eu = usuarioAtual.current;
      if (eu && dados.id === eu.id && (!dados.ativo || dados.papel !== eu.papel)) {
        return { ok: false, erro: 'Você não pode desativar nem tirar o acesso de administrador do seu próprio usuário. Peça a outro administrador.' };
      }
      const resultado = montarUsuario(estadoAtual.current, dados);
      if (resultado.ok) despachar({ tipo: 'salvar-usuario', usuario: resultado.valor });
      return resultado;
    },
    [despachar, permitido],
  );

  const loja = useMemo<LojaAdega>(() => ({ estado: () => estadoAtual.current, despachar }), [despachar]);

  // O carrinho do balcão não pode ficar com mais do que sobrou depois de um pedido de mesa.
  const conferirCarrinho = useCallback(() => {
    const produtos = estadoAtual.current.produtos;
    setCarrinho((c) =>
      c.reduce<ItemCarrinho[]>((novo, item) => {
        const produto = produtos.find((p) => p.id === item.produtoId);
        return produto ? alterarQuantidade(novo, produto, Math.min(item.quantidade, produto.estoque)) : novo;
      }, []),
    );
  }, []);

  const definirQuantidade = useCallback((produtoId: string, quantidade: number) => {
    const produto = estadoAtual.current.produtos.find((p) => p.id === produtoId);
    if (produto) setCarrinho((c) => alterarQuantidade(c, produto, quantidade));
  }, []);

  const limparCarrinho = useCallback(() => setCarrinho([]), []);

  const registrarEntrada = useCallback((dados: DadosEntrada): Resultado<EntradaEstoque> => {
    if (!permitido('entrada')) return semPermissao('registrar entrada');
    const resultado = montarEntrada(estadoAtual.current, dados);
    if (!resultado.ok) return resultado;
    despachar({ tipo: 'registrar-entrada', ...resultado.valor });
    return { ok: true, valor: resultado.valor.entrada };
  }, [despachar, permitido]);

  const finalizarVenda = useCallback((pagamento: DadosPagamento): Resultado<Venda> => {
    if (!permitido('vender')) return semPermissao('vender');
    const resultado = montarVenda(estadoAtual.current, carrinhoAtual.current, pagamento);
    if (!resultado.ok) return resultado;
    despachar({ tipo: 'registrar-venda', venda: resultado.valor });
    setCarrinho([]);
    return resultado;
  }, [despachar, permitido]);

  const editarProduto = useCallback((produtoId: string, dados: DadosEdicaoProduto): Resultado<Produto> => {
    if (!permitido('ajustar_estoque')) return semPermissao('editar produtos');
    const resultado = montarEdicaoProduto(estadoAtual.current, produtoId, dados);
    if (resultado.ok) despachar({ tipo: 'editar-produto', produto: resultado.valor });
    return resultado;
  }, [despachar, permitido]);

  const ajustarEstoque = useCallback((dados: DadosAjuste): Resultado<AjusteEstoque> => {
    if (!permitido('ajustar_estoque')) return semPermissao('ajustar o estoque');
    const resultado = montarAjuste(estadoAtual.current, dados);
    if (resultado.ok) {
      despachar({ tipo: 'ajustar-estoque', ajuste: resultado.valor });
      // O carrinho não pode ficar com mais do que sobrou.
      const produto = estadoAtual.current.produtos.find((p) => p.id === dados.produtoId);
      if (produto) {
        setCarrinho((c) => alterarQuantidade(c, { ...produto, estoque: resultado.valor.quantidadeDepois }, quantidadeNoCarrinho(c, produto.id)));
      }
    }
    return resultado;
  }, [despachar, permitido]);

  const registrarLancamento = useCallback((dados: DadosLancamento): Resultado<Lancamento> => {
    if (!permitido('financeiro')) return semPermissao('lançar no financeiro');
    const resultado = montarLancamento(dados);
    if (resultado.ok) despachar({ tipo: 'registrar-lancamento', lancamento: resultado.valor });
    return resultado;
  }, [despachar, permitido]);

  const excluirLancamento = useCallback(
    (id: string) => {
      if (permitido('financeiro')) despachar({ tipo: 'excluir-lancamento', id });
    },
    [despachar, permitido],
  );

  const criarLembrete = useCallback(
    (dados: DadosLembrete): Resultado<Lembrete> => {
      const resultado = montarLembrete(estadoAtual.current, dados);
      if (resultado.ok) despachar({ tipo: 'criar-lembrete', lembrete: resultado.valor });
      return resultado;
    },
    [despachar],
  );
  const concluirLembrete = useCallback(
    (id: string) => despachar({ tipo: 'concluir-lembrete', id, data: new Date().toISOString() }),
    [despachar],
  );
  const excluirLembrete = useCallback((id: string) => despachar({ tipo: 'excluir-lembrete', id }), [despachar]);

  const abrirComanda = useCallback(
    (mesa: string): Resultado<Comanda> => {
      if (!permitido('mesas')) return semPermissao('atender mesas');
      const resultado = montarComanda(estadoAtual.current, { mesa });
      if (resultado.ok) despachar({ tipo: 'abrir-comanda', comanda: resultado.valor });
      return resultado;
    },
    [despachar],
  );
  const lancarNaComanda = useCallback(
    (comandaId: string, pedidos: ItemCarrinho[]): Resultado<ItemComanda[]> => {
      if (!permitido('mesas')) return semPermissao('atender mesas');
      const resultado = montarItensComanda(estadoAtual.current, comandaId, pedidos);
      if (resultado.ok) {
        despachar({ tipo: 'lancar-na-comanda', comandaId, itens: resultado.valor });
        conferirCarrinho();
      }
      return resultado;
    },
    [despachar, conferirCarrinho, permitido],
  );
  const removerDaComanda = useCallback(
    (comandaId: string, produtoId: string, quantidade: number): Resultado<{ produtoId: string; quantidade: number }> => {
      if (!permitido('corrigir_mesas')) return semPermissao('tirar itens da conta');
      const resultado = montarRemocaoComanda(estadoAtual.current, comandaId, produtoId, quantidade);
      if (resultado.ok) despachar({ tipo: 'remover-da-comanda', comandaId, ...resultado.valor });
      return resultado;
    },
    [despachar, permitido],
  );
  const fecharComanda = useCallback(
    (comandaId: string, pagamento: DadosPagamento): Resultado<Venda> => {
      if (!permitido('mesas')) return semPermissao('fechar contas');
      const resultado = montarFechamento(estadoAtual.current, comandaId, pagamento);
      if (resultado.ok) despachar({ tipo: 'fechar-comanda', comandaId, venda: resultado.valor });
      return resultado;
    },
    [despachar, permitido],
  );
  const cancelarComanda = useCallback(
    (comandaId: string): Resultado<Comanda> => {
      if (!permitido('corrigir_mesas')) return semPermissao('cancelar mesas');
      const comanda = estadoAtual.current.comandas.find((c) => c.id === comandaId && c.situacao === 'aberta');
      if (!comanda) return { ok: false, erro: 'Conta não encontrada ou já fechada.' };
      despachar({ tipo: 'cancelar-comanda', comandaId, data: new Date().toISOString() });
      return { ok: true, valor: comanda };
    },
    [despachar, permitido],
  );

  const valor = useMemo(
    () => ({
      estado,
      usuario,
      entrar,
      sair,
      pode: permitido,
      salvarUsuario,
      carrinho,
      definirQuantidade,
      limparCarrinho,
      registrarEntrada,
      finalizarVenda,
      editarProduto,
      ajustarEstoque,
      registrarLancamento,
      excluirLancamento,
      criarLembrete,
      concluirLembrete,
      excluirLembrete,
      abrirComanda,
      lancarNaComanda,
      removerDaComanda,
      fecharComanda,
      cancelarComanda,
      loja,
    }),
    [
      estado,
      usuario,
      entrar,
      sair,
      permitido,
      salvarUsuario,
      carrinho,
      definirQuantidade,
      limparCarrinho,
      registrarEntrada,
      finalizarVenda,
      editarProduto,
      ajustarEstoque,
      registrarLancamento,
      excluirLancamento,
      criarLembrete,
      concluirLembrete,
      excluirLembrete,
      abrirComanda,
      lancarNaComanda,
      removerDaComanda,
      fecharComanda,
      cancelarComanda,
      loja,
    ],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAdega(): ContextoAdega {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useAdega precisa estar dentro de <AdegaProvider>.');
  return contexto;
}

// Existem no navegador e no React Native; o núcleo não depende de nenhum dos dois.
declare function requestAnimationFrame(callback: () => void): number;
declare function cancelAnimationFrame(id: number): void;

/**
 * Faz um número "contar" até o valor novo (ex.: R$ 0 → R$ 368,50), em JavaScript,
 * quadro a quadro. Funciona igual no app e no web. Devolve o valor do momento,
 * sem arredondar; quem mostra arredonda.
 */
export function useContagem(alvo: number, { duracao = 700, animar = true }: { duracao?: number; animar?: boolean } = {}): number {
  const [valor, setValor] = useState(animar ? 0 : alvo);
  const atual = useRef(valor);

  useEffect(() => {
    const inicio = atual.current;
    const diferenca = alvo - inicio;
    if (!animar || diferenca === 0) {
      atual.current = alvo;
      setValor(alvo);
      return;
    }
    const t0 = Date.now();
    let quadro = 0;
    const passo = () => {
      const progresso = Math.min(1, (Date.now() - t0) / duracao);
      const suavizado = 1 - Math.pow(1 - progresso, 3);
      atual.current = inicio + diferenca * suavizado;
      setValor(atual.current);
      if (progresso < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo, duracao, animar]);

  return valor;
}
