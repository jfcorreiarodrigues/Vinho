import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  anosDesdeCompra,
  detectPriceSpike,
  dicas,
  porRegiao,
  resumoPortfolio,
  serieSimulada,
  topPerformers,
} from '@/lib/investimento';
import type { Wine } from '@/types';

function vinho(o: Partial<Wine> = {}): Wine {
  return {
    id: 'w', user_id: 'u', name: 'Vinho', producer: 'P', region: 'Douro',
    country: 'Portugal', wine_type: 'tinto', grape_varieties: [], quantity: 1,
    food_pairings: [], is_natural: false, is_low_intervention: false,
    is_organic: false, is_biodynamic: false, source: 'manual',
    created_at: '2026-01-01', updated_at: '2026-01-01', ...o,
  };
}

const AGORA = new Date('2026-07-26');

test('resumo soma investido e valor actual', () => {
  const r = resumoPortfolio(
    [
      vinho({ quantity: 6, purchase_price: 30, current_market_value: 38 }),
      vinho({ quantity: 4, purchase_price: 50, current_market_value: 45 }),
    ],
    AGORA,
  );
  assert.equal(r.investido, 380);
  assert.equal(r.valorActual, 408);
  assert.equal(r.lucro, 28);
  assert.equal(r.roi_pct, 7.37);
});

test('cave vazia não rebenta nem divide por zero', () => {
  const r = resumoPortfolio([], AGORA);
  assert.equal(r.investido, 0);
  assert.equal(r.roi_pct, 0);
  assert.equal(r.vantagem, 0);
});

test('inflação é contada desde a data de cada compra', () => {
  // 1000€ há 4 anos a 2,8%/ano = 1000 * 1.028^4 ≈ 1116,86
  const r = resumoPortfolio(
    [vinho({ quantity: 1, purchase_price: 1000, current_market_value: 1200, purchase_date: '2022-07-26' })],
    AGORA,
  );
  assert.ok(Math.abs(r.seFosseInflacao - 1116.86) < 1, `deu ${r.seFosseInflacao}`);
  assert.ok(r.vantagem > 0, 'ganhou à inflação');
});

test('compra sem data não acumula inflação', () => {
  const r = resumoPortfolio(
    [vinho({ quantity: 1, purchase_price: 100, current_market_value: 100 })],
    AGORA,
  );
  assert.equal(r.seFosseInflacao, 100);
});

test('uma compra recente não arrasta o resultado de compras antigas', () => {
  const antiga = vinho({ id: 'a', quantity: 1, purchase_price: 1000, current_market_value: 1000, purchase_date: '2016-07-26' });
  const recente = vinho({ id: 'b', quantity: 1, purchase_price: 1000, current_market_value: 1000, purchase_date: '2026-07-20' });
  const r = resumoPortfolio([antiga, recente], AGORA);
  // A antiga acumula 10 anos de inflação, a recente quase nada.
  assert.ok(r.seFosseInflacao > 2200 && r.seFosseInflacao < 2350, `deu ${r.seFosseInflacao}`);
});

test('anos desde a compra', () => {
  assert.ok(Math.abs(anosDesdeCompra(vinho({ purchase_date: '2024-07-26' }), AGORA) - 2) < 0.02);
  assert.equal(anosDesdeCompra(vinho(), AGORA), 0);
});

test('agrupa por região, da maior posição para a menor', () => {
  const r = porRegiao([
    vinho({ region: 'Douro', quantity: 2, purchase_price: 50, current_market_value: 60 }),
    vinho({ region: 'Alentejo', quantity: 1, purchase_price: 20, current_market_value: 20 }),
    vinho({ region: 'Douro', quantity: 1, purchase_price: 30, current_market_value: 40 }),
  ]);
  assert.equal(r.length, 2);
  assert.equal(r[0]?.regiao, 'Douro');
  assert.equal(r[0]?.garrafas, 3);
  assert.equal(r[0]?.investido, 130);
  assert.equal(r[0]?.valorActual, 160);
});

test('top performers ordena por ROI', () => {
  const r = topPerformers([
    vinho({ id: 'mau', purchase_price: 100, current_market_value: 90 }),
    vinho({ id: 'bom', purchase_price: 100, current_market_value: 200 }),
    vinho({ id: 'medio', purchase_price: 100, current_market_value: 120 }),
  ]);
  assert.deepEqual(r.map((p) => p.wine.id), ['bom', 'medio', 'mau']);
  assert.equal(r[0]?.roi_pct, 100);
});

test('vinhos sem preço de compra ficam fora do ranking', () => {
  const r = topPerformers([
    vinho({ id: 'sem-preco', current_market_value: 500 }),
    vinho({ id: 'com-preco', purchase_price: 10, current_market_value: 11 }),
  ]);
  assert.equal(r.length, 1);
  assert.equal(r[0]?.wine.id, 'com-preco');
});

test('série simulada começa no investido e acaba no valor actual', () => {
  const s = serieSimulada({ investido: 1000, valorActual: 1200, lucro: 200, roi_pct: 20, seFosseInflacao: 1100, vantagem: 100 });
  assert.equal(s.length, 12);
  assert.equal(s[0], 1000);
  assert.equal(s[11], 1200);
});

test('série de cave vazia é toda a zero', () => {
  const s = serieSimulada({ investido: 0, valorActual: 0, lucro: 0, roi_pct: 0, seFosseInflacao: 0, vantagem: 0 });
  assert.ok(s.every((v) => v === 0));
});

test('spike de preço só acima de 15%', () => {
  assert.equal(detectPriceSpike(100, 116), true);
  assert.equal(detectPriceSpike(100, 114), false);
  assert.equal(detectPriceSpike(100, 80), true, 'queda também é spike');
  assert.equal(detectPriceSpike(0, 50), false, 'sem preço antigo não há variação');
});

test('dica de concentração aparece quando uma região domina', () => {
  const d = dicas([
    vinho({ region: 'Douro', quantity: 10, purchase_price: 50, current_market_value: 50 }),
    vinho({ region: 'Dão', quantity: 1, purchase_price: 10, current_market_value: 10 }),
  ]);
  assert.ok(d.some((t) => t.includes('Douro')), 'devia alertar para a concentração');
});

test('dica sobre vinhos sem preço concorda em número', () => {
  const um = dicas([vinho({ id: 'a' })]);
  assert.ok(um.some((t) => t.includes('1 vinho não tem')));

  const varios = dicas([vinho({ id: 'a' }), vinho({ id: 'b' })]);
  assert.ok(varios.some((t) => t.includes('2 vinhos não têm')));
});

test('há sempre pelo menos uma dica', () => {
  assert.ok(dicas([]).length > 0);
});
