/**
 * Mede a precisão do Gemini em etiquetas de vinho português.
 *
 *   GEMINI_API_KEY=AIza... npx tsx scripts/testar-gemini.ts
 *
 * Este teste existe porque a precisão do scan é a premissa de que depende
 * a app inteira, e é a premissa com menos garantias: pequenos produtores
 * portugueses são exactamente o caso com menos dados de treino. Se a taxa
 * de acerto for baixa, isso não é um bug a corrigir — é uma decisão de
 * produto a rever, e mais vale saber antes de construir a UI toda.
 *
 * COMO PREPARAR
 *
 * 1. Põe fotos de etiquetas em `scripts/etiquetas/` (jpg ou png).
 * 2. Cria `scripts/etiquetas/esperado.json` com a verdade de cada uma:
 *
 *    {
 *      "redoma-2020.jpg": {
 *        "producer": "Niepoort",
 *        "name": "Redoma",
 *        "region": "Douro",
 *        "vintage": 2020,
 *        "wine_type": "tinto"
 *      }
 *    }
 *
 * Só é preciso preencher os campos que queres avaliar. 30 etiquetas dão
 * uma leitura útil; 10 já dão um sinal.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { identificarEtiqueta } from '../supabase/functions/gemini-scan/index';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const pasta = join(raiz, 'scripts', 'etiquetas');

function chaveApi(): string {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;

  const env = join(raiz, '.env');
  if (existsSync(env)) {
    for (const linha of readFileSync(env, 'utf8').split('\n')) {
      const m = linha.match(/^GEMINI_API_KEY=(.+)$/);
      if (m?.[1]) return m[1].trim();
    }
  }
  throw new Error(
    'Falta GEMINI_API_KEY. Define-a no ambiente ou no .env (nunca no código).',
  );
}

type Esperado = Record<string, Record<string, unknown>>;
type Obtido = Record<string, unknown>;

/** Comparação tolerante: acentos, maiúsculas e espaços não contam como erro. */
function igual(esperado: unknown, obtido: unknown): boolean {
  if (esperado == null) return true;
  if (obtido == null) return false;

  if (typeof esperado === 'number') return Number(obtido) === esperado;

  const norm = (v: unknown) =>
    String(v)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  const a = norm(esperado);
  const b = norm(obtido);
  // Um produtor identificado como "Niepoort" quando se esperava
  // "Dirk Niepoort" conta como acerto.
  return a === b || b.includes(a) || a.includes(b);
}

async function main() {
  const chave = chaveApi();

  if (!existsSync(pasta)) throw new Error(`Pasta em falta: ${pasta}`);
  const manifesto = join(pasta, 'esperado.json');
  if (!existsSync(manifesto)) {
    throw new Error(
      `Falta ${manifesto}. Ver o cabeçalho deste ficheiro para o formato.`,
    );
  }

  const esperados: Esperado = JSON.parse(readFileSync(manifesto, 'utf8'));
  const ficheiros = readdirSync(pasta).filter((f) =>
    ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(f).toLowerCase()),
  );

  if (ficheiros.length === 0) {
    throw new Error(`Sem imagens em ${pasta}. Põe lá fotos de etiquetas.`);
  }

  console.log(`\n▶ ${ficheiros.length} etiquetas\n`);

  const campos = ['producer', 'name', 'region', 'vintage', 'wine_type'] as const;
  const acertos: Record<string, number> = {};
  const avaliados: Record<string, number> = {};
  const confiancas: number[] = [];
  let falhasTotais = 0;

  for (const ficheiro of ficheiros) {
    const esperado = esperados[ficheiro];
    if (!esperado) {
      console.log(`  ⚠  ${ficheiro} — sem entrada em esperado.json, ignorado`);
      continue;
    }

    const mime = extname(ficheiro).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    const base64 = readFileSync(join(pasta, ficheiro)).toString('base64');

    let obtido: Obtido;
    try {
      obtido = (await identificarEtiqueta(base64, chave, mime)) as Obtido;
    } catch (e) {
      falhasTotais += 1;
      console.log(`  ✗  ${ficheiro} — ${e instanceof Error ? e.message : e}`);
      continue;
    }

    const confianca = Number(obtido.confidence ?? 0);
    confiancas.push(confianca);

    const erros: string[] = [];
    for (const campo of campos) {
      if (!(campo in esperado)) continue;
      avaliados[campo] = (avaliados[campo] ?? 0) + 1;
      if (igual(esperado[campo], obtido[campo])) {
        acertos[campo] = (acertos[campo] ?? 0) + 1;
      } else {
        erros.push(`${campo}: esperado "${esperado[campo]}", obtido "${obtido[campo]}"`);
      }
    }

    const marca = erros.length === 0 ? '✓' : '·';
    console.log(`  ${marca}  ${ficheiro}  (confiança ${confianca.toFixed(2)})`);
    erros.forEach((e) => console.log(`       ${e}`));
  }

  console.log('\n── precisão por campo ──');
  for (const campo of campos) {
    const total = avaliados[campo] ?? 0;
    if (total === 0) continue;
    const certos = acertos[campo] ?? 0;
    const pct = Math.round((certos / total) * 100);
    console.log(`  ${campo.padEnd(12)} ${String(pct).padStart(3)}%  (${certos}/${total})`);
  }

  if (confiancas.length > 0) {
    const media = confiancas.reduce((s, c) => s + c, 0) / confiancas.length;
    const baixas = confiancas.filter((c) => c < 0.6).length;
    console.log(`\n  confiança média   ${media.toFixed(2)}`);
    console.log(`  abaixo de 0,60    ${baixas} de ${confiancas.length}`);
  }
  if (falhasTotais > 0) console.log(`\n  ${falhasTotais} chamadas falharam`);

  // A leitura que interessa é a do produtor: sem ele, nada mais encaixa.
  const prodTotal = avaliados.producer ?? 0;
  if (prodTotal > 0) {
    const pct = Math.round(((acertos.producer ?? 0) / prodTotal) * 100);
    console.log(
      `\n${
        pct >= 80
          ? '✅ Precisão suficiente para o scan ser o fluxo principal.'
          : pct >= 60
            ? '⚠️  Aceitável só com confirmação manual obrigatória antes de gravar.'
            : '❌ Insuficiente. O scan não pode ser o fluxo principal — rever a premissa.'
      }\n`,
    );
  }
}

void main().catch((e) => {
  console.error(`\n${e instanceof Error ? e.message : e}\n`);
  process.exit(1);
});
