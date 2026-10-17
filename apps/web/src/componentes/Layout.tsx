import type { Permissao } from '@adegas/core';
import { NOME_PAPEL, formatarDiaExtenso, iniciais, useAdega } from '@adegas/core';
import type { LucideIcon } from 'lucide-react';
import {
  Armchair,
  Beer,
  Boxes,
  ChartColumn,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  ShoppingBag,
  Sparkles,
  UsersRound,
  Wallet,
} from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { animarEntradaDaTela } from '../animacoes';

interface ItemMenu {
  para: string;
  rotulo: string;
  icone: LucideIcon;
  /** Sem permissão, o item nem aparece. */
  permissao?: Permissao | 'usuarios';
}

const OPERACAO: ItemMenu[] = [
  { para: '/', rotulo: 'Início', icone: LayoutDashboard },
  { para: '/venda', rotulo: 'Vender', icone: ShoppingBag, permissao: 'vender' },
  { para: '/mesas', rotulo: 'Mesas', icone: Armchair, permissao: 'mesas' },
  { para: '/entrada', rotulo: 'Entrada de produto', icone: PackagePlus, permissao: 'entrada' },
];

const GESTAO: ItemMenu[] = [
  { para: '/estoque', rotulo: 'Estoque', icone: Boxes, permissao: 'estoque' },
  { para: '/financeiro', rotulo: 'Financeiro', icone: Wallet, permissao: 'financeiro' },
  { para: '/relatorios', rotulo: 'Relatórios', icone: ChartColumn, permissao: 'financeiro' },
  { para: '/usuarios', rotulo: 'Usuários', icone: UsersRound, permissao: 'usuarios' },
];

export function Layout() {
  const [hoje] = useState(() => new Date());
  const { usuario, pode, sair } = useAdega();
  const visivel = (i: ItemMenu) => !i.permissao || pode(i.permissao);
  const gestao = GESTAO.filter(visivel);
  const { pathname } = useLocation();
  const navegar = useNavigate();
  const tela = useRef<HTMLDivElement>(null);

  // A cada troca de tela, a página nova entra animada.
  useLayoutEffect(() => {
    if (tela.current) animarEntradaDaTela(tela.current);
  }, [pathname]);

  return (
    <div className="layout">
      <aside className="menu">
        <div className="marca">
          <span className="marca-simbolo">
            <Beer size={18} strokeWidth={2} />
          </span>
          <div>
            <strong>Minha Adega</strong>
            <small>{formatarDiaExtenso(hoje)}</small>
          </div>
        </div>
        <nav>
          {OPERACAO.filter(visivel).map(({ para, rotulo, icone: Icone }) => (
            <NavLink key={para} to={para} end className="menu-item">
              <Icone size={18} strokeWidth={1.75} /> {rotulo}
            </NavLink>
          ))}
          {gestao.length > 0 && <span className="menu-rotulo">Gestão</span>}
          {gestao.map(({ para, rotulo, icone: Icone }) => (
            <NavLink key={para} to={para} className="menu-item">
              <Icone size={18} strokeWidth={1.75} /> {rotulo}
            </NavLink>
          ))}
          {pode('assistente') && (
            <>
              <span className="menu-rotulo">Inteligência</span>
              <NavLink to="/assistente" className="menu-item menu-ia">
                <Sparkles size={18} strokeWidth={1.75} /> Assistente
              </NavLink>
            </>
          )}
        </nav>
        {usuario && (
          <div className="menu-usuario">
            <span className={`avatar ${usuario.papel === 'admin' ? 'admin' : ''}`}>{iniciais(usuario.nome)}</span>
            <span className="lista-texto">
              <strong>{usuario.nome}</strong>
              <small>{NOME_PAPEL[usuario.papel]}</small>
            </span>
            <button
              type="button"
              className="menu-sair"
              onClick={() => {
                navegar('/');
                sair();
              }}
              title="Trocar usuário"
              aria-label="Trocar usuário"
            >
              <LogOut size={17} strokeWidth={1.75} />
            </button>
          </div>
        )}
        <p className="menu-nota">Dados de exemplo: ficam só neste navegador por enquanto.</p>
      </aside>
      <main className="conteudo">
        <div key={pathname} ref={tela}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
