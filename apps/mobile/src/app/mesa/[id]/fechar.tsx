import type { FormaPagamento, Venda } from '@adegas/core';
import {
  faltaDinheiro,
  formaPagamento,
  formatarDinheiro,
  linhasDaComanda,
  nomeDaMesa,
  paraCentavos,
  quantidadeNaComanda,
  totalComanda,
  useAdega,
  valorPorPessoa,
} from '@adegas/core';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Users } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Entrar, NumeroAnimado } from '../../../components/animacoes';
import { CartaoDinheiro, Concluido, EscolhaForma } from '../../../components/pagamento';
import { Aviso, Botao, Cartao, Contador, Divisor } from '../../../components/ui';
import { CORES, FONTE, TEXTO } from '../../../tema';

/** Fecha a conta da mesa: total, divisão por pessoa, forma de pagamento e troco. */
export default function FecharConta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { estado, fecharComanda } = useAdega();
  const [forma, setForma] = useState<FormaPagamento | null>(null);
  const [recebidoTexto, setRecebidoTexto] = useState('');
  const [pessoas, setPessoas] = useState(1);
  const [erro, setErro] = useState<string | null>(null);
  const [fechada, setFechada] = useState<{ venda: Venda; mesa: string } | null>(null);
  const insets = useSafeAreaInsets();
  const comanda = estado.comandas.find((c) => c.id === id);

  if (fechada) {
    const nome = nomeDaMesa(fechada.mesa);
    return (
      <ScrollView contentContainerStyle={[estilos.tela, { paddingTop: 48 }]}>
        <Stack.Screen options={{ title: 'Conta fechada' }} />
        <Concluido
          titulo={`${nome} fechada`}
          detalhe={`${formatarDinheiro(fechada.venda.total)} no ${formaPagamento(fechada.venda.pagamentos[0].forma).nome.toLowerCase()} · entrou no caixa`}
          troco={fechada.venda.troco}
        />
        <Entrar atraso={300} style={{ gap: 10, marginTop: 8 }}>
          <Botao
            titulo="Ver mesas"
            onPress={() => {
              router.dismissAll();
              router.push('/mesas');
            }}
          />
          <Botao titulo="Voltar ao início" variante="contorno" onPress={() => router.dismissAll()} />
        </Entrar>
      </ScrollView>
    );
  }

  if (!comanda || comanda.situacao !== 'aberta') {
    return (
      <View style={estilos.centro}>
        <Text style={TEXTO.legenda}>Conta não encontrada ou já fechada.</Text>
        <Botao titulo="Ver mesas" variante="contorno" onPress={() => router.replace('/mesas')} />
      </View>
    );
  }

  const nome = nomeDaMesa(comanda.mesa);
  const total = totalComanda(comanda);
  const falta = faltaDinheiro(forma, paraCentavos(recebidoTexto), total);

  function confirmar() {
    if (!forma || !comanda) return;
    const r = fecharComanda(comanda.id, { forma, valorRecebido: forma === 'dinheiro' ? paraCentavos(recebidoTexto) : undefined });
    if (r.ok) setFechada({ venda: r.valor, mesa: comanda.mesa });
    else setErro(r.erro);
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: `Fechar ${nome}` }} />
      <ScrollView contentContainerStyle={estilos.tela} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Entrar style={estilos.total}>
          <Text style={TEXTO.legenda}>
            Total da {nome} · {quantidadeNaComanda(comanda)} itens
          </Text>
          <NumeroAnimado valor={total} formatar={formatarDinheiro} style={estilos.totalValor} />
        </Entrar>

        <Entrar atraso={80}>
          <Cartao style={{ gap: 12 }}>
            {linhasDaComanda(comanda).map((l, n) => (
              <Fragment key={`${l.produtoId}-${l.precoUnitario}`}>
                {n > 0 && <Divisor />}
                <View style={estilos.item}>
                  <Text style={estilos.itemQtd}>{l.quantidade}×</Text>
                  <Text style={[TEXTO.corpo, { flex: 1, fontSize: 15 }]} numberOfLines={1}>
                    {l.produtoNome}
                  </Text>
                  <Text style={[TEXTO.valor, { fontSize: 15 }]}>{formatarDinheiro(l.subtotal)}</Text>
                </View>
              </Fragment>
            ))}
          </Cartao>
        </Entrar>

        <Entrar atraso={120}>
          <Cartao style={estilos.dividir}>
            <Users size={20} color={CORES.primariaClara} strokeWidth={1.75} />
            <View style={{ flex: 1 }}>
              <Text style={TEXTO.corpoForte}>Dividir a conta</Text>
              <Text style={TEXTO.legenda}>
                {pessoas > 1 ? `${formatarDinheiro(valorPorPessoa(total, pessoas))} por pessoa` : 'Uma pessoa paga tudo'}
              </Text>
            </View>
            <Contador compacto valor={pessoas} minimo={1} maximo={30} onChange={setPessoas} />
          </Cartao>
        </Entrar>

        <Entrar atraso={160}>
          <EscolhaForma
            forma={forma}
            onEscolher={(f) => {
              setForma(f);
              setErro(null);
            }}
          />
        </Entrar>

        {forma === 'dinheiro' && <CartaoDinheiro total={total} recebidoTexto={recebidoTexto} onRecebido={setRecebidoTexto} />}

        {erro && <Aviso texto={erro} />}
      </ScrollView>

      <View style={[estilos.barra, { paddingBottom: insets.bottom + 12 }]}>
        <Botao
          titulo={forma ? `Fechar conta · ${formatarDinheiro(total)}` : 'Escolha a forma de pagamento'}
          desabilitado={!forma || falta}
          onPress={confirmar}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 16 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  total: { alignItems: 'center', paddingVertical: 8, gap: 2 },
  totalValor: { fontFamily: FONTE.semi, fontSize: 44, color: CORES.texto, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemQtd: { fontFamily: FONTE.semi, fontSize: 15, color: CORES.textoSuave, minWidth: 28 },
  dividir: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  barra: {
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: CORES.superficie,
    borderTopWidth: 1,
    borderTopColor: CORES.borda,
  },
});
