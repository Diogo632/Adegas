import type { FormaPagamento, Venda } from '@adegas/core';
import { faltaDinheiro, formaPagamento, formatarDinheiro, itensDoCarrinho, paraCentavos, totalCarrinho, useAdega } from '@adegas/core';
import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Entrar, NumeroAnimado } from '../components/animacoes';
import { CartaoDinheiro, Concluido, EscolhaForma } from '../components/pagamento';
import { Aviso, Botao, Cartao, Divisor } from '../components/ui';
import { CORES, FONTE, TEXTO } from '../tema';

export default function Pagamento() {
  const { estado, carrinho, finalizarVenda } = useAdega();
  const [forma, setForma] = useState<FormaPagamento | null>(null);
  const [recebidoTexto, setRecebidoTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [concluida, setConcluida] = useState<Venda | null>(null);
  const insets = useSafeAreaInsets();

  if (concluida) return <VendaConcluida venda={concluida} />;

  const itens = itensDoCarrinho(estado.produtos, carrinho);
  const total = totalCarrinho(estado.produtos, carrinho);
  const falta = faltaDinheiro(forma, paraCentavos(recebidoTexto), total);

  if (itens.length === 0) {
    return (
      <View style={estilos.centro}>
        <Text style={TEXTO.legenda}>O carrinho está vazio.</Text>
        <Botao titulo="Escolher produtos" variante="contorno" onPress={() => router.back()} />
      </View>
    );
  }

  function confirmar() {
    if (!forma) return;
    const resultado = finalizarVenda({ forma, valorRecebido: forma === 'dinheiro' ? paraCentavos(recebidoTexto) : undefined });
    if (resultado.ok) setConcluida(resultado.valor);
    else setErro(resultado.erro);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={estilos.tela} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Entrar style={estilos.total}>
          <Text style={TEXTO.legenda}>Total a receber</Text>
          <NumeroAnimado valor={total} formatar={formatarDinheiro} style={estilos.totalValor} />
        </Entrar>

        <Entrar atraso={80}>
          <Cartao style={{ gap: 12 }}>
            {itens.map((i, n) => (
              <Fragment key={i.produto.id}>
                {n > 0 && <Divisor />}
                <View style={estilos.item}>
                  <Text style={estilos.itemQtd}>{i.quantidade}×</Text>
                  <Text style={[TEXTO.corpo, { flex: 1, fontSize: 15 }]} numberOfLines={1}>
                    {i.produto.nome}
                  </Text>
                  <Text style={[TEXTO.valor, { fontSize: 15 }]}>{formatarDinheiro(i.subtotal)}</Text>
                </View>
              </Fragment>
            ))}
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
          titulo={forma ? `Confirmar ${formatarDinheiro(total)}` : 'Escolha a forma de pagamento'}
          desabilitado={!forma || falta}
          onPress={confirmar}
        />
      </View>
    </View>
  );
}

function VendaConcluida({ venda }: { venda: Venda }) {
  const forma = formaPagamento(venda.pagamentos[0].forma);
  return (
    <ScrollView contentContainerStyle={[estilos.tela, { paddingTop: 48 }]}>
      <Concluido
        titulo="Venda registrada"
        detalhe={`${formatarDinheiro(venda.total)} no ${forma.nome.toLowerCase()} · estoque e caixa atualizados`}
        troco={venda.troco}
      />
      <Entrar atraso={300} style={{ gap: 10, marginTop: 8 }}>
        <Botao titulo="Nova venda" onPress={() => router.back()} />
        <Botao titulo="Voltar ao início" variante="contorno" onPress={() => router.dismissAll()} />
      </Entrar>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 16 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  total: { alignItems: 'center', paddingVertical: 8, gap: 2 },
  totalValor: { fontFamily: FONTE.semi, fontSize: 44, color: CORES.texto, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemQtd: { fontFamily: FONTE.semi, fontSize: 15, color: CORES.textoSuave, minWidth: 28 },
  barra: {
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: CORES.superficie,
    borderTopWidth: 1,
    borderTopColor: CORES.borda,
  },
});
