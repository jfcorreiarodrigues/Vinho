/**
 * Sommelier contextual via Gemini.
 *
 * O contexto (cave, clima, época) é construído no cliente por
 * `src/lib/sommelier.ts`, que é puro e testado. Esta função só o repassa ao
 * modelo com a chave, que nunca sai do servidor.
 *
 * Publicar: npx supabase functions deploy gemini-sommelier
 */

const MODELO = 'gemini-2.5-flash';
const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface Corpo {
  system: string;
  historico: { role: 'user' | 'model'; text: string }[];
  pergunta: string;
}

export async function conversar(
  corpo: Corpo,
  chave: string,
): Promise<string> {
  const contents = [
    ...corpo.historico.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: 'user', parts: [{ text: corpo.pergunta }] },
  ];

  const r = await fetch(`${URL_BASE}/${MODELO}:generateContent?key=${chave}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: corpo.system }] },
      // Mais alto do que no scan: aqui queremos conversa, não extracção.
      generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
    }),
  });

  if (!r.ok) throw new Error(`Gemini devolveu ${r.status}: ${await r.text()}`);

  const d = await r.json();
  const texto = d?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof texto !== 'string') throw new Error('Resposta sem texto');
  return texto.trim();
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
      if (!corpo?.pergunta || !corpo?.system) {
        return Response.json({ error: 'Falta system ou pergunta' }, { status: 400 });
      }
      return Response.json({ resposta: await conversar(corpo, chave) });
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : 'Erro desconhecido' },
        { status: 502 },
      );
    }
  });
}
