import { iniciais } from '@adegas/core';
import { StyleSheet, Text, View } from 'react-native';
import { CORES, FONTE } from '../tema';

/** Bolinha com as iniciais. Administrador em amarelo. */
export function Avatar({ nome, admin, grande, pequeno }: { nome: string; admin?: boolean; grande?: boolean; pequeno?: boolean }) {
  const tamanho = grande ? 72 : pequeno ? 38 : 46;
  return (
    <View style={[estilos.avatar, { width: tamanho, height: tamanho }, admin && estilos.admin]}>
      <Text style={[estilos.texto, grande && { fontSize: 26 }, pequeno && { fontSize: 14 }, admin && { color: CORES.sobrePrimaria }]}>
        {iniciais(nome)}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  avatar: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CORES.destaqueBorda,
    backgroundColor: CORES.primariaSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  admin: { backgroundColor: CORES.primaria, borderColor: CORES.primaria },
  texto: { fontFamily: FONTE.negrito, fontSize: 16, color: CORES.primariaClara },
});
