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
import { Check } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ICONE_FORMA } from '../components/icones';
import { Aviso, Botao, Campo, Cartao, Chip, Divisor, LinhaValor, Secao } from '../components/ui';
import { CORES, FONTE, RAIO, TEXTO } from '../tema';

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
        <Text style={TEXTO.legenda}>O carrinho está vazio.</Text>
        <Botao titulo="Escolher produtos" variante="contorno" onPress={() => router.back()} />
      </View>
    );
  }

  function confirmar() {
    if (!forma) return;
    const resultado = finalizarVenda({ forma, valorRecebido: forma === 'dinheiro' ? recebido : undefined });
    if (resultado.ok) setConcluida(resultado.valor);
    else setErro(resultado.erro);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={estilos.tela} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={estilos.total}>
          <Text style={TEXTO.legenda}>Total a receber</Text>
          <Text style={estilos.totalValor}>{formatarDinheiro(total)}</Text>
        </View>

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

        <Secao>Forma de pagamento</Secao>
        <View style={estilos.grade}>
          {FORMAS_PAGAMENTO.map((f) => {
            const ativo = forma === f.id;
            const Icone = ICONE_FORMA[f.id];
            return (
              <Pressable
                key={f.id}
                accessibilityRole="button"
                accessibilityState={{ selected: ativo }}
                onPress={() => {
                  setForma(f.id);
                  setErro(null);
                }}
                style={[estilos.forma, ativo && estilos.formaAtiva]}
              >
                <Icone size={24} color={ativo ? '#FFFFFF' : CORES.texto} strokeWidth={1.6} />
                <Text style={[estilos.formaNome, ativo && { color: '#FFFFFF' }]}>{f.nome}</Text>
                {ativo && (
                  <View style={estilos.formaCheck}>
                    <Check size={12} color={CORES.tinta} strokeWidth={3} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {forma && <Text style={[TEXTO.legenda, { textAlign: 'center' }]}>{formaPagamento(forma).dica}</Text>}

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
                  onPress={() => setRecebidoTexto(centavosParaTexto(v))}
                />
              ))}
            </View>
            <Divisor />
            {faltaDinheiro ? (
              <LinhaValor rotulo="Faltam" valor={formatarDinheiro(total - (recebido ?? 0))} destaque />
            ) : (
              <LinhaValor rotulo="Troco" valor={formatarDinheiro(recebido === null ? 0 : recebido - total)} destaque />
            )}
          </Cartao>
        )}

        {erro && <Aviso texto={erro} />}
      </ScrollView>

      <View style={[estilos.barra, { paddingBottom: insets.bottom + 12 }]}>
        <Botao
          titulo={forma ? `Confirmar ${formatarDinheiro(total)}` : 'Escolha a forma de pagamento'}
          desabilitado={!forma || faltaDinheiro}
          onPress={confirmar}
        />
      </View>
    </View>
  );
}

function VendaConcluida({ venda }: { venda: Venda }) {
  const forma = formaPagamento(venda.pagamentos[0].forma);
  const temTroco = venda.troco !== undefined && venda.troco > 0;
  return (
    <ScrollView contentContainerStyle={[estilos.tela, { paddingTop: 48 }]}>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <View style={estilos.selo}>
          <Check size={30} color="#FFFFFF" strokeWidth={2.5} />
        </View>
        <Text style={[TEXTO.tituloTela, { fontSize: 26, marginTop: 8 }]}>Venda registrada</Text>
        <Text style={TEXTO.legenda}>
          {formatarDinheiro(venda.total)} no {forma.nome.toLowerCase()} · estoque e caixa atualizados
        </Text>
      </View>
      {temTroco && (
        <View style={estilos.troco}>
          <Text style={estilos.trocoRotulo}>Devolver de troco</Text>
          <Text style={estilos.trocoValor}>{formatarDinheiro(venda.troco ?? 0)}</Text>
        </View>
      )}
      <View style={{ gap: 10, marginTop: 8 }}>
        <Botao titulo="Nova venda" onPress={() => router.back()} />
        <Botao titulo="Voltar ao início" variante="contorno" onPress={() => router.dismissAll()} />
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 16 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  total: { alignItems: 'center', paddingVertical: 8, gap: 2 },
  totalValor: { fontFamily: FONTE.semi, fontSize: 44, color: CORES.texto, letterSpacing: -1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemQtd: { fontFamily: FONTE.semi, fontSize: 15, color: CORES.textoSuave, minWidth: 28 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  forma: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: RAIO.medio,
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 10,
    backgroundColor: CORES.superficie,
  },
  formaAtiva: { backgroundColor: CORES.tinta, borderColor: CORES.tinta },
  formaNome: { fontFamily: FONTE.semi, fontSize: 16, color: CORES.texto },
  formaCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sugestoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  barra: {
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: CORES.superficie,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CORES.borda,
  },
  selo: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: CORES.receita,
    alignItems: 'center',
    justifyContent: 'center',
  },
  troco: {
    backgroundColor: CORES.tinta,
    borderRadius: RAIO.grande,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 4,
  },
  trocoRotulo: { fontFamily: FONTE.media, fontSize: 14, color: CORES.tintaTexto },
  trocoValor: { fontFamily: FONTE.semi, fontSize: 40, color: '#FFFFFF', letterSpacing: -1 },
});
