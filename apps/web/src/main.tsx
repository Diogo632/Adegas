import { AdegaProvider, CORES } from '@adegas/core';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router';
import { ativarAnimacoesDeToque } from './animacoes';
import { Layout } from './componentes/Layout';
import { Entrada } from './paginas/Entrada';
import { Inicio } from './paginas/Inicio';
import { Venda } from './paginas/Venda';
import './estilos.css';

// As cores vêm do núcleo compartilhado, para o web ficar igual ao app.
for (const [nome, cor] of Object.entries(CORES)) {
  document.documentElement.style.setProperty(`--${nome}`, cor);
}

ativarAnimacoesDeToque();

// Na prévia (npm run build:demo) a página roda dentro de outro site, então a
// navegação fica só na memória em vez de mexer no endereço do navegador.
const Roteador = import.meta.env.MODE === 'demo' ? MemoryRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdegaProvider>
      <Roteador>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Inicio />} />
            <Route path="venda" element={<Venda />} />
            <Route path="entrada" element={<Entrada />} />
          </Route>
        </Routes>
      </Roteador>
    </AdegaProvider>
  </StrictMode>,
);
