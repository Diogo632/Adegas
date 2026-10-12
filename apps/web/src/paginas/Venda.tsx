import type { CategoriaId, FormaPagamento, Produto, Venda as VendaFeita } from '@adegas/core';
import {
  CATEGORIAS,
  FORMAS_PAGAMENTO,
  buscarProdutos,
  centavosParaTexto,
  formaPagamento,
  formatarDinheiro,
  itensDoCarrinho,
  maisVendidos,
  paraCentavos,
  quantidadeNoCarrinho,
  sugestoesDeValorRecebido,
  totalCarrinho,
  totalItens,
  useAdega,
} from '@adegas/core';
import { Check, Search } from 'lucide-react';
import { useState } from 'react';
import { Contador } from '../componentes/Contador';
import { IconeQuadrado } from '../componentes/IconeQuadrado';
import { ICONE_CATEGORIA, ICONE_FORMA } from '../componentes/icones';

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
  const recebido = paraCentavos(recebidoTexto);
  const faltaDinheiro = forma === 'dinheiro' && recebido !== null && recebido < total;

  function adicionar(produtoId: string) {
    setConcluida(null);
    definirQuantidade(produtoId, quantidadeNoCarrinho(carrinho, produtoId) + 1);
  }

  function confirmar() {
    if (!forma) return;
    const resultado = finalizarVenda({ forma, valorRecebido: forma === 'dinheiro' ? recebido : undefined });
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
        {qtd > 0 && <span className="produto-qtd">{qtd}</span>}
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

      <aside className="pdv-caixa cartao">
        {concluida && (
          <div className="sucesso">
            <span className="sucesso-selo">
              <Check size={16} strokeWidth={3} />
            </span>
            <div>
              <strong>Venda registrada · {formatarDinheiro(concluida.total)}</strong>
              <small>
                {formaPagamento(concluida.pagamentos[0].forma).nome} · estoque e caixa atualizados
              </small>
              {concluida.troco !== undefined && concluida.troco > 0 && (
                <span className="troco-grande">Troco {formatarDinheiro(concluida.troco)}</span>
              )}
            </div>
          </div>
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
              <li key={i.produto.id}>
                <div className="carrinho-nome">
                  <span>{i.produto.nome}</span>
                  <small className="suave">{formatarDinheiro(i.produto.precoVenda)} cada</small>
                </div>
                <Contador
                  valor={i.quantidade}
                  maximo={i.produto.estoque}
                  onChange={(v) => definirQuantidade(i.produto.id, v)}
                />
                <strong className="num">{formatarDinheiro(i.subtotal)}</strong>
              </li>
            ))}
          </ul>
        )}

        <div className="total">
          <span>
            Total · {totalItens(carrinho)} {totalItens(carrinho) === 1 ? 'item' : 'itens'}
          </span>
          <strong>{formatarDinheiro(total)}</strong>
        </div>

        <h3 className="secao">Forma de pagamento</h3>
        <div className="formas">
          {FORMAS_PAGAMENTO.map((f) => {
            const Icone = ICONE_FORMA[f.id];
            return (
              <button
                key={f.id}
                className={`forma ${forma === f.id ? 'ativa' : ''}`}
                disabled={itens.length === 0}
                onClick={() => {
                  setForma(f.id);
                  setErro(null);
                }}
              >
                <Icone size={20} strokeWidth={1.6} />
                {f.nome}
              </button>
            );
          })}
        </div>
        {forma && <p className="suave dica">{formaPagamento(forma).dica}</p>}

        {forma === 'dinheiro' && (
          <div className="dinheiro">
            <label className="rotulo">
              Valor recebido
              <div className="campo-prefixo">
                <span>R$</span>
                <input
                  className="campo"
                  inputMode="decimal"
                  placeholder={centavosParaTexto(total)}
                  value={recebidoTexto}
                  onChange={(e) => setRecebidoTexto(e.target.value)}
                />
              </div>
            </label>
            <div className="chips">
              {sugestoesDeValorRecebido(total).map((v) => (
                <button
                  key={v}
                  className={`chip ${recebido === v ? 'ativo' : ''}`}
                  onClick={() => setRecebidoTexto(centavosParaTexto(v))}
                >
                  {v === total ? 'Valor exato' : formatarDinheiro(v)}
                </button>
              ))}
            </div>
            <div className={`troco ${faltaDinheiro ? 'falta' : ''}`}>
              {faltaDinheiro ? 'Faltam' : 'Troco'}
              <strong>{formatarDinheiro(recebido === null ? 0 : Math.abs(recebido - total))}</strong>
            </div>
          </div>
        )}

        {erro && <p className="erro">{erro}</p>}

        <button className="botao grande" disabled={!forma || itens.length === 0 || faltaDinheiro} onClick={confirmar}>
          {forma ? `Confirmar ${formatarDinheiro(total)}` : 'Escolha a forma de pagamento'}
        </button>
      </aside>
    </div>
  );
}
