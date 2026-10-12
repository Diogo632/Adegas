import type { FormaPagamento, Venda } from '@adegas/core';
import {
  FORMAS_PAGAMENTO,
  centavosParaTexto,
  formaPagamento,
  formatarDinheiro,
  itensDoCarrinho,
  paraCentavos,
  sugestoesDeValorRecebido,
  totalCarrinho,
  useAdega,
} from '@adegas/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aviso, Botao, CORES, Campo, Cartao, Chip, LinhaValor, TituloSecao } from '../components/ui';

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
  const recebido = paraCentavos(recebidoTexto);
  const faltaDinheiro = forma === 'dinheiro' && recebido !== null && recebido < total;

  if (itens.length === 0) {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.vazio}>O carrinho está vazio.</Text>
        <Botao titulo="Escolher produtos" onPress={() => router.back()} />
      </View>
    );
  }

  function confirmar() {
    if (!forma) return;
    const resultado = finalizarVenda({
      forma,
      valorRecebido: forma === 'dinheiro' ? recebido : undefined,
    });
    if (resultado.ok) setConcluida(resultado.valor);
    else setErro(resultado.erro);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={estilos.tela}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Cartao>
          <TituloSecao>Resumo do pedido</TituloSecao>
          {itens.map((i) => (
            <View key={i.produto.id} style={estilos.item}>
              <Text style={estilos.itemQtd}>{i.quantidade}x</Text>
              <Text style={estilos.itemNome} numberOfLines={1}>
                {i.produto.nome}
              </Text>
              <Text style={estilos.itemValor}>{formatarDinheiro(i.subtotal)}</Text>
            </View>
          ))}
          <View style={estilos.divisor} />
          <View style={estilos.item}>
            <Text style={estilos.totalRotulo}>Total</Text>
            <Text style={estilos.totalValor}>{formatarDinheiro(total)}</Text>
          </View>
        </Cartao>

        <TituloSecao>Como o cliente vai pagar?</TituloSecao>
        <View style={estilos.grade}>
          {FORMAS_PAGAMENTO.map((f) => {
            const ativo = forma === f.id;
            return (
              <Pressable
                key={f.id}
                accessibilityRole="button"
                accessibilityState={{ selected: ativo }}
                onPress={() => {
                  setForma(f.id);
                  setErro(null);
                }}
                style={[estilos.forma, { borderColor: f.cor }, ativo && { backgroundColor: f.cor }]}
              >
                <Text style={estilos.formaIcone}>{f.icone}</Text>
                <Text style={[estilos.formaNome, { color: ativo ? '#fff' : f.cor }]}>{f.nome}</Text>
              </Pressable>
            );
          })}
        </View>

        {forma && <Text style={estilos.dica}>{formaPagamento(forma).dica}</Text>}

        {forma === 'dinheiro' && (
          <Cartao>
            <Campo
              rotulo="Valor recebido"
              prefixo="R$"
              teclado="decimal-pad"
              value={recebidoTexto}
              onChangeText={setRecebidoTexto}
              placeholder={centavosParaTexto(total)}
            />
            <View style={estilos.sugestoes}>
              {sugestoesDeValorRecebido(total).map((v) => (
                <Chip
                  key={v}
                  rotulo={v === total ? 'Valor exato' : formatarDinheiro(v)}
                  ativo={recebido === v}
                  cor={formaPagamento('dinheiro').cor}
                  onPress={() => setRecebidoTexto(centavosParaTexto(v))}
                />
              ))}
            </View>
            {faltaDinheiro ? (
              <LinhaValor rotulo="Faltam" valor={formatarDinheiro(total - (recebido ?? 0))} destaque />
            ) : (
              <View style={estilos.troco}>
                <Text style={estilos.trocoRotulo}>Troco</Text>
                <Text style={estilos.trocoValor}>{formatarDinheiro(recebido === null ? 0 : recebido - total)}</Text>
              </View>
            )}
          </Cartao>
        )}

        {erro && <Aviso tipo="erro" texto={erro} />}
      </ScrollView>

      <View style={[estilos.barra, { paddingBottom: insets.bottom + 12 }]}>
        <Botao
          titulo={forma ? `Confirmar · ${formatarDinheiro(total)}` : 'Escolha a forma de pagamento'}
          desabilitado={!forma || faltaDinheiro}
          onPress={confirmar}
        />
      </View>
    </View>
  );
}

function VendaConcluida({ venda }: { venda: Venda }) {
  const forma = formaPagamento(venda.pagamentos[0].forma);
  return (
    <ScrollView contentContainerStyle={[estilos.tela, { alignItems: 'stretch', paddingTop: 40 }]}>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 64 }}>✅</Text>
        <Text style={estilos.sucessoTitulo}>Venda registrada!</Text>
        <Text style={estilos.sucessoValor}>{formatarDinheiro(venda.total)}</Text>
        <Text style={estilos.dica}>
          {forma.icone} {forma.nome} · estoque e caixa já atualizados
        </Text>
      </View>
      {venda.troco !== undefined && venda.troco > 0 && (
        <View style={[estilos.troco, { paddingVertical: 20 }]}>
          <Text style={estilos.trocoRotulo}>Devolver de troco</Text>
          <Text style={[estilos.trocoValor, { fontSize: 34 }]}>{formatarDinheiro(venda.troco)}</Text>
        </View>
      )}
      <Botao titulo="Nova venda" onPress={() => router.back()} />
      <Botao titulo="Voltar ao início" variante="contorno" onPress={() => router.dismissAll()} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { padding: 16, gap: 16, paddingBottom: 32 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  vazio: { fontSize: 17, color: CORES.textoSuave },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemQtd: { fontSize: 15, fontWeight: '700', color: CORES.primaria, minWidth: 30 },
  itemNome: { flex: 1, fontSize: 15, color: CORES.texto },
  itemValor: { fontSize: 15, fontWeight: '600', color: CORES.texto },
  divisor: { height: 1, backgroundColor: CORES.borda },
  totalRotulo: { flex: 1, fontSize: 18, fontWeight: '700', color: CORES.texto },
  totalValor: { fontSize: 26, fontWeight: '800', color: CORES.texto },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  forma: {
    flexBasis: '46%',
    flexGrow: 1,
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 4,
    backgroundColor: CORES.superficie,
  },
  formaIcone: { fontSize: 28 },
  formaNome: { fontSize: 18, fontWeight: '800' },
  dica: { fontSize: 15, color: CORES.textoSuave, textAlign: 'center' },
  sugestoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  troco: { backgroundColor: '#E8F5EA', borderRadius: 12, padding: 14, alignItems: 'center' },
  trocoRotulo: { fontSize: 15, color: CORES.receita, fontWeight: '600' },
  trocoValor: { fontSize: 28, fontWeight: '800', color: CORES.receita },
  barra: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: CORES.superficie,
    borderTopWidth: 1,
    borderTopColor: CORES.borda,
  },
  sucessoTitulo: { fontSize: 24, fontWeight: '800', color: CORES.texto },
  sucessoValor: { fontSize: 36, fontWeight: '800', color: CORES.primaria },
});
