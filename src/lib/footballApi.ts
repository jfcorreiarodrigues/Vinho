/**
 * Acesso a jogos via Edge Function.
 *
 * Separado de `football.ts` para que a lógica pura (maridagens, formatação de
 * datas, agrupamentos) possa ser testada sem arrastar o cliente Supabase e o
 * React Native para dentro do runner de testes.
 */

import { COMPETICOES, EXEMPLOS, type ChaveCompeticao } from '@/lib/football';
import { invokeEdgeFunction } from '@/lib/supabase';
import type { Fixture } from '@/types';

export interface ResultadoJogos {
  jogos: Fixture[];
  /** Verdadeiro quando vieram dos exemplos e não da API. */
  exemplo: boolean;
}

/**
 * Busca os jogos dos últimos 3 dias e dos próximos 7. Nunca rejeita: sem
 * Edge Function publicada ou sem rede, devolve os exemplos com `exemplo: true`
 * para o ecrã poder avisar.
 */
export async function fetchFixtures(
  competicao: ChaveCompeticao,
): Promise<ResultadoJogos> {
  const r = await invokeEdgeFunction<Fixture[]>('football', {
    competition_id: COMPETICOES[competicao].id,
    dias_atras: 3,
    dias_a_frente: 7,
  });

  if (r.ok && r.data.length > 0) {
    return { jogos: r.data, exemplo: false };
  }
  return { jogos: EXEMPLOS[competicao], exemplo: true };
}
