import type { CategoriaId, DadosEntrada, Embalagem, EntradaEstoque, FormaPagamento } from '@adegas/core';
import {
  CATEGORIAS,
  FORMAS_PAGAMENTO,
  buscarProdutos,
  formaPagamento,
  formatarDataHora,
  formatarDinheiro,
  margem,
  paraCentavos,
  previaEntrada,
  useAdega,
} from '@adegas/core';
import { Check, ChevronRight, ScanBarcode, Search } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Numero, Surgir } from '../componentes/Animados';
import { Contador } from '../componentes/Contador';
import { IconeQuadrado } from '../componentes/IconeQuadrado';
import { ICONE_CATEGORIA } from '../componentes/icones';

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
      <header className="cabecalho">
        <div>
          <p className="sobretitulo">Chegou mercadoria</p>
          <h1>Entrada de produto</h1>
        </div>
      </header>

      <Link to="/entrada/nota" className="atalho-nota">
        <span className="atalho-nota-icone">
          <ScanBarcode size={22} strokeWidth={1.75} />
        </span>
        <span>
          <strong>Chegou com nota fiscal? Dê entrada pela nota</strong>
          <small>Bipe a nota pelo celular ou mande o XML: os produtos são reconhecidos e entram todos de uma vez.</small>
        </span>
        <ChevronRight size={20} />
      </Link>

      {concluida && (
        <Surgir className="sucesso" chave={concluida.id}>
          <span className="sucesso-selo">
            <Check size={16} strokeWidth={3} />
          </span>
          <div>
            <strong>
              Entrada registrada: +{concluida.unidades} un de {concluida.produtoNome}
            </strong>
            <small>
              {formatarDinheiro(concluida.custoTotal)} no {formaPagamento(concluida.formaPagamento).nome.toLowerCase()} · já
              lançado como despesa no financeiro
            </small>
          </div>
        </Surgir>
      )}

      <div className="grade-entrada">
        <form className="cartao formulario" onSubmit={registrar} data-entrada>
          <Passo numero={1} titulo="Qual produto chegou?" />
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
                <IconeQuadrado icone={ICONE_CATEGORIA[produto.categoria]} />
                <div>
                  <strong>{produto.nome}</strong>
                  <small className="suave">
                    {produto.estoque} em estoque · vende a {formatarDinheiro(produto.precoVenda)} · custo médio{' '}
                    {formatarDinheiro(produto.custoMedio)}/un
                  </small>
                </div>
                <button type="button" className="link" onClick={() => setProdutoId(null)}>
                  Trocar
                </button>
              </div>
            ) : (
              <div className="escolha-produto">
                <label className="campo-icone">
                  <Search size={18} strokeWidth={1.75} />
                  <input
                    className="campo"
                    placeholder="Buscar: Brahma, gelo, Marlboro…"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </label>
                <div className="opcoes">
                  {buscarProdutos(estado.produtos, busca)
                    .slice(0, 8)
                    .map((p) => (
                      <button type="button" key={p.id} className="opcao" onClick={() => setProdutoId(p.id)}>
                        <IconeQuadrado icone={ICONE_CATEGORIA[p.categoria]} tamanho={32} />
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
                      {c.nome}
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

          <Passo numero={2} titulo="Como chegou?" />
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
              <div className="rotulo largo">
                Unidades em cada fardo
                <div className="chips">
                  {TAMANHOS_FARDO.map((n) => (
                    <button type="button" key={n} className={`chip ${porFardo === n ? 'ativo' : ''}`} onClick={() => setPorFardoTexto(String(n))}>
                      {n}
                    </button>
                  ))}
                  <input
                    className="campo curto"
                    inputMode="numeric"
                    placeholder="Outro"
                    aria-label="Outro tamanho de fardo"
                    value={TAMANHOS_FARDO.includes(porFardo) ? '' : porFardoTexto}
                    onChange={(e) => setPorFardoTexto(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="rotulo">
              Quantos {embalagem === 'fardo' ? 'fardos' : 'unidades'}?
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
                  placeholder={
                    produto
                      ? `último ${formatarDinheiro(produto.custoMedio * previa.unidadesPorEmbalagem).replace('R$ ', '')}`
                      : '0,00'
                  }
                />
              </div>
            </label>
          </div>

          <Passo numero={3} titulo="Pagamento ao fornecedor" />
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
                    {f.nome}
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
          <section className="cartao escuro resumo-entrada" data-entrada>
            <h2>Resumo</h2>
            <dl>
              <dt>Entram no estoque</dt>
              <dd>
                {previa.unidades} un{produto ? ` · fica ${produto.estoque + previa.unidades}` : ''}
              </dd>
              <dt>Custo por unidade</dt>
              <dd>
                <Numero valor={previa.custoUnitario} />
              </dd>
              {precoVenda ? (
                <>
                  <dt>Margem na venda</dt>
                  <dd>
                    <Numero valor={margem(precoVenda, previa.custoUnitario)} formato="porcento" />
                  </dd>
                </>
              ) : null}
              <dt className="total-compra">Total da compra</dt>
              <dd className="total-compra">
                <Numero valor={previa.custoTotal} />
              </dd>
            </dl>
          </section>

          <section className="cartao" data-entrada>
            <h2>Entradas recentes</h2>
            {estado.entradas.length === 0 ? (
              <p className="suave">Nenhuma entrada ainda.</p>
            ) : (
              <ul className="lista">
                {estado.entradas.slice(0, 6).map((e) => (
                  <li key={e.id}>
                    <div className="lista-texto">
                      <strong>{e.produtoNome}</strong>
                      <small>
                        {formatarDataHora(e.data)}
                        {e.fornecedor ? ` · ${e.fornecedor}` : ''}
                      </small>
                    </div>
                    <div className="lista-valor">
                      <strong>+{e.unidades} un</strong>
                      <small>{formatarDinheiro(e.custoTotal)}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Passo({ numero, titulo }: { numero: number; titulo: string }) {
  return (
    <h2 className="passo">
      <span>{numero}</span>
      {titulo}
    </h2>
  );
}
