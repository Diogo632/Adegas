import { formatarDiaExtenso } from '@adegas/core';
import { Boxes, ChartColumn, LayoutDashboard, PackagePlus, ShoppingBag, Wallet, Wine } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { animarEntradaDaTela } from '../animacoes';

const MENU = [
  { para: '/', rotulo: 'Início', icone: LayoutDashboard },
  { para: '/venda', rotulo: 'Vender', icone: ShoppingBag },
  { para: '/entrada', rotulo: 'Entrada de produto', icone: PackagePlus },
];

const EM_BREVE = [
  { rotulo: 'Estoque', icone: Boxes },
  { rotulo: 'Financeiro', icone: Wallet },
  { rotulo: 'Relatórios', icone: ChartColumn },
];

export function Layout() {
  const [hoje] = useState(() => new Date());
  const { pathname } = useLocation();
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
            <Wine size={18} strokeWidth={1.8} />
          </span>
          <div>
            <strong>Minha Adega</strong>
            <small>{formatarDiaExtenso(hoje)}</small>
          </div>
        </div>
        <nav>
          {MENU.map(({ para, rotulo, icone: Icone }) => (
            <NavLink key={para} to={para} end className="menu-item">
              <Icone size={18} strokeWidth={1.75} /> {rotulo}
            </NavLink>
          ))}
          <span className="menu-rotulo">Em breve</span>
          {EM_BREVE.map(({ rotulo, icone: Icone }) => (
            <span key={rotulo} className="menu-item desabilitado" title="Próxima etapa">
              <Icone size={18} strokeWidth={1.75} /> {rotulo}
            </span>
          ))}
        </nav>
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
