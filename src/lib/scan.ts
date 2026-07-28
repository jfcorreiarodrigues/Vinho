/**
 * Normalização e validação do resultado do scan.
 *
 * Puro por necessidade: o `gemini.ts` importa `expo-image-picker`, que
 * arrasta globais do React Native e torna o módulo intestável fora da app.
 * É o mesmo padrão de `football.ts`/`footballApi.ts` e de
 * `selectors.ts`/`store` — regra desta base de código: nada que toque em
 * React Native ou em rede fica no mesmo módulo que lógica a testar.
 */

import type { ScanResult, Wine, WineInput, WineType } from '@/types';

/** Abaixo disto, a app pede confirmação em vez de aceitar a leitura. */
export const CONFIANCA_MINIMA = 0.6;

/** Forma bruta do que a Edge Function devolve — tudo opcional de propósito. */
export interface RespostaScan {
  name: string | null;
  producer: string | null;
  region: string | null;
  country?: string | null;
  wine_type?: string | null;
  vintage?: number | null;
  grape_varieties?: unknown;
  tasting_notes?: string | null;
  food_pairings?: unknown;
  maturation_window_start?: number | null;
  maturation_window_end?: number | null;
  is_natural?: boolean;
  is_low_intervention?: boolean;
  is_organic?: boolean;
  is_biodynamic?: boolean;
  pureza_score?: number | null;
  rarity_score?: number | null;
  confidence?: number;
}

const TIPOS_VALIDOS: WineType[] = ['tinto', 'branco', 'rose', 'espumante', 'fortificado'];

function listaDeTextos(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/**
 * Normaliza a resposta do modelo.
 *
 * O modelo devolve JSON estruturado, mas continua a ser saída de um LLM:
 * pode faltar um campo, vir um tipo de vinho inventado ou um ano absurdo.
 * Nada disto pode chegar ao formulário sem passar por aqui.
 */
export function normalizarScan(bruto: RespostaScan): ScanResult {
  const tipo = String(bruto.wine_type ?? '').toLowerCase();
  const anoActual = new Date().getFullYear();
  const vintage = typeof bruto.vintage === 'number' ? bruto.vintage : undefined;

  return {
    name: bruto.name ?? '',
    producer: bruto.producer ?? '',
    region: bruto.region ?? '',
    country: bruto.country ?? 'Portugal',
    wine_type: TIPOS_VALIDOS.includes(tipo as WineType) ? (tipo as WineType) : 'tinto',
    // Aceita a vindima do ano seguinte: engarrafamentos antecipados existem.
    vintage: vintage && vintage >= 1800 && vintage <= anoActual + 1 ? vintage : undefined,
    grape_varieties: listaDeTextos(bruto.grape_varieties),
    tasting_notes: bruto.tasting_notes ?? undefined,
    food_pairings: listaDeTextos(bruto.food_pairings),
    maturation_window_start: bruto.maturation_window_start ?? undefined,
    maturation_window_end: bruto.maturation_window_end ?? undefined,
    is_natural: bruto.is_natural === true,
    is_low_intervention: bruto.is_low_intervention === true,
    is_organic: bruto.is_organic === true,
    is_biodynamic: bruto.is_biodynamic === true,
    pureza_score: typeof bruto.pureza_score === 'number' ? bruto.pureza_score : 0,
    rarity_score: typeof bruto.rarity_score === 'number' ? bruto.rarity_score : 0,
    confidence: typeof bruto.confidence === 'number' ? bruto.confidence : 0,
  };
}

/**
 * Verdadeiro quando a leitura não é de confiança suficiente para gravar.
 *
 * Sem produtor ou sem nome, não interessa o que o modelo diga da própria
 * confiança — falta o essencial para identificar o vinho.
 */
export function precisaConfirmacao(r: ScanResult): boolean {
  return r.confidence < CONFIANCA_MINIMA || !r.producer || !r.name;
}

/** Converte o resultado do scan em algo gravável na cave. */
export function scanParaWine(
  r: ScanResult,
  userId: string,
  quantidade: number,
  preco?: number,
): WineInput {
  return {
    user_id: userId,
    name: r.name,
    producer: r.producer,
    region: r.region,
    country: r.country,
    wine_type: r.wine_type,
    grape_varieties: r.grape_varieties,
    vintage: r.vintage,
    quantity: quantidade,
    purchase_price: preco,
    purchase_date: new Date().toISOString().slice(0, 10),
    tasting_notes: r.tasting_notes,
    food_pairings: r.food_pairings,
    maturation_window_start: r.maturation_window_start,
    maturation_window_end: r.maturation_window_end,
    is_natural: r.is_natural,
    is_low_intervention: r.is_low_intervention,
    is_organic: r.is_organic,
    is_biodynamic: r.is_biodynamic,
    pureza_score: r.pureza_score,
    rarity_score: r.rarity_score,
    source: 'scan',
  } satisfies Omit<Wine, 'id' | 'created_at' | 'updated_at'>;
}
