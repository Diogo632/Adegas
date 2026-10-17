import type { CategoriaId, Comanda, FormaPagamento, Produto, Venda } from '@adegas/core';
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
import { Check, Minus, Search, Send, Users } from 'lucide-react';
import type { ReactNode } from 'react';
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

/** Pedido ainda não lançado de cada mesa: id da conta → produto → quantidade. */
type Pedidos = Record<string, Record<string, number>>;

/**
 * Contas por mesa: a grade mostra as mesas livres e ocupadas; a mesa escolhida
 * abre à direita com os pedidos, a divisão e o fechamento.
 *
 * Clicar no produto só monta o pedido (com o nome da mesa bem à vista); ele entra
 * na conta quando a pessoa aperta "Lançar na Mesa X". Assim não vai nada para a
 * mesa errada sem querer.
 */
export function Mesas() {
  const { estado, abrirComanda, lancarNaComanda } = useAdega();
  const [pedidos, setPedidos] = useState<Pedidos>({});
  const [lancado, setLancado] = useState<{ id: number; texto: string } | null>(null);
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
  const pedido = (selecionada && pedidos[selecionada.id]) || {};
  const linhasPedido = Object.entries(pedido).flatMap(([produtoId, quantidade]) => {
    const produto = estado.produtos.find((p) => p.id === produtoId);
    return produto ? [{ produto, quantidade }] : [];
  });
  const itensPedido = linhasPedido.reduce((s, l) => s + l.quantidade, 0);
  const totalPedido = linhasPedido.reduce((s, l) => s + l.quantidade * l.produto.precoVenda, 0);
  const nomeSelecionada = selecionada ? nomeDaMesa(selecionada.mesa) : '';
  const temPedido = (c: Comanda) => Object.keys(pedidos[c.id] ?? {}).length > 0;

  function mudarPedido(produtoId: string, quantidade: number) {
    if (!selecionada) return;
    setPedidos((todos) => {
      const daMesa = { ...todos[selecionada.id] };
      if (quantidade > 0) daMesa[produtoId] = quantidade;
      else delete daMesa[produtoId];
      return { ...todos, [selecionada.id]: daMesa };
    });
  }

  function porNoPedido(p: Produto) {
    if (!selecionada) return;
    const atual = pedido[p.id] ?? 0;
    if (atual >= p.estoque) return setErro(`Só tem ${p.estoque} ${p.nome} em estoque.`);
    setErro(null);
    setLancado(null);
    mudarPedido(p.id, atual + 1);
  }

  function descartarPedido() {
    if (selecionada) setPedidos((todos) => ({ ...todos, [selecionada.id]: {} }));
  }

  function lancarPedido() {
    if (!selecionada || linhasPedido.length === 0) return;
    const r = lancarNaComanda(
      selecionada.id,
      linhasPedido.map((l) => ({ produtoId: l.produto.id, quantidade: l.quantidade })),
    );
    if (!r.ok) return setErro(r.erro);
    setErro(null);
    descartarPedido();
    const lista = linhasPedido.map((l) => `${l.quantidade} ${l.produto.nome}`).join(', ');
    setLancado((anterior) => ({ id: (anterior?.id ?? 0) + 1, texto: `Lançado na ${nomeSelecionada}: ${lista}` }));
  }

  function escolher(mesa: string) {
    setFechada(null);
    setLancado(null);
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

  const cartaoProduto = (p: Produto) => {
    const noPedido = pedido[p.id] ?? 0;
    return (
      <button
        key={p.id}
        className={`produto ${noPedido > 0 ? 'no-carrinho' : ''}`}
        disabled={p.estoque <= 0}
        onClick={() => porNoPedido(p)}
        title={`Pôr 1 ${p.nome} no pedido da ${nomeSelecionada}`}
      >
        <IconeQuadrado icone={ICONE_CATEGORIA[p.categoria]} />
        <span className="produto-nome">{p.nome}</span>
        <span className="produto-rodape">
          <span className="produto-preco">{formatarDinheiro(p.precoVenda)}</span>
          <span className={`produto-estoque ${p.estoque <= p.estoqueMinimo ? 'baixo' : ''}`}>
            {p.estoque <= 0 ? 'sem estoque' : `${p.estoque} un`}
          </span>
        </span>
        {noPedido > 0 && <SeloPulsante valor={noPedido} className="produto-qtd" />}
      </button>
    );
  };

  return (
    <div className={`pdv mesas-pagina ${itensPedido > 0 ? 'com-barra' : ''}`}>
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
                {conta && temPedido(conta) && <span className="mesa-pendente" title="Pedido ainda não lançado" />}
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
              {temPedido(c) && <span className="mesa-pendente" title="Pedido ainda não lançado" />}
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
          <input
            className="campo"
            placeholder="Outra mesa ou nome (15, Balcão, João...)"
            value={outra}
            onChange={(e) => setOutra(e.target.value)}
          />
          <button type="submit" className="botao contorno" disabled={!outra.trim()}>
            Abrir conta
          </button>
        </form>
        {erro && <p className="erro">{erro}</p>}
      </section>

      <section className="pdv-produtos mesas-produtos">
        {selecionada ? (
          <>
            <p className="pedido-para">
              Pedido para a <strong>{nomeSelecionada}</strong> · clique nos produtos e depois em “Lançar na {nomeSelecionada}”
            </p>
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
            pedidoPendente={itensPedido > 0}
            aoFechar={(venda) => {
              setFechada({ venda, mesa: selecionada.mesa });
              setSelecionadaId(null);
            }}
            aoCancelar={() => {
              descartarPedido();
              setSelecionadaId(null);
            }}
          >
            {lancado && (
              <Surgir className="sucesso" chave={lancado.id}>
                <span className="sucesso-selo">
                  <Check size={16} strokeWidth={3} />
                </span>
                <div>
                  <strong>{lancado.texto}</strong>
                  <small>Já está na conta e saiu do estoque.</small>
                </div>
              </Surgir>
            )}
            {itensPedido > 0 && (
              <div className="pedido-novo">
                <div className="pedido-novo-topo">
                  <strong>Pedido novo · {nomeSelecionada}</strong>
                  <small>ainda não lançado</small>
                </div>
                <ul className="carrinho">
                  {linhasPedido.map((l) => (
                    <li key={l.produto.id}>
                      <div className="carrinho-nome">
                        <span>{l.produto.nome}</span>
                        <small className="suave">{formatarDinheiro(l.produto.precoVenda)} cada</small>
                      </div>
                      <Contador valor={l.quantidade} maximo={l.produto.estoque} onChange={(v) => mudarPedido(l.produto.id, v)} />
                      <Numero valor={l.quantidade * l.produto.precoVenda} className="num forte" />
                    </li>
                  ))}
                </ul>
                <button type="button" className="botao grande" onClick={lancarPedido}>
                  <Send size={18} strokeWidth={1.9} /> Lançar na {nomeSelecionada} · {formatarDinheiro(totalPedido)}
                </button>
                <button type="button" className="link" onClick={descartarPedido}>
                  Descartar pedido
                </button>
              </div>
            )}
          </ContaDaMesa>
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

      {selecionada && itensPedido > 0 && (
        <div className="pedido-barra" role="region" aria-label={`Pedido da ${nomeSelecionada}`}>
          <div className="pedido-barra-texto">
            <small>
              {nomeSelecionada} · {itensPedido} {itensPedido === 1 ? 'item' : 'itens'}
            </small>
            <strong>{formatarDinheiro(totalPedido)}</strong>
          </div>
          <button type="button" className="botao" onClick={lancarPedido}>
            <Send size={17} strokeWidth={1.9} /> Lançar na {nomeSelecionada}
          </button>
        </div>
      )}
    </div>
  );
}

function ContaDaMesa({
  comanda,
  agora,
  pedidoPendente,
  aoFechar,
  aoCancelar,
  children,
}: {
  comanda: Comanda;
  agora: Date;
  /** Tem pedido montado e não lançado: não deixa fechar a conta sem ele. */
  pedidoPendente: boolean;
  aoFechar: (venda: Venda) => void;
  aoCancelar: () => void;
  children?: ReactNode;
}) {
  const { removerDaComanda, fecharComanda, cancelarComanda, pode } = useAdega();
  const podeCorrigir = pode('corrigir_mesas');
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

  // Pedido novo só pelo botão "Lançar na Mesa X". Aqui dá só para tirar, e só quem pode corrigir mesas.
  function tirarUm(produtoId: string) {
    const r = removerDaComanda(comanda.id, produtoId, 1);
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
        {podeCorrigir && !confirmandoCancelar && (
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

      {children}

      <h3 className="secao conta-titulo">Na conta</h3>
      {linhas.length === 0 ? (
        <p className="suave vazio">Nenhum pedido lançado ainda. Clique nos produtos e depois em “Lançar na {nome}”.</p>
      ) : (
        <ul className="carrinho">
          {linhas.map((l) => (
            <li key={`${l.produtoId}-${l.precoUnitario}`}>
              <div className="carrinho-nome">
                <span>{l.produtoNome}</span>
                <small className="suave">{formatarDinheiro(l.precoUnitario)} cada</small>
              </div>
              <span className="conta-qtd">
                {podeCorrigir && (
                  <button
                    type="button"
                    className="tirar"
                    aria-label={`Tirar 1 ${l.produtoNome}`}
                    title="Tirar 1"
                    onClick={() => tirarUm(l.produtoId)}
                  >
                    <Minus size={15} strokeWidth={2} />
                  </button>
                )}
                {l.quantidade}×
              </span>
              <Numero valor={l.subtotal} className="num forte" />
            </li>
          ))}
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
          <small className="suave">
            {pessoas > 1 ? `${formatarDinheiro(valorPorPessoa(total, pessoas))} por pessoa` : 'Uma pessoa paga tudo'}
          </small>
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

      <button className="botao grande" disabled={!forma || itens === 0 || falta || pedidoPendente} onClick={fechar}>
        {pedidoPendente
          ? 'Lance ou descarte o pedido novo'
          : itens === 0
            ? 'Lance pedidos para fechar'
            : forma
              ? `Fechar conta · ${formatarDinheiro(total)}`
              : 'Escolha a forma de pagamento'}
      </button>
    </>
  );
}
