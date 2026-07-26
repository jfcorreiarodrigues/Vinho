/**
 * Lógica pura da cave: estatísticas, filtros e janela de maturação.
 *
 * Vive fora do store de propósito. São funções sem dependências nem efeitos,
 * o que as torna testáveis directamente (ver `src/store/selectors.test.ts`) —
 * e é aqui que mora a aritmética que falha em silêncio se estiver errada.
 */

import type { CellarStats, Wine, WineFilter } from '@/types';

/** Inflação anual de referência para Portugal (secção 9.2 da spec). */
export const INFLACAO_PT_ANUAL = 0.028;

/** A partir deste valor um vinho mostra o selo Pureza (secção 10.3). */
export const PUREZA_MIN = 70;

/** A partir deste valor um vinho conta como peça de investimento. */
export const RARIDADE_MIN = 70;

export function anoActual(): number {
  return new Date().getFullYear();
}

/**
 * Valor de mercado das garrafas deste lote. Sem cotação conhecida usamos o
 * preço de compra — assumir zero faria o ROI parecer catastrófico só porque
 * ainda não houve fetch de mercado.
 */
export function valorDeMercado(wine: Wine): number {
  const unitario = wine.current_market_value ?? wine.purchase_price ?? 0;
  return unitario * wine.quantity;
}

export function valorInvestido(wine: Wine): number {
  return (wine.purchase_price ?? 0) * wine.quantity;
}

export function ehPureza(wine: Wine): boolean {
  return (
    (wine.pureza_score ?? 0) >= PUREZA_MIN ||
    wine.is_natural ||
    wine.is_low_intervention ||
    wine.is_biodynamic
  );
}

/**
 * Um vinho está no pico se o ano actual cai dentro da janela de maturação.
 * Janela em aberto de um dos lados conta como aberta desse lado; sem qualquer
 * janela definida não se pode afirmar que está no pico.
 */
export function estaNoPico(wine: Wine, ano: number = anoActual()): boolean {
  const inicio = wine.maturation_window_start;
  const fim = wine.maturation_window_end;

  if (inicio === undefined && fim === undefined) return false;
  if (inicio !== undefined && ano < inicio) return false;
  if (fim !== undefined && ano > fim) return false;
  return true;
}

/** Alimenta o banner amarelo da CaveScreen (secção 10.4). */
export function saiDoPicoEsteAno(wine: Wine, ano: number = anoActual()): boolean {
  return wine.maturation_window_end === ano;
}

export function jaPassouDoPico(wine: Wine, ano: number = anoActual()): boolean {
  return wine.maturation_window_end !== undefined && ano > wine.maturation_window_end;
}

export function calcularStats(
  wines: Wine[],
  ano: number = anoActual(),
): CellarStats {
  const totalGarrafas = wines.reduce((s, w) => s + w.quantity, 0);
  const investido = wines.reduce((s, w) => s + valorInvestido(w), 0);
  const mercado = wines.reduce((s, w) => s + valorDeMercado(w), 0);

  const garrafasPureza = wines
    .filter(ehPureza)
    .reduce((s, w) => s + w.quantity, 0);

  return {
    total_bottles: totalGarrafas,
    total_invested: arredondar(investido),
    current_market_value: arredondar(mercado),
    // Sem investimento registado não há ROI para mostrar — 0 em vez de
    // divisão por zero.
    roi_pct: investido > 0 ? arredondar(((mercado - investido) / investido) * 100) : 0,
    wines_at_peak: wines.filter((w) => estaNoPico(w, ano)).length,
    natural_pct: totalGarrafas > 0
      ? arredondar((garrafasPureza / totalGarrafas) * 100)
      : 0,
  };
}

/**
 * ROI anualizado face à inflação portuguesa. `anos` abaixo de 1 é tratado
 * como 1 para não inflacionar taxas de compras muito recentes.
 */
export function roiAnualizado(
  investido: number,
  mercado: number,
  anos: number,
): { roi_pct: number; profit_eur: number; annualized_pct: number; vs_inflation_pct: number } {
  if (investido <= 0) {
    return { roi_pct: 0, profit_eur: 0, annualized_pct: 0, vs_inflation_pct: 0 };
  }

  const periodo = Math.max(anos, 1);
  const roi = (mercado - investido) / investido;
  const anualizado = Math.pow(1 + roi, 1 / periodo) - 1;

  return {
    roi_pct: arredondar(roi * 100),
    profit_eur: arredondar(mercado - investido),
    annualized_pct: arredondar(anualizado * 100),
    vs_inflation_pct: arredondar((anualizado - INFLACAO_PT_ANUAL) * 100),
  };
}

export function filtrarVinhos(
  wines: Wine[],
  filtro: WineFilter,
  ano: number = anoActual(),
): Wine[] {
  switch (filtro) {
    case 'todos':
      return wines;
    case 'tintos':
      return wines.filter((w) => w.wine_type === 'tinto');
    case 'brancos':
      return wines.filter((w) => w.wine_type === 'branco');
    case 'roses':
      return wines.filter((w) => w.wine_type === 'rose');
    case 'espumantes':
      return wines.filter((w) => w.wine_type === 'espumante');
    case 'naturais':
      return wines.filter(ehPureza);
    case 'beber_agora':
      return wines.filter((w) => estaNoPico(w, ano) || jaPassouDoPico(w, ano));
    case 'investimento':
      return wines.filter(
        (w) =>
          (w.rarity_score ?? 0) >= RARIDADE_MIN ||
          valorDeMercado(w) > valorInvestido(w),
      );
  }
}

/** Duas casas decimais, sem os artefactos de vírgula flutuante. */
function arredondar(n: number): number {
  return Math.round(n * 100) / 100;
}
