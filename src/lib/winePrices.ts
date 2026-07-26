/**
 * Preços de mercado.
 *
 * A chave do Wine-Searcher é secret de Edge Function, nunca do bundle. A
 * lógica pura de cálculo vive em `investimento.ts`, para ser testável sem
 * arrastar o cliente Supabase — ver a nota em `football.ts`.
 *
 * NOTA DE VIABILIDADE: a API do Wine-Searcher não tem tier self-serve nem
 * acesso público. Enquanto não houver contrato, `fetchWineMarketPrice`
 * devolve sempre `null` e a app usa o preço de compra. Os ecrãs têm de
 * funcionar sem cotação — e funcionam.
 */

import { invokeEdgeFunction } from '@/lib/supabase';
import type { Wine, WineMarketData } from '@/types';

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
