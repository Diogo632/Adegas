import type { CategoriaId, DadosEntrada, Embalagem, EntradaEstoque, FormaPagamento } from '@adegas/core';
import {
  CATEGORIAS,
  FORMAS_PAGAMENTO,
  buscarProdutos,
  categoria,
  formaPagamento,
  formatarDinheiro,
  margem,
  paraCentavos,
  previaEntrada,
  useAdega,
} from '@adegas/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Aviso,
  Botao,
  CORES,
  Campo,
  Cartao,
  Chip,
  Contador,
  LinhaValor,
  Segmentado,
  TituloSecao,
} from '../components/ui';

const TAMANHOS_FARDO = [6, 12, 15, 24];

export default function Entrada() {
  const { estado, registrarEntrada } = useAdega();
  const params = useLocalSearchParams<{ produtoId?: string }>();

  const [modo, setModo] = useState<'existente' | 'novo'>('existente');
  const [produtoId, setProdutoId] = useState<string | null>(params.produtoId ?? null);
  const [busca, setBusca] = useState('');

  const [nome, setNome] = useState('');
  const [categoriaNova, setCategoriaNova] = useState<CategoriaId>('cerveja');
  const [precoVendaTexto, setPrecoVendaTexto] = useState('');
  const [minimoTexto, setMinimoTexto] = useState('5');

  const [embalagem, setEmbalagem] = useState<Embalagem>('fardo');
  const [porFardoTexto, setPorFardoTexto] = useState('12');
  const [quantidade, setQuantidade] = useState(1);
  const [custoTexto, setCustoTexto] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [formaPgto, setFormaPgto] = useState<FormaPagamento>('pix');

  const [erro, setErro] = useState<string | null>(null);
  const [concluida, setConcluida] = useState<EntradaEstoque | null>(null);

  if (concluida) {
    const atualizado = estado.produtos.find((p) => p.id === concluida.produtoId);
    return (
      <EntradaConcluida
        entrada={concluida}
        estoqueAtual={atualizado?.estoque ?? concluida.unidades}
        onOutra={() => setConcluida(null)}
      />
    );
  }

  const produto = modo === 'existente' ? estado.produtos.find((p) => p.id === produtoId) : undefined;
  const porFardo = Number.parseInt(porFardoTexto, 10) || 0;
  const custo = paraCentavos(custoTexto);
  const precoVenda = modo === 'novo' ? paraCentavos(precoVendaTexto) : produto?.precoVenda;
  const previa = previaEntrada({
    embalagem,
    quantidade,
    unidadesPorEmbalagem: porFardo,
    custoPorEmbalagem: custo ?? 0,
  });
  const nomeEmbalagem = embalagem === 'fardo' ? 'fardo/caixa' : 'unidade';

  function registrar() {
    const dados: DadosEntrada = {
      embalagem,
      quantidade,
      unidadesPorEmbalagem: embalagem === 'fardo' ? porFardo : undefined,
      custoPorEmbalagem: custo ?? Number.NaN,
      fornecedor,
      formaPagamento: formaPgto,
    };
    if (modo === 'existente') dados.produtoId = produtoId ?? undefined;
    else
      dados.produtoNovo = {
        nome,
        categoria: categoriaNova,
        precoVenda: paraCentavos(precoVendaTexto) ?? 0,
        estoqueMinimo: Number.parseInt(minimoTexto, 10) || 0,
      };

    const resultado = registrarEntrada(dados);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setErro(null);
    setProdutoId(null);
    setBusca('');
    setNome('');
    setPrecoVendaTexto('');
    setQuantidade(1);
    setCustoTexto('');
    setFornecedor('');
    setModo('existente');
    setConcluida(resultado.valor);
  }

  return (
    <ScrollView
      contentContainerStyle={estilos.tela}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <TituloSecao>1. Qual produto chegou?</TituloSecao>
      <Segmentado
        opcoes={[
          { id: 'existente', rotulo: 'Já cadastrado' },
          { id: 'novo', rotulo: 'Produto novo' },
        ]}
        valor={modo}
        onChange={setModo}
      />

      {modo === 'existente' &&
        (produto ? (
          <Cartao style={{ borderColor: CORES.primaria, borderWidth: 2 }}>
            <View style={estilos.linha}>
              <Text style={{ fontSize: 28 }}>{categoria(produto.categoria).icone}</Text>
              <View style={{ flex: 1 }}>
                <Text style={estilos.produtoNome}>{produto.nome}</Text>
                <Text style={estilos.sub}>
                  Em estoque: {produto.estoque} · vende a {formatarDinheiro(produto.precoVenda)}
                </Text>
                <Text style={estilos.sub}>Custo médio atual: {formatarDinheiro(produto.custoMedio)}/un</Text>
              </View>
            </View>
            <Botao titulo="Trocar produto" variante="contorno" onPress={() => setProdutoId(null)} />
          </Cartao>
        ) : (
          <View style={{ gap: 8 }}>
            <Campo rotulo="Buscar" value={busca} onChangeText={setBusca} placeholder="Ex.: Brahma, gelo, Marlboro" />
            {buscarProdutos(estado.produtos, busca)
              .slice(0, 6)
              .map((p) => (
                <Pressable key={p.id} onPress={() => setProdutoId(p.id)} style={estilos.opcao}>
                  <Text style={{ fontSize: 22 }}>{categoria(p.categoria).icone}</Text>
                  <Text style={[estilos.produtoNome, { flex: 1 }]}>{p.nome}</Text>
                  <Text style={estilos.sub}>{p.estoque} un</Text>
                </Pressable>
              ))}
          </View>
        ))}

      {modo === 'novo' && (
        <Cartao>
          <Campo rotulo="Nome do produto" value={nome} onChangeText={setNome} placeholder="Ex.: Brahma Duplo Malte 350ml" />
          <Text style={estilos.rotulo}>Categoria</Text>
          <View style={estilos.chips}>
            {CATEGORIAS.map((c) => (
              <Chip
                key={c.id}
                rotulo={`${c.icone} ${c.nome}`}
                ativo={categoriaNova === c.id}
                onPress={() => setCategoriaNova(c.id)}
              />
            ))}
          </View>
          <View style={estilos.duasColunas}>
            <View style={{ flex: 1 }}>
              <Campo
                rotulo="Preço de venda (un)"
                prefixo="R$"
                teclado="decimal-pad"
                value={precoVendaTexto}
                onChangeText={setPrecoVendaTexto}
                placeholder="0,00"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Campo rotulo="Avisar abaixo de" teclado="number-pad" value={minimoTexto} onChangeText={setMinimoTexto} />
            </View>
          </View>
        </Cartao>
      )}

      <TituloSecao>2. Como chegou?</TituloSecao>
      <Segmentado
        opcoes={[
          { id: 'fardo', rotulo: 'Fardo / caixa' },
          { id: 'unidade', rotulo: 'Unidade' },
        ]}
        valor={embalagem}
        onChange={setEmbalagem}
      />
      <Cartao>
        {embalagem === 'fardo' && (
          <>
            <Text style={estilos.rotulo}>Unidades em cada fardo/caixa</Text>
            <View style={estilos.chips}>
              {TAMANHOS_FARDO.map((n) => (
                <Chip key={n} rotulo={String(n)} ativo={porFardo === n} onPress={() => setPorFardoTexto(String(n))} />
              ))}
            </View>
            <Campo rotulo="Outro tamanho" teclado="number-pad" value={porFardoTexto} onChangeText={setPorFardoTexto} />
          </>
        )}
        <View style={estilos.linha}>
          <Text style={[estilos.rotulo, { flex: 1 }]}>
            Quantos {embalagem === 'fardo' ? 'fardos/caixas' : 'unidades'}?
          </Text>
          <Contador valor={quantidade} minimo={1} onChange={setQuantidade} />
        </View>
        <Campo
          rotulo={`Custo por ${nomeEmbalagem}`}
          prefixo="R$"
          teclado="decimal-pad"
          value={custoTexto}
          onChangeText={setCustoTexto}
          placeholder={produto ? `último: ${formatarDinheiro(produto.custoMedio * previa.unidadesPorEmbalagem)}` : '0,00'}
        />
      </Cartao>

      <TituloSecao>3. Compra</TituloSecao>
      <Cartao>
        <Campo rotulo="Fornecedor (opcional)" value={fornecedor} onChangeText={setFornecedor} placeholder="Ex.: Distribuidora Central" />
        <Text style={estilos.rotulo}>Pago com</Text>
        <View style={estilos.chips}>
          {FORMAS_PAGAMENTO.map((f) => (
            <Chip
              key={f.id}
              rotulo={`${f.icone} ${f.nome}`}
              ativo={formaPgto === f.id}
              cor={f.cor}
              onPress={() => setFormaPgto(f.id)}
            />
          ))}
        </View>
      </Cartao>

      <Cartao style={{ backgroundColor: '#FBF7F2' }}>
        <TituloSecao>Resumo</TituloSecao>
        <LinhaValor
          rotulo="Entram no estoque"
          valor={`${previa.unidades} un${produto ? ` (fica ${produto.estoque + previa.unidades})` : ''}`}
        />
        <LinhaValor rotulo="Custo por unidade" valor={formatarDinheiro(previa.custoUnitario)} />
        {precoVenda ? (
          <LinhaValor rotulo="Margem na venda" valor={`${margem(precoVenda, previa.custoUnitario)}%`} />
        ) : null}
        <LinhaValor rotulo="Total da compra" valor={formatarDinheiro(previa.custoTotal)} destaque />
      </Cartao>

      {erro && <Aviso tipo="erro" texto={erro} />}
      <Botao titulo="Registrar entrada" onPress={registrar} />
    </ScrollView>
  );
}

function EntradaConcluida({
  entrada,
  estoqueAtual,
  onOutra,
}: {
  entrada: EntradaEstoque;
  estoqueAtual: number;
  onOutra: () => void;
}) {
  const forma = formaPagamento(entrada.formaPagamento);
  return (
    <ScrollView contentContainerStyle={[estilos.tela, { paddingTop: 40 }]}>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 64 }}>📦</Text>
        <Text style={estilos.sucessoTitulo}>Entrada registrada!</Text>
        <Text style={[estilos.sub, { textAlign: 'center' }]}>{entrada.produtoNome}</Text>
      </View>
      <Cartao>
        <LinhaValor rotulo="Entraram" valor={`+${entrada.unidades} un`} />
        <LinhaValor rotulo="Estoque agora" valor={`${estoqueAtual} un`} />
        <LinhaValor rotulo="Custo por unidade" valor={formatarDinheiro(entrada.custoUnitario)} />
        <LinhaValor rotulo={`Pago com ${forma.nome}`} valor={formatarDinheiro(entrada.custoTotal)} destaque />
      </Cartao>
      <Text style={[estilos.sub, { textAlign: 'center' }]}>A compra já foi lançada como despesa no financeiro.</Text>
      <Botao titulo="Registrar outra entrada" onPress={onOutra} />
      <Botao titulo="Voltar ao início" variante="contorno" onPress={() => router.back()} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { padding: 16, gap: 14, paddingBottom: 48 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  duasColunas: { flexDirection: 'row', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rotulo: { fontSize: 14, fontWeight: '600', color: CORES.textoSuave },
  produtoNome: { fontSize: 16, fontWeight: '700', color: CORES.texto },
  sub: { fontSize: 14, color: CORES.textoSuave },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CORES.superficie,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 12,
    padding: 12,
  },
  sucessoTitulo: { fontSize: 24, fontWeight: '800', color: CORES.texto },
});
