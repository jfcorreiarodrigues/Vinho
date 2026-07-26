import assert from 'node:assert/strict';
import { test } from 'node:test';

import { euros, numero, percentagem, pontos } from '@/lib/formato';

test('separador de milhares é ponto', () => {
  assert.equal(numero(1152, 0), '1.152');
  assert.equal(numero(1000000, 0), '1.000.000');
  assert.equal(numero(999, 0), '999');
});

test('separador decimal é vírgula', () => {
  assert.equal(numero(38.5), '38,50');
  assert.equal(numero(14.17), '14,17');
});

test('decimais a zero são omitidos', () => {
  assert.equal(numero(1152), '1.152');
  assert.equal(numero(38.0), '38');
});

test('negativos mantêm o sinal antes dos milhares', () => {
  assert.equal(numero(-1234.5), '-1.234,50');
});

test('euros com símbolo no fim, à portuguesa', () => {
  assert.equal(euros(1152), '1.152€');
  assert.equal(euros(38.5), '38,50€');
  assert.equal(euros(0), '0€');
});

test('percentagem leva sinal só quando positiva', () => {
  assert.equal(percentagem(14.17), '+14,17%');
  assert.equal(percentagem(-3.2), '-3,20%');
  assert.equal(percentagem(0), '0%');
});

test('percentagem sem sinal quando pedido', () => {
  assert.equal(percentagem(14.17, 2, false), '14,17%');
});

test('pontos concorda em número', () => {
  assert.equal(pontos(23.9), '23,9 pontos');
  assert.equal(pontos(1), '1 ponto');
  assert.equal(pontos(-2.5), '2,5 pontos');
});

test('nunca aparece formato inglês', () => {
  for (const v of [1234.56, 1000000.5, 0.99, 12345]) {
    const s = euros(v);
    assert.ok(!/\d,\d{3}/.test(s), `vírgula a separar milhares em ${s}`);
    assert.ok(!/\.\d{2}€/.test(s), `ponto a separar decimais em ${s}`);
  }
});
