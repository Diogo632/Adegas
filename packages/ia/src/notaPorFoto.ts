/**
 * Foto ou PDF da nota fiscal → itens da nota, lidos pelo Gemini. Usado na entrada
 * por nota quando não há o XML: o Gemini devolve os dados já organizados (JSON).
 */
import type { ItemNota, NotaFiscal } from '@adegas/core';
import { gtinValido, lerChaveDeAcesso } from '@adegas/core';
import type { AnexoParaEnviar } from './anexos';
import type { Buscar, EsquemaGemini, PedidoGemini } from './gemini';
import { ErroGemini, MODELO_PADRAO, escolherModeloFlash, gerarConteudo } from './gemini';

const texto = (description: string): EsquemaGemini => ({ type: 'STRING', description });
const numero = (description: string): EsquemaGemini => ({ type: 'NUMBER', description });

const ESQUEMA_NOTA: EsquemaGemini = {
  type: 'OBJECT',
  properties: {
    chave_de_acesso: texto('Os 44 números da chave de acesso, se aparecerem (sem espaços). Vazio se não houver.'),
    numero: texto('Número da nota'),
    serie: texto('Série da nota'),
    data_emissao: texto('Data de emissão, AAAA-MM-DD'),
    emitente_nome: texto('Nome do fornecedor (emitente)'),
    emitente_cnpj: texto('CNPJ do emitente, só números'),
    valor_total: numero('Valor total da nota, em reais'),
    itens: {
      type: 'ARRAY',
      description: 'Todos os produtos da nota, na ordem',
      items: {
        type: 'OBJECT',
        properties: {
          codigo: texto('Código do produto no fornecedor'),
          ean: texto('Código de barras (EAN/GTIN) do produto, se aparecer'),
          descricao: texto('Descrição do produto exatamente como está na nota'),
          unidade: texto('Unidade da compra: UN, CX, FD, PCT...'),
          quantidade: numero('Quantidade comprada, na unidade acima'),
          valor_unitario: numero('Valor de cada unidade da compra, em reais'),
          valor_total: numero('Valor total do item, em reais'),
        },
        required: ['descricao', 'quantidade', 'valor_total'],
      },
    },
  },
  required: ['itens'],
};

export const INSTRUCOES_NOTA = [
  'Você lê notas fiscais de compra de uma adega (loja de bebidas): DANFE de NF-e, cupom, pedido ou romaneio de entrega.',
  'Copie os dados exatamente como estão no documento. Não invente nada: o que não aparecer, deixe vazio.',
  'Liste todos os produtos, um por item, com quantidade, unidade (UN, CX, FD, PCT...), valor unitário e valor total.',
  'Valores em reais com ponto decimal (ex.: 33.5). Quantidades como números.',
  'Se a imagem não for uma nota ou não der para ler os produtos, devolva a lista de itens vazia.',
].join('\n');

interface NotaLida {
  chave_de_acesso?: string;
  numero?: string;
  serie?: string;
  data_emissao?: string;
  emitente_nome?: string;
  emitente_cnpj?: string;
  valor_total?: number;
  itens?: {
    codigo?: string;
    ean?: string;
    descricao?: string;
    unidade?: string;
    quantidade?: number;
    valor_unitario?: number;
    valor_total?: number;
  }[];
}

const centavos = (reais?: number) => (typeof reais === 'number' && Number.isFinite(reais) ? Math.round(reais * 100) : 0);

/** Converte o que o Gemini leu numa nota fiscal (valores em centavos, chave e códigos conferidos). */
export function notaDaLeitura(lida: NotaLida): NotaFiscal {
  const itens: ItemNota[] = (lida.itens ?? [])
    .filter((i) => i.descricao?.trim() && (i.quantidade ?? 0) > 0)
    .map((i) => {
      const quantidade = Number(i.quantidade);
      const valorTotal = centavos(i.valor_total) || Math.round(centavos(i.valor_unitario) * quantidade);
      const ean = i.ean?.replace(/\D/g, '');
      return {
        codigo: i.codigo?.trim() || undefined,
        ean: ean && gtinValido(ean) ? ean : undefined,
        descricao: i.descricao!.trim(),
        unidade: (i.unidade?.trim() || 'UN').toUpperCase(),
        quantidade,
        valorUnitario: centavos(i.valor_unitario) || Math.round(valorTotal / quantidade),
        valorTotal,
      };
    });
  const cnpj = lida.emitente_cnpj?.replace(/\D/g, '');
  return {
    chave: lerChaveDeAcesso(lida.chave_de_acesso ?? '')?.chave,
    numero: lida.numero?.trim() || undefined,
    serie: lida.serie?.trim() || undefined,
    emissao: /^\d{4}-\d{2}-\d{2}/.test(lida.data_emissao ?? '') ? lida.data_emissao!.slice(0, 10) : undefined,
    emitente: lida.emitente_nome?.trim() ? { nome: lida.emitente_nome.trim(), cnpj: cnpj || undefined } : undefined,
    itens,
    valorTotal: centavos(lida.valor_total) || undefined,
    origem: 'foto',
  };
}

export interface OpcoesLeituraNota {
  chave: string;
  modelo?: string;
  buscar?: Buscar;
  sinal?: AbortSignal;
}

/** Lê a foto (ou o PDF) da nota com o Gemini e devolve os itens. */
export async function lerNotaPorImagem(arquivo: Pick<AnexoParaEnviar, 'dados' | 'mimeType' | 'nome'>, opcoes: OpcoesLeituraNota): Promise<NotaFiscal> {
  if (!opcoes.chave.trim()) throw new ErroGemini('O Pop AI ainda não foi configurado neste sistema. Avise o administrador.');
  if (!arquivo.dados) throw new ErroGemini('Arquivo vazio.');
  const pedido: PedidoGemini = {
    systemInstruction: { parts: [{ text: INSTRUCOES_NOTA }] },
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType: arquivo.mimeType, data: arquivo.dados } }, { text: `Leia esta nota: "${arquivo.nome}".` }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: ESQUEMA_NOTA },
  };
  const base = { chave: opcoes.chave.trim(), buscar: opcoes.buscar, sinal: opcoes.sinal };
  let resposta;
  try {
    resposta = await gerarConteudo(pedido, { ...base, modelo: opcoes.modelo?.trim() || MODELO_PADRAO });
  } catch (erro) {
    // Modelo aposentado ou com outro nome: tenta o Flash mais novo que a chave enxerga.
    const outro = erro instanceof ErroGemini && erro.status === 404 ? await escolherModeloFlash(base).catch(() => null) : null;
    if (!outro) throw erro;
    resposta = await gerarConteudo(pedido, { ...base, modelo: outro });
  }
  const json = resposta.parts
    .filter((p) => typeof p.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('')
    .replace(/^```(?:json)?\s*|\s*```$/g, '');
  let lida: NotaLida;
  try {
    lida = JSON.parse(json) as NotaLida;
  } catch {
    throw new ErroGemini('Não consegui entender a leitura da nota. Tente de novo.');
  }
  const nota = notaDaLeitura(lida);
  if (!nota.itens.length) throw new ErroGemini('Não achei produtos nessa imagem. Tire uma foto mais nítida da parte dos produtos.');
  return nota;
}
