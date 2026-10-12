import type { CategoriaLancamento, FiltroLancamento, FormaPagamento, Periodo, TipoLancamento } from '@adegas/core';
import {
  CATEGORIAS_LANCAMENTO,
  FORMAS_PAGAMENTO,
  categoriaLancamento,
  formaPagamento,
  formatarDataHora,
  formatarDinheiro,
  intervaloDoPeriodo,
  lancamentosDoPeriodo,
  paraCentavos,
  resumoFinanceiro,
  useAdega,
} from '@adegas/core';
import { ArrowDownLeft, ArrowUpRight, Check } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Barra, Numero, Surgir } from '../componentes/Animados';
import { SeletorPeriodo } from '../componentes/Graficos';
import { ICONE_FORMA } from '../componentes/icones';

const POR_PAGINA = 40;

export function Financeiro() {
  const { estado, excluirLancamento } = useAdega();
  const [periodo, setPeriodo] = useState<Periodo>('30d');
  const [filtro, setFiltro] = useState<FiltroLancamento>('todos');
  const [limite, setLimite] = useState(POR_PAGINA);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const intervalo = intervaloDoPeriodo(periodo);
  const resumo = resumoFinanceiro(estado, intervalo);
  const lancamentos = lancamentosDoPeriodo(estado, intervalo, filtro);
  const maiorForma = Math.max(...Object.values(resumo.recebidoPorForma), 1);
  const maiorDespesa = Math.max(...resumo.despesasPorCategoria.map((d) => d.valor), 1);
  const margemBruta = resumo.faturamento ? Math.round((resumo.lucroBruto / resumo.faturamento) * 100) : 0;

  return (
    <div className="pagina larga">
      <header className="cabecalho">
        <div>
          <p className="sobretitulo">Dinheiro da adega</p>
          <h1>Financeiro</h1>
        </div>
        <SeletorPeriodo
          valor={periodo}
          onChange={(p) => {
            setPeriodo(p);
            setLimite(POR_PAGINA);
          }}
        />
      </header>

      <section className="kpis" key={periodo}>
        <div className="kpi escuro" data-entrada>
          <span>Saldo do período</span>
          <strong className={`kpi-heroi ${resumo.saldo < 0 ? 'negativo' : ''}`}>
            <Numero valor={resumo.saldo} />
          </strong>
          <small>entrou menos saiu</small>
        </div>
        <div className="kpi" data-entrada>
          <span>Entradas</span>
          <strong className="positivo">
            <Numero valor={resumo.receitas} />
          </strong>
          <small>{resumo.quantidadeVendas} vendas</small>
        </div>
        <div className="kpi" data-entrada>
          <span>Saídas</span>
          <strong className="negativo">
            <Numero valor={resumo.despesas} />
          </strong>
          <small>compras e contas da loja</small>
        </div>
        <div className="kpi" data-entrada>
          <span>Lucro bruto</span>
          <strong>
            <Numero valor={resumo.lucroBruto} />
          </strong>
          <small>margem de {margemBruta}% nas vendas</small>
        </div>
      </section>

      <div className="grade-2">
        <section className="cartao" data-entrada>
          <h2>Recebido por forma de pagamento</h2>
          <div className="barras">
            {FORMAS_PAGAMENTO.map((f) => {
              const Icone = ICONE_FORMA[f.id];
              const valor = resumo.recebidoPorForma[f.id];
              return (
                <div key={f.id} className="barra-linha" tabIndex={0} title={`${f.nome}: ${formatarDinheiro(valor)}`}>
                  <span className="barra-rotulo">
                    <Icone size={16} strokeWidth={1.75} /> {f.nome}
                  </span>
                  <div className="barra-trilho">
                    <Barra fracao={valor / maiorForma} />
                    <Numero valor={valor} className="barra-valor" />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="suave nota">Use para conferir a maquininha, o Pix e o dinheiro da gaveta.</p>
        </section>

        <section className="cartao" data-entrada>
          <h2>Para onde foi o dinheiro</h2>
          {resumo.despesasPorCategoria.length === 0 ? (
            <p className="suave">Nenhuma saída no período.</p>
          ) : (
            <div className="barras">
              {resumo.despesasPorCategoria.map((d) => (
                <div key={d.categoria} className="barra-linha larga" tabIndex={0} title={`${d.nome}: ${formatarDinheiro(d.valor)}`}>
                  <span className="barra-rotulo">{d.nome}</span>
                  <div className="barra-trilho">
                    <Barra fracao={d.valor / maiorDespesa} />
                    <Numero valor={d.valor} className="barra-valor" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {resumo.perdas > 0 && (
            <p className="suave nota">
              Perdas no período (quebras e consumo): <strong className="negativo">{formatarDinheiro(resumo.perdas)}</strong> pelo
              custo. Não saiu do caixa, mas saiu do estoque.
            </p>
          )}
        </section>
      </div>

      <div className="financeiro-grade">
        <section className="cartao" data-entrada>
          <div className="caixa-topo">
            <h2>Movimentações</h2>
            <div className="segmentado compacto">
              {(
                [
                  ['todos', 'Todas'],
                  ['receita', 'Entradas'],
                  ['despesa', 'Saídas'],
                ] as const
              ).map(([id, nome]) => (
                <button
                  key={id}
                  type="button"
                  className={filtro === id ? 'ativo' : ''}
                  onClick={() => {
                    setFiltro(id);
                    setLimite(POR_PAGINA);
                  }}
                >
                  {nome}
                </button>
              ))}
            </div>
          </div>
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th className="some-medio">Categoria</th>
                  <th className="some-celular">Pagamento</th>
                  <th className="num">Quando</th>
                  <th className="num">Valor</th>
                </tr>
              </thead>
              <tbody>
                {lancamentos.slice(0, limite).map((l) => {
                  const receita = l.tipo === 'receita';
                  return (
                    <tr key={l.id}>
                      <td>
                        <span className="celula-icone">
                          <span className={`marcador ${receita ? 'receita' : 'despesa'}`}>
                            {receita ? <ArrowUpRight size={15} strokeWidth={2} /> : <ArrowDownLeft size={15} strokeWidth={2} />}
                          </span>
                          <span>
                            {l.descricao}
                            {l.origem === 'manual' &&
                              (excluindo === l.id ? (
                                <span className="confirmar">
                                  Excluir?{' '}
                                  <button
                                    type="button"
                                    className="link perigo"
                                    onClick={() => {
                                      excluirLancamento(l.id);
                                      setExcluindo(null);
                                    }}
                                  >
                                    Sim
                                  </button>
                                  <button type="button" className="link" onClick={() => setExcluindo(null)}>
                                    Não
                                  </button>
                                </span>
                              ) : (
                                <button type="button" className="link discreto" onClick={() => setExcluindo(l.id)}>
                                  excluir
                                </button>
                              ))}
                          </span>
                        </span>
                      </td>
                      <td className="some-medio suave">{categoriaLancamento(l.categoria).nome}</td>
                      <td className="some-celular suave">{formaPagamento(l.formaPagamento).nome}</td>
                      <td className="num suave">{formatarDataHora(l.data)}</td>
                      <td className={`num forte ${receita ? 'positivo' : 'negativo'}`}>
                        {receita ? '+' : '−'} {formatarDinheiro(l.valor)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {lancamentos.length === 0 && <p className="suave vazio-tabela">Nada no período.</p>}
          </div>
          {lancamentos.length > limite && (
            <button type="button" className="botao contorno largo" onClick={() => setLimite((n) => n + POR_PAGINA)}>
              Mostrar mais ({lancamentos.length - limite} restantes)
            </button>
          )}
        </section>

        <aside className="cartao novo-lancamento" data-entrada>
          <NovoLancamento />
        </aside>
      </div>
    </div>
  );
}

function NovoLancamento() {
  const { registrarLancamento } = useAdega();
  const [tipo, setTipo] = useState<TipoLancamento>('despesa');
  const [cat, setCat] = useState<CategoriaLancamento>('aluguel');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [forma, setForma] = useState<FormaPagamento>('pix');
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<{ id: string; texto: string } | null>(null);

  const categorias = CATEGORIAS_LANCAMENTO.filter((c) => c.tipo === tipo && !c.automatica);

  function trocarTipo(novo: TipoLancamento) {
    setTipo(novo);
    setCat(CATEGORIAS_LANCAMENTO.find((c) => c.tipo === novo && !c.automatica)?.id ?? 'outras-despesas');
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    const r = registrarLancamento({ tipo, categoria: cat, descricao, valor: paraCentavos(valor) ?? 0, formaPagamento: forma });
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setErro(null);
    setFeito({ id: r.valor.id, texto: `${r.valor.descricao} · ${formatarDinheiro(r.valor.valor)}` });
    setDescricao('');
    setValor('');
  }

  return (
    <form className="formulario-detalhe" onSubmit={enviar}>
      <h2>Nova movimentação</h2>
      <p className="suave dica">Vendas e compras de mercadoria entram sozinhas. Aqui vão as outras: aluguel, luz, salário…</p>
      {feito && (
        <Surgir className="sucesso" chave={feito.id}>
          <span className="sucesso-selo">
            <Check size={16} strokeWidth={3} />
          </span>
          <div>
            <strong>Lançado</strong>
            <small>{feito.texto}</small>
          </div>
        </Surgir>
      )}
      <div className="segmentado">
        <button type="button" className={tipo === 'despesa' ? 'ativo' : ''} onClick={() => trocarTipo('despesa')}>
          Saída
        </button>
        <button type="button" className={tipo === 'receita' ? 'ativo' : ''} onClick={() => trocarTipo('receita')}>
          Entrada
        </button>
      </div>
      <div className="rotulo">
        Categoria
        <div className="chips">
          {categorias.map((c) => (
            <button type="button" key={c.id} className={`chip ${cat === c.id ? 'ativo' : ''}`} onClick={() => setCat(c.id)}>
              {c.nome}
            </button>
          ))}
        </div>
      </div>
      <label className="rotulo">
        Descrição (opcional)
        <input className="campo" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder={categoriaLancamento(cat).nome} />
      </label>
      <label className="rotulo">
        Valor
        <div className="campo-prefixo">
          <span>R$</span>
          <input className="campo" inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
        </div>
      </label>
      <div className="rotulo">
        {tipo === 'despesa' ? 'Pago com' : 'Recebido em'}
        <div className="chips">
          {FORMAS_PAGAMENTO.map((f) => (
            <button type="button" key={f.id} className={`chip ${forma === f.id ? 'ativo' : ''}`} onClick={() => setForma(f.id)}>
              {f.nome}
            </button>
          ))}
        </div>
      </div>
      {erro && <p className="erro">{erro}</p>}
      <button type="submit" className="botao largo">
        {tipo === 'despesa' ? 'Lançar saída' : 'Lançar entrada'}
      </button>
    </form>
  );
}
