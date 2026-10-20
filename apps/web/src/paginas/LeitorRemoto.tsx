import { NOME_DA_LOJA } from '@adegas/core';
import { prepararArquivo } from '@adegas/ia/src/anexos-navegador';
import { Camera, CircleAlert, Check, LoaderCircle, Smartphone } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import { LeitorCamera } from '../componentes/LeitorCamera';
import logoPop from '../assets/logo-pop.png';
import { bipar } from '../leitor/camera';
import type { SituacaoConexao } from '../leitor/pareamento';
import { LeitorConectado } from '../leitor/pareamento';

interface Registro {
  id: number;
  ok: boolean;
  texto: string;
}

/**
 * Página que o celular abre pelo QR Code da tela de entrada por nota: vira o
 * leitor do computador. Não precisa entrar no sistema nem ter os dados aqui:
 * tudo o que é lido vai para o computador, que responde o que fez.
 */
export default function LeitorRemoto({ idDoComputador }: { idDoComputador: string }) {
  const [situacao, setSituacao] = useState<SituacaoConexao>('preparando');
  const [detalhe, setDetalhe] = useState('');
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [conexao] = useState(
    () =>
      new LeitorConectado(
        (r) => {
          if (r.tipo !== 'resposta') return;
          bipar(r.ok);
          setRegistros((lista) => [{ id: Date.now() + Math.random(), ok: r.ok, texto: r.texto }, ...lista].slice(0, 8));
        },
        (s, d) => {
          setSituacao(s);
          setDetalhe(d ?? '');
        },
      ),
  );

  useEffect(() => {
    conexao.conectar(idDoComputador);
    return () => conexao.encerrar();
  }, [conexao, idDoComputador]);

  const ler = (valor: string) => {
    if (!conexao.enviar({ tipo: 'codigo', valor })) {
      bipar(false);
      setRegistros((lista) => [{ id: Date.now(), ok: false, texto: 'Ainda não conectado ao computador.' }, ...lista]);
    }
  };

  async function mandarFoto(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setEnviandoFoto(true);
    try {
      const foto = await prepararArquivo(arquivo);
      if (!foto.dados) throw new Error('Mande uma foto da nota.');
      conexao.enviar({ tipo: 'foto', nome: foto.nome, mimeType: foto.mimeType, dados: foto.dados });
      setRegistros((lista) => [{ id: Date.now(), ok: true, texto: 'Foto enviada. O computador está lendo…' }, ...lista]);
    } catch (erro) {
      setRegistros((lista) => [{ id: Date.now(), ok: false, texto: erro instanceof Error ? erro.message : 'Não consegui mandar a foto.' }, ...lista]);
    } finally {
      setEnviandoFoto(false);
    }
  }

  const conectado = situacao === 'conectado';
  return (
    <main className="leitor-remoto">
      <header>
        <img src={logoPop} alt="" width={36} height={36} />
        <div>
          <strong>{NOME_DA_LOJA} · Leitor</strong>
          <small className={`leitor-situacao ${situacao}`}>
            {conectado ? <Check size={13} strokeWidth={3} /> : situacao === 'preparando' ? <LoaderCircle size={13} className="girando" /> : <Smartphone size={13} />}
            {conectado
              ? 'Conectado ao computador'
              : situacao === 'preparando'
                ? 'Conectando ao computador…'
                : detalhe || 'Desconectado'}
          </small>
        </div>
      </header>

      {situacao === 'erro' || situacao === 'caiu' ? (
        <p className="leitor-erro">
          <CircleAlert size={18} /> {detalhe || 'A conexão caiu.'}
        </p>
      ) : (
        <LeitorCamera aoLer={ler} retorno={registros[0] ?? null} dica="Bipe o código de barras da nota e depois os produtos" />
      )}

      <label className={`botao grande leitor-foto ${!conectado || enviandoFoto ? 'desligado' : ''}`}>
        {enviandoFoto ? <LoaderCircle size={20} className="girando" /> : <Camera size={20} />} Tirar foto da nota
        <input type="file" accept="image/*" capture="environment" className="so-leitor" disabled={!conectado || enviandoFoto} onChange={mandarFoto} />
      </label>
      <p className="suave leitor-explica">
        A foto serve para trazer os produtos quando não há o XML da nota. Tudo vai para a tela aberta no computador.
      </p>

      {registros.length > 0 && (
        <ul className="leitor-registros" aria-label="O que o computador fez">
          {registros.map((r) => (
            <li key={r.id} className={r.ok ? 'ok' : 'aviso'}>
              {r.ok ? <Check size={15} strokeWidth={2.6} /> : <CircleAlert size={15} />} {r.texto}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
