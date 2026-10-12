import type { PassoAgente } from './agente';

/** Ideias de pergunta para quem abre o assistente pela primeira vez. */
export const SUGESTOES = [
  'Quanto tem de Skol no estoque?',
  'O que preciso repor?',
  'Chegaram 2 fardos de Heineken por R$ 42 cada',
  'Como foram as vendas nos últimos 7 dias?',
  'Qual o saldo do mês?',
  'Me lembre de pagar a conta de luz amanhã às 10h',
];

const ARGUMENTO_PRINCIPAL = ['produto', 'busca', 'texto', 'lembrete', 'categoria', 'descricao', 'periodo'];

/** "Consultar produto · skol", "Registrar entrada · Heineken" */
export function descreverPasso(passo: PassoAgente): string {
  const chave = ARGUMENTO_PRINCIPAL.find((k) => typeof passo.argumentos[k] === 'string' && passo.argumentos[k]);
  let detalhe = chave ? String(passo.argumentos[chave]) : '';
  if (!detalhe && Array.isArray(passo.argumentos.itens)) {
    detalhe = (passo.argumentos.itens as { produto?: string }[]).map((i) => i.produto).filter(Boolean).join(', ');
  }
  if (!detalhe && typeof passo.argumentos.inicio === 'string') detalhe = `desde ${passo.argumentos.inicio}`;
  const nomesPeriodo: Record<string, string> = { hoje: 'hoje', '7d': '7 dias', '30d': '30 dias', mes: 'este mês' };
  if (chave === 'periodo') detalhe = nomesPeriodo[detalhe] ?? detalhe;
  return detalhe ? `${passo.titulo} · ${detalhe}` : passo.titulo;
}

export interface TrechoTexto {
  texto: string;
  negrito: boolean;
}

export interface BlocoTexto {
  tipo: 'paragrafo' | 'item';
  trechos: TrechoTexto[];
}

/** Lê o pouco de formatação que o assistente usa: parágrafos, itens com "- " e **negrito**. */
export function blocosDeTexto(texto: string): BlocoTexto[] {
  const blocos: BlocoTexto[] = [];
  for (const linhaBruta of texto.replace(/\r/g, '').split('\n')) {
    const linha = linhaBruta.trim();
    if (!linha) continue;
    const item = /^([-*•]|\d+[.)])\s+/.exec(linha);
    const conteudo = (item ? linha.slice(item[0].length) : linha).replace(/^#+\s*/, '');
    const trechos: TrechoTexto[] = conteudo
      .split(/(\*\*[^*]+\*\*)/g)
      .filter(Boolean)
      .map((parte) =>
        parte.startsWith('**') && parte.endsWith('**') && parte.length > 4
          ? { texto: parte.slice(2, -2), negrito: true }
          : { texto: parte.replace(/\*\*/g, ''), negrito: false },
      );
    blocos.push({ tipo: item ? 'item' : 'paragrafo', trechos });
  }
  return blocos;
}
