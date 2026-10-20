/**
 * Celular como leitor do painel: o computador mostra um QR Code; o celular abre
 * o endereço, liga a câmera e manda cada código lido (e fotos da nota) direto
 * para o computador, que responde o que fez. A conexão é direta entre os dois
 * (WebRTC, criptografada); o servidor público do PeerJS só apresenta um ao outro.
 */
import type { DataConnection, PeerOptions } from 'peerjs';
import Peer from 'peerjs';

/** Do celular para o computador. */
export type MensagemDoCelular =
  | { tipo: 'ola' }
  | { tipo: 'codigo'; valor: string }
  | { tipo: 'foto'; nome: string; mimeType: string; dados: string };

/** Do computador para o celular: o que aconteceu com o que foi lido, ou que a tela fechou. */
export type RespostaDoComputador = { tipo: 'resposta'; ok: boolean; texto: string } | { tipo: 'fim' };

export type SituacaoConexao = 'preparando' | 'esperando' | 'conectado' | 'caiu' | 'erro';

/** Servidor que apresenta os aparelhos (VITE_LEITOR_SINAL=host:porta só nos testes; sem ele, o do PeerJS). */
function opcoes(): PeerOptions {
  const sinal = String(import.meta.env.VITE_LEITOR_SINAL ?? '').trim();
  if (!sinal) return { debug: 0 };
  const [host, porta] = sinal.split(':');
  return { host, port: Number(porta) || 9000, path: '/', secure: false, debug: 0, config: { iceServers: [] } };
}

const novoId = () => `pop-${crypto.getRandomValues(new Uint32Array(3)).join('').slice(0, 20)}`;

/** Endereço que o QR Code abre no celular (o início do painel, com o ?leitor=). */
export function enderecoDoLeitor(id: string): string {
  const url = new URL(import.meta.env.BASE_URL, window.location.href);
  url.search = `?leitor=${encodeURIComponent(id)}`;
  return url.toString();
}

const caiu = (estado: RTCIceConnectionState) => estado === 'disconnected' || estado === 'failed' || estado === 'closed';

/** Lado do computador: espera o celular e recebe o que ele lê. */
export class CentralDoLeitor {
  private peer?: Peer;
  private conexoes = new Set<DataConnection>();
  private aoReceber: (m: MensagemDoCelular) => void;
  private aoMudar: (s: SituacaoConexao, detalhe?: string) => void;

  constructor(aoReceber: (m: MensagemDoCelular) => void, aoMudar: (s: SituacaoConexao, detalhe?: string) => void) {
    this.aoReceber = aoReceber;
    this.aoMudar = aoMudar;
  }

  iniciar(): Promise<string> {
    this.aoMudar('preparando');
    return new Promise((resolver, rejeitar) => {
      const peer = new Peer(novoId(), opcoes());
      this.peer = peer;
      peer.on('open', (id) => {
        this.aoMudar('esperando');
        resolver(id);
      });
      peer.on('connection', (conexao) => {
        conexao.on('open', () => {
          this.conexoes.add(conexao);
          this.aoMudar('conectado');
        });
        conexao.on('data', (dados) => this.aoReceber(dados as MensagemDoCelular));
        const fechou = () => {
          if (!this.conexoes.delete(conexao)) return;
          if (!this.conexoes.size) this.aoMudar('caiu');
        };
        conexao.on('close', fechou);
        conexao.on('iceStateChanged', (estado) => caiu(estado) && fechou());
      });
      peer.on('error', (erro) => {
        this.aoMudar('erro', 'Não consegui preparar a conexão com o celular. Confira a internet e tente de novo.');
        rejeitar(erro);
      });
    });
  }

  responder(ok: boolean, texto: string): void {
    const resposta: RespostaDoComputador = { tipo: 'resposta', ok, texto };
    for (const c of this.conexoes) if (c.open) c.send(resposta);
  }

  encerrar(): void {
    // Avisa o celular antes de desligar (dá tempo de a mensagem sair).
    const peer = this.peer;
    for (const c of this.conexoes) if (c.open) c.send({ tipo: 'fim' } satisfies RespostaDoComputador);
    this.peer = undefined;
    this.conexoes.clear();
    setTimeout(() => peer?.destroy(), 300);
  }
}

/** Lado do celular: conecta no computador do QR Code e manda o que a câmera lê. */
export class LeitorConectado {
  private peer?: Peer;
  private conexao?: DataConnection;
  private aoResposta: (r: RespostaDoComputador) => void;
  private aoMudar: (s: SituacaoConexao, detalhe?: string) => void;

  constructor(aoResposta: (r: RespostaDoComputador) => void, aoMudar: (s: SituacaoConexao, detalhe?: string) => void) {
    this.aoResposta = aoResposta;
    this.aoMudar = aoMudar;
  }

  conectar(idDoComputador: string): void {
    this.aoMudar('preparando');
    const peer = new Peer(novoId(), opcoes());
    this.peer = peer;
    peer.on('open', () => {
      const conexao = peer.connect(idDoComputador, { reliable: true });
      this.conexao = conexao;
      conexao.on('open', () => {
        this.aoMudar('conectado');
        conexao.send({ tipo: 'ola' } satisfies MensagemDoCelular);
      });
      const fechou = () => {
        if (this.conexao !== conexao) return;
        this.conexao = undefined;
        this.aoMudar('caiu', 'O computador fechou a tela da nota. Para continuar, abra a tela de novo e leia o QR Code novo.');
      };
      conexao.on('data', (dados) => {
        const resposta = dados as RespostaDoComputador;
        if (resposta.tipo === 'fim') fechou();
        else this.aoResposta(resposta);
      });
      conexao.on('close', fechou);
      conexao.on('iceStateChanged', (estado) => caiu(estado) && fechou());
    });
    peer.on('error', (erro) => {
      const tipo = (erro as { type?: string }).type;
      this.aoMudar(
        'erro',
        tipo === 'peer-unavailable'
          ? 'Não achei o computador. Abra de novo a tela da nota no computador e leia o QR Code novo.'
          : 'Não consegui conectar com o computador. Confira a internet do celular.',
      );
    });
  }

  enviar(mensagem: MensagemDoCelular): boolean {
    if (!this.conexao?.open) return false;
    this.conexao.send(mensagem);
    return true;
  }

  encerrar(): void {
    this.conexao = undefined;
    this.peer?.destroy();
    this.peer = undefined;
  }
}
