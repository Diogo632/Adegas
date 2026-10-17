import { useAdega } from '@adegas/core';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router';
import { Exige } from './componentes/Exige';
import { Layout } from './componentes/Layout';
import { AssistenteSobDemanda } from './paginas/AssistenteSobDemanda';
import { Entrada } from './paginas/Entrada';
import { Entrar } from './paginas/Entrar';
import { Estoque } from './paginas/Estoque';
import { Financeiro } from './paginas/Financeiro';
import { Inicio } from './paginas/Inicio';
import { Mesas } from './paginas/Mesas';
import { Relatorios } from './paginas/Relatorios';
import { Usuarios } from './paginas/Usuarios';
import { Venda } from './paginas/Venda';

// Na prévia (npm run build:demo) a página roda dentro de outro site, então a
// navegação fica só na memória em vez de mexer no endereço do navegador.
const Roteador = import.meta.env.MODE === 'demo' ? MemoryRouter : BrowserRouter;

/** Sem ninguém logado, só a tela de entrada. Cada tela pede a permissão dela. */
export function Aplicativo() {
  const { usuario } = useAdega();
  if (!usuario) return <Entrar />;
  return (
    <Roteador>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="venda" element={<Exige permissao="vender"><Venda /></Exige>} />
          <Route path="mesas" element={<Exige permissao="mesas"><Mesas /></Exige>} />
          <Route path="entrada" element={<Exige permissao="entrada"><Entrada /></Exige>} />
          <Route path="estoque" element={<Exige permissao="estoque"><Estoque /></Exige>} />
          <Route path="financeiro" element={<Exige permissao="financeiro"><Financeiro /></Exige>} />
          <Route path="relatorios" element={<Exige permissao="financeiro"><Relatorios /></Exige>} />
          <Route path="assistente" element={<Exige permissao="assistente"><AssistenteSobDemanda /></Exige>} />
          <Route path="usuarios" element={<Exige permissao="usuarios"><Usuarios /></Exige>} />
        </Route>
      </Routes>
    </Roteador>
  );
}
