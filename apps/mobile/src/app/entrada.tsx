import type { CategoriaId, DadosEntrada, Embalagem, EntradaEstoque, FormaPagamento } from '@adegas/core';
import {
  CATEGORIAS,
  FORMAS_PAGAMENTO,
  buscarProdutos,
  formaPagamento,
  formatarDinheiro,
  margem,
  paraCentavos,
  previaEntrada,
  useAdega,
} from '@adegas/core';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Search } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Entrar, NumeroAnimado, Surgir, Tocavel } from '../components/animacoes';
import { ICONE_CATEGORIA } from '../components/icones';
import {
  Aviso,
  Botao,
  Campo,
  Cartao,
  Chip,
  Contador,
  Divisor,
  IconeQuadrado,
  LinhaValor,
  Segmentado,
} from '../components/ui';
import { CORES, FONTE, RAIO, TEXTO } from '../tema';

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
    <ScrollView contentContainerStyle={estilos.tela} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Passo numero={1} titulo="Qual produto chegou?" />
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
          <Cartao style={{ borderColor: CORES.primaria, backgroundColor: CORES.primariaSuave }}>
            <View style={estilos.linha}>
              <IconeQuadrado icone={ICONE_CATEGORIA[produto.categoria]} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={TEXTO.corpoForte}>{produto.nome}</Text>
                <Text style={TEXTO.legenda}>{produto.estoque} em estoque</Text>
                <Text style={TEXTO.legenda}>Vende a {formatarDinheiro(produto.precoVenda)}</Text>
              </View>
              <Pressable onPress={() => setProdutoId(null)} hitSlop={8}>
                <Text style={estilos.link}>Trocar</Text>
              </Pressable>
            </View>
          </Cartao>
        ) : (
          <View style={{ gap: 10 }}>
            <Campo icone={Search} value={busca} onChangeText={setBusca} placeholder="Buscar: Brahma, gelo, Marlboro…" />
            <Cartao style={{ paddingVertical: 4, gap: 0 }}>
              {buscarProdutos(estado.produtos, busca)
                .slice(0, 6)
                .map((p, i) => (
                  <Fragment key={p.id}>
                    {i > 0 && <Divisor />}
                    <Tocavel onPress={() => setProdutoId(p.id)} escala={0.98} style={estilos.opcao}>
                      <IconeQuadrado icone={ICONE_CATEGORIA[p.categoria]} tamanho={36} />
                      <Text style={[TEXTO.corpo, { flex: 1, fontSize: 15 }]} numberOfLines={1}>
                        {p.nome}
                      </Text>
                      <Text style={TEXTO.legenda}>{p.estoque} un</Text>
                    </Tocavel>
                  </Fragment>
                ))}
            </Cartao>
          </View>
        ))}

      {modo === 'novo' && (
        <Cartao>
          <Campo rotulo="Nome do produto" value={nome} onChangeText={setNome} placeholder="Ex.: Brahma Duplo Malte 350ml" />
          <Text style={estilos.rotulo}>Categoria</Text>
          <View style={estilos.chips}>
            {CATEGORIAS.map((c) => (
              <Chip key={c.id} rotulo={c.nome} ativo={categoriaNova === c.id} onPress={() => setCategoriaNova(c.id)} />
            ))}
          </View>
          <View style={estilos.duasColunas}>
            <View style={{ flex: 1 }}>
              <Campo
                rotulo="Preço de venda"
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

      <Passo numero={2} titulo="Como chegou?" />
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
            <Text style={estilos.rotulo}>Unidades em cada fardo</Text>
            <View style={estilos.chips}>
              {TAMANHOS_FARDO.map((n) => (
                <Chip key={n} rotulo={String(n)} ativo={porFardo === n} onPress={() => setPorFardoTexto(String(n))} />
              ))}
              <View style={{ width: 84 }}>
                <Campo
                  teclado="number-pad"
                  value={TAMANHOS_FARDO.includes(porFardo) ? '' : porFardoTexto}
                  onChangeText={setPorFardoTexto}
                  placeholder="Outro"
                />
              </View>
            </View>
            <Divisor />
          </>
        )}
        <View style={estilos.linha}>
          <Text style={[estilos.rotulo, { flex: 1 }]}>Quantos {embalagem === 'fardo' ? 'fardos' : 'unidades'}?</Text>
          <Contador valor={quantidade} minimo={1} onChange={setQuantidade} />
        </View>
        <Divisor />
        <Campo
          rotulo={`Custo por ${nomeEmbalagem}`}
          prefixo="R$"
          teclado="decimal-pad"
          value={custoTexto}
          onChangeText={setCustoTexto}
          placeholder={produto ? `último ${semMoeda(produto.custoMedio * previa.unidadesPorEmbalagem)}` : '0,00'}
        />
      </Cartao>

      <Passo numero={3} titulo="Pagamento ao fornecedor" />
      <Cartao>
        <Campo rotulo="Fornecedor (opcional)" value={fornecedor} onChangeText={setFornecedor} placeholder="Ex.: Distribuidora Central" />
        <Text style={estilos.rotulo}>Pago com</Text>
        <View style={estilos.chips}>
          {FORMAS_PAGAMENTO.map((f) => (
            <Chip key={f.id} rotulo={f.nome} ativo={formaPgto === f.id} onPress={() => setFormaPgto(f.id)} />
          ))}
        </View>
      </Cartao>

      <Entrar style={estilos.resumo}>
        <LinhaResumo
          rotulo="Entram no estoque"
          valor={`${previa.unidades} un${produto ? ` · fica ${produto.estoque + previa.unidades}` : ''}`}
        />
        <LinhaResumo rotulo="Custo por unidade" valor={formatarDinheiro(previa.custoUnitario)} />
        {precoVenda ? <LinhaResumo rotulo="Margem na venda" valor={`${margem(precoVenda, previa.custoUnitario)}%`} /> : null}
        <View style={estilos.resumoDivisor} />
        <View style={estilos.linhaResumo}>
          <Text style={[estilos.resumoRotulo, { color: '#FFFFFF' }]}>Total da compra</Text>
          <NumeroAnimado valor={previa.custoTotal} formatar={formatarDinheiro} style={estilos.resumoTotal} />
        </View>
      </Entrar>

      {erro && <Aviso texto={erro} />}
      <Botao titulo="Registrar entrada" onPress={registrar} />
    </ScrollView>
  );
}

function semMoeda(valor: number) {
  return formatarDinheiro(valor).replace('R$ ', '');
}

function Passo({ numero, titulo }: { numero: number; titulo: string }) {
  return (
    <View style={estilos.passo}>
      <View style={estilos.passoNumero}>
        <Text style={estilos.passoNumeroTexto}>{numero}</Text>
      </View>
      <Text style={TEXTO.titulo}>{titulo}</Text>
    </View>
  );
}

function LinhaResumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={estilos.linhaResumo}>
      <Text style={estilos.resumoRotulo}>{rotulo}</Text>
      <Text style={estilos.resumoValor}>{valor}</Text>
    </View>
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
    <ScrollView contentContainerStyle={[estilos.tela, { paddingTop: 48 }]}>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Surgir style={estilos.selo}>
          <Check size={30} color={CORES.fundo} strokeWidth={3} />
        </Surgir>
        <Text style={[TEXTO.tituloTela, { fontSize: 26, marginTop: 8 }]}>Entrada registrada</Text>
        <Text style={TEXTO.legenda}>{entrada.produtoNome}</Text>
      </View>
      <Cartao>
        <LinhaValor rotulo="Entraram" valor={`+${entrada.unidades} un`} />
        <LinhaValor rotulo="Estoque agora" valor={`${estoqueAtual} un`} />
        <LinhaValor rotulo="Custo por unidade" valor={formatarDinheiro(entrada.custoUnitario)} />
        <Divisor />
        <LinhaValor rotulo={`Pago no ${forma.nome.toLowerCase()}`} valor={formatarDinheiro(entrada.custoTotal)} destaque />
      </Cartao>
      <Text style={[TEXTO.legenda, { textAlign: 'center' }]}>A compra já foi lançada como despesa no financeiro.</Text>
      <View style={{ gap: 10 }}>
        <Botao titulo="Registrar outra entrada" onPress={onOutra} />
        <Botao titulo="Voltar ao início" variante="contorno" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48, gap: 14 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  duasColunas: { flexDirection: 'row', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  rotulo: { fontFamily: FONTE.media, fontSize: 14, color: CORES.textoSuave },
  link: { fontFamily: FONTE.semi, fontSize: 15, color: CORES.primaria },
  opcao: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  passo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  passoNumero: {
    width: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CORES.primariaClara,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passoNumeroTexto: { fontFamily: FONTE.semi, fontSize: 13, color: CORES.primariaClara },
  resumo: {
    backgroundColor: CORES.destaqueFundo,
    borderWidth: 1,
    borderColor: CORES.destaqueBorda,
    borderRadius: RAIO.grande,
    padding: 20,
    gap: 10,
    marginTop: 8,
  },
  linhaResumo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resumoRotulo: { fontFamily: FONTE.regular, fontSize: 15, color: CORES.textoSuave },
  resumoValor: { fontFamily: FONTE.semi, fontSize: 15, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  resumoDivisor: { height: StyleSheet.hairlineWidth, backgroundColor: CORES.destaqueBorda, marginVertical: 4 },
  resumoTotal: { fontFamily: FONTE.semi, fontSize: 24, color: '#FFFFFF', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  selo: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: CORES.receita,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
