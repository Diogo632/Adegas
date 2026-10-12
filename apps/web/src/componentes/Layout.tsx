import { formatarDiaExtenso } from '@adegas/core';
import { Boxes, ChartColumn, LayoutDashboard, PackagePlus, ShoppingBag, Wallet, Wine } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';

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
        <Outlet />
      </main>
    </div>
  );
}
