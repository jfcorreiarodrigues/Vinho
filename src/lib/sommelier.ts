/**
 * Contexto e mensagens do sommelier.
 *
 * Puro e testável — a chamada ao modelo vive em `sommelierApi.ts`.
 *
 * O contexto é a peça que decide a qualidade das respostas. Um sommelier que
 * não sabe o que está na cave dá conselhos genéricos que qualquer motor de
 * busca dá melhor. Mas o contexto também não pode crescer sem limite: uma
 * cave de 300 vinhos gastaria o orçamento de tokens só a listar inventário.
 */

import { getSeasonalProducts } from '@/lib/lisboaAberta';
import { estaNoPico, jaPassouDoPico } from '@/store/selectors';
import type { Message, WeatherData, Wine } from '@/types';

/** Além disto, o inventário é resumido em vez de listado vinho a vinho. */
export const MAX_VINHOS_NO_CONTEXTO = 25;

/** Só as últimas trocas seguem para o modelo. */
export const MAX_MENSAGENS_HISTORICO = 10;

export const SUGESTOES = [
  'Qual vinho abro hoje?',
  'O que está no pico?',
  'Maridagem para bacalhau',
  'Vinho para o jogo ⚽',
  'Wine bars em Lisboa',
  'O que vale a pena guardar?',
] as const;

export function saudacaoHora(agora: Date = new Date()): string {
  const h = agora.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 20) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Resume a cave para o modelo.
 *
 * Prioriza o que é accionável — o que está no pico e o que já passou — e só
 * depois preenche com o resto. Numa cave grande, os vinhos que interessam à
 * conversa são esses, não os 200 que ainda têm anos pela frente.
 */
export function resumirCave(wines: Wine[], maximo = MAX_VINHOS_NO_CONTEXTO): string {
  if (wines.length === 0) return 'A cave está vazia.';

  const prioridade = (w: Wine) =>
    jaPassouDoPico(w) ? 0 : estaNoPico(w) ? 1 : 2;

  const ordenados = [...wines].sort((a, b) => prioridade(a) - prioridade(b));
  const mostrados = ordenados.slice(0, maximo);

  const linhas = mostrados.map((w) => {
    const marcas = [
      w.vintage ? String(w.vintage) : null,
      `${w.quantity} garrafa${w.quantity === 1 ? '' : 's'}`,
      jaPassouDoPico(w) ? 'JÁ PASSOU DO PICO' : estaNoPico(w) ? 'NO PICO' : null,
      w.is_natural || w.is_low_intervention ? 'natural' : null,
    ].filter(Boolean);
    return `- ${w.producer} ${w.name} (${w.region}${w.grape_varieties[0] ? `, ${w.grape_varieties[0]}` : ''}) — ${marcas.join(', ')}`;
  });

  const restantes = wines.length - mostrados.length;
  if (restantes > 0) {
    linhas.push(`- (mais ${restantes} vinhos não listados)`);
  }

  return linhas.join('\n');
}

export function descreverClima(w: WeatherData | null): string {
  if (!w) return 'Tempo em Lisboa: desconhecido.';
  const notas = [
    w.is_hot ? 'está calor' : null,
    w.is_cold ? 'está frio' : null,
    w.is_rainy ? 'está a chover' : null,
  ].filter(Boolean);
  return `Tempo em Lisboa: ${Math.round(w.temp_c)}°C, ${w.condition}${notas.length ? ` (${notas.join(', ')})` : ''}.`;
}

/**
 * System prompt. As restrições existem por razões concretas:
 * - PT-PT porque o modelo escorrega para português do Brasil sem instrução;
 * - proibição de inventar vinhos porque sugerir uma garrafa que o utilizador
 *   não tem é o falhanço mais irritante possível neste ecrã;
 * - brevidade porque é um chat em ecrã de telemóvel.
 */
export function construirSystemPrompt(
  wines: Wine[],
  weather: WeatherData | null,
  agora: Date = new Date(),
): string {
  const produtos = getSeasonalProducts(agora)
    .map((p) => `${p.name} (vai bem com ${p.pairs_with.join(', ')})`)
    .join('; ');

  return `És o sommelier da VinhaVibe, especialista em vinhos portugueses, a falar com um utilizador em Lisboa.

REGRAS:
- Responde SEMPRE em português europeu. Nunca português do Brasil.
- Recomenda apenas vinhos que estão na cave do utilizador, listada abaixo. Se não houver nada adequado, diz isso e sugere o que procurar numa garrafeira — não inventes garrafas que ele não tem.
- Sê breve: duas ou três frases. Isto é um chat de telemóvel, não uma ficha de prova.
- Quando recomendares, diz porquê em linguagem simples. Nada de jargão gratuito.
- Se um vinho já passou do pico, avisa.

CAVE DO UTILIZADOR:
${resumirCave(wines)}

CONTEXTO:
${descreverClima(weather)}
Época nos mercados municipais: ${produtos || 'sem dados'}.
Hora: ${saudacaoHora(agora).toLowerCase()}.`;
}

/** Corta o histórico para as últimas trocas, mantendo a ordem. */
export function historicoParaModelo(
  mensagens: Message[],
  maximo = MAX_MENSAGENS_HISTORICO,
): { role: 'user' | 'model'; text: string }[] {
  return mensagens
    .slice(-maximo)
    .map((m) => ({ role: m.role === 'user' ? ('user' as const) : ('model' as const), text: m.content }));
}

export function mensagemInicial(
  wines: Wine[],
  weather: WeatherData | null,
  agora: Date = new Date(),
): string {
  const noPico = wines.filter((w) => estaNoPico(w));
  const saudacao = saudacaoHora(agora);

  if (wines.length === 0) {
    return `${saudacao}. Ainda não conheço a sua cave — assim que adicionar as primeiras garrafas, posso ajudar a escolher.`;
  }
  if (noPico.length > 0) {
    const w = noPico[0]!;
    return `${saudacao}. Tem ${noPico.length} ${noPico.length === 1 ? 'vinho' : 'vinhos'} no pico — o ${w.producer} ${w.name} está pronto. Em que posso ajudar?`;
  }
  const clima = weather?.is_hot
    ? ' Com este calor, algo fresco cai bem.'
    : weather?.is_cold
      ? ' Com este frio, apetece algo encorpado.'
      : '';
  return `${saudacao}.${clima} Em que posso ajudar?`;
}

export function criarMensagem(role: Message['role'], content: string): Message {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    timestamp: new Date().toISOString(),
  };
}
