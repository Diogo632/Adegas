import {
  FORMAS_PAGAMENTO,
  categoria,
  estoqueBaixo,
  formatarDataHora,
  formatarDinheiro,
  formaPagamento,
  resumoDoDia,
  ultimosLancamentos,
  useAdega,
} from '@adegas/core';
import { Link } from 'react-router';

export function Inicio() {
  const { estado } = useAdega();
  const resumo = resumoDoDia(estado);
  const alertas = estoqueBaixo(estado.produtos);
  const movimentos = ultimosLancamentos(estado, 10);
  const maiorForma = Math.max(...Object.values(resumo.porFormaPagamento), 1);

  return (
    <div className="pagina">
      <div className="cabecalho">
        <h1>Resumo de hoje</h1>
        <div className="acoes">
          <Link to="/entrada" className="botao contorno">
            📦 Entrada de produto
          </Link>
          <Link to="/venda" className="botao">
            🛒 Nova venda
          </Link>
        </div>
      </div>

      <section className="kpis">
        <div className="kpi destaque">
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
              return (
                <div key={f.id} className="barra-linha" role="row" tabIndex={0} title={`${f.nome}: ${formatarDinheiro(valor)} (${parte}% do dia)`}>
                  <span className="barra-rotulo" role="rowheader">
                    {f.nome}
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

        <section className="cartao alerta">
          <h2>⚠️ Estoque baixo ({alertas.length})</h2>
          {alertas.length === 0 ? (
            <p className="suave">Tudo em ordem.</p>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th className="num">Estoque</th>
                  <th className="num">Mínimo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {alertas.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {categoria(p.categoria).icone} {p.nome}
                    </td>
                    <td className="num">{p.estoque}</td>
                    <td className="num">{p.estoqueMinimo}</td>
                    <td className="num">
                      <Link to={`/entrada?produto=${p.id}`} className="botao pequeno">
                        Repor
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="cartao">
        <h2>Últimas movimentações</h2>
        <table className="tabela">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Descrição</th>
              <th className="some-celular">Pagamento</th>
              <th className="num">Valor</th>
            </tr>
          </thead>
          <tbody>
            {movimentos.map((l) => (
              <tr key={l.id}>
                <td className="suave">{formatarDataHora(l.data)}</td>
                <td>{l.descricao}</td>
                <td className="some-celular">{formaPagamento(l.formaPagamento).nome}</td>
                <td className={`num ${l.tipo}`}>
                  {l.tipo === 'receita' ? '+' : '−'} {formatarDinheiro(l.valor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
