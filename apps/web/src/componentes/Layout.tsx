import { formatarDiaExtenso } from '@adegas/core';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';

const MENU = [
  { para: '/', rotulo: 'Início', icone: '🏠' },
  { para: '/venda', rotulo: 'Vender', icone: '🛒' },
  { para: '/entrada', rotulo: 'Entrada de produto', icone: '📦' },
];

const EM_BREVE = [
  { rotulo: 'Estoque', icone: '📋' },
  { rotulo: 'Financeiro', icone: '💰' },
  { rotulo: 'Relatórios', icone: '📊' },
];

export function Layout() {
  const [hoje] = useState(() => new Date());
  return (
    <div className="layout">
      <aside className="menu">
        <div className="marca">
          <span className="marca-icone">🍷</span>
          <div>
            <strong>Minha Adega</strong>
            <small>Painel</small>
          </div>
        </div>
        <nav>
          {MENU.map((item) => (
            <NavLink key={item.para} to={item.para} end className="menu-item">
              <span aria-hidden>{item.icone}</span> {item.rotulo}
            </NavLink>
          ))}
          {EM_BREVE.map((item) => (
            <span key={item.rotulo} className="menu-item desabilitado" title="Próxima etapa">
              <span aria-hidden>{item.icone}</span> {item.rotulo} <em>em breve</em>
            </span>
          ))}
        </nav>
      </aside>
      <div className="conteudo">
        <header className="topo">
          <span>{formatarDiaExtenso(hoje)}</span>
          <span className="selo" title="Por enquanto os dados ficam só neste navegador">
            Dados de exemplo
          </span>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
