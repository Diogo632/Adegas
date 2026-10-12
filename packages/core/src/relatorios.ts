import { CATEGORIAS } from './catalogos';
import type { Categoria } from './catalogos';
import type { Centavos } from './dinheiro';
import type { Intervalo } from './financeiro';
import { noIntervalo } from './financeiro';
import type { CategoriaId, Estado, FormaPagamento } from './tipos';

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export interface VendasDoDia {
  dia: Date;
  /** "12/10" */
  rotulo: string;
  /** "seg" */
  diaSemana: string;
  faturamento: Centavos;
  vendas: number;
}

export interface VendasDaHora {
  hora: number;
  faturamento: Centavos;
  vendas: number;
}

export interface DesempenhoProduto {
  produtoId: string;
  nome: string;
  categoria: CategoriaId;
  quantidade: number;
  faturamento: Centavos;
  lucro: Centavos;
}

export interface DesempenhoCategoria {
  categoria: Categoria;
  quantidade: number;
  faturamento: Centavos;
  /** Fatia do faturamento do período, de 0 a 1. */
  parte: number;
}

export interface RelatorioVendas {
  faturamento: Centavos;
  quantidadeVendas: number;
  itensVendidos: number;
  ticketMedio: Centavos;
  lucroBruto: Centavos;
  /** Lucro bruto sobre o faturamento, em %. */
  margem: number;
  /** Um registro por dia do período, inclusive os dias sem venda. */
  porDia: VendasDoDia[];
  /** 24 horas, da 0h às 23h. */
  porHora: VendasDaHora[];
  /** As 3 horas com mais vendas. */
  picos: VendasDaHora[];
  /** Do que mais faturou para o que menos faturou. */
  produtos: DesempenhoProduto[];
  categorias: DesempenhoCategoria[];
  porForma: Record<FormaPagamento, Centavos>;
}

export function relatorioVendas(estado: Estado, intervalo: Intervalo): RelatorioVendas {
  const vendas = estado.vendas.filter((v) => noIntervalo(v.data, intervalo));

  const porDia: VendasDoDia[] = [];
  for (
    let dia = new Date(intervalo.inicio);
    dia < intervalo.fim;
    dia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1)
  ) {
    porDia.push({
      dia,
      rotulo: `${String(dia.getDate()).padStart(2, '0')}/${String(dia.getMonth() + 1).padStart(2, '0')}`,
      diaSemana: DIAS_SEMANA[dia.getDay()],
      faturamento: 0,
      vendas: 0,
    });
  }
  const porHora: VendasDaHora[] = Array.from({ length: 24 }, (_, hora) => ({ hora, faturamento: 0, vendas: 0 }));
  const produtos = new Map<string, DesempenhoProduto>();
  const porForma: Record<FormaPagamento, Centavos> = { pix: 0, credito: 0, debito: 0, dinheiro: 0 };
  let itensVendidos = 0;
  let custo = 0;

  for (const venda of vendas) {
    const data = new Date(venda.data);
    const indiceDia = Math.floor(
      (new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime() - intervalo.inicio.getTime()) / 86_400_000 + 0.5,
    );
    const dia = porDia[indiceDia];
    if (dia) {
      dia.faturamento += venda.total;
      dia.vendas += 1;
    }
    porHora[data.getHours()].faturamento += venda.total;
    porHora[data.getHours()].vendas += 1;
    for (const pagamento of venda.pagamentos) porForma[pagamento.forma] += pagamento.valor;
    custo += venda.custoTotal;

    for (const item of venda.itens) {
      itensVendidos += item.quantidade;
      const atual = produtos.get(item.produtoId) ?? {
        produtoId: item.produtoId,
        nome: item.produtoNome,
        categoria: estado.produtos.find((p) => p.id === item.produtoId)?.categoria ?? 'outros',
        quantidade: 0,
        faturamento: 0,
        lucro: 0,
      };
      atual.quantidade += item.quantidade;
      atual.faturamento += item.precoUnitario * item.quantidade;
      atual.lucro += (item.precoUnitario - item.custoUnitario) * item.quantidade;
      produtos.set(item.produtoId, atual);
    }
  }

  const faturamento = vendas.reduce((s, v) => s + v.total, 0);
  const lucroBruto = faturamento - custo;
  const ranking = [...produtos.values()].sort((a, b) => b.faturamento - a.faturamento);

  const categorias = CATEGORIAS.map((categoria) => {
    const daCategoria = ranking.filter((p) => p.categoria === categoria.id);
    const fat = daCategoria.reduce((s, p) => s + p.faturamento, 0);
    return {
      categoria,
      quantidade: daCategoria.reduce((s, p) => s + p.quantidade, 0),
      faturamento: fat,
      parte: faturamento ? fat / faturamento : 0,
    };
  })
    .filter((c) => c.faturamento > 0)
    .sort((a, b) => b.faturamento - a.faturamento);

  return {
    faturamento,
    quantidadeVendas: vendas.length,
    itensVendidos,
    ticketMedio: vendas.length ? Math.round(faturamento / vendas.length) : 0,
    lucroBruto,
    margem: faturamento ? Math.round((lucroBruto / faturamento) * 100) : 0,
    porDia,
    porHora,
    picos: [...porHora].filter((h) => h.vendas > 0).sort((a, b) => b.vendas - a.vendas || b.faturamento - a.faturamento).slice(0, 3),
    produtos: ranking,
    categorias,
    porForma,
  };
}
