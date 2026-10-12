import { createContext, useCallback, useContext, useMemo, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { reducer } from './estado';
import type { DadosEntrada } from './estoque';
import { montarEntrada } from './estoque';
import { estadoDeExemplo } from './exemplo';
import type { EntradaEstoque, Estado, Resultado, Venda } from './tipos';
import type { DadosPagamento, ItemCarrinho } from './vendas';
import { alterarQuantidade, montarVenda } from './vendas';

interface ContextoAdega {
  estado: Estado;
  carrinho: ItemCarrinho[];
  definirQuantidade(produtoId: string, quantidade: number): void;
  limparCarrinho(): void;
  registrarEntrada(dados: DadosEntrada): Resultado<EntradaEstoque>;
  /** Fecha a venda com o que está no carrinho e esvazia o carrinho. */
  finalizarVenda(pagamento: DadosPagamento): Resultado<Venda>;
}

const Contexto = createContext<ContextoAdega | null>(null);

/**
 * Guarda os dados da adega na memória do aparelho/navegador.
 * Próximo passo: trocar por um banco na nuvem para app e web verem os mesmos dados.
 */
export function AdegaProvider({ children, estadoInicial }: { children: ReactNode; estadoInicial?: Estado }) {
  const [estado, despachar] = useReducer(reducer, estadoInicial ?? null, (inicial) => inicial ?? estadoDeExemplo());
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);

  // As validações precisam do estado mais recente, mesmo dentro de callbacks antigos.
  const estadoAtual = useRef(estado);
  estadoAtual.current = estado;
  const carrinhoAtual = useRef(carrinho);
  carrinhoAtual.current = carrinho;

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
  }, []);

  const finalizarVenda = useCallback((pagamento: DadosPagamento): Resultado<Venda> => {
    const resultado = montarVenda(estadoAtual.current, carrinhoAtual.current, pagamento);
    if (!resultado.ok) return resultado;
    despachar({ tipo: 'registrar-venda', venda: resultado.valor });
    setCarrinho([]);
    return resultado;
  }, []);

  const valor = useMemo(
    () => ({ estado, carrinho, definirQuantidade, limparCarrinho, registrarEntrada, finalizarVenda }),
    [estado, carrinho, definirQuantidade, limparCarrinho, registrarEntrada, finalizarVenda],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAdega(): ContextoAdega {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useAdega precisa estar dentro de <AdegaProvider>.');
  return contexto;
}
