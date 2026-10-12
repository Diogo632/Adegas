import { AdegaProvider, CORES } from '@adegas/core';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Layout } from './componentes/Layout';
import { Entrada } from './paginas/Entrada';
import { Inicio } from './paginas/Inicio';
import { Venda } from './paginas/Venda';
import './estilos.css';

// As cores vêm do núcleo compartilhado, para o web ficar igual ao app.
for (const [nome, cor] of Object.entries(CORES)) {
  document.documentElement.style.setProperty(`--${nome}`, cor);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdegaProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Inicio />} />
            <Route path="venda" element={<Venda />} />
            <Route path="entrada" element={<Entrada />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AdegaProvider>
  </StrictMode>,
);
