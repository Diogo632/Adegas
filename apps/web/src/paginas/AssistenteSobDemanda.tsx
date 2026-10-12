import { Suspense, lazy } from 'react';

// O assistente (MCP + Gemini) só é baixado quando alguém abre a tela dele.
const Assistente = lazy(() => import('./Assistente').then((m) => ({ default: m.Assistente })));

export function AssistenteSobDemanda() {
  return (
    <Suspense fallback={<p className="suave">Abrindo o assistente…</p>}>
      <Assistente />
    </Suspense>
  );
}
