export function Contador({
  valor,
  onChange,
  minimo = 0,
  maximo,
}: {
  valor: number;
  onChange: (valor: number) => void;
  minimo?: number;
  maximo?: number;
}) {
  return (
    <div className="contador">
      <button type="button" aria-label="Diminuir" disabled={valor <= minimo} onClick={() => onChange(valor - 1)}>
        −
      </button>
      <span>{valor}</span>
      <button
        type="button"
        aria-label="Aumentar"
        disabled={maximo !== undefined && valor >= maximo}
        onClick={() => onChange(valor + 1)}
      >
        +
      </button>
    </div>
  );
}
