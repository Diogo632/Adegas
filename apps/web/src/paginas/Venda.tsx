import type { CategoriaId, FormaPagamento, Produto, Venda as VendaFeita } from '@adegas/core';
import {
  CATEGORIAS,
  buscarProdutos,
  faltaDinheiro,
  formaPagamento,
  formatarDinheiro,
  itensDoCarrinho,
  maisVendidos,
  paraCentavos,
  quantidadeNoCarrinho,
  totalCarrinho,
  totalItens,
  useAdega,
} from '@adegas/core';
import { Check, Search } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { surgir } from '../animacoes';
import { Numero, SeloPulsante, Surgir } from '../componentes/Animados';
import { Contador } from '../componentes/Contador';
import { IconeQuadrado } from '../componentes/IconeQuadrado';
import { ICONE_CATEGORIA } from '../componentes/icones';
import { Pagamento } from '../componentes/Pagamento';

/** Frente de caixa: produtos à esquerda, carrinho e pagamento à direita. */
export function Venda() {
  const { estado, carrinho, definirQuantidade, limparCarrinho, finalizarVenda } = useAdega();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<CategoriaId | null>(null);
  const [forma, setForma] = useState<FormaPagamento | null>(null);
  const [recebidoTexto, setRecebidoTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [concluida, setConcluida] = useState<VendaFeita | null>(null);

  const produtos = buscarProdutos(estado.produtos, busca, filtro);
  const destaques = !busca && !filtro ? maisVendidos(estado, 4) : [];
  const itens = itensDoCarrinho(estado.produtos, carrinho);
  const total = totalCarrinho(estado.produtos, carrinho);
  const falta = faltaDinheiro(forma, paraCentavos(recebidoTexto), total);

  function adicionar(produtoId: string) {
    setConcluida(null);
    definirQuantidade(produtoId, quantidadeNoCarrinho(carrinho, produtoId) + 1);
  }

  function confirmar() {
    if (!forma) return;
    const resultado = finalizarVenda({ forma, valorRecebido: forma === 'dinheiro' ? paraCentavos(recebidoTexto) : undefined });
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setConcluida(resultado.valor);
    setErro(null);
    setForma(null);
    setRecebidoTexto('');
  }

  const cartaoProduto = (p: Produto) => {
    const qtd = quantidadeNoCarrinho(carrinho, p.id);
    return (
      <button
        key={p.id}
        data-entrada
        className={`produto ${qtd > 0 ? 'no-carrinho' : ''}`}
        disabled={p.estoque === 0 || qtd >= p.estoque}
        onClick={() => adicionar(p.id)}
      >
        <IconeQuadrado icone={ICONE_CATEGORIA[p.categoria]} />
        <span className="produto-nome">{p.nome}</span>
        <span className="produto-rodape">
          <span className="produto-preco">{formatarDinheiro(p.precoVenda)}</span>
          <span className={`produto-estoque ${p.estoque <= p.estoqueMinimo ? 'baixo' : ''}`}>
            {p.estoque === 0 ? 'sem estoque' : `${p.estoque} un`}
          </span>
        </span>
        {qtd > 0 && <SeloPulsante valor={qtd} className="produto-qtd" />}
      </button>
    );
  };

  return (
    <div className="pdv">
      <section className="pdv-produtos">
        <header className="cabecalho">
          <div>
            <p className="sobretitulo">Frente de caixa</p>
            <h1>Nova venda</h1>
          </div>
        </header>
        <label className="campo-icone">
          <Search size={18} strokeWidth={1.75} />
          <input
            className="campo"
            placeholder="Buscar produto"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoFocus
          />
        </label>
        <div className="chips">
          <button className={`chip ${filtro === null ? 'ativo' : ''}`} onClick={() => setFiltro(null)}>
            Todos
          </button>
          {CATEGORIAS.map((c) => (
            <button key={c.id} className={`chip ${filtro === c.id ? 'ativo' : ''}`} onClick={() => setFiltro(c.id)}>
              {c.nome}
            </button>
          ))}
        </div>

        {destaques.length > 0 && (
          <>
            <h3 className="secao">Mais vendidos</h3>
            <div className="grade-produtos">{destaques.map(cartaoProduto)}</div>
          </>
        )}
        <h3 className="secao">{destaques.length ? 'Todos os produtos' : `${produtos.length} produtos`}</h3>
        <div className="grade-produtos">
          {produtos.map(cartaoProduto)}
          {produtos.length === 0 && <p className="suave">Nenhum produto encontrado.</p>}
        </div>
      </section>

      <aside className="pdv-caixa cartao" data-entrada>
        {concluida && (
          <Surgir className="sucesso" chave={concluida.id}>
            <span className="sucesso-selo">
              <Check size={16} strokeWidth={3} />
            </span>
            <div>
              <strong>Venda registrada · {formatarDinheiro(concluida.total)}</strong>
              <small>
                {formaPagamento(concluida.pagamentos[0].forma).nome} · estoque e caixa atualizados
              </small>
              {concluida.troco !== undefined && concluida.troco > 0 && (
                <span className="troco-grande">
                  Troco <Numero valor={concluida.troco} />
                </span>
              )}
            </div>
          </Surgir>
        )}

        <div className="caixa-topo">
          <h2>Carrinho</h2>
          {itens.length > 0 && (
            <button className="link" onClick={limparCarrinho}>
              Limpar
            </button>
          )}
        </div>

        {itens.length === 0 ? (
          <p className="suave vazio">Clique nos produtos para adicionar.</p>
        ) : (
          <ul className="carrinho">
            {itens.map((i) => (
              <LinhaCarrinho key={i.produto.id}>
                <div className="carrinho-nome">
                  <span>{i.produto.nome}</span>
                  <small className="suave">{formatarDinheiro(i.produto.precoVenda)} cada</small>
                </div>
                <Contador
                  valor={i.quantidade}
                  maximo={i.produto.estoque}
                  onChange={(v) => definirQuantidade(i.produto.id, v)}
                />
                <Numero valor={i.subtotal} className="num forte" />
              </LinhaCarrinho>
            ))}
          </ul>
        )}

        <div className="total">
          <span>
            Total · {totalItens(carrinho)} {totalItens(carrinho) === 1 ? 'item' : 'itens'}
          </span>
          <strong>
            <Numero valor={total} />
          </strong>
        </div>

        <Pagamento
          total={total}
          forma={forma}
          onForma={(f) => {
            setForma(f);
            setErro(null);
          }}
          recebidoTexto={recebidoTexto}
          onRecebido={setRecebidoTexto}
          desabilitado={itens.length === 0}
        />

        {erro && <p className="erro">{erro}</p>}

        <button className="botao grande" disabled={!forma || itens.length === 0 || falta} onClick={confirmar}>
          {forma ? `Confirmar ${formatarDinheiro(total)}` : 'Escolha a forma de pagamento'}
        </button>
      </aside>
    </div>
  );
}

/** Linha do carrinho que entra deslizando quando o produto é adicionado. */
function LinhaCarrinho({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLLIElement>(null);
  useLayoutEffect(() => {
    if (ref.current) surgir(ref.current);
  }, []);
  return <li ref={ref}>{children}</li>;
}
