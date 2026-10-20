import type { CategoriaId, ChaveNFe, EntradaEstoque, FormaPagamento, LinhaConferencia, NotaDaEntrada, NotaFiscal, Produto } from '@adegas/core';
import {
  CATEGORIAS,
  FORMAS_PAGAMENTO,
  biparNaConferencia,
  buscarProdutos,
  conferenciaDaNota,
  entenderCodigo,
  entradasDaNota,
  formaPagamento,
  formatarChave,
  formatarCnpj,
  formatarDinheiro,
  itensDaConferencia,
  lerXmlNFe,
  ligarCodigo,
  mudarCustoDaLinha,
  mudarQuantidadeDaLinha,
  paraCentavos,
  totaisDaConferencia,
  useAdega,
} from '@adegas/core';
import { lerNotaPorImagem } from '@adegas/ia/src/notaPorFoto';
import type { BarcodeType } from 'expo-camera';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { Camera, Check, CircleAlert, FileText, Flashlight, Images, ScanBarcode, Trash2, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { escolherArquivoDaNota, escolherFotos, tirarFoto } from '../anexos';
import { bipar } from '../bipe';
import { Entrar, NumeroAnimado, Surgir, Tocavel } from '../components/animacoes';
import { Aviso, Botao, Campo, Cartao, Chip, Divisor, LinhaValor } from '../components/ui';
import { useConfigAssistente } from '../configAssistente';
import { CORES, FONTE, RAIO, TEXTO } from '../tema';

interface Resposta {
  ok: boolean;
  texto: string;
}

const TIPOS: BarcodeType[] = ['code128', 'ean13', 'ean8', 'upc_a', 'upc_e', 'itf14', 'qr'];

/**
 * Entrada pela nota fiscal no celular: a câmera bipa a nota (código de barras
 * do DANFE ou QR Code do cupom) e os produtos; o XML ou a foto trazem a lista;
 * tudo entra de uma vez.
 */
export default function EntradaNota() {
  const { estado, registrarEntradaDaNota } = useAdega();
  const { config } = useConfigAssistente();

  const [chave, setChave] = useState<ChaveNFe | null>(null);
  const [nota, setNota] = useState<NotaFiscal | null>(null);
  const [linhas, setLinhas] = useState<LinhaConferencia[]>([]);
  // Cópia que o leitor usa: dois bipes seguidos não podem se perder.
  const atuais = useRef({ linhas: [] as LinhaConferencia[], nota: null as NotaFiscal | null, chave: null as ChaveNFe | null });
  const [destaque, setDestaque] = useState<number | null>(null);
  const [codigoSemDono, setCodigoSemDono] = useState<string | null>(null);
  const [retorno, setRetorno] = useState<Resposta | null>(null);
  const [lendo, setLendo] = useState<string | null>(null);
  const [camera, setCamera] = useState(true);
  const [digitado, setDigitado] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [formaPgto, setFormaPgto] = useState<FormaPagamento>('pix');
  const [erro, setErro] = useState<string | null>(null);
  const [concluida, setConcluida] = useState<{ entradas: EntradaEstoque[]; numero?: string; forma: FormaPagamento } | null>(null);

  function mudar(novo: Partial<typeof atuais.current>) {
    Object.assign(atuais.current, novo);
    if ('linhas' in novo) setLinhas(novo.linhas!);
    if ('nota' in novo) setNota(novo.nota!);
    if ('chave' in novo) setChave(novo.chave!);
  }

  function avisar(r: Resposta): Resposta {
    setRetorno(r);
    bipar(r.ok);
    return r;
  }

  const numeroDaNota = nota?.numero ?? (chave ? String(chave.numero) : undefined);
  const chaveAberta = nota?.chave ?? chave?.chave;
  const anteriores = chaveAberta ? entradasDaNota(estado, chaveAberta) : [];
  const repetida = anteriores.length ? new Date(anteriores[0].data).toLocaleDateString('pt-BR') : null;

  function abrirChave(lida: ChaveNFe): Resposta {
    const { nota: aberta, chave: atual, linhas: ls } = atuais.current;
    if (aberta?.chave === lida.chave || atual?.chave === lida.chave) return { ok: true, texto: `A nota ${lida.numero} já está aberta.` };
    const ja = entradasDaNota(estado, lida.chave);
    if (ja.length) return { ok: false, texto: `A nota ${lida.numero} já deu entrada em ${new Date(ja[0].data).toLocaleDateString('pt-BR')}.` };
    if ((aberta?.chave && aberta.chave !== lida.chave) || (atual && ls.length)) {
      return { ok: false, texto: 'Já tem outra nota aberta. Dê entrada nela ou descarte antes de bipar outra.' };
    }
    mudar({ chave: lida, nota: aberta ? { ...aberta, chave: lida.chave, numero: aberta.numero ?? String(lida.numero) } : aberta });
    const tipo = lida.modelo === '65' ? 'Cupom (NFC-e)' : 'Nota';
    return {
      ok: true,
      texto: `${tipo} ${lida.numero} de ${formatarCnpj(lida.cnpj)} lida.${aberta ? '' : ' Agora mande o XML ou a foto, ou bipe os produtos.'}`,
    };
  }

  function abrirNota(nova: NotaFiscal): Resposta {
    const { chave: lida, linhas: bipadas } = atuais.current;
    if (nova.chave && lida && nova.chave !== lida.chave && bipadas.some((l) => !l.foraDaNota)) {
      return { ok: false, texto: 'Essa nota é diferente da que está aberta. Descarte a atual antes.' };
    }
    const completa: NotaFiscal = {
      ...nova,
      chave: nova.chave ?? lida?.chave,
      numero: nova.numero ?? (lida ? String(lida.numero) : undefined),
      serie: nova.serie ?? (lida ? String(lida.serie) : undefined),
    };
    let novas = conferenciaDaNota(completa, estado.produtos);
    for (const l of bipadas) {
      if (!l.item.ean) continue;
      for (let i = 0; i < l.bipados; i++) novas = biparNaConferencia(novas, l.item.ean, estado.produtos).linhas;
    }
    setErro(null);
    setCodigoSemDono(null);
    setDestaque(null);
    mudar({ nota: completa, linhas: novas });
    if (completa.emitente?.nome) setFornecedor(completa.emitente.nome);
    const reconhecidos = novas.filter((l) => l.acao === 'produto').length;
    return {
      ok: true,
      texto: `${novas.length} produto${novas.length > 1 ? 's' : ''} na nota, ${reconhecidos} reconhecido${reconhecidos === 1 ? '' : 's'}. Confira abaixo.`,
    };
  }

  function lerCodigo(texto: string): Resposta {
    const codigo = entenderCodigo(texto);
    if (codigo.tipo === 'nota') return avisar(abrirChave(codigo.chave));
    if (codigo.tipo === 'outro') return avisar({ ok: false, texto: 'Esse código não é de nota fiscal nem de produto.' });
    const { linhas: ls, nota: aberta } = atuais.current;
    const bipe = biparNaConferencia(ls, codigo.codigo, estado.produtos, !aberta);
    if (bipe.linhas !== ls) mudar({ linhas: bipe.linhas });
    if (bipe.indice !== undefined) setDestaque(bipe.indice);
    if (bipe.codigoSemDono) setCodigoSemDono(bipe.codigoSemDono);
    return avisar({ ok: bipe.ok, texto: bipe.texto });
  }

  async function lerImagem(arquivo: { nome: string; mimeType: string; dados: string }) {
    if (!config.chave) {
      avisar({ ok: false, texto: 'Para ler a foto, o Pop AI precisa estar configurado. Mande o XML da nota ou bipe os produtos.' });
      return;
    }
    setLendo('Lendo a nota com o Pop AI…');
    try {
      avisar(abrirNota(await lerNotaPorImagem(arquivo, { chave: config.chave, modelo: config.modelo })));
    } catch (e) {
      avisar({ ok: false, texto: e instanceof Error ? e.message : 'Não consegui ler a foto.' });
    } finally {
      setLendo(null);
    }
  }

  async function foto(origem: 'camera' | 'galeria') {
    const escolha = origem === 'camera' ? await tirarFoto(3) : await escolherFotos(3);
    if (escolha.erros.length) avisar({ ok: false, texto: escolha.erros[0] });
    const [imagem] = escolha.anexos;
    if (imagem?.dados) await lerImagem({ nome: imagem.nome, mimeType: imagem.mimeType, dados: imagem.dados });
  }

  async function arquivo() {
    const escolhido = await escolherArquivoDaNota();
    if (!escolhido) return;
    if ('erro' in escolhido) avisar({ ok: false, texto: escolhido.erro });
    else if ('xml' in escolhido) {
      const lido = lerXmlNFe(escolhido.xml);
      avisar(lido.ok ? abrirNota(lido.valor) : { ok: false, texto: lido.erro });
    } else await lerImagem(escolhido);
  }

  function digitar() {
    if (!digitado.trim()) return;
    lerCodigo(digitado);
    setDigitado('');
  }

  function mudarLinha(i: number, linha: LinhaConferencia) {
    mudar({ linhas: atuais.current.linhas.map((l, j) => (j === i ? linha : l)) });
  }

  function descartar() {
    mudar({ linhas: [], nota: null, chave: null });
    setCodigoSemDono(null);
    setDestaque(null);
    setRetorno(null);
    setErro(null);
    setFornecedor('');
  }

  function darEntrada() {
    const dadosNota: NotaDaEntrada | undefined =
      chaveAberta || numeroDaNota ? { chave: chaveAberta, numero: numeroDaNota, serie: nota?.serie ?? (chave ? String(chave.serie) : undefined) } : undefined;
    const r = registrarEntradaDaNota({ itens: itensDaConferencia(linhas), fornecedor, formaPagamento: formaPgto, nota: dadosNota });
    if (!r.ok) {
      setErro(r.erro);
      bipar(false);
      return;
    }
    setConcluida({ entradas: r.valor, numero: numeroDaNota, forma: formaPgto });
    descartar();
    setCamera(false);
  }

  if (concluida) {
    return (
      <NotaConcluida
        {...concluida}
        aoOutra={() => {
          setConcluida(null);
          setCamera(true);
        }}
      />
    );
  }

  const totais = totaisDaConferencia(linhas);
  const temAlgo = Boolean(chave || nota || linhas.length);

  return (
    <ScrollView contentContainerStyle={estilos.tela} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      {camera ? (
        <LeitorDaCamera aoLer={lerCodigo} aoFechar={() => setCamera(false)} retorno={retorno} />
      ) : (
        <Botao titulo="Abrir a câmera para bipar" icone={ScanBarcode} onPress={() => setCamera(true)} />
      )}

      {retorno && !camera && <Aviso texto={retorno.texto} tipo={retorno.ok ? 'sucesso' : 'erro'} />}

      <View style={estilos.fontes}>
        <BotaoFonte icone={Camera} rotulo="Foto da nota" onPress={() => void foto('camera')} desligado={!!lendo} />
        <BotaoFonte icone={Images} rotulo="Da galeria" onPress={() => void foto('galeria')} desligado={!!lendo} />
        <BotaoFonte icone={FileText} rotulo="XML ou PDF" onPress={() => void arquivo()} desligado={!!lendo} />
      </View>
      <Campo
        icone={ScanBarcode}
        value={digitado}
        onChangeText={setDigitado}
        placeholder="Digitar chave da nota ou código"
        teclado={Platform.OS === 'web' ? 'default' : 'number-pad'}
        aoEnviar={digitar}
      />
      {digitado.trim() ? <Botao titulo="Ler código" variante="contorno" onPress={digitar} /> : null}

      {lendo && (
        <View style={estilos.lendo}>
          <ActivityIndicator color={CORES.primariaClara} />
          <Text style={TEXTO.legenda}>{lendo}</Text>
        </View>
      )}

      {!temAlgo && (
        <Text style={[TEXTO.legenda, { textAlign: 'center', marginTop: 4 }]}>
          Bipe o código de barras da nota (DANFE) ou o QR Code do cupom. Depois mande o XML ou a foto para trazer os produtos, ou bipe os produtos um por
          um.
        </Text>
      )}

      {temAlgo && (
        <>
          <View style={estilos.secao}>
            <Text style={TEXTO.titulo}>Conferência</Text>
            <Pressable onPress={descartar} hitSlop={8} style={estilos.linha} accessibilityRole="button">
              <Trash2 size={15} color={CORES.textoSuave} />
              <Text style={TEXTO.legenda}>Descartar</Text>
            </Pressable>
          </View>
          <CabecalhoNota nota={nota} chave={chave} />
          {repetida && <Aviso texto={`Essa nota já deu entrada em ${repetida}. Ela não pode entrar de novo.`} />}
          {!nota && linhas.length > 0 && (
            <Text style={TEXTO.legenda}>Sem os itens da nota, cada produto bipado entra na lista. Bipe de novo para somar.</Text>
          )}
          {codigoSemDono && linhas.length > 0 && (
            <Cartao style={{ borderColor: CORES.alerta, backgroundColor: CORES.alertaFundo }}>
              <Text style={TEXTO.corpo}>O código {codigoSemDono} ainda não é conhecido. De qual produto ele é?</Text>
              <View style={estilos.chips}>
                {linhas.map((l, i) =>
                  l.acao === 'ignorar' ? null : (
                    <Chip
                      key={i}
                      rotulo={l.item.descricao || l.novo.nome || `Item ${i + 1}`}
                      ativo={false}
                      onPress={() => {
                        const ligadas = ligarCodigo(atuais.current.linhas, i, codigoSemDono);
                        mudar({ linhas: ligadas });
                        setDestaque(i);
                        setCodigoSemDono(null);
                        setRetorno({ ok: true, texto: `Código ${codigoSemDono} ligado a ${ligadas[i].item.descricao || ligadas[i].novo.nome}.` });
                      }}
                    />
                  ),
                )}
              </View>
              <Pressable onPress={() => setCodigoSemDono(null)} hitSlop={8}>
                <Text style={estilos.link}>Ignorar</Text>
              </Pressable>
            </Cartao>
          )}
          {linhas.map((l, i) => (
            <ItemDaNota
              key={i}
              linha={l}
              produtos={estado.produtos}
              destaque={destaque === i}
              aoMudar={(nova) => mudarLinha(i, nova)}
              aoTirar={l.foraDaNota ? () => mudar({ linhas: atuais.current.linhas.filter((_, j) => j !== i) }) : undefined}
            />
          ))}
        </>
      )}

      {linhas.length > 0 && (
        <>
          <Text style={[TEXTO.titulo, { marginTop: 8 }]}>Pagamento ao fornecedor</Text>
          <Cartao>
            <Campo rotulo="Fornecedor" value={fornecedor} onChangeText={setFornecedor} placeholder="Ex.: Distribuidora Central" />
            <Text style={estilos.rotulo}>Pago com</Text>
            <View style={estilos.chips}>
              {FORMAS_PAGAMENTO.map((f) => (
                <Chip key={f.id} rotulo={f.nome} ativo={formaPgto === f.id} onPress={() => setFormaPgto(f.id)} />
              ))}
            </View>
          </Cartao>

          <Entrar style={estilos.resumo}>
            <LinhaResumo rotulo="Produtos" valor={`${totais.itens}${linhas.length > totais.itens ? ` de ${linhas.length}` : ''}`} />
            <LinhaResumo rotulo="Entram no estoque" valor={`${totais.unidades} un`} />
            {nota?.valorTotal ? <LinhaResumo rotulo="Total da nota" valor={formatarDinheiro(nota.valorTotal)} /> : null}
            <View style={estilos.resumoDivisor} />
            <View style={estilos.linhaResumo}>
              <Text style={[estilos.resumoRotulo, { color: CORES.texto }]}>Total da entrada</Text>
              <NumeroAnimado valor={totais.valor} formatar={formatarDinheiro} style={estilos.resumoTotal} />
            </View>
          </Entrar>

          {erro && <Aviso texto={erro} />}
          <Botao
            titulo={`Dar entrada em ${totais.itens} produto${totais.itens === 1 ? '' : 's'}`}
            onPress={darEntrada}
            desabilitado={!totais.itens || !!repetida}
          />
        </>
      )}
    </ScrollView>
  );
}

/** Câmera lendo códigos de barras e QR Code (no celular e na versão web). */
function LeitorDaCamera({ aoLer, aoFechar, retorno }: { aoLer: (codigo: string) => void; aoFechar: () => void; retorno: Resposta | null }) {
  const [permissao, pedirPermissao] = useCameraPermissions();
  const [luz, setLuz] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ultimo = useRef({ valor: '', quando: 0 });

  if (!permissao) {
    return (
      <View style={[estilos.camera, estilos.cameraCentro]}>
        <ActivityIndicator color={CORES.primariaClara} />
      </View>
    );
  }
  if (!permissao.granted || erro) {
    return (
      <Cartao style={{ alignItems: 'center' }}>
        <ScanBarcode size={30} color={CORES.primariaClara} strokeWidth={1.5} />
        <Text style={[TEXTO.corpo, { textAlign: 'center' }]}>
          {erro ?? (permissao.canAskAgain ? 'Para bipar a nota e os produtos, o app precisa da câmera.' : 'A câmera está bloqueada. Libere nas configurações do celular.')}
        </Text>
        {!erro && permissao.canAskAgain && <Botao titulo="Liberar a câmera" onPress={() => void pedirPermissao()} />}
        <Pressable onPress={aoFechar} hitSlop={8}>
          <Text style={estilos.link}>Agora não</Text>
        </Pressable>
      </Cartao>
    );
  }

  return (
    <View style={estilos.camera}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={luz}
        barcodeScannerSettings={{ barcodeTypes: TIPOS }}
        onMountError={() => setErro('Não consegui abrir a câmera.')}
        onBarcodeScanned={({ data }) => {
          const valor = data?.trim();
          const agora = Date.now();
          if (!valor || (valor === ultimo.current.valor && agora - ultimo.current.quando < 2500)) return;
          ultimo.current = { valor, quando: agora };
          aoLer(valor);
        }}
      />
      <View pointerEvents="none" style={estilos.mira} />
      <View style={estilos.cameraTopo}>
        <View style={estilos.cameraDica}>
          <ScanBarcode size={14} color="#fff" />
          <Text style={estilos.cameraDicaTexto}>Aponte para o código da nota ou do produto</Text>
        </View>
        <View style={estilos.linha}>
          {Platform.OS !== 'web' && (
            <Pressable
              onPress={() => setLuz((l) => !l)}
              style={[estilos.cameraBotao, luz && { backgroundColor: CORES.primaria }]}
              accessibilityLabel={luz ? 'Desligar lanterna' : 'Ligar lanterna'}
            >
              <Flashlight size={17} color={luz ? CORES.sobrePrimaria : '#fff'} />
            </Pressable>
          )}
          <Pressable onPress={aoFechar} style={estilos.cameraBotao} accessibilityLabel="Fechar câmera">
            <X size={18} color="#fff" />
          </Pressable>
        </View>
      </View>
      {retorno && (
        <View style={estilos.cameraRetorno} accessibilityLiveRegion="polite">
          <Text style={[estilos.cameraRetornoTexto, { color: retorno.ok ? CORES.receita : CORES.alerta }]}>{retorno.texto}</Text>
        </View>
      )}
    </View>
  );
}

function BotaoFonte({ icone: Icone, rotulo, onPress, desligado }: { icone: LucideIcon; rotulo: string; onPress: () => void; desligado?: boolean }) {
  return (
    <Tocavel onPress={desligado ? () => undefined : onPress} escala={0.96} style={[estilos.fonte, desligado && { opacity: 0.5 }]}>
      <Icone size={22} color={CORES.primariaClara} strokeWidth={1.75} />
      <Text style={estilos.fonteTexto}>{rotulo}</Text>
    </Tocavel>
  );
}

function CabecalhoNota({ nota, chave }: { nota: NotaFiscal | null; chave: ChaveNFe | null }) {
  if (!nota && !chave) return null;
  const numero = nota?.numero ?? (chave ? String(chave.numero) : undefined);
  const cnpj = nota?.emitente?.cnpj ?? chave?.cnpj;
  const codigo = nota?.chave ?? chave?.chave;
  return (
    <Cartao style={{ gap: 4 }}>
      <View style={estilos.linha}>
        <FileText size={18} color={CORES.primariaClara} strokeWidth={1.75} />
        <Text style={[TEXTO.corpoForte, { flex: 1 }]}>
          {chave?.modelo === '65' ? 'Cupom' : 'Nota'} {numero ? `nº ${numero}` : 'sem número'}
          {nota?.emitente?.nome ? ` · ${nota.emitente.nome}` : ''}
        </Text>
      </View>
      <Text style={TEXTO.legenda}>
        {[cnpj ? `CNPJ ${formatarCnpj(cnpj)}` : null, nota ? (nota.origem === 'xml' ? 'itens do XML' : 'itens lidos da foto: confira') : 'sem os itens ainda']
          .filter(Boolean)
          .join(' · ')}
      </Text>
      {codigo && <Text style={estilos.chave}>{formatarChave(codigo)}</Text>}
    </Cartao>
  );
}

function statusDaLinha(l: LinhaConferencia): { texto: string; cor: string; fundo: string } {
  const ok = { cor: CORES.receita, fundo: CORES.receitaFundo };
  if (l.acao === 'ignorar') return { texto: 'Não entra', cor: CORES.textoFraco, fundo: CORES.superficieAlta };
  if (l.acao === 'novo') return { texto: 'Produto novo', cor: CORES.primariaClara, fundo: CORES.primariaSuave };
  if (l.como === 'parecido') return { texto: 'Nome parecido: confira', cor: CORES.alerta, fundo: CORES.alertaFundo };
  if (l.como === 'codigo') return { texto: 'Pelo código', ...ok };
  if (l.como === 'bipado') return { texto: 'Reconhecido no bipe', ...ok };
  return { texto: l.como === 'escolhido' ? 'Escolhido' : 'Reconhecido', ...ok };
}

function ItemDaNota({
  linha,
  produtos,
  destaque,
  aoMudar,
  aoTirar,
}: {
  linha: LinhaConferencia;
  produtos: Produto[];
  destaque: boolean;
  aoMudar: (linha: LinhaConferencia) => void;
  aoTirar?: () => void;
}) {
  const { item } = linha;
  const [trocando, setTrocando] = useState(false);
  const [busca, setBusca] = useState('');
  const status = statusDaLinha(linha);
  const produto = linha.acao === 'produto' ? produtos.find((p) => p.id === linha.produtoId) : undefined;
  const titulo = linha.foraDaNota ? (produto?.nome ?? (linha.novo.nome || 'Produto novo')) : item.descricao;
  const unidades = Math.round(item.quantidade * (linha.unidadesPorEmbalagem ?? 0));
  const conferido = linha.bipados >= item.quantidade && linha.acao !== 'ignorar';

  function escolher(acao: LinhaConferencia['acao'], produtoId?: string) {
    aoMudar(acao === 'produto' ? { ...linha, acao, produtoId, como: 'escolhido' } : { ...linha, acao });
    setTrocando(false);
    setBusca('');
  }

  return (
    <Cartao style={[destaque && { borderColor: CORES.primaria, backgroundColor: CORES.primariaSuave }, linha.acao === 'ignorar' && { opacity: 0.6 }]}>
      <View style={[estilos.linha, { alignItems: 'flex-start' }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={TEXTO.corpoForte}>{titulo}</Text>
          <Text style={TEXTO.legenda}>{item.ean ? `EAN ${item.ean}` : 'sem código de barras'}</Text>
        </View>
        {aoTirar && (
          <Pressable onPress={aoTirar} hitSlop={8} accessibilityLabel="Tirar da lista">
            <Trash2 size={17} color={CORES.textoSuave} />
          </Pressable>
        )}
      </View>
      <View style={estilos.linha}>
        <View style={[estilos.pilula, { backgroundColor: status.fundo }]}>
          <Text style={[estilos.pilulaTexto, { color: status.cor }]}>{status.texto}</Text>
        </View>
        {linha.bipados > 0 && (
          <View style={[estilos.pilula, { backgroundColor: conferido ? CORES.receitaFundo : CORES.superficieAlta }]}>
            <ScanBarcode size={12} color={conferido ? CORES.receita : CORES.textoSuave} />
            <Text style={[estilos.pilulaTexto, { color: conferido ? CORES.receita : CORES.textoSuave }]}>
              {linha.bipados}
              {linha.foraDaNota ? '' : `/${item.quantidade}`}
            </Text>
          </View>
        )}
      </View>

      <Pressable onPress={() => setTrocando((t) => !t)} style={estilos.escolhido} accessibilityRole="button">
        <Text style={estilos.rotulo}>Entra como</Text>
        <Text style={[TEXTO.corpoForte, { flex: 1, textAlign: 'right' }]} numberOfLines={1}>
          {linha.acao === 'ignorar' ? 'Não dar entrada' : linha.acao === 'novo' ? 'Produto novo' : (produto?.nome ?? 'Escolha')}
        </Text>
        <Text style={estilos.link}>{trocando ? 'Fechar' : 'Trocar'}</Text>
      </Pressable>
      {trocando && (
        <View style={{ gap: 8 }}>
          <Campo value={busca} onChangeText={setBusca} placeholder="Buscar no estoque" />
          {buscarProdutos(produtos, busca)
            .slice(0, 5)
            .map((p) => (
              <Pressable key={p.id} onPress={() => escolher('produto', p.id)} style={estilos.opcao}>
                <Text style={[TEXTO.corpo, { flex: 1 }]} numberOfLines={1}>
                  {p.nome}
                </Text>
                <Text style={TEXTO.legenda}>{p.estoque} un</Text>
              </Pressable>
            ))}
          <View style={estilos.chips}>
            <Chip rotulo="+ Cadastrar novo" ativo={linha.acao === 'novo'} onPress={() => escolher('novo')} />
            <Chip rotulo="Não dar entrada" ativo={linha.acao === 'ignorar'} onPress={() => escolher('ignorar')} />
          </View>
        </View>
      )}

      {linha.acao === 'novo' && (
        <View style={{ gap: 10 }}>
          <Campo rotulo="Nome no estoque" value={linha.novo.nome} onChangeText={(nome) => aoMudar({ ...linha, novo: { ...linha.novo, nome } })} />
          <View style={estilos.chips}>
            {CATEGORIAS.map((c) => (
              <Chip
                key={c.id}
                rotulo={c.nome}
                ativo={linha.novo.categoria === c.id}
                onPress={() => aoMudar({ ...linha, novo: { ...linha.novo, categoria: c.id as CategoriaId } })}
              />
            ))}
          </View>
          <CampoNumero
            rotulo="Preço de venda (unidade)"
            prefixo="R$"
            valor={linha.novo.precoVenda}
            ler={(t) => paraCentavos(t) ?? 0}
            mostrar={reais}
            aoMudar={(precoVenda) => aoMudar({ ...linha, novo: { ...linha.novo, precoVenda } })}
            decimal
          />
        </View>
      )}

      {linha.acao !== 'ignorar' && (
        <>
          <Divisor />
          <View style={estilos.tresColunas}>
            <View style={{ flex: 1 }}>
              <CampoNumero
                rotulo={`Qtd (${item.unidade})`}
                valor={item.quantidade}
                ler={(t) => Number(t.replace(',', '.'))}
                mostrar={(n) => String(n).replace('.', ',')}
                aoMudar={(q) => aoMudar(mudarQuantidadeDaLinha(linha, q))}
                decimal
              />
            </View>
            <View style={{ flex: 1 }}>
              <CampoNumero
                rotulo={`Un. por ${item.unidade}`}
                valor={linha.unidadesPorEmbalagem ?? 0}
                ler={(t) => Number.parseInt(t, 10)}
                mostrar={(n) => (n ? String(n) : '')}
                aoMudar={(n) => aoMudar({ ...linha, unidadesPorEmbalagem: n > 0 ? n : null })}
              />
            </View>
          </View>
          <CampoNumero
            rotulo="Valor do item"
            prefixo="R$"
            valor={item.valorTotal}
            ler={(t) => paraCentavos(t) ?? 0}
            mostrar={reais}
            aoMudar={(c) => aoMudar(mudarCustoDaLinha(linha, c))}
            decimal
          />
          <Text style={TEXTO.legenda}>
            {linha.unidadesPorEmbalagem === null ? 'Informe quantas unidades vêm em cada ' + item.unidade + '. ' : ''}
            Entram {unidades || '?'} un
            {unidades ? ` a ${formatarDinheiro(Math.round(item.valorTotal / unidades))} cada` : ''}
            {produto ? ` · fica com ${produto.estoque + unidades}` : ''}
          </Text>
        </>
      )}
    </Cartao>
  );
}

const reais = (c: number) => (c ? (c / 100).toFixed(2).replace('.', ',') : '');

/** Campo de número que deixa digitar à vontade e acompanha mudanças de fora (bipes). */
function CampoNumero({
  rotulo,
  prefixo,
  valor,
  ler,
  mostrar,
  aoMudar,
  decimal,
}: {
  rotulo: string;
  prefixo?: string;
  valor: number;
  ler: (texto: string) => number;
  mostrar: (valor: number) => string;
  aoMudar: (valor: number) => void;
  decimal?: boolean;
}) {
  const [texto, setTexto] = useState(() => mostrar(valor));
  const [anterior, setAnterior] = useState(valor);
  if (valor !== anterior) {
    setAnterior(valor);
    if ((ler(texto) || 0) !== valor) setTexto(mostrar(valor));
  }
  return (
    <Campo
      rotulo={rotulo}
      prefixo={prefixo}
      teclado={decimal ? 'decimal-pad' : 'number-pad'}
      value={texto}
      placeholder={decimal && prefixo ? '0,00' : ''}
      onChangeText={(t) => {
        setTexto(t);
        const n = ler(t);
        aoMudar(Number.isFinite(n) && n > 0 ? n : 0);
      }}
    />
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

function NotaConcluida({ entradas, numero, forma, aoOutra }: { entradas: EntradaEstoque[]; numero?: string; forma: FormaPagamento; aoOutra: () => void }) {
  const unidades = entradas.reduce((s, e) => s + e.unidades, 0);
  const total = entradas.reduce((s, e) => s + e.custoTotal, 0);
  return (
    <ScrollView contentContainerStyle={[estilos.tela, { paddingTop: 40 }]}>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Surgir style={estilos.selo}>
          <Check size={30} color={CORES.fundo} strokeWidth={3} />
        </Surgir>
        <Text style={[TEXTO.tituloTela, { fontSize: 26, marginTop: 8 }]}>Entrada registrada</Text>
        <Text style={TEXTO.legenda}>{numero ? `Nota ${numero} · ` : ''}{entradas.length} produto{entradas.length > 1 ? 's' : ''}</Text>
      </View>
      <Cartao>
        {entradas.map((e) => (
          <LinhaValor key={e.id} rotulo={e.produtoNome} valor={`+${e.unidades} un`} />
        ))}
        <Divisor />
        <LinhaValor rotulo="Entraram" valor={`+${unidades} un`} />
        <LinhaValor rotulo={`Pago no ${formaPagamento(forma).nome.toLowerCase()}`} valor={formatarDinheiro(total)} destaque />
      </Cartao>
      <Text style={[TEXTO.legenda, { textAlign: 'center' }]}>
        Já lançado como despesa no financeiro. O app guardou os códigos e os nomes da nota para reconhecer os produtos da próxima vez.
      </Text>
      <View style={{ gap: 10 }}>
        <Botao titulo="Bipar outra nota" icone={ScanBarcode} onPress={aoOutra} />
        <Botao titulo="Voltar ao início" variante="contorno" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48, gap: 14 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  rotulo: { fontFamily: FONTE.media, fontSize: 14, color: CORES.textoSuave },
  link: { fontFamily: FONTE.semi, fontSize: 15, color: CORES.primaria },
  secao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  tresColunas: { flexDirection: 'row', gap: 12 },
  camera: { height: 300, borderRadius: RAIO.grande, overflow: 'hidden', backgroundColor: '#000' },
  cameraCentro: { alignItems: 'center', justifyContent: 'center' },
  mira: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    top: '32%',
    bottom: '32%',
    borderWidth: 2,
    borderColor: CORES.primaria,
    borderRadius: 12,
  },
  cameraTopo: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cameraDica: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cameraDicaTexto: { fontFamily: FONTE.media, fontSize: 12, color: '#fff', flexShrink: 1 },
  cameraBotao: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  cameraRetorno: { position: 'absolute', left: 10, right: 10, bottom: 10, padding: 10, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.75)' },
  cameraRetornoTexto: { fontFamily: FONTE.semi, fontSize: 14 },
  fontes: { flexDirection: 'row', gap: 10 },
  fonte: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: RAIO.medio,
    borderWidth: 1,
    borderColor: CORES.borda,
    backgroundColor: CORES.superficie,
  },
  fonteTexto: { fontFamily: FONTE.media, fontSize: 13, color: CORES.texto },
  lendo: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: 6 },
  chave: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 11, color: CORES.textoFraco },
  pilula: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  pilulaTexto: { fontFamily: FONTE.semi, fontSize: 12 },
  escolhido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RAIO.pequeno,
    backgroundColor: CORES.superficieAlta,
  },
  opcao: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  resumo: {
    backgroundColor: CORES.destaqueFundo,
    borderWidth: 1,
    borderColor: CORES.destaqueBorda,
    borderRadius: RAIO.grande,
    padding: 20,
    gap: 10,
  },
  linhaResumo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resumoRotulo: { fontFamily: FONTE.regular, fontSize: 15, color: CORES.textoSuave },
  resumoValor: { fontFamily: FONTE.semi, fontSize: 15, color: CORES.texto, fontVariant: ['tabular-nums'] },
  resumoDivisor: { height: StyleSheet.hairlineWidth, backgroundColor: CORES.destaqueBorda, marginVertical: 4 },
  resumoTotal: { fontFamily: FONTE.semi, fontSize: 24, color: CORES.texto, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  selo: { width: 64, height: 64, borderRadius: 999, backgroundColor: CORES.receita, alignItems: 'center', justifyContent: 'center' },
});
