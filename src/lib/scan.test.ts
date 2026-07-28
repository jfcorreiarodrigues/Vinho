import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CONFIANCA_MINIMA, normalizarScan, precisaConfirmacao, scanParaWine } from '@/lib/scan';

const ANO = new Date().getFullYear();

test('resposta completa passa intacta', () => {
  const r = normalizarScan({
    name: 'Redoma', producer: 'Niepoort', region: 'Douro', country: 'Portugal',
    wine_type: 'tinto', vintage: 2020, grape_varieties: ['Touriga Nacional'],
    food_pairings: ['Borrego'], is_natural: true, pureza_score: 88,
    rarity_score: 70, confidence: 0.95,
  });
  assert.equal(r.producer, 'Niepoort');
  assert.equal(r.wine_type, 'tinto');
  assert.deepEqual(r.grape_varieties, ['Touriga Nacional']);
  assert.equal(r.confidence, 0.95);
});

test('tipo de vinho inventado cai para tinto em vez de contaminar a BD', () => {
  assert.equal(normalizarScan({ name:'X', producer:'Y', region:'Z', wine_type:'laranja' }).wine_type, 'tinto');
  assert.equal(normalizarScan({ name:'X', producer:'Y', region:'Z', wine_type:null }).wine_type, 'tinto');
});

test('tipo em maiusculas é aceite', () => {
  assert.equal(normalizarScan({ name:'X', producer:'Y', region:'Z', wine_type:'BRANCO' }).wine_type, 'branco');
});

test('anos absurdos são descartados', () => {
  assert.equal(normalizarScan({ name:'X', producer:'Y', region:'Z', vintage: 1200 }).vintage, undefined);
  assert.equal(normalizarScan({ name:'X', producer:'Y', region:'Z', vintage: ANO + 50 }).vintage, undefined);
  assert.equal(normalizarScan({ name:'X', producer:'Y', region:'Z', vintage: 2020 }).vintage, 2020);
});

test('vindima do ano seguinte é aceite — engarrafamentos antecipados existem', () => {
  assert.equal(normalizarScan({ name:'X', producer:'Y', region:'Z', vintage: ANO + 1 }).vintage, ANO + 1);
});

test('campos em falta não rebentam', () => {
  const r = normalizarScan({ name: null, producer: null, region: null });
  assert.equal(r.name, '');
  assert.deepEqual(r.grape_varieties, []);
  assert.equal(r.confidence, 0);
  assert.equal(r.country, 'Portugal');
});

test('listas com lixo são filtradas', () => {
  const r = normalizarScan({
    name:'X', producer:'Y', region:'Z',
    grape_varieties: ['Baga', 42, null, 'Bical'] as unknown,
    food_pairings: 'não é lista' as unknown,
  });
  assert.deepEqual(r.grape_varieties, ['Baga', 'Bical']);
  assert.deepEqual(r.food_pairings, []);
});

test('confiança baixa exige confirmação', () => {
  const base = { name:'Redoma', producer:'Niepoort', region:'Douro' };
  assert.equal(precisaConfirmacao(normalizarScan({ ...base, confidence: 0.95 })), false);
  assert.equal(precisaConfirmacao(normalizarScan({ ...base, confidence: CONFIANCA_MINIMA - 0.01 })), true);
});

test('sem produtor exige confirmação por muito confiante que diga estar', () => {
  const r = normalizarScan({ name:'Redoma', producer:null, region:'Douro', confidence: 1 });
  assert.equal(precisaConfirmacao(r), true);
});

test('conversão para vinho marca a origem como scan', () => {
  const r = normalizarScan({ name:'Redoma', producer:'Niepoort', region:'Douro', vintage:2020, confidence:0.9 });
  const w = scanParaWine(r, 'user-1', 6, 30);
  assert.equal(w.source, 'scan');
  assert.equal(w.user_id, 'user-1');
  assert.equal(w.quantity, 6);
  assert.equal(w.purchase_price, 30);
  assert.match(w.purchase_date ?? '', /^\d{4}-\d{2}-\d{2}$/);
});
