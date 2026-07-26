/**
 * Que alertas agendar e quando.
 *
 * Puro e testável: decidir *o quê* é lógica de negócio, agendar é I/O e vive
 * em `notifications.ts`. Sem esta separação não havia forma de verificar que
 * a app não bombardeia o utilizador — que é o risco real das notificações.
 */

import { detectPriceSpike } from '@/lib/investimento';
import type { Wine } from '@/types';

export interface AlertaAgendado {
  id: string;
  titulo: string;
  corpo: string;
  /** Quando disparar. */
  quando: Date;
}

/** Nunca mais do que isto de uma vez, por muito grande que seja a cave. */
export const MAX_ALERTAS_MATURACAO = 5;

/**
 * Vinhos a entrar no pico este ano ou no próximo.
 *
 * Ordena pelos que entram mais cedo e corta em `MAX_ALERTAS_MATURACAO`: uma
 * cave com 40 vinhos a amadurecer não pode gerar 40 notificações.
 */
export function alertasDeMaturacao(
  wines: Wine[],
  agora: Date = new Date(),
): AlertaAgendado[] {
  const ano = agora.getFullYear();

  return wines
    .filter((w) => {
      const inicio = w.maturation_window_start;
      return inicio !== undefined && (inicio === ano || inicio === ano + 1);
    })
    .sort((a, b) => (a.maturation_window_start ?? 0) - (b.maturation_window_start ?? 0))
    .slice(0, MAX_ALERTAS_MATURACAO)
    .map((w) => ({
      id: `maturacao-${w.id}`,
      titulo: '🍷 Entrou no pico',
      corpo: `${w.name}${w.vintage ? ` ${w.vintage}` : ''} está a entrar na janela ideal de consumo.`,
      quando: proximaSegunda(agora, 9),
    }));
}

/** Vinhos que saem do pico este ano — mais urgente do que entrar. */
export function alertasDeUltimaChamada(
  wines: Wine[],
  agora: Date = new Date(),
): AlertaAgendado[] {
  const ano = agora.getFullYear();

  return wines
    .filter((w) => w.maturation_window_end === ano)
    .slice(0, MAX_ALERTAS_MATURACAO)
    .map((w) => ({
      id: `ultima-chamada-${w.id}`,
      titulo: '⏳ Última chamada',
      corpo: `${w.name} sai do pico este ano. Vale a pena abrir antes do fim de ${ano}.`,
      quando: proximaSegunda(agora, 9),
    }));
}

/** Só acima de 15% de variação, conforme a secção 9.2. */
export function alertaDeVariacao(
  wine: Wine,
  precoAntigo: number,
  precoNovo: number,
  agora: Date = new Date(),
): AlertaAgendado | null {
  if (!detectPriceSpike(precoAntigo, precoNovo)) return null;

  const pct = Math.round(((precoNovo - precoAntigo) / precoAntigo) * 100);
  const subiu = pct > 0;

  return {
    id: `preco-${wine.id}-${Date.now()}`,
    titulo: subiu ? '📈 Valorizou' : '📉 Desvalorizou',
    corpo: `${wine.name} ${subiu ? 'subiu' : 'desceu'} ${Math.abs(pct)}% no mercado.`,
    quando: agora,
  };
}

/** Segunda-feira às 8h, para o digest semanal. */
export function proximoDigest(agora: Date = new Date()): Date {
  return proximaSegunda(agora, 8);
}

export function resumoDigest(wines: Wine[], agora: Date = new Date()): string {
  const ano = agora.getFullYear();
  const noPico = wines.filter(
    (w) =>
      w.maturation_window_start !== undefined &&
      w.maturation_window_start <= ano &&
      (w.maturation_window_end ?? ano) >= ano,
  ).length;
  const garrafas = wines.reduce((s, w) => s + w.quantity, 0);

  if (garrafas === 0) return 'A tua cave está vazia — começa por adicionar uma garrafa.';
  if (noPico === 0) return `${garrafas} garrafas em cave. Nenhuma no pico esta semana.`;
  return `${garrafas} garrafas em cave · ${noPico} ${noPico === 1 ? 'no pico' : 'no pico'} esta semana.`;
}

/**
 * Próxima segunda-feira à hora indicada. Se hoje já é segunda mas ainda não
 * passou a hora, é hoje.
 */
export function proximaSegunda(agora: Date, hora: number): Date {
  const d = new Date(agora);
  d.setHours(hora, 0, 0, 0);

  const diasAteSegunda = (8 - agora.getDay()) % 7;
  if (diasAteSegunda === 0 && d.getTime() > agora.getTime()) return d;

  d.setDate(d.getDate() + (diasAteSegunda === 0 ? 7 : diasAteSegunda));
  return d;
}
