import {
  formatarDinheiro,
  linhasDaComanda,
  nomeDaMesa,
  quantidadeNaComanda,
  tempoAberta,
  totalComanda,
  useAdega,
} from '@adegas/core';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Plus, ReceiptText } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Entrar, NumeroAnimado, Tocavel } from '../../../components/animacoes';
import { SeloMesa } from '../../../components/mesas';
import { estiloBarraRodape } from '../../../components/produtos';
import { Aviso, Botao, Cartao, Contador, Divisor, Secao } from '../../../components/ui';
import { CORES, FONTE, RAIO, TEXTO } from '../../../tema';

export default function ContaDaMesa() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { estado, lancarNaComanda, removerDaComanda, cancelarComanda } = useAdega();
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const insets = useSafeAreaInsets();
  const comanda = estado.comandas.find((c) => c.id === id);

  if (!comanda || comanda.situacao !== 'aberta') {
    return (
      <View style={estilos.centro}>
        <Stack.Screen options={{ title: 'Conta da mesa' }} />
        <Text style={TEXTO.legenda}>{comanda ? 'Esta conta já foi fechada.' : 'Conta não encontrada.'}</Text>
        <Botao titulo="Ver mesas" variante="contorno" onPress={() => router.replace('/mesas')} />
      </View>
    );
  }

  const nome = nomeDaMesa(comanda.mesa);
  const linhas = linhasDaComanda(comanda);
  const total = totalComanda(comanda);
  const itens = quantidadeNaComanda(comanda);

  function mudarQuantidade(produtoId: string, atual: number, nova: number) {
    const r = nova > atual ? lancarNaComanda(comanda!.id, [{ produtoId, quantidade: nova - atual }]) : removerDaComanda(comanda!.id, produtoId, atual - nova);
    setErro(r.ok ? null : r.erro);
  }

  function cancelar() {
    const r = cancelarComanda(comanda!.id);
    if (r.ok) router.back();
    else setErro(r.erro);
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: nome }} />
      <ScrollView contentContainerStyle={estilos.tela}>
        <Entrar style={estilos.topo}>
          <SeloMesa mesa={comanda.mesa} />
          <View style={{ flex: 1 }}>
            <Text style={TEXTO.titulo}>{nome}</Text>
            <Text style={TEXTO.legenda}>
              {itens} {itens === 1 ? 'item' : 'itens'} · aberta {tempoAberta(comanda)}
            </Text>
          </View>
        </Entrar>

        <Entrar atraso={80} style={{ gap: 14 }}>
          <Secao>Pedidos</Secao>
          {linhas.length === 0 ? (
            <Cartao>
              <Text style={TEXTO.legenda}>Nenhum pedido ainda. Toque em "Adicionar pedido" quando a mesa pedir.</Text>
            </Cartao>
          ) : (
            <Cartao style={{ paddingVertical: 6, gap: 0 }}>
              {linhas.map((l, i) => {
                const produto = estado.produtos.find((p) => p.id === l.produtoId);
                const naConta = quantidadeNaComanda(comanda, l.produtoId);
                return (
                  <Fragment key={`${l.produtoId}-${l.precoUnitario}`}>
                    {i > 0 && <Divisor />}
                    <View style={estilos.linha}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[TEXTO.corpoForte, { fontSize: 15 }]} numberOfLines={2}>
                          {l.produtoNome}
                        </Text>
                        <Text style={TEXTO.legenda}>
                          {formatarDinheiro(l.precoUnitario)} cada · <Text style={estilos.subtotal}>{formatarDinheiro(l.subtotal)}</Text>
                        </Text>
                      </View>
                      <Contador
                        compacto
                        valor={l.quantidade}
                        maximo={l.quantidade + Math.max(produto?.estoque ?? 0, 0)}
                        onChange={(v) => mudarQuantidade(l.produtoId, naConta, naConta - l.quantidade + v)}
                      />
                    </View>
                  </Fragment>
                );
              })}
            </Cartao>
          )}
          <Botao titulo="Adicionar pedido" icone={Plus} variante="contorno" onPress={() => router.push(`/mesa/${comanda.id}/adicionar`)} />
          {erro && <Aviso texto={erro} />}
        </Entrar>

        <Entrar atraso={160} style={{ gap: 12, marginTop: 8 }}>
          {confirmandoCancelar ? (
            <Cartao style={{ borderColor: CORES.despesa, gap: 12 }}>
              <Text style={TEXTO.corpoForte}>Cancelar a {nome}?</Text>
              <Text style={TEXTO.legenda}>
                {itens > 0 ? `Os ${itens} itens voltam para o estoque e nada entra no caixa.` : 'A mesa fica livre de novo.'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Tocavel accessibilityRole="button" onPress={cancelar} style={[estilos.acaoPequena, { borderColor: CORES.despesa }]}>
                  <Text style={[estilos.acaoTexto, { color: CORES.despesa }]}>Cancelar mesa</Text>
                </Tocavel>
                <Tocavel accessibilityRole="button" onPress={() => setConfirmandoCancelar(false)} style={estilos.acaoPequena}>
                  <Text style={estilos.acaoTexto}>Voltar</Text>
                </Tocavel>
              </View>
            </Cartao>
          ) : (
            <Text style={estilos.linkCancelar} onPress={() => setConfirmandoCancelar(true)}>
              Cancelar mesa
            </Text>
          )}
        </Entrar>
      </ScrollView>

      <View style={[estiloBarraRodape.barra, { paddingBottom: insets.bottom + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={TEXTO.legenda}>Total da mesa</Text>
          <NumeroAnimado valor={total} formatar={formatarDinheiro} style={estiloBarraRodape.total} />
        </View>
        <Botao
          titulo="Fechar conta"
          icone={ReceiptText}
          desabilitado={itens === 0}
          onPress={() => router.push(`/mesa/${comanda.id}/fechar`)}
          style={{ paddingHorizontal: 22 }}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 18 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  subtotal: { fontFamily: FONTE.semi, color: CORES.texto },
  linkCancelar: { fontFamily: FONTE.media, fontSize: 15, color: CORES.despesa, textAlign: 'center', paddingVertical: 8 },
  acaoPequena: {
    flex: 1,
    borderRadius: RAIO.medio,
    borderWidth: 1,
    borderColor: CORES.bordaForte,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acaoTexto: { fontFamily: FONTE.semi, fontSize: 15, color: CORES.texto },
});
