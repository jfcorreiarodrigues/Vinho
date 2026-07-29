/**
 * Normalização da entrada em lote (fatura e prateleira).
 *
 * Puro e testável. A chamada ao modelo está em `bulkApi.ts`.
 *
 * Aqui o risco é maior do que no scan de uma etiqueta: um lote mau pode
 * meter dezenas de linhas erradas na cave de uma vez. Tudo o que sai daqui
 * é para ser revisto pelo utilizador antes de gravar, e o que não tenha
 * nome nem produtor é descartado em vez de virar uma linha vazia.
 */

import type { WineType } from '@/types';

const TIPOS: WineType[] = ['tinto', 'branco', 'rose', 'espumante', 'fortificado'];

export interface LinhaLote {
  /** Chave estável para a lista poder remover linhas sem baralhar as outras. */
  id: string;
  name: string;
  producer: string;
  region: string;
  vintage?: number;
  quantity: number;
  purchase_price?: number;
  wine_type: WineType;
  confidence?: number;
}

export interface ResultadoLote {
  store_name?: string;
  invoice_date?: string;
  total_amount?: number;
  linhas: LinhaLote[];
  /** Linhas que o modelo devolveu mas foram descartadas por não terem nome. */
  descartadas: number;
}

interface LinhaBruta {
  name?: unknown;
  producer?: unknown;
  region?: unknown;
  vintage?: unknown;
  quantity?: unknown;
  purchase_price?: unknown;
  wine_type?: unknown;
  confidence?: unknown;
}

interface RespostaBruta {
  store_name?: unknown;
  invoice_date?: unknown;
  total_amount?: unknown;
  wines?: unknown;
}

function texto(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function numero(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

export function normalizarLote(bruto: RespostaBruta): ResultadoLote {
  const brutas: LinhaBruta[] = Array.isArray(bruto.wines) ? bruto.wines : [];
  const anoActual = new Date().getFullYear();

  const linhas: LinhaLote[] = [];
  let descartadas = 0;

  brutas.forEach((b, i) => {
    const nome = texto(b.name);
    const produtor = texto(b.producer);

    // Sem nome nem produtor não há nada de útil — melhor descartar do que
    // apresentar uma linha vazia para o utilizador preencher de raiz.
    if (!nome && !produtor) {
      descartadas += 1;
      return;
    }

    const vintage = numero(b.vintage);
    const quantidade = numero(b.quantity);
    const preco = numero(b.purchase_price);
    const tipo = String(b.wine_type ?? '').toLowerCase();

    linhas.push({
      id: `lote-${i}-${nome || produtor}`.slice(0, 60),
      name: nome || produtor,
      producer: produtor,
      region: texto(b.region),
      vintage: vintage && vintage >= 1800 && vintage <= anoActual + 1 ? vintage : undefined,
      quantity: quantidade && quantidade > 0 ? Math.round(quantidade) : 1,
      purchase_price: preco && preco > 0 ? preco : undefined,
      wine_type: TIPOS.includes(tipo as WineType) ? (tipo as WineType) : 'tinto',
      confidence: numero(b.confidence),
    });
  });

  const data = texto(bruto.invoice_date);

  return {
    store_name: texto(bruto.store_name) || undefined,
    // Só aceita ISO: uma data mal lida no formulário é pior do que nenhuma.
    invoice_date: /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : undefined,
    total_amount: numero(bruto.total_amount),
    linhas,
    descartadas,
  };
}

/** Soma do que vai ser gravado, para o utilizador conferir com a fatura. */
export function totalDasLinhas(linhas: LinhaLote[]): number {
  return Math.round(
    linhas.reduce((s, l) => s + (l.purchase_price ?? 0) * l.quantity, 0) * 100,
  ) / 100;
}

export function totalDeGarrafas(linhas: LinhaLote[]): number {
  return linhas.reduce((s, l) => s + l.quantity, 0);
}

/**
 * Verdadeiro quando a soma das linhas não bate com o total da fatura.
 *
 * Tolerância de 1€ para arredondamentos. Serve para avisar o utilizador de
 * que o modelo pode ter falhado uma linha — é a verificação que ele faria
 * a olho e que a app pode fazer por ele.
 */
export function totalDivergente(r: ResultadoLote): boolean {
  if (r.total_amount === undefined) return false;
  return Math.abs(totalDasLinhas(r.linhas) - r.total_amount) > 1;
}
