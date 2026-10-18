import { describe, expect, it } from 'vitest';
import { criarLojaNaMemoria, estadoDeExemplo, lembretesPendentes } from '@adegas/core';
import { AgenteAdega } from './agente';
import { blocosDeTexto, descreverPasso } from './apresentacao';
import { SEM_FALA, codificarWav, formatarDuracao, misturarEReamostrar, paraBase64, tipoDoAudio } from './audio';
import type { Buscar, ConteudoGemini, EsquemaGemini, PedidoGemini } from './gemini';
import { paraEsquemaGemini } from './gemini';
import { conectarNaMemoria } from './local';

const agora = new Date(2026, 9, 12, 14, 0);
const relogio = () => agora;

async function preparar() {
  const loja = criarLojaNaMemoria(estadoDeExemplo(agora));
  const conexao = await conectarNaMemoria(loja, { agora: relogio });
  const chamar = async (name: string, args: Record<string, unknown> = {}) => {
    const r = await conexao.cliente.callTool({ name, arguments: args });
    const texto = (r.content as { type: string; text: string }[])[0].text;
    return { erro: r.isError === true, texto, dados: r.isError ? null : (JSON.parse(texto) as Record<string, any>) };
  };
  return { loja, conexao, chamar };
}

const estoqueDe = (loja: ReturnType<typeof criarLojaNaMemoria>, id: string) => loja.estado().produtos.find((p) => p.id === id)!.estoque;

describe('servidor MCP', () => {
  it('publica todas as ferramentas, com esquemas que o Gemini aceita', async () => {
    const { conexao } = await preparar();
    const { tools } = await conexao.cliente.listTools();
    expect(tools.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        'buscar_produtos',
        'consultar_produto',
        'registrar_entrada',
        'registrar_venda',
        'resumo_financeiro',
        'relatorio_vendas',
        'criar_lembrete',
        'listar_lembretes',
      ]),
    );
    const tiposValidos = new Set(['STRING', 'NUMBER', 'INTEGER', 'BOOLEAN', 'ARRAY', 'OBJECT']);
    const conferir = (e: EsquemaGemini) => {
      expect(tiposValidos.has(e.type)).toBe(true);
      Object.values(e.properties ?? {}).forEach(conferir);
      if (e.items) conferir(e.items);
      expect(Object.keys(e)).not.toContain('additionalProperties');
    };
    for (const t of tools) {
      expect(t.title).toBeTruthy();
      conferir(paraEsquemaGemini(t.inputSchema));
    }
    const entrada = paraEsquemaGemini(tools.find((t) => t.name === 'registrar_entrada')!.inputSchema);
    expect(entrada.required).toEqual(['produto', 'embalagem', 'quantidade']);
    expect(entrada.properties?.embalagem.enum).toEqual(['unidade', 'fardo']);
    expect(entrada.properties?.novo_produto.type).toBe('OBJECT');
  });

  it('consulta produto pelo nome', async () => {
    const { chamar } = await preparar();
    const r = await chamar('consultar_produto', { produto: 'heineken' });
    expect(r.erro).toBe(false);
    expect(r.dados).toMatchObject({ id: 'heineken-ln', preco_venda: 'R$ 8,00' });
    expect(r.dados!.vendidos_ultimos_30_dias).toBeGreaterThan(0);
  });

  it('registra entrada em fardo usando o fardo da última compra', async () => {
    const { loja, chamar } = await preparar();
    const antes = estoqueDe(loja, 'brahma-lata');
    const r = await chamar('registrar_entrada', { produto: 'brahma', embalagem: 'fardo', quantidade: 2, custo: 36 });
    expect(r.erro).toBe(false);
    expect(estoqueDe(loja, 'brahma-lata')).toBe(antes + 24);
    expect(r.dados).toMatchObject({ entrou_unidades: 24, custo_total: 'R$ 72,00', estoque_agora: antes + 24 });
    // A compra virou despesa no financeiro.
    expect(loja.estado().lancamentos[0]).toMatchObject({ categoria: 'mercadoria', valor: 7200 });
  });

  it('não confunde produto parecido e cadastra produto novo só com os dados', async () => {
    const { loja, chamar } = await preparar();
    const parecido = await chamar('registrar_entrada', { produto: 'Heineken 600ml', embalagem: 'unidade', quantidade: 12, custo: 7 });
    expect(parecido.erro).toBe(true);
    expect(parecido.texto).toContain('Heineken Long Neck');

    const novo = await chamar('registrar_entrada', {
      produto: 'Heineken 600ml',
      embalagem: 'unidade',
      quantidade: 12,
      custo: 7,
      novo_produto: { categoria: 'cerveja', preco_venda: 12, estoque_minimo: 6 },
    });
    expect(novo.erro).toBe(false);
    expect(loja.estado().produtos.find((p) => p.nome === 'Heineken 600ml')).toMatchObject({ estoque: 12, precoVenda: 1200, custoMedio: 700 });
  });

  it('pede para escolher quando o nome serve para mais de um produto', async () => {
    const { chamar } = await preparar();
    const r = await chamar('consultar_produto', { produto: 'lata' });
    expect(r.erro).toBe(true);
    expect(r.texto).toMatch(/Brahma.*Skol|Skol.*Brahma/);
  });

  it('registra venda e despesa', async () => {
    const { loja, chamar } = await preparar();
    const antes = estoqueDe(loja, 'red-bull');
    const venda = await chamar('registrar_venda', {
      itens: [{ produto: 'red bull', quantidade: 2 }],
      forma_pagamento: 'dinheiro',
      valor_recebido: 30,
    });
    expect(venda.dados).toMatchObject({ total: 'R$ 24,00', troco: 'R$ 6,00' });
    expect(estoqueDe(loja, 'red-bull')).toBe(antes - 2);

    const conta = await chamar('registrar_lancamento', { tipo: 'despesa', categoria: 'contas', valor: 289.9, descricao: 'Luz' });
    expect(conta.dados).toMatchObject({ valor: 'R$ 289,90', categoria: 'Luz, água e internet' });
    const lista = await chamar('listar_lancamentos', { periodo: 'hoje', busca: 'luz' });
    expect(lista.dados!.encontradas).toBe(1);
    expect(lista.dados!.movimentacoes[0].pode_excluir).toBe(true);
  });

  it('busca financeiro e relatório por período', async () => {
    const { chamar } = await preparar();
    const mes = await chamar('resumo_financeiro', { periodo: '30d' });
    expect(mes.dados!.periodo).toBe('últimos 30 dias');
    const rel = await chamar('relatorio_vendas', { inicio: '2026-10-05', fim: '2026-10-11' });
    expect(rel.dados!.periodo).toBe('de 05/10/2026 a 11/10/2026');
    expect(rel.dados!.produtos_mais_vendidos.length).toBeGreaterThan(0);
    expect(rel.dados!.horarios_de_pico.length).toBeGreaterThan(0);
    const ruim = await chamar('relatorio_vendas', { inicio: '05/10/2026' });
    expect(ruim.erro).toBe(true);
  });

  it('cria, lista e conclui lembretes', async () => {
    const { loja, chamar } = await preparar();
    const r = await chamar('criar_lembrete', { texto: 'Pagar a conta de luz', quando: '2026-10-13T10:00' });
    expect(r.dados).toMatchObject({ quando: 'amanhã, 10:00', situacao: 'próximo' });
    const lista = await chamar('listar_lembretes');
    expect(lista.dados!.pendentes.map((l: { texto: string }) => l.texto)).toContain('Pagar a conta de luz');
    await chamar('concluir_lembrete', { lembrete: 'conta de luz' });
    expect(lembretesPendentes(loja.estado()).some((l) => l.texto === 'Pagar a conta de luz')).toBe(false);
  });

  it('recusa argumentos inválidos sem mexer nos dados', async () => {
    const { loja, chamar } = await preparar();
    const antes = loja.estado();
    const r = await chamar('registrar_entrada', { produto: 'skol', embalagem: 'caixa', quantidade: 0 });
    expect(r.erro).toBe(true);
    expect(loja.estado()).toBe(antes);
  });
});

describe('mesas pelo MCP', () => {
  it('a mesa 7 pediu coca, água e skol: abre a mesa, lança e tira do estoque', async () => {
    const { loja, chamar } = await preparar();
    const antes = estoqueDe(loja, 'skol-lata');
    const r = await chamar('lancar_na_mesa', {
      mesa: '7',
      itens: [
        { produto: 'coca', quantidade: 1 },
        { produto: 'água', quantidade: 1 },
        { produto: 'skol', quantidade: 1 },
      ],
    });
    expect(r.erro).toBe(false);
    expect(r.dados).toMatchObject({ mesa: 'Mesa 7', observacao: 'A mesa foi aberta agora.', total_da_mesa: 'R$ 20,50', itens_na_mesa: 3 });
    expect(estoqueDe(loja, 'skol-lata')).toBe(antes - 1);

    const mais = await chamar('lancar_na_mesa', { mesa: 'mesa 7', itens: [{ produto: 'skol', quantidade: 2 }] });
    expect(mais.dados).toMatchObject({ total_da_mesa: 'R$ 29,50', itens_na_mesa: 5 });
    expect(mais.dados!.observacao).toBeUndefined();

    const conta = await chamar('consultar_mesa', { mesa: '7', dividir_por: 2 });
    expect(conta.dados).toMatchObject({ mesa: 'Mesa 7', total: 'R$ 29,50', por_pessoa: 'R$ 14,75' });
    expect(conta.dados!.pedidos.find((p: { produto: string }) => p.produto === 'Skol Lata 350ml').quantidade).toBe(3);
  });

  it('tira da mesa, fecha com troco e a conta entra no financeiro', async () => {
    const { loja, chamar } = await preparar();
    await chamar('lancar_na_mesa', { mesa: '7', itens: [{ produto: 'red bull', quantidade: 2 }] });
    const tirou = await chamar('remover_da_mesa', { mesa: '7', produto: 'red bull' });
    expect(tirou.dados).toMatchObject({ tirado: '1× Red Bull 250ml', total: 'R$ 12,00' });

    const fechou = await chamar('fechar_mesa', { mesa: '7', forma_pagamento: 'dinheiro', valor_recebido: 20 });
    expect(fechou.dados).toMatchObject({ total: 'R$ 12,00', troco: 'R$ 8,00', forma_pagamento: 'Dinheiro' });
    expect(loja.estado().lancamentos[0]).toMatchObject({ descricao: 'Mesa 7 · 1 item · Dinheiro', valor: 1200 });
    const lista = await chamar('listar_mesas');
    expect(lista.dados!.abertas.map((m: { mesa: string }) => m.mesa)).toEqual(['Mesa 4', 'Mesa 10']);
    expect(lista.dados!.fechadas_hoje).toBe(1);

    const denovo = await chamar('fechar_mesa', { mesa: '7', forma_pagamento: 'pix' });
    expect(denovo.erro).toBe(true);
    expect(denovo.texto).toContain('Mesas abertas: Mesa 4, Mesa 10');
  });

  it('não abre mesa se faltar estoque e cancela devolvendo tudo', async () => {
    const { loja, chamar } = await preparar();
    const falta = await chamar('lancar_na_mesa', { mesa: '9', itens: [{ produto: 'red label', quantidade: 50 }] });
    expect(falta.erro).toBe(true);
    expect(loja.estado().comandas.some((c) => c.mesa === '9')).toBe(false);

    const antes = estoqueDe(loja, 'heineken-ln');
    const cancelou = await chamar('cancelar_mesa', { mesa: '4' });
    expect(cancelou.dados).toMatchObject({ cancelado: true, mesa: 'Mesa 4' });
    expect(estoqueDe(loja, 'heineken-ln')).toBe(antes + 6);
  });
});

describe('assistente conforme a permissão', () => {
  it('funcionário só recebe as ferramentas que pode usar e não vê custo', async () => {
    const loja = criarLojaNaMemoria(estadoDeExemplo(agora));
    const conexao = await conectarNaMemoria(loja, { agora: relogio, permissoes: ['vender', 'mesas', 'estoque'] });
    const { tools } = await conexao.cliente.listTools();
    const nomes = tools.map((t) => t.name);
    expect(nomes).toContain('lancar_na_mesa');
    expect(nomes).toContain('consultar_produto');
    expect(nomes).toContain('criar_lembrete');
    for (const proibida of ['registrar_entrada', 'cancelar_mesa', 'remover_da_mesa', 'resumo_financeiro', 'relatorio_vendas', 'editar_produto']) {
      expect(nomes).not.toContain(proibida);
    }
    const r = await conexao.cliente.callTool({ name: 'consultar_produto', arguments: { produto: 'heineken' } });
    const dados = JSON.parse((r.content as { text: string }[])[0].text);
    expect(dados.preco_venda).toBe('R$ 8,00');
    expect(dados.custo_medio).toBeUndefined();
    expect(dados.margem).toBeUndefined();
    expect(dados.valor_em_estoque_pelo_custo).toBeUndefined();
    // Ferramenta que não foi publicada não pode ser chamada.
    const proibida = await conexao.cliente.callTool({ name: 'resumo_financeiro', arguments: {} }).catch(() => ({ isError: true }));
    expect(proibida.isError).toBe(true);
  });

  it('o agente sabe quem está usando', async () => {
    const { conexao } = await preparar();
    const { buscar, pedidos } = geminiFalso([() => modelo({ text: 'Oi, Ana!' })]);
    const agente = new AgenteAdega({
      cliente: conexao.cliente,
      chave: 'k',
      buscar,
      agora: relogio,
      quemUsa: { nome: 'Ana', papel: 'funcionario', permissoes: ['Vender no balcão', 'Atender mesas'] },
    });
    await agente.enviar('oi');
    const instrucao = pedidos[0].corpo!.systemInstruction!.parts[0].text;
    expect(instrucao).toContain('Quem está usando: Ana, funcionário. Pode: Vender no balcão, Atender mesas.');
    expect(instrucao).toContain('precisa de um administrador');
  });
});

// ---------- Agente com um Gemini de mentira ----------

function geminiFalso(respostas: ((pedido: PedidoGemini) => { status?: number; corpo: unknown })[]) {
  const pedidos: { url: string; corpo?: PedidoGemini; chave?: string }[] = [];
  const buscar: Buscar = async (url, init) => {
    const corpo = init.body ? (JSON.parse(init.body) as PedidoGemini) : undefined;
    pedidos.push({ url, corpo, chave: init.headers['x-goog-api-key'] });
    const proxima = respostas.shift();
    if (!proxima) throw new Error('pedido a mais');
    const { status = 200, corpo: saida } = proxima(corpo as PedidoGemini);
    return { ok: status < 400, status, json: async () => saida, text: async () => JSON.stringify(saida) };
  };
  return { buscar, pedidos };
}

const modelo = (...parts: object[]) => ({ corpo: { candidates: [{ content: { role: 'model', parts }, finishReason: 'STOP' }] } });

describe('agente (Gemini + MCP)', () => {
  it('chama a ferramenta pedida pelo Gemini e devolve a resposta final', async () => {
    const { conexao } = await preparar();
    const { buscar, pedidos } = geminiFalso([
      () => modelo({ functionCall: { name: 'consultar_produto', args: { produto: 'skol' } }, thoughtSignature: 'assinatura-1' }),
      () => modelo({ text: 'Você tem **12 latas** de Skol.' }),
    ]);
    const agente = new AgenteAdega({ cliente: conexao.cliente, chave: 'chave-teste', buscar, agora: relogio });
    const passosVistos: string[] = [];
    const r = await agente.enviar('quanto tem de skol?', { aoMudar: (p) => passosVistos.push(p.map((x) => x.situacao).join()) });

    expect(r.texto).toBe('Você tem **12 latas** de Skol.');
    expect(r.passos).toMatchObject([{ ferramenta: 'consultar_produto', titulo: 'Consultar produto', situacao: 'ok', alterouDados: false }]);
    expect(passosVistos).toEqual(['rodando', 'ok']);

    const [primeiro, segundo] = pedidos;
    expect(primeiro.url).toContain('/models/gemini-3.8-flash:generateContent');
    expect(primeiro.chave).toBe('chave-teste');
    expect(primeiro.corpo!.systemInstruction!.parts[0].text).toContain('segunda-feira, 12/10/2026, 14:00');
    const declaracoes = primeiro.corpo!.tools![0].functionDeclarations;
    expect(declaracoes).toHaveLength(24);
    // Ferramenta sem parâmetros vai sem "parameters" (o Gemini recusa objeto vazio).
    expect(declaracoes.find((d) => d.name === 'resumo_estoque')!.parameters).toBeUndefined();

    // A segunda chamada leva de volta a chamada (com a assinatura) e o resultado.
    const historico = segundo.corpo!.contents as ConteudoGemini[];
    expect(historico.map((c) => c.role)).toEqual(['user', 'model', 'user']);
    expect(historico[1].parts[0].thoughtSignature).toBe('assinatura-1');
    const resposta = historico[2].parts[0].functionResponse!;
    expect(resposta.name).toBe('consultar_produto');
    expect((resposta.response.resultado as { nome: string }).nome).toBe('Skol Lata 350ml');
  });

  it('marca o que alterou dados e devolve erros da ferramenta para o modelo', async () => {
    const { loja, conexao } = await preparar();
    const antes = estoqueDe(loja, 'gelo-5kg');
    const { buscar, pedidos } = geminiFalso([
      () =>
        modelo(
          { functionCall: { name: 'registrar_entrada', args: { produto: 'gelo', embalagem: 'unidade', quantidade: 10, custo: 7 } } },
          { functionCall: { name: 'consultar_produto', args: { produto: 'xyz' } } },
        ),
      () => modelo({ text: 'Entrada registrada.' }),
    ]);
    const agente = new AgenteAdega({ cliente: conexao.cliente, chave: 'k', buscar, agora: relogio });
    const r = await agente.enviar('chegaram 10 gelos a 7 reais');
    expect(estoqueDe(loja, 'gelo-5kg')).toBe(antes + 10);
    expect(r.passos.map((p) => [p.situacao, p.alterouDados])).toEqual([
      ['ok', true],
      ['erro', false],
    ]);
    const respostas = (pedidos[1].corpo!.contents as ConteudoGemini[])[2].parts;
    expect(respostas).toHaveLength(2);
    expect(String(respostas[1].functionResponse!.response.erro)).toContain('xyz');
  });

  it('troca para outro Flash quando o modelo não existe', async () => {
    const { conexao } = await preparar();
    const { buscar, pedidos } = geminiFalso([
      () => ({ status: 404, corpo: { error: { message: 'models/gemini-3.8-flash is not found', status: 'NOT_FOUND' } } }),
      () => ({
        corpo: {
          models: [
            { name: 'models/gemini-3.6-flash', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-3.7-flash-lite', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-3.7-flash', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-3.7-flash-image', supportedGenerationMethods: ['generateContent'] },
          ],
        },
      }),
      () => modelo({ text: 'Oi!' }),
    ]);
    const agente = new AgenteAdega({ cliente: conexao.cliente, chave: 'k', buscar, agora: relogio });
    const r = await agente.enviar('oi');
    expect(r.texto).toBe('Oi!');
    expect(agente.modeloEmUso).toBe('gemini-3.7-flash');
    expect(pedidos[2].url).toContain('/models/gemini-3.7-flash:generateContent');
  });

  it('explica chave inválida e deixa reenviar a mesma mensagem', async () => {
    const { conexao } = await preparar();
    const { buscar, pedidos } = geminiFalso([
      () => ({ status: 400, corpo: { error: { message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } } }),
      () => modelo({ text: 'Agora foi.' }),
    ]);
    const agente = new AgenteAdega({ cliente: conexao.cliente, chave: 'errada', buscar, agora: relogio });
    await expect(agente.enviar('oi')).rejects.toThrow('A chave do Gemini não é válida');
    await agente.enviar('oi');
    expect((pedidos[1].corpo!.contents as ConteudoGemini[]).map((c) => c.role)).toEqual(['user']);
  });
});

describe('áudio', () => {
  it('reconhece os formatos que o Gemini aceita, inclusive o áudio do WhatsApp', () => {
    expect(tipoDoAudio('PTT-20261012-WA0001.opus')).toBe('audio/ogg');
    expect(tipoDoAudio('AUD-20261012.OGG')).toBe('audio/ogg');
    expect(tipoDoAudio('Gravação nova.m4a')).toBe('audio/mp4');
    expect(tipoDoAudio('recado', 'audio/mpeg')).toBe('audio/mp3');
    expect(tipoDoAudio(undefined, 'audio/webm;codecs=opus')).toBe('audio/webm');
    expect(tipoDoAudio('ligacao.amr', 'audio/amr')).toBeNull();
    expect(formatarDuracao(7.4)).toBe('0:07');
    expect(formatarDuracao(102)).toBe('1:42');
  });

  it('gera base64 igual ao do Node', () => {
    for (let n = 0; n < 6; n++) {
      const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 97 + 13) % 256);
      expect(paraBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
    }
    const grande = Uint8Array.from({ length: 20000 }, (_, i) => (i * 31 + (i >> 3)) % 256);
    expect(paraBase64(grande)).toBe(Buffer.from(grande).toString('base64'));
  });

  it('monta um WAV mono de 16 bits a partir das amostras', () => {
    const wav = codificarWav(Float32Array.from([0, 0.5, -1, 2]), 16000);
    const b = Buffer.from(wav);
    expect(b.toString('ascii', 0, 4)).toBe('RIFF');
    expect(b.readUInt32LE(4)).toBe(36 + 8);
    expect(b.toString('ascii', 8, 16)).toBe('WAVEfmt ');
    expect([b.readUInt16LE(20), b.readUInt16LE(22), b.readUInt32LE(24), b.readUInt16LE(34)]).toEqual([1, 1, 16000, 16]);
    expect(b.toString('ascii', 36, 40)).toBe('data');
    expect(b.readUInt32LE(40)).toBe(8);
    expect([b.readInt16LE(44), b.readInt16LE(46), b.readInt16LE(48), b.readInt16LE(50)]).toEqual([0, 16383, -32768, 32767]);
  });

  it('junta os canais e reduz para 16 kHz', () => {
    const esquerda = new Float32Array(48000).fill(0.5);
    const direita = new Float32Array(48000).fill(-0.1);
    const mono = misturarEReamostrar([esquerda, direita], 48000, 16000);
    expect(mono.length).toBe(16000);
    expect(mono[1234]).toBeCloseTo(0.2);
  });

  it('o agente transcreve o áudio e responde à transcrição', async () => {
    const { loja, conexao } = await preparar();
    const antes = estoqueDe(loja, 'skol-lata');
    const { buscar, pedidos } = geminiFalso([
      () => modelo({ text: '“Chegaram 2 fardos de Skol por 33 reais cada.”' }),
      () => modelo({ functionCall: { name: 'registrar_entrada', args: { produto: 'skol', embalagem: 'fardo', quantidade: 2, custo: 33 } } }),
      () => modelo({ text: 'Entrada registrada.' }),
    ]);
    const agente = new AgenteAdega({ cliente: conexao.cliente, chave: 'k', buscar, agora: relogio });
    const texto = await agente.ouvir({ dados: 'UklGRgAAAAA=', mimeType: 'audio/wav' });
    expect(texto).toBe('Chegaram 2 fardos de Skol por 33 reais cada.');

    // A transcrição vai só com o áudio e as instruções de transcrever, sem ferramentas.
    const transcricao = pedidos[0].corpo!;
    expect(transcricao.tools).toBeUndefined();
    expect(transcricao.systemInstruction!.parts[0].text).toContain('Escreva exatamente o que foi falado');
    expect(transcricao.contents[0].parts[0].inlineData).toEqual({ mimeType: 'audio/wav', data: 'UklGRgAAAAA=' });

    const r = await agente.enviar(texto, { deAudio: true });
    expect(r.texto).toBe('Entrada registrada.');
    expect(estoqueDe(loja, 'skol-lata')).toBeGreaterThan(antes);
    const conversa = pedidos[1].corpo!;
    expect(conversa.contents).toHaveLength(1);
    expect(conversa.contents[0].parts[0].text).toBe('[Áudio transcrito] Chegaram 2 fardos de Skol por 33 reais cada.');
    expect(conversa.systemInstruction!.parts[0].text).toContain('Você é o Pop AI, o assistente da adega Pop');
    expect(conversa.systemInstruction!.parts[0].text).toContain('vieram de um áudio');
  });

  it('avisa quando o áudio não tem fala e tenta outro nome de tipo se o Gemini recusar', async () => {
    const { conexao } = await preparar();
    const { buscar, pedidos } = geminiFalso([
      () => modelo({ text: SEM_FALA }),
      () => ({ status: 400, corpo: { error: { message: 'Unsupported MIME type: audio/mp4', status: 'INVALID_ARGUMENT' } } }),
      () => modelo({ text: 'Fecha a mesa 10 no Pix.' }),
    ]);
    const agente = new AgenteAdega({ cliente: conexao.cliente, chave: 'k', buscar, agora: relogio });
    expect(await agente.ouvir({ dados: 'AAAA', mimeType: 'audio/wav' })).toBe(SEM_FALA);
    expect(await agente.ouvir({ dados: 'AAAA', mimeType: 'audio/mp4' })).toBe('Fecha a mesa 10 no Pix.');
    expect(pedidos[2].corpo!.contents[0].parts[0].inlineData!.mimeType).toBe('audio/aac');
  });
});

describe('apresentação', () => {
  it('descreve passos e lê negrito e listas', () => {
    expect(
      descreverPasso({ id: '1', ferramenta: 'resumo_financeiro', titulo: 'Resumo financeiro', argumentos: { periodo: '7d' }, situacao: 'ok', alterouDados: false }),
    ).toBe('Resumo financeiro · 7 dias');
    expect(blocosDeTexto('Saldo: **R$ 10,00**\n- Pix: R$ 5\n- Dinheiro')).toEqual([
      { tipo: 'paragrafo', trechos: [{ texto: 'Saldo: ', negrito: false }, { texto: 'R$ 10,00', negrito: true }] },
      { tipo: 'item', trechos: [{ texto: 'Pix: R$ 5', negrito: false }] },
      { tipo: 'item', trechos: [{ texto: 'Dinheiro', negrito: false }] },
    ]);
  });
});
