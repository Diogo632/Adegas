import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Acao, LojaAdega } from './estado';
import { reducer } from './estado';
import type { DadosAjuste, DadosEdicaoProduto, DadosEntrada } from './estoque';
import { montarAjuste, montarEdicaoProduto, montarEntrada } from './estoque';
import type { DadosLancamento } from './financeiro';
import { montarLancamento } from './financeiro';
import type { DadosLembrete } from './lembretes';
import { montarLembrete } from './lembretes';
import { estadoDeExemplo } from './exemplo';
import type { AjusteEstoque, EntradaEstoque, Estado, Lancamento, Lembrete, Produto, Resultado, Venda } from './tipos';
import type { DadosPagamento, ItemCarrinho } from './vendas';
import { alterarQuantidade, montarVenda, quantidadeNoCarrinho } from './vendas';

interface ContextoAdega {
  estado: Estado;
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

  // As validações precisam do estado mais recente, mesmo dentro de callbacks antigos.
  const estadoAtual = useRef(estado);
  estadoAtual.current = estado;
  const carrinhoAtual = useRef(carrinho);
  carrinhoAtual.current = carrinho;

  // A referência anda junto com cada ação, sem esperar a tela redesenhar: o assistente
  // registra uma entrada e, logo em seguida, já consulta o estoque novo.
  const despachar = useCallback((acao: Acao) => {
    estadoAtual.current = reducer(estadoAtual.current, acao);
    despacharNoReact(acao);
  }, []);

  const loja = useMemo<LojaAdega>(() => ({ estado: () => estadoAtual.current, despachar }), [despachar]);

  const definirQuantidade = useCallback((produtoId: string, quantidade: number) => {
    const produto = estadoAtual.current.produtos.find((p) => p.id === produtoId);
    if (produto) setCarrinho((c) => alterarQuantidade(c, produto, quantidade));
  }, []);

  const limparCarrinho = useCallback(() => setCarrinho([]), []);

  const registrarEntrada = useCallback((dados: DadosEntrada): Resultado<EntradaEstoque> => {
    const resultado = montarEntrada(estadoAtual.current, dados);
    if (!resultado.ok) return resultado;
    despachar({ tipo: 'registrar-entrada', ...resultado.valor });
    return { ok: true, valor: resultado.valor.entrada };
  }, [despachar]);

  const finalizarVenda = useCallback((pagamento: DadosPagamento): Resultado<Venda> => {
    const resultado = montarVenda(estadoAtual.current, carrinhoAtual.current, pagamento);
    if (!resultado.ok) return resultado;
    despachar({ tipo: 'registrar-venda', venda: resultado.valor });
    setCarrinho([]);
    return resultado;
  }, [despachar]);

  const editarProduto = useCallback((produtoId: string, dados: DadosEdicaoProduto): Resultado<Produto> => {
    const resultado = montarEdicaoProduto(estadoAtual.current, produtoId, dados);
    if (resultado.ok) despachar({ tipo: 'editar-produto', produto: resultado.valor });
    return resultado;
  }, [despachar]);

  const ajustarEstoque = useCallback((dados: DadosAjuste): Resultado<AjusteEstoque> => {
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
  }, [despachar]);

  const registrarLancamento = useCallback((dados: DadosLancamento): Resultado<Lancamento> => {
    const resultado = montarLancamento(dados);
    if (resultado.ok) despachar({ tipo: 'registrar-lancamento', lancamento: resultado.valor });
    return resultado;
  }, [despachar]);

  const excluirLancamento = useCallback((id: string) => despachar({ tipo: 'excluir-lancamento', id }), [despachar]);

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

  const valor = useMemo(
    () => ({
      estado,
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
      loja,
    }),
    [
      estado,
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
