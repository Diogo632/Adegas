// Animações do painel, feitas em JavaScript com a Web Animations API (element.animate).
// Quem pediu "reduzir movimento" no sistema não vê nenhuma delas.

const SUAVE = 'cubic-bezier(.22, 1, .36, 1)';

export function movimentoReduzido(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Troca de tela: a página sobe e aparece, e os blocos marcados com data-entrada vêm em cascata. */
export function animarEntradaDaTela(tela: HTMLElement) {
  if (movimentoReduzido()) return;
  tela.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], {
    duration: 360,
    easing: SUAVE,
  });
  tela.querySelectorAll<HTMLElement>('[data-entrada]').forEach((bloco, i) => {
    bloco.animate(
      [
        { opacity: 0, transform: 'translateY(16px) scale(.98)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 480, delay: 60 + Math.min(i, 12) * 45, easing: SUAVE, fill: 'backwards' },
    );
  });
}

/** Algo novo apareceu na tela (aviso de sucesso, item no carrinho). */
export function surgir(elemento: HTMLElement) {
  if (movimentoReduzido()) return;
  elemento.animate(
    [
      { opacity: 0, transform: 'translateY(-6px) scale(.97)' },
      { opacity: 1, transform: 'none' },
    ],
    { duration: 380, easing: SUAVE },
  );
}

/** Um número pequeno mudou (quantidade no carrinho): dá um pulo. */
export function pulsar(elemento: HTMLElement) {
  if (movimentoReduzido()) return;
  elemento.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], {
    duration: 320,
    easing: SUAVE,
  });
}

const TOCAVEIS = '.botao, .chip, .forma, .produto, .opcao, .menu-item, .contador button, .segmentado button, .link';
const COM_ONDA = '.botao, .forma, .produto, .opcao, .segmentado button';

/**
 * Liga, uma vez só, a animação de toque em todos os botões da página:
 * o botão afunda e volta, e nos maiores sai uma onda de luz do ponto tocado.
 */
export function ativarAnimacoesDeToque() {
  document.addEventListener('pointerdown', (evento) => {
    if (movimentoReduzido()) return;
    const alvo = (evento.target as Element | null)?.closest<HTMLElement>(TOCAVEIS);
    if (!alvo || alvo.matches(':disabled, .desabilitado')) return;
    alvo.animate([{ transform: 'scale(1)' }, { transform: 'scale(.95)' }, { transform: 'scale(1)' }], {
      duration: 280,
      easing: SUAVE,
    });
    if (alvo.matches(COM_ONDA)) criarOnda(alvo, evento);
  });
}

function criarOnda(alvo: HTMLElement, evento: PointerEvent) {
  const caixa = alvo.getBoundingClientRect();
  const tamanho = Math.max(caixa.width, caixa.height) * 2.2;
  const onda = document.createElement('span');
  onda.className = 'onda';
  onda.style.width = onda.style.height = `${tamanho}px`;
  onda.style.left = `${evento.clientX - caixa.left - tamanho / 2}px`;
  onda.style.top = `${evento.clientY - caixa.top - tamanho / 2}px`;
  alvo.appendChild(onda);
  const animacao = onda.animate(
    [
      { transform: 'scale(0)', opacity: 0.35 },
      { transform: 'scale(1)', opacity: 0 },
    ],
    { duration: 600, easing: 'ease-out' },
  );
  animacao.onfinish = () => onda.remove();
}
