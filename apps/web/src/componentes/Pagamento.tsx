import type { Centavos, FormaPagamento } from '@adegas/core';
import {
  FORMAS_PAGAMENTO,
  centavosParaTexto,
  faltaDinheiro,
  formaPagamento,
  formatarDinheiro,
  paraCentavos,
  sugestoesDeValorRecebido,
} from '@adegas/core';
import { Numero } from './Animados';
import { ICONE_FORMA } from './icones';

/** Forma de pagamento, dica e, no dinheiro, valor recebido com troco. Usado na venda e no fechamento da mesa. */
export function Pagamento({
  total,
  forma,
  onForma,
  recebidoTexto,
  onRecebido,
  desabilitado,
}: {
  total: Centavos;
  forma: FormaPagamento | null;
  onForma: (forma: FormaPagamento) => void;
  recebidoTexto: string;
  onRecebido: (texto: string) => void;
  desabilitado?: boolean;
}) {
  const recebido = paraCentavos(recebidoTexto);
  const falta = faltaDinheiro(forma, recebido, total);
  return (
    <>
      <h3 className="secao">Forma de pagamento</h3>
      <div className="formas">
        {FORMAS_PAGAMENTO.map((f) => {
          const Icone = ICONE_FORMA[f.id];
          return (
            <button key={f.id} className={`forma ${forma === f.id ? 'ativa' : ''}`} disabled={desabilitado} onClick={() => onForma(f.id)}>
              <Icone size={20} strokeWidth={1.6} />
              {f.nome}
            </button>
          );
        })}
      </div>
      {forma && <p className="suave dica">{formaPagamento(forma).dica}</p>}

      {forma === 'dinheiro' && (
        <div className="dinheiro">
          <label className="rotulo">
            Valor recebido
            <div className="campo-prefixo">
              <span>R$</span>
              <input
                className="campo"
                inputMode="decimal"
                placeholder={centavosParaTexto(total)}
                value={recebidoTexto}
                onChange={(e) => onRecebido(e.target.value)}
              />
            </div>
          </label>
          <div className="chips">
            {sugestoesDeValorRecebido(total).map((v) => (
              <button key={v} className={`chip ${recebido === v ? 'ativo' : ''}`} onClick={() => onRecebido(centavosParaTexto(v))}>
                {v === total ? 'Valor exato' : formatarDinheiro(v)}
              </button>
            ))}
          </div>
          <div className={`troco ${falta ? 'falta' : ''}`}>
            {falta ? 'Faltam' : 'Troco'}
            <strong>
              <Numero valor={recebido === null ? 0 : Math.abs(recebido - total)} />
            </strong>
          </div>
        </div>
      )}
    </>
  );
}
