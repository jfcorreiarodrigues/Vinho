/**
 * Leitura de faturas e prateleiras. Separado de `bulk.ts` para a
 * normalização continuar testável.
 */

import { normalizarLote, type ResultadoLote } from '@/lib/bulk';
import { invokeEdgeFunction } from '@/lib/supabase';
import type { Result } from '@/types';

export type TipoLote = 'fatura' | 'prateleira';

export async function lerLote(
  imagemBase64: string,
  tipo: TipoLote,
): Promise<Result<ResultadoLote>> {
  const r = await invokeEdgeFunction<Record<string, unknown>>('gemini-bulk', {
    imagem_base64: imagemBase64,
    tipo,
    mime: 'image/jpeg',
  });

  if (!r.ok) {
    return {
      ok: false,
      error:
        tipo === 'fatura'
          ? 'Não foi possível ler a fatura. Tenta uma foto mais nítida ou adiciona os vinhos manualmente.'
          : 'Não foi possível ler a prateleira. Tenta com menos garrafas por foto.',
    };
  }

  const normalizado = normalizarLote(r.data);

  if (normalizado.linhas.length === 0) {
    return {
      ok: false,
      error:
        tipo === 'fatura'
          ? 'Não encontrei vinhos nesta fatura. Confirma que a foto apanha as linhas todas.'
          : 'Não consegui identificar garrafas nesta foto. Tenta mais perto e com os rótulos à vista.',
    };
  }

  return { ok: true, data: normalizado };
}
