import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  normalizarLote,
  totalDasLinhas,
  totalDeGarrafas,
  totalDivergente,
} from '@/lib/bulk';

const ANO = new Date().getFullYear();

test('fatura típica é normalizada', () => {
  const r = normalizarLote({
    store_name: 'Garrafeira Nacional', invoice_date: '2026-07-20', total_amount: 186,
    wines: [
      { name:'Redoma', producer:'Niepoort', region:'Douro', vintage:2020, quantity:3, purchase_price:38, wine_type:'tinto' },
      { name:'Alvarinho', producer:'Anselmo Mendes', region:'Vinho Verde', quantity:3, purchase_price:24, wine_type:'branco' },
    ],
  });
  assert.equal(r.store_name, 'Garrafeira Nacional');
  assert.equal(r.linhas.length, 2);
  assert.equal(totalDeGarrafas(r.linhas), 6);
  assert.equal(totalDasLinhas(r.linhas), 186);
  assert.equal(totalDivergente(r), false);
});

test('divergência com o total da fatura é assinalada', () => {
  const r = normalizarLote({
    total_amount: 300,
    wines: [{ name:'X', producer:'Y', quantity:1, purchase_price:38 }],
  });
  assert.equal(totalDivergente(r), true, 'faltou uma linha e a app devia avisar');
});

test('diferença de arredondamento não conta como divergência', () => {
  const r = normalizarLote({
    total_amount: 38.5,
    wines: [{ name:'X', producer:'Y', quantity:1, purchase_price:38 }],
  });
  assert.equal(totalDivergente(r), false);
});

test('sem total na fatura não há divergência a assinalar', () => {
  const r = normalizarLote({ wines: [{ name:'X', quantity:1, purchase_price:10 }] });
  assert.equal(totalDivergente(r), false);
});

test('linhas sem nome nem produtor são descartadas e contadas', () => {
  const r = normalizarLote({
    wines: [
      { name:'Bom', producer:'P', quantity:1 },
      { name:'', producer:'', quantity:1 },
      { quantity: 2 },
    ],
  });
  assert.equal(r.linhas.length, 1);
  assert.equal(r.descartadas, 2);
});

test('linha só com produtor usa-o como nome', () => {
  const r = normalizarLote({ wines: [{ producer:'Quinta do Mouro', quantity:1 }] });
  assert.equal(r.linhas[0]?.name, 'Quinta do Mouro');
});

test('quantidade ausente ou inválida cai para 1', () => {
  const r = normalizarLote({ wines: [
    { name:'A', quantity: 0 }, { name:'B' }, { name:'C', quantity: -5 }, { name:'D', quantity: 2.7 },
  ]});
  assert.deepEqual(r.linhas.map((l) => l.quantity), [1, 1, 1, 3]);
});

test('preços inválidos ficam por preencher em vez de virar zero', () => {
  const r = normalizarLote({ wines: [
    { name:'A', purchase_price: 0 }, { name:'B', purchase_price: -3 }, { name:'C', purchase_price: 25 },
  ]});
  assert.deepEqual(r.linhas.map((l) => l.purchase_price), [undefined, undefined, 25]);
});

test('anos absurdos são descartados', () => {
  const r = normalizarLote({ wines: [
    { name:'A', vintage: 1500 }, { name:'B', vintage: ANO + 30 }, { name:'C', vintage: 2019 },
  ]});
  assert.deepEqual(r.linhas.map((l) => l.vintage), [undefined, undefined, 2019]);
});

test('tipo inventado cai para tinto', () => {
  const r = normalizarLote({ wines: [{ name:'A', wine_type:'espumoso' }] });
  assert.equal(r.linhas[0]?.wine_type, 'tinto');
});

test('data fora de ISO é rejeitada', () => {
  assert.equal(normalizarLote({ invoice_date:'20/07/2026', wines: [] }).invoice_date, undefined);
  assert.equal(normalizarLote({ invoice_date:'2026-07-20', wines: [] }).invoice_date, '2026-07-20');
});

test('resposta sem lista de vinhos não rebenta', () => {
  const r = normalizarLote({});
  assert.deepEqual(r.linhas, []);
  assert.equal(r.descartadas, 0);
});

test('ids das linhas são distintos para a remoção funcionar', () => {
  const r = normalizarLote({ wines: [{ name:'Igual' }, { name:'Igual' }, { name:'Igual' }] });
  assert.equal(new Set(r.linhas.map((l) => l.id)).size, 3);
});
