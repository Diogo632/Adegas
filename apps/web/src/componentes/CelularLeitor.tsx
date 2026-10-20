import { Check, CircleAlert, LoaderCircle, Smartphone, X } from 'lucide-react';
import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { encode } from 'uqr';
import type { MensagemDoCelular, SituacaoConexao } from '../leitor/pareamento';
import { CentralDoLeitor, enderecoDoLeitor } from '../leitor/pareamento';

export interface RespostaLeitura {
  ok: boolean;
  texto: string;
}

/** Foto da nota mandada pelo celular (JPEG em base64). */
export interface FotoDoCelular {
  nome: string;
  mimeType: string;
  dados: string;
}

// A foto já chega reduzida pelo celular; acima disso não é uma foto de nota.
const MAIOR_FOTO = 14 * 1024 * 1024;

/**
 * QR Code para o celular virar o leitor desta tela. Cada código lido no celular
 * chega em `aoLer`; a resposta volta para o celular (bip e texto na tela dele).
 */
export function CelularLeitor({
  aoLer,
  aoReceberFoto,
  aoFechar,
}: {
  aoLer: (codigo: string) => RespostaLeitura;
  aoReceberFoto: (foto: FotoDoCelular) => Promise<RespostaLeitura>;
  aoFechar: () => void;
}) {
  const [situacao, setSituacao] = useState<SituacaoConexao>('preparando');
  const [detalhe, setDetalhe] = useState('');
  const [endereco, setEndereco] = useState('');

  const receber = useEffectEvent(async (mensagem: MensagemDoCelular, central: CentralDoLeitor) => {
    if (mensagem.tipo === 'codigo' && typeof mensagem.valor === 'string') {
      const r = aoLer(mensagem.valor.slice(0, 500));
      central.responder(r.ok, r.texto);
    } else if (mensagem.tipo === 'foto') {
      const { nome, mimeType, dados } = mensagem;
      if (typeof dados !== 'string' || !/^image\//.test(mimeType) || dados.length > MAIOR_FOTO) {
        central.responder(false, 'Essa foto não deu para usar. Tire outra.');
        return;
      }
      central.responder(true, 'Recebi a foto. Lendo os produtos…');
      const r = await aoReceberFoto({ nome: String(nome || 'nota.jpg'), mimeType, dados });
      central.responder(r.ok, r.texto);
    }
  });

  useEffect(() => {
    let ativo = true;
    const central = new CentralDoLeitor(
      (m) => void receber(m, central),
      (s, d) => {
        if (!ativo) return;
        setSituacao(s);
        setDetalhe(d ?? '');
      },
    );
    central
      .iniciar()
      .then((id) => ativo && setEndereco(enderecoDoLeitor(id)))
      .catch(() => {
        // A situação "erro" já explica o que houve.
      });
    // Fechou a aba ou o navegador: o celular fica sabendo na hora.
    const aoSair = () => central.encerrar();
    window.addEventListener('pagehide', aoSair);
    return () => {
      ativo = false;
      window.removeEventListener('pagehide', aoSair);
      central.encerrar();
    };
  }, []);

  const conectado = situacao === 'conectado';
  return (
    <div className={`celular-leitor ${conectado ? 'conectado' : ''}`}>
      <div className="celular-leitor-qr">
        {endereco && situacao !== 'erro' ? (
          conectado ? (
            <span className="celular-ok" aria-hidden>
              <Smartphone size={42} strokeWidth={1.5} />
            </span>
          ) : (
            <QrCode texto={endereco} />
          )
        ) : situacao === 'erro' ? (
          <CircleAlert size={32} />
        ) : (
          <LoaderCircle size={28} className="girando" />
        )}
      </div>
      <div className="celular-leitor-texto">
        <strong>
          {conectado ? (
            <>
              <Check size={16} strokeWidth={3} /> Celular conectado: pode bipar
            </>
          ) : situacao === 'erro' ? (
            'Não deu para conectar'
          ) : situacao === 'caiu' ? (
            'O celular desconectou'
          ) : (
            'Aponte a câmera do celular para o QR Code'
          )}
        </strong>
        <p className="suave">
          {conectado
            ? 'Bipe o código de barras da nota (DANFE) e depois os produtos. Também dá para tirar uma foto da nota pelo celular.'
            : situacao === 'erro'
              ? detalhe
              : situacao === 'caiu'
                ? 'Leia o QR Code de novo para reconectar.'
                : 'Abra a câmera do celular, leia o código e toque no link. O celular vira o leitor desta tela, sem precisar entrar no sistema.'}
        </p>
        {endereco && !conectado && situacao !== 'erro' && (
          <a className="link discreto" href={endereco} target="_blank" rel="noreferrer">
            Abrir o leitor numa aba (para testar)
          </a>
        )}
      </div>
      <button type="button" className="celular-leitor-fechar" onClick={aoFechar} aria-label="Parar de usar o celular" title="Parar">
        <X size={18} />
      </button>
    </div>
  );
}

/** QR Code desenhado em SVG (preto no branco, que todo celular lê). */
function QrCode({ texto }: { texto: string }) {
  const { tamanho, desenho } = useMemo(() => {
    const qr = encode(texto, { ecc: 'M', border: 2 });
    let d = '';
    qr.data.forEach((linha, y) =>
      linha.forEach((preto, x) => {
        if (preto) d += `M${x} ${y}h1v1h-1z`;
      }),
    );
    return { tamanho: qr.size, desenho: d };
  }, [texto]);
  return (
    <svg viewBox={`0 0 ${tamanho} ${tamanho}`} role="img" aria-label="QR Code para conectar o celular" data-endereco={texto} shapeRendering="crispEdges">
      <rect width={tamanho} height={tamanho} fill="#fff" />
      <path d={desenho} fill="#000" />
    </svg>
  );
}
