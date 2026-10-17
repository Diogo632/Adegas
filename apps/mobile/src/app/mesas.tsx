import {
  comandasAbertas,
  comandasFechadasNoDia,
  formaPagamento,
  formatarDataHora,
  formatarDinheiro,
  nomeDaMesa,
  resumoMesas,
  totalComanda,
  useAdega,
} from '@adegas/core';
import { router } from 'expo-router';
import { Armchair } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Entrar, NumeroAnimado, Tocavel } from '../components/animacoes';
import { LinhaMesa } from '../components/mesas';
import { Aviso, Botao, Campo, Cartao, Divisor, Secao } from '../components/ui';
import { CORES, FONTE, RAIO, TEXTO } from '../tema';

/** Quantas mesas numeradas aparecem na grade (cresce se uma mesa maior for aberta). */
const MESAS_NA_GRADE = 12;

export default function Mesas() {
  const { estado, abrirComanda } = useAdega();
  const [outra, setOutra] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const agora = new Date();

  const abertas = comandasAbertas(estado);
  const porMesa = new Map(abertas.map((c) => [c.mesa, c]));
  const maiorAberta = Math.max(0, ...abertas.filter((c) => /^\d+$/.test(c.mesa)).map((c) => Number(c.mesa)));
  const numeros = Array.from({ length: Math.max(MESAS_NA_GRADE, maiorAberta) }, (_, i) => String(i + 1));
  const comNome = abertas.filter((c) => !/^\d+$/.test(c.mesa));
  const fechadas = comandasFechadasNoDia(estado, agora);
  const resumo = resumoMesas(estado);

  function abrir(mesa: string) {
    const existente = porMesa.get(mesa);
    if (existente) return router.push(`/mesa/${existente.id}`);
    const r = abrirComanda(mesa);
    if (!r.ok) return setErro(r.erro);
    setErro(null);
    setOutra('');
    router.push(`/mesa/${r.valor.id}`);
  }

  return (
    <ScrollView contentContainerStyle={estilos.tela} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Entrar style={estilos.resumo}>
        <View style={{ flex: 1 }}>
          <Text style={estilos.resumoRotulo}>Em aberto nas mesas</Text>
          <NumeroAnimado valor={resumo.emAberto} formatar={formatarDinheiro} style={estilos.resumoValor} />
        </View>
        <Text style={TEXTO.legenda}>
          {resumo.abertas} {resumo.abertas === 1 ? 'mesa' : 'mesas'} · {resumo.itens} itens
        </Text>
      </Entrar>

      <Entrar atraso={80} style={{ gap: 14 }}>
        <Secao>Toque numa mesa</Secao>
        <View style={estilos.grade}>
          {numeros.map((n) => {
            const conta = porMesa.get(n);
            return (
              <Tocavel
                key={n}
                accessibilityRole="button"
                accessibilityLabel={conta ? `Mesa ${n}, ${formatarDinheiro(totalComanda(conta))}` : `Abrir mesa ${n}`}
                onPress={() => abrir(n)}
                escala={0.94}
                style={[estilos.mesa, conta && estilos.mesaOcupada]}
              >
                <Text style={[estilos.mesaNumero, conta && { color: '#FFFFFF' }]}>{n}</Text>
                <Text style={[estilos.mesaInfo, conta && { color: CORES.primariaClara }]} numberOfLines={1}>
                  {conta ? formatarDinheiro(totalComanda(conta)) : 'livre'}
                </Text>
              </Tocavel>
            );
          })}
        </View>
      </Entrar>

      <Entrar atraso={160} style={{ gap: 12 }}>
        <Secao>Outra mesa ou nome</Secao>
        <Campo icone={Armchair} value={outra} onChangeText={setOutra} placeholder="Ex.: 15, Balcão, João" />
        <Botao titulo="Abrir conta" variante="contorno" desabilitado={!outra.trim()} onPress={() => abrir(outra)} />
        {erro && <Aviso texto={erro} />}
      </Entrar>

      {comNome.length > 0 && (
        <Entrar atraso={200} style={{ gap: 12 }}>
          <Secao>Outras contas abertas</Secao>
          <Cartao style={{ paddingVertical: 4, gap: 0 }}>
            {comNome.map((c, i) => (
              <Fragment key={c.id}>
                {i > 0 && <Divisor />}
                <LinhaMesa comanda={c} agora={agora} />
              </Fragment>
            ))}
          </Cartao>
        </Entrar>
      )}

      {fechadas.length > 0 && (
        <Entrar atraso={240} style={{ gap: 12 }}>
          <Secao>Fechadas hoje</Secao>
          <Cartao style={{ paddingVertical: 4, gap: 0 }}>
            {fechadas.map((c, i) => {
              const venda = estado.vendas.find((v) => v.id === c.vendaId);
              return (
                <Fragment key={c.id}>
                  {i > 0 && <Divisor />}
                  <View style={estilos.linha}>
                    <View style={{ flex: 1 }}>
                      <Text style={TEXTO.corpoForte}>{nomeDaMesa(c.mesa)}</Text>
                      <Text style={TEXTO.legenda}>
                        {formatarDataHora(c.fechadaEm ?? c.abertaEm, agora)}
                        {venda ? ` · ${formaPagamento(venda.pagamentos[0].forma).nome}` : ''}
                      </Text>
                    </View>
                    <Text style={TEXTO.valor}>{formatarDinheiro(totalComanda(c))}</Text>
                  </View>
                </Fragment>
              );
            })}
          </Cartao>
        </Entrar>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, gap: 20 },
  resumo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    backgroundColor: CORES.destaqueFundo,
    borderRadius: RAIO.grande,
    borderWidth: 1,
    borderColor: CORES.destaqueBorda,
    padding: 20,
  },
  resumoRotulo: { fontFamily: FONTE.media, fontSize: 14, color: CORES.primariaClara },
  resumoValor: { fontFamily: FONTE.semi, fontSize: 34, color: '#FFFFFF', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mesa: {
    width: '22.6%',
    aspectRatio: 1,
    borderRadius: RAIO.medio,
    borderWidth: 1,
    borderColor: CORES.borda,
    backgroundColor: CORES.superficie,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    padding: 4,
  },
  mesaOcupada: { backgroundColor: CORES.primariaSuave, borderColor: CORES.primaria },
  mesaNumero: { fontFamily: FONTE.semi, fontSize: 24, color: CORES.texto, fontVariant: ['tabular-nums'] },
  mesaInfo: { fontFamily: FONTE.media, fontSize: 11.5, color: CORES.textoFraco, fontVariant: ['tabular-nums'] },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
