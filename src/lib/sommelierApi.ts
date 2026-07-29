/**
 * Chamada ao sommelier. Separado de `sommelier.ts` para que a construção do
 * contexto continue testável sem arrastar o cliente Supabase.
 */

import {
  construirSystemPrompt,
  historicoParaModelo,
} from '@/lib/sommelier';
import { invokeEdgeFunction } from '@/lib/supabase';
import type { Message, Result, WeatherData, Wine } from '@/types';

export async function perguntarAoSommelier(
  pergunta: string,
  historico: Message[],
  wines: Wine[],
  weather: WeatherData | null,
): Promise<Result<string>> {
  const r = await invokeEdgeFunction<{ resposta: string }>('gemini-sommelier', {
    system: construirSystemPrompt(wines, weather),
    historico: historicoParaModelo(historico),
    pergunta,
  });

  if (!r.ok || typeof r.data?.resposta !== 'string') {
    return {
      ok: false,
      error: 'O sommelier não está disponível de momento. Tenta daqui a pouco.',
    };
  }
  return { ok: true, data: r.data.resposta };
}
