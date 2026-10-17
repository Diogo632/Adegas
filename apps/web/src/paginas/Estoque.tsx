import type { CategoriaId, FiltroEstoque, MotivoAjuste, Produto, StatusEstoque } from '@adegas/core';
import {
  CATEGORIAS,
  MOTIVOS_AJUSTE,
  categoria,
  centavosParaTexto,
  filtrarEstoque,
  formatarDataHora,
  formatarDinheiro,
  margem,
  motivoAjuste,
  movimentosDoProduto,
  paraCentavos,
  resumoEstoque,
  statusEstoque,
  useAdega,
} from '@adegas/core';
import { Check, PackagePlus, Search } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Numero, Surgir } from '../componentes/Animados';
import { Contador } from '../componentes/Contador';
import { IconeQuadrado } from '../componentes/IconeQuadrado';
import { ICONE_CATEGORIA } from '../componentes/icones';

const FILTROS: { id: FiltroEstoque; nome: string }[] = [
  { id: 'todos', nome: 'Todos' },
  { id: 'baixo', nome: 'Precisa repor' },
  { id: 'zerado', nome: 'Sem estoque' },
];

const NOME_STATUS: Record<StatusEstoque, string> = { ok: 'Em dia', baixo: 'Baixo', zerado: 'Sem estoque' };

export function Estoque() {
  const { estado, pode } = useAdega();
  const verCustos = pode('financeiro');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroEstoque>('todos');
  const [cat, setCat] = useState<CategoriaId | null>(null);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);

  const resumo = resumoEstoque(estado.produtos);
  const lista = filtrarEstoque(estado.produtos, busca, filtro, cat);
  const selecionado = estado.produtos.find((p) => p.id === selecionadoId);

  return (
    <div className="pagina larga">
      <header className="cabecalho">
        <div>
          <p className="sobretitulo">Prateleira</p>
          <h1>Estoque</h1>
        </div>
        {pode('entrada') && (
          <div className="acoes">
            <Link to="/entrada" className="botao">
              <PackagePlus size={18} strokeWidth={1.75} /> Entrada de produto
            </Link>
          </div>
        )}
      </header>

      <section className="kpis">
        {verCustos && (
          <div className="kpi escuro" data-entrada>
            <span>Valor em estoque</span>
            <strong className="kpi-heroi">
              <Numero valor={resumo.valorCusto} />
            </strong>
            <small>pelo custo de compra</small>
          </div>
        )}
        <div className="kpi" data-entrada>
          <span>Se vender tudo</span>
          <strong>
            <Numero valor={resumo.valorVenda} />
          </strong>
          <small>pelo preço de venda atual</small>
        </div>
        <div className={`kpi ${verCustos ? '' : 'escuro'}`} data-entrada>
          <span>Unidades</span>
          <strong>
            <Numero valor={resumo.unidades} formato="inteiro" />
          </strong>
          <small>{resumo.produtos} produtos cadastrados</small>
        </div>
        <button
          type="button"
          className={`kpi kpi-botao ${resumo.baixo + resumo.zerado > 0 ? 'atencao' : ''}`}
          data-entrada
          onClick={() => setFiltro('baixo')}
        >
          <span>Precisa repor</span>
          <strong>
            <Numero valor={resumo.baixo + resumo.zerado} formato="inteiro" />
          </strong>
          <small>{resumo.zerado > 0 ? `${resumo.zerado} sem estoque` : 'no mínimo ou abaixo'}</small>
        </button>
      </section>

      <div className="estoque-grade">
        <section className="cartao" data-entrada>
          <div className="barra-ferramentas">
            <label className="campo-icone">
              <Search size={18} strokeWidth={1.75} />
              <input className="campo" placeholder="Buscar produto" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </label>
            <div className="segmentado compacto">
              {FILTROS.map((f) => (
                <button key={f.id} type="button" className={filtro === f.id ? 'ativo' : ''} onClick={() => setFiltro(f.id)}>
                  {f.nome}
                </button>
              ))}
            </div>
          </div>
          <div className="chips">
            <button className={`chip ${cat === null ? 'ativo' : ''}`} onClick={() => setCat(null)}>
              Todas
            </button>
            {CATEGORIAS.map((c) => (
              <button key={c.id} className={`chip ${cat === c.id ? 'ativo' : ''}`} onClick={() => setCat(c.id)}>
                {c.nome}
              </button>
            ))}
          </div>

          <div className="tabela-rolagem">
            <table className="tabela tabela-estoque">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th className="num">Estoque</th>
                  <th>Situação</th>
                  {verCustos && <th className="num some-medio">Custo médio</th>}
                  <th className={`num ${verCustos ? 'some-medio' : ''}`}>Preço</th>
                  {verCustos && <th className="num some-medio">Margem</th>}
                  {verCustos && <th className="num">Valor parado</th>}
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => {
                  const status = statusEstoque(p);
                  return (
                    <tr
                      key={p.id}
                      className={`clicavel ${selecionadoId === p.id ? 'selecionada' : ''}`}
                      tabIndex={0}
                      onClick={() => setSelecionadoId(p.id)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelecionadoId(p.id)}
                    >
                      <td>
                        <span className="celula-produto">
                          <IconeQuadrado icone={ICONE_CATEGORIA[p.categoria]} tamanho={32} />
                          <span>
                            {p.nome}
                            <small>{categoria(p.categoria).nome}</small>
                          </span>
                        </span>
                      </td>
                      <td className="num">
                        <strong>{p.estoque}</strong> <small className="suave">/ mín {p.estoqueMinimo}</small>
                      </td>
                      <td>
                        <span className={`pilula ${status}`}>{NOME_STATUS[status]}</span>
                      </td>
                      {verCustos && <td className="num some-medio">{formatarDinheiro(p.custoMedio)}</td>}
                      <td className={`num ${verCustos ? 'some-medio' : ''}`}>{formatarDinheiro(p.precoVenda)}</td>
                      {verCustos && <td className="num some-medio">{margem(p.precoVenda, p.custoMedio)}%</td>}
                      {verCustos && <td className="num">{formatarDinheiro(Math.max(p.estoque, 0) * p.custoMedio)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {lista.length === 0 && <p className="suave vazio-tabela">Nenhum produto com esse filtro.</p>}
          </div>
        </section>

        <aside className="cartao detalhe-produto" data-entrada>
          {selecionado ? (
            <DetalheProduto key={selecionado.id} produto={selecionado} />
          ) : (
            <div className="detalhe-vazio">
              <h2>Escolha um produto</h2>
              <p className="suave">
                {pode('ajustar_estoque')
                  ? 'Clique numa linha da tabela para ver o histórico, corrigir o estoque ou mudar preço e mínimo.'
                  : 'Clique numa linha da tabela para ver o histórico do produto.'}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function DetalheProduto({ produto }: { produto: Produto }) {
  const { estado, editarProduto, ajustarEstoque, pode } = useAdega();
  const podeAjustar = pode('ajustar_estoque');
  const [aba, setAba] = useState<'historico' | 'ajustar' | 'editar'>('historico');
  const [aviso, setAviso] = useState<{ id: number; texto: string } | null>(null);
  const status = statusEstoque(produto);
  const movimentos = movimentosDoProduto(estado, produto.id, 15);

  const avisar = (texto: string) => {
    setAviso({ id: Date.now(), texto });
    setAba('historico');
  };

  return (
    <div className="detalhe">
      <div className="detalhe-topo">
        <IconeQuadrado icone={ICONE_CATEGORIA[produto.categoria]} tamanho={44} />
        <div>
          <h2>{produto.nome}</h2>
          <small className="suave">{categoria(produto.categoria).nome}</small>
        </div>
        <span className={`pilula ${status}`}>{NOME_STATUS[status]}</span>
      </div>

      <dl className="detalhe-numeros">
        <div>
          <dt>Em estoque</dt>
          <dd>
            <Numero valor={produto.estoque} formato="inteiro" /> un
          </dd>
        </div>
        <div>
          <dt>Mínimo</dt>
          <dd>{produto.estoqueMinimo} un</dd>
        </div>
        {pode('financeiro') ? (
          <>
            <div>
              <dt>Custo médio</dt>
              <dd>{formatarDinheiro(produto.custoMedio)}</dd>
            </div>
            <div>
              <dt>Preço · margem</dt>
              <dd>
                {formatarDinheiro(produto.precoVenda)} · {margem(produto.precoVenda, produto.custoMedio)}%
              </dd>
            </div>
          </>
        ) : (
          <div>
            <dt>Preço de venda</dt>
            <dd>{formatarDinheiro(produto.precoVenda)}</dd>
          </div>
        )}
      </dl>

      {aviso && (
        <Surgir className="sucesso" chave={aviso.id}>
          <span className="sucesso-selo">
            <Check size={16} strokeWidth={3} />
          </span>
          <div>
            <strong>{aviso.texto}</strong>
          </div>
        </Surgir>
      )}

      {podeAjustar && (
        <div className="segmentado">
          <button type="button" className={aba === 'historico' ? 'ativo' : ''} onClick={() => setAba('historico')}>
            Histórico
          </button>
          <button type="button" className={aba === 'ajustar' ? 'ativo' : ''} onClick={() => setAba('ajustar')}>
            Ajustar
          </button>
          <button type="button" className={aba === 'editar' ? 'ativo' : ''} onClick={() => setAba('editar')}>
            Editar
          </button>
        </div>
      )}

      {(aba === 'historico' || !podeAjustar) && (
        <>
          {movimentos.length === 0 ? (
            <p className="suave">Nenhuma movimentação ainda.</p>
          ) : (
            <ul className="lista">
              {movimentos.map((m) => (
                <li key={m.id}>
                  <div className="lista-texto">
                    <strong>{m.descricao}</strong>
                    <small>{formatarDataHora(m.data)}</small>
                  </div>
                  <strong className={`num ${m.quantidade > 0 ? 'positivo' : 'negativo'}`}>
                    {m.quantidade > 0 ? '+' : '−'}
                    {Math.abs(m.quantidade)} un
                  </strong>
                </li>
              ))}
            </ul>
          )}
          {pode('entrada') && (
            <Link to={`/entrada?produto=${produto.id}`} className="botao contorno largo">
              <PackagePlus size={18} strokeWidth={1.75} /> Registrar entrada deste produto
            </Link>
          )}
        </>
      )}

      {podeAjustar && aba === 'ajustar' && (
        <FormAjuste
          produto={produto}
          onSalvar={(dados) => {
            const r = ajustarEstoque({ produtoId: produto.id, ...dados });
            if (r.ok) {
              avisar(`Estoque ajustado: ${r.valor.quantidadeAntes} → ${r.valor.quantidadeDepois} un`);
              return null;
            }
            return r.erro;
          }}
        />
      )}

      {podeAjustar && aba === 'editar' && (
        <FormEdicao
          produto={produto}
          onSalvar={(dados) => {
            const r = editarProduto(produto.id, dados);
            if (r.ok) {
              avisar('Produto atualizado');
              return null;
            }
            return r.erro;
          }}
        />
      )}
    </div>
  );
}

function FormAjuste({
  produto,
  onSalvar,
}: {
  produto: Produto;
  onSalvar: (dados: { motivo: MotivoAjuste; quantidade: number; observacao: string }) => string | null;
}) {
  const [motivo, setMotivo] = useState<MotivoAjuste>('perda');
  const [quantidade, setQuantidade] = useState(1);
  const [contada, setContada] = useState(String(produto.estoque));
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const contagem = motivo === 'contagem';
  const qtd = contagem ? Number.parseInt(contada, 10) : quantidade;
  const depois = contagem ? qtd : produto.estoque - quantidade;
  const perdido = !contagem ? quantidade * produto.custoMedio : 0;

  function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(onSalvar({ motivo, quantidade: Number.isNaN(qtd) ? -1 : qtd, observacao }));
  }

  return (
    <form className="formulario-detalhe" onSubmit={enviar}>
      <div className="chips">
        {MOTIVOS_AJUSTE.map((m) => (
          <button type="button" key={m.id} className={`chip ${motivo === m.id ? 'ativo' : ''}`} onClick={() => setMotivo(m.id)}>
            {m.nome}
          </button>
        ))}
      </div>
      <p className="suave dica">{motivoAjuste(motivo).dica}</p>
      {contagem ? (
        <label className="rotulo">
          Quantas unidades você contou?
          <input className="campo" inputMode="numeric" value={contada} onChange={(e) => setContada(e.target.value)} />
        </label>
      ) : (
        <div className="rotulo">
          Quantas unidades saíram?
          <Contador valor={quantidade} minimo={1} maximo={Math.max(produto.estoque, 1)} onChange={setQuantidade} />
        </div>
      )}
      <label className="rotulo">
        Observação (opcional)
        <input className="campo" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: caixa caiu no chão" />
      </label>
      <div className="previa-ajuste">
        <span>
          Estoque: {produto.estoque} → <strong>{Number.isNaN(depois) ? '?' : depois}</strong> un
        </span>
        {perdido > 0 && <span className="negativo">Perda de {formatarDinheiro(perdido)} (custo)</span>}
      </div>
      {erro && <p className="erro">{erro}</p>}
      <button type="submit" className="botao largo">
        Salvar ajuste
      </button>
    </form>
  );
}

function FormEdicao({
  produto,
  onSalvar,
}: {
  produto: Produto;
  onSalvar: (dados: { nome: string; categoria: CategoriaId; precoVenda: number; estoqueMinimo: number }) => string | null;
}) {
  const [nome, setNome] = useState(produto.nome);
  const [cat, setCat] = useState<CategoriaId>(produto.categoria);
  const [preco, setPreco] = useState(centavosParaTexto(produto.precoVenda));
  const [minimo, setMinimo] = useState(String(produto.estoqueMinimo));
  const [erro, setErro] = useState<string | null>(null);
  const precoNovo = paraCentavos(preco);

  function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(
      onSalvar({
        nome,
        categoria: cat,
        precoVenda: precoNovo ?? 0,
        estoqueMinimo: Number.parseInt(minimo, 10),
      }),
    );
  }

  return (
    <form className="formulario-detalhe" onSubmit={enviar}>
      <label className="rotulo">
        Nome
        <input className="campo" value={nome} onChange={(e) => setNome(e.target.value)} />
      </label>
      <div className="rotulo">
        Categoria
        <div className="chips">
          {CATEGORIAS.map((c) => (
            <button type="button" key={c.id} className={`chip ${cat === c.id ? 'ativo' : ''}`} onClick={() => setCat(c.id)}>
              {c.nome}
            </button>
          ))}
        </div>
      </div>
      <div className="duas-colunas">
        <label className="rotulo">
          Preço de venda
          <div className="campo-prefixo">
            <span>R$</span>
            <input className="campo" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} />
          </div>
        </label>
        <label className="rotulo">
          Avisar abaixo de
          <input className="campo" inputMode="numeric" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
        </label>
      </div>
      {precoNovo ? (
        <p className="suave dica">
          Margem com o custo médio atual: <strong>{margem(precoNovo, produto.custoMedio)}%</strong>
        </p>
      ) : null}
      {erro && <p className="erro">{erro}</p>}
      <button type="submit" className="botao largo">
        Salvar alterações
      </button>
    </form>
  );
}
