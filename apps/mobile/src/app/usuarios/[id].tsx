import type { Papel, Permissao } from '@adegas/core';
import { PERMISSOES, PERMISSOES_PADRAO, TAMANHO_PIN, useAdega } from '@adegas/core';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Fragment, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Entrar } from '../../components/animacoes';
import { Aviso, Botao, Campo, Cartao, Divisor, Secao, Segmentado } from '../../components/ui';
import { CORES, FONTE, TEXTO } from '../../tema';

/** Cadastrar ou editar um usuário: nome, nível de acesso, permissões e PIN. */
export default function EditarUsuario() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { estado, salvarUsuario } = useAdega();
  const atual = estado.usuarios.find((u) => u.id === id);
  const novo = !atual;

  const [nome, setNome] = useState(atual?.nome ?? '');
  const [papel, setPapel] = useState<Papel>(atual?.papel ?? 'funcionario');
  const [permissoes, setPermissoes] = useState<Permissao[]>(atual ? atual.permissoes : PERMISSOES_PADRAO);
  const [pin, setPin] = useState('');
  const [ativo, setAtivo] = useState(atual?.ativo ?? true);
  const [erro, setErro] = useState<string | null>(null);

  const alternar = (p: Permissao) => setPermissoes((lista) => (lista.includes(p) ? lista.filter((x) => x !== p) : [...lista, p]));

  function salvar() {
    const r = salvarUsuario({ id: atual?.id, nome, papel, permissoes, pin: pin || undefined, ativo });
    if (r.ok) router.back();
    else setErro(r.erro);
  }

  return (
    <ScrollView contentContainerStyle={estilos.tela} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Stack.Screen options={{ title: novo ? 'Novo funcionário' : atual.nome }} />

      <Entrar style={{ gap: 16 }}>
        <Campo rotulo="Nome" value={nome} onChangeText={setNome} placeholder="Ex.: Ana" />
        <View style={{ gap: 8 }}>
          <Text style={estilos.rotulo}>Nível de acesso</Text>
          <Segmentado
            opcoes={[
              { id: 'funcionario', rotulo: 'Funcionário' },
              { id: 'admin', rotulo: 'Administrador' },
            ]}
            valor={papel}
            onChange={setPapel}
          />
        </View>
        <Campo
          rotulo={novo ? `PIN (${TAMANHO_PIN} números)` : 'Novo PIN (deixe vazio para manter)'}
          value={pin}
          onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, TAMANHO_PIN))}
          teclado="number-pad"
          seguro
          placeholder="••••"
        />
      </Entrar>

      <Entrar atraso={80} style={{ gap: 14 }}>
        <Secao>{papel === 'admin' ? 'Administrador pode tudo' : 'O que pode fazer'}</Secao>
        {papel === 'admin' ? (
          <Text style={TEXTO.legenda}>Vende, atende mesas, mexe no estoque, vê o financeiro e cadastra usuários.</Text>
        ) : (
          <Cartao style={{ paddingVertical: 4, gap: 0 }}>
            {PERMISSOES.map((p, i) => (
              <Fragment key={p.id}>
                {i > 0 && <Divisor />}
                <View style={estilos.permissao}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[TEXTO.corpoForte, { fontSize: 15 }]}>{p.nome}</Text>
                    <Text style={TEXTO.legenda}>{p.dica}</Text>
                  </View>
                  <Switch
                    accessibilityLabel={p.nome}
                    value={permissoes.includes(p.id)}
                    onValueChange={() => alternar(p.id)}
                    trackColor={{ true: CORES.primaria, false: CORES.bordaForte }}
                    thumbColor={permissoes.includes(p.id) ? CORES.sobrePrimaria : CORES.textoSuave}
                    {...{ activeThumbColor: CORES.sobrePrimaria }}
                  />
                </View>
              </Fragment>
            ))}
          </Cartao>
        )}
      </Entrar>

      {!novo && (
        <Entrar atraso={120}>
          <Cartao style={estilos.permissao}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[TEXTO.corpoForte, { fontSize: 15 }]}>Pode entrar no sistema</Text>
              <Text style={TEXTO.legenda}>Desligue quando a pessoa sair da equipe. O histórico dela continua.</Text>
            </View>
            <Switch
              accessibilityLabel="Pode entrar no sistema"
              value={ativo}
              onValueChange={setAtivo}
              trackColor={{ true: CORES.primaria, false: CORES.bordaForte }}
              thumbColor={ativo ? CORES.sobrePrimaria : CORES.textoSuave}
              {...{ activeThumbColor: CORES.sobrePrimaria }}
            />
          </Cartao>
        </Entrar>
      )}

      {erro && <Aviso texto={erro} />}
      <Botao titulo={novo ? 'Cadastrar' : 'Salvar'} onPress={salvar} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 20 },
  rotulo: { fontFamily: FONTE.media, fontSize: 14, color: CORES.textoSuave },
  permissao: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
