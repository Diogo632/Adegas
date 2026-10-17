import type { Papel, Permissao, Usuario } from '@adegas/core';
import { NOME_PAPEL, PERMISSOES, PERMISSOES_PADRAO, TAMANHO_PIN, iniciais, useAdega } from '@adegas/core';
import { Check, UserPlus } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Surgir } from '../componentes/Animados';

/** Equipe: quem entra no sistema, com qual nível de acesso e o que cada funcionário pode fazer. */
export function Usuarios() {
  const { estado, usuario } = useAdega();
  const [editando, setEditando] = useState<string | 'novo'>('novo');
  const [aviso, setAviso] = useState<{ id: number; texto: string } | null>(null);
  const ordenados = [...estado.usuarios].sort((a, b) =>
    a.ativo !== b.ativo ? (a.ativo ? -1 : 1) : a.papel !== b.papel ? (a.papel === 'admin' ? -1 : 1) : a.nome.localeCompare(b.nome, 'pt-BR'),
  );
  const atual = editando === 'novo' ? undefined : estado.usuarios.find((u) => u.id === editando);

  return (
    <div className="pagina">
      <header className="cabecalho">
        <div>
          <p className="sobretitulo">Equipe</p>
          <h1>Usuários e acessos</h1>
        </div>
        <div className="acoes">
          <button type="button" className="botao" onClick={() => setEditando('novo')}>
            <UserPlus size={18} strokeWidth={1.75} /> Cadastrar funcionário
          </button>
        </div>
      </header>

      <div className="usuarios-grade">
        <section className="cartao" data-entrada>
          <h2>{estado.usuarios.filter((u) => u.ativo).length} com acesso</h2>
          <ul className="lista">
            {ordenados.map((u) => (
              <li key={u.id}>
                <button type="button" className={`usuario-linha ${editando === u.id ? 'ativa' : ''} ${u.ativo ? '' : 'inativo'}`} onClick={() => setEditando(u.id)}>
                  <span className={`avatar ${u.papel === 'admin' ? 'admin' : ''}`}>{iniciais(u.nome)}</span>
                  <span className="lista-texto">
                    <strong>
                      {u.nome}
                      {u.id === usuario?.id ? ' (você)' : ''}
                    </strong>
                    <small>{!u.ativo ? 'Sem acesso' : u.papel === 'admin' ? NOME_PAPEL.admin : resumoPermissoes(u)}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="cartao" data-entrada>
          {aviso && (
            <Surgir className="sucesso" chave={aviso.id}>
              <span className="sucesso-selo">
                <Check size={16} strokeWidth={3} />
              </span>
              <div>
                <strong>{aviso.texto}</strong>
              </div>
            </Surgir>
          )}
          <FormUsuario
            key={editando}
            atual={atual}
            aoSalvar={(u, novo) => {
              setAviso({ id: Date.now(), texto: novo ? `${u.nome} cadastrado. Já pode entrar com o PIN.` : `${u.nome} atualizado.` });
              setEditando(u.id);
            }}
          />
        </section>
      </div>
    </div>
  );
}

function resumoPermissoes(u: Usuario): string {
  const nomes = PERMISSOES.filter((p) => u.permissoes.includes(p.id)).map((p) => p.nome);
  return nomes.join(' · ') || 'Só lembretes';
}

function FormUsuario({ atual, aoSalvar }: { atual?: Usuario; aoSalvar: (u: Usuario, novo: boolean) => void }) {
  const { salvarUsuario } = useAdega();
  const [nome, setNome] = useState(atual?.nome ?? '');
  const [papel, setPapel] = useState<Papel>(atual?.papel ?? 'funcionario');
  const [permissoes, setPermissoes] = useState<Permissao[]>(atual ? atual.permissoes : PERMISSOES_PADRAO);
  const [pin, setPin] = useState('');
  const [ativo, setAtivo] = useState(atual?.ativo ?? true);
  const [erro, setErro] = useState<string | null>(null);

  const alternar = (p: Permissao) => setPermissoes((l) => (l.includes(p) ? l.filter((x) => x !== p) : [...l, p]));

  function enviar(e: FormEvent) {
    e.preventDefault();
    const r = salvarUsuario({ id: atual?.id, nome, papel, permissoes, pin: pin || undefined, ativo });
    if (!r.ok) return setErro(r.erro);
    setErro(null);
    setPin('');
    aoSalvar(r.valor, !atual);
  }

  return (
    <form className="form-usuario" onSubmit={enviar}>
      <h2>{atual ? atual.nome : 'Novo funcionário'}</h2>
      <div className="campos">
        <label className="rotulo">
          Nome
          <input id="usuario-nome" className="campo" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Ana" />
        </label>
        <label className="rotulo">
          {atual ? 'Novo PIN (deixe vazio para manter)' : `PIN (${TAMANHO_PIN} números)`}
          <input
            id="usuario-pin"
            className="campo"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, TAMANHO_PIN))}
            placeholder="••••"
          />
        </label>
      </div>

      <div className="rotulo">
        Nível de acesso
        <div className="segmentado">
          <button type="button" className={papel === 'funcionario' ? 'ativo' : ''} onClick={() => setPapel('funcionario')}>
            Funcionário
          </button>
          <button type="button" className={papel === 'admin' ? 'ativo' : ''} onClick={() => setPapel('admin')}>
            Administrador
          </button>
        </div>
      </div>

      {papel === 'admin' ? (
        <p className="suave">Administrador pode tudo: vende, atende mesas, mexe no estoque, vê o financeiro e cadastra usuários.</p>
      ) : (
        <fieldset className="permissoes">
          <legend className="secao">O que pode fazer</legend>
          {PERMISSOES.map((p) => (
            <label key={p.id} className="permissao">
              <input type="checkbox" checked={permissoes.includes(p.id)} onChange={() => alternar(p.id)} />
              <span className="interruptor" aria-hidden />
              <span className="lista-texto">
                <strong>{p.nome}</strong>
                <small>{p.dica}</small>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {atual && (
        <label className="permissao">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          <span className="interruptor" aria-hidden />
          <span className="lista-texto">
            <strong>Pode entrar no sistema</strong>
            <small>Desligue quando a pessoa sair da equipe. O histórico dela continua.</small>
          </span>
        </label>
      )}

      {erro && <p className="erro">{erro}</p>}
      <button type="submit" className="botao grande">
        {atual ? 'Salvar' : 'Cadastrar'}
      </button>
    </form>
  );
}
