import type { CategoriaLancamento, FormaPagamento, TipoLancamento } from '@adegas/core';
import { CATEGORIAS_LANCAMENTO, FORMAS_PAGAMENTO, categoriaLancamento, paraCentavos, useAdega } from '@adegas/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Entrar } from '../components/animacoes';
import { Aviso, Botao, Campo, Cartao, Chip, Segmentado } from '../components/ui';
import { CORES, FONTE, TEXTO } from '../tema';

/** Despesa ou entrada lançada à mão: aluguel, luz, salário, outra entrada... */
export default function NovoLancamento() {
  const { registrarLancamento } = useAdega();
  const [tipo, setTipo] = useState<TipoLancamento>('despesa');
  const [cat, setCat] = useState<CategoriaLancamento>('aluguel');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [forma, setForma] = useState<FormaPagamento>('pix');
  const [erro, setErro] = useState<string | null>(null);

  const categorias = CATEGORIAS_LANCAMENTO.filter((c) => c.tipo === tipo && !c.automatica);

  function trocarTipo(novo: TipoLancamento) {
    setTipo(novo);
    setCat(CATEGORIAS_LANCAMENTO.find((c) => c.tipo === novo && !c.automatica)?.id ?? 'outras-despesas');
  }

  function salvar() {
    const r = registrarLancamento({ tipo, categoria: cat, descricao, valor: paraCentavos(valor) ?? 0, formaPagamento: forma });
    if (r.ok) router.back();
    else setErro(r.erro);
  }

  return (
    <ScrollView contentContainerStyle={estilos.tela} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Text style={TEXTO.legenda}>Vendas e compras de mercadoria entram sozinhas. Aqui vão as outras: aluguel, luz, salário…</Text>
      <Segmentado
        opcoes={[
          { id: 'despesa', rotulo: 'Saída' },
          { id: 'receita', rotulo: 'Entrada' },
        ]}
        valor={tipo}
        onChange={trocarTipo}
      />
      <Entrar key={tipo}>
        <Cartao>
          <Text style={estilos.rotulo}>Categoria</Text>
          <View style={estilos.chips}>
            {categorias.map((c) => (
              <Chip key={c.id} rotulo={c.nome} ativo={cat === c.id} onPress={() => setCat(c.id)} />
            ))}
          </View>
          <Campo rotulo="Descrição (opcional)" value={descricao} onChangeText={setDescricao} placeholder={categoriaLancamento(cat).nome} />
          <Campo rotulo="Valor" prefixo="R$" teclado="decimal-pad" value={valor} onChangeText={setValor} placeholder="0,00" />
          <Text style={estilos.rotulo}>{tipo === 'despesa' ? 'Pago com' : 'Recebido em'}</Text>
          <View style={estilos.chips}>
            {FORMAS_PAGAMENTO.map((f) => (
              <Chip key={f.id} rotulo={f.nome} ativo={forma === f.id} onPress={() => setForma(f.id)} />
            ))}
          </View>
        </Cartao>
      </Entrar>
      {erro && <Aviso texto={erro} />}
      <Botao titulo={tipo === 'despesa' ? 'Lançar saída' : 'Lançar entrada'} onPress={salvar} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48, gap: 16 },
  rotulo: { fontFamily: FONTE.media, fontSize: 14, color: CORES.textoSuave },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
