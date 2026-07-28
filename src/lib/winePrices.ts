/**
 * Preços de mercado.
 *
 * A chave do Wine-Searcher é secret de Edge Function, nunca do bundle. A
 * lógica pura de cálculo vive em `investimento.ts`, para ser testável sem
 * arrastar o cliente Supabase — ver a nota em `football.ts`.
 *
 * NOTA DE VIABILIDADE: a API do Wine-Searcher não tem tier self-serve nem
 * acesso público, por isso `fetchWineMarketPrice` devolve `null` até haver
 * contrato.
 *
 * A alternativa que funciona hoje é `precoComunidade`: mediana dos preços
 * que os próprios utilizadores registaram. Não é cotação de leilão, mas é
 * uma referência real do mercado português, é gratuita e melhora sozinha à
 * medida que a base cresce. A função no servidor só devolve resultado com
 * três ou mais utilizadores distintos, para não expor o preço de ninguém.
 */

import { invokeEdgeFunction, supabase, traduzErro } from '@/lib/supabase';
import type { Wine, WineMarketData } from '@/types';

export interface PrecoComunidade {
  mediana: number;
  minimo: number;
  maximo: number;
  /** Número de utilizadores distintos por trás do valor. */
  amostras: number;
}

/**
 * Referência de preço a partir da comunidade. `null` quando ainda não há
 * dados suficientes — que é o caso normal enquanto a base for pequena.
 */
export async function precoComunidade(wine: Wine): Promise<PrecoComunidade | null> {
  const { data, error } = await supabase.rpc('preco_comunidade', {
    p_producer: wine.producer,
    p_name: wine.name,
    p_vintage: wine.vintage ?? null,
  });

  if (error) {
    // Falta de referência não é erro de ecrã; a UI simplesmente não mostra.
    console.warn('preco_comunidade:', traduzErro(error));
    return null;
  }

  const linha = Array.isArray(data) ? data[0] : data;
  if (!linha || typeof linha.mediana !== 'number') return null;

  return {
    mediana: Number(linha.mediana),
    minimo: Number(linha.minimo),
    maximo: Number(linha.maximo),
    amostras: Number(linha.amostras),
  };
}

/**
 * Cotação para um vinho. Devolve `null` quando não há — sem cotação não é
 * erro de ecrã, é simplesmente falta de dados.
 */
export async function fetchWineMarketPrice(
  wine: Wine,
): Promise<WineMarketData | null> {
  const r = await invokeEdgeFunction<WineMarketData>('wine-market-price', {
    wine_id: wine.id,
    name: wine.name,
    producer: wine.producer,
    vintage: wine.vintage ?? null,
  });

  return r.ok ? r.data : null;
}

export { detectPriceSpike } from '@/lib/investimento';
