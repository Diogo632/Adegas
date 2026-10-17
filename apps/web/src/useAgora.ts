import { useEffect, useState } from 'react';

/** Hora atual que se atualiza sozinha (para "aberta há 40 min" não ficar parado). */
export function useAgora(intervaloMs = 30_000): Date {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);
  return agora;
}
