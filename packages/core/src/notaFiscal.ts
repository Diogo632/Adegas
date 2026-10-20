/**
 * Entrada de mercadoria pela nota fiscal: a chave de acesso (código de barras do
 * DANFE ou QR Code da NFC-e), o XML da NF-e e a conferência dos itens com os
 * produtos do estoque. Tudo puro: roda igual no app, no painel e no servidor MCP.
 */
import type { Centavos } from './dinheiro';
import type { Acao } from './estado';
import { reducer } from './estado';
import type { DadosEntrada, DadosProdutoNovo } from './estoque';
import { montarEntrada } from './estoque';
import type { CategoriaId, EntradaEstoque, Estado, FormaPagamento, NotaDaEntrada, Produto, Resultado } from './tipos';
import { normalizar } from './util';

// ---------- Chave de acesso ----------

const UFS: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA',
  '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR', '42': 'SC', '43': 'RS',
  '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

/** O que dá para saber só pela chave de acesso de 44 números. */
export interface ChaveNFe {
  chave: string;
  uf: string;
  ano: number;
  mes: number;
  /** CNPJ de quem emitiu (o fornecedor). */
  cnpj: string;
  /** 55 = NF-e (nota de compra); 65 = NFC-e (cupom de consumidor). */
  modelo: '55' | '65';
  serie: number;
  numero: number;
}

/** Dígito verificador da chave (módulo 11, pesos de 2 a 9 da direita para a esquerda). */
export function digitoDaChave(chave43: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = chave43.length - 1; i >= 0; i--) {
    soma += Number(chave43[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/**
 * Acha a chave de acesso num texto lido pelo leitor: o código de barras do DANFE
 * (só os 44 números), o QR Code da NFC-e (um endereço com "p=CHAVE|...") ou a
 * chave digitada com espaços. Devolve null se não for uma chave válida.
 */
export function lerChaveDeAcesso(texto: string): ChaveNFe | null {
  for (const chave of texto.replace(/[\s.\-/]/g, '').match(/\d{44}/g) ?? []) {
    if (digitoDaChave(chave.slice(0, 43)) !== Number(chave[43])) continue;
    const uf = UFS[chave.slice(0, 2)];
    const modelo = chave.slice(20, 22);
    if (!uf || (modelo !== '55' && modelo !== '65')) continue;
    return {
      chave,
      uf,
      ano: 2000 + Number(chave.slice(2, 4)),
      mes: Number(chave.slice(4, 6)),
      cnpj: chave.slice(6, 20),
      modelo,
      serie: Number(chave.slice(22, 25)),
      numero: Number(chave.slice(25, 34)),
    };
  }
  return null;
}

/** "3526 1012 3456 ..." (de 4 em 4, como vem impresso no DANFE) */
export function formatarChave(chave: string): string {
  return chave.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** "12.345.678/0001-90" */
export function formatarCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, '');
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : cnpj;
}

/** Código de barras de produto (EAN-8, EAN-13, GTIN-14, UPC) com o dígito certo. */
export function gtinValido(codigo: string): boolean {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(codigo)) return false;
  const corpo = codigo.slice(0, -1);
  let soma = 0;
  for (let i = 0; i < corpo.length; i++) soma += Number(corpo[corpo.length - 1 - i]) * (i % 2 === 0 ? 3 : 1);
  return (10 - (soma % 10)) % 10 === Number(codigo[codigo.length - 1]);
}

/** O que um código lido pelo leitor é. */
export type TipoDeCodigo = { tipo: 'nota'; chave: ChaveNFe } | { tipo: 'produto'; codigo: string } | { tipo: 'outro'; texto: string };

export function entenderCodigo(texto: string): TipoDeCodigo {
  const chave = lerChaveDeAcesso(texto);
  if (chave) return { tipo: 'nota', chave };
  const limpo = texto.trim();
  if (gtinValido(limpo)) return { tipo: 'produto', codigo: limpo };
  return { tipo: 'outro', texto: limpo };
}

// ---------- Nota ----------

/** Um produto da nota, como o fornecedor escreveu. */
export interface ItemNota {
  /** Código do produto no fornecedor. */
  codigo?: string;
  /** Código de barras da embalagem comprada (caixa, fardo ou unidade). */
  ean?: string;
  /** Código de barras da unidade, quando é diferente do da embalagem. */
  eanUnidade?: string;
  descricao: string;
  /** Unidade da compra: UN, CX, FD, PCT... */
  unidade: string;
  quantidade: number;
  valorUnitario: Centavos;
  valorTotal: Centavos;
  /** Quantidade em unidades de venda, quando a nota informa (ex.: 2 CX = 24 UN). */
  quantidadeTributavel?: number;
  unidadeTributavel?: string;
}

export interface NotaFiscal {
  chave?: string;
  numero?: string;
  serie?: string;
  /** Data de emissão, AAAA-MM-DD. */
  emissao?: string;
  emitente?: { nome: string; cnpj?: string };
  itens: ItemNota[];
  valorTotal?: Centavos;
  /** De onde vieram os itens. */
  origem: 'xml' | 'foto';
}

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decodificar = (t: string) =>
  t.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (inteiro, e: string) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENTIDADES[e] ?? inteiro),
  );

function campo(xml: string, nome: string): string | undefined {
  const m = new RegExp(`<(?:\\w+:)?${nome}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${nome}>`).exec(xml);
  return m ? decodificar(m[1].trim()) : undefined;
}

const centavos = (valor?: string) => (valor ? Math.round(Number(valor) * 100) : 0);
const gtinOuNada = (valor?: string) => (valor && gtinValido(valor.trim()) ? valor.trim() : undefined);

/** Lê o XML da NF-e (o arquivo que o fornecedor manda por e-mail junto com o boleto). */
export function lerXmlNFe(xml: string): Resultado<NotaFiscal> {
  const infNFe = /<(?:\w+:)?infNFe\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?infNFe>/.exec(xml);
  if (!infNFe) return { ok: false, erro: 'Esse arquivo não é o XML de uma nota fiscal eletrônica (NF-e).' };
  const corpo = infNFe[2];
  const ide = campo(corpo, 'ide') ?? '';
  const emit = campo(corpo, 'emit') ?? '';
  const itens: ItemNota[] = [];
  for (const det of corpo.matchAll(/<(?:\w+:)?det\b[^>]*>([\s\S]*?)<\/(?:\w+:)?det>/g)) {
    const prod = campo(det[1], 'prod') ?? '';
    const ean = gtinOuNada(campo(prod, 'cEAN'));
    const eanTrib = gtinOuNada(campo(prod, 'cEANTrib'));
    itens.push({
      codigo: campo(prod, 'cProd'),
      ean,
      eanUnidade: eanTrib && eanTrib !== ean ? eanTrib : undefined,
      descricao: campo(prod, 'xProd') ?? 'Produto sem nome',
      unidade: (campo(prod, 'uCom') ?? 'UN').toUpperCase(),
      quantidade: Number(campo(prod, 'qCom') ?? 0),
      valorUnitario: centavos(campo(prod, 'vUnCom')),
      valorTotal: centavos(campo(prod, 'vProd')),
      quantidadeTributavel: campo(prod, 'qTrib') ? Number(campo(prod, 'qTrib')) : undefined,
      unidadeTributavel: campo(prod, 'uTrib')?.toUpperCase(),
    });
  }
  if (!itens.length) return { ok: false, erro: 'A nota não tem produtos.' };
  const chave = lerChaveDeAcesso(/Id="NFe(\d{44})"/.exec(infNFe[1])?.[1] ?? campo(xml, 'chNFe') ?? '')?.chave;
  const emissao = (campo(ide, 'dhEmi') ?? campo(ide, 'dEmi'))?.slice(0, 10);
  const nome = campo(emit, 'xFant') ?? campo(emit, 'xNome');
  return {
    ok: true,
    valor: {
      chave,
      numero: campo(ide, 'nNF'),
      serie: campo(ide, 'serie'),
      emissao,
      emitente: nome ? { nome, cnpj: campo(emit, 'CNPJ') } : undefined,
      itens,
      valorTotal: centavos(campo(campo(corpo, 'ICMSTot') ?? '', 'vNF')),
      origem: 'xml',
    },
  };
}

// ---------- Unidades por embalagem ----------

const UNIDADE_SOLTA = new Set(['UN', 'UND', 'UNID', 'UNIDADE', 'U', 'PC', 'PECA', 'LT', 'LATA', 'GF', 'GARRAFA', 'KG', 'L', 'LITRO']);

/**
 * Quantas unidades de venda vêm em cada unidade da compra. Usa o que a nota
 * informa (2 CX = 24 UN) ou o que está escrito no produto ("C/12", "12X350ML").
 * null = não deu para saber (a pessoa informa).
 */
export function unidadesPorEmbalagemDaNota(item: Pick<ItemNota, 'unidade' | 'descricao' | 'quantidade' | 'quantidadeTributavel' | 'unidadeTributavel'>): number | null {
  const unidade = normalizar(item.unidade).toUpperCase();
  if (UNIDADE_SOLTA.has(unidade)) return 1;
  const qTrib = item.quantidadeTributavel;
  if (qTrib && item.quantidade > 0 && UNIDADE_SOLTA.has(normalizar(item.unidadeTributavel ?? '').toUpperCase())) {
    const razao = qTrib / item.quantidade;
    if (razao > 1 && Number.isInteger(Math.round(razao * 1000) / 1000)) return Math.round(razao);
  }
  const texto = normalizar(item.descricao).toUpperCase();
  for (const padrao of [
    /\bC\s*\/\s*(\d{1,3})\b/,
    /\b(\d{1,3})\s*X\s*\d{2,4}\s*(?:ML|L|G)\b/,
    /\b(?:CX|FD|FARDO|PCT|PACK|CAIXA|DZ)\s*(?:C\/?|COM)?\s*(\d{1,3})\s*(?:UN|UND|LT|LATAS?|GF|GARRAFAS?)?\b/,
    /\b(\d{1,3})\s*(?:UN|UND|UNID|UNIDADES|LATAS|GARRAFAS)\b/,
  ]) {
    const n = Number(padrao.exec(texto)?.[1]);
    if (n >= 2 && n <= 240) return n;
  }
  return null;
}

// ---------- Casar itens com os produtos do estoque ----------

export type ComoCasou = 'codigo' | 'nome-da-nota' | 'parecido';

export function codigosDoProduto(p: Produto): string[] {
  return [...(p.codigoBarras ? [p.codigoBarras] : []), ...(p.codigosBarras ?? [])];
}

/** Produto pelo código de barras (da unidade ou da caixa). */
export function produtoPorCodigo(produtos: Produto[], codigo: string): Produto | undefined {
  const c = codigo.trim();
  return c ? produtos.find((p) => codigosDoProduto(p).includes(c)) : undefined;
}

const ABREVIACOES: Record<string, string> = {
  cerv: 'cerveja', cer: 'cerveja', refri: 'refrigerante', refrig: 'refrigerante', ref: 'refrigerante',
  lt: 'lata', lta: 'lata', gf: 'garrafa', grf: 'garrafa', gfa: 'garrafa', garraf: 'garrafa',
  min: 'mineral', energ: 'energetico', ener: 'energetico', vh: 'vinho', vinh: 'vinho',
  litro: 'l', litros: 'l', lts: 'l', lit: 'l', ltr: 'l', mls: 'ml',
};
const IGNORAR = new Set([
  'de', 'da', 'do', 'com', 'c', 'cx', 'fd', 'un', 'und', 'unid', 'pct', 'pack', 'x', 'sem', 's', 'emb',
  'embalagem', 'unidade', 'fardo', 'caixa', 'e', 'o', 'a', 'gas', 'tp', 'tipo', 'ret', 'retornavel', 'descartavel',
]);

function palavras(texto: string): string[] {
  return normalizar(texto)
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .split(/[^a-z0-9]+/)
    .map((p) => ABREVIACOES[p] ?? p)
    .filter((p) => p && !IGNORAR.has(p));
}

/** Quanto o nome do produto aparece na descrição da nota (0 a 1). */
export function semelhanca(descricaoNaNota: string, nomeDoProduto: string): number {
  const nota = new Set(palavras(descricaoNaNota));
  const produto = [...new Set(palavras(nomeDoProduto))];
  if (!produto.length) return 0;
  const achadas = produto.filter((p) => nota.has(p));
  let nota01 = achadas.length / produto.length;
  // Tamanho errado (350 x 600 ml) quase sempre é outro produto.
  const numeros = produto.filter((p) => /^\d+$/.test(p));
  if (numeros.some((n) => !nota.has(n))) nota01 *= 0.5;
  return nota01;
}

/** Qual produto do estoque é esse item da nota. */
export function casarItem(item: Pick<ItemNota, 'ean' | 'eanUnidade' | 'descricao'>, produtos: Produto[]): { produto: Produto; como: ComoCasou } | null {
  for (const codigo of [item.ean, item.eanUnidade]) {
    const p = codigo ? produtoPorCodigo(produtos, codigo) : undefined;
    if (p) return { produto: p, como: 'codigo' };
  }
  const descricao = normalizar(item.descricao);
  const salvo = produtos.find((p) => (p.nomesNaNota ?? []).some((n) => normalizar(n) === descricao));
  if (salvo) return { produto: salvo, como: 'nome-da-nota' };
  const notas = produtos
    .map((p) => ({ produto: p, nota: semelhanca(item.descricao, p.nome) }))
    .sort((a, b) => b.nota - a.nota);
  const [melhor, segundo] = notas;
  if (melhor && melhor.nota >= 0.6 && melhor.nota - (segundo?.nota ?? 0) >= 0.15) return { produto: melhor.produto, como: 'parecido' };
  return null;
}

/** Entradas já registradas com essa chave (para não dar entrada duas vezes na mesma nota). */
export function entradasDaNota(estado: Estado, chave: string): EntradaEstoque[] {
  return estado.entradas.filter((e) => e.notaFiscal?.chave === chave);
}

// ---------- Dar entrada na nota ----------

export interface ItemEntradaNota {
  /** Produto do estoque... */
  produtoId?: string;
  /** ...ou um produto novo, cadastrado com a entrada. */
  produtoNovo?: DadosProdutoNovo;
  /** Quantidade comprada, na unidade da nota (caixas, fardos ou unidades). */
  quantidade: number;
  /** Unidades de venda em cada unidade da nota (1 = já é unidade). */
  unidadesPorEmbalagem: number;
  /** Valor do item na nota. */
  custoTotal: Centavos;
  /** Para o sistema reconhecer o produto da próxima vez. */
  ean?: string;
  eanUnidade?: string;
  descricaoNaNota?: string;
}

export interface DadosEntradaNota {
  itens: ItemEntradaNota[];
  fornecedor?: string;
  formaPagamento: FormaPagamento;
  nota?: NotaDaEntrada;
}

/**
 * Valida a nota inteira e devolve as ações para registrar: uma entrada por item
 * (cada uma soma no estoque e lança a despesa) e o que o sistema aprende sobre
 * cada produto (código de barras e como o fornecedor escreve o nome). Se um item
 * tiver problema, nada é registrado.
 */
export function montarEntradaDaNota(
  estado: Estado,
  dados: DadosEntradaNota,
  agora: Date = new Date(),
): Resultado<{ acoes: Acao[]; entradas: EntradaEstoque[] }> {
  if (!dados.itens.length) return { ok: false, erro: 'Escolha pelo menos um produto para dar entrada.' };
  const chave = dados.nota?.chave;
  if (chave) {
    const anteriores = entradasDaNota(estado, chave);
    if (anteriores.length) {
      const quando = new Date(anteriores[0].data).toLocaleDateString('pt-BR');
      return { ok: false, erro: `Essa nota já deu entrada em ${quando}.` };
    }
  }
  let simulado = estado;
  const acoes: Acao[] = [];
  const entradas: EntradaEstoque[] = [];
  for (const [i, item] of dados.itens.entries()) {
    const rotulo = `Item ${i + 1}${item.descricaoNaNota ? ` (${item.descricaoNaNota})` : ''}`;
    if (!(item.quantidade > 0)) return { ok: false, erro: `${rotulo}: quantidade inválida.` };
    if (!Number.isInteger(item.unidadesPorEmbalagem) || item.unidadesPorEmbalagem < 1) {
      return { ok: false, erro: `${rotulo}: informe quantas unidades vêm em cada embalagem.` };
    }
    // Quantidade quebrada (ex.: 1,5 caixa) entra contada em unidades.
    const inteira = Number.isInteger(item.quantidade);
    const unidades = Math.round(item.quantidade * item.unidadesPorEmbalagem);
    const porFardo = inteira && item.unidadesPorEmbalagem > 1;
    const quantidade = porFardo ? item.quantidade : unidades;
    const entradaItem: DadosEntrada = {
      produtoId: item.produtoId,
      produtoNovo: item.produtoId ? undefined : item.produtoNovo,
      embalagem: porFardo ? 'fardo' : 'unidade',
      quantidade,
      unidadesPorEmbalagem: porFardo ? item.unidadesPorEmbalagem : undefined,
      custoPorEmbalagem: Math.round(item.custoTotal / Math.max(quantidade, 1)),
      custoTotal: item.custoTotal,
      fornecedor: dados.fornecedor,
      formaPagamento: dados.formaPagamento,
    };
    const r = montarEntrada(simulado, entradaItem, agora);
    if (!r.ok) return { ok: false, erro: `${rotulo}: ${r.erro}` };
    const entrada: EntradaEstoque = { ...r.valor.entrada, notaFiscal: dados.nota };
    const registrar: Acao = { tipo: 'registrar-entrada', entrada, produtoNovo: r.valor.produtoNovo };
    simulado = reducer(simulado, registrar);
    acoes.push(registrar);
    entradas.push(entrada);
    const codigos = [item.ean, item.eanUnidade].filter((c): c is string => !!c && gtinValido(c));
    const nomes = item.descricaoNaNota?.trim() ? [item.descricaoNaNota.trim()] : [];
    if (codigos.length || nomes.length) {
      const aprender: Acao = { tipo: 'aprender-produto', produtoId: entrada.produtoId, codigosBarras: codigos, nomesNaNota: nomes };
      simulado = reducer(simulado, aprender);
      acoes.push(aprender);
    }
  }
  return { ok: true, valor: { acoes, entradas } };
}

// ---------- Conferência (tela de entrada por nota) ----------

const PALAVRAS_DA_CATEGORIA: [CategoriaId, RegExp][] = [
  ['energetico', /\b(energetico|energ|red ?bull|monster|tnt|fusion|baly|burn|flying horse)\b/],
  ['cerveja', /\b(cerv|cerveja|chopp?|beer|ipa|lager|pilsen|puro malte|heineken|brahma|skol|antarctica|budweiser|amstel|stella|corona|spaten|itaipava|original|bohemia|eisenbahn|petra|devassa|colorado)\b/],
  ['destilado', /\b(vodka|vodca|whisky|whiskey|gin|rum|cachaca|pinga|tequila|licor|conhaque|vermute|campari|aperol|catuaba|steinhaeger|smirnoff|absolut|ypioca|velho barreiro|jack daniel|johnnie walker|ballantines|red label)\b/],
  ['vinho', /\b(vinho|vh|espumante|champagne|prosecco|frisante|sangria|tinto|rose|lambrusco|cabernet|merlot|malbec|moscatel)\b/],
  ['refrigerante', /\b(refri|refrig|refrigerante|coca|guarana|fanta|sprite|pepsi|soda|tonica|agua|mineral|suco|h2oh|schweppes|kuat|sukita|del valle|isotonico|gatorade|powerade)\b/],
  ['cigarro', /\b(cigarro|cig|marlboro|derby|rothmans|lucky strike|dunhill|kent|winston|palheiro|seda|isqueiro|bic|fumo)\b/],
  ['gelo', /\b(gelo|carvao|acendedor)\b/],
  ['petisco', /\b(amendoim|batata|chips|salgadinho|doritos|ruffles|pringles|cheetos|fandangos|torcida|petisco|castanha|biscoito|chocolate|bala|chiclete|pipoca|torresmo|azeitona)\b/],
];

/** Categoria mais provável pela descrição da nota. */
export function categoriaSugerida(descricao: string): CategoriaId {
  const texto = normalizar(descricao).replace(/[^a-z0-9]+/g, ' ');
  return PALAVRAS_DA_CATEGORIA.find(([, padrao]) => padrao.test(texto))?.[0] ?? 'outros';
}

const POR_EXTENSO: Record<string, string> = {
  cerv: 'Cerveja', cer: 'Cerveja', refri: 'Refrigerante', refrig: 'Refrigerante', ref: 'Refrigerante', energ: 'Energético',
  lt: 'Lata', lta: 'Lata', gf: 'Garrafa', grf: 'Garrafa', gfa: 'Garrafa', pet: 'PET', vh: 'Vinho', agua: 'Água', min: 'Mineral',
};

/** Nome para cadastrar o produto a partir da descrição da nota ("CERV SKOL LT 350ML C/12" → "Cerveja Skol Lata 350ml"). */
export function nomeSugerido(descricao: string): string {
  const limpo = descricao
    .replace(/\bC\s*\/\s*\d{1,3}\b/gi, ' ')
    .replace(/\b\d{1,3}\s*X\s*(?=\d{2,4}\s*(?:ML|L|G)\b)/gi, ' ')
    .replace(/\b(?:CX|FD|FARDO|PCT|PACK|CAIXA|DZ)\b(?:\s*(?:C\/?|COM)?\s*\d{1,3}\s*(?:UN|UND|UNID)?\b)?/gi, ' ')
    .replace(/\b\d{1,3}\s*(?:UN|UND|UNID|UNIDADES)\b/gi, ' ');
  const nome = limpo
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => {
      const minusc = p.toLowerCase();
      const semAcento = normalizar(minusc);
      if (POR_EXTENSO[semAcento]) return POR_EXTENSO[semAcento];
      if (/^\d+([.,]\d+)?(ml|g|kg)$/.test(minusc)) return minusc;
      if (/^\d+([.,]\d+)?l$/.test(minusc)) return minusc.toUpperCase();
      return minusc.charAt(0).toUpperCase() + minusc.slice(1);
    })
    .join(' ')
    .trim();
  return nome || descricao.trim();
}

/** Um item da nota na conferência e o que fazer com ele. */
export interface LinhaConferencia {
  item: ItemNota;
  /** produto = soma no produto do estoque; novo = cadastra; ignorar = não dá entrada. */
  acao: 'produto' | 'novo' | 'ignorar';
  produtoId?: string;
  /** Como o produto foi reconhecido. */
  como?: ComoCasou | 'bipado' | 'escolhido';
  /** Dados do cadastro, quando o produto é novo (já vem sugerido pela descrição). */
  novo: DadosProdutoNovo;
  /** Unidades de venda em cada unidade da nota. null = a pessoa precisa informar. */
  unidadesPorEmbalagem: number | null;
  /** Quantas vezes o produto foi bipado na conferência. */
  bipados: number;
  /** Entrou pelo leitor, sem estar nos itens da nota (entrada só pelos bipes). */
  foraDaNota?: boolean;
}

function linhaNova(item: ItemNota, produtos: Produto[]): LinhaConferencia {
  const casou = casarItem(item, produtos);
  return {
    item,
    acao: casou ? 'produto' : 'novo',
    produtoId: casou?.produto.id,
    como: casou?.como,
    novo: { nome: nomeSugerido(item.descricao), categoria: categoriaSugerida(item.descricao), precoVenda: 0, estoqueMinimo: 5 },
    unidadesPorEmbalagem: unidadesPorEmbalagemDaNota(item),
    bipados: 0,
  };
}

/** Linhas da conferência de uma nota: cada item já com o produto reconhecido, quando dá. */
export function conferenciaDaNota(nota: NotaFiscal, produtos: Produto[]): LinhaConferencia[] {
  return nota.itens.map((item) => linhaNova(item, produtos));
}

export interface Bipe {
  linhas: LinhaConferencia[];
  /** Deu certo (bip agudo) ou precisa de atenção (bip grave). */
  ok: boolean;
  /** O que aconteceu, para mostrar na tela e no celular. */
  texto: string;
  /** Linha que recebeu o bipe. */
  indice?: number;
  /** Código que o sistema não conhece: a pessoa escolhe de qual item ele é. */
  codigoSemDono?: string;
}

const nomeDaLinha = (l: LinhaConferencia, produtos: Produto[]) =>
  (l.produtoId && produtos.find((p) => p.id === l.produtoId)?.nome) || l.novo.nome || l.item.descricao || 'Produto novo';

function contagem(l: LinhaConferencia): string {
  if (l.foraDaNota) return `${l.bipados} bipado${l.bipados > 1 ? 's' : ''}`;
  return `${l.bipados} de ${l.item.quantidade} ${l.item.unidade}`;
}

function somarBipe(linhas: LinhaConferencia[], i: number, mudar: Partial<LinhaConferencia> = {}): LinhaConferencia[] {
  return linhas.map((l, j) => {
    if (j !== i) return l;
    const nova = { ...l, ...mudar, bipados: l.bipados + 1 };
    if (nova.foraDaNota && nova.bipados > nova.item.quantidade) {
      const quantidade = nova.bipados;
      nova.item = { ...nova.item, quantidade, valorTotal: nova.item.valorUnitario * quantidade };
    }
    return nova;
  });
}

/**
 * Um código de produto bipado na conferência. Com os itens da nota, marca o item
 * como conferido (e reconhece o produto, se ainda não sabia). Sem os itens
 * (`montando`), cada bipe vira um item da entrada.
 */
export function biparNaConferencia(linhas: LinhaConferencia[], codigo: string, produtos: Produto[], montando = false): Bipe {
  const produto = produtoPorCodigo(produtos, codigo);
  let i = linhas.findIndex((l) => l.acao !== 'ignorar' && (l.item.ean === codigo || l.item.eanUnidade === codigo));
  if (i < 0 && produto) i = linhas.findIndex((l) => l.acao === 'produto' && l.produtoId === produto.id);
  let reconheceu = false;
  if (i < 0 && produto && !montando) {
    // Nota lida pela foto quase nunca traz o código: o item que mais parece com o produto.
    const [melhor] = linhas
      .map((l, j) => ({ j, nota: l.acao === 'produto' && l.produtoId ? 0 : semelhanca(l.item.descricao, produto.nome) }))
      .sort((a, b) => b.nota - a.nota);
    if (melhor && melhor.nota >= 0.5) {
      i = melhor.j;
      reconheceu = true;
    }
  }
  if (i >= 0) {
    const atual = linhas[i];
    const mudar: Partial<LinhaConferencia> = {};
    if (produto && (reconheceu || atual.acao !== 'produto' || !atual.produtoId)) {
      Object.assign(mudar, { acao: 'produto', produtoId: produto.id, como: 'bipado' });
    }
    if (!atual.item.ean && !atual.item.eanUnidade) mudar.item = { ...atual.item, ean: codigo };
    const novas = somarBipe(linhas, i, mudar);
    const linha = novas[i];
    const passou = !linha.foraDaNota && linha.bipados > linha.item.quantidade;
    return {
      linhas: novas,
      ok: true,
      indice: i,
      texto: `${nomeDaLinha(linha, produtos)}: ${contagem(linha)}${passou ? ' (bipado a mais que a nota)' : ''}`,
    };
  }
  if (montando) {
    const item: ItemNota = {
      ean: codigo,
      descricao: produto?.nome ?? '',
      unidade: 'UN',
      quantidade: 1,
      valorUnitario: produto?.custoMedio ?? 0,
      valorTotal: produto?.custoMedio ?? 0,
    };
    const linha: LinhaConferencia = {
      item,
      acao: produto ? 'produto' : 'novo',
      produtoId: produto?.id,
      como: produto ? 'codigo' : undefined,
      novo: { nome: '', categoria: 'outros', precoVenda: 0, estoqueMinimo: 5 },
      unidadesPorEmbalagem: 1,
      bipados: 1,
      foraDaNota: true,
    };
    return {
      linhas: [...linhas, linha],
      ok: true,
      indice: linhas.length,
      texto: produto ? `${produto.nome}: 1 bipado` : `Código ${codigo} é de um produto novo: dê um nome a ele na tela.`,
    };
  }
  if (produto) return { linhas, ok: false, texto: `${produto.nome} não está nesta nota.` };
  return {
    linhas,
    ok: false,
    texto: `Código ${codigo} ainda não é conhecido. Escolha na tela de qual item da nota ele é.`,
    codigoSemDono: codigo,
  };
}

/** Liga um código desconhecido a um item da nota (o sistema aprende o código ao dar entrada). */
export function ligarCodigo(linhas: LinhaConferencia[], indice: number, codigo: string): LinhaConferencia[] {
  const atual = linhas[indice];
  if (!atual) return linhas;
  const item = !atual.item.ean ? { ...atual.item, ean: codigo } : !atual.item.eanUnidade && atual.item.ean !== codigo ? { ...atual.item, eanUnidade: codigo } : atual.item;
  return somarBipe(linhas, indice, { item });
}

/** Linhas que vão dar entrada. */
export function linhasParaEntrada(linhas: LinhaConferencia[]): LinhaConferencia[] {
  return linhas.filter((l) => l.acao !== 'ignorar');
}

/** O que a conferência vira na hora de dar entrada. */
export function itensDaConferencia(linhas: LinhaConferencia[]): ItemEntradaNota[] {
  return linhasParaEntrada(linhas).map((l) => ({
    produtoId: l.acao === 'produto' ? l.produtoId : undefined,
    produtoNovo: l.acao === 'novo' ? l.novo : undefined,
    quantidade: l.item.quantidade,
    unidadesPorEmbalagem: l.unidadesPorEmbalagem ?? 0,
    custoTotal: l.item.valorTotal,
    ean: l.item.ean,
    eanUnidade: l.item.eanUnidade,
    descricaoNaNota: l.foraDaNota ? undefined : l.item.descricao,
  }));
}

/** Totais da conferência: unidades que entram no estoque e valor. */
export function totaisDaConferencia(linhas: LinhaConferencia[]): { itens: number; unidades: number; valor: Centavos } {
  const entram = linhasParaEntrada(linhas);
  return {
    itens: entram.length,
    unidades: entram.reduce((s, l) => s + Math.round(l.item.quantidade * (l.unidadesPorEmbalagem ?? 0)), 0),
    valor: entram.reduce((s, l) => s + l.item.valorTotal, 0),
  };
}

/** Muda a quantidade de um item mantendo o valor de cada um. */
export function mudarQuantidadeDaLinha(linha: LinhaConferencia, quantidade: number): LinhaConferencia {
  return { ...linha, item: { ...linha.item, quantidade, valorTotal: Math.round(linha.item.valorUnitario * quantidade) } };
}

/** Muda o valor total de um item (o valor de cada um acompanha). */
export function mudarCustoDaLinha(linha: LinhaConferencia, valorTotal: Centavos): LinhaConferencia {
  const valorUnitario = linha.item.quantidade > 0 ? Math.round(valorTotal / linha.item.quantidade) : valorTotal;
  return { ...linha, item: { ...linha.item, valorTotal, valorUnitario } };
}
