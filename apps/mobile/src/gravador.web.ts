import type { AudioParaEnviar } from '@adegas/ia';
import { GravadorNavegador, arquivoParaAudio, erroDeMicrofone, microfoneDisponivel } from '@adegas/ia';
import { useEffect, useRef, useState } from 'react';
import type { Gravador } from './gravador';

/** Versão web do app: grava pelo navegador e converte para WAV, como no painel. */
export function useGravador(aoLimite: () => void): Gravador {
  const chamarLimite = useRef(aoLimite);
  useEffect(() => {
    chamarLimite.current = aoLimite;
  });
  const [gravador] = useState(() => new GravadorNavegador(() => chamarLimite.current()));
  const [disponivel] = useState(microfoneDisponivel);
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    if (!gravando) return;
    const relogio = setInterval(() => setSegundos(gravador.segundos), 250);
    return () => clearInterval(relogio);
  }, [gravando, gravador]);
  useEffect(() => () => gravador.cancelar(), [gravador]);

  return {
    disponivel,
    gravando,
    segundos: gravando ? segundos : 0,
    async iniciar() {
      try {
        await gravador.iniciar();
        setSegundos(0);
        setGravando(true);
        return null;
      } catch (erro) {
        return erroDeMicrofone(erro);
      }
    },
    async parar() {
      setGravando(false);
      return gravador.parar();
    },
    cancelar() {
      setGravando(false);
      gravador.cancelar();
    },
  };
}

/** Abre a janela de escolher arquivo do navegador. null = desistiu. */
export function escolherArquivoDeAudio(): Promise<AudioParaEnviar | null> {
  return new Promise((resolver, rejeitar) => {
    const campo = document.createElement('input');
    campo.type = 'file';
    campo.accept = 'audio/*,.opus,.ogg,.m4a,.mp3,.wav,.aac,.flac';
    campo.setAttribute('aria-label', 'Mandar arquivo de áudio');
    campo.style.display = 'none';
    campo.addEventListener('change', () => {
      const arquivo = campo.files?.[0];
      campo.remove();
      if (!arquivo) return resolver(null);
      arquivoParaAudio(arquivo).then(resolver, rejeitar);
    });
    campo.addEventListener('cancel', () => {
      campo.remove();
      resolver(null);
    });
    document.body.appendChild(campo);
    campo.click();
  });
}
