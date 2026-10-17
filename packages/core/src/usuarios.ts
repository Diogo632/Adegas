import { hashDoPin } from './seguranca';
import type { Estado, Papel, Permissao, Resultado, Usuario } from './tipos';
import { gerarId, normalizar } from './util';

export interface InfoPermissao {
  id: Permissao;
  nome: string;
  dica: string;
}

/** As permissões que o administrador liga e desliga para cada funcionário. */
export const PERMISSOES: InfoPermissao[] = [
  { id: 'vender', nome: 'Vender no balcão', dica: 'Nova venda e pagamento.' },
  { id: 'mesas', nome: 'Atender mesas', dica: 'Abrir mesa, lançar pedidos e fechar a conta.' },
  { id: 'corrigir_mesas', nome: 'Corrigir mesas', dica: 'Tirar itens já lançados e cancelar mesa.' },
  { id: 'estoque', nome: 'Ver estoque', dica: 'Quantidades e situação dos produtos.' },
  { id: 'entrada', nome: 'Registrar entrada', dica: 'Chegada de mercadoria (vira despesa no financeiro).' },
  { id: 'ajustar_estoque', nome: 'Ajustar estoque e preços', dica: 'Perdas, contagem, editar produto e preço.' },
  { id: 'financeiro', nome: 'Financeiro e relatórios', dica: 'Faturamento, custos, lucro, despesas e relatórios.' },
  { id: 'assistente', nome: 'Usar o assistente', dica: 'Ele só faz o que a pessoa já pode fazer.' },
];

/** O que um funcionário novo já vem podendo. */
export const PERMISSOES_PADRAO: Permissao[] = ['vender', 'mesas', 'estoque', 'assistente'];

export const NOME_PAPEL: Record<Papel, string> = { admin: 'Administrador', funcionario: 'Funcionário' };

/** Pode fazer isso? Administrador pode tudo; ninguém logado não pode nada. */
export function pode(usuario: Usuario | null | undefined, permissao: Permissao | 'usuarios'): boolean {
  if (!usuario || !usuario.ativo) return false;
  if (usuario.papel === 'admin') return true;
  return permissao !== 'usuarios' && usuario.permissoes.includes(permissao);
}

export function permissoesDe(usuario: Usuario | null | undefined): Permissao[] {
  return PERMISSOES.map((p) => p.id).filter((p) => pode(usuario, p));
}

export function usuariosAtivos(estado: Estado): Usuario[] {
  return estado.usuarios
    .filter((u) => u.ativo)
    .sort((a, b) => (a.papel === b.papel ? a.nome.localeCompare(b.nome, 'pt-BR') : a.papel === 'admin' ? -1 : 1));
}

/** "Ana Paula" → "AP" */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : (partes[0]?.[1] ?? ''))).toUpperCase();
}

/** PIN de 4 números, como senha de cartão: rápido de digitar no balcão. */
export const TAMANHO_PIN = 4;

export function pinValido(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export function conferirPin(usuario: Usuario, pin: string): boolean {
  return hashDoPin(pin, usuario.pinSal) === usuario.pinHash;
}

/** Entrar com o PIN. */
export function entrar(estado: Estado, usuarioId: string, pin: string): Resultado<Usuario> {
  const usuario = estado.usuarios.find((u) => u.id === usuarioId);
  if (!usuario || !usuario.ativo) return { ok: false, erro: 'Usuário não encontrado.' };
  if (!conferirPin(usuario, pin)) return { ok: false, erro: 'PIN errado. Tente de novo.' };
  return { ok: true, valor: usuario };
}

export interface DadosUsuario {
  /** Vazio = usuário novo. */
  id?: string;
  nome: string;
  papel: Papel;
  permissoes: Permissao[];
  /** 4 números. Obrigatório no usuário novo; na edição, vazio mantém o PIN atual. */
  pin?: string;
  ativo: boolean;
}

/** Cadastro ou edição de usuário. Não deixa o sistema ficar sem administrador. */
export function montarUsuario(estado: Estado, dados: DadosUsuario, agora: Date = new Date()): Resultado<Usuario> {
  const atual = dados.id ? estado.usuarios.find((u) => u.id === dados.id) : undefined;
  if (dados.id && !atual) return { ok: false, erro: 'Usuário não encontrado.' };
  const nome = dados.nome.trim().replace(/\s+/g, ' ');
  if (!nome) return { ok: false, erro: 'Digite o nome.' };
  if (estado.usuarios.some((u) => u.id !== dados.id && normalizar(u.nome) === normalizar(nome))) {
    return { ok: false, erro: `Já existe um usuário chamado "${nome}".` };
  }
  const pin = dados.pin?.trim() ?? '';
  if (!atual && !pin) return { ok: false, erro: 'Escolha um PIN de 4 números.' };
  if (pin && !pinValido(pin)) return { ok: false, erro: 'O PIN precisa ter 4 números.' };

  const continuaAdmin = dados.papel === 'admin' && dados.ativo;
  if (atual?.papel === 'admin' && atual.ativo && !continuaAdmin) {
    const outrosAdmins = estado.usuarios.filter((u) => u.id !== atual.id && u.papel === 'admin' && u.ativo);
    if (outrosAdmins.length === 0) return { ok: false, erro: 'Precisa ficar pelo menos um administrador ativo.' };
  }

  const validas = new Set(PERMISSOES.map((p) => p.id));
  const sal = pin ? gerarId() : (atual?.pinSal ?? gerarId());
  return {
    ok: true,
    valor: {
      id: atual?.id ?? gerarId(),
      nome,
      papel: dados.papel,
      permissoes: dados.papel === 'admin' ? [] : [...new Set(dados.permissoes)].filter((p) => validas.has(p)),
      pinSal: sal,
      pinHash: pin ? hashDoPin(pin, sal) : (atual?.pinHash ?? ''),
      ativo: dados.ativo,
      criadoEm: atual?.criadoEm ?? agora.toISOString(),
    },
  };
}

/** Usuário pronto, para os dados de exemplo e para o primeiro acesso. */
export function usuarioInicial(id: string, nome: string, papel: Papel, pin: string, permissoes: Permissao[] = []): Usuario {
  const sal = `sal-${id}`;
  return { id, nome, papel, permissoes, pinSal: sal, pinHash: hashDoPin(pin, sal), ativo: true, criadoEm: new Date(0).toISOString() };
}
