import type { LucideIcon } from 'lucide-react';

export function IconeQuadrado({ icone: Icone, tamanho = 40 }: { icone: LucideIcon; tamanho?: number }) {
  return (
    <span className="icone-quadrado" style={{ width: tamanho, height: tamanho }}>
      <Icone size={tamanho * 0.48} strokeWidth={1.6} />
    </span>
  );
}
