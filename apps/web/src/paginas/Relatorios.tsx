import type { Periodo } from '@adegas/core';
import {
  FORMAS_PAGAMENTO,
  formatarDinheiro,
  formatarDinheiroCurto,
  intervaloDoPeriodo,
  relatorioVendas,
  useAdega,
} from '@adegas/core';
import { Clock } from 'lucide-react';
import { useState } from 'react';
import { Barra, Numero } from '../componentes/Animados';
import { GraficoColunas, SeletorPeriodo } from '../componentes/Graficos';
import { IconeQuadrado } from '../componentes/IconeQuadrado';
import { ICONE_CATEGORIA, ICONE_FORMA } from '../componentes/icones';

const POSICAO = ['Pico', '2º', '3º'];

export function Relatorios() {
  const { estado } = useAdega();
  const [periodo, setPeriodo] = useState<Periodo>('30d');
  const r = relatorioVendas(estado, intervaloDoPeriodo(periodo));
  const picos = new Set(r.picos.map((p) => p.hora));
  const maiorProduto = Math.max(...r.produtos.map((p) => p.faturamento), 1);
  const maiorCategoria = Math.max(...r.categorias.map((c) => c.faturamento), 1);
  const maiorForma = Math.max(...Object.values(r.porForma), 1);
  const horas = r.porHora.filter((h) => h.hora >= 8 || h.vendas > 0);

  return (
    <div className="pagina larga">
      <header className="cabecalho">
        <div>
          <p className="sobretitulo">Como a adega está indo</p>
          <h1>Relatórios</h1>
        </div>
        <SeletorPeriodo valor={periodo} onChange={setPeriodo} />
      </header>

      <section className="kpis" key={periodo}>
        <div className="kpi escuro" data-entrada>
          <span>Faturamento</span>
          <strong className="kpi-heroi">
            <Numero valor={r.faturamento} />
          </strong>
          <small>
            {r.quantidadeVendas} vendas · {r.itensVendidos} itens
          </small>
        </div>
        <div className="kpi" data-entrada>
          <span>Ticket médio</span>
          <strong>
            <Numero valor={r.ticketMedio} />
          </strong>
          <small>por venda</small>
        </div>
        <div className="kpi" data-entrada>
          <span>Lucro bruto</span>
          <strong>
            <Numero valor={r.lucroBruto} />
          </strong>
          <small>vendas menos o custo</small>
        </div>
        <div className="kpi" data-entrada>
          <span>Margem</span>
          <strong>
            <Numero valor={r.margem} formato="porcento" />
          </strong>
          <small>do faturamento vira lucro bruto</small>
        </div>
      </section>

      <section className="cartao" data-entrada>
        <div className="caixa-topo">
          <h2>Vendas por dia</h2>
          <span className="suave">passe o mouse nas colunas</span>
        </div>
        <GraficoColunas
          descricao={`Faturamento por dia no período: total de ${formatarDinheiro(r.faturamento)}`}
          colunas={r.porDia.map((d) => ({
            chave: d.dia.toISOString(),
            valor: d.faturamento,
            rotulo: d.rotulo,
            detalhe: `${d.diaSemana} · ${d.vendas} ${d.vendas === 1 ? 'venda' : 'vendas'}`,
          }))}
          formatarValor={formatarDinheiro}
          formatarEixo={formatarDinheiroCurto}
        />
      </section>

      <div className="grade-2">
        <section className="cartao" data-entrada>
          <h2>Horários de pico</h2>
          <div className="picos">
            {r.picos.map((p, i) => (
              <div key={p.hora} className={`pico ${i === 0 ? 'primeiro' : ''}`}>
                <span>
                  <Clock size={13} strokeWidth={2} /> {POSICAO[i]}
                </span>
                <strong>{String(p.hora).padStart(2, '0')}:00</strong>
                <small>{p.vendas} vendas</small>
              </div>
            ))}
          </div>
          <GraficoColunas
            descricao="Quantidade de vendas por hora do dia"
            colunas={horas.map((h) => ({
              chave: String(h.hora),
              valor: h.vendas,
              rotulo: `${h.hora}h`,
              detalhe: formatarDinheiro(h.faturamento),
              destaque: picos.has(h.hora),
            }))}
            formatarValor={(v) => `${v} ${v === 1 ? 'venda' : 'vendas'}`}
            formatarEixo={(v) => String(Math.round(v))}
          />
        </section>

        <section className="cartao" data-entrada>
          <h2>Formas de pagamento</h2>
          <div className="barras">
            {FORMAS_PAGAMENTO.map((f) => {
              const Icone = ICONE_FORMA[f.id];
              const valor = r.porForma[f.id];
              const parte = r.faturamento ? Math.round((valor / r.faturamento) * 100) : 0;
              return (
                <div key={f.id} className="barra-linha" tabIndex={0} title={`${f.nome}: ${formatarDinheiro(valor)}`}>
                  <span className="barra-rotulo">
                    <Icone size={16} strokeWidth={1.75} /> {f.nome}
                  </span>
                  <div className="barra-trilho">
                    <Barra fracao={valor / maiorForma} />
                    <span className="barra-valor">
                      {parte}% <small className="suave">{formatarDinheiroCurto(valor)}</small>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <h3 className="secao">Por categoria</h3>
          <div className="barras">
            {r.categorias.map((c) => (
              <div key={c.categoria.id} className="barra-linha larga" tabIndex={0} title={`${c.categoria.nome}: ${formatarDinheiro(c.faturamento)}`}>
                <span className="barra-rotulo">{c.categoria.nome}</span>
                <div className="barra-trilho">
                  <Barra fracao={c.faturamento / maiorCategoria} />
                  <span className="barra-valor">
                    {Math.round(c.parte * 100)}% <small className="suave">{formatarDinheiroCurto(c.faturamento)}</small>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="cartao" data-entrada>
        <h2>Mais vendidos</h2>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th>#</th>
                <th>Produto</th>
                <th className="num">Quantidade</th>
                <th className="some-celular">Faturamento</th>
                <th className="num">Lucro</th>
              </tr>
            </thead>
            <tbody>
              {r.produtos.slice(0, 10).map((p, i) => (
                <tr key={p.produtoId}>
                  <td className="suave">{i + 1}</td>
                  <td>
                    <span className="celula-produto">
                      <IconeQuadrado icone={ICONE_CATEGORIA[p.categoria]} tamanho={32} />
                      {p.nome}
                    </span>
                  </td>
                  <td className="num">{p.quantidade} un</td>
                  <td className="some-celular">
                    <div className="barra-trilho sem-eixo">
                      <Barra fracao={p.faturamento / maiorProduto} />
                      <span className="barra-valor">{formatarDinheiro(p.faturamento)}</span>
                    </div>
                  </td>
                  <td className="num positivo">{formatarDinheiro(p.lucro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {r.produtos.length === 0 && <p className="suave vazio-tabela">Nenhuma venda no período.</p>}
        </div>
      </section>
    </div>
  );
}
