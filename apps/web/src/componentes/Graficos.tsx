import type { Periodo } from '@adegas/core';
import { PERIODOS } from '@adegas/core';
import { useLayoutEffect, useRef, useState } from 'react';
import { movimentoReduzido } from '../animacoes';

export interface Coluna {
  chave: string;
  valor: number;
  /** Texto embaixo da coluna (ex.: "12/10" ou "21h"). */
  rotulo: string;
  /** Linha extra na dica (ex.: "seg · 14 vendas"). */
  detalhe?: string;
  /** No gráfico com ênfase, só as destacadas ficam na cor forte. */
  destaque?: boolean;
}

/** Arredonda o topo do eixo para um número redondo, sem deixar muito espaço vazio em cima. */
function topoRedondo(maximo: number): number {
  if (maximo <= 0) return 1;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  for (const passo of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (passo * potencia >= maximo) return passo * potencia;
  }
  return 10 * potencia;
}

/**
 * Gráfico de colunas com um eixo só: uma cor, colunas finas, dica ao passar o mouse
 * (ou com o teclado). As colunas crescem com animação em JavaScript.
 */
export function GraficoColunas({
  colunas,
  formatarValor,
  formatarEixo,
  descricao,
}: {
  colunas: Coluna[];
  formatarValor: (valor: number) => string;
  formatarEixo: (valor: number) => string;
  /** Para leitores de tela: o que o gráfico mostra. */
  descricao: string;
}) {
  const [ativa, setAtiva] = useState<number | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const topo = topoRedondo(Math.max(...colunas.map((c) => c.valor), 0));
  const temEnfase = colunas.some((c) => c.destaque);
  const passoRotulo = Math.max(1, Math.ceil(colunas.length / 10));
  const assinatura = colunas.map((c) => `${c.chave}:${c.valor}`).join('|');

  useLayoutEffect(() => {
    if (movimentoReduzido() || !area.current) return;
    area.current.querySelectorAll<HTMLElement>('.col-barra').forEach((barra, i) => {
      barra.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], {
        duration: 650,
        delay: Math.min(i * 18, 400),
        easing: 'cubic-bezier(.22, 1, .36, 1)',
        fill: 'backwards',
      });
    });
  }, [assinatura]);

  return (
    <div className="grafico" role="img" aria-label={descricao}>
      <div className="grafico-eixo" aria-hidden>
        <span>{formatarEixo(topo)}</span>
        <span>{formatarEixo(topo / 2)}</span>
        <span>{formatarEixo(0)}</span>
      </div>
      <div className="grafico-area" ref={area} onMouseLeave={() => setAtiva(null)}>
        <div className="grafico-grade" aria-hidden>
          <i />
          <i />
          <i />
        </div>
        {colunas.map((c, i) => (
          <div
            key={c.chave}
            className={`col-grafico ${temEnfase && !c.destaque ? 'fraca' : ''} ${ativa === i ? 'ativa' : ''}`}
            tabIndex={0}
            onMouseEnter={() => setAtiva(i)}
            onFocus={() => setAtiva(i)}
            onBlur={() => setAtiva(null)}
          >
            <div className="col-barra" style={{ height: `${(c.valor / topo) * 100}%` }} />
            {i % passoRotulo === 0 && <span className="col-rotulo">{c.rotulo}</span>}
            {ativa === i && (
              <div
                className={`dica-grafico ${i > colunas.length * 0.7 ? 'a-esquerda' : i < colunas.length * 0.2 ? 'a-direita' : ''}`}
                style={{ bottom: `calc(${(c.valor / topo) * 100}% + 10px)` }}
              >
                <strong>{formatarValor(c.valor)}</strong>
                <span>
                  {c.rotulo}
                  {c.detalhe ? ` · ${c.detalhe}` : ''}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SeletorPeriodo({ valor, onChange }: { valor: Periodo; onChange: (periodo: Periodo) => void }) {
  return (
    <div className="segmentado periodo" role="group" aria-label="Período">
      {PERIODOS.map((p) => (
        <button key={p.id} type="button" className={valor === p.id ? 'ativo' : ''} onClick={() => onChange(p.id)}>
          {p.nome}
        </button>
      ))}
    </div>
  );
}
