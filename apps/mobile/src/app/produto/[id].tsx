import type { CategoriaId, MotivoAjuste, Produto } from '@adegas/core';
import {
  CATEGORIAS,
  MOTIVOS_AJUSTE,
  categoria,
  centavosParaTexto,
  formatarDataHora,
  formatarDinheiro,
  margem,
  motivoAjuste,
  movimentosDoProduto,
  paraCentavos,
  statusEstoque,
  useAdega,
} from '@adegas/core';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { PackagePlus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Fragment, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Entrar, NumeroAnimado } from '../../components/animacoes';
import { ICONE_CATEGORIA } from '../../components/icones';
import {
  Aviso,
  Botao,
  Campo,
  Cartao,
  Chip,
  Contador,
  Divisor,
  IconeQuadrado,
  Pilula,
  Segmentado,
} from '../../components/ui';
import { CORES, FONTE, RAIO, TEXTO } from '../../tema';

type Aba = 'historico' | 'ajustar' | 'editar';

export default function TelaProduto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { estado } = useAdega();
  const produto = estado.produtos.find((p) => p.id === id);
  const [aba, setAba] = useState<Aba>('historico');
  const [aviso, setAviso] = useState<{ chave: number; texto: string } | null>(null);
  const rolagem = useRef<ScrollView>(null);

  if (!produto) {
    return (
      <View style={estilos.centro}>
        <Stack.Screen options={{ title: 'Produto' }} />
        <Text style={TEXTO.legenda}>Produto não encontrado.</Text>
      </View>
    );
  }

  const avisar = (texto: string) => {
    setAviso({ chave: Date.now(), texto });
    setAba('historico');
    rolagem.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <ScrollView ref={rolagem} contentContainerStyle={estilos.tela} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Stack.Screen options={{ title: 'Produto' }} />

      <Entrar style={estilos.topo}>
        <IconeQuadrado icone={ICONE_CATEGORIA[produto.categoria]} tamanho={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={TEXTO.titulo}>{produto.nome}</Text>
          <Text style={TEXTO.legenda}>{categoria(produto.categoria).nome}</Text>
        </View>
        <Pilula situacao={statusEstoque(produto)} />
      </Entrar>

      <Entrar atraso={60} style={estilos.numeros}>
        <Numero rotulo="Em estoque" valor={<NumeroAnimado valor={produto.estoque} formatar={(v) => `${v} un`} style={estilos.numeroValor} />} />
        <Numero rotulo="Mínimo" valor={`${produto.estoqueMinimo} un`} />
        <Numero rotulo="Custo médio" valor={formatarDinheiro(produto.custoMedio)} />
        <Numero rotulo="Preço · margem" valor={`${formatarDinheiro(produto.precoVenda)} · ${margem(produto.precoVenda, produto.custoMedio)}%`} />
      </Entrar>

      {aviso && (
        <Entrar key={aviso.chave}>
          <Aviso tipo="sucesso" texto={aviso.texto} />
        </Entrar>
      )}

      <Segmentado
        opcoes={[
          { id: 'historico', rotulo: 'Histórico' },
          { id: 'ajustar', rotulo: 'Ajustar' },
          { id: 'editar', rotulo: 'Editar' },
        ]}
        valor={aba}
        onChange={setAba}
      />

      {aba === 'historico' && <Historico produtoId={produto.id} />}
      {aba === 'ajustar' && <FormAjuste key={`a-${produto.estoque}`} produto={produto} onFeito={avisar} />}
      {aba === 'editar' && <FormEdicao produto={produto} onFeito={avisar} />}

      <Botao
        titulo="Registrar entrada deste produto"
        icone={PackagePlus}
        variante="contorno"
        onPress={() => router.push({ pathname: '/entrada', params: { produtoId: produto.id } })}
      />
    </ScrollView>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <View style={estilos.numero}>
      <Text style={estilos.numeroRotulo}>{rotulo}</Text>
      {typeof valor === 'string' ? <Text style={estilos.numeroValor}>{valor}</Text> : valor}
    </View>
  );
}

function Historico({ produtoId }: { produtoId: string }) {
  const { estado } = useAdega();
  const movimentos = movimentosDoProduto(estado, produtoId, 20);
  if (movimentos.length === 0) return <Text style={TEXTO.legenda}>Nenhuma movimentação ainda.</Text>;
  return (
    <Cartao style={{ paddingVertical: 4, gap: 0 }}>
      {movimentos.map((m, i) => (
        <Fragment key={m.id}>
          {i > 0 && <Divisor />}
          <View style={estilos.movimento}>
            <View style={{ flex: 1 }}>
              <Text style={[TEXTO.corpo, { fontSize: 15 }]} numberOfLines={1}>
                {m.descricao}
              </Text>
              <Text style={TEXTO.legenda}>{formatarDataHora(m.data)}</Text>
            </View>
            <Text style={[TEXTO.valor, { color: m.quantidade > 0 ? CORES.receita : CORES.despesa }]}>
              {m.quantidade > 0 ? '+' : '−'}
              {Math.abs(m.quantidade)} un
            </Text>
          </View>
        </Fragment>
      ))}
    </Cartao>
  );
}

function FormAjuste({ produto, onFeito }: { produto: Produto; onFeito: (texto: string) => void }) {
  const { ajustarEstoque } = useAdega();
  const [motivo, setMotivo] = useState<MotivoAjuste>('perda');
  const [quantidade, setQuantidade] = useState(1);
  const [contada, setContada] = useState(String(produto.estoque));
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const contagem = motivo === 'contagem';
  const qtd = contagem ? Number.parseInt(contada, 10) : quantidade;
  const depois = contagem ? qtd : produto.estoque - quantidade;

  function salvar() {
    const r = ajustarEstoque({ produtoId: produto.id, motivo, quantidade: Number.isNaN(qtd) ? -1 : qtd, observacao });
    if (r.ok) onFeito(`Estoque ajustado: ${r.valor.quantidadeAntes} → ${r.valor.quantidadeDepois} un`);
    else setErro(r.erro);
  }

  return (
    <Entrar>
      <Cartao>
        <View style={estilos.chips}>
          {MOTIVOS_AJUSTE.map((m) => (
            <Chip key={m.id} rotulo={m.nome} ativo={motivo === m.id} onPress={() => setMotivo(m.id)} />
          ))}
        </View>
        <Text style={TEXTO.legenda}>{motivoAjuste(motivo).dica}</Text>
        {contagem ? (
          <Campo rotulo="Quantas unidades você contou?" teclado="number-pad" value={contada} onChangeText={setContada} />
        ) : (
          <View style={estilos.linhaContador}>
            <Text style={[TEXTO.legenda, { flex: 1 }]}>Quantas unidades saíram?</Text>
            <Contador valor={quantidade} minimo={1} maximo={Math.max(produto.estoque, 1)} onChange={setQuantidade} />
          </View>
        )}
        <Campo rotulo="Observação (opcional)" value={observacao} onChangeText={setObservacao} placeholder="Ex.: caixa caiu no chão" />
        <View style={estilos.previa}>
          <Text style={TEXTO.legenda}>
            Estoque: {produto.estoque} →{' '}
            <Text style={{ color: CORES.texto, fontFamily: FONTE.semi }}>{Number.isNaN(depois) ? '?' : depois} un</Text>
          </Text>
          {!contagem && (
            <Text style={[TEXTO.legenda, { color: CORES.despesa }]}>
              Perda de {formatarDinheiro(quantidade * produto.custoMedio)}
            </Text>
          )}
        </View>
        {erro && <Aviso texto={erro} />}
        <Botao titulo="Salvar ajuste" onPress={salvar} />
      </Cartao>
    </Entrar>
  );
}

function FormEdicao({ produto, onFeito }: { produto: Produto; onFeito: (texto: string) => void }) {
  const { editarProduto } = useAdega();
  const [nome, setNome] = useState(produto.nome);
  const [cat, setCat] = useState<CategoriaId>(produto.categoria);
  const [preco, setPreco] = useState(centavosParaTexto(produto.precoVenda));
  const [minimo, setMinimo] = useState(String(produto.estoqueMinimo));
  const [erro, setErro] = useState<string | null>(null);
  const precoNovo = paraCentavos(preco);

  function salvar() {
    const r = editarProduto(produto.id, {
      nome,
      categoria: cat,
      precoVenda: precoNovo ?? 0,
      estoqueMinimo: Number.parseInt(minimo, 10),
    });
    if (r.ok) onFeito('Produto atualizado');
    else setErro(r.erro);
  }

  return (
    <Entrar>
      <Cartao>
        <Campo rotulo="Nome" value={nome} onChangeText={setNome} />
        <Text style={estilos.rotulo}>Categoria</Text>
        <View style={estilos.chips}>
          {CATEGORIAS.map((c) => (
            <Chip key={c.id} rotulo={c.nome} ativo={cat === c.id} onPress={() => setCat(c.id)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Campo rotulo="Preço de venda" prefixo="R$" teclado="decimal-pad" value={preco} onChangeText={setPreco} />
          </View>
          <View style={{ flex: 1 }}>
            <Campo rotulo="Avisar abaixo de" teclado="number-pad" value={minimo} onChangeText={setMinimo} />
          </View>
        </View>
        {precoNovo ? (
          <Text style={TEXTO.legenda}>
            Margem com o custo atual:{' '}
            <Text style={{ color: CORES.texto, fontFamily: FONTE.semi }}>{margem(precoNovo, produto.custoMedio)}%</Text>
          </Text>
        ) : null}
        {erro && <Aviso texto={erro} />}
        <Botao titulo="Salvar alterações" onPress={salvar} />
      </Cartao>
    </Entrar>
  );
}

const estilos = StyleSheet.create({
  tela: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48, gap: 16 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  numeros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: RAIO.medio,
    borderWidth: 1,
    borderColor: CORES.borda,
    overflow: 'hidden',
    backgroundColor: CORES.borda,
    gap: 1,
  },
  numero: { flexGrow: 1, flexBasis: '45%', padding: 12, backgroundColor: CORES.superficie, gap: 2 },
  numeroRotulo: { fontFamily: FONTE.regular, fontSize: 12, color: CORES.textoSuave },
  numeroValor: { fontFamily: FONTE.semi, fontSize: 16, color: CORES.texto, fontVariant: ['tabular-nums'] },
  movimento: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  linhaContador: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  previa: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    padding: 12,
    borderRadius: RAIO.pequeno,
    backgroundColor: CORES.superficieAlta,
  },
  rotulo: { fontFamily: FONTE.media, fontSize: 14, color: CORES.textoSuave },
});
