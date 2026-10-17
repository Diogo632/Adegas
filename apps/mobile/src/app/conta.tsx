import { NOME_PAPEL, PERMISSOES, pode as usuarioPode, useAdega } from '@adegas/core';
import { router } from 'expo-router';
import { Check, LogOut, Minus, UsersRound } from 'lucide-react-native';
import { Fragment } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Entrar } from '../components/animacoes';
import { Avatar } from '../components/pessoas';
import { Botao, Cartao, Divisor, Secao } from '../components/ui';
import { CORES, TEXTO } from '../tema';

/** Quem está usando, o que pode fazer, trocar de usuário e (administrador) cadastrar a equipe. */
export default function MinhaConta() {
  const { usuario, sair, pode } = useAdega();
  if (!usuario) return null;
  const admin = usuario.papel === 'admin';

  return (
    <ScrollView contentContainerStyle={estilos.tela}>
      <Entrar style={estilos.topo}>
        <Avatar nome={usuario.nome} admin={admin} grande />
        <Text style={TEXTO.tituloTela}>{usuario.nome}</Text>
        <Text style={TEXTO.legenda}>{NOME_PAPEL[usuario.papel]}</Text>
      </Entrar>

      <Entrar atraso={80} style={{ gap: 14 }}>
        <Secao>{admin ? 'Pode fazer tudo' : 'O que você pode fazer'}</Secao>
        <Cartao style={{ paddingVertical: 4, gap: 0 }}>
          {PERMISSOES.map((p, i) => {
            const tem = usuarioPode(usuario, p.id);
            return (
              <Fragment key={p.id}>
                {i > 0 && <Divisor />}
                <View style={estilos.linha}>
                  {tem ? <Check size={18} color={CORES.receita} strokeWidth={2.4} /> : <Minus size={18} color={CORES.textoFraco} />}
                  <Text style={[TEXTO.corpo, { fontSize: 15, flex: 1 }, !tem && { color: CORES.textoFraco }]}>{p.nome}</Text>
                </View>
              </Fragment>
            );
          })}
        </Cartao>
        {!admin && <Text style={TEXTO.legenda}>Para mudar o que você pode fazer, fale com um administrador.</Text>}
      </Entrar>

      <Entrar atraso={160} style={{ gap: 10 }}>
        {pode('usuarios') && <Botao titulo="Usuários e acessos" icone={UsersRound} onPress={() => router.push('/usuarios')} />}
        <Botao titulo="Trocar usuário" icone={LogOut} variante="contorno" onPress={sair} />
      </Entrar>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 22 },
  topo: { alignItems: 'center', gap: 6 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
