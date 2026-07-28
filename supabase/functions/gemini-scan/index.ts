/**
 * Identificação de etiquetas de vinho via Gemini Vision.
 *
 * Corre no servidor de propósito: a chave do Gemini é secret desta função e
 * nunca entra no bundle da app. O cliente invoca com o JWT do utilizador,
 * envia a imagem em base64 e recebe um ScanResult.
 *
 * Publicar:  npx supabase functions deploy gemini-scan
 * Segredo:   npx supabase secrets set GEMINI_API_KEY=AIza...
 */

const MODELO = 'gemini-2.0-flash';
const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * O prompt é a peça que determina a precisão, e o foco em Portugal é
 * deliberado: sem ele o modelo tende a devolver castas e regiões francesas
 * ou espanholas para etiquetas portuguesas pouco conhecidas.
 *
 * `confidence` é pedido explicitamente para a app poder pedir confirmação
 * manual em vez de gravar um palpite como se fosse facto.
 */
const PROMPT = `És um especialista em vinhos portugueses. Analisa esta etiqueta e devolve APENAS JSON válido, sem markdown.

Regras:
- Foca-te em Portugal: regiões (Douro, Alentejo, Vinho Verde, Dão, Bairrada, Setúbal, Tejo, Lisboa, Algarve, Madeira, Açores) e castas autóctones (Touriga Nacional, Touriga Franca, Tinta Roriz, Baga, Alvarinho, Loureiro, Encruzado, Arinto, Aragonez, Trincadeira, Castelão, Alfrocheiro, Bical, Fernão Pires).
- Se não conseguires ler um campo, devolve null. NÃO inventes.
- confidence é a tua confiança real de 0 a 1 na identificação do produtor e nome. Sê conservador: abaixo de 0.6 a app pede confirmação ao utilizador.
- pureza_score de 0 a 100 só se a etiqueta indicar produção natural, biológica, biodinâmica ou baixa intervenção. Caso contrário null.
- rarity_score de 0 a 100 baseado em quão raro é o vinho no mercado português. Se não souberes, null.

Formato:
{"name":string|null,"producer":string|null,"region":string|null,"country":string,"wine_type":"tinto"|"branco"|"rose"|"espumante"|"fortificado","vintage":number|null,"grape_varieties":string[],"tasting_notes":string|null,"food_pairings":string[],"maturation_window_start":number|null,"maturation_window_end":number|null,"is_natural":boolean,"is_low_intervention":boolean,"is_organic":boolean,"is_biodynamic":boolean,"pureza_score":number|null,"rarity_score":number|null,"confidence":number}`;

interface Corpo {
  imagem_base64: string;
  mime?: string;
}

export function extrairJson(texto: string): unknown {
  // O modelo às vezes embrulha em ```json apesar da instrução.
  const limpo = texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '');
  return JSON.parse(limpo);
}

export async function identificarEtiqueta(
  imagemBase64: string,
  chave: string,
  mime = 'image/jpeg',
): Promise<unknown> {
  const resposta = await fetch(`${URL_BASE}/${MODELO}:generateContent?key=${chave}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mime, data: imagemBase64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    }),
  });

  if (!resposta.ok) {
    throw new Error(`Gemini devolveu ${resposta.status}: ${await resposta.text()}`);
  }

  const dados = await resposta.json();
  const texto = dados?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof texto !== 'string') {
    throw new Error('Resposta do Gemini sem texto utilizável');
  }

  return extrairJson(texto);
}

// @ts-expect-error — `Deno` só existe no runtime das Edge Functions.
if (typeof Deno !== 'undefined' && Deno.serve) {
  // @ts-expect-error — idem.
  Deno.serve(async (req: Request) => {
    // @ts-expect-error — idem.
    const chave = Deno.env.get('GEMINI_API_KEY');
    if (!chave) {
      return Response.json({ error: 'GEMINI_API_KEY não configurada' }, { status: 500 });
    }

    try {
      const corpo = (await req.json()) as Corpo;
      if (!corpo?.imagem_base64) {
        return Response.json({ error: 'Falta imagem_base64' }, { status: 400 });
      }

      const resultado = await identificarEtiqueta(
        corpo.imagem_base64,
        chave,
        corpo.mime ?? 'image/jpeg',
      );
      return Response.json(resultado);
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : 'Erro desconhecido' },
        { status: 502 },
      );
    }
  });
}
