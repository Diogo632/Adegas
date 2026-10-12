import {
  FORMAS_PAGAMENTO,
  estoqueBaixo,
  formatarDataHora,
  formatarDinheiro,
  formaPagamento,
  resumoDoDia,
  saudacao,
  ultimosLancamentos,
  useAdega,
} from '@adegas/core';
import { ArrowDownLeft, ArrowUpRight, PackagePlus, ShoppingBag, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { ICONE_FORMA } from '../componentes/icones';

export function Inicio() {
  const { estado } = useAdega();
  const resumo = resumoDoDia(estado);
  const alertas = estoqueBaixo(estado.produtos);
  const movimentos = ultimosLancamentos(estado, 8);
  const maiorForma = Math.max(...Object.values(resumo.porFormaPagamento), 1);

  return (
    <div className="pagina">
      <header className="cabecalho">
        <div>
          <p className="sobretitulo">Resumo de hoje</p>
          <h1>{saudacao()}</h1>
        </div>
        <div className="acoes">
          <Link to="/entrada" className="botao contorno">
            <PackagePlus size={18} strokeWidth={1.75} /> Entrada de produto
          </Link>
          <Link to="/venda" className="botao">
            <ShoppingBag size={18} strokeWidth={1.75} /> Nova venda
          </Link>
        </div>
      </header>

      <section className="kpis">
        <div className="kpi escuro">
          <span>Vendido hoje</span>
          <strong className="kpi-heroi">{formatarDinheiro(resumo.faturamento)}</strong>
          <small>{resumo.quantidadeVendas} vendas</small>
        </div>
        <div className="kpi">
          <span>Lucro bruto</span>
          <strong>{formatarDinheiro(resumo.lucroBruto)}</strong>
          <small>vendas menos o custo dos produtos</small>
        </div>
        <div className="kpi">
          <span>Ticket médio</span>
          <strong>{formatarDinheiro(resumo.ticketMedio)}</strong>
          <small>por venda</small>
        </div>
        <div className="kpi">
          <span>Compras do dia</span>
          <strong>{formatarDinheiro(resumo.despesas)}</strong>
          <small>
            saldo {resumo.saldo < 0 ? '−' : ''}
            {formatarDinheiro(Math.abs(resumo.saldo))}
          </small>
        </div>
      </section>

      <div className="grade-2">
        <section className="cartao">
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
                    <div className="barra" style={{ width: `${(valor / maiorForma) * 100}%` }} />
                    <span className="barra-valor">{formatarDinheiro(valor)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="cartao">
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
                  <Link to={`/entrada?produto=${p.id}`} className="link">
                    Repor
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="cartao">
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
    </div>
  );
}
