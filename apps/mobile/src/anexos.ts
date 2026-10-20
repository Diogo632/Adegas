import type { AnexoParaEnviar } from '@adegas/ia';
import { ErroAnexo, MAXIMO_ANEXOS, classificarArquivo, conferirTamanho, deBase64, textoDoArquivo } from '@adegas/ia';
import { getDocumentAsync } from 'expo-document-picker';
import { File } from 'expo-file-system';
import type { ImagePickerResult } from 'expo-image-picker';
import { launchCameraAsync, launchImageLibraryAsync, requestCameraPermissionsAsync } from 'expo-image-picker';

/**
 * Arquivos para o Pop AI no celular: foto da câmera, fotos da galeria e qualquer
 * arquivo (PDF, planilha, documento, vídeo, áudio). Na versão web do app, quem
 * faz isso é o anexos.web.ts.
 */
export interface Escolha {
  anexos: AnexoParaEnviar[];
  /** Mensagens dos arquivos que não deram para usar. */
  erros: string[];
}

/** Imagens que o Gemini lê direto (as da câmera e da galeria já vêm em JPEG). */
const IMAGENS_ACEITAS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const NADA: Escolha = { anexos: [], erros: [] };

function deFotos(r: ImagePickerResult, vagas: number): Escolha {
  if (r.canceled) return NADA;
  const anexos = r.assets
    .filter((a) => a.base64)
    .slice(0, vagas)
    .map((a, i): AnexoParaEnviar => ({
      nome: a.fileName ?? `foto-${i + 1}.jpg`,
      tipo: 'imagem',
      mimeType: 'image/jpeg',
      dados: a.base64!,
      miniatura: a.uri,
    }));
  return { anexos, erros: r.assets.length > vagas ? [`Dá para mandar até ${MAXIMO_ANEXOS} arquivos por mensagem.`] : [] };
}

export async function tirarFoto(jaAnexados = 0): Promise<Escolha> {
  const permissao = await requestCameraPermissionsAsync();
  if (!permissao.granted) return { anexos: [], erros: ['Libere a câmera para o app nas configurações do celular.'] };
  const r = await launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true, exif: false });
  return deFotos(r, MAXIMO_ANEXOS - jaAnexados);
}

export async function escolherFotos(jaAnexados = 0): Promise<Escolha> {
  const vagas = MAXIMO_ANEXOS - jaAnexados;
  const r = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    base64: true,
    exif: false,
    allowsMultipleSelection: vagas > 1,
    selectionLimit: vagas,
  });
  return deFotos(r, vagas);
}

/** PDF, planilha, documento, texto, vídeo, áudio ou imagem salvos no celular. */
export async function escolherArquivos(jaAnexados = 0): Promise<Escolha> {
  const r = await getDocumentAsync({ type: '*/*', multiple: true, copyToCacheDirectory: true });
  if (r.canceled) return NADA;
  const vagas = MAXIMO_ANEXOS - jaAnexados;
  const erros = r.assets.length > vagas ? [`Dá para mandar até ${MAXIMO_ANEXOS} arquivos por mensagem.`] : [];
  const anexos: AnexoParaEnviar[] = [];
  for (const { uri, name, mimeType: informado, size } of r.assets.slice(0, vagas)) {
    try {
      const { tipo, mimeType } = classificarArquivo(name, informado);
      if (tipo === 'imagem' && !IMAGENS_ACEITAS.has(mimeType)) throw new ErroAnexo(`"${name}": mande a imagem em JPG ou PNG.`);
      const lidoPeloGemini = tipo === 'audio' || tipo === 'imagem' || tipo === 'pdf' || tipo === 'video';
      if (lidoPeloGemini && size) conferirTamanho(name, size);
      const dados = await new File(uri).base64();
      if (lidoPeloGemini) {
        if (!size) conferirTamanho(name, (dados.length * 3) / 4);
        anexos.push({ nome: name, tipo, mimeType, dados, miniatura: tipo === 'imagem' ? uri : undefined });
      } else {
        anexos.push({ nome: name, tipo, mimeType, texto: textoDoArquivo(name, tipo, deBase64(dados)) });
      }
    } catch (erro) {
      erros.push(erro instanceof Error ? erro.message : `Não consegui abrir "${name}".`);
    }
  }
  return { anexos, erros };
}

/** Arquivo da nota fiscal para a entrada por nota: o XML (lido inteiro) ou foto/PDF (para o Gemini). */
export type ArquivoDaNota = { xml: string } | { nome: string; mimeType: string; dados: string } | { erro: string };

const MAIOR_XML = 5 * 1024 * 1024;

/** XML, PDF ou foto da nota salvos no celular. null = desistiu. */
export async function escolherArquivoDaNota(): Promise<ArquivoDaNota | null> {
  const r = await getDocumentAsync({ type: ['text/xml', 'application/xml', 'application/pdf', 'image/*', '*/*'], copyToCacheDirectory: true });
  if (r.canceled || !r.assets[0]) return null;
  const { uri, name, mimeType: informado, size } = r.assets[0];
  try {
    if (/\.xml$/i.test(name) || /xml/.test(informado ?? '')) {
      if (size && size > MAIOR_XML) return { erro: 'Esse XML é grande demais para ser uma nota.' };
      return { xml: await new File(uri).text() };
    }
    const { tipo, mimeType } = classificarArquivo(name, informado);
    if (tipo !== 'pdf' && !(tipo === 'imagem' && IMAGENS_ACEITAS.has(mimeType))) return { erro: 'Mande o XML da nota, uma foto ou o PDF (DANFE).' };
    if (size) conferirTamanho(name, size);
    return { nome: name, mimeType, dados: await new File(uri).base64() };
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : `Não consegui abrir "${name}".` };
  }
}
