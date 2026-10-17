import type { CategoriaId, Comanda, FormaPagamento, Venda } from '@adegas/core';
import {
  CATEGORIAS,
  buscarProdutos,
  comandasAbertas,
  comandasFechadasNoDia,
  faltaDinheiro,
  formaPagamento,
  formatarDataHora,
  formatarDinheiro,
  linhasDaComanda,
  maisVendidos,
  nomeDaMesa,
  paraCentavos,
  quantidadeNaComanda,
  resumoMesas,
  tempoAberta,
  totalComanda,
  useAdega,
  valorPorPessoa,
} from '@adegas/core';
import { Check, Search, Users } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Numero, SeloPulsante, Surgir } from '../componentes/Animados';
import { Contador } from '../componentes/Contador';
import { IconeQuadrado } from '../componentes/IconeQuadrado';
import { useAgora } from '../useAgora';
import { ICONE_CATEGORIA } from '../componentes/icones';
import { Pagamento } from '../componentes/Pagamento';

/** Quantas mesas numeradas aparecem na grade (cresce se uma mesa maior for aberta). */
const MESAS_NA_GRADE = 12;

/**
 * Contas por mesa: a grade mostra as mesas livres e ocupadas; a mesa escolhida
 * abre à direita com os pedidos, a divisão e o fechamento.
 */
export function Mesas() {
  const { estado, abrirComanda, lancarNaComanda } = useAdega();
  const [parametros] = useSearchParams();
  const [selecionadaId, setSelecionadaId] = useState<string | null>(parametros.get('mesa'));
  const [outra, setOutra] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<CategoriaId | null>(null);
  const [fechada, setFechada] = useState<{ venda: Venda; mesa: string } | null>(null);
  const agora = useAgora();

  const abertas = comandasAbertas(estado);
  const porMesa = new Map(abertas.map((c) => [c.mesa, c]));
  const maiorAberta = Math.max(0, ...abertas.filter((c) => /^\d+$/.test(c.mesa)).map((c) => Number(c.mesa)));
  const numeros = Array.from({ length: Math.max(MESAS_NA_GRADE, maiorAberta) }, (_, i) => String(i + 1));
  const comNome = abertas.filter((c) => !/^\d+$/.test(c.mesa));
  const selecionada = abertas.find((c) => c.id === selecionadaId) ?? null;
  const resumo = resumoMesas(estado);
  const fechadas = comandasFechadasNoDia(estado, agora);

  const produtos = buscarProdutos(estado.produtos, busca, filtro);
  const destaques = !busca && !filtro ? maisVendidos(estado, 4) : [];

  function escolher(mesa: string) {
    setFechada(null);
    const existente = porMesa.get(mesa);
    if (existente) {
      setSelecionadaId(existente.id);
      setErro(null);
      return;
    }
    const r = abrirComanda(mesa);
    if (!r.ok) return setErro(r.erro);
    setSelecionadaId(r.valor.id);
    setOutra('');
    setErro(null);
  }

  function lancar(produtoId: string) {
    if (!selecionada) return;
    const r = lancarNaComanda(selecionada.id, [{ produtoId, quantidade: 1 }]);
    setErro(r.ok ? null : r.erro);
  }

  const cartaoProduto = (p: (typeof estado.produtos)[number]) => {
    const naMesa = selecionada ? quantidadeNaComanda(selecionada, p.id) : 0;
    return (
      <button
        key={p.id}
        className={`produto ${naMesa > 0 ? 'no-carrinho' : ''}`}
        disabled={p.estoque <= 0}
        onClick={() => lancar(p.id)}
        title={`Lançar 1 ${p.nome} na ${selecionada ? nomeDaMesa(selecionada.mesa) : 'mesa'}`}
      >
        <IconeQuadrado icone={ICONE_CATEGORIA[p.categoria]} />
        <span className="produto-nome">{p.nome}</span>
        <span className="produto-rodape">
          <span className="produto-preco">{formatarDinheiro(p.precoVenda)}</span>
          <span className={`produto-estoque ${p.estoque <= p.estoqueMinimo ? 'baixo' : ''}`}>
            {p.estoque <= 0 ? 'sem estoque' : `${p.estoque} un`}
          </span>
        </span>
        {naMesa > 0 && <SeloPulsante valor={naMesa} className="produto-qtd" />}
      </button>
    );
  };

  return (
    <div className="pdv mesas-pagina">
      <section className="pdv-produtos mesas-topo">
        <header className="cabecalho">
          <div>
            <p className="sobretitulo">Contas por mesa</p>
            <h1>Mesas</h1>
          </div>
          <div className="mesas-resumo">
            <strong>
              <Numero valor={resumo.emAberto} />
            </strong>
            <span className="suave">
              em aberto · {resumo.abertas} {resumo.abertas === 1 ? 'mesa' : 'mesas'}
            </span>
          </div>
        </header>

        <div className="mesas-grade" data-entrada>
          {numeros.map((n) => {
            const conta = porMesa.get(n);
            const ativa = conta && conta.id === selecionada?.id;
            return (
              <button
                key={n}
                className={`mesa-tile ${conta ? 'ocupada' : ''} ${ativa ? 'selecionada' : ''}`}
                onClick={() => escolher(n)}
                aria-label={conta ? `Mesa ${n}, ${formatarDinheiro(totalComanda(conta))}` : `Abrir mesa ${n}`}
                aria-pressed={ativa}
              >
                <strong>{n}</strong>
                <small>{conta ? formatarDinheiro(totalComanda(conta)) : 'livre'}</small>
              </button>
            );
          })}
          {comNome.map((c) => (
            <button
              key={c.id}
              className={`mesa-tile ocupada nome ${c.id === selecionada?.id ? 'selecionada' : ''}`}
              onClick={() => escolher(c.mesa)}
              aria-pressed={c.id === selecionada?.id}
            >
              <strong>{c.mesa}</strong>
              <small>{formatarDinheiro(totalComanda(c))}</small>
            </button>
          ))}
        </div>

        <form
          className="mesa-outra"
          onSubmit={(e) => {
            e.preventDefault();
            if (outra.trim()) escolher(outra);
          }}
        >
          <input className="campo" placeholder="Outra mesa ou nome (15, Balcão, João...)" value={outra} onChange={(e) => setOutra(e.target.value)} />
          <button type="submit" className="botao contorno" disabled={!outra.trim()}>
            Abrir conta
          </button>
        </form>
        {erro && <p className="erro">{erro}</p>}
      </section>

      <section className="pdv-produtos mesas-produtos">
        {selecionada ? (
          <>
            <h3 className="secao">Lançar na {nomeDaMesa(selecionada.mesa)} · clique no produto</h3>
            <label className="campo-icone">
              <Search size={18} strokeWidth={1.75} />
              <input className="campo" placeholder="Buscar produto" value={busca} onChange={(e) => setBusca(e.target.value)} />
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
            {destaques.length > 0 && <div className="grade-produtos">{destaques.map(cartaoProduto)}</div>}
            {destaques.length > 0 && <h3 className="secao">Todos os produtos</h3>}
            <div className="grade-produtos">
              {produtos.map(cartaoProduto)}
              {produtos.length === 0 && <p className="suave">Nenhum produto encontrado.</p>}
            </div>
          </>
        ) : (
          <p className="suave">Escolha uma mesa na grade para ver a conta e lançar pedidos. Mesa livre: um clique abre a conta.</p>
        )}
      </section>

      <section className="mesas-fechadas">
        {fechadas.length > 0 && (
          <div className="cartao" data-entrada>
            <h2>Fechadas hoje</h2>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Mesa</th>
                  <th className="some-celular">Pagamento</th>
                  <th className="num">Hora</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {fechadas.map((c) => {
                  const venda = estado.vendas.find((v) => v.id === c.vendaId);
                  return (
                    <tr key={c.id}>
                      <td>{nomeDaMesa(c.mesa)}</td>
                      <td className="some-celular suave">{venda ? formaPagamento(venda.pagamentos[0].forma).nome : '—'}</td>
                      <td className="num suave">{formatarDataHora(c.fechadaEm ?? c.abertaEm, agora)}</td>
                      <td className="num forte">{formatarDinheiro(totalComanda(c))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <aside className="pdv-caixa cartao mesas-caixa" data-entrada>
        {fechada && (
          <Surgir className="sucesso" chave={fechada.venda.id}>
            <span className="sucesso-selo">
              <Check size={16} strokeWidth={3} />
            </span>
            <div>
              <strong>
                {nomeDaMesa(fechada.mesa)} fechada · {formatarDinheiro(fechada.venda.total)}
              </strong>
              <small>{formaPagamento(fechada.venda.pagamentos[0].forma).nome} · entrou no caixa</small>
              {fechada.venda.troco !== undefined && fechada.venda.troco > 0 && (
                <span className="troco-grande">
                  Troco <Numero valor={fechada.venda.troco} />
                </span>
              )}
            </div>
          </Surgir>
        )}

        {selecionada ? (
          <ContaDaMesa
            key={selecionada.id}
            comanda={selecionada}
            agora={agora}
            aoFechar={(venda) => {
              setFechada({ venda, mesa: selecionada.mesa });
              setSelecionadaId(null);
            }}
            aoCancelar={() => setSelecionadaId(null)}
          />
        ) : (
          <>
            <div className="caixa-topo">
              <h2>Mesas abertas</h2>
            </div>
            {abertas.length === 0 ? (
              <p className="suave vazio">Nenhuma mesa aberta.</p>
            ) : (
              <ul className="lista">
                {abertas.map((c) => (
                  <li key={c.id}>
                    <span className="selo-mesa">{/^\d+$/.test(c.mesa) ? c.mesa : c.mesa.slice(0, 2).toUpperCase()}</span>
                    <div className="lista-texto">
                      <strong>{nomeDaMesa(c.mesa)}</strong>
                      <small>
                        {quantidadeNaComanda(c)} itens · {tempoAberta(c, agora)}
                      </small>
                    </div>
                    <button className="link" onClick={() => escolher(c.mesa)}>
                      {formatarDinheiro(totalComanda(c))}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

function ContaDaMesa({
  comanda,
  agora,
  aoFechar,
  aoCancelar,
}: {
  comanda: Comanda;
  agora: Date;
  aoFechar: (venda: Venda) => void;
  aoCancelar: () => void;
}) {
  const { estado, lancarNaComanda, removerDaComanda, fecharComanda, cancelarComanda } = useAdega();
  const [forma, setForma] = useState<FormaPagamento | null>(null);
  const [recebidoTexto, setRecebidoTexto] = useState('');
  const [pessoas, setPessoas] = useState(1);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);

  const nome = nomeDaMesa(comanda.mesa);
  const linhas = linhasDaComanda(comanda);
  const total = totalComanda(comanda);
  const itens = quantidadeNaComanda(comanda);
  const falta = faltaDinheiro(forma, paraCentavos(recebidoTexto), total);

  function mudar(produtoId: string, linhaAtual: number, nova: number) {
    const r =
      nova > linhaAtual
        ? lancarNaComanda(comanda.id, [{ produtoId, quantidade: nova - linhaAtual }])
        : removerDaComanda(comanda.id, produtoId, linhaAtual - nova);
    setErro(r.ok ? null : r.erro);
  }

  function fechar() {
    if (!forma) return;
    const r = fecharComanda(comanda.id, { forma, valorRecebido: forma === 'dinheiro' ? paraCentavos(recebidoTexto) : undefined });
    if (r.ok) aoFechar(r.valor);
    else setErro(r.erro);
  }

  return (
    <>
      <div className="caixa-topo">
        <div>
          <h2>{nome}</h2>
          <small className="suave">
            {itens} {itens === 1 ? 'item' : 'itens'} · aberta {tempoAberta(comanda, agora)}
          </small>
        </div>
        {!confirmandoCancelar && (
          <button className="link perigo" onClick={() => setConfirmandoCancelar(true)}>
            Cancelar mesa
          </button>
        )}
      </div>

      {confirmandoCancelar && (
        <div className="confirmar-cancelar">
          <p>
            Cancelar a {nome}? {itens > 0 ? `Os ${itens} itens voltam para o estoque e nada entra no caixa.` : 'A mesa fica livre de novo.'}
          </p>
          <div className="acoes">
            <button
              className="botao perigo"
              onClick={() => {
                const r = cancelarComanda(comanda.id);
                if (r.ok) aoCancelar();
                else setErro(r.erro);
              }}
            >
              Cancelar mesa
            </button>
            <button className="botao contorno" onClick={() => setConfirmandoCancelar(false)}>
              Voltar
            </button>
          </div>
        </div>
      )}

      {linhas.length === 0 ? (
        <p className="suave vazio">Nenhum pedido ainda. Clique nos produtos ao lado para lançar.</p>
      ) : (
        <ul className="carrinho">
          {linhas.map((l) => {
            const produto = estado.produtos.find((p) => p.id === l.produtoId);
            return (
              <li key={`${l.produtoId}-${l.precoUnitario}`}>
                <div className="carrinho-nome">
                  <span>{l.produtoNome}</span>
                  <small className="suave">{formatarDinheiro(l.precoUnitario)} cada</small>
                </div>
                <Contador
                  valor={l.quantidade}
                  maximo={l.quantidade + Math.max(produto?.estoque ?? 0, 0)}
                  onChange={(v) => mudar(l.produtoId, l.quantidade, v)}
                />
                <Numero valor={l.subtotal} className="num forte" />
              </li>
            );
          })}
        </ul>
      )}

      <div className="total">
        <span>Total da mesa</span>
        <strong>
          <Numero valor={total} />
        </strong>
      </div>

      <div className="dividir">
        <Users size={18} strokeWidth={1.75} />
        <div className="dividir-texto">
          <strong>Dividir a conta</strong>
          <small className="suave">{pessoas > 1 ? `${formatarDinheiro(valorPorPessoa(total, pessoas))} por pessoa` : 'Uma pessoa paga tudo'}</small>
        </div>
        <Contador valor={pessoas} minimo={1} maximo={30} onChange={setPessoas} />
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
        desabilitado={itens === 0}
      />

      {erro && <p className="erro">{erro}</p>}

      <button className="botao grande" disabled={!forma || itens === 0 || falta} onClick={fechar}>
        {itens === 0 ? 'Lance pedidos para fechar' : forma ? `Fechar conta · ${formatarDinheiro(total)}` : 'Escolha a forma de pagamento'}
      </button>
    </>
  );
}
