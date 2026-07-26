import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MAX_ALERTAS_MATURACAO,
  alertaDeVariacao,
  alertasDeMaturacao,
  alertasDeUltimaChamada,
  proximaSegunda,
  proximoDigest,
  resumoDigest,
} from '@/lib/alertas';
import type { Wine } from '@/types';

function vinho(o: Partial<Wine> & { id: string }): Wine {
  return {
    user_id: 'u', name: 'Vinho', producer: 'P', region: 'Douro', country: 'Portugal',
    wine_type: 'tinto', grape_varieties: [], quantity: 1, food_pairings: [],
    is_natural: false, is_low_intervention: false, is_organic: false,
    is_biodynamic: false, source: 'manual', created_at: '2026-01-01',
    updated_at: '2026-01-01', ...o,
  };
}

// Quarta-feira, 22 de Julho de 2026.
const QUARTA = new Date('2026-07-22T12:00:00');

test('alerta de maturação apanha este ano e o próximo', () => {
  const a = alertasDeMaturacao([
    vinho({ id: 'este', maturation_window_start: 2026 }),
    vinho({ id: 'proximo', maturation_window_start: 2027 }),
    vinho({ id: 'longe', maturation_window_start: 2030 }),
    vinho({ id: 'passado', maturation_window_start: 2020 }),
  ], QUARTA);
  assert.deepEqual(a.map((x) => x.id), ['maturacao-este', 'maturacao-proximo']);
});

test('vinho sem janela não gera alerta', () => {
  assert.equal(alertasDeMaturacao([vinho({ id: 'a' })], QUARTA).length, 0);
});

test('nunca agenda mais alertas do que o limite', () => {
  const muitos = Array.from({ length: 40 }, (_, i) =>
    vinho({ id: `w${i}`, maturation_window_start: 2026 }),
  );
  assert.equal(alertasDeMaturacao(muitos, QUARTA).length, MAX_ALERTAS_MATURACAO);
});

test('última chamada só para quem sai do pico este ano', () => {
  const a = alertasDeUltimaChamada([
    vinho({ id: 'sai', maturation_window_end: 2026 }),
    vinho({ id: 'fica', maturation_window_end: 2030 }),
  ], QUARTA);
  assert.equal(a.length, 1);
  assert.ok(a[0]?.corpo.includes('2026'));
});

test('variação de preço só notifica acima de 15%', () => {
  const w = vinho({ id: 'a', name: 'Redoma' });
  assert.equal(alertaDeVariacao(w, 100, 110, QUARTA), null);
  const sobe = alertaDeVariacao(w, 100, 130, QUARTA);
  assert.ok(sobe?.corpo.includes('subiu 30%'));
  const desce = alertaDeVariacao(w, 100, 70, QUARTA);
  assert.ok(desce?.corpo.includes('desceu 30%'));
});

test('digest é sempre à segunda de manhã', () => {
  const d = proximoDigest(QUARTA);
  assert.equal(d.getDay(), 1, 'devia ser segunda-feira');
  assert.equal(d.getHours(), 8);
  assert.ok(d.getTime() > QUARTA.getTime());
});

test('numa segunda de manhã o digest é hoje, não daqui a uma semana', () => {
  const segundaCedo = new Date('2026-07-27T06:00:00');
  const d = proximaSegunda(segundaCedo, 8);
  assert.equal(d.getDate(), 27, 'devia ser hoje');
});

test('numa segunda já passada a hora, o digest é na semana seguinte', () => {
  const segundaTarde = new Date('2026-07-27T20:00:00');
  const d = proximaSegunda(segundaTarde, 8);
  assert.equal(d.getDate(), 3, 'devia saltar para a segunda seguinte');
  assert.equal(d.getMonth(), 7, 'Agosto');
});

test('resumo do digest conta garrafas e vinhos no pico', () => {
  const r = resumoDigest([
    vinho({ id: 'a', quantity: 6, maturation_window_start: 2024, maturation_window_end: 2028 }),
    vinho({ id: 'b', quantity: 4 }),
  ], QUARTA);
  assert.ok(r.includes('10 garrafas'));
  assert.ok(r.includes('1 no pico'));
});

test('resumo de cave vazia convida a começar', () => {
  assert.ok(resumoDigest([], QUARTA).includes('vazia'));
});
