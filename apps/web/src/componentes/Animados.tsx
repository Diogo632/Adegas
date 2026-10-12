import { formatarDinheiro, useContagem } from '@adegas/core';
import type { ReactNode } from 'react';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { movimentoReduzido, pulsar, surgir } from '../animacoes';

/** Número que conta até o valor ao abrir a tela e a cada mudança. */
export function Numero({
  valor,
  formato = 'dinheiro',
  className,
}: {
  valor: number;
  formato?: 'dinheiro' | 'inteiro' | 'porcento';
  className?: string;
}) {
  const atual = Math.round(useContagem(valor, { animar: !movimentoReduzido() }));
  const texto = formato === 'dinheiro' ? formatarDinheiro(atual) : formato === 'porcento' ? `${atual}%` : String(atual);
  return <span className={className}>{texto}</span>;
}

/** Barra do gráfico que cresce até o tamanho certo. `fracao` vai de 0 a 1. */
export function Barra({ fracao }: { fracao: number }) {
  const largura = useContagem(fracao * 100, { duracao: 900, animar: !movimentoReduzido() });
  return <div className="barra" style={{ width: `${largura}%` }} />;
}

/** Bloco que surge com animação quando aparece (ex.: aviso de venda registrada). */
export function Surgir({ children, className, chave }: { children: ReactNode; className?: string; chave?: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current) surgir(ref.current);
  }, [chave]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Selo com número que dá um pulo quando o número muda. */
export function SeloPulsante({ valor, className }: { valor: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const anterior = useRef(valor);
  useEffect(() => {
    if (ref.current && anterior.current !== valor) pulsar(ref.current);
    anterior.current = valor;
  }, [valor]);
  return (
    <span ref={ref} className={className}>
      {valor}
    </span>
  );
}
