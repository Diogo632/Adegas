import { NOME_PAPEL, PERMISSOES, useAdega } from '@adegas/core';
import { router } from 'expo-router';
import { ChevronRight, UserPlus } from 'lucide-react-native';
import { Fragment } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Entrar, Tocavel } from '../../components/animacoes';
import { Avatar } from '../../components/pessoas';
import { Botao, Cartao, Divisor, Secao } from '../../components/ui';
import { CORES, TEXTO } from '../../tema';

/** Equipe: quem pode entrar no sistema e com qual nível de acesso. */
export default function Usuarios() {
  const { estado, usuario } = useAdega();
  const ordenados = [...estado.usuarios].sort((a, b) =>
    a.ativo !== b.ativo ? (a.ativo ? -1 : 1) : a.papel !== b.papel ? (a.papel === 'admin' ? -1 : 1) : a.nome.localeCompare(b.nome, 'pt-BR'),
  );

  return (
    <ScrollView contentContainerStyle={estilos.tela}>
      <Entrar>
        <Botao titulo="Cadastrar funcionário" icone={UserPlus} onPress={() => router.push('/usuarios/novo')} />
      </Entrar>
      <Entrar atraso={80} style={{ gap: 14 }}>
        <Secao>{`${estado.usuarios.filter((u) => u.ativo).length} com acesso`}</Secao>
        <Cartao style={{ paddingVertical: 4, gap: 0 }}>
          {ordenados.map((u, i) => {
            const permissoes = PERMISSOES.filter((p) => u.permissoes.includes(p.id)).map((p) => p.nome);
            return (
              <Fragment key={u.id}>
                {i > 0 && <Divisor />}
                <Tocavel accessibilityRole="button" escala={0.98} onPress={() => router.push(`/usuarios/${u.id}`)} style={estilos.linha}>
                  <View style={!u.ativo && { opacity: 0.45 }}>
                    <Avatar nome={u.nome} admin={u.papel === 'admin'} pequeno />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[TEXTO.corpoForte, !u.ativo && { color: CORES.textoFraco }]}>
                      {u.nome}
                      {u.id === usuario?.id ? ' (você)' : ''}
                    </Text>
                    <Text style={TEXTO.legenda} numberOfLines={2}>
                      {!u.ativo ? 'Sem acesso' : u.papel === 'admin' ? NOME_PAPEL.admin : permissoes.join(' · ') || 'Só lembretes'}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={CORES.textoFraco} />
                </Tocavel>
              </Fragment>
            );
          })}
        </Cartao>
      </Entrar>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 20 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
