/**
 * Testes da lógica pura da cave.
 *
 *   npm run test
 *
 * Usa o runner nativo do Node (`node:test`), sem dependências extra.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Wine } from '@/types';
import {
  calcularStats,
  ehPureza,
  estaNoPico,
  filtrarVinhos,
  jaPassouDoPico,
  roiAnualizado,
  saiDoPicoEsteAno,
  valorDeMercado,
} from '@/store/selectors';

function vinho(over: Partial<Wine> = {}): Wine {
  return {
    id: 'w1',
    user_id: 'u1',
    name: 'Vinho',
    producer: 'Produtor',
    region: 'Douro',
    country: 'Portugal',
    wine_type: 'tinto',
    grape_varieties: [],
    quantity: 1,
    food_pairings: [],
    is_natural: false,
    is_low_intervention: false,
    is_organic: false,
    is_biodynamic: false,
    source: 'manual',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

/* ---------------------------- valor ---------------------------- */

test('valor de mercado multiplica pela quantidade', () => {
  assert.equal(valorDeMercado(vinho({ current_market_value: 30, quantity: 6 })), 180);
});

test('sem cotação de mercado cai para o preço de compra', () => {
  assert.equal(valorDeMercado(vinho({ purchase_price: 20, quantity: 3 })), 60);
});

test('sem preço nenhum vale zero em vez de rebentar', () => {
  assert.equal(valorDeMercado(vinho({ quantity: 5 })), 0);
});

/* ---------------------------- pico ----------------------------- */

test('está no pico dentro da janela', () => {
  const w = vinho({ maturation_window_start: 2024, maturation_window_end: 2028 });
  assert.equal(estaNoPico(w, 2026), true);
  assert.equal(estaNoPico(w, 2023), false);
  assert.equal(estaNoPico(w, 2029), false);
});

test('limites da janela são inclusivos', () => {
  const w = vinho({ maturation_window_start: 2024, maturation_window_end: 2028 });
  assert.equal(estaNoPico(w, 2024), true);
  assert.equal(estaNoPico(w, 2028), true);
});

test('janela aberta de um lado conta como aberta desse lado', () => {
  assert.equal(estaNoPico(vinho({ maturation_window_start: 2020 }), 2050), true);
  assert.equal(estaNoPico(vinho({ maturation_window_end: 2030 }), 1990), true);
});

test('sem janela definida não se afirma que está no pico', () => {
  assert.equal(estaNoPico(vinho(), 2026), false);
});

test('sai do pico este ano alimenta o banner de alerta', () => {
  assert.equal(saiDoPicoEsteAno(vinho({ maturation_window_end: 2026 }), 2026), true);
  assert.equal(saiDoPicoEsteAno(vinho({ maturation_window_end: 2027 }), 2026), false);
});

test('já passou do pico', () => {
  assert.equal(jaPassouDoPico(vinho({ maturation_window_end: 2025 }), 2026), true);
  assert.equal(jaPassouDoPico(vinho(), 2026), false);
});

/* --------------------------- pureza ---------------------------- */

test('pureza por score ou por qualquer certificação', () => {
  assert.equal(ehPureza(vinho({ pureza_score: 88 })), true);
  assert.equal(ehPureza(vinho({ pureza_score: 69 })), false);
  assert.equal(ehPureza(vinho({ is_natural: true })), true);
  assert.equal(ehPureza(vinho({ is_biodynamic: true })), true);
  assert.equal(ehPureza(vinho()), false);
});

/* ---------------------------- stats ---------------------------- */

test('estatísticas da cave', () => {
  const s = calcularStats(
    [
      vinho({ id: 'a', quantity: 6, purchase_price: 30, current_market_value: 38, is_natural: true }),
      vinho({ id: 'b', quantity: 4, purchase_price: 50, current_market_value: 45 }),
    ],
    2026,
  );

  assert.equal(s.total_bottles, 10);
  assert.equal(s.total_invested, 380); // 6*30 + 4*50
  assert.equal(s.current_market_value, 408); // 6*38 + 4*45
  assert.equal(s.roi_pct, 7.37); // (408-380)/380
  assert.equal(s.natural_pct, 60); // 6 de 10 garrafas
});

test('cave vazia não divide por zero', () => {
  const s = calcularStats([], 2026);
  assert.equal(s.roi_pct, 0);
  assert.equal(s.natural_pct, 0);
  assert.equal(s.total_bottles, 0);
});

test('sem preço de compra o ROI é 0 e não infinito', () => {
  const s = calcularStats([vinho({ quantity: 2, current_market_value: 50 })], 2026);
  assert.equal(Number.isFinite(s.roi_pct), true);
  assert.equal(s.roi_pct, 0);
});

test('conta vinhos no pico', () => {
  const s = calcularStats(
    [
      vinho({ id: 'a', maturation_window_start: 2024, maturation_window_end: 2028 }),
      vinho({ id: 'b', maturation_window_start: 2030, maturation_window_end: 2035 }),
    ],
    2026,
  );
  assert.equal(s.wines_at_peak, 1);
});

/* ----------------------------- ROI ----------------------------- */

test('ROI anualizado compara com a inflação portuguesa', () => {
  const r = roiAnualizado(1000, 1200, 4);
  assert.equal(r.roi_pct, 20);
  assert.equal(r.profit_eur, 200);
  assert.equal(r.annualized_pct, 4.66); // 1.2^(1/4) - 1
  assert.equal(r.vs_inflation_pct, 1.86); // acima dos 2.8%
});

test('período inferior a um ano não inflaciona a taxa', () => {
  const curto = roiAnualizado(100, 110, 0.25);
  assert.equal(curto.annualized_pct, 10);
});

test('perda dá ROI negativo abaixo da inflação', () => {
  const r = roiAnualizado(1000, 800, 2);
  assert.ok(r.roi_pct < 0);
  assert.ok(r.vs_inflation_pct < 0);
});

/* --------------------------- filtros --------------------------- */

test('filtros por cor', () => {
  const cave = [
    vinho({ id: 'a', wine_type: 'tinto' }),
    vinho({ id: 'b', wine_type: 'branco' }),
    vinho({ id: 'c', wine_type: 'espumante' }),
  ];
  assert.equal(filtrarVinhos(cave, 'todos').length, 3);
  assert.equal(filtrarVinhos(cave, 'tintos').length, 1);
  assert.equal(filtrarVinhos(cave, 'brancos')[0]?.id, 'b');
  assert.equal(filtrarVinhos(cave, 'espumantes')[0]?.id, 'c');
  assert.equal(filtrarVinhos(cave, 'roses').length, 0);
});

test('beber agora inclui os que já passaram do pico', () => {
  const cave = [
    vinho({ id: 'no-pico', maturation_window_start: 2024, maturation_window_end: 2028 }),
    vinho({ id: 'passou', maturation_window_end: 2020 }),
    vinho({ id: 'cedo', maturation_window_start: 2040 }),
  ];
  const r = filtrarVinhos(cave, 'beber_agora', 2026).map((w) => w.id);
  assert.deepEqual(r.sort(), ['no-pico', 'passou']);
});

test('filtro de investimento apanha raridade e valorização', () => {
  const cave = [
    vinho({ id: 'raro', rarity_score: 82 }),
    vinho({ id: 'valorizou', purchase_price: 20, current_market_value: 35 }),
    vinho({ id: 'comum', purchase_price: 10, current_market_value: 10, rarity_score: 5 }),
  ];
  const r = filtrarVinhos(cave, 'investimento').map((w) => w.id);
  assert.deepEqual(r.sort(), ['raro', 'valorizou']);
});
