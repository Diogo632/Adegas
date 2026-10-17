import type { Centavos, FormaPagamento } from '@adegas/core';
import { FORMAS_PAGAMENTO, centavosParaTexto, faltaDinheiro, formaPagamento, formatarDinheiro, paraCentavos, sugestoesDeValorRecebido } from '@adegas/core';
import { Check } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { CORES, FONTE, RAIO, TEXTO } from '../tema';
import { Entrar, NumeroAnimado, Surgir, Tocavel } from './animacoes';
import { ICONE_FORMA } from './icones';
import { Campo, Cartao, Chip, Divisor, LinhaValor, Secao, estiloValorDestaque } from './ui';

/** Pix, Crédito, Débito e Dinheiro em quatro botões grandes. Usado na venda e no fechamento da mesa. */
export function EscolhaForma({ forma, onEscolher }: { forma: FormaPagamento | null; onEscolher: (forma: FormaPagamento) => void }) {
  return (
    <View style={{ gap: 16 }}>
      <Secao>Forma de pagamento</Secao>
      <View style={estilos.grade}>
        {FORMAS_PAGAMENTO.map((f) => {
          const ativo = forma === f.id;
          const Icone = ICONE_FORMA[f.id];
          return (
            <Tocavel
              key={f.id}
              accessibilityRole="button"
              accessibilityState={{ selected: ativo }}
              onPress={() => onEscolher(f.id)}
              escala={0.95}
              style={[estilos.forma, ativo && estilos.formaAtiva]}
            >
              <Icone size={24} color={ativo ? '#FFFFFF' : CORES.primariaClara} strokeWidth={1.6} />
              <Text style={[estilos.formaNome, ativo && { color: '#FFFFFF' }]}>{f.nome}</Text>
              {ativo && (
                <Surgir style={estilos.formaCheck}>
                  <Check size={12} color={CORES.primaria} strokeWidth={3} />
                </Surgir>
              )}
            </Tocavel>
          );
        })}
      </View>
      {forma && <Text style={[TEXTO.legenda, { textAlign: 'center' }]}>{formaPagamento(forma).dica}</Text>}
    </View>
  );
}

/** Quanto o cliente entregou em dinheiro, com atalhos de notas e o troco. */
export function CartaoDinheiro({
  total,
  recebidoTexto,
  onRecebido,
}: {
  total: Centavos;
  recebidoTexto: string;
  onRecebido: (texto: string) => void;
}) {
  const recebido = paraCentavos(recebidoTexto);
  const falta = faltaDinheiro('dinheiro', recebido, total);
  return (
    <Entrar>
      <Cartao>
        <Campo
          rotulo="Valor recebido"
          prefixo="R$"
          teclado="decimal-pad"
          value={recebidoTexto}
          onChangeText={onRecebido}
          placeholder={centavosParaTexto(total)}
        />
        <View style={estilos.sugestoes}>
          {sugestoesDeValorRecebido(total).map((v) => (
            <Chip
              key={v}
              rotulo={v === total ? 'Valor exato' : formatarDinheiro(v)}
              ativo={recebido === v}
              onPress={() => onRecebido(centavosParaTexto(v))}
            />
          ))}
        </View>
        <Divisor />
        {falta ? (
          <LinhaValor rotulo="Faltam" valor={formatarDinheiro(total - (recebido ?? 0))} destaque />
        ) : (
          <LinhaValor
            rotulo="Troco"
            valor={
              <NumeroAnimado
                valor={recebido === null ? 0 : recebido - total}
                formatar={formatarDinheiro}
                style={[estiloValorDestaque, { color: CORES.receita }]}
              />
            }
            destaque
          />
        )}
      </Cartao>
    </Entrar>
  );
}

/** Tela de "pronto": selo verde, o que aconteceu e o troco em destaque. */
export function Concluido({ titulo, detalhe, troco }: { titulo: string; detalhe: string; troco?: Centavos }) {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Surgir style={estilos.selo}>
          <Check size={30} color={CORES.fundo} strokeWidth={3} />
        </Surgir>
        <Entrar atraso={120} style={{ alignItems: 'center', gap: 10 }}>
          <Text style={[TEXTO.tituloTela, { fontSize: 26, marginTop: 8, textAlign: 'center' }]}>{titulo}</Text>
          <Text style={[TEXTO.legenda, { textAlign: 'center' }]}>{detalhe}</Text>
        </Entrar>
      </View>
      {troco !== undefined && troco > 0 && (
        <Entrar atraso={220} style={estilos.troco}>
          <Text style={estilos.trocoRotulo}>Devolver de troco</Text>
          <NumeroAnimado valor={troco} formatar={formatarDinheiro} style={estilos.trocoValor} />
        </Entrar>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
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
  formaAtiva: { backgroundColor: CORES.primaria, borderColor: CORES.primariaClara },
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
  selo: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: CORES.receita,
    alignItems: 'center',
    justifyContent: 'center',
  },
  troco: {
    backgroundColor: CORES.destaqueFundo,
    borderWidth: 1,
    borderColor: CORES.destaqueBorda,
    borderRadius: RAIO.grande,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 4,
  },
  trocoRotulo: { fontFamily: FONTE.media, fontSize: 14, color: CORES.primariaClara },
  trocoValor: { fontFamily: FONTE.semi, fontSize: 40, color: '#FFFFFF', letterSpacing: -1, fontVariant: ['tabular-nums'] },
});
