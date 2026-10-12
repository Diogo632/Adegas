import type { CategoriaId, FormaPagamento } from '@adegas/core';
import type { LucideIcon } from 'lucide-react';
import {
  Banknote,
  Beer,
  Cigarette,
  CreditCard,
  CupSoda,
  Martini,
  Nut,
  Package,
  QrCode,
  Snowflake,
  WalletCards,
  Wine,
  Zap,
} from 'lucide-react';

// Mesmos ícones do app (lucide-react-native), para as duas telas parecerem um produto só.
export const ICONE_CATEGORIA: Record<CategoriaId, LucideIcon> = {
  cerveja: Beer,
  destilado: Martini,
  vinho: Wine,
  refrigerante: CupSoda,
  energetico: Zap,
  cigarro: Cigarette,
  gelo: Snowflake,
  petisco: Nut,
  outros: Package,
};

export const ICONE_FORMA: Record<FormaPagamento, LucideIcon> = {
  pix: QrCode,
  credito: CreditCard,
  debito: WalletCards,
  dinheiro: Banknote,
};
