/**
 * Todo valor em dinheiro é guardado em centavos (número inteiro) para não
 * acumular erro de arredondamento: R$ 12,50 vira 1250.
 */
export type Centavos = number;

/** 1250 -> "R$ 12,50" | 123456 -> "R$ 1.234,56" */
export function formatarDinheiro(valor: Centavos): string {
  const inteiro = Math.round(valor);
  const sinal = inteiro < 0 ? '-' : '';
  const absoluto = Math.abs(inteiro);
  const reais = Math.floor(absoluto / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centavos = (absoluto % 100).toString().padStart(2, '0');
  return `${sinal}R$ ${reais},${centavos}`;
}

/** 1250 -> "12,50" (para preencher campos de texto) */
export function centavosParaTexto(valor: Centavos): string {
  return formatarDinheiro(valor).replace('R$ ', '');
}

/**
 * Lê o que a pessoa digitou e devolve centavos, ou null se não der para entender.
 * Aceita "12", "12,5", "12,50", "1.234,56", "R$ 12,50" e "12.50".
 */
export function paraCentavos(texto: string): Centavos | null {
  let limpo = texto.replace(/R\$/gi, '').replace(/\s/g, '');
  if (limpo === '') return null;

  if (limpo.includes(',')) {
    // Formato brasileiro: ponto separa milhar, vírgula separa centavos.
    limpo = limpo.replace(/\./g, '').replace(',', '.');
  } else if (!/^\d+\.\d{1,2}$/.test(limpo)) {
    // "1.234" é mil duzentos e trinta e quatro, não 1,234.
    limpo = limpo.replace(/\./g, '');
  }

  if (!/^\d+(\.\d+)?$/.test(limpo)) return null;
  const valor = Number(limpo);
  if (!Number.isFinite(valor)) return null;
  return Math.round(valor * 100);
}

/** Para eixos e rótulos curtos: 123456 -> "R$ 1,2 mil", 80000 -> "R$ 800". */
export function formatarDinheiroCurto(valor: Centavos): string {
  const reais = Math.round(valor / 100);
  if (Math.abs(reais) >= 1000) {
    const mil = Math.round(reais / 100) / 10;
    return `R$ ${String(mil).replace('.', ',')} mil`;
  }
  return `R$ ${reais}`;
}
