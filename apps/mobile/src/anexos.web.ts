import { prepararArquivo, prepararArquivos } from '@adegas/ia';
import type { ArquivoDaNota, Escolha } from './anexos';

/** Abre a janela de escolher arquivo do navegador. Lista vazia = desistiu. */
function escolherNoNavegador(aceita: string, varios: boolean, camera = false): Promise<File[]> {
  return new Promise((resolver) => {
    const campo = document.createElement('input');
    campo.type = 'file';
    if (aceita) campo.accept = aceita;
    campo.multiple = varios;
    if (camera) campo.setAttribute('capture', 'environment');
    campo.setAttribute('aria-label', 'Mandar arquivo');
    campo.style.display = 'none';
    const terminar = (arquivos: File[]) => {
      campo.remove();
      resolver(arquivos);
    };
    campo.addEventListener('change', () => terminar([...(campo.files ?? [])]));
    campo.addEventListener('cancel', () => terminar([]));
    document.body.appendChild(campo);
    campo.click();
  });
}

/** Versão web do app: mesmas escolhas, preparadas como no painel. */
export async function tirarFoto(jaAnexados = 0): Promise<Escolha> {
  return prepararArquivos(await escolherNoNavegador('image/*', false, true), jaAnexados);
}

export async function escolherFotos(jaAnexados = 0): Promise<Escolha> {
  return prepararArquivos(await escolherNoNavegador('image/*', true), jaAnexados);
}

export async function escolherArquivos(jaAnexados = 0): Promise<Escolha> {
  return prepararArquivos(await escolherNoNavegador('', true), jaAnexados);
}

/** XML, PDF ou foto da nota (versão web do app). */
export async function escolherArquivoDaNota(): Promise<ArquivoDaNota | null> {
  const [arquivo] = await escolherNoNavegador('.xml,text/xml,application/xml,application/pdf,image/*', false);
  if (!arquivo) return null;
  try {
    if (/\.xml$/i.test(arquivo.name) || /xml/.test(arquivo.type)) {
      if (arquivo.size > 5 * 1024 * 1024) return { erro: 'Esse XML é grande demais para ser uma nota.' };
      return { xml: await arquivo.text() };
    }
    if (!/^image\/|pdf$/.test(arquivo.type)) return { erro: 'Mande o XML da nota, uma foto ou o PDF (DANFE).' };
    const preparado = await prepararArquivo(arquivo);
    if (!preparado.dados) return { erro: 'Não consegui abrir esse arquivo.' };
    return { nome: preparado.nome, mimeType: preparado.mimeType, dados: preparado.dados };
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : 'Não consegui abrir esse arquivo.' };
  }
}
