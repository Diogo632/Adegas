import type { Usuario } from '@adegas/core';
import { NOME_PAPEL, PINS_DE_EXEMPLO, TAMANHO_PIN, iniciais, useAdega, usuariosAtivos } from '@adegas/core';
import { Beer, ChevronLeft, Delete } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { movimentoReduzido } from '../animacoes';

/** Quem está usando? Escolhe a pessoa e digita o PIN (na tela ou no teclado). */
export function Entrar() {
  const { estado, entrar } = useAdega();
  const [escolhido, setEscolhido] = useState<Usuario | null>(null);
  const usuarios = usuariosAtivos(estado);
  const exemplo = estado.usuarios.some((u) => u.id === 'u-dono');

  return (
    <main className="entrar">
      <div className="entrar-caixa">
        <div className="entrar-marca">
          <span className="entrar-logo">
            <Beer size={30} strokeWidth={2} />
          </span>
          <h1>Minha Adega</h1>
          <p className="suave">{escolhido ? `Olá, ${escolhido.nome}. Digite seu PIN.` : 'Quem está usando?'}</p>
        </div>

        {escolhido ? (
          <TecladoPin key={escolhido.id} usuario={escolhido} aoVoltar={() => setEscolhido(null)} aoDigitar={(pin) => entrar(escolhido.id, pin)} />
        ) : (
          <ul className="entrar-pessoas">
            {usuarios.map((u) => (
              <li key={u.id}>
                <button type="button" className="entrar-pessoa" onClick={() => setEscolhido(u)} aria-label={`Entrar como ${u.nome}`}>
                  <span className={`avatar ${u.papel === 'admin' ? 'admin' : ''}`}>{iniciais(u.nome)}</span>
                  <span className="lista-texto">
                    <strong>{u.nome}</strong>
                    <small className="suave">{NOME_PAPEL[u.papel]}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {exemplo && <p className="entrar-dica">Dados de exemplo · PINs: {PINS_DE_EXEMPLO.map((p) => `${p.nome} ${p.pin}`).join(' · ')}</p>}
      </div>
    </main>
  );
}

function TecladoPin({
  usuario,
  aoVoltar,
  aoDigitar,
}: {
  usuario: Usuario;
  aoVoltar: () => void;
  aoDigitar: (pin: string) => { ok: boolean; erro?: string };
}) {
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const pontos = useRef<HTMLDivElement>(null);
  // PIN errado: as bolinhas tremem e limpam.
  function errou(mensagem: string) {
    setErro(mensagem);
    const el = pontos.current;
    if (el && !movimentoReduzido()) {
      el.animate(
        [0, -10, 10, -8, 8, -4, 0].map((x) => ({ transform: `translateX(${x}px)` })),
        { duration: 360, easing: 'ease-out' },
      ).finished.then(() => setPin(''), () => setPin(''));
    } else {
      setPin('');
    }
  }

  // Com o último número, já tenta entrar.
  const tecla = (t: string) => {
    if (t === 'apagar') {
      setErro(null);
      setPin(pin.slice(0, -1));
      return;
    }
    if (pin.length >= TAMANHO_PIN) return;
    setErro(null);
    const novo = pin + t;
    setPin(novo);
    if (novo.length === TAMANHO_PIN) {
      const r = aoDigitar(novo);
      if (!r.ok) errou(r.erro ?? 'PIN errado.');
    }
  };

  // Números e Backspace do teclado do computador também valem.
  const teclado = useEffectEvent((e: KeyboardEvent) => {
    if (/^\d$/.test(e.key)) tecla(e.key);
    else if (e.key === 'Backspace') tecla('apagar');
    else if (e.key === 'Escape') aoVoltar();
  });
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => teclado(e);
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  return (
    <div className="pin">
      <span className={`avatar grande ${usuario.papel === 'admin' ? 'admin' : ''}`}>{iniciais(usuario.nome)}</span>
      <div className="pin-pontos" ref={pontos} aria-label={`${pin.length} de ${TAMANHO_PIN} números`}>
        {Array.from({ length: TAMANHO_PIN }, (_, i) => (
          <span key={i} className={`${i < pin.length ? 'cheio' : ''} ${erro ? 'erro' : ''}`} />
        ))}
      </div>
      <p className={`pin-aviso ${erro ? 'erro-texto' : ''}`} role="status">
        {erro ?? ' '}
      </p>
      <div className="pin-teclado">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'apagar'].map((t, i) =>
          t ? (
            <button key={i} type="button" className={`pin-tecla ${t === 'apagar' ? 'apagar' : ''}`} onClick={() => tecla(t)} aria-label={t === 'apagar' ? 'Apagar' : t}>
              {t === 'apagar' ? <Delete size={22} /> : t}
            </button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
      <button type="button" className="link" onClick={aoVoltar}>
        <ChevronLeft size={16} /> Trocar usuário
      </button>
    </div>
  );
}
