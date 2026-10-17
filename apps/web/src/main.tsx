import { AdegaProvider, CORES } from '@adegas/core';
import '@fontsource-variable/inter';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Aplicativo } from './Aplicativo';
import { ativarAnimacoesDeToque } from './animacoes';
import './estilos.css';

// As cores vêm do núcleo compartilhado, para o web ficar igual ao app.
for (const [nome, cor] of Object.entries(CORES)) {
  document.documentElement.style.setProperty(`--${nome}`, cor);
}

ativarAnimacoesDeToque();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdegaProvider>
      <Aplicativo />
    </AdegaProvider>
  </StrictMode>,
);
