import type { CategoriaId, ChaveNFe, EntradaEstoque, FormaPagamento, LinhaConferencia, NotaDaEntrada, NotaFiscal, Produto } from '@adegas/core';
import {
  CATEGORIAS,
  FORMAS_PAGAMENTO,
  biparNaConferencia,
  conferenciaDaNota,
  entenderCodigo,
  entradasDaNota,
  formatarChave,
  formatarCnpj,
  formatarDinheiro,
  itensDaConferencia,
  lerXmlNFe,
  ligarCodigo,
  mudarCustoDaLinha,
  mudarQuantidadeDaLinha,
  paraCentavos,
  totaisDaConferencia,
  useAdega,
} from '@adegas/core';
import { prepararArquivo } from '@adegas/ia/src/anexos-navegador';
import { lerNotaPorImagem } from '@adegas/ia/src/notaPorFoto';
import { ArrowLeft, Camera, Check, CircleAlert, FileText, LoaderCircle, ScanBarcode, Smartphone, Trash2 } from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { Numero, Surgir } from '../componentes/Animados';
import type { FotoDoCelular, RespostaLeitura } from '../componentes/CelularLeitor';
import { CelularLeitor } from '../componentes/CelularLeitor';
import { LeitorCamera } from '../componentes/LeitorCamera';
import { useConfigAssistente } from '../configAssistente';
import { bipar } from '../leitor/camera';

const MAIOR_XML = 5 * 1024 * 1024;

interface Concluida {
  entradas: EntradaEstoque[];
  numero?: string;
}

/**
 * Entrada pela nota fiscal: bipa a nota (pelo celular, pela câmera ou por um
 * leitor USB), traz os produtos pelo XML ou pela foto, confere bipando os
 * produtos e dá entrada em tudo de uma vez.
 */
export default function EntradaNota() {
  const { estado, registrarEntradaDaNota } = useAdega();
  const { config } = useConfigAssistente();

  const [chave, setChave] = useState<ChaveNFe | null>(null);
  const [nota, setNota] = useState<NotaFiscal | null>(null);
  const [linhas, setLinhas] = useState<LinhaConferencia[]>([]);
  // Cópia que os leitores usam: dois bipes seguidos não podem se perder.
  const atuais = useRef({ linhas: [] as LinhaConferencia[], nota: null as NotaFiscal | null, chave: null as ChaveNFe | null });
  const [destaque, setDestaque] = useState<number | null>(null);
  const [codigoSemDono, setCodigoSemDono] = useState<string | null>(null);
  const [retorno, setRetorno] = useState<RespostaLeitura | null>(null);
  const [lendo, setLendo] = useState<string | null>(null);

  const [fonte, setFonte] = useState<'celular' | 'camera' | null>(null);
  const [digitado, setDigitado] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [formaPgto, setFormaPgto] = useState<FormaPagamento>('pix');
  const [erro, setErro] = useState<string | null>(null);
  const [concluida, setConcluida] = useState<Concluida | null>(null);

  function mudar(novo: Partial<typeof atuais.current>) {
    Object.assign(atuais.current, novo);
    if ('linhas' in novo) setLinhas(novo.linhas!);
    if ('nota' in novo) setNota(novo.nota!);
    if ('chave' in novo) setChave(novo.chave!);
  }

  function avisar(r: RespostaLeitura): RespostaLeitura {
    setRetorno(r);
    bipar(r.ok);
    return r;
  }

  const numeroDaNota = nota?.numero ?? (chave ? String(chave.numero) : undefined);
  const repetida = (() => {
    const c = nota?.chave ?? chave?.chave;
    const anteriores = c ? entradasDaNota(estado, c) : [];
    return anteriores.length ? new Date(anteriores[0].data).toLocaleDateString('pt-BR') : null;
  })();

  function abrirChave(lida: ChaveNFe): RespostaLeitura {
    const { nota: aberta, chave: atual, linhas: ls } = atuais.current;
    if (aberta?.chave === lida.chave || atual?.chave === lida.chave) return { ok: true, texto: `A nota ${lida.numero} já está aberta.` };
    const anteriores = entradasDaNota(estado, lida.chave);
    if (anteriores.length) {
      return { ok: false, texto: `A nota ${lida.numero} já deu entrada em ${new Date(anteriores[0].data).toLocaleDateString('pt-BR')}.` };
    }
    if ((aberta?.chave && aberta.chave !== lida.chave) || (atual && ls.length)) {
      return { ok: false, texto: 'Já tem outra nota aberta. Dê entrada nela ou descarte antes de bipar outra.' };
    }
    setConcluida(null);
    mudar({ chave: lida, nota: aberta ? { ...aberta, chave: lida.chave, numero: aberta.numero ?? String(lida.numero) } : aberta });
    const tipo = lida.modelo === '65' ? 'Cupom (NFC-e)' : 'Nota';
    return {
      ok: true,
      texto: `${tipo} ${lida.numero} de ${formatarCnpj(lida.cnpj)} lida.${aberta ? '' : ' Agora mande o XML ou a foto, ou bipe os produtos.'}`,
    };
  }

  function abrirNota(nova: NotaFiscal): RespostaLeitura {
    const { chave: lida, linhas: bipadas } = atuais.current;
    if (nova.chave && lida && nova.chave !== lida.chave && bipadas.some((l) => !l.foraDaNota)) {
      return { ok: false, texto: 'Essa nota é diferente da que está aberta. Descarte a atual antes.' };
    }
    const completa: NotaFiscal = {
      ...nova,
      chave: nova.chave ?? lida?.chave,
      numero: nova.numero ?? (lida ? String(lida.numero) : undefined),
      serie: nova.serie ?? (lida ? String(lida.serie) : undefined),
    };
    // O que já foi bipado antes de chegar a lista de produtos continua contado.
    let novas = conferenciaDaNota(completa, estado.produtos);
    for (const l of bipadas) {
      if (!l.item.ean) continue;
      for (let i = 0; i < l.bipados; i++) novas = biparNaConferencia(novas, l.item.ean, estado.produtos).linhas;
    }
    setConcluida(null);
    setErro(null);
    setCodigoSemDono(null);
    setDestaque(null);
    mudar({ nota: completa, linhas: novas });
    if (completa.emitente?.nome) setFornecedor(completa.emitente.nome);
    const reconhecidos = novas.filter((l) => l.acao === 'produto').length;
    return {
      ok: true,
      texto: `${novas.length} produto${novas.length > 1 ? 's' : ''} na nota, ${reconhecidos} reconhecido${reconhecidos === 1 ? '' : 's'}. Confira na tela.`,
    };
  }

  /** Tudo o que é lido (celular, câmera, leitor USB ou digitado) passa por aqui. */
  function lerCodigo(texto: string): RespostaLeitura {
    const codigo = entenderCodigo(texto);
    if (codigo.tipo === 'nota') return avisar(abrirChave(codigo.chave));
    if (codigo.tipo === 'outro') return avisar({ ok: false, texto: 'Esse código não é de nota fiscal nem de produto.' });
    const { linhas: ls, nota: aberta } = atuais.current;
    const bipe = biparNaConferencia(ls, codigo.codigo, estado.produtos, !aberta);
    if (bipe.linhas !== ls) {
      setConcluida(null);
      mudar({ linhas: bipe.linhas });
    }
    if (bipe.indice !== undefined) setDestaque(bipe.indice);
    if (bipe.codigoSemDono) setCodigoSemDono(bipe.codigoSemDono);
    return avisar({ ok: bipe.ok, texto: bipe.texto });
  }

  async function lerImagem(arquivo: Pick<FotoDoCelular, 'nome' | 'mimeType' | 'dados'>): Promise<RespostaLeitura> {
    if (!config.chave) {
      return avisar({ ok: false, texto: 'Para ler a foto, o Pop AI precisa estar configurado. Mande o XML da nota ou bipe os produtos.' });
    }
    setLendo('Lendo a nota com o Pop AI…');
    try {
      return avisar(abrirNota(await lerNotaPorImagem(arquivo, { chave: config.chave, modelo: config.modelo })));
    } catch (e) {
      return avisar({ ok: false, texto: e instanceof Error ? e.message : 'Não consegui ler a foto.' });
    } finally {
      setLendo(null);
    }
  }

  async function escolherArquivo(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    if (/\.xml$/i.test(arquivo.name) || /xml/.test(arquivo.type)) {
      if (arquivo.size > MAIOR_XML) {
        avisar({ ok: false, texto: 'Esse XML é grande demais para ser uma nota.' });
        return;
      }
      const lido = lerXmlNFe(await arquivo.text());
      avisar(lido.ok ? abrirNota(lido.valor) : { ok: false, texto: lido.erro });
      return;
    }
    if (!/^image\/|pdf$/.test(arquivo.type)) {
      avisar({ ok: false, texto: 'Mande o XML da nota, uma foto ou o PDF (DANFE).' });
      return;
    }
    try {
      const preparado = await prepararArquivo(arquivo);
      if (!preparado.dados) throw new Error('Não consegui abrir esse arquivo.');
      await lerImagem({ nome: preparado.nome, mimeType: preparado.mimeType, dados: preparado.dados });
    } catch (erro) {
      avisar({ ok: false, texto: erro instanceof Error ? erro.message : 'Não consegui abrir esse arquivo.' });
    }
  }

  function digitar(e: FormEvent) {
    e.preventDefault();
    if (!digitado.trim()) return;
    lerCodigo(digitado);
    setDigitado('');
  }

  function mudarLinha(i: number, linha: LinhaConferencia) {
    mudar({ linhas: atuais.current.linhas.map((l, j) => (j === i ? linha : l)) });
  }

  function descartar() {
    mudar({ linhas: [], nota: null, chave: null });
    setCodigoSemDono(null);
    setDestaque(null);
    setRetorno(null);
    setErro(null);
    setFornecedor('');
  }

  function darEntrada() {
    const dadosNota: NotaDaEntrada | undefined =
      nota?.chave || chave || nota?.numero
        ? { chave: nota?.chave ?? chave?.chave, numero: numeroDaNota, serie: nota?.serie ?? (chave ? String(chave.serie) : undefined) }
        : undefined;
    const r = registrarEntradaDaNota({ itens: itensDaConferencia(linhas), fornecedor, formaPagamento: formaPgto, nota: dadosNota });
    if (!r.ok) {
      setErro(r.erro);
      bipar(false);
      return;
    }
    setConcluida({ entradas: r.valor, numero: numeroDaNota });
    descartar();
  }

  const totais = totaisDaConferencia(linhas);
  const conferidos = linhas.filter((l) => l.acao !== 'ignorar' && l.bipados >= l.item.quantidade).length;
  const temAlgo = Boolean(chave || nota || linhas.length);

  return (
    <div className="pagina">
      <header className="cabecalho">
        <div>
          <p className="sobretitulo">Chegou mercadoria</p>
          <h1>Entrada pela nota fiscal</h1>
        </div>
        <Link to="/entrada" className="botao contorno">
          <ArrowLeft size={16} /> Entrada manual
        </Link>
      </header>

      {concluida && (
        <Surgir className="sucesso" chave={concluida}>
          <span className="sucesso-selo">
            <Check size={16} strokeWidth={3} />
          </span>
          <div>
            <strong>
              Entrada {concluida.numero ? `da nota ${concluida.numero} ` : ''}registrada: {concluida.entradas.length} produto
              {concluida.entradas.length > 1 ? 's' : ''}, +{concluida.entradas.reduce((s, e) => s + e.unidades, 0)} un
            </strong>
            <small>
              {formatarDinheiro(concluida.entradas.reduce((s, e) => s + e.custoTotal, 0))} lançado como despesa no financeiro · o sistema
              aprendeu os códigos e os nomes da nota para reconhecer da próxima vez
            </small>
          </div>
        </Surgir>
      )}

      <div className="grade-entrada">
        <div className="nota-principal">
          <section className="cartao" data-entrada>
            <h2 className="passo">
              <span>1</span>Bipe ou mande a nota
            </h2>
            <div className="nota-fontes">
              <button type="button" className={`nota-fonte ${fonte === 'celular' ? 'ativa' : ''}`} onClick={() => setFonte(fonte === 'celular' ? null : 'celular')}>
                <Smartphone size={22} strokeWidth={1.75} />
                <strong>Celular como leitor</strong>
                <small>Leia um QR Code e bipe pelo celular</small>
              </button>
              <button type="button" className={`nota-fonte ${fonte === 'camera' ? 'ativa' : ''}`} onClick={() => setFonte(fonte === 'camera' ? null : 'camera')}>
                <Camera size={22} strokeWidth={1.75} />
                <strong>Câmera deste aparelho</strong>
                <small>Webcam ou câmera do tablet</small>
              </button>
              <label className={`nota-fonte ${lendo ? 'desligado' : ''}`}>
                <FileText size={22} strokeWidth={1.75} />
                <strong>XML, foto ou PDF</strong>
                <small>O XML vem no e-mail do fornecedor</small>
                <input type="file" className="so-leitor" accept=".xml,text/xml,application/xml,image/*,application/pdf" disabled={!!lendo} onChange={escolherArquivo} />
              </label>
            </div>

            {fonte === 'celular' && <CelularLeitor aoLer={lerCodigo} aoReceberFoto={lerImagem} aoFechar={() => setFonte(null)} />}
            {fonte === 'camera' && <LeitorCamera aoLer={lerCodigo} aoFechar={() => setFonte(null)} retorno={retorno} />}

            <form className="nota-digitar" onSubmit={digitar}>
              <label className="campo-icone">
                <ScanBarcode size={18} strokeWidth={1.75} />
                <input
                  className="campo"
                  value={digitado}
                  onChange={(e) => setDigitado(e.target.value)}
                  placeholder="Chave da nota ou código do produto (leitor USB também funciona aqui)"
                  aria-label="Chave da nota ou código do produto"
                  inputMode="numeric"
                  autoComplete="off"
                />
              </label>
              <button type="submit" className="botao contorno">
                Ler
              </button>
            </form>

            {lendo && (
              <p className="nota-lendo">
                <LoaderCircle size={16} className="girando" /> {lendo}
              </p>
            )}
            {retorno && fonte !== 'camera' && !lendo && (
              <p className={`nota-retorno ${retorno.ok ? 'ok' : 'aviso'}`} role="status">
                {retorno.ok ? <Check size={16} strokeWidth={2.6} /> : <CircleAlert size={16} />} {retorno.texto}
              </p>
            )}
          </section>

          {temAlgo && (
            <section className="cartao" data-entrada>
              <div className="cartao-topo">
                <h2 className="passo">
                  <span>2</span>Confira os produtos
                </h2>
                <button type="button" className="link discreto" onClick={descartar}>
                  <Trash2 size={14} /> Descartar
                </button>
              </div>

              <CabecalhoNota nota={nota} chave={chave} />
              {repetida && (
                <p className="erro">
                  Essa nota já deu entrada em {repetida}. Para não somar o estoque duas vezes, ela não pode entrar de novo.
                </p>
              )}

              {!nota && (
                <p className="nota-explica suave">
                  {linhas.length
                    ? 'Sem os itens da nota, cada produto bipado entra na lista. Bipe de novo para somar a quantidade.'
                    : 'Para trazer os produtos, mande o XML ou uma foto da nota. Se preferir, bipe os produtos que chegaram, um por um.'}
                </p>
              )}

              {codigoSemDono && linhas.length > 0 && (
                <LigarCodigo
                  codigo={codigoSemDono}
                  linhas={linhas}
                  aoLigar={(i) => {
                    const ligadas = ligarCodigo(atuais.current.linhas, i, codigoSemDono);
                    mudar({ linhas: ligadas });
                    setDestaque(i);
                    setCodigoSemDono(null);
                    setRetorno({ ok: true, texto: `Código ${codigoSemDono} ligado a ${ligadas[i].item.descricao || ligadas[i].novo.nome}.` });
                  }}
                  aoCancelar={() => setCodigoSemDono(null)}
                />
              )}

              {linhas.length > 0 && (
                <ol className="itens-nota">
                  {linhas.map((l, i) => (
                    <ItemDaNota
                      key={i}
                      linha={l}
                      produtos={estado.produtos}
                      destaque={destaque === i}
                      aoMudar={(nova) => mudarLinha(i, nova)}
                      aoTirar={l.foraDaNota ? () => mudar({ linhas: atuais.current.linhas.filter((_, j) => j !== i) }) : undefined}
                    />
                  ))}
                </ol>
              )}
            </section>
          )}
        </div>

        <div className="coluna">
          <section className="cartao escuro resumo-entrada" data-entrada>
            <h2>Resumo</h2>
            <dl>
              <dt>Produtos</dt>
              <dd>
                {totais.itens}
                {linhas.length > totais.itens ? ` de ${linhas.length}` : ''}
              </dd>
              <dt>Conferidos no bipe</dt>
              <dd>
                {conferidos} de {totais.itens}
              </dd>
              <dt>Entram no estoque</dt>
              <dd>{totais.unidades} un</dd>
              {nota?.valorTotal ? (
                <>
                  <dt>Total da nota</dt>
                  <dd>{formatarDinheiro(nota.valorTotal)}</dd>
                </>
              ) : null}
              <dt className="total-compra">Total da entrada</dt>
              <dd className="total-compra">
                <Numero valor={totais.valor} />
              </dd>
            </dl>
            {nota?.valorTotal && totais.valor !== nota.valorTotal ? (
              <p className="nota-diferenca">
                {totais.valor < nota.valorTotal ? 'Faltam' : 'Sobram'} {formatarDinheiro(Math.abs(nota.valorTotal - totais.valor))} em relação ao total da
                nota (impostos, frete ou itens fora da entrada).
              </p>
            ) : null}
          </section>

          <section className="cartao" data-entrada>
            <h2 className="passo">
              <span>3</span>Pagamento ao fornecedor
            </h2>
            <div className="formulario nota-pagamento">
              <label className="rotulo">
                Fornecedor
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
            <button type="button" className="botao grande" disabled={!totais.itens || !!repetida} onClick={darEntrada}>
              Dar entrada {totais.itens ? `em ${totais.itens} produto${totais.itens > 1 ? 's' : ''}` : ''}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

function CabecalhoNota({ nota, chave }: { nota: NotaFiscal | null; chave: ChaveNFe | null }) {
  if (!nota && !chave) return null;
  const numero = nota?.numero ?? (chave ? String(chave.numero) : undefined);
  const cnpj = nota?.emitente?.cnpj ?? chave?.cnpj;
  const emissao = nota?.emissao ? new Date(`${nota.emissao}T12:00:00`).toLocaleDateString('pt-BR') : chave ? `${String(chave.mes).padStart(2, '0')}/${chave.ano}` : null;
  const codigo = nota?.chave ?? chave?.chave;
  return (
    <div className="nota-cabecalho">
      <FileText size={20} strokeWidth={1.75} />
      <div>
        <strong>
          {chave?.modelo === '65' ? 'Cupom' : 'Nota'} {numero ? `nº ${numero}` : 'sem número'}
          {nota?.emitente?.nome ? ` · ${nota.emitente.nome}` : ''}
        </strong>
        <small className="suave">
          {[cnpj ? `CNPJ ${formatarCnpj(cnpj)}` : null, emissao ? `emitida em ${emissao}` : null, nota ? (nota.origem === 'xml' ? 'itens do XML' : 'itens lidos da foto: confira') : 'sem os itens ainda']
            .filter(Boolean)
            .join(' · ')}
        </small>
        {codigo && <small className="nota-chave">{formatarChave(codigo)}</small>}
      </div>
    </div>
  );
}

function LigarCodigo({
  codigo,
  linhas,
  aoLigar,
  aoCancelar,
}: {
  codigo: string;
  linhas: LinhaConferencia[];
  aoLigar: (indice: number) => void;
  aoCancelar: () => void;
}) {
  const [escolha, setEscolha] = useState('');
  return (
    <div className="ligar-codigo">
      <p>
        <CircleAlert size={16} /> O código <strong>{codigo}</strong> ainda não é conhecido. De qual produto ele é?
      </p>
      <div className="ligar-codigo-acoes">
        <select className="campo" value={escolha} onChange={(e) => setEscolha(e.target.value)} aria-label="Produto do código">
          <option value="">Escolha o produto da nota…</option>
          {linhas.map((l, i) =>
            l.acao === 'ignorar' ? null : (
              <option key={i} value={i}>
                {l.item.descricao || l.novo.nome || `Item ${i + 1}`}
              </option>
            ),
          )}
        </select>
        <button type="button" className="botao" disabled={!escolha} onClick={() => aoLigar(Number(escolha))}>
          Ligar
        </button>
        <button type="button" className="link discreto" onClick={aoCancelar}>
          Ignorar
        </button>
      </div>
    </div>
  );
}

const STATUS: Record<string, { texto: string; classe: string }> = {
  codigo: { texto: 'Reconhecido pelo código', classe: 'ok' },
  'nome-da-nota': { texto: 'Reconhecido', classe: 'ok' },
  parecido: { texto: 'Nome parecido: confira', classe: 'baixo' },
  bipado: { texto: 'Reconhecido no bipe', classe: 'ok' },
  escolhido: { texto: 'Escolhido', classe: 'ok' },
};

function statusDaLinha(l: LinhaConferencia) {
  if (l.acao === 'ignorar') return { texto: 'Não entra', classe: 'nenhum' };
  if (l.acao === 'novo') return { texto: 'Produto novo', classe: 'novo' };
  return STATUS[l.como ?? 'escolhido'] ?? STATUS.escolhido;
}

function ItemDaNota({
  linha,
  produtos,
  destaque,
  aoMudar,
  aoTirar,
}: {
  linha: LinhaConferencia;
  produtos: Produto[];
  destaque: boolean;
  aoMudar: (linha: LinhaConferencia) => void;
  aoTirar?: () => void;
}) {
  const { item } = linha;
  const status = statusDaLinha(linha);
  const produto = linha.acao === 'produto' ? produtos.find((p) => p.id === linha.produtoId) : undefined;
  const titulo = linha.foraDaNota ? (produto?.nome ?? (linha.novo.nome || 'Produto novo')) : item.descricao;
  const conferido = linha.bipados >= item.quantidade && linha.acao !== 'ignorar';
  const escolha = linha.acao === 'produto' ? (linha.produtoId ?? '') : linha.acao;
  const ordenados = [...produtos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const unidades = Math.round(item.quantidade * (linha.unidadesPorEmbalagem ?? 0));

  function escolher(valor: string) {
    if (valor === 'novo' || valor === 'ignorar') aoMudar({ ...linha, acao: valor });
    else aoMudar({ ...linha, acao: 'produto', produtoId: valor, como: 'escolhido' });
  }

  return (
    <li className={`item-nota ${destaque ? 'destaque' : ''} ${linha.acao === 'ignorar' ? 'ignorado' : ''}`}>
      <div className="item-nota-topo">
        <div className="item-nota-titulo">
          <strong>{titulo}</strong>
          <small className="suave">
            {item.codigo ? `Cód. ${item.codigo} · ` : ''}
            {item.ean ? `EAN ${item.ean}` : 'sem código de barras'}
          </small>
        </div>
        <span className={`pilula ${status.classe}`}>{status.texto}</span>
        {linha.bipados > 0 && (
          <span className={`item-bipes ${conferido ? 'completo' : ''}`} title="Bipados na conferência">
            <ScanBarcode size={14} /> {linha.bipados}
            {linha.foraDaNota ? '' : `/${item.quantidade}`}
          </span>
        )}
        {aoTirar && (
          <button type="button" className="link discreto" onClick={aoTirar} aria-label="Tirar da lista" title="Tirar da lista">
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div className="item-nota-campos">
        <label className="rotulo item-produto">
          Produto do estoque
          <select className="campo" value={escolha} onChange={(e) => escolher(e.target.value)}>
            <option value="novo">+ Cadastrar como produto novo</option>
            <option value="ignorar">Não dar entrada neste item</option>
            <optgroup label="Produtos do estoque">
              {ordenados.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({p.estoque} un)
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className="rotulo">
          Quantidade ({item.unidade})
          <CampoNumero
            valor={item.quantidade}
            ler={(t) => Number(t.replace(',', '.'))}
            mostrar={(n) => String(n).replace('.', ',')}
            aoMudar={(q) => aoMudar(mudarQuantidadeDaLinha(linha, q))}
            rotulo="Quantidade"
          />
        </label>
        <label className={`rotulo ${linha.unidadesPorEmbalagem === null && linha.acao !== 'ignorar' ? 'falta' : ''}`}>
          Un. por {item.unidade}
          <CampoNumero
            valor={linha.unidadesPorEmbalagem ?? 0}
            ler={(t) => Number.parseInt(t, 10)}
            mostrar={(n) => (n ? String(n) : '')}
            aoMudar={(n) => aoMudar({ ...linha, unidadesPorEmbalagem: n > 0 ? n : null })}
            rotulo={`Unidades em cada ${item.unidade}`}
            dica="informe"
          />
        </label>
        <label className="rotulo">
          Valor do item
          <div className="campo-prefixo">
            <span>R$</span>
            <CampoNumero
              valor={item.valorTotal}
              ler={(t) => paraCentavos(t) ?? 0}
              mostrar={(c) => (c ? (c / 100).toFixed(2).replace('.', ',') : '')}
              aoMudar={(c) => aoMudar(mudarCustoDaLinha(linha, c))}
              rotulo="Valor do item"
              dica="0,00"
              decimal
            />
          </div>
        </label>
      </div>

      {linha.acao !== 'ignorar' && (
        <p className="item-nota-resumo suave">
          Entram <strong>{unidades || '?'} un</strong>
          {unidades ? ` a ${formatarDinheiro(Math.round(item.valorTotal / unidades))} cada` : ''}
          {produto ? ` · ${produto.nome} fica com ${produto.estoque + unidades} un` : ''}
        </p>
      )}

      {linha.acao === 'novo' && <ProdutoNovo linha={linha} aoMudar={aoMudar} />}
    </li>
  );
}

function ProdutoNovo({ linha, aoMudar }: { linha: LinhaConferencia; aoMudar: (linha: LinhaConferencia) => void }) {
  const novo = linha.novo;
  const mudarNovo = (parcial: Partial<LinhaConferencia['novo']>) => aoMudar({ ...linha, novo: { ...novo, ...parcial } });
  return (
    <div className="item-nota-novo">
      <label className="rotulo">
        Nome no estoque
        <input className="campo" value={novo.nome} onChange={(e) => mudarNovo({ nome: e.target.value })} placeholder="Ex.: Gin Tanqueray 750ml" />
      </label>
      <label className="rotulo">
        Categoria
        <select className="campo" value={novo.categoria} onChange={(e) => mudarNovo({ categoria: e.target.value as CategoriaId })}>
          {CATEGORIAS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>
      <label className={`rotulo ${novo.precoVenda > 0 ? '' : 'falta'}`}>
        Preço de venda (unidade)
        <div className="campo-prefixo">
          <span>R$</span>
          <CampoNumero
            valor={novo.precoVenda}
            ler={(t) => paraCentavos(t) ?? 0}
            mostrar={(c) => (c ? (c / 100).toFixed(2).replace('.', ',') : '')}
            aoMudar={(c) => mudarNovo({ precoVenda: c })}
            rotulo="Preço de venda"
            dica="0,00"
            decimal
          />
        </div>
      </label>
    </div>
  );
}

/** Campo de número que deixa digitar à vontade ("1," no meio do caminho) e acompanha mudanças de fora (bipes). */
function CampoNumero({
  valor,
  ler,
  mostrar,
  aoMudar,
  rotulo,
  dica,
  decimal,
}: {
  valor: number;
  ler: (texto: string) => number;
  mostrar: (valor: number) => string;
  aoMudar: (valor: number) => void;
  rotulo: string;
  dica?: string;
  decimal?: boolean;
}) {
  const [texto, setTexto] = useState(() => mostrar(valor));
  const [anterior, setAnterior] = useState(valor);
  if (valor !== anterior) {
    setAnterior(valor);
    if ((ler(texto) || 0) !== valor) setTexto(mostrar(valor));
  }
  return (
    <input
      className="campo"
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={texto}
      placeholder={dica}
      aria-label={rotulo}
      onChange={(e) => {
        setTexto(e.target.value);
        const n = ler(e.target.value);
        aoMudar(Number.isFinite(n) && n > 0 ? n : 0);
      }}
    />
  );
}
