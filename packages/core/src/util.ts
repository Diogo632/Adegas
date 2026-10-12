export function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Compara texto sem diferenciar maiúscula nem acento: "agua" acha "Água". */
export function normalizar(texto: string): string {
  const semAcento =
    typeof texto.normalize === 'function' ? texto.normalize('NFD').replace(/[̀-ͯ]/g, '') : texto;
  return semAcento.toLowerCase().trim();
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_EXTENSO = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];
const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** "Segunda, 12 de outubro" */
export function formatarDiaExtenso(data: Date): string {
  const texto = `${DIAS_SEMANA[data.getDay()]}, ${data.getDate()} de ${MESES_EXTENSO[data.getMonth()]}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "12 out, 14:05" — ou só "14:05" se for hoje. */
export function formatarDataHora(iso: string, agora: Date = new Date()): string {
  const data = new Date(iso);
  const hora = `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
  if (mesmoDia(data, agora)) return hora;
  return `${data.getDate()} ${MESES[data.getMonth()]}, ${hora}`;
}

/** "Bom dia", "Boa tarde" ou "Boa noite". */
export function saudacao(data: Date = new Date()): string {
  const hora = data.getHours();
  if (hora >= 5 && hora < 12) return 'Bom dia';
  if (hora >= 12 && hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function mesmoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}
