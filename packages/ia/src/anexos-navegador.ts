/**
 * Arquivos no navegador (painel e app aberto no navegador): prepara cada arquivo
 * escolhido, colado ou arrastado para o Pop AI ler. Não usar no app nativo.
 */
import type { AnexoParaEnviar } from './anexos';
import { ErroAnexo, MAXIMO_ANEXOS, classificarArquivo, conferirTamanho, textoDoArquivo } from './anexos';
import { arquivoParaAudio } from './audio-navegador';

/** Fotos grandes são reduzidas: o Gemini não precisa de mais que isso para ler uma nota. */
const LADO_MAXIMO_IMAGEM = 2048;
const LADO_MINIATURA = 240;

function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(String(leitor.result).replace(/^data:[^,]*,/, ''));
    leitor.onerror = () => rejeitar(leitor.error);
    leitor.readAsDataURL(blob);
  });
}

function desenhar(imagem: ImageBitmap, ladoMaximo: number): HTMLCanvasElement {
  const escala = Math.min(1, ladoMaximo / Math.max(imagem.width, imagem.height));
  const tela = document.createElement('canvas');
  tela.width = Math.max(1, Math.round(imagem.width * escala));
  tela.height = Math.max(1, Math.round(imagem.height * escala));
  const ctx = tela.getContext('2d')!;
  ctx.fillStyle = '#fff'; // PNG com fundo transparente vira fundo branco no JPEG
  ctx.fillRect(0, 0, tela.width, tela.height);
  ctx.drawImage(imagem, 0, 0, tela.width, tela.height);
  return tela;
}

/** Qualquer imagem que o navegador abre (JPG, PNG, WEBP, GIF, BMP...) → JPEG de até 2048 px, e a miniatura. */
async function prepararImagem(arquivo: File, mimeType: string): Promise<AnexoParaEnviar> {
  let imagem: ImageBitmap;
  try {
    imagem = await createImageBitmap(arquivo);
  } catch {
    // HEIC do iPhone num navegador que não abre HEIC: vai como veio, o Gemini lê.
    if (mimeType === 'image/heic' || mimeType === 'image/heif') {
      conferirTamanho(arquivo.name, arquivo.size);
      return { nome: arquivo.name, tipo: 'imagem', mimeType, dados: await blobParaBase64(arquivo) };
    }
    throw new ErroAnexo(`Não consegui abrir a imagem "${arquivo.name}".`);
  }
  try {
    const jpeg = await new Promise<Blob | null>((r) => desenhar(imagem, LADO_MAXIMO_IMAGEM).toBlob(r, 'image/jpeg', 0.85));
    if (!jpeg) throw new ErroAnexo(`Não consegui preparar a imagem "${arquivo.name}".`);
    const miniatura = desenhar(imagem, LADO_MINIATURA).toDataURL('image/jpeg', 0.8);
    return { nome: arquivo.name, tipo: 'imagem', mimeType: 'image/jpeg', dados: await blobParaBase64(jpeg), miniatura };
  } finally {
    imagem.close();
  }
}

/** Prepara um arquivo para o Pop AI. Erros vêm como ErroAnexo, com a mensagem para mostrar. */
export async function prepararArquivo(arquivo: File): Promise<AnexoParaEnviar> {
  const nome = arquivo.name || 'arquivo';
  const { tipo, mimeType } = classificarArquivo(nome, arquivo.type);
  if (tipo === 'audio') {
    conferirTamanho(nome, arquivo.size);
    const audio = await arquivoParaAudio(arquivo).catch((erro: unknown) => {
      throw new ErroAnexo(erro instanceof Error ? erro.message : `Não consegui abrir o áudio "${nome}".`);
    });
    return { nome, tipo, mimeType: audio.mimeType, dados: audio.dados, duracao: audio.duracao };
  }
  if (tipo === 'imagem') return prepararImagem(arquivo, mimeType);
  if (tipo === 'pdf' || tipo === 'video') {
    conferirTamanho(nome, arquivo.size);
    return { nome, tipo, mimeType, dados: await blobParaBase64(arquivo) };
  }
  if (arquivo.size > 50 * 1024 * 1024) throw new ErroAnexo(`"${nome}" é grande demais.`);
  return { nome, tipo, mimeType, texto: textoDoArquivo(nome, tipo, new Uint8Array(await arquivo.arrayBuffer())) };
}

/**
 * Prepara vários arquivos (até o máximo por mensagem). Devolve os que deram certo
 * e as mensagens dos que não deram.
 */
export async function prepararArquivos(arquivos: File[], jaAnexados = 0): Promise<{ anexos: AnexoParaEnviar[]; erros: string[] }> {
  const vagas = Math.max(0, MAXIMO_ANEXOS - jaAnexados);
  const erros = arquivos.length > vagas ? [`Dá para mandar até ${MAXIMO_ANEXOS} arquivos por mensagem.`] : [];
  const anexos: AnexoParaEnviar[] = [];
  for (const arquivo of arquivos.slice(0, vagas)) {
    try {
      anexos.push(await prepararArquivo(arquivo));
    } catch (erro) {
      erros.push(erro instanceof Error ? erro.message : `Não consegui abrir "${arquivo.name}".`);
    }
  }
  return { anexos, erros };
}
