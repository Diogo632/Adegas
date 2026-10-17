import {
  FORMAS_PAGAMENTO,
  comandasAbertas,
  estoqueBaixo,
  formatarDataHora,
  formatarDinheiro,
  formaPagamento,
  formatarQuando,
  lembretesPendentes,
  nomeDaMesa,
  quantidadeNaComanda,
  resumoDoDia,
  resumoMesas,
  tempoAberta,
  totalComanda,
  situacaoLembrete,
  saudacao,
  ultimosLancamentos,
  useAdega,
} from '@adegas/core';
import { Armchair, ArrowDownLeft, ArrowUpRight, Bell, Check, PackagePlus, ShoppingBag, Sparkles, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { Barra, Numero } from '../componentes/Animados';
import { useAgora } from '../useAgora';
import { ICONE_FORMA } from '../componentes/icones';

export function Inicio() {
  const { estado, concluirLembrete, usuario, pode } = useAdega();
  const resumo = resumoDoDia(estado);
  const lembretes = lembretesPendentes(estado).slice(0, 5);
  const mesas = comandasAbertas(estado);
  const emAberto = resumoMesas(estado).emAberto;
  const agora = useAgora();
  const alertas = estoqueBaixo(estado.produtos);
  const movimentos = ultimosLancamentos(estado, 8);
  const maiorForma = Math.max(...Object.values(resumo.porFormaPagamento), 1);

  return (
    <div className="pagina">
      <header className="cabecalho">
        <div>
          <p className="sobretitulo">Resumo de hoje</p>
          <h1>
            {saudacao()}
            {usuario ? `, ${usuario.nome}` : ''}
          </h1>
        </div>
        <div className="acoes">
          {pode('entrada') && (
            <Link to="/entrada" className="botao contorno">
              <PackagePlus size={18} strokeWidth={1.75} /> Entrada de produto
            </Link>
          )}
          {pode('mesas') && !pode('vender') && (
            <Link to="/mesas" className="botao">
              <Armchair size={18} strokeWidth={1.75} /> Mesas
            </Link>
          )}
          {pode('vender') && (
            <Link to="/venda" className="botao">
              <ShoppingBag size={18} strokeWidth={1.75} /> Nova venda
            </Link>
          )}
        </div>
      </header>

      {pode('financeiro') && (
        <section className="kpis">
          <div className="kpi escuro" data-entrada>
            <span>Vendido hoje</span>
            <strong className="kpi-heroi">
              <Numero valor={resumo.faturamento} />
            </strong>
            <small>{resumo.quantidadeVendas} vendas</small>
          </div>
          <div className="kpi" data-entrada>
            <span>Lucro bruto</span>
            <strong>
              <Numero valor={resumo.lucroBruto} />
            </strong>
            <small>vendas menos o custo dos produtos</small>
          </div>
          <div className="kpi" data-entrada>
            <span>Ticket médio</span>
            <strong>
              <Numero valor={resumo.ticketMedio} />
            </strong>
            <small>por venda</small>
          </div>
          <div className="kpi" data-entrada>
            <span>Compras do dia</span>
            <strong>
              <Numero valor={resumo.despesas} />
            </strong>
            <small>
              saldo {resumo.saldo < 0 ? '−' : ''}
              {formatarDinheiro(Math.abs(resumo.saldo))}
            </small>
          </div>
        </section>
      )}

      {pode('mesas') && (
        <section className="cartao" data-entrada>
          <div className="cartao-topo">
            <h2>{mesas.length ? `Mesas abertas · ${formatarDinheiro(emAberto)}` : 'Mesas'}</h2>
            <Link to="/mesas" className="link">
              {mesas.length ? 'Ver mesas' : 'Abrir mesa'}
            </Link>
          </div>
          {mesas.length === 0 ? (
            <p className="suave">Nenhuma mesa aberta. Quando um cliente sentar, abra a conta da mesa e vá lançando os pedidos.</p>
          ) : (
            <div className="mesas-abertas">
              {mesas.map((c) => (
                <Link key={c.id} to={`/mesas?mesa=${c.id}`} className="mesa-chip">
                  <span className="selo-mesa">{/^\d+$/.test(c.mesa) ? c.mesa : c.mesa.slice(0, 2).toUpperCase()}</span>
                  <span className="lista-texto">
                    <strong>{nomeDaMesa(c.mesa)}</strong>
                    <small>
                      {quantidadeNaComanda(c)} itens · {tempoAberta(c, agora)}
                    </small>
                  </span>
                  <strong className="num">{formatarDinheiro(totalComanda(c))}</strong>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grade-3">
        {pode('financeiro') && (
          <section className="cartao" data-entrada>
            <h2>Recebido por forma de pagamento</h2>
            <div className="barras" role="table" aria-label="Recebido hoje por forma de pagamento">
              {FORMAS_PAGAMENTO.map((f) => {
                const valor = resumo.porFormaPagamento[f.id];
                const parte = resumo.faturamento ? Math.round((valor / resumo.faturamento) * 100) : 0;
                const Icone = ICONE_FORMA[f.id];
                return (
                  <div
                    key={f.id}
                    className="barra-linha"
                    role="row"
                    tabIndex={0}
                    title={`${f.nome}: ${formatarDinheiro(valor)} (${parte}% do dia)`}
                  >
                    <span className="barra-rotulo" role="rowheader">
                      <Icone size={16} strokeWidth={1.75} /> {f.nome}
                    </span>
                    <div className="barra-trilho" role="cell">
                      <Barra fracao={valor / maiorForma} />
                      <Numero valor={valor} className="barra-valor" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {pode('estoque') && (
          <section className="cartao" data-entrada>
            <h2>Repor estoque</h2>
            {alertas.length === 0 ? (
              <p className="suave">Tudo em ordem.</p>
            ) : (
              <ul className="lista">
                {alertas.map((p) => (
                  <li key={p.id}>
                    <span className="marcador alerta">
                      <TriangleAlert size={15} strokeWidth={2} />
                    </span>
                    <div className="lista-texto">
                      <strong>{p.nome}</strong>
                      <small>
                        {p.estoque} em estoque · mínimo {p.estoqueMinimo}
                      </small>
                    </div>
                    {pode('entrada') && (
                      <Link to={`/entrada?produto=${p.id}`} className="link">
                        Repor
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="cartao" data-entrada>
          <div className="cartao-topo">
            <h2>Lembretes</h2>
            {pode('assistente') && (
              <Link to="/assistente" className="link">
                <Sparkles size={15} strokeWidth={1.8} /> Criar
              </Link>
            )}
          </div>
          {lembretes.length === 0 ? (
            <p className="suave">
              {pode('assistente') ? 'Nada pendente. Peça ao assistente: “me lembre de pagar o fornecedor sexta às 10h”.' : 'Nada pendente.'}
            </p>
          ) : (
            <ul className="lista">
              {lembretes.map((l) => {
                const situacao = situacaoLembrete(l);
                const urgente = situacao !== 'proximo';
                return (
                  <li key={l.id}>
                    <span className={`marcador ${urgente ? 'alerta' : 'lembrete'}`}>
                      <Bell size={15} strokeWidth={2} />
                    </span>
                    <div className="lista-texto">
                      <strong>{l.texto}</strong>
                      <small className={situacao === 'atrasado' ? 'atrasado' : undefined}>
                        {situacao === 'atrasado' ? 'Atrasado · ' : ''}
                        {formatarQuando(l.quando)}
                        {l.produtoNome ? ` · ${l.produtoNome}` : ''}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="feito"
                      onClick={() => concluirLembrete(l.id)}
                      aria-label={`Marcar "${l.texto}" como feito`}
                      title="Feito"
                    >
                      <Check size={16} strokeWidth={2.2} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {pode('financeiro') && (
        <section className="cartao" data-entrada>
          <h2>Movimentações</h2>
          <table className="tabela">
            <thead>
              <tr>
                <th>Descrição</th>
                <th className="some-celular">Pagamento</th>
                <th className="num">Hora</th>
                <th className="num">Valor</th>
              </tr>
            </thead>
            <tbody>
              {movimentos.map((l) => {
                const receita = l.tipo === 'receita';
                return (
                  <tr key={l.id}>
                    <td>
                      <span className="celula-icone">
                        <span className={`marcador ${receita ? 'receita' : 'despesa'}`}>
                          {receita ? <ArrowUpRight size={15} strokeWidth={2} /> : <ArrowDownLeft size={15} strokeWidth={2} />}
                        </span>
                        {l.descricao}
                      </span>
                    </td>
                    <td className="some-celular suave">{formaPagamento(l.formaPagamento).nome}</td>
                    <td className="num suave">{formatarDataHora(l.data)}</td>
                    <td className="num forte">
                      {receita ? '+' : '−'} {formatarDinheiro(l.valor)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
