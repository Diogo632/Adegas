import { Flashlight, LoaderCircle, ScanBarcode, X } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { LeitorDeCamera, erroDeCamera } from '../leitor/camera';

/**
 * Câmera ligada lendo códigos de barras. `aoLer` recebe cada código novo; o
 * `retorno` (o que aconteceu com o último código) aparece por cima da câmera.
 */
export function LeitorCamera({
  aoLer,
  aoFechar,
  retorno,
  dica = 'Aponte para o código de barras da nota ou do produto',
}: {
  aoLer: (valor: string) => void;
  aoFechar?: () => void;
  retorno?: { ok: boolean; texto: string } | null;
  dica?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const leitor = useRef<LeitorDeCamera>(null);
  const [situacao, setSituacao] = useState<'abrindo' | 'lendo' | 'erro'>('abrindo');
  const [erro, setErro] = useState('');
  const [luz, setLuz] = useState(false);
  const ler = useEffectEvent((valor: string) => aoLer(valor));

  useEffect(() => {
    let ativo = true;
    const camera = new LeitorDeCamera((valor) => ler(valor));
    leitor.current = camera;
    camera
      .iniciar(video.current!)
      .then(() => ativo && setSituacao('lendo'))
      .catch((e: unknown) => {
        if (!ativo) return;
        setErro(erroDeCamera(e));
        setSituacao('erro');
      });
    return () => {
      ativo = false;
      camera.parar();
    };
  }, []);

  return (
    <div className="leitor-camera">
      <video ref={video} aria-label="Câmera lendo códigos de barras" />
      {situacao === 'lendo' && <span className="leitor-mira" aria-hidden />}
      <div className="leitor-topo">
        <span className="leitor-dica">
          {situacao === 'abrindo' ? <LoaderCircle size={15} className="girando" /> : <ScanBarcode size={15} />}
          {situacao === 'abrindo' ? 'Abrindo a câmera…' : situacao === 'erro' ? erro : dica}
        </span>
        <span className="leitor-botoes">
          {situacao === 'lendo' && (
            <button
              type="button"
              className={luz ? 'ligado' : ''}
              onClick={() => void leitor.current?.lanterna(!luz).then(setLuz)}
              aria-label={luz ? 'Desligar lanterna' : 'Ligar lanterna'}
              title="Lanterna"
            >
              <Flashlight size={17} />
            </button>
          )}
          {aoFechar && (
            <button type="button" onClick={aoFechar} aria-label="Fechar câmera" title="Fechar">
              <X size={18} />
            </button>
          )}
        </span>
      </div>
      {retorno && (
        <p className={`leitor-retorno ${retorno.ok ? 'ok' : 'aviso'}`} role="status">
          {retorno.texto}
        </p>
      )}
    </div>
  );
}
