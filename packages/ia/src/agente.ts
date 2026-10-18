import { NOME_DA_LOJA, NOME_DO_ASSISTENTE } from '@adegas/core';
import type { Client } from '@modelcontextprotocol/client';
import type { AnexoParaEnviar, TipoAnexo } from './anexos';
import { ILEGIVEL, LIMITE_TEXTO_ANEXO, NOME_DO_TIPO } from './anexos';
import type { AudioParaEnviar } from './audio';
import { SEM_FALA } from './audio';
import type { Buscar, ConteudoGemini, DeclaracaoFuncao, ParteGemini, PedidoGemini } from './gemini';
import { ErroGemini, MODELO_PADRAO, escolherModeloFlash, gerarConteudo, paraEsquemaGemini } from './gemini';

export interface OpcoesAgente {
  /** Cliente MCP já conectado ao servidor da adega. */
  cliente: Pick<Client, 'listTools' | 'callTool'>;
  /** Chave da API do Gemini. */
  chave: string;
  modelo?: string;
  buscar?: Buscar;
  agora?: () => Date;
  quemUsa?: QuemUsa;
}

/** Uma ferramenta que o assistente usou para responder. */
export interface PassoAgente {
  id: string;
  ferramenta: string;
  /** Nome amigável (o "title" da ferramenta no MCP). */
  titulo: string;
  argumentos: Record<string, unknown>;
  situacao: 'rodando' | 'ok' | 'erro';
  /** Mudou dados (entrada, venda, lembrete...) em vez de só consultar. */
  alterouDados: boolean;
  erro?: string;
}

export interface RespostaAgente {
  texto: string;
  passos: PassoAgente[];
}

/** Proteção contra o modelo ficar chamando ferramenta sem parar. */
const MAXIMO_RODADAS = 8;

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

function agoraPorExtenso(agora: Date): string {
  const d = (n: number) => String(n).padStart(2, '0');
  const fuso = -agora.getTimezoneOffset();
  const sinal = fuso >= 0 ? '+' : '-';
  const fusoTexto = `UTC${sinal}${d(Math.floor(Math.abs(fuso) / 60))}:${d(Math.abs(fuso) % 60)}`;
  return (
    `${DIAS[agora.getDay()]}, ${d(agora.getDate())}/${d(agora.getMonth() + 1)}/${agora.getFullYear()}, ` +
    `${d(agora.getHours())}:${d(agora.getMinutes())} (${fusoTexto}). ` +
    `Em formato ISO local: ${agora.getFullYear()}-${d(agora.getMonth() + 1)}-${d(agora.getDate())}T${d(agora.getHours())}:${d(agora.getMinutes())}`
  );
}

/** Quem está conversando com o assistente (para ele saber o que a pessoa pode pedir). */
export interface QuemUsa {
  nome: string;
  papel: 'admin' | 'funcionario';
  /** Nomes das permissões, ex.: "Atender mesas". */
  permissoes: string[];
}

function sobreQuemUsa(quem?: QuemUsa): string[] {
  if (!quem) return [];
  if (quem.papel === 'admin') return [`Quem está usando: ${quem.nome}, administrador (pode tudo).`];
  return [
    `Quem está usando: ${quem.nome}, funcionário. Pode: ${quem.permissoes.join(', ') || 'só lembretes'}.`,
    '- Se a pessoa pedir algo fora disso (ou que nenhuma ferramenta faz), diga com gentileza que precisa de um administrador. Não informe custos nem lucro.',
  ];
}

/** Começo das mensagens que vieram de um áudio (o modelo recebe a transcrição). */
export const PREFIXO_AUDIO = '[Áudio transcrito]';

export { NOME_DO_ASSISTENTE };

export function instrucoesDoAgente(agora: Date, quem?: QuemUsa): string {
  return [
    `Você é o ${NOME_DO_ASSISTENTE}, o assistente da adega ${NOME_DA_LOJA} (loja de bebidas). Fala português do Brasil, de forma curta, simpática e direta, como um gerente experiente. Se perguntarem seu nome, você é o ${NOME_DO_ASSISTENTE}.`,
    `Agora é ${agoraPorExtenso(agora)}.`,
    ...sobreQuemUsa(quem),
    '',
    'Como trabalhar:',
    '- Use as ferramentas para qualquer número ou informação da loja. Nunca invente estoque, valores ou datas.',
    '- Você pode registrar entradas de mercadoria, vendas, despesas, ajustes de estoque, mudar preços e criar lembretes quando a pessoa pedir. Não registre nada se ela só estiver perguntando.',
    '- Se faltar algo essencial (qual produto, quantidade, valor de uma despesa) ou houver mais de um produto possível, pergunte antes de registrar.',
    '- Mesas: "a mesa 10 pediu..." vai para a conta da mesa (lancar_na_mesa), não é venda. A venda só acontece quando a conta é fechada (fechar_mesa, com a forma de pagamento). "Quanto deu a mesa 10?" é consultar_mesa.',
    '- Depois de registrar, confirme em uma frase o que foi feito, com os números (ex.: "Entrada registrada: 2 fardos de Skol (24 un). Estoque agora: 54.").',
    '- Não repita um registro que já foi feito nesta conversa, a não ser que a pessoa peça de novo.',
    '- Datas relativas ("amanhã às 10", "sexta") viram AAAA-MM-DDTHH:MM no horário local acima. Sem hora, use 09:00.',
    '- "Mês passado", "semana passada" etc.: calcule inicio e fim (AAAA-MM-DD) a partir da data de hoje.',
    '- Valores sempre em reais (R$ 12,50). Quantidades de estoque são em unidades.',
    '- Respostas para ler no celular: no máximo uns 6 itens em lista, com "- " no começo; use **negrito** só para o número principal. Sem tabelas e sem títulos.',
    '- Anexos: a pessoa pode mandar fotos, PDFs, planilhas, documentos, vídeos e áudios. O conteúdo chega já lido, entre "[Anexo ...]" e "[Fim do anexo ...]". Use esse conteúdo para responder e, quando ela pedir, para registrar (ex.: entrada de uma nota fiscal item por item, despesa de um boleto, preços de uma lista). Se ela mandou só o anexo, diga em 1 ou 2 frases o que é (tipo, de quem, valor total) e pergunte o que fazer: não registre nada sem pedido. A leitura de foto pode errar números: confira se os itens somam o total e, se não baterem, avise antes de registrar.',
    `- Mensagens que começam com "${PREFIXO_AUDIO}" vieram de um áudio: a pessoa falou, ou encaminhou o áudio de alguém (um fornecedor, um cliente). A transcrição pode errar nomes e números: se algo essencial parecer estranho, confirme antes de registrar. Se o áudio for um recado de outra pessoa e não estiver claro o que fazer, resuma em uma frase e pergunte.`,
  ].join('\n');
}

/** Instruções para só transcrever o áudio, sem responder. */
export const INSTRUCOES_TRANSCRICAO = [
  'Você transcreve áudios em português do Brasil para o sistema de uma adega (loja de bebidas).',
  'Escreva exatamente o que foi falado, com pontuação. Números em algarismos ("3 fardos", "R$ 33,50", "mesa 10"). Nomes de bebidas como se escrevem (Skol, Heineken, Red Bull).',
  'Não responda, não resuma e não comente o conteúdo: só a transcrição.',
  `Se não houver fala que dê para entender, responda apenas ${SEM_FALA}`,
].join('\n');

/** Instruções para ler um arquivo (foto, PDF, vídeo) e passar o conteúdo para a conversa. */
export const INSTRUCOES_LEITURA = [
  'Você lê arquivos (fotos, PDFs, vídeos) enviados ao sistema de uma adega (loja de bebidas), para outro assistente usar.',
  'Escreva em português do Brasil tudo o que importa no arquivo, sem responder, sem opinar e sem tomar decisões:',
  '- Primeiro, em uma linha, o que é (ex.: "Nota fiscal da Distribuidora X, 12/10/2026", "Boleto", "Lista de preços", "Comprovante de Pix", "Foto da prateleira de cervejas").',
  '- Depois, todo o texto que aparece, com números, valores, datas, nomes e códigos exatos.',
  '- Notas, pedidos, cupons e listas de preço: um item por linha, com produto, quantidade, embalagem (unidade, fardo, caixa), valor unitário e total. No fim: totais, descontos, impostos, forma de pagamento e vencimento.',
  '- Foto de produtos ou do estoque: quais produtos aparecem e quantos dá para contar.',
  '- Vídeo: o que acontece e o que é falado.',
  '- Documento longo: transcreva por inteiro o que tem produtos, números, valores, datas e nomes; resuma o resto.',
  `- Parte que não dá para ler: escreva ${ILEGIVEL} no lugar. Se nada der para ler, responda apenas ${ILEGIVEL}`,
].join('\n');

/** Um anexo depois de lido: o que vai para a conversa. */
export interface AnexoLido {
  nome: string;
  tipo: TipoAnexo;
  /** Texto lido, transcrição do áudio ou texto tirado do arquivo. */
  conteudo: string;
  legivel: boolean;
}

/** A mensagem da pessoa com o conteúdo dos anexos, do jeito que o modelo recebe. */
export function mensagemComAnexos(texto: string, anexos: AnexoLido[]): string {
  const partes = anexos.map((a, i) => {
    const cabeca = `[Anexo ${i + 1}: "${a.nome}" (${NOME_DO_TIPO[a.tipo]})`;
    if (!a.legivel) return `${cabeca} — não deu para ler]`;
    const conteudo = a.conteudo.length > LIMITE_TEXTO_ANEXO ? `${a.conteudo.slice(0, LIMITE_TEXTO_ANEXO)}\n[...]` : a.conteudo;
    return `${cabeca} — ${a.tipo === 'audio' ? 'transcrição' : 'conteúdo'}]\n${conteudo}\n[Fim do anexo ${i + 1}]`;
  });
  partes.push(texto.trim() ? `Mensagem da pessoa: ${texto.trim()}` : 'A pessoa mandou só o anexo, sem escrever nada.');
  return partes.join('\n\n');
}

/** Se o Gemini recusar o tipo do arquivo, o mesmo áudio com outro nome de tipo. */
const TIPO_ALTERNATIVO: Record<string, string> = { 'audio/mp4': 'audio/aac', 'audio/webm': 'audio/ogg' };

/**
 * O agente: conversa com o Gemini e, quando ele pede, chama as ferramentas do
 * servidor MCP da adega. Guarda o histórico da conversa.
 */
export class AgenteAdega {
  private historico: ConteudoGemini[] = [];
  private ferramentas?: { declaracoes: DeclaracaoFuncao[]; info: Map<string, { titulo: string; alteraDados: boolean }> };
  private modelo: string;
  private readonly opcoes: OpcoesAgente;

  constructor(opcoes: OpcoesAgente) {
    this.opcoes = opcoes;
    this.modelo = opcoes.modelo?.trim() || MODELO_PADRAO;
  }

  get modeloEmUso(): string {
    return this.modelo;
  }

  /** Começa uma conversa nova (esquece o que foi dito). */
  limpar(): void {
    this.historico = [];
  }

  private async carregarFerramentas() {
    if (this.ferramentas) return this.ferramentas;
    const { tools } = await this.opcoes.cliente.listTools();
    const info = new Map<string, { titulo: string; alteraDados: boolean }>();
    const declaracoes: DeclaracaoFuncao[] = tools.map((t) => {
      info.set(t.name, { titulo: t.title ?? t.annotations?.title ?? t.name, alteraDados: t.annotations?.readOnlyHint !== true });
      const parametros = paraEsquemaGemini(t.inputSchema);
      // O Gemini não aceita objeto sem nenhuma propriedade: nesse caso, a função fica sem parâmetros.
      const temParametros = Object.keys(parametros.properties ?? {}).length > 0;
      return { name: t.name, description: t.description, ...(temParametros ? { parameters: parametros } : {}) };
    });
    this.ferramentas = { declaracoes, info };
    return this.ferramentas;
  }

  private async perguntarAoGemini(sinal?: AbortSignal): Promise<ConteudoGemini> {
    const { declaracoes } = await this.carregarFerramentas();
    const agora = this.opcoes.agora?.() ?? new Date();
    return this.chamarGemini(
      {
        systemInstruction: { parts: [{ text: instrucoesDoAgente(agora, this.opcoes.quemUsa) }] },
        contents: this.historico,
        tools: [{ functionDeclarations: declaracoes }],
        toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
      },
      sinal,
    );
  }

  private async chamarGemini(pedido: PedidoGemini, sinal?: AbortSignal): Promise<ConteudoGemini> {
    const opcoes = { chave: this.opcoes.chave, buscar: this.opcoes.buscar, sinal };
    try {
      return await gerarConteudo(pedido, { ...opcoes, modelo: this.modelo });
    } catch (erro) {
      // Modelo aposentado ou com outro nome: tenta o Flash mais novo que a chave enxerga.
      if (erro instanceof ErroGemini && erro.status === 404) {
        const outro = await escolherModeloFlash(opcoes).catch(() => null);
        if (outro && outro !== this.modelo) {
          this.modelo = outro;
          return gerarConteudo(pedido, { ...opcoes, modelo: outro });
        }
      }
      throw erro;
    }
  }

  /**
   * Transcreve um áudio (mensagem de voz ou áudio recebido de alguém). Devolve o
   * texto falado, ou SEM_FALA. Não entra no histórico: quem chama manda a
   * transcrição com enviar(texto, { deAudio: true }).
   */
  async ouvir(audio: Pick<AudioParaEnviar, 'dados' | 'mimeType'>, { sinal }: { sinal?: AbortSignal } = {}): Promise<string> {
    const pedir = (mimeType: string) =>
      this.chamarGemini(
        {
          systemInstruction: { parts: [{ text: INSTRUCOES_TRANSCRICAO }] },
          contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: audio.dados } }, { text: 'Transcreva este áudio.' }] }],
          generationConfig: { temperature: 0 },
        },
        sinal,
      );
    let resposta: ConteudoGemini;
    try {
      resposta = await pedir(audio.mimeType);
    } catch (erro) {
      const outro = TIPO_ALTERNATIVO[audio.mimeType];
      if (!(erro instanceof ErroGemini && erro.status === 400 && outro && /formato/.test(erro.message))) throw erro;
      resposta = await pedir(outro);
    }
    const texto = resposta.parts
      .filter((p) => typeof p.text === 'string' && !p.thought)
      .map((p) => p.text)
      .join('')
      .trim()
      .replace(/^["“]|["”]$/g, '')
      .trim();
    return !texto || texto.toLowerCase().includes(SEM_FALA) ? SEM_FALA : texto;
  }

  /**
   * Lê um anexo: o Gemini transcreve o áudio ou lê a foto, o PDF e o vídeo; texto,
   * planilha e documento já vêm com o texto tirado no aparelho.
   */
  async ler(anexo: AnexoParaEnviar, { sinal }: { sinal?: AbortSignal } = {}): Promise<AnexoLido> {
    const lido = (conteudo: string, legivel = true): AnexoLido => ({ nome: anexo.nome, tipo: anexo.tipo, conteudo, legivel });
    if (anexo.texto !== undefined) return lido(anexo.texto, anexo.texto.trim().length > 0);
    if (!anexo.dados) return lido('', false);
    if (anexo.tipo === 'audio') {
      const texto = await this.ouvir({ dados: anexo.dados, mimeType: anexo.mimeType }, { sinal });
      return texto === SEM_FALA ? lido('', false) : lido(texto);
    }
    const resposta = await this.chamarGemini(
      {
        systemInstruction: { parts: [{ text: INSTRUCOES_LEITURA }] },
        contents: [
          {
            role: 'user',
            parts: [{ inlineData: { mimeType: anexo.mimeType, data: anexo.dados } }, { text: `Leia este arquivo: "${anexo.nome}".` }],
          },
        ],
        generationConfig: { temperature: 0 },
      },
      sinal,
    );
    const texto = resposta.parts
      .filter((p) => typeof p.text === 'string' && !p.thought)
      .map((p) => p.text)
      .join('')
      .trim();
    return !texto || texto === ILEGIVEL ? lido('', false) : lido(texto);
  }

  private async executar(chamada: NonNullable<ParteGemini['functionCall']>, passo: PassoAgente): Promise<Record<string, unknown>> {
    try {
      const resultado = await this.opcoes.cliente.callTool({ name: chamada.name, arguments: chamada.args ?? {} });
      const texto = (resultado.content ?? [])
        .map((c) => (c.type === 'text' ? c.text : ''))
        .join('\n')
        .trim();
      if (resultado.isError) {
        passo.situacao = 'erro';
        passo.erro = texto || 'A ferramenta falhou.';
        return { erro: passo.erro };
      }
      passo.situacao = 'ok';
      try {
        return { resultado: JSON.parse(texto) as unknown };
      } catch {
        return { resultado: texto };
      }
    } catch (erro) {
      passo.situacao = 'erro';
      passo.erro = erro instanceof Error ? erro.message : String(erro);
      return { erro: passo.erro };
    }
  }

  /**
   * Manda uma mensagem e devolve a resposta final. `aoMudar` é chamado a cada
   * ferramenta que começa ou termina, para a tela mostrar o andamento.
   * `deAudio`: a mensagem é a transcrição de um áudio (ver ouvir()).
   * `anexos`: arquivos já lidos (ver ler()), que vão junto da mensagem.
   */
  async enviar(
    mensagem: string,
    {
      aoMudar,
      sinal,
      deAudio,
      anexos,
    }: { aoMudar?: (passos: PassoAgente[]) => void; sinal?: AbortSignal; deAudio?: boolean; anexos?: AnexoLido[] } = {},
  ): Promise<RespostaAgente> {
    const tamanhoAntes = this.historico.length;
    const passos: PassoAgente[] = [];
    const texto = anexos?.length ? mensagemComAnexos(mensagem, anexos) : deAudio ? `${PREFIXO_AUDIO} ${mensagem}` : mensagem;
    this.historico.push({ role: 'user', parts: [{ text: texto }] });

    try {
      for (let rodada = 0; rodada < MAXIMO_RODADAS; rodada++) {
        const resposta = await this.perguntarAoGemini(sinal);
        this.historico.push(resposta);

        const chamadas = resposta.parts.filter((p) => p.functionCall).map((p) => p.functionCall!);
        if (!chamadas.length) {
          const texto = resposta.parts
            .filter((p) => typeof p.text === 'string' && !p.thought)
            .map((p) => p.text)
            .join('')
            .trim();
          return { texto: texto || 'Pronto.', passos };
        }

        const { info } = await this.carregarFerramentas();
        const respostas: ParteGemini[] = [];
        for (const chamada of chamadas) {
          const passo: PassoAgente = {
            id: `${passos.length + 1}`,
            ferramenta: chamada.name,
            titulo: info.get(chamada.name)?.titulo ?? chamada.name,
            argumentos: chamada.args ?? {},
            situacao: 'rodando',
            alterouDados: false,
          };
          passos.push(passo);
          aoMudar?.([...passos]);
          const resultado = await this.executar(chamada, passo);
          passo.alterouDados = passo.situacao === 'ok' && (info.get(chamada.name)?.alteraDados ?? false);
          aoMudar?.(passos.map((p) => ({ ...p })));
          respostas.push({
            functionResponse: { name: chamada.name, response: resultado, ...(chamada.id ? { id: chamada.id } : {}) },
          });
        }
        this.historico.push({ role: 'user', parts: respostas });
      }
      const texto = 'Precisei de passos demais para responder. Pode dividir o pedido em partes menores?';
      this.historico.push({ role: 'model', parts: [{ text: texto }] });
      return { texto, passos };
    } catch (erro) {
      if (passos.length === 0) {
        // Nada foi feito: a mensagem sai do histórico e pode ser enviada de novo.
        this.historico.length = tamanhoAntes;
      } else {
        // Ferramentas já rodaram (talvez registrando algo): o histórico guarda isso para não repetir.
        this.fecharHistoricoInterrompido(passos);
      }
      throw erro;
    }
  }

  /** Deixa o histórico válido (pergunta → resposta) depois de uma falha no meio do caminho. */
  private fecharHistoricoInterrompido(passos: PassoAgente[]) {
    const ultimo = this.historico[this.historico.length - 1];
    const feito = passos
      .filter((p) => p.situacao === 'ok')
      .map((p) => p.titulo)
      .join(', ');
    const nota = { text: `(Resposta interrompida. Já feito nesta mensagem: ${feito || 'nada'}.)` };
    if (ultimo?.role === 'model' && ultimo.parts.some((p) => p.functionCall)) {
      // O modelo pediu ferramentas que não chegaram a responder: some com o pedido.
      this.historico.pop();
    }
    if (this.historico[this.historico.length - 1]?.role === 'user') {
      this.historico.push({ role: 'model', parts: [nota] });
    } else {
      this.historico.push({ role: 'user', parts: [{ text: '(continuando)' }] }, { role: 'model', parts: [nota] });
    }
  }
}
