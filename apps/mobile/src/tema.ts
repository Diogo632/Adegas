import { CORES } from '@adegas/core';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { StyleSheet } from 'react-native';

export { CORES };

/** Fontes carregadas no _layout. Inter em tudo, títulos incluídos. */
export const ARQUIVOS_FONTE = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
};

export const FONTE = {
  regular: 'Inter_400Regular',
  media: 'Inter_500Medium',
  semi: 'Inter_600SemiBold',
  negrito: 'Inter_700Bold',
  /** Títulos usam a mesma fonte dos textos, só mais pesada. */
  titulo: 'Inter_700Bold',
};

export const RAIO = { pequeno: 10, medio: 14, grande: 20 };

/** Estilos de texto prontos, para todas as telas falarem a mesma língua visual. */
export const TEXTO = StyleSheet.create({
  tituloTela: { fontFamily: FONTE.titulo, fontSize: 30, color: CORES.texto, letterSpacing: -0.6 },
  titulo: { fontFamily: FONTE.titulo, fontSize: 19, color: CORES.texto, letterSpacing: -0.2 },
  /** Rótulo de seção: pequeno, maiúsculo e espaçado. */
  secao: {
    fontFamily: FONTE.semi,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: CORES.primariaClara,
  },
  corpo: { fontFamily: FONTE.regular, fontSize: 16, color: CORES.texto },
  corpoForte: { fontFamily: FONTE.semi, fontSize: 16, color: CORES.texto },
  legenda: { fontFamily: FONTE.regular, fontSize: 14, color: CORES.textoSuave },
  valor: { fontFamily: FONTE.semi, fontSize: 16, color: CORES.texto, fontVariant: ['tabular-nums'] },
});
