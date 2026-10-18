import { GravadorNavegador, erroDeMicrofone, microfoneDisponivel } from '@adegas/ia';
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
