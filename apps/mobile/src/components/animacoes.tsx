import { useContagem } from '@adegas/core';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { PressableProps, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, Text } from 'react-native';

// O driver nativo não existe no navegador; lá a animação roda em JavaScript puro.
const NATIVO = Platform.OS !== 'web';
const SAIDA = Easing.out(Easing.cubic);

/** Respeita quem pediu "reduzir movimento" nas configurações do celular. */
export function useMovimentoReduzido(): boolean {
  const [reduzido, setReduzido] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduzido)
      .catch(() => {});
    const inscricao = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduzido);
    return () => inscricao.remove();
  }, []);
  return reduzido;
}

/** Faz o conteúdo subir e aparecer quando a tela abre. Use `atraso` para entrar em cascata. */
export function Entrar({
  children,
  atraso = 0,
  style,
}: {
  children: ReactNode;
  atraso?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const progresso = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progresso, {
      toValue: 1,
      duration: 420,
      delay: atraso,
      easing: SAIDA,
      useNativeDriver: NATIVO,
    }).start();
  }, [progresso, atraso]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progresso,
          transform: [{ translateY: progresso.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Entra com uma "mola": cresce de pequeno até o tamanho certo (selo de sucesso). */
export function Surgir({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const escala = useRef(new Animated.Value(0.3)).current;
  const opacidade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(escala, { toValue: 1, friction: 5, tension: 120, useNativeDriver: NATIVO }),
      Animated.timing(opacidade, { toValue: 1, duration: 200, useNativeDriver: NATIVO }),
    ]).start();
  }, [escala, opacidade]);
  return <Animated.View style={[style, { opacity: opacidade, transform: [{ scale: escala }] }]}>{children}</Animated.View>;
}

const PressableAnimado = Animated.createAnimatedComponent(Pressable);

/**
 * Qualquer coisa tocável: afunda um pouco ao tocar e volta com uma mola.
 * Base de todos os botões, cartões de produto e formas de pagamento.
 */
export function Tocavel({
  style,
  escala = 0.96,
  onPressIn,
  onPressOut,
  children,
  ...resto
}: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  escala?: number;
  children?: ReactNode;
}) {
  const valor = useRef(new Animated.Value(1)).current;
  const animar = (para: number) =>
    Animated.spring(valor, { toValue: para, friction: 6, tension: 220, useNativeDriver: NATIVO }).start();
  return (
    <PressableAnimado
      {...resto}
      onPressIn={(e) => {
        animar(escala);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animar(1);
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale: valor }] }]}
    >
      {children}
    </PressableAnimado>
  );
}

/** Número que "conta" até o valor (ao abrir a tela e a cada mudança). */
export function NumeroAnimado({
  valor,
  formatar,
  style,
}: {
  valor: number;
  formatar: (valor: number) => string;
  style?: StyleProp<TextStyle>;
}) {
  const reduzido = useMovimentoReduzido();
  const atual = useContagem(valor, { animar: !reduzido });
  return <Text style={style}>{formatar(Math.round(atual))}</Text>;
}
