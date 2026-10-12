import type { CategoriaId, DadosEntrada, Embalagem, EntradaEstoque, FormaPagamento } from '@adegas/core';
import {
  CATEGORIAS,
  FORMAS_PAGAMENTO,
  buscarProdutos,
  categoria,
  formaPagamento,
  formatarDataHora,
  formatarDinheiro,
  margem,
  paraCentavos,
  previaEntrada,
  useAdega,
} from '@adegas/core';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Contador } from '../componentes/Contador';

const TAMANHOS_FARDO = [6, 12, 15, 24];

export function Entrada() {
  const { estado, registrarEntrada } = useAdega();
  const [parametros] = useSearchParams();

  const [modo, setModo] = useState<'existente' | 'novo'>('existente');
  const [produtoId, setProdutoId] = useState<string | null>(parametros.get('produto'));
  const [busca, setBusca] = useState('');

  const [nome, setNome] = useState('');
  const [categoriaNova, setCategoriaNova] = useState<CategoriaId>('cerveja');
  const [precoVendaTexto, setPrecoVendaTexto] = useState('');
  const [minimoTexto, setMinimoTexto] = useState('5');

  const [embalagem, setEmbalagem] = useState<Embalagem>('fardo');
  const [porFardoTexto, setPorFardoTexto] = useState('12');
  const [quantidade, setQuantidade] = useState(1);
  const [custoTexto, setCustoTexto] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [formaPgto, setFormaPgto] = useState<FormaPagamento>('pix');

  const [erro, setErro] = useState<string | null>(null);
  const [concluida, setConcluida] = useState<EntradaEstoque | null>(null);

  const produto = modo === 'existente' ? estado.produtos.find((p) => p.id === produtoId) : undefined;
  const porFardo = Number.parseInt(porFardoTexto, 10) || 0;
  const custo = paraCentavos(custoTexto);
  const precoVenda = modo === 'novo' ? paraCentavos(precoVendaTexto) : produto?.precoVenda;
  const previa = previaEntrada({ embalagem, quantidade, unidadesPorEmbalagem: porFardo, custoPorEmbalagem: custo ?? 0 });
  const nomeEmbalagem = embalagem === 'fardo' ? 'fardo/caixa' : 'unidade';

  function registrar(evento: FormEvent) {
    evento.preventDefault();
    const dados: DadosEntrada = {
      embalagem,
      quantidade,
      unidadesPorEmbalagem: embalagem === 'fardo' ? porFardo : undefined,
      custoPorEmbalagem: custo ?? Number.NaN,
      fornecedor,
      formaPagamento: formaPgto,
    };
    if (modo === 'existente') dados.produtoId = produtoId ?? undefined;
    else
      dados.produtoNovo = {
        nome,
        categoria: categoriaNova,
        precoVenda: paraCentavos(precoVendaTexto) ?? 0,
        estoqueMinimo: Number.parseInt(minimoTexto, 10) || 0,
      };

    const resultado = registrarEntrada(dados);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setErro(null);
    setConcluida(resultado.valor);
    setProdutoId(null);
    setBusca('');
    setNome('');
    setPrecoVendaTexto('');
    setQuantidade(1);
    setCustoTexto('');
    setFornecedor('');
    setModo('existente');
  }

  return (
    <div className="pagina">
      <div className="cabecalho">
        <h1>Entrada de produto</h1>
      </div>

      {concluida && (
        <div className="sucesso">
          <strong>
            ✅ Entrada registrada: +{concluida.unidades} un de {concluida.produtoNome}
          </strong>
          <span>
            Total {formatarDinheiro(concluida.custoTotal)} no {formaPagamento(concluida.formaPagamento).nome} · já lançado
            como despesa no financeiro
          </span>
        </div>
      )}

      <div className="grade-entrada">
        <form className="cartao formulario" onSubmit={registrar}>
          <h2>1. Qual produto chegou?</h2>
          <div className="segmentado">
            <button type="button" className={modo === 'existente' ? 'ativo' : ''} onClick={() => setModo('existente')}>
              Já cadastrado
            </button>
            <button type="button" className={modo === 'novo' ? 'ativo' : ''} onClick={() => setModo('novo')}>
              Produto novo
            </button>
          </div>

          {modo === 'existente' &&
            (produto ? (
              <div className="produto-escolhido">
                <span className="produto-icone">{categoria(produto.categoria).icone}</span>
                <div>
                  <strong>{produto.nome}</strong>
                  <small className="suave">
                    Em estoque: {produto.estoque} · vende a {formatarDinheiro(produto.precoVenda)} · custo médio{' '}
                    {formatarDinheiro(produto.custoMedio)}/un
                  </small>
                </div>
                <button type="button" className="link" onClick={() => setProdutoId(null)}>
                  Trocar
                </button>
              </div>
            ) : (
              <div className="escolha-produto">
                <input
                  className="campo"
                  placeholder="Buscar: Brahma, gelo, Marlboro..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
                <div className="opcoes">
                  {buscarProdutos(estado.produtos, busca)
                    .slice(0, 8)
                    .map((p) => (
                      <button type="button" key={p.id} className="opcao" onClick={() => setProdutoId(p.id)}>
                        <span>{categoria(p.categoria).icone}</span>
                        <span className="opcao-nome">{p.nome}</span>
                        <small className="suave">{p.estoque} un</small>
                      </button>
                    ))}
                </div>
              </div>
            ))}

          {modo === 'novo' && (
            <div className="campos">
              <label className="rotulo largo">
                Nome do produto
                <input className="campo" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Brahma Duplo Malte 350ml" />
              </label>
              <div className="rotulo largo">
                Categoria
                <div className="chips">
                  {CATEGORIAS.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      className={`chip ${categoriaNova === c.id ? 'ativo' : ''}`}
                      onClick={() => setCategoriaNova(c.id)}
                    >
                      {c.icone} {c.nome}
                    </button>
                  ))}
                </div>
              </div>
              <label className="rotulo">
                Preço de venda (unidade)
                <div className="campo-prefixo">
                  <span>R$</span>
                  <input className="campo" inputMode="decimal" placeholder="0,00" value={precoVendaTexto} onChange={(e) => setPrecoVendaTexto(e.target.value)} />
                </div>
              </label>
              <label className="rotulo">
                Avisar quando o estoque ficar abaixo de
                <input className="campo" inputMode="numeric" value={minimoTexto} onChange={(e) => setMinimoTexto(e.target.value)} />
              </label>
            </div>
          )}

          <h2>2. Como chegou?</h2>
          <div className="segmentado">
            <button type="button" className={embalagem === 'fardo' ? 'ativo' : ''} onClick={() => setEmbalagem('fardo')}>
              Fardo / caixa
            </button>
            <button type="button" className={embalagem === 'unidade' ? 'ativo' : ''} onClick={() => setEmbalagem('unidade')}>
              Unidade
            </button>
          </div>
          <div className="campos">
            {embalagem === 'fardo' && (
              <label className="rotulo">
                Unidades em cada fardo/caixa
                <div className="linha">
                  <input className="campo curto" inputMode="numeric" value={porFardoTexto} onChange={(e) => setPorFardoTexto(e.target.value)} />
                  {TAMANHOS_FARDO.map((n) => (
                    <button type="button" key={n} className={`chip ${porFardo === n ? 'ativo' : ''}`} onClick={() => setPorFardoTexto(String(n))}>
                      {n}
                    </button>
                  ))}
                </div>
              </label>
            )}
            <div className="rotulo">
              Quantos {embalagem === 'fardo' ? 'fardos/caixas' : 'unidades'}?
              <Contador valor={quantidade} minimo={1} onChange={setQuantidade} />
            </div>
            <label className="rotulo">
              Custo por {nomeEmbalagem}
              <div className="campo-prefixo">
                <span>R$</span>
                <input
                  className="campo"
                  inputMode="decimal"
                  value={custoTexto}
                  onChange={(e) => setCustoTexto(e.target.value)}
                  placeholder={produto ? `último: ${formatarDinheiro(produto.custoMedio * previa.unidadesPorEmbalagem)}` : '0,00'}
                />
              </div>
            </label>
          </div>

          <h2>3. Compra</h2>
          <div className="campos">
            <label className="rotulo">
              Fornecedor (opcional)
              <input className="campo" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex.: Distribuidora Central" />
            </label>
            <div className="rotulo">
              Pago com
              <div className="chips">
                {FORMAS_PAGAMENTO.map((f) => (
                  <button type="button" key={f.id} className={`chip ${formaPgto === f.id ? 'ativo' : ''}`} onClick={() => setFormaPgto(f.id)}>
                    {f.icone} {f.nome}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {erro && <p className="erro">{erro}</p>}
          <button type="submit" className="botao grande">
            Registrar entrada
          </button>
        </form>

        <div className="coluna">
          <section className="cartao resumo-entrada">
            <h2>Resumo</h2>
            <dl>
              <dt>Entram no estoque</dt>
              <dd>
                {previa.unidades} un{produto ? ` (fica ${produto.estoque + previa.unidades})` : ''}
              </dd>
              <dt>Custo por unidade</dt>
              <dd>{formatarDinheiro(previa.custoUnitario)}</dd>
              {precoVenda ? (
                <>
                  <dt>Margem na venda</dt>
                  <dd>{margem(precoVenda, previa.custoUnitario)}%</dd>
                </>
              ) : null}
              <dt className="forte">Total da compra</dt>
              <dd className="forte">{formatarDinheiro(previa.custoTotal)}</dd>
            </dl>
          </section>

          <section className="cartao">
            <h2>Entradas recentes</h2>
            {estado.entradas.length === 0 ? (
              <p className="suave">Nenhuma entrada ainda.</p>
            ) : (
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Produto</th>
                    <th className="num">Qtd</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {estado.entradas.slice(0, 8).map((e) => (
                    <tr key={e.id}>
                      <td className="suave">{formatarDataHora(e.data)}</td>
                      <td>
                        {e.produtoNome}
                        {e.fornecedor ? <small className="suave"> · {e.fornecedor}</small> : null}
                      </td>
                      <td className="num">+{e.unidades}</td>
                      <td className="num">{formatarDinheiro(e.custoTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
