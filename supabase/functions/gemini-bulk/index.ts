/**
 * Entrada em lote: fatura de garrafeira ou prateleira fotografada.
 *
 * Publicar: npx supabase functions deploy gemini-bulk
 */

const MODELO = 'gemini-2.5-flash';
const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const PROMPT_FATURA = `És um assistente que lê faturas de garrafeiras portuguesas (Garrafeira Nacional, El Corte Inglés, Garrafeira do Carmo e outras). Devolve APENAS JSON válido.

- Extrai só as linhas que são vinho. Ignora portes, sacos, embalagens e serviços.
- Preço unitário, não o total da linha. Se a fatura só der o total, divide pela quantidade.
- Não inventes: campo que não consegas ler vai a null.

{"store_name":string|null,"invoice_date":string|null,"total_amount":number|null,"wines":[{"name":string,"producer":string|null,"region":string|null,"vintage":number|null,"quantity":number,"purchase_price":number|null,"wine_type":"tinto"|"branco"|"rose"|"espumante"|"fortificado"|null}]}`;

const PROMPT_PRATELEIRA = `Identifica todas as garrafas de vinho visíveis nesta fotografia de prateleira ou cave. Devolve APENAS JSON válido.

- Uma entrada por garrafa distinta. Se houver várias iguais, junta e usa quantity.
- Garrafas parcialmente tapadas ou desfocadas: inclui o que conseguires ler, o resto a null.
- Foco em Portugal: regiões e castas portuguesas.
- Não inventes rótulos que não consegues ler. Preferimos menos entradas a entradas erradas.

{"wines":[{"name":string,"producer":string|null,"region":string|null,"vintage":number|null,"quantity":number,"wine_type":"tinto"|"branco"|"rose"|"espumante"|"fortificado"|null,"confidence":number}]}`;

interface Corpo {
  imagem_base64: string;
  tipo: 'fatura' | 'prateleira';
  mime?: string;
}

export async function lerLote(
  corpo: Corpo,
  chave: string,
): Promise<unknown> {
  const r = await fetch(`${URL_BASE}/${MODELO}:generateContent?key=${chave}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: corpo.tipo === 'fatura' ? PROMPT_FATURA : PROMPT_PRATELEIRA },
            {
              inline_data: {
                mime_type: corpo.mime ?? 'image/jpeg',
                data: corpo.imagem_base64,
              },
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    }),
  });

  if (!r.ok) throw new Error(`Gemini devolveu ${r.status}: ${await r.text()}`);

  const d = await r.json();
  const texto = d?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof texto !== 'string') throw new Error('Resposta sem texto');

  return JSON.parse(texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, ''));
}

// @ts-expect-error — `Deno` só existe no runtime das Edge Functions.
if (typeof Deno !== 'undefined' && Deno.serve) {
  // @ts-expect-error — idem.
  Deno.serve(async (req: Request) => {
    // @ts-expect-error — idem.
    const chave = Deno.env.get('GEMINI_API_KEY');
    if (!chave) return Response.json({ error: 'GEMINI_API_KEY não configurada' }, { status: 500 });

    try {
      const corpo = (await req.json()) as Corpo;
      if (!corpo?.imagem_base64) {
        return Response.json({ error: 'Falta imagem_base64' }, { status: 400 });
      }
      return Response.json(await lerLote(corpo, chave));
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : 'Erro desconhecido' },
        { status: 502 },
      );
    }
  });
}
