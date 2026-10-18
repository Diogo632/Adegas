import { prepararArquivos } from '@adegas/ia';
import type { Escolha } from './anexos';

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
