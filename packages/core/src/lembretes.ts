import type { Estado, Lembrete, Resultado } from './tipos';
import { gerarId, mesmoDia } from './util';

export interface DadosLembrete {
  texto: string;
  /** Quando avisar. */
  quando: Date;
  produtoId?: string;
}

export function montarLembrete(estado: Estado, dados: DadosLembrete, agora: Date = new Date()): Resultado<Lembrete> {
  const texto = dados.texto.trim();
  if (!texto) return { ok: false, erro: 'Escreva do que é o lembrete.' };
  if (Number.isNaN(dados.quando.getTime())) return { ok: false, erro: 'Data do lembrete inválida.' };
  const produto = dados.produtoId ? estado.produtos.find((p) => p.id === dados.produtoId) : undefined;
  if (dados.produtoId && !produto) return { ok: false, erro: 'Produto não encontrado.' };
  return {
    ok: true,
    valor: {
      id: gerarId(),
      texto,
      quando: dados.quando.toISOString(),
      criadoEm: agora.toISOString(),
      concluido: false,
      produtoId: produto?.id,
      produtoNome: produto?.nome,
    },
  };
}

export type SituacaoLembrete = 'atrasado' | 'hoje' | 'proximo' | 'concluido';

export function situacaoLembrete(lembrete: Lembrete, agora: Date = new Date()): SituacaoLembrete {
  if (lembrete.concluido) return 'concluido';
  const quando = new Date(lembrete.quando);
  if (quando.getTime() <= agora.getTime()) return 'atrasado';
  if (mesmoDia(quando, agora)) return 'hoje';
  return 'proximo';
}

/** Os que ainda não foram feitos, do mais urgente para o mais distante. */
export function lembretesPendentes(estado: Estado): Lembrete[] {
  return estado.lembretes.filter((l) => !l.concluido).sort((a, b) => a.quando.localeCompare(b.quando));
}

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** "hoje, 18:00", "amanhã, 10:00", "qui 15/10, 09:30" */
export function formatarQuando(iso: string, agora: Date = new Date()): string {
  const data = new Date(iso);
  const hora = `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
  const amanha = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
  const ontem = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 1);
  if (mesmoDia(data, agora)) return `hoje, ${hora}`;
  if (mesmoDia(data, amanha)) return `amanhã, ${hora}`;
  if (mesmoDia(data, ontem)) return `ontem, ${hora}`;
  const dia = `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}`;
  return `${DIAS[data.getDay()]} ${dia}, ${hora}`;
}
