import type { Permissao } from '@adegas/core';
import { useAdega } from '@adegas/core';
import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

/** Mostra a tela só para quem tem a permissão; os outros veem um aviso. */
export function Exige({ permissao, children }: { permissao: Permissao | 'usuarios'; children: ReactNode }) {
  const { pode } = useAdega();
  if (pode(permissao)) return children;
  return (
    <div className="pagina">
      <section className="cartao sem-acesso">
        <Lock size={22} strokeWidth={1.8} />
        <div>
          <h2>Sem acesso</h2>
          <p className="suave">Seu usuário não pode abrir esta tela. Se precisar, peça a um administrador.</p>
          <Link to="/" className="link">
            Voltar ao início
          </Link>
        </div>
      </section>
    </div>
  );
}
